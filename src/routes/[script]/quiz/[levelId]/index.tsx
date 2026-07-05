import { $, component$, useStore, useVisibleTask$ } from "@builder.io/qwik";
import {
  useLocation,
  type DocumentHead,
  type RequestHandler,
  type StaticGenerateHandler,
} from "@builder.io/qwik-city";
import { AnswerOptions } from "~/components/quiz/answer-options";
import { BackLink } from "~/components/back-link";
import { QuizEmpty } from "~/components/quiz/quiz-empty";
import { QuizFeedback } from "~/components/quiz/quiz-feedback";
import { QuizProgress } from "~/components/quiz/quiz-progress";
import { QuizPrompt } from "~/components/quiz/quiz-prompt";
import { QuizResults } from "~/components/quiz/quiz-results";
import {
  displayKana,
  isScript,
  KANA_BY_ID,
  SCRIPT_LABELS,
  SCRIPTS,
  type Script,
} from "~/data/kana";
import { LEVELS, LEVELS_BY_ID, WEAK_AREAS_LEVEL_ID } from "~/data/levels";
import {
  hasWeakAreaData,
  loadProgress,
  recordAnswer,
  weakKana,
} from "~/lib/progress";
import {
  DEFAULT_QUESTION_COUNT,
  generateQuiz,
  type Question,
} from "~/lib/quiz";
import { kanaSoundAvailable, playKanaSound } from "~/lib/audio";
import { playAnswerFeedback } from "~/lib/feedback";
import { vibrateAnswerFeedback } from "~/lib/haptics";
import { buildMeta } from "~/lib/seo";
import { soundEnabled } from "~/lib/settings";

export const onGet: RequestHandler = ({ params, error }) => {
  const validLevel =
    LEVELS_BY_ID.has(params.levelId) || params.levelId === WEAK_AREAS_LEVEL_ID;
  if (!isScript(params.script) || !validLevel) throw error(404, "Not found");
};

export const onStaticGenerate: StaticGenerateHandler = () => ({
  params: SCRIPTS.flatMap((script) =>
    [...LEVELS.map((l) => l.id), WEAK_AREAS_LEVEL_ID].map((levelId) => ({
      script,
      levelId,
    })),
  ),
});

type Phase = "loading" | "empty" | "question" | "done";

interface QuizState {
  phase: Phase;
  questions: Question[];
  index: number;
  /** Index of the chosen option for the current question, null = unanswered. */
  selected: number | null;
  correctCount: number;
  missedIds: string[];
  poolIds: string[];
  includeSound: boolean;
  /** True when listening questions were wanted but no Japanese voice exists. */
  soundMissing: boolean;
}

const WEAK_POOL_SIZE = 8;

const KIND_PROMPTS = {
  "kana-to-romaji": "What sound does this make?",
  "romaji-to-kana": "Which character makes this sound?",
  "sound-to-kana": "Listen — which character did you hear?",
} as const;

export default component$(() => {
  const loc = useLocation();
  const script = loc.params.script as Script;
  const levelId = loc.params.levelId;
  const isWeakAreas = levelId === WEAK_AREAS_LEVEL_ID;
  const level = LEVELS_BY_ID.get(levelId);
  const levelTitle = isWeakAreas ? "Weak spots" : (level?.title ?? "");

  const state = useStore<QuizState>({
    phase: "loading",
    questions: [],
    index: 0,
    selected: null,
    correctCount: 0,
    missedIds: [],
    poolIds: [],
    includeSound: false,
    soundMissing: false,
  });

  const buildPoolIds = $((): string[] => {
    if (!isWeakAreas) return level?.kanaIds ?? [];
    const data = loadProgress();
    if (!hasWeakAreaData(data, script)) return [];
    return weakKana(data, script, WEAK_POOL_SIZE).map((k) => k.id);
  });

  const startQuiz = $(async () => {
    const poolIds = await buildPoolIds();
    if (!poolIds.length) {
      state.phase = "empty";
      return;
    }
    const soundWanted = soundEnabled();
    const includeSound =
      soundWanted &&
      (await Promise.all(poolIds.map(kanaSoundAvailable))).every(Boolean);
    state.poolIds = poolIds;
    state.includeSound = includeSound;
    state.soundMissing = soundWanted && !includeSound;
    const pool = poolIds.map((id) => KANA_BY_ID.get(id)!);
    state.questions = generateQuiz(pool, script, {
      questionCount: DEFAULT_QUESTION_COUNT,
      includeSound,
    });
    state.index = 0;
    state.selected = null;
    state.correctCount = 0;
    state.missedIds = [];
    state.phase = "question";
  });

  // Quiz content depends on localStorage + Math.random, so build client-side.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    void startQuiz();
  });

  // Speak sound questions as they appear (replay button is always there too).
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => state.index);
    track(() => state.phase);
    const q = state.questions[state.index];
    if (state.phase === "question" && q?.kind === "sound-to-kana") {
      const kana = KANA_BY_ID.get(q.kanaId)!;
      void playKanaSound(kana.id, displayKana(kana, script));
    }
  });

  const answer = $((optionIndex: number) => {
    if (state.selected !== null) return;
    const q = state.questions[state.index];
    const correct = optionIndex === q.correctIndex;
    state.selected = optionIndex;
    if (correct) state.correctCount++;
    else state.missedIds = [...new Set([...state.missedIds, q.kanaId])];
    recordAnswer(script, q.kanaId, correct);
    playAnswerFeedback(correct);
    vibrateAnswerFeedback(correct);
    requestAnimationFrame(() =>
      document.getElementById("quiz-next")?.focus({ preventScroll: true }),
    );
  });

  const next = $(() => {
    if (state.index + 1 >= state.questions.length) {
      state.phase = "done";
    } else {
      state.index++;
      state.selected = null;
    }
  });

  const q = state.questions[state.index];
  const kana = q ? KANA_BY_ID.get(q.kanaId)! : null;
  const answered = state.selected !== null;
  const wasCorrect = answered && q && state.selected === q.correctIndex;

  return (
    <>
      <nav class="flex items-center justify-between text-sm">
        <BackLink href={`/${script}/`} class="rounded-lg py-2 pr-3">
          Quit
        </BackLink>
        <span class="text-ink-soft font-medium">
          {SCRIPT_LABELS[script].en} · {levelTitle}
        </span>
      </nav>

      {state.phase === "loading" && (
        <p class="text-ink-soft mt-16 text-center">Preparing your session…</p>
      )}

      {state.phase === "empty" && <QuizEmpty script={script} />}

      {state.phase === "question" && q && kana && (
        <div class="mt-4">
          <QuizProgress
            current={state.index}
            total={state.questions.length}
            answered={answered}
          />

          {state.soundMissing && state.index === 0 && (
            <p class="bg-paper-deep text-ink-soft mt-4 rounded-xl px-4 py-3 text-sm">
              No audio is available for these combination sounds on this device,
              so listening questions are skipped this session.
            </p>
          )}

          <h1 class="font-display text-ink-soft mt-8 text-center text-lg font-semibold">
            {KIND_PROMPTS[q.kind]}
          </h1>

          <QuizPrompt
            question={q}
            onReplay$={() => playKanaSound(kana.id, displayKana(kana, script))}
          />

          <AnswerOptions
            question={q}
            questionIndex={state.index}
            selected={state.selected}
            onAnswer$={answer}
          />

          <div aria-live="polite" class="mt-6 min-h-24">
            {answered && (
              <QuizFeedback
                correct={!!wasCorrect}
                kana={kana}
                script={script}
                isLastQuestion={state.index + 1 >= state.questions.length}
                onNext$={next}
              />
            )}
          </div>
        </div>
      )}

      {state.phase === "done" && (
        <QuizResults
          correctCount={state.correctCount}
          total={state.questions.length}
          missedIds={state.missedIds}
          script={script}
          onRetry$={startQuiz}
        />
      )}
    </>
  );
});

export const head: DocumentHead = ({ params, url }) => {
  const level = LEVELS_BY_ID.get(params.levelId);
  const levelTitle =
    params.levelId === WEAK_AREAS_LEVEL_ID ? "Weak spots" : level?.title;
  const script = isScript(params.script)
    ? SCRIPT_LABELS[params.script].en
    : "Kana";
  const title = `${levelTitle ?? "Practice"} · ${script} — Kana Smash`;
  const description = `Multiple-choice and listening drill for ${(levelTitle ?? "this level").toLowerCase()} in ${script}.`;
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
