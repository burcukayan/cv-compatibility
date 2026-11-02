import { scoreTone } from "@/lib/score-tone";
import type { MatchAnalysis } from "@/lib/schemas";

type SuggestionGroup = {
  section: string;
  items: string[];
};

function groupSuggestions(suggestions: MatchAnalysis["suggestions"]): SuggestionGroup[] {
  const groups: SuggestionGroup[] = [];
  const indexBySection = new Map<string, number>();

  for (const item of suggestions) {
    const existing = indexBySection.get(item.section);

    if (existing === undefined) {
      indexBySection.set(item.section, groups.length);
      groups.push({ section: item.section, items: [item.suggestion] });
    } else {
      groups[existing]?.items.push(item.suggestion);
    }
  }

  return groups;
}

function ScoreRing({ score }: { score: number }) {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div
      role="img"
      aria-label={`Match score ${score} out of 100`}
      className={`relative shrink-0 ${scoreTone(score)}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-zinc-200 dark:stroke-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <p
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-4xl font-semibold tabular-nums"
      >
        {score}
      </p>
    </div>
  );
}

function SkillGroup({
  title,
  skills,
  chipClassName,
}: {
  title: string;
  skills: string[];
  chipClassName: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {skills.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">None</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <li
              key={`${skill}-${index}`}
              className={`rounded-full px-3 py-1 text-sm ${chipClassName}`}
            >
              {skill}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MatchResults({ analysis }: { analysis: MatchAnalysis }) {
  const groups = groupSuggestions(analysis.suggestions);

  return (
    <section aria-live="polite" className="mt-10 space-y-8">
      <div className="flex flex-col items-center gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950">
        <ScoreRing score={analysis.matchScore} />
        <div className="min-w-0 text-center sm:text-left">
          <h2 className="text-lg font-semibold text-foreground">Summary</h2>
          <p className="mt-2 text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {analysis.summary}
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <SkillGroup
          title="Matched skills"
          skills={analysis.matchedSkills}
          chipClassName="bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
        />
        <SkillGroup
          title="Missing skills"
          skills={analysis.missingSkills}
          chipClassName="bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Suggestions</h2>
        {groups.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">None</p>
        ) : (
          <div className="mt-4 space-y-6">
            {groups.map((group) => (
              <div key={group.section}>
                <h3 className="text-sm font-semibold text-foreground">{group.section}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {group.items.map((item, index) => (
                    <li key={`${group.section}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
