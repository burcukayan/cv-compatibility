import Link from "next/link";

const secondaryLinkClassName =
  "inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:border-zinc-600";

type HeaderUser = {
  name?: string;
  nickname?: string;
};

function displayName(user: HeaderUser): string {
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

export function AccountHeader({ user }: { user: HeaderUser }) {
  const name = displayName(user);
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
        <Link href="/history" className={secondaryLinkClassName}>
          History
        </Link>
        <a href="/auth/logout" className={secondaryLinkClassName}>
          Log out
        </a>
      </div>
    </header>
  );
}
