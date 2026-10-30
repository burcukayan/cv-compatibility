"use client";

import { useCompletion } from "@ai-sdk/react";
import { APICallError } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import { SessionExpiredNotice } from "@/components/session-expired";
import { AI_BUSY_MESSAGE, isKnownAiServiceMessage } from "@/lib/ai/error-messages";
import type { CoverLetterRequest } from "@/lib/schemas";

type Tone = CoverLetterRequest["tone"];
type GenerateLabel = "Generate cover letter" | "Regenerate";

const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "concise", label: "Concise" },
];

const COVER_LETTER_ERROR = "The cover letter could not be generated. Please try again.";
const COPY_ERROR = "The letter could not be copied. Please try again.";
const PROMPT = "Write a cover letter.";

const primaryButtonClassName =
  "inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-3 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClassName =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600";

const toneOptionClassName =
  "inline-flex h-9 cursor-pointer items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-foreground has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground dark:border-zinc-600";

type CoverLetterProps = {
  id: string;
  resumeText: string;
  jobDescription: string;
  retrySeconds: number;
  onRateLimited: () => void;
};

function parseKnownAiMessage(raw: string): string | null {
  try {
    const body: unknown = JSON.parse(raw);

    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string" &&
      isKnownAiServiceMessage(body.error)
    ) {
      return body.error;
    }
  } catch {
    return null;
  }

  return null;
}

function coverLetterErrorMessage(error: Error): string {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;

    if (status === 429 || status === 503 || status === 504) {
      const message = parseKnownAiMessage(error.message);

      if (message !== null) {
        return message;
      }
    }

    return COVER_LETTER_ERROR;
  }

  if (isKnownAiServiceMessage(error.message)) {
    return error.message;
  }

  return COVER_LETTER_ERROR;
}

function isRateLimitedError(error: Error): boolean {
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return true;
  }

  return (
    error.message === AI_BUSY_MESSAGE || parseKnownAiMessage(error.message) === AI_BUSY_MESSAGE
  );
}

export function CoverLetter({
  id,
  resumeText,
  jobDescription,
  retrySeconds,
  onRateLimited,
}: CoverLetterProps) {
  const [tone, setTone] = useState<Tone>("professional");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [streamingLabel, setStreamingLabel] = useState<GenerateLabel>("Generate cover letter");
  const copiedTimer = useRef<number | null>(null);
  const requestLock = useRef(false);

  const handleCompletionError = useCallback(
    (completionError: Error) => {
      if (isRateLimitedError(completionError)) {
        onRateLimited();
      }
    },
    [onRateLimited],
  );

  const { completion, complete, stop, isLoading, error } = useCompletion<CoverLetterRequest>({
    api: "/api/cover-letter",
    id,
    onError: handleCompletionError,
  });

  useEffect(() => {
    return () => {
      stop();

      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    };
  }, [stop]);

  function clearCopiedTimer() {
    if (copiedTimer.current !== null) {
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = null;
    }
  }

  async function handleGenerate(label: GenerateLabel) {
    if (requestLock.current || isLoading || retrySeconds > 0) {
      return;
    }

    requestLock.current = true;
    setStreamingLabel(label);
    setCopied(false);
    setCopyError(false);
    clearCopiedTimer();

    try {
      await complete(PROMPT, {
        body: { resumeText, jobDescription, tone },
      });
    } finally {
      requestLock.current = false;
    }
  }

  async function handleCopy() {
    setCopyError(false);

    try {
      await navigator.clipboard.writeText(completion);
      setCopied(true);
      clearCopiedTimer();
      copiedTimer.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimer.current = null;
      }, 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  function handleDownload() {
    const blob = new Blob([completion], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cover-letter.txt";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const hasLetter = completion.length > 0;

  return (
    <section
      aria-busy={isLoading}
      className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="text-lg font-semibold text-foreground">Cover letter</h2>

      <fieldset disabled={isLoading} className="mt-4 disabled:opacity-60">
        <legend className="text-sm font-semibold text-foreground">Tone</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TONES.map((option) => (
            <label key={option.value} className={toneOptionClassName}>
              <input
                type="radio"
                name={`cover-letter-tone-${id}`}
                value={option.value}
                checked={tone === option.value}
                onChange={() => setTone(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-2">
        {isLoading ? (
          <>
            <button type="button" disabled className={primaryButtonClassName}>
              {streamingLabel}
            </button>
            <button type="button" onClick={stop} className={secondaryButtonClassName}>
              Stop
            </button>
          </>
        ) : hasLetter ? (
          <>
            <button type="button" onClick={() => void handleCopy()} className={secondaryButtonClassName}>
              {copied ? "Copied" : "Copy to clipboard"}
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate("Regenerate")}
              disabled={retrySeconds > 0}
              className={primaryButtonClassName}
            >
              {retrySeconds > 0 ? `Try again in ${retrySeconds}s` : "Regenerate"}
            </button>
            <button type="button" onClick={handleDownload} className={secondaryButtonClassName}>
              Download .txt
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void handleGenerate("Generate cover letter")}
            disabled={retrySeconds > 0}
            className={primaryButtonClassName}
          >
            {retrySeconds > 0 ? `Try again in ${retrySeconds}s` : "Generate cover letter"}
          </button>
        )}
      </div>

      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>

      {isLoading && !hasLetter ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Writing…</p>
      ) : null}

      <div
        aria-live="polite"
        className={
          hasLetter
            ? "mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300"
            : "sr-only"
        }
      >
        {completion}
      </div>

      {hasLetter ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Review and personalize before sending. AI can make mistakes.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {APICallError.isInstance(error) && error.statusCode === 401 ? (
            <SessionExpiredNotice />
          ) : (
            coverLetterErrorMessage(error)
          )}
        </p>
      ) : null}

      {copyError ? (
        <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-200">
          {COPY_ERROR}
        </p>
      ) : null}
    </section>
  );
}
