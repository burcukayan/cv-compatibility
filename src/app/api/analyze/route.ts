import { NoObjectGeneratedError, RetryError } from "ai";

import { analyzeMatch } from "@/lib/ai/analyze-match";
import { analyzeRequestSchema } from "@/lib/schemas";

export const maxDuration = 30;

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function isAbortOrTimeoutName(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function isAbortRetry(error: unknown): boolean {
  return RetryError.isInstance(error) && error.reason === "abort";
}

function isTimeoutOrAbort(error: unknown): boolean {
  if (isAbortOrTimeoutName(error) || isAbortRetry(error)) {
    return true;
  }

  if (typeof error === "object" && error !== null && "cause" in error) {
    const cause = error.cause;
    return isAbortOrTimeoutName(cause) || isAbortRetry(cause);
  }

  return false;
}

export async function POST(request: Request) {
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
    return Response.json({ data }, { status: 200 });
  } catch (error) {
    console.error(errorName(error));

    if (NoObjectGeneratedError.isInstance(error)) {
      return Response.json(
        { error: "The analysis could not be generated." },
        { status: 502 },
      );
    }

    if (isTimeoutOrAbort(error)) {
      return Response.json(
        { error: "The analysis timed out." },
        { status: 504 },
      );
    }

    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
