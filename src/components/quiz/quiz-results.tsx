import { component$, type QRL } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

/** One missed item chip: what was shown plus a short reminder of the answer. */
export interface MissedItem {
  id: string;
  glyph: string;
  hint: string;
}

interface MatchStats {
  pairs: number;
  mistakes: number;
}

interface QuizResultsProps {
  correctCount: number;
  total: number;
  missed: MissedItem[];
  onRetry$: QRL<() => void>;
  nextHref?: string;
  nextTitle?: string;
  levelsHref: string;
  /** Progress page link — pass a ?script= variant to open the right tab. */
  progressHref?: string;
  /** Final matching-round tally — informational only, not part of the score. */
  matchStats?: MatchStats;
}

/** End-of-session score, missed characters, and next-step actions. */
export const QuizResults = component$<QuizResultsProps>(
  ({
    correctCount,
    total,
    missed,
    onRetry$,
    nextHref,
    nextTitle,
    levelsHref,
    progressHref = "/progress/",
    matchStats,
  }) => (
    <div class="mt-10 text-center" aria-live="polite">
      <p class="eyebrow">Session complete</p>
      <p class="font-display mt-4 text-6xl font-bold">
        {correctCount}
        <span class="text-ink-faint text-2xl"> / {total}</span>
      </p>
      <p class="text-ink-soft mt-2">
        {correctCount === total
          ? "Perfect round — 完璧!"
          : correctCount >= total * 0.7
            ? "Solid work. The misses below are your next win."
            : "Good practice — these characters just need more reps."}
      </p>

      {missed.length > 0 && (
        <div class="border-paper-line mx-auto mt-6 max-w-sm rounded-2xl border-2 p-4 text-left">
          <h2 class="text-ink-soft text-sm font-semibold">
            Missed this session
          </h2>
          <ul class="mt-2 flex flex-wrap gap-2">
            {missed.map((item) => (
              <li key={item.id} class="chip bg-shu-wash text-shu-deep">
                <span lang="ja" class="font-kana text-xl">
                  {item.glyph}
                </span>{" "}
                <span class="text-sm">{item.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {matchStats && (
        <p class="text-ink-soft mt-4 text-sm">
          Final matching round: all {matchStats.pairs} paired
          {matchStats.mistakes === 0
            ? " on the first try."
            : ` after ${matchStats.mistakes} mistake${matchStats.mistakes === 1 ? "" : "s"}.`}
        </p>
      )}

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        {nextHref && (
          <Link href={nextHref} class="btn-primary min-h-12 px-6 py-3">
            Next: {nextTitle}
          </Link>
        )}
        <button
          type="button"
          onClick$={onRetry$}
          class={nextHref ? "btn-outline" : "btn-primary min-h-12 px-6 py-3"}
        >
          Go again
        </button>
        <Link href={levelsHref} class="btn-outline">
          All levels
        </Link>
        <Link href={progressHref} class="btn-outline">
          My progress
        </Link>
      </div>
    </div>
  ),
);
