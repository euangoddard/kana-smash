import { component$, type QRL } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { displayKana, KANA_BY_ID, type Script } from "~/data/kana";

interface NextLevel {
  id: string;
  title: string;
}

interface QuizResultsProps {
  correctCount: number;
  total: number;
  missedIds: string[];
  script: Script;
  onRetry$: QRL<() => void>;
  nextLevel?: NextLevel;
}

/** End-of-session score, missed kana, and next-step actions. */
export const QuizResults = component$<QuizResultsProps>(
  ({ correctCount, total, missedIds, script, onRetry$, nextLevel }) => (
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

      {missedIds.length > 0 && (
        <div class="border-paper-line mx-auto mt-6 max-w-sm rounded-2xl border-2 p-4 text-left">
          <h2 class="text-ink-soft text-sm font-semibold">
            Missed this session
          </h2>
          <ul class="mt-2 flex flex-wrap gap-2">
            {missedIds.map((id) => {
              const missed = KANA_BY_ID.get(id)!;
              return (
                <li key={id} class="chip bg-shu-wash text-shu-deep">
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
        {nextLevel && (
          <Link
            href={`/${script}/quiz/${nextLevel.id}/`}
            class="btn-primary min-h-12 px-6 py-3"
          >
            Next: {nextLevel.title}
          </Link>
        )}
        <button
          type="button"
          onClick$={onRetry$}
          class={nextLevel ? "btn-outline" : "btn-primary min-h-12 px-6 py-3"}
        >
          Go again
        </button>
        <Link href={`/${script}/`} class="btn-outline">
          All levels
        </Link>
        <Link href="/progress/" class="btn-outline">
          My progress
        </Link>
      </div>
    </div>
  ),
);
