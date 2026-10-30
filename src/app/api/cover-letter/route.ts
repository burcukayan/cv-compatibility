import { createUIMessageStreamResponse, toUIMessageStream } from "ai";

import { streamCoverLetter } from "@/lib/ai/cover-letter";
import { mapAiError } from "@/lib/ai/errors";
import { requireUser } from "@/lib/auth/require-user";
import { coverLetterRequestSchema } from "@/lib/schemas";

export const maxDuration = 30;

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function POST(request: Request) {
  const authResult = await requireUser();

  if (authResult instanceof Response) {
    return authResult;
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
      stream: toUIMessageStream({
        stream: result.stream,
        onError: (error) => mapAiError(error).message,
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
