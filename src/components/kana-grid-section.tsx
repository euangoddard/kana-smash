import { component$ } from "@builder.io/qwik";
import { ALL_KANA, type Kana, type Script } from "~/data/kana";
import { KanaCell, type CellStat } from "./kana-cell";

export const kanaAt = (row: string, vowel: string): Kana | undefined =>
  ALL_KANA.find((k) => k.row === row && k.vowel === vowel);

interface KanaGridSectionProps {
  title: string;
  rows: string[];
  vowels: string[];
  script: Script;
  stats: Record<string, CellStat>;
}

/** A titled block of the progress heatmap: one row of kana per table row. */
export const KanaGridSection = component$<KanaGridSectionProps>(
  ({ title, rows, vowels, script, stats }) => (
    <section class="mt-8" aria-label={`${title} accuracy grid`}>
      <h2 class="eyebrow">{title}</h2>
      <div class="mt-3 space-y-1.5">
        {rows.map((row) => (
          <ul key={row} class="grid grid-cols-5 gap-1.5">
            {vowels.map((vowel) => {
              const kana = kanaAt(row, vowel);
              if (!kana)
                return <li key={vowel} aria-hidden="true" class="min-h-14" />;
              return (
                <KanaCell
                  key={vowel}
                  kana={kana}
                  script={script}
                  stat={stats[kana.id]}
                />
              );
            })}
          </ul>
        ))}
      </div>
    </section>
  ),
);
