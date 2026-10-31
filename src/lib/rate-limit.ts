import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

const ANALYZE_LIMIT = 10;
const ANALYZE_WINDOW = "1 h" as const;
const COVER_LETTER_LIMIT = 10;
const COVER_LETTER_WINDOW = "1 h" as const;
const EXTRACT_PDF_LIMIT = 20;
const EXTRACT_PDF_WINDOW = "1 h" as const;
const AI_GLOBAL_DAILY_LIMIT = 200;
const AI_GLOBAL_DAILY_WINDOW = "1 d" as const;
const EXPORT_LIMIT = 5;
const EXPORT_WINDOW = "1 h" as const;
const RATE_LIMIT_TIMEOUT_MS = 5_000;

const ANALYZE_PREFIX = "ratelimit:analyze";
const COVER_LETTER_PREFIX = "ratelimit:cover-letter";
const EXTRACT_PDF_PREFIX = "ratelimit:extract-pdf";
const AI_GLOBAL_DAILY_PREFIX = "ratelimit:ai-global";
const EXPORT_PREFIX = "ratelimit:export";

export const GLOBAL_RATE_LIMIT_IDENTIFIER = "global";

const USAGE_LIMIT_MESSAGE = "You've reached the usage limit. Please try again later.";
const UNAVAILABLE_MESSAGE = "Service temporarily unavailable.";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

type RateLimitName = "analyze" | "coverLetter" | "extractPdf" | "aiGlobalDaily" | "export";
type Window = "1 h" | "1 d";
type Outcome = "allowed" | "limited" | "unavailable";

export type RateLimitCheck =
  | { response: null; remaining: number }
  | { response: Response; remaining: number | null };

function createLimiter(tokens: number, window: Window, prefix: string): Ratelimit {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
    timeout: RATE_LIMIT_TIMEOUT_MS,
    analytics: false,
  });
}

const limiters: Record<RateLimitName, Ratelimit> = {
  analyze: createLimiter(ANALYZE_LIMIT, ANALYZE_WINDOW, ANALYZE_PREFIX),
  coverLetter: createLimiter(COVER_LETTER_LIMIT, COVER_LETTER_WINDOW, COVER_LETTER_PREFIX),
  extractPdf: createLimiter(EXTRACT_PDF_LIMIT, EXTRACT_PDF_WINDOW, EXTRACT_PDF_PREFIX),
  aiGlobalDaily: createLimiter(
    AI_GLOBAL_DAILY_LIMIT,
    AI_GLOBAL_DAILY_WINDOW,
    AI_GLOBAL_DAILY_PREFIX,
  ),
  export: createLimiter(EXPORT_LIMIT, EXPORT_WINDOW, EXPORT_PREFIX),
};

function logOutcome(name: RateLimitName, outcome: Outcome): void {
  if (outcome === "unavailable") {
    console.error(name, outcome);
    return;
  }

  console.info(name, outcome);
}

function retryAfterSeconds(resetMs: number): string {
  const seconds = Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
  return String(seconds);
}

function limitedResponse(result: { limit: number; remaining: number; reset: number }): Response {
  return Response.json(
    { error: USAGE_LIMIT_MESSAGE },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfterSeconds(result.reset),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
      },
    },
  );
}

function unavailableResponse(): Response {
  return Response.json({ error: UNAVAILABLE_MESSAGE }, { status: 503 });
}

export function rateLimitRemainingHeader(remaining: number): { "X-RateLimit-Remaining": string } {
  return { "X-RateLimit-Remaining": String(remaining) };
}

export async function checkRateLimit(name: RateLimitName, userId: string): Promise<RateLimitCheck> {
  try {
    const result = await limiters[name].limit(userId);

    if (result.reason === "timeout") {
      logOutcome(name, "unavailable");
      return { response: unavailableResponse(), remaining: null };
    }

    if (!result.success) {
      logOutcome(name, "limited");
      return { response: limitedResponse(result), remaining: result.remaining };
    }

    logOutcome(name, "allowed");
    return { response: null, remaining: result.remaining };
  } catch {
    logOutcome(name, "unavailable");
    return { response: unavailableResponse(), remaining: null };
  }
}
