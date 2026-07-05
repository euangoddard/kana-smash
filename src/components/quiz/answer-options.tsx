import { component$, type QRL } from "@builder.io/qwik";
import type { Question } from "~/lib/quiz";

interface AnswerOptionsProps {
  question: Question;
  /** Mixed into each option's key so buttons remount between questions. */
  questionIndex: number;
  selected: number | null;
  onAnswer$: QRL<(optionIndex: number) => void>;
}

/** The multiple-choice grid, coloured to show correct/incorrect once answered. */
export const AnswerOptions = component$<AnswerOptionsProps>(
  ({ question, questionIndex, selected, onAnswer$ }) => {
    const answered = selected !== null;
    const optionsAreKana = question.kind !== "kana-to-romaji";
    return (
      <div
        class="mt-8 grid grid-cols-2 gap-3"
        role="group"
        aria-label="Answers"
      >
        {question.options.map((option, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = i === selected;
          let cls =
            "border-paper-line bg-paper hover:border-indigo-ai active:bg-indigo-wash";
          if (answered) {
            cls = isCorrect
              ? "border-matcha bg-matcha-wash"
              : isSelected
                ? "border-shu bg-shu-wash"
                : "border-paper-line opacity-50";
          }
          return (
            <button
              key={`${questionIndex}-${i}`}
              type="button"
              disabled={answered}
              onClick$={() => onAnswer$(i)}
              lang={optionsAreKana ? "ja" : undefined}
              class={`relative min-h-20 rounded-2xl border-2 transition-colors ${cls} ${
                optionsAreKana
                  ? "font-kana text-4xl"
                  : "font-display text-2xl font-semibold lowercase"
              }`}
            >
              {option}
              {answered && isCorrect && (
                <span
                  aria-hidden="true"
                  class="animate-stamp bg-matcha text-paper absolute -top-2 -right-2 grid size-8 place-items-center rounded-full text-lg font-bold"
                >
                  ◯
                </span>
              )}
              {answered && isSelected && !isCorrect && (
                <span
                  aria-hidden="true"
                  class="animate-stamp bg-shu text-paper absolute -top-2 -right-2 grid size-8 place-items-center rounded-full text-lg font-bold"
                >
                  ✕
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  },
);
