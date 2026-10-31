import { io } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { AccountHeader } from "@/components/account-header";
import { CopyTextButton } from "@/components/copy-text-button";
import { DeleteAnalysisButton } from "@/components/delete-analysis-button";
import { MatchResults } from "@/components/match-results";
import { getAnalysis } from "@/db/queries";
import { requireUser } from "@/lib/auth/require-user";
import { formatRelativeDate } from "@/lib/relative-time";
import { analysisIdSchema } from "@/lib/schemas";

export const instant = false;

const pageClassName =
  "mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8";

export default async function HistoryDetailPage({ params }: PageProps<"/history/[id]">) {
  const { id } = await params;

  if (!analysisIdSchema.safeParse(id).success) {
    notFound();
  }

  const authResult = await requireUser();

  if (authResult instanceof Response) {
    redirect("/auth/login");
  }

  const analysis = await getAnalysis(authResult.sub, id);

  if (!analysis) {
    notFound();
  }

  await io();
  const now = new Date();

  return (
    <div className={pageClassName}>
      <AccountHeader user={authResult} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {analysis.jobTitle}
          </h2>
          {analysis.companyName ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{analysis.companyName}</p>
          ) : null}
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            <time dateTime={analysis.createdAt.toISOString()}>
              {formatRelativeDate(analysis.createdAt, now)}
            </time>
          </p>
        </div>
        <DeleteAnalysisButton id={analysis.id} />
      </div>
      <MatchResults analysis={analysis.result} />
      {analysis.coverLetter ? (
        <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Cover letter</h2>
            <CopyTextButton text={analysis.coverLetter} />
          </div>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {analysis.coverLetter}
          </div>
        </section>
      ) : null}
    </div>
  );
}
