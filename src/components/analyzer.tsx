"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { z } from "zod";

import { CoverLetter } from "@/components/cover-letter";
import { MatchResults } from "@/components/match-results";
import { SessionExpiredNotice } from "@/components/session-expired";
import {
  TEXT_MAX_LENGTH,
  TEXT_MIN_LENGTH,
  analyzeRequestSchema,
  extractedPdfSchema,
  matchAnalysisSchema,
  type AnalyzeRequest,
  type MatchAnalysis,
} from "@/lib/schemas";

const GENERIC_ERROR = "Something went wrong.";
const MAX_ERROR_LENGTH = 500;
const RETRY_FALLBACK_SECONDS = 60;

function retryAfterSeconds(response: Response): number {
  const header = response.headers.get("Retry-After");

  if (header === null) {
    return RETRY_FALLBACK_SECONDS;
  }

  const parsed = Number(header);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return RETRY_FALLBACK_SECONDS;
  }

  return Math.ceil(parsed);
}

function useRetryCooldown() {
  const [until, setUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (until === null) {
      return;
    }

    const tick = () => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSecondsLeft(left);

      if (left === 0) {
        setUntil(null);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const safeSeconds = Math.max(1, Math.ceil(seconds));
    setSecondsLeft(safeSeconds);
    setUntil(Date.now() + safeSeconds * 1000);
  }, []);

  return { secondsLeft, start };
}

function isCountOutOfRange(length: number): boolean {
  return length < TEXT_MIN_LENGTH || length > TEXT_MAX_LENGTH;
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string" &&
      body.error.length > 0 &&
      body.error.length <= MAX_ERROR_LENGTH
    ) {
      return body.error;
    }
  } catch {
    return GENERIC_ERROR;
  }

  return GENERIC_ERROR;
}

function CharacterCount({ id, length }: { id: string; length: number }) {
  const outOfRange = isCountOutOfRange(length);

  return (
    <p
      id={id}
      className={`text-right text-xs tabular-nums ${
        outOfRange ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      {length} / {TEXT_MAX_LENGTH}
    </p>
  );
}

const fieldClassName =
  "min-h-56 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-foreground shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950";

export function Analyzer() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [analyzedInput, setAnalyzedInput] = useState<AnalyzeRequest | null>(null);
  const [coverSession, setCoverSession] = useState(0);
  const extractInFlight = useRef(false);
  const analyzeInFlight = useRef(false);
  const { secondsLeft: retrySeconds, start: startRetryCooldown } = useRetryCooldown();
  const onRateLimited = useCallback(() => {
    startRetryCooldown(RETRY_FALLBACK_SECONDS);
  }, [startRetryCooldown]);

  const canAnalyze =
    analyzeRequestSchema.safeParse({ resumeText, jobDescription }).success &&
    !isExtracting &&
    !isAnalyzing;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file || extractInFlight.current || analyzeInFlight.current) {
      input.value = "";
      return;
    }

    extractInFlight.current = true;
    setIsExtracting(true);
    setFileName(file.name);
    setError(null);
    setSessionExpired(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }

      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }

      const body: unknown = await response.json();
      const parsed = extractedPdfSchema.safeParse(body);

      if (!parsed.success) {
        setError(GENERIC_ERROR);
        return;
      }

      setResumeText(parsed.data.text);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      extractInFlight.current = false;
      setIsExtracting(false);
      input.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (analyzeInFlight.current || extractInFlight.current || retrySeconds > 0) {
      return;
    }

    const parsed = analyzeRequestSchema.safeParse({ resumeText, jobDescription });

    if (!parsed.success) {
      return;
    }

    analyzeInFlight.current = true;
    setIsAnalyzing(true);
    setError(null);
    setSessionExpired(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }

      if (!response.ok) {
        if (response.status === 429) {
          startRetryCooldown(retryAfterSeconds(response));
        }

        setError(await readApiError(response));
        return;
      }

      const body: unknown = await response.json();
      const result = z.object({ data: matchAnalysisSchema }).safeParse(body);

      if (!result.success) {
        setError(GENERIC_ERROR);
        return;
      }

      const nextInput = parsed.data;
      const inputChanged =
        analyzedInput === null ||
        analyzedInput.resumeText !== nextInput.resumeText ||
        analyzedInput.jobDescription !== nextInput.jobDescription;

      if (inputChanged) {
        setCoverSession((session) => session + 1);
      }

      setAnalyzedInput(nextInput);
      setAnalysis(result.data.data);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      analyzeInFlight.current = false;
      setIsAnalyzing(false);
    }
  }

  const uploadDisabled = isExtracting || isAnalyzing;
  const resultsInSync =
    analysis !== null &&
    analyzedInput !== null &&
    resumeText.trim() === analyzedInput.resumeText &&
    jobDescription.trim() === analyzedInput.jobDescription;

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="resume" className="text-sm font-semibold text-foreground">
                Resume
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {fileName ? (
                  <p className="max-w-48 truncate text-xs text-zinc-600 dark:text-zinc-400">
                    {fileName}
                  </p>
                ) : null}
                <label
                  className={`inline-flex h-9 cursor-pointer items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground dark:border-zinc-600 ${
                    uploadDisabled ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {isExtracting ? "Extracting…" : "Upload PDF"}
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={uploadDisabled}
                    aria-busy={isExtracting}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
            <textarea
              id="resume"
              name="resume"
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              aria-describedby="resume-count"
              className={fieldClassName}
            />
            <CharacterCount id="resume-count" length={resumeText.length} />
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <label htmlFor="job-description" className="text-sm font-semibold text-foreground">
              Job description
            </label>
            <textarea
              id="job-description"
              name="jobDescription"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              aria-describedby="job-count"
              className={fieldClassName}
            />
            <CharacterCount id="job-count" length={jobDescription.length} />
          </section>
        </div>

        <button
          type="submit"
          disabled={!canAnalyze || retrySeconds > 0}
          aria-busy={isAnalyzing}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {retrySeconds > 0
            ? `Try again in ${retrySeconds}s`
            : isAnalyzing
              ? "Analyzing…"
              : "Analyze match"}
        </button>
      </form>

      {sessionExpired || error ? (
        <div
          role="alert"
          className="mt-6 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {sessionExpired ? (
            <p>
              <SessionExpiredNotice />
            </p>
          ) : (
            <p>{error}</p>
          )}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSessionExpired(false);
            }}
            className="shrink-0 rounded-md px-2 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {resultsInSync && analysis && analyzedInput ? (
        <>
          <MatchResults analysis={analysis} />
          <CoverLetter
            key={coverSession}
            id={String(coverSession)}
            resumeText={analyzedInput.resumeText}
            jobDescription={analyzedInput.jobDescription}
            retrySeconds={retrySeconds}
            onRateLimited={onRateLimited}
          />
        </>
      ) : null}
    </div>
  );
}
