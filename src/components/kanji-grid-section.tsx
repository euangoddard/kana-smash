import { component$ } from "@builder.io/qwik";
import { KANJI_BY_ID, type Kanji } from "~/data/kanji";
import { cellStyle, type CellStat } from "./kana-cell";

const cellLabel = (kanji: Kanji, stat: CellStat | undefined) => {
  const name = `${kanji.id}, ${kanji.meaning}`;
  if (!stat || stat.score === null) return `${name}: not practised yet`;
  return `${name}: ${Math.round(stat.score * 100)}% accuracy over ${stat.attempts} recent answers`;
};

interface KanjiCellProps {
  kanji: Kanji;
  stat: CellStat | undefined;
}

/** One cell of the progress heatmap: a kanji coloured by recent accuracy. */
export const KanjiCell = component$<KanjiCellProps>(({ kanji, stat }) => (
  <li
    aria-label={cellLabel(kanji, stat)}
    class={`grid min-h-14 place-items-center rounded-lg px-1 ${cellStyle(stat)}`}
  >
    <span aria-hidden="true" class="min-w-0 text-center">
      <span lang="ja" class="font-kana block text-lg leading-tight">
        {kanji.id}
      </span>
      <span class="block truncate text-[0.65rem] leading-tight opacity-80">
        {kanji.meaning}
      </span>
    </span>
  </li>
));

interface KanjiGridSectionProps {
  title: string;
  kanjiIds: string[];
  stats: Record<string, CellStat>;
}

/** A titled block of the kanji progress heatmap. */
export const KanjiGridSection = component$<KanjiGridSectionProps>(
  ({ title, kanjiIds, stats }) => (
    <section class="mt-8" aria-label={`${title} accuracy grid`}>
      <h2 class="eyebrow">{title}</h2>
      <ul class="mt-3 grid grid-cols-5 gap-1.5">
        {kanjiIds.map((id) => {
          const kanji = KANJI_BY_ID.get(id);
          if (!kanji) return null;
          return <KanjiCell key={id} kanji={kanji} stat={stats[id]} />;
        })}
      </ul>
    </section>
  ),
);
