import type { Script } from "~/data/kana";
import { wordsForScript, type StudyWord } from "~/data/words";

/**
 * Word quiz generation: whole-word reading in kana. The same three
 * directions as single-character drills, but at word level — where yōon,
 * sokuon and long vowels actually bite.
 */

export type WordExerciseKind =
  "word-to-romaji" | "romaji-to-word" | "sound-to-word";

export interface WordQuestion {
  kind: WordExerciseKind;
  wordId: string;
  /** What is shown: the written word or the romaji. Empty for sound. */
  prompt: string;
  /** Text handed to speech synthesis (sound questions only). */
  spoken?: string;
  options: string[];
  correctIndex: number;
}

export interface WordQuizConfig {
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

const VOWELS = ["a", "i", "u", "e", "o"];

/** Voicing slips a beginner plausibly makes, in romaji space: ka⇄ga … */
const VOICING_PAIRS: [string, string][] = [
  ["k", "g"],
  ["s", "z"],
  ["t", "d"],
  ["h", "b"],
  ["b", "p"],
  ["sh", "j"],
  ["ch", "j"],
];

/**
 * Near-miss readings of `romaji`: a long vowel shortened or added
 * (koohii → kohii), a doubled consonant dropped or added (gakkou →
 * gakou), one vowel swapped, or a voicing toggled (kasa → gasa). These
 * are the mistakes learners actually make when sounding out a word.
 */
const mutatedRomaji = (romaji: string): string[] => {
  const results = new Set<string>();
  // Long vowels: collapse a doubled vowel, or double a single one.
  for (const v of VOWELS) {
    const doubled = v + v;
    if (romaji.includes(doubled)) {
      results.add(romaji.replace(doubled, v));
    } else if (romaji.includes(v)) {
      results.add(romaji.replace(v, doubled));
    }
  }
  // Doubled consonants (sokuon): drop or add one.
  const doubledConsonant = romaji.match(/([kstpgzdbfr])\1/);
  if (doubledConsonant) {
    results.add(romaji.replace(doubledConsonant[0], doubledConsonant[1]));
  } else {
    const single = romaji.match(/[aiueo]([kstp])[aiueo]/);
    if (single) {
      const i = single.index! + 1;
      results.add(romaji.slice(0, i) + single[1] + romaji.slice(i));
    }
  }
  // One vowel swapped for another.
  const chars = [...romaji];
  chars.forEach((ch, i) => {
    if (!VOWELS.includes(ch)) return;
    for (const v of VOWELS) {
      if (v === ch || chars[i + 1] === ch || chars[i - 1] === ch) continue;
      results.add([...chars.slice(0, i), v, ...chars.slice(i + 1)].join(""));
    }
  });
  // Voicing toggled once.
  for (const [plain, voiced] of VOICING_PAIRS) {
    if (romaji.includes(plain)) results.add(romaji.replace(plain, voiced));
    if (romaji.includes(voiced)) results.add(romaji.replace(voiced, plain));
  }
  results.delete(romaji);
  return [...results];
};

/**
 * Wrong romaji for `word`: mutations first, then other words' romaji,
 * closest in length first so the odd one out isn't a giveaway.
 */
const distractorRomaji = (
  word: StudyWord,
  script: Script,
  count: number,
): string[] => {
  const chosen: string[] = [];
  const used = new Set<string>([word.romaji]);
  const add = (romaji: string) => {
    if (chosen.length >= count || used.has(romaji)) return;
    used.add(romaji);
    chosen.push(romaji);
  };
  for (const mutation of shuffle(mutatedRomaji(word.romaji)).slice(0, 2)) {
    add(mutation);
  }
  const byLength = (r: string) => Math.abs(r.length - word.romaji.length);
  for (const other of shuffle(wordsForScript(script)).sort(
    (a, b) => byLength(a.romaji) - byLength(b.romaji),
  )) {
    add(other.romaji);
  }
  return chosen;
};

/** Wrong words, drawn from the level's pool first — never a homophone. */
const distractorWords = (
  target: StudyWord,
  pool: StudyWord[],
  count: number,
): StudyWord[] => {
  const chosen: StudyWord[] = [];
  const used = new Set<string>([target.id]);
  const tiers = [pool, wordsForScript(target.script)];
  for (const tier of tiers) {
    for (const word of shuffle(tier)) {
      if (chosen.length >= count) return chosen;
      if (used.has(word.id) || word.romaji === target.romaji) continue;
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
  target: StudyWord,
  kind: WordExerciseKind,
  pool: StudyWord[],
): WordQuestion => {
  if (kind === "word-to-romaji") {
    return {
      kind,
      wordId: target.id,
      prompt: target.id,
      ...withOptions(target.romaji, distractorRomaji(target, target.script, 3)),
    };
  }
  const wrongWords = distractorWords(target, pool, 3).map((w) => w.id);
  if (kind === "romaji-to-word") {
    return {
      kind,
      wordId: target.id,
      prompt: target.romaji,
      ...withOptions(target.id, wrongWords),
    };
  }
  return {
    kind,
    wordId: target.id,
    prompt: "",
    spoken: target.id,
    ...withOptions(target.id, wrongWords),
  };
};

/**
 * Build a quiz over `pool`. Every word appears before any repeats, and the
 * exercise kinds are spread evenly (sound questions only if enabled).
 */
export const generateWordQuiz = (
  pool: StudyWord[],
  config: WordQuizConfig,
): WordQuestion[] => {
  if (!pool.length) return [];
  const kinds: WordExerciseKind[] = config.includeSound
    ? ["word-to-romaji", "romaji-to-word", "sound-to-word"]
    : ["word-to-romaji", "romaji-to-word"];

  const targets: StudyWord[] = [];
  while (targets.length < config.questionCount) {
    const round = shuffle(pool);
    // Avoid the same word twice in a row across round boundaries.
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

  return targets.map((word, i) => buildQuestion(word, kindQueue[i], pool));
};

/**
 * Up to `count` words for the closing matching round. Romaji are unique
 * across the vocabulary, so any picks make a fair puzzle.
 */
export const buildWordMatchSet = (
  pool: StudyWord[],
  count = 5,
): StudyWord[] => {
  const chosen: StudyWord[] = [];
  const usedRomaji = new Set<string>();
  for (const word of shuffle(pool)) {
    if (chosen.length >= count) break;
    if (usedRomaji.has(word.romaji)) continue;
    usedRomaji.add(word.romaji);
    chosen.push(word);
  }
  return chosen;
};
