"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClassName =
  "inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:text-zinc-400";

const activeLinkClassName =
  "inline-flex h-8 items-center rounded-md bg-zinc-100 px-2.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:bg-zinc-800";

type NavUser = {
  name?: string;
  nickname?: string;
};

function displayName(user: NavUser): string {
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

export function AppNav({ name, nickname }: NavUser) {
  const pathname = usePathname();
  const display = displayName({ name, nickname });
  const initials = initialsFromName(display);
  const historyActive = pathname === "/history" || pathname.startsWith("/history/");

  return (
    <header className="sticky top-0 z-20 w-full border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav aria-label="Account" className="flex h-14 items-center gap-4 px-4">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background"
          >
            {initials}
          </span>
          <span className="sr-only sm:hidden">{display}</span>
          <span className="hidden text-sm font-medium text-foreground sm:inline">{display}</span>
        </span>
        <Link
          href="/history"
          aria-current={historyActive ? "page" : undefined}
          className={historyActive ? activeLinkClassName : linkClassName}
        >
          History
        </Link>
        <a href="/auth/logout" className={linkClassName}>
          Log out
        </a>
      </nav>
    </header>
  );
}
