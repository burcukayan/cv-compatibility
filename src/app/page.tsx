import { Suspense } from "react";

import { Analyzer } from "@/components/analyzer";
import { auth0 } from "@/lib/auth0";

const primaryLinkClassName =
  "inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

const secondaryLinkClassName =
  "inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:border-zinc-600";

const FEATURES = [
  "A match score for the job you want",
  "The skills the posting asks for that your resume does not show",
  "Edit suggestions and a cover letter draft",
] as const;

function displayName(user: { name?: string; nickname?: string }): string {
  const name = user.name?.trim();

  if (name) {
    return name;
  }

  const nickname = user.nickname?.trim();

  if (nickname) {
    return nickname;
  }

  return "Account";
}

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter((part) => part.length > 0);
  const first = parts[0];

  if (!first) {
    return "A";
  }

  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }

  const last = parts[parts.length - 1] ?? first;
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function Landing() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col py-8 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        See how your resume fits the role
      </h1>
      <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
        ResumeMatch compares your resume with a job description before you apply.
      </p>
      <ul className="mt-8 list-none space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex gap-3">
            <span aria-hidden="true" className="mt-1 size-1.5 shrink-0 rounded-full bg-foreground" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="/auth/login" className={primaryLinkClassName}>
          Log in
        </a>
        <a href="/auth/login?screen_hint=signup" className={secondaryLinkClassName}>
          Sign up
        </a>
      </div>
    </section>
  );
}

function AccountHeader({ name }: { name: string }) {
  const initials = initialsFromName(name);

  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          ResumeMatch
        </h1>
        <p className="mt-2 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          Compare your resume with a job description and see your match score, skill gaps, and
          edit suggestions.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background"
        >
          {initials}
        </span>
        <span className="text-sm font-medium text-foreground">{name}</span>
        <a href="/auth/logout" className={secondaryLinkClassName}>
          Log out
        </a>
      </div>
    </header>
  );
}

async function HomeSession() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    return <Landing />;
  }

  return (
    <>
      <AccountHeader name={displayName(user)} />
      <Analyzer />
    </>
  );
}

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <Suspense
        fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}
      >
        <HomeSession />
      </Suspense>
    </div>
  );
}
