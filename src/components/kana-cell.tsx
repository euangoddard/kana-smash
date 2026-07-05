import { component$ } from "@builder.io/qwik";
import { displayKana, type Kana, type Script } from "~/data/kana";

export interface CellStat {
  score: number | null;
  attempts: number;
}

const cellStyle = (stat: CellStat | undefined): string => {
  if (!stat || stat.score === null) return "bg-paper-deep/60 text-ink-faint";
  if (stat.score < 0.5) return "bg-heat-low/80 text-ink";
  if (stat.score < 0.75) return "bg-heat-mid/80 text-ink";
  if (stat.score < 0.9) return "bg-heat-high text-ink";
  return "bg-matcha text-paper";
};

const cellLabel = (kana: Kana, script: Script, stat: CellStat | undefined) => {
  const name = `${displayKana(kana, script)}, ${kana.romaji}`;
  if (!stat || stat.score === null) return `${name}: not practised yet`;
  return `${name}: ${Math.round(stat.score * 100)}% accuracy over ${stat.attempts} recent answers`;
};

interface KanaCellProps {
  kana: Kana;
  script: Script;
  stat: CellStat | undefined;
}

/** One cell of the progress heatmap: a kana coloured by recent accuracy. */
export const KanaCell = component$<KanaCellProps>(({ kana, script, stat }) => (
  <li
    aria-label={cellLabel(kana, script, stat)}
    class={`grid min-h-14 place-items-center rounded-lg ${cellStyle(stat)}`}
  >
    <span aria-hidden="true" class="text-center">
      <span lang="ja" class="font-kana block text-lg leading-tight">
        {displayKana(kana, script)}
      </span>
      <span class="block text-[0.65rem] leading-tight opacity-80">
        {kana.romaji}
      </span>
    </span>
  </li>
));
