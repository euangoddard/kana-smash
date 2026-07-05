import {
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { buildMeta } from "~/lib/seo";
import { BackLink } from "~/components/back-link";
import { KanaCell, type CellStat } from "~/components/kana-cell";
import { kanaAt, KanaGridSection } from "~/components/kana-grid-section";
import {
  ALL_KANA,
  displayKana,
  SCRIPT_LABELS,
  SCRIPTS,
  type Script,
} from "~/data/kana";
import { WEAK_AREAS_LEVEL_ID } from "~/data/levels";
import {
  loadProgress,
  scriptStats,
  WEAK_THRESHOLD,
  MIN_ATTEMPTS,
  type KanaStat,
} from "~/lib/progress";

const BASIC_ROWS = ["vowel", "k", "s", "t", "n", "h", "m", "y", "r", "w"];
const DAKUTEN_ROWS = ["g", "z", "d", "b", "p"];
const YOON_ROWS = [
  "ky",
  "sh",
  "ch",
  "ny",
  "hy",
  "my",
  "ry",
  "gy",
  "j",
  "by",
  "py",
];

const LEGEND = [
  { label: "Not seen", class: "bg-paper-deep/60" },
  { label: "Needs work", class: "bg-heat-low/80" },
  { label: "Getting there", class: "bg-heat-mid/80" },
  { label: "Nearly", class: "bg-heat-high" },
  { label: "Solid", class: "bg-matcha" },
];

export default component$(() => {
  const activeScript = useSignal<Script>("hiragana");
  const stats = useStore<Record<Script, Record<string, CellStat>>>({
    hiragana: {},
    katakana: {},
  });
  const loaded = useSignal(false);

  // Progress lives in localStorage — client-only.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const data = loadProgress();
    for (const script of SCRIPTS) {
      for (const stat of scriptStats(data, script)) {
        stats[script][stat.kana.id] = {
          score: stat.score,
          attempts: stat.attempts,
        };
      }
    }
    loaded.value = true;
  });

  const script = activeScript.value;
  const current = stats[script];
  const attemptedCount = Object.values(current).filter(
    (s) => s.attempts > 0,
  ).length;
  const weakest: KanaStat[] = ALL_KANA.map((kana) => ({
    kana,
    ...(current[kana.id] ?? { score: null, attempts: 0 }),
  }))
    .filter(
      (s): s is KanaStat & { score: number } =>
        s.score !== null &&
        s.attempts >= MIN_ATTEMPTS &&
        s.score < WEAK_THRESHOLD,
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  return (
    <>
      <nav class="text-sm">
        <BackLink href="/">Home</BackLink>
      </nav>

      <h1 class="font-display mt-4 text-3xl font-bold tracking-tight">
        My progress
      </h1>
      <p class="text-ink-soft mt-2 max-w-md text-sm">
        Recent answers count more than old ones, so this map shows how you’re
        doing <em>now</em> — not a lifetime average.
      </p>

      <div
        role="group"
        aria-label="Script"
        class="bg-paper-deep mt-6 grid grid-cols-2 gap-1 rounded-xl p-1"
      >
        {SCRIPTS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={activeScript.value === s}
            onClick$={() => (activeScript.value = s)}
            class={`min-h-11 rounded-lg text-sm font-semibold transition-colors ${
              activeScript.value === s
                ? "bg-indigo-ai text-paper"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {SCRIPT_LABELS[s].en}
          </button>
        ))}
      </div>

      {loaded.value && attemptedCount === 0 && (
        <div class="border-paper-line mt-8 rounded-2xl border-2 border-dashed p-6 text-center">
          <p class="font-display text-lg font-bold">
            No {SCRIPT_LABELS[script].en.toLowerCase()} answers yet.
          </p>
          <p class="text-ink-soft mx-auto mt-2 max-w-sm text-sm">
            This page fills in as you practise — every answer colours the map
            below.
          </p>
          <Link
            href={`/${script}/`}
            class="bg-indigo-ai text-paper hover:bg-indigo-deep mt-5 inline-block rounded-xl px-5 py-3 font-semibold"
          >
            Start practising
          </Link>
        </div>
      )}

      {loaded.value && weakest.length > 0 && (
        <section
          class="bg-shu-wash/70 mt-8 rounded-2xl p-5"
          aria-label="Weakest characters"
        >
          <h2 class="font-display text-lg font-bold">Current weak spots</h2>
          <ul class="mt-3 flex flex-wrap gap-2">
            {weakest.map((s) => (
              <li
                key={s.kana.id}
                class="bg-paper text-shu-deep rounded-lg px-3 py-1.5"
              >
                <span lang="ja" class="font-kana text-xl">
                  {displayKana(s.kana, script)}
                </span>{" "}
                <span class="text-sm">
                  {s.kana.romaji} · {Math.round((s.score ?? 0) * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={`/${script}/quiz/${WEAK_AREAS_LEVEL_ID}/`}
            class="bg-shu text-paper hover:bg-shu-deep mt-4 inline-block rounded-xl px-5 py-3 font-semibold transition-colors"
          >
            Drill these now
          </Link>
        </section>
      )}

      <div class="mt-6 flex flex-wrap gap-x-4 gap-y-2" aria-hidden="true">
        {LEGEND.map((item) => (
          <span
            key={item.label}
            class="text-ink-soft flex items-center gap-1.5 text-xs"
          >
            <span class={`size-3.5 rounded ${item.class}`} />
            {item.label}
          </span>
        ))}
      </div>

      <KanaGridSection
        title="Basics"
        rows={BASIC_ROWS}
        vowels={["a", "i", "u", "e", "o"]}
        script={script}
        stats={current}
      />

      <section class="mt-4" aria-label="n accuracy">
        <ul class="grid grid-cols-5 gap-1.5">
          {(() => {
            const kana = kanaAt("w", "n")!;
            return (
              <KanaCell kana={kana} script={script} stat={current[kana.id]} />
            );
          })()}
        </ul>
      </section>

      <KanaGridSection
        title="Dakuten & handakuten"
        rows={DAKUTEN_ROWS}
        vowels={["a", "i", "u", "e", "o"]}
        script={script}
        stats={current}
      />
      <KanaGridSection
        title="Combination kana"
        rows={YOON_ROWS}
        vowels={["a", "u", "o"]}
        script={script}
        stats={current}
      />
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const title = "My progress — Kana Smash";
  const description = "A heatmap of your hiragana and katakana accuracy.";
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
