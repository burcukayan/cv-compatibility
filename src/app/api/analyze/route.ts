import { analyzeMatch } from "@/lib/ai/analyze-match";
import { mapAiError } from "@/lib/ai/errors";
import { requireUser } from "@/lib/auth/require-user";
import { verifyOrigin } from "@/lib/security/verify-origin";
import {
  GLOBAL_RATE_LIMIT_IDENTIFIER,
  checkRateLimit,
  rateLimitRemainingHeader,
} from "@/lib/rate-limit";
import { analyzeRequestSchema } from "@/lib/schemas";

export const maxDuration = 30;

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function POST(request: Request) {
  const originResponse = verifyOrigin(request);

  if (originResponse) {
    return originResponse;
  }

  const authResult = await requireUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  const userLimit = await checkRateLimit("analyze", authResult.sub);

  if (userLimit.response) {
    return userLimit.response;
  }

  const globalLimit = await checkRateLimit("aiGlobalDaily", GLOBAL_RATE_LIMIT_IDENTIFIER);

  if (globalLimit.response) {
    return globalLimit.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error(errorName(error));
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = analyzeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid request.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const data = await analyzeMatch(parsed.data);
    return Response.json(
      { data },
      { status: 200, headers: rateLimitRemainingHeader(userLimit.remaining) },
    );
  } catch (error) {
    const mapped = mapAiError(error);

    return Response.json(
      { error: mapped.message },
      { status: mapped.status, headers: mapped.headers },
    );
  }
}
