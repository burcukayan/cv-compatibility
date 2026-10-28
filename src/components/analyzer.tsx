"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { z } from "zod";

import { MatchResults } from "@/components/match-results";
import {
  TEXT_MAX_LENGTH,
  TEXT_MIN_LENGTH,
  analyzeRequestSchema,
  extractedPdfSchema,
  matchAnalysisSchema,
  type MatchAnalysis,
} from "@/lib/schemas";

const GENERIC_ERROR = "Something went wrong.";
const MAX_ERROR_LENGTH = 500;

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
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const extractInFlight = useRef(false);
  const analyzeInFlight = useRef(false);

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

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });

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

    if (analyzeInFlight.current || extractInFlight.current) {
      return;
    }

    const parsed = analyzeRequestSchema.safeParse({ resumeText, jobDescription });

    if (!parsed.success) {
      return;
    }

    analyzeInFlight.current = true;
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }

      const body: unknown = await response.json();
      const result = z.object({ data: matchAnalysisSchema }).safeParse(body);

      if (!result.success) {
        setError(GENERIC_ERROR);
        return;
      }

      setAnalysis(result.data.data);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      analyzeInFlight.current = false;
      setIsAnalyzing(false);
    }
  }

  const uploadDisabled = isExtracting || isAnalyzing;

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
          disabled={!canAnalyze}
          aria-busy={isAnalyzing}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isAnalyzing ? "Analyzing…" : "Analyze match"}
        </button>
      </form>

      {error ? (
        <div
          role="alert"
          className="mt-6 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 rounded-md px-2 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {analysis ? <MatchResults analysis={analysis} /> : null}
    </div>
  );
}
