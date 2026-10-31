"use client";

import { useState, useTransition } from "react";

import { deleteAnalysisAction } from "@/app/history/actions";

const buttonClassName =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600";

export function DeleteAnalysisButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (pending) {
      return;
    }

    if (!window.confirm("Delete this analysis?")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteAnalysisAction(id);

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={buttonClassName}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-800 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
