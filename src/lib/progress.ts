import { ALL_KANA, KANA_BY_ID, type Kana, type Script } from "~/data/kana";

/**
 * All progress lives in localStorage — this app has no backend. Every
 * function here is client-only; call from event handlers or visible tasks.
 */

const STORAGE_KEY = "kana-smash:progress:v1";

/** Most recent attempts kept per kana; older ones age out. */
export const MAX_ATTEMPTS = 20;

/** Recency weight decay: newest attempt weighs 1, the next 0.85, … */
const DECAY = 0.85;

/** An attempt: r = 1 correct / 0 wrong, t = epoch ms. */
export interface Attempt {
  r: 0 | 1;
  t: number;
}

export type ScriptProgress = Record<string, Attempt[]>;
export type ProgressData = Record<Script, ScriptProgress>;

const empty = (): ProgressData => ({ hiragana: {}, katakana: {} });

export const loadProgress = (): ProgressData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    return {
      hiragana: parsed.hiragana ?? {},
      katakana: parsed.katakana ?? {},
    };
  } catch {
    return empty();
  }
};

export const recordAnswer = (
  script: Script,
  kanaId: string,
  correct: boolean,
): void => {
  const data = loadProgress();
  const attempts = data[script][kanaId] ?? [];
  attempts.push({ r: correct ? 1 : 0, t: Date.now() });
  data[script][kanaId] = attempts.slice(-MAX_ATTEMPTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked — the quiz still works, we just can't save.
  }
};

/** Recency-weighted accuracy in [0, 1], or null if never attempted. */
export const kanaScore = (attempts: Attempt[] | undefined): number | null => {
  if (!attempts?.length) return null;
  let weighted = 0;
  let total = 0;
  for (let i = attempts.length - 1, w = 1; i >= 0; i--, w *= DECAY) {
    weighted += attempts[i].r * w;
    total += w;
  }
  return weighted / total;
};

export interface KanaStat {
  kana: Kana;
  score: number | null;
  attempts: number;
}

export const scriptStats = (data: ProgressData, script: Script): KanaStat[] =>
  ALL_KANA.map((kana) => {
    const attempts = data[script][kana.id];
    return {
      kana,
      score: kanaScore(attempts),
      attempts: attempts?.length ?? 0,
    };
  });

/** Below this recency-weighted accuracy a kana counts as weak. */
export const WEAK_THRESHOLD = 0.8;

/**
 * Attempts needed before a kana can be judged weak (or mastered). Must stay
 * at 1 so this agrees with the heatmap, which flags "needs work" from the
 * first wrong answer — large pools (e.g. yōon levels) often leave a kana
 * with a single attempt per session.
 */
export const MIN_ATTEMPTS = 1;

/**
 * Weakest kana first. Only kana with enough attempts qualify; caller decides
 * how many to take. Includes kana under the threshold, padded (if `pad`)
 * with the lowest scorers above it so a session always has enough material.
 */
export const weakKana = (
  data: ProgressData,
  script: Script,
  limit: number,
  pad = true,
): Kana[] => {
  const rated = scriptStats(data, script)
    .filter((s): s is KanaStat & { score: number } => s.score !== null)
    .filter((s) => s.attempts >= MIN_ATTEMPTS)
    .sort((a, b) => a.score - b.score);
  const weak = rated.filter((s) => s.score < WEAK_THRESHOLD);
  const pool = pad ? rated : weak;
  return pool
    .slice(0, Math.max(weak.length, pad ? Math.min(limit, pool.length) : 0))
    .slice(0, limit)
    .map((s) => s.kana);
};

/** True once there is enough data for weak-area practice to mean anything. */
export const hasWeakAreaData = (data: ProgressData, script: Script): boolean =>
  scriptStats(data, script).filter((s) => s.attempts >= MIN_ATTEMPTS).length >=
  5;

/** Per-level mastery: average score of the level's kana (null = unseen). */
export const levelMastery = (
  data: ProgressData,
  script: Script,
  kanaIds: string[],
): number | null => {
  const scores = kanaIds
    .map((id) => kanaScore(data[script][id]))
    .filter((s): s is number => s !== null);
  if (!scores.length) return null;
  // Unseen kana count as 0 so "mastered" means the whole level was practised.
  return scores.reduce((a, b) => a + b, 0) / kanaIds.length;
};

export const kanaById = (id: string): Kana | undefined => KANA_BY_ID.get(id);
