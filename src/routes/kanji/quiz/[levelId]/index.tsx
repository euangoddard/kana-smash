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
import { KanjiQuizFeedback } from "~/components/quiz/kanji-quiz-feedback";
import { KanjiQuizPrompt } from "~/components/quiz/kanji-quiz-prompt";
import { MatchingExercise } from "~/components/quiz/matching-exercise";
import { QuizEmpty } from "~/components/quiz/quiz-empty";
import { QuizProgress } from "~/components/quiz/quiz-progress";
import { QuizResults } from "~/components/quiz/quiz-results";
import { KANJI_BY_ID, WORD_BY_ID } from "~/data/kanji";
import {
  DUE_KANJI_REVIEW_LEVEL_ID,
  KANJI_LEVELS,
  KANJI_LEVELS_BY_ID,
  nextKanjiLevel,
  WEAK_KANJI_LEVEL_ID,
} from "~/data/kanji-levels";
import { dueKanji, REVIEW_POOL_SIZE } from "~/lib/srs";
import { hasSeenIntro, markIntroSeen } from "~/lib/introductions";
import { returnTargetFromLocation, type ReturnTarget } from "~/lib/return-to";
import {
  hasWeakKanjiData,
  loadKanjiProgress,
  recordKanjiAnswer,
  weakKanji,
} from "~/lib/kanji-progress";
import {
  buildKanjiMatchSet,
  generateKanjiQuiz,
  type KanjiExerciseKind,
  type KanjiQuestion,
} from "~/lib/kanji-quiz";
import { DEFAULT_QUESTION_COUNT } from "~/lib/quiz";
import type { MissedItem } from "~/components/quiz/quiz-results";
import { playAnswerFeedback } from "~/lib/feedback";
import { vibrateAnswerFeedback } from "~/lib/haptics";
import { buildMeta } from "~/lib/seo";
import { soundEnabled } from "~/lib/settings";
import { findJapaneseVoice, speakJapanese } from "~/lib/speech";

export const onGet: RequestHandler = ({ params, error }) => {
  const validLevel =
    KANJI_LEVELS_BY_ID.has(params.levelId) ||
    params.levelId === WEAK_KANJI_LEVEL_ID ||
    params.levelId === DUE_KANJI_REVIEW_LEVEL_ID;
  if (!validLevel) throw error(404, "Not found");
};

export const onStaticGenerate: StaticGenerateHandler = () => ({
  params: [
    ...KANJI_LEVELS.map((l) => l.id),
    WEAK_KANJI_LEVEL_ID,
    DUE_KANJI_REVIEW_LEVEL_ID,
  ].map((levelId) => ({ levelId })),
});

type Phase = "loading" | "empty" | "intro" | "question" | "matching" | "done";

interface QuizState {
  phase: Phase;
  /** True when the intro was requested as a recap rather than auto-shown. */
  introRecap: boolean;
  /** Kanji in this session's pool, for the introduction screen. */
  poolIds: string[];
  questions: KanjiQuestion[];
  index: number;
  /** Index of the chosen option for the current question, null = unanswered. */
  selected: number | null;
  correctCount: number;
  missed: MissedItem[];
  includeSound: boolean;
  /** True when listening questions were wanted but no Japanese voice exists. */
  soundMissing: boolean;
  /** Kanji for the closing matching round; unscored, so never sent to progress. */
  matchIds: string[];
  /** Wrong guesses in the matching round; null until that round finishes. */
  matchMistakes: number | null;
  /** Where Quit and the results actions lead when the session was entered
   * from somewhere other than the level list (review hub, progress page). */
  returnTo: ReturnTarget | null;
}

const WEAK_POOL_SIZE = 8;

/** Below this a matching round isn't a real puzzle, so it's skipped. */
const MIN_MATCH_PAIRS = 2;

const KIND_PROMPTS: Record<KanjiExerciseKind, string> = {
  "kanji-to-meaning": "What does this kanji mean?",
  "meaning-to-kanji": "Which kanji means this?",
  "word-to-reading": "How is this word read?",
  "reading-to-word": "Which word is read like this?",
  "sound-to-word": "Listen — which word did you hear?",
};

/** Option typography per kind: kanji and readings big, English text smaller. */
const OPTION_CLASSES: Record<KanjiExerciseKind, string> = {
  "kanji-to-meaning": "font-display text-lg font-semibold",
  "meaning-to-kanji": "font-kana text-4xl",
  "word-to-reading": "font-kana text-2xl",
  "reading-to-word": "font-kana text-3xl",
  "sound-to-word": "font-kana text-3xl",
};

export default component$(() => {
  const loc = useLocation();
  const levelId = loc.params.levelId;
  const isWeakAreas = levelId === WEAK_KANJI_LEVEL_ID;
  const isDueReview = levelId === DUE_KANJI_REVIEW_LEVEL_ID;
  const level = KANJI_LEVELS_BY_ID.get(levelId);
  const levelTitle = isWeakAreas
    ? "Weak spots"
    : isDueReview
      ? "Daily review"
      : (level?.title ?? "");

  const state = useStore<QuizState>({
    phase: "loading",
    introRecap: false,
    poolIds: [],
    questions: [],
    index: 0,
    selected: null,
    correctCount: 0,
    missed: [],
    includeSound: false,
    soundMissing: false,
    matchIds: [],
    matchMistakes: null,
    returnTo: null,
  });

  // Read the param fresh from `loc` rather than closing over the outer
  // consts — see the kana quiz page for why (task closures are registered
  // once at mount and would go stale across same-route navigations).
  const buildPoolIds = $((): string[] => {
    const currentLevelId = loc.params.levelId;
    if (currentLevelId === DUE_KANJI_REVIEW_LEVEL_ID) {
      return dueKanji(loadKanjiProgress())
        .slice(0, REVIEW_POOL_SIZE)
        .map((k) => k.id);
    }
    if (currentLevelId !== WEAK_KANJI_LEVEL_ID) {
      return KANJI_LEVELS_BY_ID.get(currentLevelId)?.kanjiIds ?? [];
    }
    const data = loadKanjiProgress();
    if (!hasWeakKanjiData(data)) return [];
    return weakKanji(data, WEAK_POOL_SIZE).map((k) => k.id);
  });

  const startQuiz = $(async () => {
    const poolIds = await buildPoolIds();
    if (!poolIds.length) {
      state.phase = "empty";
      return;
    }
    // Kanji words have no bundled recordings, so listening questions need a
    // Japanese speech-synthesis voice on this device.
    const soundWanted = soundEnabled();
    const includeSound = soundWanted && (await findJapaneseVoice()) !== null;
    state.poolIds = poolIds;
    state.includeSound = includeSound;
    state.soundMissing = soundWanted && !includeSound;
    const pool = poolIds.map((id) => KANJI_BY_ID.get(id)!);
    state.questions = generateKanjiQuiz(pool, {
      questionCount: DEFAULT_QUESTION_COUNT,
      includeSound,
    });
    state.matchIds = buildKanjiMatchSet(pool).map((k) => k.id);
    state.matchMistakes = null;
    state.index = 0;
    state.selected = null;
    state.correctCount = 0;
    state.missed = [];
    // First time on a regular level, open with the kanji introduction
    // (weak-spot and review sessions reuse known kanji, so nothing is
    // "new" there).
    const currentLevelId = loc.params.levelId;
    const firstVisit =
      currentLevelId !== WEAK_KANJI_LEVEL_ID &&
      currentLevelId !== DUE_KANJI_REVIEW_LEVEL_ID &&
      !hasSeenIntro("kanji", currentLevelId);
    if (firstVisit) markIntroSeen("kanji", currentLevelId);
    state.introRecap = !firstVisit;
    state.phase = firstVisit ? "intro" : "question";
  });

  // Reset synchronously on navigation to a new level so the stale "done"
  // screen doesn't flash while the new quiz builds client-side.
  useTask$(({ track }) => {
    track(() => loc.params.levelId);
    state.phase = "loading";
  });

  // Quiz content depends on localStorage + Math.random, so build client-side.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => loc.params.levelId);
    state.returnTo = returnTargetFromLocation("kanji");
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

  const answer = $((optionIndex: number) => {
    if (state.selected !== null) return;
    const q = state.questions[state.index];
    const correct = optionIndex === q.correctIndex;
    state.selected = optionIndex;
    if (correct) {
      state.correctCount++;
    } else {
      const kanji = KANJI_BY_ID.get(q.kanjiId)!;
      const item: MissedItem =
        q.facet === "meaning"
          ? { id: q.kanjiId, glyph: kanji.id, hint: kanji.meaning }
          : {
              id: q.wordId!,
              glyph: q.wordId!,
              hint: WORD_BY_ID.get(q.wordId!)!.reading,
            };
      if (!state.missed.some((m) => m.id === item.id)) {
        state.missed = [...state.missed, item];
      }
    }
    recordKanjiAnswer(q.testedKanjiIds, q.facet, correct);
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
  // calls recordKanjiAnswer, so it can't affect saved proficiency.
  const finishMatching = $((mistakes: number) => {
    state.matchMistakes = mistakes;
    state.phase = "done";
  });

  const q = state.questions[state.index];
  const answered = state.selected !== null;
  const wasCorrect = answered && q && state.selected === q.correctIndex;

  return (
    <>
      <nav class="flex items-center justify-between text-sm">
        <BackLink
          href={state.returnTo?.href ?? "/kanji/"}
          class="rounded-lg py-2 pr-3"
        >
          Quit
        </BackLink>
        <span class="text-ink-soft font-medium">Kanji · {levelTitle}</span>
      </nav>

      {state.phase === "loading" && (
        <p class="text-ink-soft mt-16 text-center">Preparing your session…</p>
      )}

      {state.phase === "empty" &&
        (isDueReview ? (
          <QuizEmpty
            script="kanji"
            title="All caught up!"
            body="Nothing is due for review right now. Practise a level to add kanji to the rotation, or come back later."
            href="/review/"
            cta="Back to review"
          />
        ) : (
          <QuizEmpty script="kanji" />
        ))}

      {state.phase === "intro" && (
        <CharacterIntro
          items={state.poolIds.map((id) => {
            const kanji = KANJI_BY_ID.get(id)!;
            const readings = [...kanji.on, ...kanji.kun].join(" · ");
            return {
              id,
              glyph: kanji.id,
              name: kanji.meaning,
              detail: readings || undefined,
            };
          })}
          recap={state.introRecap}
          gridClass="grid-cols-2 sm:grid-cols-3"
          detailLang="ja"
          onStart$={beginQuestions}
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
                Recap these kanji first
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

          <KanjiQuizPrompt
            question={q}
            onReplay$={() => (q.spoken ? speakJapanese(q.spoken) : undefined)}
          />

          <AnswerOptions
            question={q}
            questionIndex={state.index}
            selected={state.selected}
            onAnswer$={answer}
            lang={q.kind !== "kanji-to-meaning" ? "ja" : undefined}
            optionClass={OPTION_CLASSES[q.kind]}
          />

          <div aria-live="polite" class="mt-6 min-h-24">
            {answered && (
              <KanjiQuizFeedback
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
            Match every kanji to its meaning
          </h1>
          <MatchingExercise
            pairs={state.matchIds.map((id) => {
              const kanji = KANJI_BY_ID.get(id)!;
              return { id, left: kanji.id, right: kanji.meaning };
            })}
            leftLabel="Kanji"
            rightLabel="Meanings"
            rightClass="text-base"
            onComplete$={finishMatching}
          />
        </div>
      )}

      {state.phase === "done" && (
        <QuizResults
          correctCount={state.correctCount}
          total={state.questions.length}
          missed={state.missed}
          onRetry$={startQuiz}
          nextHref={
            isWeakAreas || isDueReview || !nextKanjiLevel(levelId)
              ? undefined
              : `/kanji/quiz/${nextKanjiLevel(levelId)!.id}/`
          }
          nextTitle={
            isWeakAreas || isDueReview
              ? undefined
              : nextKanjiLevel(levelId)?.title
          }
          levelsHref={state.returnTo?.href ?? "/kanji/"}
          levelsLabel={state.returnTo?.label}
          progressHref="/progress/?script=kanji"
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
  const level = KANJI_LEVELS_BY_ID.get(params.levelId);
  const levelTitle =
    params.levelId === WEAK_KANJI_LEVEL_ID
      ? "Weak spots"
      : params.levelId === DUE_KANJI_REVIEW_LEVEL_ID
        ? "Daily review"
        : level?.title;
  const title = `${levelTitle ?? "Practice"} · Kanji — Kana Smash`;
  const description = `Meaning and reading drill for ${(levelTitle ?? "this level").toLowerCase()} in kanji.`;
  return {
    title,
    meta: buildMeta({ title, description, url }),
  };
};
