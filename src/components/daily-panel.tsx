import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { SCRIPTS } from "~/data/kana";
import { loadKanjiProgress } from "~/lib/kanji-progress";
import { loadProgress } from "~/lib/progress";
import { dueKana, dueKanji } from "~/lib/srs";
import { streakStats, type StreakStats } from "~/lib/streak";

/**
 * Home-page strip for the daily habit: streak, goal progress and how much
 * is due for review, with the two quick-start actions.
 */
export const DailyPanel = component$(() => {
  const stats = useSignal<StreakStats | null>(null);
  const due = useSignal(0);

  // Streak and review data live in localStorage — client-only.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const kanaData = loadProgress();
    due.value =
      SCRIPTS.reduce(
        (sum, script) => sum + dueKana(kanaData, script).length,
        0,
      ) + dueKanji(loadKanjiProgress()).length;
    stats.value = streakStats();
  });

  const s = stats.value;

  return (
    <section class="mt-12" aria-label="Today's practice">
      <h2 class="font-display text-lg font-bold">Today</h2>
      {s && (s.current > 0 || s.today > 0) && (
        <p class="text-ink-soft mt-1 text-sm">
          <span aria-hidden="true" lang="ja" class="text-shu font-semibold">
            火
          </span>{" "}
          {s.current === 1 ? "1-day streak" : `${s.current}-day streak`}
          {" · "}
          {s.goalMet
            ? "today's goal done!"
            : `${s.today}/${s.goal} answers today`}
        </p>
      )}
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <Link
          href="/review/"
          class="border-paper-line bg-paper-deep/40 hover:border-indigo-ai block rounded-2xl border-2 p-5 transition-colors"
        >
          <span class="font-display block text-lg font-bold">Daily review</span>
          <span class="text-ink-soft mt-1 block text-sm">
            {stats.value === null
              ? "Spaced repetition for everything you've learned."
              : due.value > 0
                ? `${due.value} character${due.value === 1 ? "" : "s"} due — keep them fresh.`
                : "All caught up. Nothing due right now."}
          </span>
        </Link>
        <Link
          href="/challenge/"
          class="border-paper-line bg-paper-deep/40 hover:border-shu block rounded-2xl border-2 p-5 transition-colors"
        >
          <span class="font-display block text-lg font-bold">Challenge</span>
          <span class="text-ink-soft mt-1 block text-sm">
            60 seconds against the clock. How many can you smash?
          </span>
        </Link>
      </div>
    </section>
  );
});
