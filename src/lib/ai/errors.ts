import "server-only";

import { APICallError, NoObjectGeneratedError, RetryError } from "ai";

import {
  AI_BUSY_MESSAGE,
  AI_TIMEOUT_MESSAGE,
  AI_UNAVAILABLE_MESSAGE,
} from "@/lib/ai/error-messages";

const GENERIC_MESSAGE = "Something went wrong.";
const OBJECT_MESSAGE = "The response could not be generated.";
const RETRY_AFTER_SECONDS = "60";

export type MappedAiError = {
  status: number;
  message: string;
  headers?: { "Retry-After": string };
};

function readStatusCode(error: unknown): number | undefined {
  if (APICallError.isInstance(error)) {
    return error.statusCode;
  }

  if (RetryError.isInstance(error) && APICallError.isInstance(error.lastError)) {
    return error.lastError.statusCode;
  }

  return undefined;
}

function logAiError(error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const statusCode = readStatusCode(error);
  const reason = RetryError.isInstance(error) ? error.reason : undefined;

  console.error(name, statusCode ?? "", reason ?? "");
}

function isTimeoutOrAbort(error: unknown, retryReason: string | undefined): boolean {
  if (retryReason === "abort") {
    return true;
  }

  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

export function mapAiError(error: unknown): MappedAiError {
  logAiError(error);

  const retryReason = RetryError.isInstance(error) ? error.reason : undefined;
  const cause = RetryError.isInstance(error) ? error.lastError : error;

  if (APICallError.isInstance(cause) && cause.statusCode === 429) {
    return {
      status: 429,
      message: AI_BUSY_MESSAGE,
      headers: { "Retry-After": RETRY_AFTER_SECONDS },
    };
  }

  if (
    APICallError.isInstance(cause) &&
    (cause.statusCode === 500 || cause.statusCode === 503)
  ) {
    return { status: 503, message: AI_UNAVAILABLE_MESSAGE };
  }

  if (NoObjectGeneratedError.isInstance(cause)) {
    return { status: 502, message: OBJECT_MESSAGE };
  }

  if (isTimeoutOrAbort(cause, retryReason)) {
    return { status: 504, message: AI_TIMEOUT_MESSAGE };
  }

  return { status: 500, message: GENERIC_MESSAGE };
}
