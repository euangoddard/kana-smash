import {
  $,
  component$,
  useStore,
  useVisibleTask$,
  type QRL,
} from "@builder.io/qwik";
import { displayKana, type Kana, type Script } from "~/data/kana";
import { playAnswerFeedback } from "~/lib/feedback";
import { vibrateAnswerFeedback } from "~/lib/haptics";

interface MatchingExerciseProps {
  pairs: Kana[];
  script: Script;
  onComplete$: QRL<() => void>;
}

interface MatchState {
  kanaOrder: string[];
  romajiOrder: string[];
  matchedIds: string[];
  selectedKana: string | null;
  selectedRomaji: string | null;
  /** True for the brief moment a wrong pair is shown in red. */
  mistake: boolean;
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
 * Final matching round for a level: pair every kana with its romaji.
 * Wrong pairs flash red and reset — this isn't scored, so the only way
 * through is matching everything, and it never touches saved progress.
 */
export const MatchingExercise = component$<MatchingExerciseProps>(
  ({ pairs, script, onComplete$ }) => {
    const state = useStore<MatchState>(() => {
      const ids = pairs.map((k) => k.id);
      return {
        kanaOrder: shuffleIds(ids),
        romajiOrder: shuffleIds(ids),
        matchedIds: [],
        selectedKana: null,
        selectedRomaji: null,
        mistake: false,
      };
    });

    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track, cleanup }) => {
      if (!track(() => state.mistake)) return;
      const timer = setTimeout(() => {
        state.selectedKana = null;
        state.selectedRomaji = null;
        state.mistake = false;
      }, 550);
      cleanup(() => clearTimeout(timer));
    });

    const byId = new Map(pairs.map((k) => [k.id, k]));

    const evaluate = $(() => {
      const { selectedKana, selectedRomaji } = state;
      if (selectedKana == null || selectedRomaji == null) return;
      if (selectedKana === selectedRomaji) {
        state.matchedIds = [...state.matchedIds, selectedKana];
        state.selectedKana = null;
        state.selectedRomaji = null;
        playAnswerFeedback(true);
        vibrateAnswerFeedback(true);
      } else {
        state.mistake = true;
        playAnswerFeedback(false);
        vibrateAnswerFeedback(false);
      }
    });

    const pickKana = $((id: string) => {
      if (state.mistake || state.matchedIds.includes(id)) return;
      state.selectedKana = id;
      void evaluate();
    });

    const pickRomaji = $((id: string) => {
      if (state.mistake || state.matchedIds.includes(id)) return;
      state.selectedRomaji = id;
      void evaluate();
    });

    const complete = state.matchedIds.length === pairs.length;

    return (
      <div class="mt-6">
        <p class="text-ink-faint text-center text-sm font-medium">
          {state.matchedIds.length} / {pairs.length} matched
        </p>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-3" role="group" aria-label="Characters">
            {state.kanaOrder.map((id) => {
              const kana = byId.get(id)!;
              const matched = state.matchedIds.includes(id);
              const selected = state.selectedKana === id;
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
                  onClick$={() => pickKana(id)}
                  class={`font-kana min-h-16 rounded-2xl border-2 text-3xl transition-colors ${tileClass(status)}`}
                >
                  {displayKana(kana, script)}
                </button>
              );
            })}
          </div>

          <div class="flex flex-col gap-3" role="group" aria-label="Sounds">
            {state.romajiOrder.map((id) => {
              const kana = byId.get(id)!;
              const matched = state.matchedIds.includes(id);
              const selected = state.selectedRomaji === id;
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
                  onClick$={() => pickRomaji(id)}
                  class={`font-display min-h-16 rounded-2xl border-2 text-xl font-semibold lowercase transition-colors ${tileClass(status)}`}
                >
                  {kana.romaji}
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
              onClick$={onComplete$}
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
