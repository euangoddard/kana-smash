import { component$, type QRL } from "@builder.io/qwik";
import { KANJI_BY_ID, readingsLabel, WORD_BY_ID } from "~/data/kanji";
import type { KanjiQuestion } from "~/lib/kanji-quiz";

interface KanjiQuizFeedbackProps {
  correct: boolean;
  question: KanjiQuestion;
  isLastQuestion: boolean;
  onNext$: QRL<() => void>;
}

/** Shown after an answer: right/wrong plus the meaning and reading. */
export const KanjiQuizFeedback = component$<KanjiQuizFeedbackProps>(
  ({ correct, question, isLastQuestion, onNext$ }) => {
    const kanji = KANJI_BY_ID.get(question.kanjiId)!;
    const word = question.wordId ? WORD_BY_ID.get(question.wordId) : undefined;
    return (
      <div class="animate-rise text-center">
        <p class="font-display text-lg font-bold">
          {correct ? "Correct!" : "Not quite."}{" "}
          {word ? (
            <>
              <span lang="ja" class="font-kana">
                {word.id}
              </span>{" "}
              is read{" "}
              <span lang="ja" class="font-kana">
                {word.reading}
              </span>{" "}
              — “{word.meaning}”.
            </>
          ) : (
            <>
              <span lang="ja" class="font-kana">
                {kanji.id}
              </span>{" "}
              means “{kanji.meaning}” —{" "}
              <span lang="ja" class="font-kana">
                {readingsLabel(kanji)}
              </span>
              .
            </>
          )}
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
