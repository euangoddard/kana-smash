import {
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead } from "@builder.io/qwik-city";
import { buildMeta } from "~/lib/seo";
import { BackLink } from "~/components/back-link";
import { KanaCell, type CellStat } from "~/components/kana-cell";
import { kanaAt, KanaGridSection } from "~/components/kana-grid-section";
import { KanjiGridSection } from "~/components/kanji-grid-section";
import {
  ALL_KANA,
  displayKana,
  isScript,
  SCRIPT_LABELS,
  SCRIPTS,
  type Script,
} from "~/data/kana";
import { ALL_KANJI } from "~/data/kanji";
import { KANJI_LEVELS, WEAK_KANJI_LEVEL_ID } from "~/data/kanji-levels";
import { WEAK_AREAS_LEVEL_ID } from "~/data/levels";
import { kanjiStats, loadKanjiProgress } from "~/lib/kanji-progress";
import {
  loadProgress,
  scriptStats,
  WEAK_THRESHOLD,
  MIN_ATTEMPTS,
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

/** The progress page covers kanji too, which isn't a `Script`. */
type Tab = Script | "kanji";
const TABS: Tab[] = [...SCRIPTS, "kanji"];
const isTab = (value: string): value is Tab =>
  isScript(value) || value === "kanji";
const tabLabel = (tab: Tab): string =>
  tab === "kanji" ? "Kanji" : SCRIPT_LABELS[tab].en;

/** Levels that partition the kanji set — checkpoints and review repeat them. */
const KANJI_GROUPS = KANJI_LEVELS.filter(
  (l) => l.section !== "review" && !l.id.startsWith("checkpoint-"),
);

/** One weak-spot chip, display-ready for either kana or kanji. */
interface WeakSpot {
  id: string;
  glyph: string;
  hint: string;
  score: number | null;
  attempts: number;
}

export default component$(() => {
  const loc = useLocation();
  const requested = loc.url.searchParams.get("script");
  const activeTab = useSignal<Tab>(
    requested && isTab(requested) ? requested : "hiragana",
  );
  const stats = useStore<Record<Tab, Record<string, CellStat>>>({
    hiragana: {},
    katakana: {},
    kanji: {},
  });
  const loaded = useSignal(false);

  // Progress lives in localStorage — client-only.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    // On a hard load of this static page the ?script= param isn't in the
    // prerendered state, so re-read it from the browser URL.
    const param = new URLSearchParams(window.location.search).get("script");
    if (param && isTab(param)) activeTab.value = param;

    const data = loadProgress();
    for (const script of SCRIPTS) {
      for (const stat of scriptStats(data, script)) {
        stats[script][stat.kana.id] = {
          score: stat.score,
          attempts: stat.attempts,
        };
      }
    }
    for (const stat of kanjiStats(loadKanjiProgress())) {
      stats.kanji[stat.kanji.id] = {
        score: stat.score,
        attempts: stat.attempts,
      };
    }
    loaded.value = true;
  });

  const tab = activeTab.value;
  const current = stats[tab];
  const attemptedCount = Object.values(current).filter(
    (s) => s.attempts > 0,
  ).length;
  const candidates: WeakSpot[] =
    tab === "kanji"
      ? ALL_KANJI.map((kanji) => ({
          id: kanji.id,
          glyph: kanji.id,
          hint: kanji.meaning,
          ...(current[kanji.id] ?? { score: null, attempts: 0 }),
        }))
      : ALL_KANA.map((kana) => ({
          id: kana.id,
          glyph: displayKana(kana, tab),
          hint: kana.romaji,
          ...(current[kana.id] ?? { score: null, attempts: 0 }),
        }));
  const weakest = candidates
    .filter(
      (s): s is WeakSpot & { score: number } =>
        s.score !== null &&
        s.attempts >= MIN_ATTEMPTS &&
        s.score < WEAK_THRESHOLD,
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);
  const sectionHref = tab === "kanji" ? "/kanji/" : `/${tab}/`;
  const drillHref =
    tab === "kanji"
      ? `/kanji/quiz/${WEAK_KANJI_LEVEL_ID}/?from=progress`
      : `/${tab}/quiz/${WEAK_AREAS_LEVEL_ID}/?from=progress`;

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
        {tab === "kanji" &&
          " Each kanji is coloured by its weaker skill — meaning or reading."}
      </p>

      <div
        role="group"
        aria-label="Script"
        class="bg-paper-deep mt-6 grid grid-cols-3 gap-1 rounded-xl p-1"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={activeTab.value === t}
            onClick$={() => (activeTab.value = t)}
            class={`min-h-11 rounded-lg text-sm font-semibold transition-colors ${
              activeTab.value === t
                ? "bg-indigo-ai text-paper"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {tabLabel(t)}
          </button>
        ))}
      </div>

      {loaded.value && attemptedCount === 0 && (
        <div class="dashed-panel mt-8 p-6 text-center">
          <p class="font-display text-lg font-bold">
            No {tabLabel(tab).toLowerCase()} answers yet.
          </p>
          <p class="text-ink-soft mx-auto mt-2 max-w-sm text-sm">
            This page fills in as you practise — every answer colours the map
            below.
          </p>
          <Link
            href={sectionHref}
            class="btn-primary mt-5 inline-block px-5 py-3"
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
              <li key={s.id} class="chip bg-paper text-shu-deep">
                <span lang="ja" class="font-kana text-xl">
                  {s.glyph}
                </span>{" "}
                <span class="text-sm">
                  {s.hint} · {Math.round(s.score * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={drillHref}
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

      {tab === "kanji" ? (
        KANJI_GROUPS.map((group) => (
          <KanjiGridSection
            key={group.id}
            title={group.title}
            kanjiIds={group.kanjiIds}
            stats={current}
          />
        ))
      ) : (
        <>
          <KanaGridSection
            title="Basics"
            rows={BASIC_ROWS}
            vowels={["a", "i", "u", "e", "o"]}
            script={tab}
            stats={current}
          />

          <section class="mt-4" aria-label="n accuracy">
            <ul class="grid grid-cols-5 gap-1.5">
              {(() => {
                const kana = kanaAt("w", "n")!;
                return (
                  <KanaCell kana={kana} script={tab} stat={current[kana.id]} />
                );
              })()}
            </ul>
          </section>

          <KanaGridSection
            title="Dakuten & handakuten"
            rows={DAKUTEN_ROWS}
            vowels={["a", "i", "u", "e", "o"]}
            script={tab}
            stats={current}
          />
          <KanaGridSection
            title="Combination kana"
            rows={YOON_ROWS}
            vowels={["a", "u", "o"]}
            script={tab}
            stats={current}
          />
        </>
      )}
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const title = "My progress — Kana Smash";
  const description =
    "A heatmap of your hiragana, katakana and kanji accuracy.";
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
