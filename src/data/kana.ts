export type Script = "hiragana" | "katakana";

export type KanaGroup = "basic" | "dakuten" | "yoon";

export interface Kana {
  /** Canonical id: the hiragana form. */
  id: string;
  hiragana: string;
  katakana: string;
  romaji: string;
  /** Alternative romanisation shown as a hint, e.g. ぢ → "di". */
  altRomaji?: string;
  /** Row id, e.g. "k" for か‑row, "ky" for きゃ‑row. */
  row: string;
  /** Vowel column: a, i, u, e, o (ん is "n"). */
  vowel: string;
  group: KanaGroup;
}

/** Hiragana → katakana via the fixed Unicode block offset (U+3041→U+30A1). */
const toKatakana = (hiragana: string): string =>
  [...hiragana]
    .map((ch) => String.fromCodePoint(ch.codePointAt(0)! + 0x60))
    .join("");

const VOWELS = ["a", "i", "u", "e", "o"] as const;

/** Rows given as [rowId, group, five romaji (null = gap), five hiragana]. */
const ROWS: [string, KanaGroup, (string | null)[], string][] = [
  ["vowel", "basic", ["a", "i", "u", "e", "o"], "あいうえお"],
  ["k", "basic", ["ka", "ki", "ku", "ke", "ko"], "かきくけこ"],
  ["s", "basic", ["sa", "shi", "su", "se", "so"], "さしすせそ"],
  ["t", "basic", ["ta", "chi", "tsu", "te", "to"], "たちつてと"],
  ["n", "basic", ["na", "ni", "nu", "ne", "no"], "なにぬねの"],
  ["h", "basic", ["ha", "hi", "fu", "he", "ho"], "はひふへほ"],
  ["m", "basic", ["ma", "mi", "mu", "me", "mo"], "まみむめも"],
  ["y", "basic", ["ya", null, "yu", null, "yo"], "や ゆ よ"],
  ["r", "basic", ["ra", "ri", "ru", "re", "ro"], "らりるれろ"],
  ["w", "basic", ["wa", null, null, null, "wo"], "わ   を"],
  ["g", "dakuten", ["ga", "gi", "gu", "ge", "go"], "がぎぐげご"],
  ["z", "dakuten", ["za", "ji", "zu", "ze", "zo"], "ざじずぜぞ"],
  ["d", "dakuten", ["da", "ji", "zu", "de", "do"], "だぢづでど"],
  ["b", "dakuten", ["ba", "bi", "bu", "be", "bo"], "ばびぶべぼ"],
  ["p", "dakuten", ["pa", "pi", "pu", "pe", "po"], "ぱぴぷぺぽ"],
];

/** Yōon rows: [rowId, romaji ya/yu/yo, base hiragana]. */
const YOON_ROWS: [string, [string, string, string], string][] = [
  ["ky", ["kya", "kyu", "kyo"], "き"],
  ["sh", ["sha", "shu", "sho"], "し"],
  ["ch", ["cha", "chu", "cho"], "ち"],
  ["ny", ["nya", "nyu", "nyo"], "に"],
  ["hy", ["hya", "hyu", "hyo"], "ひ"],
  ["my", ["mya", "myu", "myo"], "み"],
  ["ry", ["rya", "ryu", "ryo"], "り"],
  ["gy", ["gya", "gyu", "gyo"], "ぎ"],
  ["j", ["ja", "ju", "jo"], "じ"],
  ["by", ["bya", "byu", "byo"], "び"],
  ["py", ["pya", "pyu", "pyo"], "ぴ"],
];

/** Non-Hepburn spellings learners also meet (shown as hints, never answers). */
const ALT_ROMAJI: Record<string, string> = {
  し: "si",
  ち: "ti",
  つ: "tu",
  ふ: "hu",
  ぢ: "di",
  づ: "du",
  を: "o",
};

const buildKana = (): Kana[] => {
  const list: Kana[] = [];
  for (const [row, group, romajis, chars] of ROWS) {
    [...chars].forEach((ch, i) => {
      const romaji = romajis[i];
      if (ch === " " || !romaji) return;
      list.push({
        id: ch,
        hiragana: ch,
        katakana: toKatakana(ch),
        romaji,
        altRomaji: ALT_ROMAJI[ch],
        row,
        vowel: VOWELS[i],
        group,
      });
    });
  }
  list.push({
    id: "ん",
    hiragana: "ん",
    katakana: "ン",
    romaji: "n",
    row: "w",
    vowel: "n",
    group: "basic",
  });
  for (const [row, romajis, base] of YOON_ROWS) {
    (["ゃ", "ゅ", "ょ"] as const).forEach((small, i) => {
      const ch = base + small;
      list.push({
        id: ch,
        hiragana: ch,
        katakana: toKatakana(ch),
        romaji: romajis[i],
        row,
        vowel: ["a", "u", "o"][i],
        group: "yoon",
      });
    });
  }
  return list;
};

export const ALL_KANA: Kana[] = buildKana();

export const KANA_BY_ID: ReadonlyMap<string, Kana> = new Map(
  ALL_KANA.map((k) => [k.id, k]),
);

/**
 * Visually confusable characters, per script. These make wrong answers
 * target real mix-ups (シ/ツ, ソ/ン, は/ほ …) instead of random noise.
 * Groups list characters of that script; ids stay canonical (hiragana).
 */
const HIRAGANA_CONFUSION: string[][] = [
  ["ぬ", "め", "の"],
  ["ね", "れ", "わ"],
  ["は", "ほ", "ま"],
  ["さ", "き", "ち"],
  ["る", "ろ"],
  ["う", "つ", "ら"],
  ["く", "へ"],
  ["あ", "お", "む"],
  ["い", "り"],
  ["こ", "に"],
  ["た", "な"],
  ["す", "お"],
  ["せ", "さ"],
  ["ば", "ぱ"],
  ["び", "ぴ"],
  ["ぶ", "ぷ"],
  ["べ", "ぺ"],
  ["ぼ", "ぽ"],
  ["こ", "て"],
  ["ま", "も", "よ"],
];

const KATAKANA_CONFUSION: string[][] = [
  ["シ", "ツ", "ソ", "ン"],
  ["ク", "ワ", "フ", "ウ", "ヲ", "ラ"],
  ["ク", "タ", "ケ"],
  ["コ", "ユ", "ヨ", "ロ"],
  ["チ", "テ"],
  ["ス", "ヌ", "メ"],
  ["ナ", "メ", "オ"],
  ["ル", "レ"],
  ["ア", "マ", "ム"],
  ["カ", "ガ", "セ"],
  ["ハ", "バ", "パ"],
  ["ヒ", "ビ", "ピ"],
  ["フ", "ヘ", "レ"],
  ["ヒ", "ユ"],
  ["ヤ", "セ"],
];

const katakanaToId = (ch: string): string =>
  [...ch].map((c) => String.fromCodePoint(c.codePointAt(0)! - 0x60)).join("");

const buildConfusionMap = (
  groups: string[][],
  normalise: (ch: string) => string,
): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  for (const group of groups) {
    const ids = group.map(normalise).filter((id) => KANA_BY_ID.has(id));
    for (const id of ids) {
      const set = map.get(id) ?? new Set<string>();
      for (const other of ids) if (other !== id) set.add(other);
      map.set(id, set);
    }
  }
  return map;
};

const CONFUSION: Record<Script, Map<string, Set<string>>> = {
  hiragana: buildConfusionMap(HIRAGANA_CONFUSION, (ch) => ch),
  katakana: buildConfusionMap(KATAKANA_CONFUSION, katakanaToId),
};

/** Ids of kana visually confusable with `id` when shown in `script`. */
export const confusableIds = (id: string, script: Script): string[] => [
  ...(CONFUSION[script].get(id) ?? []),
];

/** Every kana in `script` that has at least one visual confusable — the
 * pool for the "look-alikes" drill (シ/ツ/ソ/ン, は/ほ, etc.). */
export const confusableKanaPool = (script: Script): string[] => [
  ...CONFUSION[script].keys(),
];

export const displayKana = (kana: Kana, script: Script): string =>
  script === "hiragana" ? kana.hiragana : kana.katakana;

export const SCRIPTS: Script[] = ["hiragana", "katakana"];

export const SCRIPT_LABELS: Record<Script, { en: string; ja: string }> = {
  hiragana: { en: "Hiragana", ja: "ひらがな" },
  katakana: { en: "Katakana", ja: "カタカナ" },
};

export const isScript = (value: string): value is Script =>
  value === "hiragana" || value === "katakana";
