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
import { QuizProgress } from "~/components/quiz/quiz-progress";
import { QuizResults } from "~/components/quiz/quiz-results";
import { WordQuizFeedback } from "~/components/quiz/word-quiz-feedback";
import { WordQuizPrompt } from "~/components/quiz/word-quiz-prompt";
import { isScript, SCRIPT_LABELS, type Script } from "~/data/kana";
import {
  nextWordLevel,
  STUDY_WORD_BY_ID,
  wordLevelById,
  WORD_LEVELS,
} from "~/data/words";
import { playAnswerFeedback } from "~/lib/feedback";
import { vibrateAnswerFeedback } from "~/lib/haptics";
import { hasSeenIntro, markIntroSeen } from "~/lib/introductions";
import { recordWordAnswer } from "~/lib/progress";
import { DEFAULT_QUESTION_COUNT } from "~/lib/quiz";
import { returnTargetFromLocation, type ReturnTarget } from "~/lib/return-to";
import { buildMeta } from "~/lib/seo";
import { soundEnabled } from "~/lib/settings";
import { findJapaneseVoice, speakJapanese } from "~/lib/speech";
import {
  buildWordMatchSet,
  generateWordQuiz,
  type WordExerciseKind,
  type WordQuestion,
} from "~/lib/word-quiz";

export const onGet: RequestHandler = ({ params, error }) => {
  if (
    !isScript(params.script) ||
    !wordLevelById(params.script, params.levelId)
  ) {
    throw error(404, "Not found");
  }
};

export const onStaticGenerate: StaticGenerateHandler = () => ({
  params: WORD_LEVELS.map((level) => ({
    script: level.script,
    levelId: level.id,
  })),
});

type Phase = "loading" | "intro" | "question" | "matching" | "done";

interface QuizState {
  phase: Phase;
  /** True when the intro was requested as a recap rather than auto-shown. */
  introRecap: boolean;
  questions: WordQuestion[];
  index: number;
  /** Index of the chosen option for the current question, null = unanswered. */
  selected: number | null;
  correctCount: number;
  missedIds: string[];
  poolIds: string[];
  includeSound: boolean;
  /** True when listening questions were wanted but no Japanese voice exists. */
  soundMissing: boolean;
  /** Words for the closing matching round; unscored, so never sent to progress. */
  matchIds: string[];
  /** Wrong guesses in the matching round; null until that round finishes. */
  matchMistakes: number | null;
  /** Where Quit and the results actions lead when the session was entered
   * from somewhere other than the level list. */
  returnTo: ReturnTarget | null;
}

/** Below this a matching round isn't a real puzzle, so it's skipped. */
const MIN_MATCH_PAIRS = 2;

const KIND_PROMPTS: Record<WordExerciseKind, string> = {
  "word-to-romaji": "How do you read this word?",
  "romaji-to-word": "Which word sounds like this?",
  "sound-to-word": "Listen — which word did you hear?",
};

export default component$(() => {
  const loc = useLocation();
  const script = loc.params.script as Script;
  const levelId = loc.params.levelId;
  const level = wordLevelById(script, levelId);
  const levelTitle = level?.title ?? "";

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

  const startQuiz = $(async () => {
    // Read params fresh from `loc` — see the kana quiz page for why (task
    // closures are registered once at mount and would go stale across
    // same-route navigations).
    const currentScript = loc.params.script as Script;
    const currentLevel = wordLevelById(currentScript, loc.params.levelId);
    const poolIds = currentLevel?.wordIds ?? [];
    if (!poolIds.length) return;
    // Words have no bundled recordings, so listening questions need a
    // Japanese speech-synthesis voice on this device.
    const soundWanted = soundEnabled();
    const includeSound = soundWanted && (await findJapaneseVoice()) !== null;
    state.poolIds = poolIds;
    state.includeSound = includeSound;
    state.soundMissing = soundWanted && !includeSound;
    const pool = poolIds.map((id) => STUDY_WORD_BY_ID.get(id)!);
    state.questions = generateWordQuiz(pool, {
      questionCount: DEFAULT_QUESTION_COUNT,
      includeSound,
    });
    state.matchIds = buildWordMatchSet(pool).map((w) => w.id);
    state.matchMistakes = null;
    state.index = 0;
    state.selected = null;
    state.correctCount = 0;
    state.missedIds = [];
    // First visit opens with the word introduction, like character levels.
    const course = `${currentScript}-words`;
    const firstVisit = !hasSeenIntro(course, loc.params.levelId);
    if (firstVisit) markIntroSeen(course, loc.params.levelId);
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
    if (state.phase === "question" && q?.spoken) {
      void speakJapanese(q.spoken);
    }
  });

  const beginQuestions = $(() => {
    state.phase = "question";
  });

  const showRecap = $(() => {
    state.introRecap = true;
    state.phase = "intro";
  });

  const hearWord = $((id: string) => {
    void speakJapanese(id);
  });

  const answer = $((optionIndex: number) => {
    if (state.selected !== null) return;
    const q = state.questions[state.index];
    const correct = optionIndex === q.correctIndex;
    state.selected = optionIndex;
    if (correct) state.correctCount++;
    else state.missedIds = [...new Set([...state.missedIds, q.wordId])];
    const word = STUDY_WORD_BY_ID.get(q.wordId)!;
    recordWordAnswer(script, word.kanaIds, correct);
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
  // reaches recordWordAnswer, so it can't affect saved proficiency.
  const finishMatching = $((mistakes: number) => {
    state.matchMistakes = mistakes;
    state.phase = "done";
  });

  const q = state.questions[state.index];
  const answered = state.selected !== null;
  const wasCorrect = answered && q && state.selected === q.correctIndex;
  const following = nextWordLevel(script, levelId);

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
          {SCRIPT_LABELS[script].en} words · {levelTitle}
        </span>
      </nav>

      {state.phase === "loading" && (
        <p class="text-ink-soft mt-16 text-center">Preparing your session…</p>
      )}

      {state.phase === "intro" && (
        <CharacterIntro
          items={state.poolIds.map((id) => {
            const word = STUDY_WORD_BY_ID.get(id)!;
            return {
              id,
              glyph: word.id,
              name: word.romaji,
              detail: word.meaning,
            };
          })}
          recap={state.introRecap}
          gridClass="grid-cols-2 sm:grid-cols-3"
          onStart$={beginQuestions}
          onHear$={state.includeSound ? hearWord : undefined}
        />
      )}

      {state.phase === "question" && q && (
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
                Recap these words first
              </button>
            </p>
          )}

          {state.soundMissing && state.index === 0 && (
            <p class="bg-paper-deep text-ink-soft mt-4 rounded-xl px-4 py-3 text-sm">
              No Japanese voice is available on this device, so listening
              questions are skipped this session.
            </p>
          )}

          <h1 class="font-display text-ink-soft mt-8 text-center text-lg font-semibold">
            {KIND_PROMPTS[q.kind]}
          </h1>

          <WordQuizPrompt
            question={q}
            onReplay$={() => (q.spoken ? speakJapanese(q.spoken) : undefined)}
          />

          <AnswerOptions
            question={q}
            questionIndex={state.index}
            selected={state.selected}
            onAnswer$={answer}
            lang={q.kind !== "word-to-romaji" ? "ja" : undefined}
            optionClass={
              q.kind !== "word-to-romaji"
                ? "font-kana text-2xl"
                : "font-display text-xl font-semibold lowercase"
            }
          />

          <div aria-live="polite" class="mt-6 min-h-24">
            {answered && (
              <WordQuizFeedback
                correct={!!wasCorrect}
                question={q}
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
            Match every word to its reading
          </h1>
          <MatchingExercise
            pairs={state.matchIds.map((id) => {
              const word = STUDY_WORD_BY_ID.get(id)!;
              return { id, left: word.id, right: word.romaji };
            })}
            leftLabel="Words"
            rightLabel="Readings"
            rightClass="text-lg lowercase"
            onComplete$={finishMatching}
          />
        </div>
      )}

      {state.phase === "done" && (
        <QuizResults
          correctCount={state.correctCount}
          total={state.questions.length}
          missed={state.missedIds.map((id) => {
            const missed = STUDY_WORD_BY_ID.get(id)!;
            return { id, glyph: missed.id, hint: missed.romaji };
          })}
          onRetry$={startQuiz}
          nextHref={
            following ? `/${script}/words/quiz/${following.id}/` : undefined
          }
          nextTitle={following?.title}
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
  const level = isScript(params.script)
    ? wordLevelById(params.script, params.levelId)
    : undefined;
  const script = isScript(params.script)
    ? SCRIPT_LABELS[params.script].en
    : "Kana";
  const title = `${level?.title ?? "Words"} · ${script} words — Kana Smash`;
  const description = `Whole-word reading drill for ${(level?.title ?? "this level").toLowerCase()} vocabulary in ${script}.`;
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
