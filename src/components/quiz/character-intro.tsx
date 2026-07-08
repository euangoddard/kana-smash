import { component$, type QRL } from "@builder.io/qwik";

/** One card in the introduction grid. */
export interface IntroItem {
  id: string;
  /** The character(s) being introduced. */
  glyph: string;
  /** Short latin-script name: romaji for kana, the gloss for kanji. */
  name: string;
  /** Extra line, e.g. an alternative romanisation or kanji readings. */
  detail?: string;
}

interface CharacterIntroProps {
  items: IntroItem[];
  /** True when the learner asked for a recap; changes copy, not behaviour. */
  recap: boolean;
  gridClass?: string;
  /** Language of the detail line (kanji readings are Japanese). */
  detailLang?: string;
  onStart$: QRL<() => void>;
  /** When set, cards become buttons that play the character's sound. */
  onHear$?: QRL<(id: string) => void>;
}

/**
 * Pre-quiz introduction: every character in the session laid out with its
 * reading, shown automatically the first time a level is played and on
 * demand as a recap afterwards.
 */
export const CharacterIntro = component$<CharacterIntroProps>(
  ({
    items,
    recap,
    gridClass = "grid-cols-3 sm:grid-cols-4",
    detailLang,
    onStart$,
    onHear$,
  }) => {
    const card = (item: IntroItem) => (
      <span class="block text-center">
        <span lang="ja" class="font-kana block text-3xl leading-snug">
          {item.glyph}
        </span>
        <span class="text-ink-soft mt-1 block text-sm font-medium">
          {item.name}
        </span>
        {item.detail && (
          <span lang={detailLang} class="text-ink-faint mt-0.5 block text-xs">
            {item.detail}
          </span>
        )}
      </span>
    );

    return (
      <div class="mt-4">
        <p class="eyebrow text-center">
          {recap ? "Quick recap" : "New characters"}
        </p>
        <h1 class="font-display text-ink-soft mt-2 text-center text-lg font-semibold">
          {recap
            ? "Refresh your memory before you start"
            : `Meet the ${items.length} characters in this level`}
        </h1>
        {onHear$ && (
          <p class="text-ink-soft mt-2 text-center text-sm">
            Tap a character to hear it.
          </p>
        )}

        <ul class={`mt-6 grid gap-3 ${gridClass}`}>
          {items.map((item) => (
            <li key={item.id}>
              {onHear$ ? (
                <button
                  type="button"
                  onClick$={() => onHear$(item.id)}
                  class="bg-paper-deep/60 hover:bg-paper-deep w-full rounded-xl px-2 py-3 transition-colors"
                >
                  {card(item)}
                </button>
              ) : (
                <span class="bg-paper-deep/60 block rounded-xl px-2 py-3">
                  {card(item)}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div class="sticky bottom-4 mt-8 text-center">
          <button
            type="button"
            onClick$={onStart$}
            class="btn-primary min-h-12 px-8 py-3 shadow-lg"
          >
            {recap ? "Start the quiz" : "Got it — start the quiz"}
          </button>
        </div>
      </div>
    );
  },
);
