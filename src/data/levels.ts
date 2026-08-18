import { ALL_KANA } from "./kana";

export type LevelSection = "basics" | "dakuten" | "combos" | "review";

export interface Level {
  id: string;
  title: string;
  /** Sample characters shown on the level card, as hiragana ids. */
  sample: string[];
  kanaIds: string[];
  section: LevelSection;
}

const rows = (...rowIds: string[]): string[] =>
  ALL_KANA.filter((k) => rowIds.includes(k.row)).map((k) => k.id);

const level = (
  id: string,
  title: string,
  kanaIds: string[],
  section: LevelSection,
): Level => ({ id, title, kanaIds, section, sample: kanaIds.slice(0, 5) });

export const LEVELS: Level[] = [
  level("vowels", "Vowels", rows("vowel"), "basics"),
  level("k-row", "K row", rows("k"), "basics"),
  level("s-row", "S row", rows("s"), "basics"),
  level("t-row", "T row", rows("t"), "basics"),
  level("n-row", "N row", rows("n"), "basics"),
  level(
    "checkpoint-1",
    "Checkpoint · first half",
    rows("vowel", "k", "s", "t", "n"),
    "basics",
  ),
  level("h-row", "H row", rows("h"), "basics"),
  level("m-row", "M row", rows("m"), "basics"),
  level("y-row", "Y row", rows("y"), "basics"),
  level("r-row", "R row", rows("r"), "basics"),
  level("w-row", "W row + n", rows("w"), "basics"),
  level(
    "checkpoint-2",
    "Checkpoint · second half",
    rows("h", "m", "y", "r", "w"),
    "basics",
  ),
  level(
    "all-basic",
    "All 46 basics",
    rows("vowel", "k", "s", "t", "n", "h", "m", "y", "r", "w"),
    "basics",
  ),
  level("g-row", "G row", rows("g"), "dakuten"),
  level("z-row", "Z row", rows("z"), "dakuten"),
  level("d-row", "D row", rows("d"), "dakuten"),
  level("b-row", "B row", rows("b"), "dakuten"),
  level("p-row", "P row", rows("p"), "dakuten"),
  level(
    "all-dakuten",
    "All marked kana",
    rows("g", "z", "d", "b", "p"),
    "dakuten",
  ),
  level("yoon-1", "kya · sha · cha", rows("ky", "sh", "ch"), "combos"),
  level(
    "yoon-2",
    "nya · hya · mya · rya",
    rows("ny", "hy", "my", "ry"),
    "combos",
  ),
  level(
    "yoon-3",
    "gya · ja · bya · pya",
    rows("gy", "j", "by", "py"),
    "combos",
  ),
  level(
    "all-yoon",
    "All combos",
    rows("ky", "sh", "ch", "ny", "hy", "my", "ry", "gy", "j", "by", "py"),
    "combos",
  ),
  level(
    "everything",
    "Everything",
    ALL_KANA.map((k) => k.id),
    "review",
  ),
];

/** Special dynamic level: its kana are picked from progress data at runtime. */
export const WEAK_AREAS_LEVEL_ID = "weak-areas";

/** Special dynamic level: kana due for spaced-repetition review right now. */
export const DUE_REVIEW_LEVEL_ID = "due-review";

export const LEVELS_BY_ID: ReadonlyMap<string, Level> = new Map(
  LEVELS.map((l) => [l.id, l]),
);

/** The level after `levelId` in course order, if any. */
export const nextLevel = (levelId: string): Level | undefined => {
  const index = LEVELS.findIndex((l) => l.id === levelId);
  return index === -1 ? undefined : LEVELS[index + 1];
};

export const SECTION_LABELS: Record<LevelSection, string> = {
  basics: "The basics",
  dakuten: "Marked kana — dakuten & handakuten",
  combos: "Combination kana — yōon",
  review: "Grand review",
};

export const SECTIONS: LevelSection[] = [
  "basics",
  "dakuten",
  "combos",
  "review",
];
