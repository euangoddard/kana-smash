import { component$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { buildMeta } from "~/lib/seo";

const SCRIPT_CARDS = [
  {
    href: "/hiragana/",
    en: "Hiragana",
    ja: "ひらがな",
    glyph: "あ",
    blurb: "The rounded script for native Japanese words. Start here.",
    accent: "text-indigo-ai",
    ring: "hover:border-indigo-ai focus-visible:border-indigo-ai",
  },
  {
    href: "/katakana/",
    en: "Katakana",
    ja: "カタカナ",
    glyph: "ア",
    blurb: "The angular script for foreign words — coffee, taxi, pizza.",
    accent: "text-shu",
    ring: "hover:border-shu focus-visible:border-shu",
  },
] as const;

const PRACTICE_MODES = [
  {
    kanji: "読",
    label: "Read it",
    blurb: "see a character, choose its romaji.",
  },
  {
    kanji: "書",
    label: "Recall it",
    blurb: "see romaji, choose the matching character.",
  },
  {
    kanji: "聞",
    label: "Hear it",
    blurb:
      "listen to the sound, choose the character (needs a Japanese voice on your device).",
  },
] as const;

export default component$(() => {
  return (
    <>
      <section class="pt-4 pb-10">
        <p class="text-shu text-sm font-medium tracking-widest uppercase">
          かな・スマッシュ
        </p>
        <h1 class="font-display mt-2 max-w-md text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Learn to read kana, ten questions at a time.
        </h1>
        <p class="text-ink-soft mt-4 max-w-md">
          Short multiple-choice drills that adapt to the characters you mix up.
          Pick a script to begin.
        </p>
      </section>

      <section aria-label="Choose a script" class="space-y-4">
        {SCRIPT_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            class={`border-paper-line bg-paper-deep/40 relative block overflow-hidden rounded-2xl border-2 p-6 pr-28 transition-colors ${card.ring}`}
          >
            <span
              aria-hidden="true"
              lang="ja"
              class={`font-kana absolute -top-3 right-2 text-[7rem] leading-none font-bold opacity-15 select-none ${card.accent}`}
            >
              {card.glyph}
            </span>
            <span class={`text-sm font-semibold ${card.accent}`} lang="ja">
              {card.ja}
            </span>
            <span class="font-display mt-1 block text-2xl font-bold">
              {card.en}
            </span>
            <span class="text-ink-soft mt-2 block max-w-xs text-sm">
              {card.blurb}
            </span>
          </Link>
        ))}
      </section>

      <section class="mt-12" aria-label="How practice works">
        <h2 class="font-display text-lg font-bold">Three ways you’ll drill</h2>
        <ul class="text-ink-soft mt-4 space-y-3 text-sm">
          {PRACTICE_MODES.map((mode) => (
            <li key={mode.kanji} class="flex items-baseline gap-3">
              <span
                lang="ja"
                class="font-kana text-ink w-8 shrink-0 text-xl font-semibold"
                aria-hidden="true"
              >
                {mode.kanji}
              </span>
              <span>
                <strong class="text-ink font-semibold">{mode.label}</strong> —{" "}
                {mode.blurb}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section class="bg-indigo-wash/60 mt-12 rounded-2xl p-6">
        <h2 class="font-display text-lg font-bold">
          Your mistakes become your lesson plan
        </h2>
        <p class="text-ink-soft mt-2 text-sm">
          Every answer is tracked on this device. A heatmap shows which kana
          trip you up, and a focused mode drills just those.
        </p>
        <Link
          href="/progress/"
          class="btn-primary mt-4 inline-block px-5 py-3"
        >
          See my progress
        </Link>
      </section>
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const title = "Kana Smash — practise hiragana & katakana";
  const description =
    "Short, adaptive multiple-choice drills for learning to read Japanese hiragana and katakana, with listening practice and a weakness heatmap.";
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
