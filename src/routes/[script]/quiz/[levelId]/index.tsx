import {
  $,
  component$,
  useStore,
  useTask$,
  useVisibleTask$,
} from "@builder.io/qwik";
import {
  useLocation,
  type DocumentHead,
  type RequestHandler,
  type StaticGenerateHandler,
} from "@builder.io/qwik-city";
import { AnswerOptions } from "~/components/quiz/answer-options";
import { BackLink } from "~/components/back-link";
import { CharacterIntro } from "~/components/quiz/character-intro";
import { MatchingExercise } from "~/components/quiz/matching-exercise";
import { QuizEmpty } from "~/components/quiz/quiz-empty";
import { QuizFeedback } from "~/components/quiz/quiz-feedback";
import { QuizProgress } from "~/components/quiz/quiz-progress";
import { QuizPrompt } from "~/components/quiz/quiz-prompt";
import { QuizResults } from "~/components/quiz/quiz-results";
import {
  ALL_KANA,
  displayKana,
  isScript,
  KANA_BY_ID,
  SCRIPT_LABELS,
  SCRIPTS,
  type Script,
} from "~/data/kana";
import {
  ALL_KANA_CHALLENGE_LEVEL_ID,
  DUE_REVIEW_LEVEL_ID,
  LEVELS,
  LEVELS_BY_ID,
  nextLevel,
  UNTESTED_KANA_LEVEL_ID,
  WEAK_AREAS_LEVEL_ID,
} from "~/data/levels";
import { dueKana, REVIEW_POOL_SIZE } from "~/lib/srs";
import { hasSeenIntro, markIntroSeen } from "~/lib/introductions";
import { returnTargetFromLocation, type ReturnTarget } from "~/lib/return-to";
import {
  hasWeakAreaData,
  loadProgress,
  recordAnswer,
  untestedKana,
  weakKana,
} from "~/lib/progress";
import {
  buildMatchSet,
  DEFAULT_QUESTION_COUNT,
  generateQuiz,
  type Question,
} from "~/lib/quiz";
import { kanaSoundAvailable, playKanaSound } from "~/lib/audio";
import { playAnswerFeedback } from "~/lib/feedback";
import { vibrateAnswerFeedback } from "~/lib/haptics";
import { buildMeta } from "~/lib/seo";
import { soundEnabled } from "~/lib/settings";

const WEAK_POOL_SIZE = 8;

interface DynamicLevelConfig {
  title: string;
  buildPool: (script: Script) => string[];
  /** Skip the closing matching round and cover the whole pool in one pass,
   * instead of the usual fixed-length question set. */
  fullPass?: boolean;
  /** Custom empty-state copy shown when the pool comes back empty. */
  empty?: {
    title: string;
    body: string;
    href: (script: Script) => string;
    cta: string;
  };
}

/**
 * Every non-lesson level (weak spots, review, challenges…) in one place —
 * title, pool, and behaviour all keyed by the same id, so the rest of the
 * route can ask this table instead of chaining `levelId === ...` checks.
 */
const DYNAMIC_LEVELS: Record<string, DynamicLevelConfig> = {
  [WEAK_AREAS_LEVEL_ID]: {
    title: "Weak spots",
    buildPool: (script) => {
      const data = loadProgress();
      if (!hasWeakAreaData(data, script)) return [];
      return weakKana(data, script, WEAK_POOL_SIZE).map((k) => k.id);
    },
  },
  [DUE_REVIEW_LEVEL_ID]: {
    title: "Daily review",
    buildPool: (script) =>
      dueKana(loadProgress(), script)
        .slice(0, REVIEW_POOL_SIZE)
        .map((k) => k.id),
    empty: {
      title: "All caught up!",
      body: "Nothing is due for review right now. Practise a level to add characters to the rotation, or come back later.",
      href: () => "/review/",
      cta: "Back to review",
    },
  },
  [ALL_KANA_CHALLENGE_LEVEL_ID]: {
    title: "All-kana challenge",
    buildPool: () => ALL_KANA.map((k) => k.id),
    fullPass: true,
  },
  [UNTESTED_KANA_LEVEL_ID]: {
    title: "Untested kana",
    buildPool: (script) => untestedKana(loadProgress(), script).map((k) => k.id),
    fullPass: true,
    empty: {
      title: "Nothing left untested!",
      body: "Every character has been tested at least once — the all-kana challenge is ready for you.",
      href: (script) => `/${script}/quiz/${ALL_KANA_CHALLENGE_LEVEL_ID}/`,
      cta: "Take the challenge",
    },
  },
};

export const onGet: RequestHandler = ({ params, error }) => {
  const validLevel =
    LEVELS_BY_ID.has(params.levelId) || params.levelId in DYNAMIC_LEVELS;
  if (!isScript(params.script) || !validLevel) throw error(404, "Not found");
};

export const onStaticGenerate: StaticGenerateHandler = () => ({
  params: SCRIPTS.flatMap((script) =>
    [...LEVELS.map((l) => l.id), ...Object.keys(DYNAMIC_LEVELS)].map(
      (levelId) => ({ script, levelId }),
    ),
  ),
});

type Phase = "loading" | "empty" | "intro" | "question" | "matching" | "done";

interface QuizState {
  phase: Phase;
  /** True when the intro was requested as a recap rather than auto-shown. */
  introRecap: boolean;
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
  /** Kana for the closing matching round; unscored, so never sent to progress. */
  matchIds: string[];
  /** Wrong guesses in the matching round; null until that round finishes. */
  matchMistakes: number | null;
  /** Where Quit and the results actions lead when the session was entered
   * from somewhere other than the level list (review hub, progress page). */
  returnTo: ReturnTarget | null;
}

/** Below this a matching round isn't a real puzzle, so it's skipped. */
const MIN_MATCH_PAIRS = 2;

const KIND_PROMPTS = {
  "kana-to-romaji": "What sound does this make?",
  "romaji-to-kana": "Which character makes this sound?",
  "sound-to-kana": "Listen — which character did you hear?",
} as const;

export default component$(() => {
  const loc = useLocation();
  const script = loc.params.script as Script;
  const levelId = loc.params.levelId;
  const dynamic = DYNAMIC_LEVELS[levelId] as DynamicLevelConfig | undefined;
  const level = LEVELS_BY_ID.get(levelId);
  const levelTitle = dynamic?.title ?? level?.title ?? "";

  const state = useStore<QuizState>({
    phase: "loading",
    introRecap: false,
    questions: [],
    index: 0,
    selected: null,
    correctCount: 0,
    missedIds: [],
    poolIds: [],
    includeSound: false,
    soundMissing: false,
    matchIds: [],
    matchMistakes: null,
    returnTo: null,
  });

  // Read params fresh from `loc` rather than closing over the outer
  // `script`/`level` consts: this function is invoked from a task$ effect,
  // and Qwik only registers a task's callback once at mount, so a closure
  // over those consts would keep replaying the level active when the quiz
  // first mounted even after navigating to a different level.
  const buildPoolIds = $((): string[] => {
    const currentLevelId = loc.params.levelId;
    const currentScript = loc.params.script as Script;
    const config = DYNAMIC_LEVELS[currentLevelId];
    if (config) return config.buildPool(currentScript);
    return LEVELS_BY_ID.get(currentLevelId)?.kanaIds ?? [];
  });

  const startQuiz = $(async () => {
    const currentScript = loc.params.script as Script;
    const currentLevelId = loc.params.levelId;
    const config = DYNAMIC_LEVELS[currentLevelId];
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
    state.questions = generateQuiz(pool, currentScript, {
      questionCount: config?.fullPass ? pool.length : DEFAULT_QUESTION_COUNT,
      includeSound,
    });
    // A full-pass session (challenge, untested kana) is one lap over its
    // pool — no closing matching round on top of that.
    state.matchIds = config?.fullPass ? [] : buildMatchSet(pool).map((k) => k.id);
    state.matchMistakes = null;
    state.index = 0;
    state.selected = null;
    state.correctCount = 0;
    state.missedIds = [];
    // First time on a regular level, open with the character introduction.
    // Every dynamic level (weak-spot, review, challenge, untested kana) is a
    // practice/test session rather than a lesson, so it skips straight in.
    const firstVisit = !config && !hasSeenIntro(currentScript, currentLevelId);
    if (firstVisit) markIntroSeen(currentScript, currentLevelId);
    state.introRecap = !firstVisit;
    state.phase = firstVisit ? "intro" : "question";
  });

  // Reset synchronously on navigation to a new level so the stale "done"
  // screen doesn't flash while the new quiz builds client-side.
  useTask$(({ track }) => {
    track(() => loc.params.script);
    track(() => loc.params.levelId);
    state.phase = "loading";
  });

  // Quiz content depends on localStorage + Math.random, so build client-side.
  // Track the route params too: Qwik City's Link reuses this component
  // instance across same-route navigations, so without a tracked dependency
  // this task only fires once and never rebuilds the quiz for the new level.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => loc.params.script);
    track(() => loc.params.levelId);
    state.returnTo = returnTargetFromLocation(loc.params.script);
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

  const beginQuestions = $(() => {
    state.phase = "question";
  });

  const showRecap = $(() => {
    state.introRecap = true;
    state.phase = "intro";
  });

  const hearKana = $((id: string) => {
    const heard = KANA_BY_ID.get(id)!;
    void playKanaSound(heard.id, displayKana(heard, script));
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
      state.phase =
        state.matchIds.length >= MIN_MATCH_PAIRS ? "matching" : "done";
    } else {
      state.index++;
      state.selected = null;
    }
  });

  // The matching round is a final check, not a scored question — it never
  // calls recordAnswer, so it can't affect saved proficiency. The mistake
  // count is kept only to show on the results screen.
  const finishMatching = $((mistakes: number) => {
    state.matchMistakes = mistakes;
    state.phase = "done";
  });

  const q = state.questions[state.index];
  const kana = q ? KANA_BY_ID.get(q.kanaId)! : null;
  const answered = state.selected !== null;
  const wasCorrect = answered && q && state.selected === q.correctIndex;

  return (
    <>
      <nav class="flex items-center justify-between text-sm">
        <BackLink
          href={state.returnTo?.href ?? `/${script}/`}
          class="rounded-lg py-2 pr-3"
        >
          Quit
        </BackLink>
        <span class="text-ink-soft font-medium">
          {SCRIPT_LABELS[script].en} · {levelTitle}
        </span>
      </nav>

      {state.phase === "loading" && (
        <p class="text-ink-soft mt-16 text-center">Preparing your session…</p>
      )}

      {state.phase === "empty" &&
        (dynamic?.empty ? (
          <QuizEmpty
            script={script}
            title={dynamic.empty.title}
            body={dynamic.empty.body}
            href={dynamic.empty.href(script)}
            cta={dynamic.empty.cta}
          />
        ) : (
          <QuizEmpty script={script} />
        ))}

      {state.phase === "intro" && (
        <CharacterIntro
          items={state.poolIds.map((id) => {
            const item = KANA_BY_ID.get(id)!;
            return {
              id,
              glyph: displayKana(item, script),
              name: item.romaji,
              detail: item.altRomaji ? `also "${item.altRomaji}"` : undefined,
            };
          })}
          recap={state.introRecap}
          onStart$={beginQuestions}
          onHear$={state.includeSound ? hearKana : undefined}
        />
      )}

      {state.phase === "question" && q && kana && (
        <div class="mt-4">
          <QuizProgress
            current={state.index}
            total={state.questions.length}
            answered={answered}
          />

          {state.index === 0 && !answered && (
            <p class="mt-3 text-center">
              <button
                type="button"
                onClick$={showRecap}
                class="text-ink-soft text-sm underline decoration-dotted underline-offset-4"
              >
                Recap these characters first
              </button>
            </p>
          )}

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
            lang={q.kind !== "kana-to-romaji" ? "ja" : undefined}
            optionClass={
              q.kind !== "kana-to-romaji"
                ? "font-kana text-4xl"
                : "font-display text-2xl font-semibold lowercase"
            }
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

      {state.phase === "matching" && (
        <div class="mt-4">
          <p class="eyebrow text-center">Final round</p>
          <h1 class="font-display text-ink-soft mt-2 text-center text-lg font-semibold">
            Match every character to its sound
          </h1>
          <MatchingExercise
            pairs={state.matchIds.map((id) => {
              const kana = KANA_BY_ID.get(id)!;
              return {
                id,
                left: displayKana(kana, script),
                right: kana.romaji,
              };
            })}
            leftLabel="Characters"
            rightLabel="Sounds"
            rightClass="text-xl lowercase"
            onComplete$={finishMatching}
          />
        </div>
      )}

      {state.phase === "done" && (
        <QuizResults
          correctCount={state.correctCount}
          total={state.questions.length}
          missed={state.missedIds.map((id) => {
            const missed = KANA_BY_ID.get(id)!;
            return {
              id,
              glyph: displayKana(missed, script),
              hint: missed.romaji,
            };
          })}
          onRetry$={startQuiz}
          nextHref={
            dynamic || !nextLevel(levelId)
              ? undefined
              : `/${script}/quiz/${nextLevel(levelId)!.id}/`
          }
          nextTitle={dynamic ? undefined : nextLevel(levelId)?.title}
          levelsHref={state.returnTo?.href ?? `/${script}/`}
          levelsLabel={state.returnTo?.label}
          progressHref={`/progress/?script=${script}`}
          matchStats={
            state.matchMistakes !== null
              ? { pairs: state.matchIds.length, mistakes: state.matchMistakes }
              : undefined
          }
        />
      )}
    </>
  );
});

export const head: DocumentHead = ({ params, url }) => {
  const level = LEVELS_BY_ID.get(params.levelId);
  const levelTitle = DYNAMIC_LEVELS[params.levelId]?.title ?? level?.title;
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
