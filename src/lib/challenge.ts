import { ALL_KANA, isScript, type Kana } from "~/data/kana";
import { ALL_KANJI, type Kanji } from "~/data/kanji";
import { kanjiStats, type KanjiProgressData } from "./kanji-progress";
import type { ProgressData } from "./progress";

/**
 * Challenge mode: a 60-second sprint against the clock, one course at a
 * time, with a local best score. Answers are recorded to progress like any
 * other practice — speed rounds are still reps.
 */

export type ChallengeCourse = "hiragana" | "katakana" | "kanji";

export const CHALLENGE_COURSES: ChallengeCourse[] = [
  "hiragana",
  "katakana",
  "kanji",
];

export const isChallengeCourse = (value: string): value is ChallengeCourse =>
  isScript(value) || value === "kanji";

export const CHALLENGE_SECONDS = 60;

/**
 * The sprint draws from characters you've met before, so it tests speed —
 * not luck. Only when there's too little history does it fall back to the
 * full set.
 */
const MIN_POOL = 10;

export const challengeKanaPool = (
  data: ProgressData,
  script: "hiragana" | "katakana",
): Kana[] => {
  const seen = ALL_KANA.filter((k) => data[script][k.id]?.length);
  return seen.length >= MIN_POOL ? seen : ALL_KANA;
};

export const challengeKanjiPool = (data: KanjiProgressData): Kanji[] => {
  const seen = kanjiStats(data)
    .filter((s) => s.attempts > 0)
    .map((s) => s.kanji);
  return seen.length >= MIN_POOL ? seen : ALL_KANJI;
};

const STORAGE_KEY = "kana-smash:challenge:v1";

type BestScores = Partial<Record<ChallengeCourse, number>>;

const load = (): BestScores => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BestScores) : {};
  } catch {
    return {};
  }
};

export const challengeBest = (course: ChallengeCourse): number =>
  load()[course] ?? 0;

/** Save `score` if it beats the stored best; returns true on a new record. */
export const submitChallengeScore = (
  course: ChallengeCourse,
  score: number,
): boolean => {
  const scores = load();
  if (score <= (scores[course] ?? 0)) return false;
  scores[course] = score;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // Storage full or blocked — the run still counts, we just can't save it.
  }
  return true;
};
