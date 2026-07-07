import {
  $,
  component$,
  useStore,
  useVisibleTask$,
  type QRL,
} from "@builder.io/qwik";
import { playAnswerFeedback } from "~/lib/feedback";
import { vibrateAnswerFeedback } from "~/lib/haptics";

export interface MatchPair {
  id: string;
  /** Japanese side: a kana glyph or a kanji character. */
  left: string;
  /** Answer side: romaji or an English meaning. */
  right: string;
}

interface MatchingExerciseProps {
  pairs: MatchPair[];
  /** aria labels for the two columns. */
  leftLabel: string;
  rightLabel: string;
  /** Typography for the answer column, e.g. "text-xl lowercase". */
  rightClass: string;
  /** Fires once every pair is matched, with the total number of wrong guesses. */
  onComplete$: QRL<(mistakes: number) => void>;
}

interface MatchState {
  leftOrder: string[];
  rightOrder: string[];
  matchedIds: string[];
  selectedLeft: string | null;
  selectedRight: string | null;
  /** True for the brief moment a wrong pair is shown in red. */
  mistake: boolean;
  /** Count of wrong pairings this round — shown on the results screen, not scored. */
  mistakeCount: number;
}

const shuffleIds = (ids: string[]): string[] => {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const tileClass = (status: "idle" | "selected" | "wrong" | "matched") => {
  switch (status) {
    case "matched":
      return "border-matcha bg-matcha-wash opacity-60";
    case "wrong":
      return "border-shu bg-shu-wash";
    case "selected":
      return "border-indigo-ai bg-indigo-wash";
    default:
      return "border-paper-line bg-paper hover:border-indigo-ai";
  }
};

/**
 * Final matching round for a level: pair every character with its answer.
 * Wrong pairs flash red and reset — this isn't scored, so the only way
 * through is matching everything, and it never touches saved progress.
 */
export const MatchingExercise = component$<MatchingExerciseProps>(
  ({ pairs, leftLabel, rightLabel, rightClass, onComplete$ }) => {
    const state = useStore<MatchState>(() => {
      const ids = pairs.map((p) => p.id);
      return {
        leftOrder: shuffleIds(ids),
        rightOrder: shuffleIds(ids),
        matchedIds: [],
        selectedLeft: null,
        selectedRight: null,
        mistake: false,
        mistakeCount: 0,
      };
    });

    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track, cleanup }) => {
      if (!track(() => state.mistake)) return;
      const timer = setTimeout(() => {
        state.selectedLeft = null;
        state.selectedRight = null;
        state.mistake = false;
      }, 550);
      cleanup(() => clearTimeout(timer));
    });

    const byId = new Map(pairs.map((p) => [p.id, p]));

    const evaluate = $(() => {
      const { selectedLeft, selectedRight } = state;
      if (selectedLeft == null || selectedRight == null) return;
      if (selectedLeft === selectedRight) {
        state.matchedIds = [...state.matchedIds, selectedLeft];
        state.selectedLeft = null;
        state.selectedRight = null;
        playAnswerFeedback(true);
        vibrateAnswerFeedback(true);
      } else {
        state.mistake = true;
        state.mistakeCount++;
        playAnswerFeedback(false);
        vibrateAnswerFeedback(false);
      }
    });

    const pickLeft = $((id: string) => {
      if (state.mistake || state.matchedIds.includes(id)) return;
      state.selectedLeft = id;
      void evaluate();
    });

    const pickRight = $((id: string) => {
      if (state.mistake || state.matchedIds.includes(id)) return;
      state.selectedRight = id;
      void evaluate();
    });

    const complete = state.matchedIds.length === pairs.length;

    return (
      <div class="mt-6">
        <p class="text-ink-faint text-center text-sm font-medium">
          {state.matchedIds.length} / {pairs.length} matched
        </p>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-3" role="group" aria-label={leftLabel}>
            {state.leftOrder.map((id) => {
              const matched = state.matchedIds.includes(id);
              const selected = state.selectedLeft === id;
              const status = matched
                ? "matched"
                : state.mistake && selected
                  ? "wrong"
                  : selected
                    ? "selected"
                    : "idle";
              return (
                <button
                  key={id}
                  type="button"
                  lang="ja"
                  disabled={matched}
                  aria-pressed={selected}
                  onClick$={() => pickLeft(id)}
                  class={`font-kana min-h-16 rounded-2xl border-2 text-3xl transition-colors ${tileClass(status)}`}
                >
                  {byId.get(id)!.left}
                </button>
              );
            })}
          </div>

          <div class="flex flex-col gap-3" role="group" aria-label={rightLabel}>
            {state.rightOrder.map((id) => {
              const matched = state.matchedIds.includes(id);
              const selected = state.selectedRight === id;
              const status = matched
                ? "matched"
                : state.mistake && selected
                  ? "wrong"
                  : selected
                    ? "selected"
                    : "idle";
              return (
                <button
                  key={id}
                  type="button"
                  disabled={matched}
                  aria-pressed={selected}
                  onClick$={() => pickRight(id)}
                  class={`font-display min-h-16 rounded-2xl border-2 px-2 font-semibold transition-colors ${rightClass} ${tileClass(status)}`}
                >
                  {byId.get(id)!.right}
                </button>
              );
            })}
          </div>
        </div>

        <p
          aria-live="polite"
          class="text-shu-deep mt-3 min-h-5 text-center text-sm font-medium"
        >
          {state.mistake ? "Not quite — try again." : ""}
        </p>

        {complete && (
          <div class="animate-rise mt-6 text-center">
            <p class="font-display text-lg font-bold">
              All matched — nice work.
            </p>
            <button
              type="button"
              onClick$={() => onComplete$(state.mistakeCount)}
              class="btn-primary mt-3 min-h-12 px-8 py-3"
            >
              See results
            </button>
          </div>
        )}
      </div>
    );
  },
);
