import {
  ALL_KANA,
  KANA_BY_ID,
  confusableIds,
  displayKana,
  type Kana,
  type Script,
} from "~/data/kana";

export type ExerciseKind =
  "kana-to-romaji" | "romaji-to-kana" | "sound-to-kana";

export interface Question {
  kind: ExerciseKind;
  /** Canonical id of the kana being tested. */
  kanaId: string;
  /** What is shown/spoken: the kana char, the romaji, or the spoken text. */
  prompt: string;
  /** Four answer choices — romaji strings or kana chars depending on kind. */
  options: string[];
  correctIndex: number;
}

export interface QuizConfig {
  questionCount: number;
  includeSound: boolean;
}

const shuffle = <T>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const pick = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

/**
 * Distractor kana for `target`, hardest first: visually confusable
 * characters, then same consonant row, then same vowel column, then the
 * rest of its group. Never a kana that shares the target's romaji
 * (e.g. じ vs ぢ — both "ji" — would make two options correct).
 */
const distractorKana = (
  target: Kana,
  script: Script,
  count: number,
): Kana[] => {
  const chosen: Kana[] = [];
  const used = new Set<string>([target.id]);
  const add = (kana: Kana | undefined) => {
    if (!kana || used.has(kana.id) || kana.romaji === target.romaji) return;
    used.add(kana.id);
    chosen.push(kana);
  };
  const tiers: Kana[][] = [
    confusableIds(target.id, script).map((id) => KANA_BY_ID.get(id)!),
    ALL_KANA.filter((k) => k.row === target.row),
    ALL_KANA.filter(
      (k) => k.vowel === target.vowel && k.group === target.group,
    ),
    ALL_KANA.filter((k) => k.group === target.group),
    ALL_KANA,
  ];
  for (const tier of tiers) {
    for (const kana of shuffle(tier)) {
      if (chosen.length >= count) return chosen;
      add(kana);
    }
  }
  return chosen;
};

const buildQuestion = (
  target: Kana,
  kind: ExerciseKind,
  script: Script,
): Question => {
  const distractors = distractorKana(target, script, 3);
  const answerAsKana = kind !== "kana-to-romaji";
  const render = (k: Kana) =>
    answerAsKana ? displayKana(k, script) : k.romaji;
  const options = shuffle([target, ...distractors].map(render));
  return {
    kind,
    kanaId: target.id,
    prompt:
      kind === "kana-to-romaji" ? displayKana(target, script) : target.romaji,
    options,
    correctIndex: options.indexOf(render(target)),
  };
};

/**
 * Build a quiz over `pool`. Every kana appears before any repeats, and the
 * three exercise kinds are spread evenly (sound questions only if enabled).
 */
export const generateQuiz = (
  pool: Kana[],
  script: Script,
  config: QuizConfig,
): Question[] => {
  if (!pool.length) return [];
  const kinds: ExerciseKind[] = config.includeSound
    ? ["kana-to-romaji", "romaji-to-kana", "sound-to-kana"]
    : ["kana-to-romaji", "romaji-to-kana"];

  const targets: Kana[] = [];
  while (targets.length < config.questionCount) {
    const round = shuffle(pool);
    // Avoid the same kana twice in a row across round boundaries.
    if (targets.length && round[0].id === targets[targets.length - 1].id) {
      round.push(round.shift()!);
    }
    targets.push(...round);
  }
  targets.length = config.questionCount;

  const kindQueue = shuffle(
    Array.from(
      { length: config.questionCount },
      (_, i) => kinds[i % kinds.length],
    ),
  );

  return targets.map((kana, i) => {
    let kind = kindQueue[i];
    // Sound questions are pointless for a pool of near-homophones of size 1.
    if (kind === "sound-to-kana" && pool.length < 2)
      kind = pick(kinds.slice(0, 2));
    return buildQuestion(kana, kind, script);
  });
};

export const DEFAULT_QUESTION_COUNT = 10;

/**
 * One random question over `pool` for challenge mode — never a listening
 * question (audio would eat the clock) and never the same kana as the one
 * just asked.
 */
export const randomKanaQuestion = (
  pool: Kana[],
  script: Script,
  avoidId?: string,
): Question => {
  const candidates = pool.filter((k) => k.id !== avoidId);
  const target = pick(candidates.length ? candidates : pool);
  const kind = pick<ExerciseKind>(["kana-to-romaji", "romaji-to-kana"]);
  return buildQuestion(target, kind, script);
};

/**
 * Up to `count` kana for the closing matching round, picked at random from
 * `pool`. Never two kana that share a romaji (e.g. じ and ぢ both "ji") —
 * that would make the matching puzzle ambiguous.
 */
export const buildMatchSet = (pool: Kana[], count = 5): Kana[] => {
  const chosen: Kana[] = [];
  const usedRomaji = new Set<string>();
  for (const kana of shuffle(pool)) {
    if (chosen.length >= count) break;
    if (usedRomaji.has(kana.romaji)) continue;
    usedRomaji.add(kana.romaji);
    chosen.push(kana);
  }
  return chosen;
};
