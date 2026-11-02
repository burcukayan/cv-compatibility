"use client";

import { useEffect, useRef, useState } from "react";

const COPY_ERROR = "The letter could not be copied. Please try again.";

const buttonClassName =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600";

export function CopyTextButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    };
  }, []);

  async function handleCopy() {
    setCopyError(false);

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }

      copiedTimer.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimer.current = null;
      }, 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void handleCopy()} className={buttonClassName}>
        {copied ? "Copied" : "Copy to clipboard"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
      {copyError ? (
        <p role="alert" className="mt-2 text-sm text-red-800 dark:text-red-200">
          {COPY_ERROR}
        </p>
      ) : null}
    </div>
  );
}
