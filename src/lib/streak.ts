/**
 * Practice streak and daily goal, stored alongside progress in localStorage.
 * Every scored answer (kana, kanji, word or challenge) counts one point
 * toward the day — recorded via `recordActivity`, which the progress
 * recorders call exactly once per question.
 */

const STORAGE_KEY = "kana-smash:streak:v1";

/** Answers per day that count as "done for today". */
export const DAILY_GOAL = 20;

/** Days of per-day counts kept; the best streak survives pruning separately. */
const KEEP_DAYS = 60;

interface StreakData {
  /** Answers per local day, keyed YYYY-MM-DD. */
  counts: Record<string, number>;
  best: number;
}

const empty = (): StreakData => ({ counts: {}, best: 0 });

/** Local-timezone day key — a streak day should roll over at midnight local. */
const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
};

const load = (): StreakData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<StreakData>;
    return {
      counts: parsed.counts ?? {},
      best: typeof parsed.best === "number" ? parsed.best : 0,
    };
  } catch {
    return empty();
  }
};

/**
 * Consecutive practised days ending today — or ending yesterday when today
 * has no answers yet, so an unbroken streak isn't shown as 0 all morning.
 */
const currentStreak = (counts: Record<string, number>): number => {
  const start = (counts[daysAgo(0)] ?? 0) > 0 ? 0 : 1;
  let streak = 0;
  while ((counts[daysAgo(start + streak)] ?? 0) > 0) streak++;
  return streak;
};

/** Count one answered question toward today's goal and the streak. */
export const recordActivity = (): void => {
  const data = load();
  const today = daysAgo(0);
  data.counts[today] = (data.counts[today] ?? 0) + 1;
  const cutoff = daysAgo(KEEP_DAYS);
  for (const day of Object.keys(data.counts)) {
    if (day < cutoff) delete data.counts[day];
  }
  data.best = Math.max(data.best, currentStreak(data.counts));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked — practice still works, we just can't count it.
  }
};

export interface StreakStats {
  /** Consecutive practised days, still counting yesterday's streak as alive. */
  current: number;
  best: number;
  /** Answers given today. */
  today: number;
  goal: number;
  goalMet: boolean;
}

export const streakStats = (): StreakStats => {
  const data = load();
  const today = data.counts[daysAgo(0)] ?? 0;
  const current = currentStreak(data.counts);
  return {
    current,
    best: Math.max(data.best, current),
    today,
    goal: DAILY_GOAL,
    goalMet: today >= DAILY_GOAL,
  };
};
