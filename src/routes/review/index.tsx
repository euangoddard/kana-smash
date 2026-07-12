import {
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { BackLink } from "~/components/back-link";
import { SCRIPT_LABELS, SCRIPTS } from "~/data/kana";
import { DUE_KANJI_REVIEW_LEVEL_ID } from "~/data/kanji-levels";
import { DUE_REVIEW_LEVEL_ID } from "~/data/levels";
import { loadKanjiProgress } from "~/lib/kanji-progress";
import { loadProgress } from "~/lib/progress";
import { buildMeta } from "~/lib/seo";
import { dueKana, dueKanji } from "~/lib/srs";
import { streakStats, type StreakStats } from "~/lib/streak";

interface CourseDue {
  href: string;
  label: string;
  ja: string;
  due: number;
}

export default component$(() => {
  const stats = useSignal<StreakStats | null>(null);
  const courses = useStore<{ list: CourseDue[] }>({ list: [] });
  const loaded = useSignal(false);

  // Everything here derives from localStorage — client-only.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const kanaData = loadProgress();
    courses.list = [
      ...SCRIPTS.map((script) => ({
        href: `/${script}/quiz/${DUE_REVIEW_LEVEL_ID}/?from=review`,
        label: SCRIPT_LABELS[script].en,
        ja: SCRIPT_LABELS[script].ja,
        due: dueKana(kanaData, script).length,
      })),
      {
        href: `/kanji/quiz/${DUE_KANJI_REVIEW_LEVEL_ID}/?from=review`,
        label: "Kanji",
        ja: "漢字",
        due: dueKanji(loadKanjiProgress()).length,
      },
    ];
    stats.value = streakStats();
    loaded.value = true;
  });

  const totalDue = courses.list.reduce((sum, c) => sum + c.due, 0);
  const s = stats.value;

  return (
    <>
      <nav class="text-sm">
        <BackLink href="/">Home</BackLink>
      </nav>

      <h1 class="font-display mt-4 text-3xl font-bold tracking-tight">
        Daily review
      </h1>
      <p class="text-ink-soft mt-2 max-w-md text-sm">
        Spaced repetition keeps what you&apos;ve learned alive: each character
        comes back just before you&apos;d forget it — quickly after a miss,
        rarely once it&apos;s solid.
      </p>

      {s && (
        <section
          class="bg-indigo-wash/60 mt-6 rounded-2xl p-5"
          aria-label="Streak and daily goal"
        >
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-display text-2xl font-bold">
                <span aria-hidden="true" lang="ja" class="text-shu">
                  火
                </span>{" "}
                {s.current === 1 ? "1 day" : `${s.current} days`}
              </p>
              <p class="text-ink-soft mt-0.5 text-sm">
                Current streak · best {s.best}
              </p>
            </div>
            <div class="text-right">
              <p class="font-display text-2xl font-bold">
                {Math.min(s.today, s.goal)}
                <span class="text-ink-faint text-base"> / {s.goal}</span>
              </p>
              <p class="text-ink-soft mt-0.5 text-sm">
                {s.goalMet ? "Goal reached today!" : "answers today"}
              </p>
            </div>
          </div>
          <div
            aria-hidden="true"
            class="bg-paper mt-4 h-2 overflow-hidden rounded-full"
          >
            <div
              class={`h-full rounded-full transition-all ${s.goalMet ? "bg-matcha" : "bg-indigo-ai"}`}
              style={{
                width: `${Math.min(100, (s.today / s.goal) * 100)}%`,
              }}
            />
          </div>
        </section>
      )}

      <section class="mt-8" aria-label="Due for review">
        <h2 class="eyebrow">Due for review</h2>
        {loaded.value && totalDue === 0 && (
          <div class="dashed-panel mt-3 p-5 text-sm">
            <span class="text-ink font-semibold">All caught up.</span>{" "}
            <span class="text-ink-soft">
              Nothing is due right now — practise a level to add characters to
              the rotation, or come back later.
            </span>
          </div>
        )}
        <ul class="mt-3 space-y-2">
          {courses.list.map((course) => (
            <li key={course.href}>
              {course.due > 0 ? (
                <Link
                  href={course.href}
                  class="card-link min-h-16 gap-4 px-4 py-3"
                >
                  <span
                    lang="ja"
                    aria-hidden="true"
                    class="font-kana text-ink-soft w-24 shrink-0 text-lg"
                  >
                    {course.ja}
                  </span>
                  <span class="flex-1 font-semibold">{course.label}</span>
                  <span class="bg-shu-wash text-shu-deep rounded-full px-2.5 py-1 text-xs font-semibold">
                    {course.due} due
                  </span>
                </Link>
              ) : (
                <div class="border-paper-line flex min-h-16 items-center gap-4 rounded-xl border-2 px-4 py-3 opacity-60">
                  <span
                    lang="ja"
                    aria-hidden="true"
                    class="font-kana text-ink-soft w-24 shrink-0 text-lg"
                  >
                    {course.ja}
                  </span>
                  <span class="flex-1 font-semibold">{course.label}</span>
                  <span class="bg-matcha-wash text-matcha rounded-full px-2.5 py-1 text-xs font-semibold">
                    {loaded.value ? "caught up" : "…"}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p class="text-ink-faint mt-6 text-sm">
        Review sessions drill the most overdue characters first, up to twelve at
        a time — short enough to clear with your morning coffee.
      </p>
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const title = "Daily review — Kana Smash";
  const description =
    "Spaced-repetition review of the kana and kanji you've learned, plus your practice streak and daily goal.";
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
