"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";

import { deleteAllDataAction } from "@/app/history/actions";

const CONFIRMATION = "DELETE";

const secondaryButtonClassName =
  "inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600";

const dangerButtonClassName =
  "inline-flex h-11 items-center justify-center rounded-lg border border-red-300 px-5 text-sm font-medium text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300";

export function PrivacyData() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canDelete = confirmation === CONFIRMATION && !pending;

  function openDialog() {
    setConfirmation("");
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canDelete) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteAllDataAction(confirmation);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setConfirmation("");
      dialogRef.current?.close();
    });
  }

  return (
    <section className="mt-12 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-foreground">Privacy & data</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        We never store your resume. We store the job description and analysis results so you can
        view your history.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/api/me/export" className={secondaryButtonClassName}>
          Download my data
        </a>
        <button type="button" onClick={openDialog} className={dangerButtonClassName}>
          Delete all my data
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-all-title"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-foreground shadow-lg backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950"
        onClose={() => {
          setConfirmation("");
          setError(null);
        }}
      >
        <form onSubmit={handleSubmit}>
          <h3 id="delete-all-title" className="text-lg font-semibold text-foreground">
            Delete all my data
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            This permanently deletes every saved analysis. Type DELETE to confirm.
          </p>
          <label htmlFor="delete-all-confirmation" className="mt-4 block text-sm font-medium">
            Confirmation
          </label>
          <input
            id="delete-all-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:border-zinc-700 dark:bg-zinc-950"
          />
          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={closeDialog} className={secondaryButtonClassName}>
              Cancel
            </button>
            <button type="submit" disabled={!canDelete} className={dangerButtonClassName}>
              {pending ? "Deleting…" : "Delete all my data"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
