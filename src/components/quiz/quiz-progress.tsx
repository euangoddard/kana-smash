import { component$ } from "@builder.io/qwik";

interface QuizProgressProps {
  current: number;
  total: number;
  answered: boolean;
}

/** Question counter and progress bar for the active quiz. */
export const QuizProgress = component$<QuizProgressProps>(
  ({ current, total, answered }) => (
    <>
      <p class="text-ink-faint text-sm font-medium">
        Question {current + 1} of {total}
      </p>
      <div
        aria-hidden="true"
        class="bg-paper-deep mt-2 h-1.5 overflow-hidden rounded-full"
      >
        <div
          class="bg-indigo-ai h-full rounded-full transition-all"
          style={{
            width: `${((current + (answered ? 1 : 0)) / total) * 100}%`,
          }}
        />
      </div>
    </>
  ),
);
