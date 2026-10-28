import { Analyzer } from "../components/analyzer";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          ResumeMatch
        </h1>
        <p className="mt-2 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          Compare your resume with a job description and see your match score, skill
          gaps, and edit suggestions.
        </p>
      </header>
      <Analyzer />
    </div>
  );
}
