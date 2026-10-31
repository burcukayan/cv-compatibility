import { createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from "ai";

import { saveCoverLetter } from "@/db/queries";
import { streamCoverLetter } from "@/lib/ai/cover-letter";
import { mapAiError } from "@/lib/ai/errors";
import { requireUser } from "@/lib/auth/require-user";
import { verifyOrigin } from "@/lib/security/verify-origin";
import {
  GLOBAL_RATE_LIMIT_IDENTIFIER,
  checkRateLimit,
  rateLimitRemainingHeader,
} from "@/lib/rate-limit";
import { coverLetterRequestSchema } from "@/lib/schemas";

export const maxDuration = 30;

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function coverLetterText(message: UIMessage): string {
  return message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
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

  const userLimit = await checkRateLimit("coverLetter", authResult.sub);

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

  const parsed = coverLetterRequestSchema.safeParse(body);

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
    const result = streamCoverLetter(parsed.data);

    return createUIMessageStreamResponse({
      headers: rateLimitRemainingHeader(userLimit.remaining),
      stream: toUIMessageStream({
        stream: result.stream,
        onError: (error) => mapAiError(error).message,
        onFinish: async (event) => {
          const analysisId = parsed.data.analysisId;

          if (
            analysisId === undefined ||
            event.isAborted ||
            event.isCancelled ||
            event.outcome.status !== "completed"
          ) {
            return;
          }

          const text = coverLetterText(event.responseMessage);

          if (text.length === 0) {
            return;
          }

          try {
            await saveCoverLetter(authResult.sub, analysisId, text, parsed.data.tone);
          } catch (error) {
            console.error(errorName(error));
          }
        },
      }),
    });
  } catch (error) {
    const mapped = mapAiError(error);

    return Response.json(
      { error: mapped.message },
      { status: mapped.status, headers: mapped.headers },
    );
  }
}
