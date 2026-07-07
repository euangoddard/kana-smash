import { component$, type QRL } from "@builder.io/qwik";
import type { KanjiQuestion } from "~/lib/kanji-quiz";

interface KanjiQuizPromptProps {
  question: KanjiQuestion;
  onReplay$: QRL<() => void>;
}

/** The thing being asked about: a kanji, a meaning, a word, or a replay button. */
export const KanjiQuizPrompt = component$<KanjiQuizPromptProps>(
  ({ question, onReplay$ }) => (
    <div class="mt-6 flex justify-center">
      {question.kind === "kanji-to-meaning" && (
        <p lang="ja" class="font-kana text-8xl font-medium tracking-wide">
          {question.prompt}
        </p>
      )}
      {question.kind === "meaning-to-kanji" && (
        <p class="font-display max-w-sm text-center text-4xl font-bold text-balance">
          {question.prompt}
        </p>
      )}
      {question.kind === "word-to-reading" && (
        <p lang="ja" class="font-kana text-6xl font-medium tracking-wide">
          {question.prompt}
        </p>
      )}
      {question.kind === "sound-to-word" && (
        <button
          type="button"
          onClick$={onReplay$}
          class="bg-indigo-ai text-paper hover:bg-indigo-deep grid size-28 place-items-center rounded-full transition-colors"
          aria-label="Play the word again"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-12"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
          </svg>
        </button>
      )}
    </div>
  ),
);
