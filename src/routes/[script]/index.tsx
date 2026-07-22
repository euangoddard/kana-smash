import {
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
  $,
} from "@builder.io/qwik";
import {
  Link,
  useLocation,
  type DocumentHead,
  type RequestHandler,
  type StaticGenerateHandler,
} from "@builder.io/qwik-city";
import { BackLink } from "~/components/back-link";
import { LevelCard } from "~/components/level-card";
import { SoundToggle } from "~/components/sound-toggle";
import {
  confusableKanaPool,
  displayKana,
  isScript,
  KANA_BY_ID,
  SCRIPT_LABELS,
  SCRIPTS,
  type Script,
} from "~/data/kana";
import {
  LEVELS,
  LOOKALIKES_LEVEL_ID,
  SECTION_LABELS,
  SECTIONS,
  WEAK_AREAS_LEVEL_ID,
} from "~/data/levels";
import { STUDY_WORD_BY_ID, wordLevelsForScript } from "~/data/words";
import { hasWeakAreaData, levelMastery, loadProgress } from "~/lib/progress";
import { buildMeta } from "~/lib/seo";
import { setSoundEnabled, soundEnabled } from "~/lib/settings";
import { findJapaneseVoice } from "~/lib/speech";

export const onGet: RequestHandler = ({ params, error }) => {
  if (!isScript(params.script)) throw error(404, "Not found");
};

export const onStaticGenerate: StaticGenerateHandler = () => ({
  params: SCRIPTS.map((script) => ({ script })),
});

export default component$(() => {
  const loc = useLocation();
  const script = loc.params.script as Script;
  const label = SCRIPT_LABELS[script];
  const lookalikeSample = confusableKanaPool(script)
    .slice(0, 4)
    .map((id) => displayKana(KANA_BY_ID.get(id)!, script))
    .join(" · ");

  const mastery = useStore<Record<string, number | null>>({});
  const weakReady = useSignal(false);
  const soundOn = useSignal(true);
  const loaded = useSignal(false);

  // Progress lives in localStorage, so all of this is client-only.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const data = loadProgress();
    for (const level of LEVELS) {
      mastery[level.id] = levelMastery(data, script, level.kanaIds);
    }
    // Word levels are read through the kana they contain, so their mastery
    // is the mastery of those kana (word answers feed the same records).
    for (const level of wordLevelsForScript(script)) {
      const kanaIds = [
        ...new Set(
          level.wordIds.flatMap(
            (id) => STUDY_WORD_BY_ID.get(id)?.kanaIds ?? [],
          ),
        ),
      ];
      mastery[`words:${level.id}`] = levelMastery(data, script, kanaIds);
    }
    weakReady.value = hasWeakAreaData(data, script);
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
          <h1 class="font-display text-3xl font-bold tracking-tight">
            {label.en}
          </h1>
          <p class="text-ink-soft mt-1" lang="ja">
            {label.ja}
          </p>
        </div>
        <SoundToggle on={soundOn.value} onToggle$={toggleSound} />
      </header>

      <section class="mt-6" aria-label="Focused practice">
        {weakReady.value ? (
          <Link
            href={`/${script}/quiz/${WEAK_AREAS_LEVEL_ID}/`}
            class="bg-shu text-paper hover:bg-shu-deep block rounded-2xl p-5 transition-colors"
          >
            <span class="font-display text-lg font-bold">
              Smash your weak spots
            </span>
            <span class="mt-1 block text-sm opacity-90">
              A session built from the {label.en.toLowerCase()} you miss most.
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

        <Link
          href={`/${script}/quiz/${LOOKALIKES_LEVEL_ID}/`}
          class="bg-fuji text-paper hover:bg-fuji-deep mt-3 block rounded-2xl p-5 transition-colors"
        >
          <span class="font-display text-lg font-bold">
            Tell the look-alikes apart
          </span>
          <span class="mt-1 block text-sm opacity-90">
            {label.en} that are easy to mix up
            {lookalikeSample && (
              <>
                {" "}
                — like{" "}
                <span lang="ja" class="font-kana">
                  {lookalikeSample}
                </span>
              </>
            )}
            .
          </span>
        </Link>
      </section>

      {SECTIONS.map((section) => (
        <section
          key={section}
          class="mt-10"
          aria-label={SECTION_LABELS[section]}
        >
          <h2 class="eyebrow">{SECTION_LABELS[section]}</h2>
          <ul class="mt-3 space-y-2">
            {LEVELS.filter((l) => l.section === section).map((level) => (
              <LevelCard
                key={level.id}
                href={`/${script}/quiz/${level.id}/`}
                title={level.title}
                sample={level.sample
                  .map((id) => {
                    const kana = KANA_BY_ID.get(id);
                    return kana ? displayKana(kana, script) : "";
                  })
                  .join("")}
                characterCount={level.kanaIds.length}
                mastery={loaded.value ? mastery[level.id] : undefined}
              />
            ))}
          </ul>
        </section>
      ))}

      <section class="mt-10" aria-label="Real words">
        <h2 class="eyebrow">Real words</h2>
        <p class="text-ink-soft mt-2 text-sm">
          Whole words, read in one go — where combination kana, small つ and
          long vowels really live.
        </p>
        <ul class="mt-3 space-y-2">
          {wordLevelsForScript(script).map((level) => (
            <LevelCard
              key={level.id}
              href={`/${script}/words/quiz/${level.id}/`}
              title={level.title}
              sample={level.sample}
              characterCount={level.wordIds.length}
              unit="words"
              mastery={loaded.value ? mastery[`words:${level.id}`] : undefined}
            />
          ))}
        </ul>
      </section>
    </>
  );
});

export const head: DocumentHead = ({ params, url }) => {
  const label = isScript(params.script)
    ? SCRIPT_LABELS[params.script].en
    : "Kana";
  const title = `${label} levels — Kana Smash`;
  const description = `Practise ${label} row by row with multiple-choice and listening drills.`;
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
