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
import { isScript, SCRIPT_LABELS, SCRIPTS, type Script } from "~/data/kana";
import {
  LEVELS,
  SECTION_LABELS,
  SECTIONS,
  WEAK_AREAS_LEVEL_ID,
} from "~/data/levels";
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
                level={level}
                script={script}
                mastery={loaded.value ? mastery[level.id] : undefined}
              />
            ))}
          </ul>
        </section>
      ))}
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
