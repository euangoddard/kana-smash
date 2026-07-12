import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { streakStats, type StreakStats } from "~/lib/streak";

/**
 * One-line streak and daily-goal summary, self-loaded from localStorage so
 * it can sit inside otherwise data-free components like the results screen.
 */
export const StreakLine = component$(() => {
  const stats = useSignal<StreakStats | null>(null);

  // Streak data lives in localStorage — client-only.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    stats.value = streakStats();
  });

  if (!stats.value) return null;
  const s = stats.value;
  return (
    <p class="text-ink-soft mt-3 text-sm">
      <span aria-hidden="true" lang="ja" class="text-shu font-semibold">
        火
      </span>{" "}
      {s.current === 1 ? "1-day streak" : `${s.current}-day streak`}
      {" · "}
      {s.goalMet ? "today's goal done!" : `${s.today}/${s.goal} answers today`}
    </p>
  );
});
