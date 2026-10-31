import { io } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AccountHeader } from "@/components/account-header";
import { DeleteAnalysisButton } from "@/components/delete-analysis-button";
import { PrivacyData } from "@/components/privacy-data";
import { countAnalyses, listAnalyses } from "@/db/queries";
import { requireUser } from "@/lib/auth/require-user";
import { formatRelativeDate } from "@/lib/relative-time";
import { historyPageSchema } from "@/lib/schemas";
import { scoreTone } from "@/lib/score-tone";

const PAGE_SIZE = 20;

const pageClassName =
  "mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8";

const textLinkClassName =
  "font-medium text-foreground underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

function parseHistoryPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === undefined) {
    return 1;
  }

  const parsed = historyPageSchema.safeParse(raw);
  return parsed.success ? parsed.data : 1;
}

function historyHref(page: number): string {
  return page <= 1 ? "/history" : `/history?page=${page}`;
}

function HistoryPagination({ page, pageCount }: { page: number; pageCount: number }) {
  const previousPage = page > pageCount ? pageCount : page - 1;

  return (
    <nav aria-label="History pages" className="mt-6 flex flex-wrap items-center gap-4 text-sm">
      {page > 1 ? (
        <Link href={historyHref(previousPage)} className={textLinkClassName}>
          Previous
        </Link>
      ) : (
        <span className="text-zinc-400 dark:text-zinc-600">Previous</span>
      )}
      <span className="text-zinc-600 dark:text-zinc-400">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={historyHref(page + 1)} className={textLinkClassName}>
          Next
        </Link>
      ) : (
        <span className="text-zinc-400 dark:text-zinc-600">Next</span>
      )}
    </nav>
  );
}

async function HistoryContent({
  searchParams,
}: {
  searchParams: PageProps<"/history">["searchParams"];
}) {
  const authResult = await requireUser();

  if (authResult instanceof Response) {
    redirect("/auth/login");
  }

  const { page: pageParam } = await searchParams;
  const page = parseHistoryPage(pageParam);
  const [total, rows] = await Promise.all([
    countAnalyses(authResult.sub),
    listAnalyses(authResult.sub, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  ]);

  await io();
  const now = new Date();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AccountHeader user={authResult} />
      <h2 className="text-xl font-semibold tracking-tight text-foreground">History</h2>

      {total === 0 ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          You have no saved analyses yet.{" "}
          <Link href="/" className={textLinkClassName}>
            Back to the analyzer
          </Link>
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          No analyses on this page.{" "}
          <Link href={historyHref(Math.min(page - 1, pageCount))} className={textLinkClassName}>
            Back to the previous page
          </Link>
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <Link href={`/history/${row.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{row.jobTitle}</p>
                {row.companyName ? (
                  <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {row.companyName}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <time dateTime={row.createdAt.toISOString()}>
                    {formatRelativeDate(row.createdAt, now)}
                  </time>
                </p>
              </Link>
              <p
                className={`text-lg font-semibold tabular-nums ${scoreTone(row.matchScore)}`}
                aria-label={`Match score ${row.matchScore}`}
              >
                {row.matchScore}
              </p>
              <DeleteAnalysisButton id={row.id} />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? <HistoryPagination page={page} pageCount={pageCount} /> : null}
      <PrivacyData />
    </>
  );
}

export default function HistoryPage({ searchParams }: PageProps<"/history">) {
  return (
    <div className={pageClassName}>
      <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <HistoryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
