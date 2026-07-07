import {
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
  $,
} from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { BackLink } from "~/components/back-link";
import { LevelCard } from "~/components/level-card";
import { SoundToggle } from "~/components/sound-toggle";
import {
  KANJI_LEVELS,
  KANJI_SECTION_LABELS,
  KANJI_SECTIONS,
  WEAK_KANJI_LEVEL_ID,
} from "~/data/kanji-levels";
import {
  hasWeakKanjiData,
  kanjiLevelMastery,
  loadKanjiProgress,
} from "~/lib/kanji-progress";
import { buildMeta } from "~/lib/seo";
import { setSoundEnabled, soundEnabled } from "~/lib/settings";
import { findJapaneseVoice } from "~/lib/speech";

export default component$(() => {
  const mastery = useStore<Record<string, number | null>>({});
  const weakReady = useSignal(false);
  const soundOn = useSignal(true);
  const loaded = useSignal(false);

  // Progress lives in localStorage, so all of this is client-only.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const data = loadKanjiProgress();
    for (const level of KANJI_LEVELS) {
      mastery[level.id] = kanjiLevelMastery(data, level.kanjiIds);
    }
    weakReady.value = hasWeakKanjiData(data);
    soundOn.value = soundEnabled();
    loaded.value = true;
    // Warm the voice cache so quizzes reached from here start instantly.
    void findJapaneseVoice();
  });

  const toggleSound = $(() => {
    soundOn.value = !soundOn.value;
    setSoundEnabled(soundOn.value);
  });

  return (
    <>
      <nav class="text-sm">
        <BackLink href="/">All scripts</BackLink>
      </nav>

      <header class="mt-4 flex items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-bold tracking-tight">Kanji</h1>
          <p class="text-ink-soft mt-1" lang="ja">
            漢字
          </p>
        </div>
        <SoundToggle on={soundOn.value} onToggle$={toggleSound} />
      </header>

      <p class="text-ink-soft mt-4 max-w-md text-sm">
        The 80 kanji of JLPT N5. Each one is drilled two ways — what it means,
        and how it&apos;s read inside real words — and both are tracked
        separately.
      </p>

      <section class="mt-6" aria-label="Focused practice">
        {weakReady.value ? (
          <Link
            href={`/kanji/quiz/${WEAK_KANJI_LEVEL_ID}/`}
            class="bg-shu text-paper hover:bg-shu-deep block rounded-2xl p-5 transition-colors"
          >
            <span class="font-display text-lg font-bold">
              Smash your weak spots
            </span>
            <span class="mt-1 block text-sm opacity-90">
              A session built from the kanji you miss most.
            </span>
          </Link>
        ) : (
          <div class="dashed-panel text-ink-soft p-5 text-sm">
            <span class="text-ink font-semibold">
              Weak-spot practice unlocks with data.
            </span>{" "}
            Finish a level or two below and a focused session will be built from
            whatever trips you up.
          </div>
        )}
      </section>

      {KANJI_SECTIONS.map((section) => (
        <section
          key={section}
          class="mt-10"
          aria-label={KANJI_SECTION_LABELS[section]}
        >
          <h2 class="eyebrow">{KANJI_SECTION_LABELS[section]}</h2>
          <ul class="mt-3 space-y-2">
            {KANJI_LEVELS.filter((l) => l.section === section).map((level) => (
              <LevelCard
                key={level.id}
                href={`/kanji/quiz/${level.id}/`}
                title={level.title}
                sample={level.sample.join("")}
                characterCount={level.kanjiIds.length}
                mastery={loaded.value ? mastery[level.id] : undefined}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const title = "Kanji levels — Kana Smash";
  const description =
    "Practise the 80 JLPT N5 kanji in themed levels, with meaning and reading drills.";
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
