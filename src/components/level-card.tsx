import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { displayKana, KANA_BY_ID, type Script } from "~/data/kana";
import type { Level } from "~/data/levels";

const masteryChip = (score: number | null | undefined) => {
  if (score === null || score === undefined) {
    return { label: "not started", class: "bg-paper-deep text-ink-faint" };
  }
  const pct = Math.round(score * 100);
  if (pct >= 90)
    return { label: `${pct}%`, class: "bg-matcha-wash text-matcha" };
  if (pct >= 60)
    return { label: `${pct}%`, class: "bg-heat-mid/30 text-ink-soft" };
  return { label: `${pct}%`, class: "bg-shu-wash text-shu-deep" };
};

interface LevelCardProps {
  level: Level;
  script: Script;
  /** null = attempted but unscored, undefined = mastery not loaded yet. */
  mastery: number | null | undefined;
}

/** One level entry in a script's level list, with its mastery chip. */
export const LevelCard = component$<LevelCardProps>(
  ({ level, script, mastery }) => {
    const chip = masteryChip(mastery);
    return (
      <li>
        <Link
          href={`/${script}/quiz/${level.id}/`}
          class="border-paper-line hover:border-indigo-ai flex min-h-16 items-center gap-4 rounded-xl border-2 px-4 py-3 transition-colors"
        >
          <span
            lang="ja"
            aria-hidden="true"
            class="font-kana text-ink-soft w-24 shrink-0 text-lg"
          >
            {level.sample
              .map((id) => {
                const kana = KANA_BY_ID.get(id);
                return kana ? displayKana(kana, script) : "";
              })
              .join("")}
          </span>
          <span class="flex-1">
            <span class="block font-semibold">{level.title}</span>
            <span class="text-ink-faint block text-xs">
              {level.kanaIds.length} characters
            </span>
          </span>
          <span
            class={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip.class}`}
          >
            {chip.label}
          </span>
        </Link>
      </li>
    );
  },
);
