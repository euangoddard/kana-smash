import {
  $,
  component$,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from "@builder.io/qwik";
import {
  Link,
  useLocation,
  type DocumentHead,
  type RequestHandler,
  type StaticGenerateHandler,
} from "@builder.io/qwik-city";
import { AnswerOptions } from "~/components/quiz/answer-options";
import { BackLink } from "~/components/back-link";
import { StreakLine } from "~/components/streak-line";
import { SCRIPT_LABELS, type Script } from "~/data/kana";
import {
  CHALLENGE_COURSES,
  CHALLENGE_SECONDS,
  challengeBest,
  challengeKanaPool,
  challengeKanjiPool,
  isChallengeCourse,
  submitChallengeScore,
  type ChallengeCourse,
} from "~/lib/challenge";
import { playAnswerFeedback } from "~/lib/feedback";
import { vibrateAnswerFeedback } from "~/lib/haptics";
import { loadKanjiProgress, recordKanjiAnswer } from "~/lib/kanji-progress";
import { randomKanjiQuestion } from "~/lib/kanji-quiz";
import { loadProgress, recordAnswer } from "~/lib/progress";
import { randomKanaQuestion } from "~/lib/quiz";
import { buildMeta } from "~/lib/seo";
import type { KanjiFacet } from "~/data/kanji";

export const onGet: RequestHandler = ({ params, error }) => {
  if (!isChallengeCourse(params.course)) throw error(404, "Not found");
};

export const onStaticGenerate: StaticGenerateHandler = () => ({
  params: CHALLENGE_COURSES.map((course) => ({ course })),
});

type Phase = "ready" | "run" | "done";

/** A question flattened to what the sprint needs to render and record. */
interface ChallengeQuestion {
  prompt: string;
  promptLang?: string;
  promptClass: string;
  options: string[];
  optionLang?: string;
  optionClass: string;
  correctIndex: number;
  /** What to record the answer against. */
  kana?: { id: string };
  kanji?: { ids: string[]; facet: KanjiFacet };
  /** Id not to repeat in the next question. */
  targetId: string;
}

interface ChallengeState {
  phase: Phase;
  question: ChallengeQuestion | null;
  /** Total questions served — keys AnswerOptions remounts. */
  served: number;
  selected: number | null;
  correctCount: number;
  answeredCount: number;
  best: number;
  isRecord: boolean;
}

const COURSE_LABELS: Record<ChallengeCourse, string> = {
  hiragana: SCRIPT_LABELS.hiragana.en,
  katakana: SCRIPT_LABELS.katakana.en,
  kanji: "Kanji",
};

/** How long the answer colours stay up before the next question. */
const NEXT_DELAY_CORRECT_MS = 350;
const NEXT_DELAY_WRONG_MS = 1100;

export default component$(() => {
  const loc = useLocation();
  const course = loc.params.course as ChallengeCourse;

  const state = useStore<ChallengeState>({
    phase: "ready",
    question: null,
    served: 0,
    selected: null,
    correctCount: 0,
    answeredCount: 0,
    best: 0,
    isRecord: false,
  });
  /** Seconds left, in tenths for a smooth bar. */
  const remaining = useSignal(CHALLENGE_SECONDS);

  // Reset synchronously when navigating to a different course — Qwik City
  // reuses this component instance across same-route navigations.
  useTask$(({ track }) => {
    track(() => loc.params.course);
    state.phase = "ready";
    state.question = null;
    state.selected = null;
  });

  // Best score lives in localStorage — client-only.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => loc.params.course);
    state.best = challengeBest(loc.params.course as ChallengeCourse);
  });

  const nextQuestion = $(() => {
    const currentCourse = loc.params.course as ChallengeCourse;
    const avoidId = state.question?.targetId;
    if (currentCourse === "kanji") {
      const pool = challengeKanjiPool(loadKanjiProgress());
      const q = randomKanjiQuestion(pool, avoidId);
      state.question = {
        prompt: q.prompt,
        promptLang: q.kind === "meaning-to-kanji" ? undefined : "ja",
        promptClass:
          q.kind === "meaning-to-kanji"
            ? "font-display text-3xl font-bold text-balance"
            : "font-kana text-6xl font-medium tracking-wide",
        options: q.options,
        optionLang: q.kind === "kanji-to-meaning" ? undefined : "ja",
        optionClass:
          q.kind === "kanji-to-meaning"
            ? "font-display text-lg font-semibold"
            : "font-kana text-3xl",
        correctIndex: q.correctIndex,
        kanji: { ids: q.testedKanjiIds, facet: q.facet },
        targetId: q.kanjiId,
      };
    } else {
      const script = currentCourse as Script;
      const pool = challengeKanaPool(loadProgress(), script);
      const q = randomKanaQuestion(pool, script, avoidId);
      const answerAsKana = q.kind !== "kana-to-romaji";
      state.question = {
        prompt: q.prompt,
        promptLang: answerAsKana ? undefined : "ja",
        promptClass: answerAsKana
          ? "font-display text-6xl font-bold lowercase"
          : "font-kana text-7xl font-medium tracking-wide",
        options: q.options,
        optionLang: answerAsKana ? "ja" : undefined,
        optionClass: answerAsKana
          ? "font-kana text-4xl"
          : "font-display text-2xl font-semibold lowercase",
        correctIndex: q.correctIndex,
        kana: { id: q.kanaId },
        targetId: q.kanaId,
      };
    }
    state.served++;
    state.selected = null;
  });

  const start = $(() => {
    state.correctCount = 0;
    state.answeredCount = 0;
    state.isRecord = false;
    remaining.value = CHALLENGE_SECONDS;
    state.question = null;
    void nextQuestion().then(() => {
      state.phase = "run";
    });
  });

  const finish = $(() => {
    if (state.phase !== "run") return;
    state.phase = "done";
    const currentCourse = loc.params.course as ChallengeCourse;
    state.isRecord = submitChallengeScore(currentCourse, state.correctCount);
    state.best = challengeBest(currentCourse);
  });

  // The countdown. Runs only during the sprint; cleans up on leave.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    track(() => state.phase);
    if (state.phase !== "run") return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const left = CHALLENGE_SECONDS - (Date.now() - startedAt) / 1000;
      remaining.value = Math.max(0, left);
      if (left <= 0) void finish();
    }, 100);
    cleanup(() => clearInterval(timer));
  });

  const answer = $((optionIndex: number) => {
    if (state.selected !== null || state.phase !== "run") return;
    const q = state.question;
    if (!q) return;
    const correct = optionIndex === q.correctIndex;
    state.selected = optionIndex;
    state.answeredCount++;
    if (correct) state.correctCount++;
    if (q.kana) {
      recordAnswer(loc.params.course as Script, q.kana.id, correct);
    } else if (q.kanji) {
      recordKanjiAnswer(q.kanji.ids, q.kanji.facet, correct);
    }
    playAnswerFeedback(correct);
    vibrateAnswerFeedback(correct);
    setTimeout(
      () => {
        // The clock may have run out while the colours were up.
        if (state.phase === "run") void nextQuestion();
      },
      correct ? NEXT_DELAY_CORRECT_MS : NEXT_DELAY_WRONG_MS,
    );
  });

  const q = state.question;
  const secondsLeft = Math.ceil(remaining.value);

  return (
    <>
      <nav class="flex items-center justify-between text-sm">
        <BackLink href="/challenge/" class="rounded-lg py-2 pr-3">
          Quit
        </BackLink>
        <span class="text-ink-soft font-medium">
          Challenge · {COURSE_LABELS[course]}
        </span>
      </nav>

      {state.phase === "ready" && (
        <div class="mt-16 text-center">
          <p class="eyebrow">Speed round</p>
          <h1 class="font-display mt-2 text-3xl font-bold tracking-tight">
            {CHALLENGE_SECONDS} seconds. Go fast.
          </h1>
          <p class="text-ink-soft mx-auto mt-3 max-w-sm">
            Answer as many as you can before the clock runs out. Wrong answers
            cost you nothing but time.
          </p>
          {state.best > 0 && (
            <p class="text-ink-soft mt-3 text-sm">
              Your best: <strong class="text-ink">{state.best}</strong>
            </p>
          )}
          <button
            type="button"
            onClick$={start}
            class="btn-primary mt-8 min-h-12 px-8 py-3 text-lg"
          >
            Start the clock
          </button>
        </div>
      )}

      {state.phase === "run" && q && (
        <div class="mt-4">
          <div class="flex items-baseline justify-between">
            <p class="text-ink-faint text-sm font-medium" aria-live="off">
              {secondsLeft}s left
            </p>
            <p class="font-display text-lg font-bold">
              {state.correctCount}
              <span class="text-ink-faint text-sm"> correct</span>
            </p>
          </div>
          <div
            aria-hidden="true"
            class="bg-paper-deep mt-2 h-1.5 overflow-hidden rounded-full"
          >
            <div
              class={`h-full rounded-full ${secondsLeft <= 10 ? "bg-shu" : "bg-indigo-ai"}`}
              style={{
                width: `${(remaining.value / CHALLENGE_SECONDS) * 100}%`,
              }}
            />
          </div>

          <div class="mt-10 flex justify-center">
            <p lang={q.promptLang} class={q.promptClass}>
              {q.prompt}
            </p>
          </div>

          <AnswerOptions
            question={q}
            questionIndex={state.served}
            selected={state.selected}
            onAnswer$={answer}
            lang={q.optionLang}
            optionClass={q.optionClass}
          />
        </div>
      )}

      {state.phase === "done" && (
        <div class="mt-10 text-center" aria-live="polite">
          <p class="eyebrow">Time&apos;s up</p>
          <p class="font-display mt-4 text-6xl font-bold">
            {state.correctCount}
          </p>
          <p class="text-ink-soft mt-2">
            {state.correctCount} correct out of {state.answeredCount} answered
            in {CHALLENGE_SECONDS} seconds.
          </p>
          {state.isRecord ? (
            <p class="text-shu mt-3 font-semibold">
              New record! Previous best beaten.
            </p>
          ) : (
            <p class="text-ink-soft mt-3 text-sm">
              Your best: <strong class="text-ink">{state.best}</strong>
            </p>
          )}
          <StreakLine />
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick$={start}
              class="btn-primary min-h-12 px-6 py-3"
            >
              Go again
            </button>
            <Link href="/challenge/" class="btn-outline">
              All courses
            </Link>
            <Link href={`/progress/?script=${course}`} class="btn-outline">
              My progress
            </Link>
          </div>
        </div>
      )}
    </>
  );
});

export const head: DocumentHead = ({ params, url }) => {
  const label = isChallengeCourse(params.course)
    ? COURSE_LABELS_HEAD[params.course]
    : "Kana";
  const title = `${label} challenge — Kana Smash`;
  const description = `A ${CHALLENGE_SECONDS}-second ${label.toLowerCase()} speed round with a local best score.`;
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};

const COURSE_LABELS_HEAD: Record<ChallengeCourse, string> = {
  hiragana: "Hiragana",
  katakana: "Katakana",
  kanji: "Kanji",
};
