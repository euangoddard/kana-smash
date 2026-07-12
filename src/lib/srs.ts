import { ALL_KANA, type Kana, type Script } from "~/data/kana";
import { ALL_KANJI, type Kanji, type KanjiFacet } from "~/data/kanji";
import type { KanjiProgressData } from "./kanji-progress";
import type { Attempt, ProgressData } from "./progress";

/**
 * Spaced repetition, derived entirely from the attempt history the app
 * already stores — no separate scheduler state to keep in sync. A character
 * earns a longer review interval for each consecutive correct answer at the
 * tail of its history, and becomes "due" once that long since it was last
 * seen. A wrong answer resets the tail, so the character comes back fast.
 *
 * Characters never attempted are not due: new material is learned through
 * levels, review is for keeping learned material alive.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Interval before the next review, indexed by the run of consecutive
 * correct answers at the end of the history. Index 0 (last answer wrong)
 * brings the character back within hours.
 */
const INTERVALS_DAYS = [1 / 6, 1, 3, 7, 14, 30];

/** Consecutive correct answers at the tail of the history. */
const tailStreak = (attempts: Attempt[]): number => {
  let streak = 0;
  for (let i = attempts.length - 1; i >= 0 && attempts[i].r === 1; i--) {
    streak++;
  }
  return streak;
};

/** Epoch ms when this history next comes due, or null if never attempted. */
export const dueAt = (attempts: Attempt[] | undefined): number | null => {
  if (!attempts?.length) return null;
  const streak = Math.min(tailStreak(attempts), INTERVALS_DAYS.length - 1);
  return attempts[attempts.length - 1].t + INTERVALS_DAYS[streak] * DAY_MS;
};

const overdueMs = (attempts: Attempt[] | undefined, now: number): number => {
  const due = dueAt(attempts);
  return due === null ? -Infinity : now - due;
};

/** Kana of `script` due for review, most overdue first. */
export const dueKana = (
  data: ProgressData,
  script: Script,
  now = Date.now(),
): Kana[] =>
  ALL_KANA.map((kana) => ({
    kana,
    overdue: overdueMs(data[script][kana.id], now),
  }))
    .filter((entry) => entry.overdue >= 0)
    .sort((a, b) => b.overdue - a.overdue)
    .map((entry) => entry.kana);

const KANJI_FACETS: KanjiFacet[] = ["meaning", "reading"];

/** Kanji with either facet due for review, most overdue first. */
export const dueKanji = (data: KanjiProgressData, now = Date.now()): Kanji[] =>
  ALL_KANJI.map((kanji) => ({
    kanji,
    overdue: Math.max(
      ...KANJI_FACETS.map((facet) =>
        overdueMs(data[`${kanji.id}:${facet}`], now),
      ),
    ),
  }))
    .filter((entry) => entry.overdue >= 0)
    .sort((a, b) => b.overdue - a.overdue)
    .map((entry) => entry.kanji);

/** Cap on how many characters one review session drills. */
export const REVIEW_POOL_SIZE = 12;
