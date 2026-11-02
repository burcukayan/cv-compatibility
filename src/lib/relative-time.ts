const DIVISIONS = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
] as const satisfies readonly { unit: Intl.RelativeTimeFormatUnit; seconds: number }[];

export function formatRelativeDate(date: Date, now: Date): string {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const elapsed = Math.abs(diffSeconds);
  const division = DIVISIONS.find((item) => elapsed >= item.seconds) ?? DIVISIONS[DIVISIONS.length - 1];

  if (!division) {
    return formatter.format(0, "second");
  }

  return formatter.format(Math.round(diffSeconds / division.seconds), division.unit);
}
