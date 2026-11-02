import Link from "next/link";

const pageClassName =
  "mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8";

const textLinkClassName =
  "font-medium text-foreground underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default function HistoryAnalysisNotFound() {
  return (
    <div className={pageClassName}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analysis not found</h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        That analysis does not exist.{" "}
        <Link href="/history" className={textLinkClassName}>
          Back to history
        </Link>
      </p>
    </div>
  );
}
