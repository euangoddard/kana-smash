import { ALL_KANJI, type Kanji, type KanjiFacet } from "~/data/kanji";
import {
  kanaScore,
  MAX_ATTEMPTS,
  MIN_ATTEMPTS,
  WEAK_THRESHOLD,
  type Attempt,
} from "./progress";

/**
 * Kanji progress, kept separately from kana progress because the unit is
 * different: each kanji is tracked per facet — knowing 水 means "water"
 * and knowing it reads みず decay independently. Same rules as kana
 * progress otherwise: localStorage only, client-only, recency-weighted.
 */

const STORAGE_KEY = "kana-smash:kanji-progress:v1";

/** Attempts keyed by "<kanji>:<facet>", e.g. "水:meaning". */
export type KanjiProgressData = Record<string, Attempt[]>;

const facetKey = (kanjiId: string, facet: KanjiFacet): string =>
  `${kanjiId}:${facet}`;

export const loadKanjiProgress = (): KanjiProgressData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KanjiProgressData) : {};
  } catch {
    return {};
  }
};

/**
 * Record one answer against every kanji it tested — a reading question on
 * 学校 counts for the reading facet of both 学 and 校.
 */
export const recordKanjiAnswer = (
  kanjiIds: string[],
  facet: KanjiFacet,
  correct: boolean,
): void => {
  const data = loadKanjiProgress();
  const now = Date.now();
  for (const id of kanjiIds) {
    const key = facetKey(id, facet);
    const attempts = data[key] ?? [];
    attempts.push({ r: correct ? 1 : 0, t: now });
    data[key] = attempts.slice(-MAX_ATTEMPTS);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked — the quiz still works, we just can't save.
  }
};

/** Recency-weighted accuracy for one facet, or null if never attempted. */
export const kanjiFacetScore = (
  data: KanjiProgressData,
  kanjiId: string,
  facet: KanjiFacet,
): number | null => kanaScore(data[facetKey(kanjiId, facet)]);

/**
 * Combined score: the *weaker* of the attempted facets, so a kanji you can
 * translate but not read still shows as needing work. Null until either
 * facet has been attempted.
 */
export const kanjiScore = (
  data: KanjiProgressData,
  kanjiId: string,
): number | null => {
  const scores = [
    kanjiFacetScore(data, kanjiId, "meaning"),
    kanjiFacetScore(data, kanjiId, "reading"),
  ].filter((s): s is number => s !== null);
  return scores.length ? Math.min(...scores) : null;
};

export interface KanjiStat {
  kanji: Kanji;
  score: number | null;
  attempts: number;
}

export const kanjiStats = (data: KanjiProgressData): KanjiStat[] =>
  ALL_KANJI.map((kanji) => ({
    kanji,
    score: kanjiScore(data, kanji.id),
    attempts:
      (data[facetKey(kanji.id, "meaning")]?.length ?? 0) +
      (data[facetKey(kanji.id, "reading")]?.length ?? 0),
  }));

/**
 * Weakest kanji first — same shape as `weakKana`. Only kanji with enough
 * attempts qualify; padded with the lowest scorers above the threshold so
 * a session always has enough material.
 */
export const weakKanji = (data: KanjiProgressData, limit: number): Kanji[] => {
  const rated = kanjiStats(data)
    .filter((s): s is KanjiStat & { score: number } => s.score !== null)
    .filter((s) => s.attempts >= MIN_ATTEMPTS)
    .sort((a, b) => a.score - b.score);
  const weak = rated.filter((s) => s.score < WEAK_THRESHOLD);
  return rated
    .slice(0, Math.max(weak.length, Math.min(limit, rated.length)))
    .slice(0, limit)
    .map((s) => s.kanji);
};

/** True once there is enough data for weak-area practice to mean anything. */
export const hasWeakKanjiData = (data: KanjiProgressData): boolean =>
  kanjiStats(data).filter((s) => s.attempts >= MIN_ATTEMPTS).length >= 5;

/** Per-level mastery: average combined score (null = level unseen). */
export const kanjiLevelMastery = (
  data: KanjiProgressData,
  kanjiIds: string[],
): number | null => {
  const scores = kanjiIds
    .map((id) => kanjiScore(data, id))
    .filter((s): s is number => s !== null);
  if (!scores.length) return null;
  // Unseen kanji count as 0 so "mastered" means the whole level was practised.
  return scores.reduce((a, b) => a + b, 0) / kanjiIds.length;
};
