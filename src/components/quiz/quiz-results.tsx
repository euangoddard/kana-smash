import { component$, type QRL } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { displayKana, KANA_BY_ID, type Script } from "~/data/kana";

interface QuizResultsProps {
  correctCount: number;
  total: number;
  missedIds: string[];
  script: Script;
  onRetry$: QRL<() => void>;
}

/** End-of-session score, missed kana, and next-step actions. */
export const QuizResults = component$<QuizResultsProps>(
  ({ correctCount, total, missedIds, script, onRetry$ }) => (
    <div class="mt-10 text-center" aria-live="polite">
      <p class="font-display text-ink-faint text-sm font-bold tracking-widest uppercase">
        Session complete
      </p>
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

      {missedIds.length > 0 && (
        <div class="border-paper-line mx-auto mt-6 max-w-sm rounded-2xl border-2 p-4 text-left">
          <h2 class="text-ink-soft text-sm font-semibold">
            Missed this session
          </h2>
          <ul class="mt-2 flex flex-wrap gap-2">
            {missedIds.map((id) => {
              const missed = KANA_BY_ID.get(id)!;
              return (
                <li
                  key={id}
                  class="bg-shu-wash text-shu-deep rounded-lg px-3 py-1.5"
                >
                  <span lang="ja" class="font-kana text-xl">
                    {displayKana(missed, script)}
                  </span>{" "}
                  <span class="text-sm">{missed.romaji}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick$={onRetry$}
          class="bg-indigo-ai text-paper hover:bg-indigo-deep min-h-12 rounded-xl px-6 py-3 font-semibold transition-colors"
        >
          Go again
        </button>
        <Link
          href={`/${script}/`}
          class="border-paper-line text-ink hover:border-indigo-ai grid min-h-12 place-items-center rounded-xl border-2 px-6 py-3 font-semibold transition-colors"
        >
          All levels
        </Link>
        <Link
          href="/progress/"
          class="border-paper-line text-ink hover:border-indigo-ai grid min-h-12 place-items-center rounded-xl border-2 px-6 py-3 font-semibold transition-colors"
        >
          My progress
        </Link>
      </div>
    </div>
  ),
);
