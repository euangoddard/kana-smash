import {
  ALL_KANJI,
  ALL_WORDS,
  confusableKanjiIds,
  KANJI_BY_ID,
  wordsForKanji,
  type Kanji,
  type KanjiFacet,
  type KanjiWord,
} from "~/data/kanji";

/**
 * Kanji quiz generation. Meaning questions test the bare character; reading
 * questions always test a whole word, because an isolated kanji has no
 * single correct reading (生 alone is unanswerable — 学生 is not).
 */

export type KanjiExerciseKind =
  "kanji-to-meaning" | "meaning-to-kanji" | "word-to-reading" | "sound-to-word";

export interface KanjiQuestion {
  kind: KanjiExerciseKind;
  /** Which skill this exercises — decides where the answer is recorded. */
  facet: KanjiFacet;
  /** Kanji the answer is recorded against (word kinds: all kanji in the word). */
  testedKanjiIds: string[];
  /** The kanji this question was built around, for feedback. */
  kanjiId: string;
  /** The word being read, for word kinds. */
  wordId?: string;
  /** What is shown: the kanji, the meaning, or the word. Empty for sound. */
  prompt: string;
  /** Hiragana handed to speech synthesis (sound questions only). */
  spoken?: string;
  options: string[];
  correctIndex: number;
}

export interface KanjiQuizConfig {
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
 * Distractor kanji for `target`, hardest first: visually confusable
 * characters, then the rest of the level's pool, then the whole set.
 * Never a kanji sharing the target's gloss — two correct options.
 */
const distractorKanji = (
  target: Kanji,
  pool: Kanji[],
  count: number,
): Kanji[] => {
  const chosen: Kanji[] = [];
  const used = new Set<string>([target.id]);
  const usedMeanings = new Set<string>([target.meaning]);
  const tiers: Kanji[][] = [
    confusableKanjiIds(target.id).map((id) => KANJI_BY_ID.get(id)!),
    pool,
    ALL_KANJI,
  ];
  for (const tier of tiers) {
    for (const kanji of shuffle(tier)) {
      if (chosen.length >= count) return chosen;
      if (used.has(kanji.id) || usedMeanings.has(kanji.meaning)) continue;
      used.add(kanji.id);
      usedMeanings.add(kanji.meaning);
      chosen.push(kanji);
    }
  }
  return chosen;
};

/** Voicing slips a beginner plausibly makes: か⇄が, は⇄ば⇄ぱ … */
const VOICING_GROUPS = [
  ...["かが", "きぎ", "くぐ", "けげ", "こご"],
  ...["さざ", "しじ", "すず", "せぜ", "そぞ"],
  ...["ただ", "ちぢ", "つづ", "てで", "とど"],
  ...["はばぱ", "ひびぴ", "ふぶぷ", "へべぺ", "ほぼぽ"],
];

const VOICING: Map<string, string[]> = new Map();
for (const group of VOICING_GROUPS) {
  for (const ch of group) {
    VOICING.set(
      ch,
      [...group].filter((other) => other !== ch),
    );
  }
}

/**
 * Near-miss readings of `reading`: one voicing toggled (がっこう→かっこう),
 * the small tsu added or dropped (がこう), or a mora dropped (おとうさん→
 * おとさん). These are the mistakes learners actually make, so they beat
 * unrelated real readings as wrong answers.
 */
const mutatedReadings = (reading: string): string[] => {
  const chars = [...reading];
  const results = new Set<string>();
  chars.forEach((ch, i) => {
    for (const alt of VOICING.get(ch) ?? []) {
      results.add([...chars.slice(0, i), alt, ...chars.slice(i + 1)].join(""));
    }
  });
  if (chars.includes("っ")) {
    results.add(chars.filter((ch) => ch !== "っ").join(""));
  } else {
    for (let i = 1; i < chars.length; i++) {
      results.add([...chars.slice(0, i), "っ", ...chars.slice(i)].join(""));
    }
  }
  if (chars.length >= 3) {
    for (let i = 1; i < chars.length; i++) {
      results.add([...chars.slice(0, i), ...chars.slice(i + 1)].join(""));
    }
  }
  results.delete(reading);
  return [...results];
};

/**
 * Wrong readings for `word`: mutations first; if those run short (very short
 * readings mutate few ways), other words' readings, closest in length first
 * so the odd one out isn't a giveaway.
 */
const distractorReadings = (word: KanjiWord, count: number): string[] => {
  const chosen: string[] = [];
  const used = new Set<string>([word.reading]);
  const add = (reading: string) => {
    if (chosen.length >= count || used.has(reading)) return;
    used.add(reading);
    chosen.push(reading);
  };
  for (const mutation of shuffle(mutatedReadings(word.reading))) add(mutation);
  const byLength = (r: string) => Math.abs(r.length - word.reading.length);
  for (const other of shuffle(ALL_WORDS).sort(
    (a, b) => byLength(a.reading) - byLength(b.reading),
  )) {
    add(other.reading);
  }
  return chosen;
};

/** Wrong words for a listening question — never a homophone of the target. */
const distractorWords = (
  target: KanjiWord,
  pool: Kanji[],
  count: number,
): KanjiWord[] => {
  const poolIds = new Set(pool.map((k) => k.id));
  const chosen: KanjiWord[] = [];
  const used = new Set<string>([target.id]);
  const tiers: KanjiWord[][] = [
    ALL_WORDS.filter((w) => w.kanjiIds.some((id) => poolIds.has(id))),
    ALL_WORDS,
  ];
  for (const tier of tiers) {
    for (const word of shuffle(tier)) {
      if (chosen.length >= count) return chosen;
      if (used.has(word.id) || word.reading === target.reading) continue;
      used.add(word.id);
      chosen.push(word);
    }
  }
  return chosen;
};

const withOptions = (
  correct: string,
  distractors: string[],
): { options: string[]; correctIndex: number } => {
  const options = shuffle([correct, ...distractors]);
  return { options, correctIndex: options.indexOf(correct) };
};

const buildQuestion = (
  target: Kanji,
  kind: KanjiExerciseKind,
  pool: Kanji[],
): KanjiQuestion => {
  if (kind === "kanji-to-meaning" || kind === "meaning-to-kanji") {
    const distractors = distractorKanji(target, pool, 3);
    const render = (k: Kanji) =>
      kind === "kanji-to-meaning" ? k.meaning : k.id;
    return {
      kind,
      facet: "meaning",
      testedKanjiIds: [target.id],
      kanjiId: target.id,
      prompt: kind === "kanji-to-meaning" ? target.id : target.meaning,
      ...withOptions(render(target), distractors.map(render)),
    };
  }
  const word = pick(wordsForKanji(target.id));
  if (kind === "word-to-reading") {
    return {
      kind,
      facet: "reading",
      testedKanjiIds: word.kanjiIds,
      kanjiId: target.id,
      wordId: word.id,
      prompt: word.id,
      ...withOptions(word.reading, distractorReadings(word, 3)),
    };
  }
  return {
    kind,
    facet: "reading",
    testedKanjiIds: word.kanjiIds,
    kanjiId: target.id,
    wordId: word.id,
    prompt: "",
    spoken: word.reading,
    ...withOptions(
      word.id,
      distractorWords(word, pool, 3).map((w) => w.id),
    ),
  };
};

/**
 * Build a quiz over `pool`. Every kanji appears before any repeats, and the
 * exercise kinds are spread evenly (listening questions only if enabled).
 */
export const generateKanjiQuiz = (
  pool: Kanji[],
  config: KanjiQuizConfig,
): KanjiQuestion[] => {
  if (!pool.length) return [];
  const kinds: KanjiExerciseKind[] = config.includeSound
    ? [
        "kanji-to-meaning",
        "meaning-to-kanji",
        "word-to-reading",
        "sound-to-word",
      ]
    : ["kanji-to-meaning", "meaning-to-kanji", "word-to-reading"];

  const targets: Kanji[] = [];
  while (targets.length < config.questionCount) {
    const round = shuffle(pool);
    // Avoid the same kanji twice in a row across round boundaries.
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

  return targets.map((kanji, i) => buildQuestion(kanji, kindQueue[i], pool));
};

/**
 * Up to `count` kanji for the closing matching round (kanji ↔ meaning).
 * Glosses are unique across the set, so any picks make a fair puzzle.
 */
export const buildKanjiMatchSet = (pool: Kanji[], count = 5): Kanji[] =>
  shuffle(pool).slice(0, count);
