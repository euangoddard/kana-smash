import { ALL_KANJI } from "./kanji";

export type KanjiLevelSection =
  "foundations" | "people" | "world" | "everyday" | "review";

export interface KanjiLevel {
  id: string;
  title: string;
  /** Sample characters shown on the level card. */
  sample: string[];
  kanjiIds: string[];
  section: KanjiLevelSection;
}

const chars = (text: string): string[] => [...text];

const level = (
  id: string,
  title: string,
  kanjiIds: string[],
  section: KanjiLevelSection,
): KanjiLevel => ({
  id,
  title,
  kanjiIds,
  section,
  sample: kanjiIds.slice(0, 5),
});

export const KANJI_LEVELS: KanjiLevel[] = [
  level("numbers-1", "Numbers 1–5", chars("一二三四五"), "foundations"),
  level("numbers-2", "Numbers 6–10", chars("六七八九十"), "foundations"),
  level("money", "Big numbers & money", chars("百千万円半"), "foundations"),
  level("days", "Days of the week", chars("日月火水木金土"), "foundations"),
  level("time", "Telling time", chars("年時分間午"), "foundations"),
  level("calendar", "Now & when", chars("今毎前後何"), "foundations"),
  level(
    "checkpoint-foundations",
    "Checkpoint · numbers & time",
    chars("一二三四五六七八九十百千万円半日月火水木金土年時分間午今毎前後何"),
    "foundations",
  ),
  level("people", "People & family", chars("人男女子父母友"), "people"),
  level("school", "School", chars("学校先生本名"), "people"),
  level("verbs-1", "Coming & going", chars("行来出入見"), "people"),
  level("verbs-2", "Everyday verbs", chars("話聞読書食休"), "people"),
  level(
    "checkpoint-people",
    "Checkpoint · people & actions",
    chars("人男女子父母友学校先生本名行来出入見話聞読書食休"),
    "people",
  ),
  level("position", "Position", chars("上下中外"), "world"),
  level("compass", "Directions", chars("東西南北右左"), "world"),
  level("nature", "Nature", chars("山川天気雨"), "world"),
  level("adjectives", "Describing things", chars("大小高長白"), "world"),
  level("country", "Country & travel", chars("国語電車"), "world"),
  level(
    "checkpoint-world",
    "Checkpoint · places & things",
    chars("上下中外東西南北右左山川天気雨大小高長白国語電車"),
    "world",
  ),
  level("body", "Body & senses", chars("手足目口耳頭体心"), "everyday"),
  level("verbs-3", "Think, make & use", chars("思知住待持使作送"), "everyday"),
  level("verbs-4", "Buy, sell & move", chars("帰買売教立歩走起"), "everyday"),
  level("seasons", "Seasons & sky", chars("春夏秋冬雪風空星"), "everyday"),
  level(
    "nature-2",
    "Nature, animals & food",
    chars("花海犬魚鳥肉茶牛"),
    "everyday",
  ),
  level(
    "opposites",
    "Colours & opposites",
    chars("新古多少早青赤黒"),
    "everyday",
  ),
  level("town", "Around town", chars("家店駅町道社会場"), "everyday"),
  level(
    "checkpoint-everyday",
    "Checkpoint · everyday life",
    chars(
      "手足目口耳頭体心思知住待持使作送帰買売教立歩走起春夏秋冬雪風空星花海犬魚鳥肉茶牛新古多少早青赤黒家店駅町道社会場",
    ),
    "everyday",
  ),
  level(
    "everything",
    `All ${ALL_KANJI.length} kanji`,
    ALL_KANJI.map((k) => k.id),
    "review",
  ),
];

/** Special dynamic level: its kanji are picked from progress data at runtime. */
export const WEAK_KANJI_LEVEL_ID = "weak-areas";

/** Special dynamic level: kanji due for spaced-repetition review right now. */
export const DUE_KANJI_REVIEW_LEVEL_ID = "due-review";

/** Special dynamic level: kanji commonly confused with each other
 * (人/入, 木/本/休, 日/白/百 …), drawn from the confusion data in `kanji.ts`. */
export const LOOKALIKES_KANJI_LEVEL_ID = "look-alikes";

export const KANJI_LEVELS_BY_ID: ReadonlyMap<string, KanjiLevel> = new Map(
  KANJI_LEVELS.map((l) => [l.id, l]),
);

/** The level after `levelId` in course order, if any. */
export const nextKanjiLevel = (levelId: string): KanjiLevel | undefined => {
  const index = KANJI_LEVELS.findIndex((l) => l.id === levelId);
  return index === -1 ? undefined : KANJI_LEVELS[index + 1];
};

export const KANJI_SECTION_LABELS: Record<KanjiLevelSection, string> = {
  foundations: "Numbers & time",
  people: "People & everyday actions",
  world: "Places & descriptions",
  everyday: "Everyday life — toward N4",
  review: "Grand review",
};

export const KANJI_SECTIONS: KanjiLevelSection[] = [
  "foundations",
  "people",
  "world",
  "everyday",
  "review",
];
