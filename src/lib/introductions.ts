/**
 * Remembers which lessons have already had their characters introduced, so
 * the intro screen auto-shows only on a learner's first visit to a level.
 * Client-only, like all localStorage helpers.
 */

const STORAGE_KEY = "kana-smash:introduced:v1";

const load = (): string[] => {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

/** `course` is a kana script or "kanji"; with the level id it names a lesson. */
export const hasSeenIntro = (course: string, levelId: string): boolean =>
  load().includes(`${course}:${levelId}`);

export const markIntroSeen = (course: string, levelId: string): void => {
  const key = `${course}:${levelId}`;
  const seen = load();
  if (seen.includes(key)) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, key]));
  } catch {
    // Storage full or blocked — they'll just see the intro again next time.
  }
};
