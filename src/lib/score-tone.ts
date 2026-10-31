export function scoreTone(score: number): string {
  if (score < 50) {
    return "text-red-600 dark:text-red-400";
  }

  if (score < 75) {
    return "text-amber-500 dark:text-amber-400";
  }

  return "text-green-600 dark:text-green-400";
}
