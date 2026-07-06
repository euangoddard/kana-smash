import { component$, type QRL } from "@builder.io/qwik";
import { displayKana, type Kana, type Script } from "~/data/kana";

interface QuizFeedbackProps {
  correct: boolean;
  kana: Kana;
  script: Script;
  isLastQuestion: boolean;
  onNext$: QRL<() => void>;
}

/** Shown after an answer is chosen: right/wrong plus the correct reading. */
export const QuizFeedback = component$<QuizFeedbackProps>(
  ({ correct, kana, script, isLastQuestion, onNext$ }) => (
    <div class="animate-rise text-center">
      <p class="font-display text-lg font-bold">
        {correct ? "Correct!" : "Not quite."}{" "}
        <span lang="ja" class="font-kana">
          {displayKana(kana, script)}
        </span>{" "}
        is “{kana.romaji}”
        {kana.altRomaji ? ` (also written ${kana.altRomaji})` : ""}.
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
  ),
);
