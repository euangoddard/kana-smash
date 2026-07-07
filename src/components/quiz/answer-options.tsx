import { component$, type QRL } from "@builder.io/qwik";

/** The slice of a question this grid needs — kana and kanji quizzes both fit. */
interface AnswerableQuestion {
  options: string[];
  correctIndex: number;
}

interface AnswerOptionsProps {
  question: AnswerableQuestion;
  /** Mixed into each option's key so buttons remount between questions. */
  questionIndex: number;
  selected: number | null;
  onAnswer$: QRL<(optionIndex: number) => void>;
  /** "ja" when the options are Japanese text. */
  lang?: string;
  /** Typography for the option labels, e.g. "font-kana text-4xl". */
  optionClass: string;
}

/** The multiple-choice grid, coloured to show correct/incorrect once answered. */
export const AnswerOptions = component$<AnswerOptionsProps>(
  ({ question, questionIndex, selected, onAnswer$, lang, optionClass }) => {
    const answered = selected !== null;
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
              lang={lang}
              class={`relative min-h-20 rounded-2xl border-2 px-2 transition-colors ${cls} ${optionClass}`}
            >
              {option}
              {answered && isCorrect && (
                <span aria-hidden="true" class="answer-stamp bg-matcha">
                  ◯
                </span>
              )}
              {answered && isSelected && !isCorrect && (
                <span aria-hidden="true" class="answer-stamp bg-shu">
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
