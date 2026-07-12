import { KANA_BY_ID, type Script } from "./kana";

/**
 * Kana vocabulary for word-level reading practice: real words written
 * entirely in one script, drilled after single characters are familiar.
 * Romaji is spelled kana-by-kana (がっこう → "gakkou", コーヒー → "koohii")
 * so the right answer is exactly what the learner sounds out.
 */

export interface StudyWord {
  /** Canonical id: the written form, e.g. "ねこ" or "コーヒー". */
  id: string;
  romaji: string;
  meaning: string;
  /** Which script this word is drilled in. */
  script: Script;
  /** Canonical kana ids the word exercises — progress is recorded per kana. */
  kanaIds: string[];
}

export interface WordLevel {
  id: string;
  title: string;
  script: Script;
  wordIds: string[];
  /** Sample word shown on the level card. */
  sample: string;
}

const SMALL_VOWELS = new Set([..."ぁぃぅぇぉァィゥェォ"]);
const SMALL_Y = new Set([..."ゃゅょャュョ"]);

/** Katakana char → its hiragana counterpart (the canonical kana id). */
const toHiragana = (ch: string): string => {
  const code = ch.codePointAt(0)!;
  return code >= 0x30a1 && code <= 0x30f6
    ? String.fromCodePoint(code - 0x60)
    : ch;
};

/**
 * Canonical kana ids exercised by a written word. Yōon pairs (きゃ, シャ)
 * count as their combination kana; the sokoun (っ), long-vowel mark (ー)
 * and small vowels (the ィ in ティ) modify sounds rather than being kana
 * of their own, so they're skipped.
 */
export const kanaIdsInWord = (written: string): string[] => {
  const chars = [...written];
  const ids: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const base = toHiragana(chars[i]);
    const next = i + 1 < chars.length ? toHiragana(chars[i + 1]) : "";
    if (SMALL_Y.has(chars[i + 1] ?? "") && KANA_BY_ID.has(base + next)) {
      ids.push(base + next);
      i++;
      continue;
    }
    if (SMALL_VOWELS.has(chars[i]) || SMALL_Y.has(chars[i])) continue;
    if (KANA_BY_ID.has(base)) ids.push(base);
  }
  return [...new Set(ids)];
};

/** Rows given as [written form, romaji, meaning]. */
type WordRow = [string, string, string];

const HIRAGANA_WORDS: WordRow[] = [
  // Animals & nature
  ["ねこ", "neko", "cat"],
  ["いぬ", "inu", "dog"],
  ["やま", "yama", "mountain"],
  ["かわ", "kawa", "river"],
  ["そら", "sora", "sky"],
  ["あめ", "ame", "rain"],
  ["はな", "hana", "flower"],
  ["うみ", "umi", "sea"],
  // Food & drink
  ["すし", "sushi", "sushi"],
  ["ごはん", "gohan", "rice; a meal"],
  ["みず", "mizu", "water"],
  ["おちゃ", "ocha", "green tea"],
  ["たまご", "tamago", "egg"],
  ["にく", "niku", "meat"],
  ["さかな", "sakana", "fish"],
  ["くだもの", "kudamono", "fruit"],
  // Everyday things
  ["ほん", "hon", "book"],
  ["くつ", "kutsu", "shoes"],
  ["かさ", "kasa", "umbrella"],
  ["かばん", "kaban", "bag"],
  ["つくえ", "tsukue", "desk"],
  ["いす", "isu", "chair"],
  ["とけい", "tokei", "clock; watch"],
  ["めがね", "megane", "glasses"],
  // People & places
  ["ともだち", "tomodachi", "friend"],
  ["せんせい", "sensei", "teacher"],
  ["がっこう", "gakkou", "school"],
  ["えき", "eki", "station"],
  ["みせ", "mise", "shop"],
  ["まち", "machi", "town"],
  ["いえ", "ie", "house"],
  ["こども", "kodomo", "child"],
  // Tricky sounds — yōon, sokuon and long vowels in the wild
  ["きょう", "kyou", "today"],
  ["りょこう", "ryokou", "trip; travel"],
  ["でんしゃ", "densha", "train"],
  ["しゃしん", "shashin", "photograph"],
  ["ぎゅうにゅう", "gyuunyuu", "milk"],
  ["きって", "kitte", "postage stamp"],
  ["ざっし", "zasshi", "magazine"],
  ["びょういん", "byouin", "hospital"],
];

const KATAKANA_WORDS: WordRow[] = [
  // Food & drink
  ["コーヒー", "koohii", "coffee"],
  ["ピザ", "piza", "pizza"],
  ["パン", "pan", "bread"],
  ["ケーキ", "keeki", "cake"],
  ["ジュース", "juusu", "juice"],
  ["チーズ", "chiizu", "cheese"],
  ["アイス", "aisu", "ice cream"],
  ["バナナ", "banana", "banana"],
  // Around town
  ["タクシー", "takushii", "taxi"],
  ["バス", "basu", "bus"],
  ["ホテル", "hoteru", "hotel"],
  ["デパート", "depaato", "department store"],
  ["レストラン", "resutoran", "restaurant"],
  ["カメラ", "kamera", "camera"],
  ["テレビ", "terebi", "TV"],
  ["コンビニ", "konbini", "convenience store"],
  // Home & fun
  ["ゲーム", "geemu", "game"],
  ["サッカー", "sakkaa", "football"],
  ["ピアノ", "piano", "piano"],
  ["ペン", "pen", "pen"],
  ["ノート", "nooto", "notebook"],
  ["ベッド", "beddo", "bed"],
  ["シャワー", "shawaa", "shower"],
  ["プール", "puuru", "swimming pool"],
  // World words
  ["アメリカ", "amerika", "America"],
  ["イギリス", "igirisu", "Britain"],
  ["フランス", "furansu", "France"],
  ["スペイン", "supein", "Spain"],
  ["カナダ", "kanada", "Canada"],
  ["クラス", "kurasu", "class"],
  ["ニュース", "nyuusu", "news"],
  ["パーティー", "paatii", "party"],
];

const buildWords = (rows: WordRow[], script: Script): StudyWord[] =>
  rows.map(([id, romaji, meaning]) => ({
    id,
    romaji,
    meaning,
    script,
    kanaIds: kanaIdsInWord(id),
  }));

export const ALL_WORDS_KANA: StudyWord[] = [
  ...buildWords(HIRAGANA_WORDS, "hiragana"),
  ...buildWords(KATAKANA_WORDS, "katakana"),
];

export const STUDY_WORD_BY_ID: ReadonlyMap<string, StudyWord> = new Map(
  ALL_WORDS_KANA.map((w) => [w.id, w]),
);

export const wordsForScript = (script: Script): StudyWord[] =>
  ALL_WORDS_KANA.filter((w) => w.script === script);

const wordLevel = (
  id: string,
  title: string,
  script: Script,
  wordIds: string[],
): WordLevel => ({ id, title, script, wordIds, sample: wordIds[0] });

const slice = (rows: WordRow[], from: number): string[] =>
  rows.slice(from, from + 8).map(([id]) => id);

export const WORD_LEVELS: WordLevel[] = [
  wordLevel(
    "animals-nature",
    "Animals & nature",
    "hiragana",
    slice(HIRAGANA_WORDS, 0),
  ),
  wordLevel("food-drink", "Food & drink", "hiragana", slice(HIRAGANA_WORDS, 8)),
  wordLevel(
    "everyday-things",
    "Everyday things",
    "hiragana",
    slice(HIRAGANA_WORDS, 16),
  ),
  wordLevel(
    "people-places",
    "People & places",
    "hiragana",
    slice(HIRAGANA_WORDS, 24),
  ),
  wordLevel(
    "tricky-sounds",
    "Tricky sounds",
    "hiragana",
    slice(HIRAGANA_WORDS, 32),
  ),
  wordLevel("food-drink", "Food & drink", "katakana", slice(KATAKANA_WORDS, 0)),
  wordLevel("around-town", "Around town", "katakana", slice(KATAKANA_WORDS, 8)),
  wordLevel("home-fun", "Home & fun", "katakana", slice(KATAKANA_WORDS, 16)),
  wordLevel(
    "world-words",
    "World words",
    "katakana",
    slice(KATAKANA_WORDS, 24),
  ),
];

export const wordLevelsForScript = (script: Script): WordLevel[] =>
  WORD_LEVELS.filter((l) => l.script === script);

export const wordLevelById = (
  script: Script,
  levelId: string,
): WordLevel | undefined =>
  WORD_LEVELS.find((l) => l.script === script && l.id === levelId);

/** The word level after `levelId` within the same script, if any. */
export const nextWordLevel = (
  script: Script,
  levelId: string,
): WordLevel | undefined => {
  const levels = wordLevelsForScript(script);
  const index = levels.findIndex((l) => l.id === levelId);
  return index === -1 ? undefined : levels[index + 1];
};
