import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

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
  href: string;
  title: string;
  /** Sample characters shown alongside the title. */
  sample: string;
  characterCount: number;
  /** What's being counted — "characters" for levels, "words" for vocab. */
  unit?: string;
  /** null = attempted but unscored, undefined = mastery not loaded yet. */
  mastery: number | null | undefined;
}

/** One level entry in a level list, with its mastery chip. */
export const LevelCard = component$<LevelCardProps>(
  ({ href, title, sample, characterCount, unit = "characters", mastery }) => {
    const chip = masteryChip(mastery);
    return (
      <li>
        <Link href={href} class="card-link min-h-16 gap-4 px-4 py-3">
          <span
            lang="ja"
            aria-hidden="true"
            class="font-kana text-ink-soft w-24 shrink-0 text-lg"
          >
            {sample}
          </span>
          <span class="flex-1">
            <span class="block font-semibold">{title}</span>
            <span class="text-ink-faint block text-xs">
              {characterCount} {unit}
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
