import {
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { BackLink } from "~/components/back-link";
import { SCRIPT_LABELS } from "~/data/kana";
import {
  CHALLENGE_COURSES,
  CHALLENGE_SECONDS,
  challengeBest,
  type ChallengeCourse,
} from "~/lib/challenge";
import { buildMeta } from "~/lib/seo";

const COURSE_INFO: Record<ChallengeCourse, { label: string; ja: string }> = {
  hiragana: { label: SCRIPT_LABELS.hiragana.en, ja: SCRIPT_LABELS.hiragana.ja },
  katakana: { label: SCRIPT_LABELS.katakana.en, ja: SCRIPT_LABELS.katakana.ja },
  kanji: { label: "Kanji", ja: "漢字" },
};

export default component$(() => {
  const best = useStore<Partial<Record<ChallengeCourse, number>>>({});
  const loaded = useSignal(false);

  // Best scores live in localStorage — client-only.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    for (const course of CHALLENGE_COURSES) {
      best[course] = challengeBest(course);
    }
    loaded.value = true;
  });

  return (
    <>
      <nav class="text-sm">
        <BackLink href="/">Home</BackLink>
      </nav>

      <h1 class="font-display mt-4 text-3xl font-bold tracking-tight">
        Challenge
      </h1>
      <p class="text-ink-soft mt-2 max-w-md text-sm">
        {CHALLENGE_SECONDS} seconds on the clock, as many answers as you can.
        The sprint draws from characters you&apos;ve already met, so it&apos;s a
        test of speed — every answer still counts toward your progress.
      </p>

      <ul class="mt-6 space-y-2" aria-label="Choose a course">
        {CHALLENGE_COURSES.map((course) => (
          <li key={course}>
            <Link
              href={`/challenge/${course}/`}
              class="card-link min-h-16 gap-4 px-4 py-3"
            >
              <span
                lang="ja"
                aria-hidden="true"
                class="font-kana text-ink-soft w-24 shrink-0 text-lg"
              >
                {COURSE_INFO[course].ja}
              </span>
              <span class="flex-1 font-semibold">
                {COURSE_INFO[course].label}
              </span>
              <span class="text-ink-faint text-sm">
                {loaded.value && (best[course] ?? 0) > 0
                  ? `Best: ${best[course]}`
                  : "No score yet"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const title = "Challenge — Kana Smash";
  const description =
    "A 60-second speed round over the kana and kanji you know, with a local best score to beat.";
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
