import { component$, type QRL } from "@builder.io/qwik";
import { STUDY_WORD_BY_ID } from "~/data/words";
import type { WordQuestion } from "~/lib/word-quiz";

interface WordQuizFeedbackProps {
  correct: boolean;
  question: WordQuestion;
  isLastQuestion: boolean;
  onNext$: QRL<() => void>;
}

/** Shown after an answer: right/wrong plus the reading and meaning. */
export const WordQuizFeedback = component$<WordQuizFeedbackProps>(
  ({ correct, question, isLastQuestion, onNext$ }) => {
    const word = STUDY_WORD_BY_ID.get(question.wordId)!;
    return (
      <div class="animate-rise text-center">
        <p class="font-display text-lg font-bold">
          {correct ? "Correct!" : "Not quite."}{" "}
          <span lang="ja" class="font-kana">
            {word.id}
          </span>{" "}
          is “{word.romaji}” — {word.meaning}.
        </p>
        <button
          id="quiz-next"
          type="button"
          onClick$={onNext$}
          class="btn-primary mt-3 min-h-12 px-8 py-3"
        >
          {isLastQuestion ? "See results" : "Next question"}
        </button>
      </div>
    );
  },
);
