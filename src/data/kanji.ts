/**
 * The 80 kanji of the classic JLPT N5 list plus a second tier of everyday
 * kanji (toward N4), with the vocabulary used to drill their readings.
 * Unlike kana, a kanji in isolation has no single correct reading — so
 * meaning questions test the bare character, while reading questions
 * always test a whole word.
 */

/** The two separately-tracked skills for a kanji. */
export type KanjiFacet = "meaning" | "reading";

export interface Kanji {
  /** Canonical id: the character itself. */
  id: string;
  /** Primary English gloss — used for answer options and matching. */
  meaning: string;
  /** On'yomi, in katakana by convention. */
  on: string[];
  /** Kun'yomi, in hiragana; okurigana shown in brackets, e.g. "い(く)". */
  kun: string[];
}

export interface KanjiWord {
  /** Canonical id: the written form, e.g. "学校". */
  id: string;
  /** Reading in hiragana — also what speech synthesis is given to speak. */
  reading: string;
  meaning: string;
  /** Kanji from the study set that appear in this word. */
  kanjiIds: string[];
}

/** Rows given as [character, gloss, on'yomi (space-sep), kun'yomi]. */
const KANJI_ROWS: [string, string, string, string][] = [
  // Numbers
  ["一", "one", "イチ", "ひと(つ)"],
  ["二", "two", "ニ", "ふた(つ)"],
  ["三", "three", "サン", "みっ(つ)"],
  ["四", "four", "シ", "よん よ(っつ)"],
  ["五", "five", "ゴ", "いつ(つ)"],
  ["六", "six", "ロク", "むっ(つ)"],
  ["七", "seven", "シチ", "なな"],
  ["八", "eight", "ハチ", "やっ(つ)"],
  ["九", "nine", "キュウ ク", "ここの(つ)"],
  ["十", "ten", "ジュウ", "とお"],
  ["百", "hundred", "ヒャク", ""],
  ["千", "thousand", "セン", "ち"],
  ["万", "ten thousand", "マン", ""],
  ["円", "yen; circle", "エン", "まる(い)"],
  ["半", "half", "ハン", "なか(ば)"],
  // Days & time
  ["日", "day; sun", "ニチ ジツ", "ひ か"],
  ["月", "month; moon", "ゲツ ガツ", "つき"],
  ["火", "fire", "カ", "ひ"],
  ["水", "water", "スイ", "みず"],
  ["木", "tree; wood", "モク ボク", "き"],
  ["金", "gold; money", "キン", "かね"],
  ["土", "earth; soil", "ド", "つち"],
  ["年", "year", "ネン", "とし"],
  ["時", "time; hour", "ジ", "とき"],
  ["分", "minute; part", "フン ブン", "わ(ける)"],
  ["間", "interval; between", "カン", "あいだ"],
  ["午", "noon", "ゴ", ""],
  ["今", "now", "コン", "いま"],
  ["毎", "every", "マイ", ""],
  ["前", "before; front", "ゼン", "まえ"],
  ["後", "after; behind", "ゴ", "あと うし(ろ)"],
  ["何", "what", "カ", "なに なん"],
  // People
  ["人", "person", "ジン ニン", "ひと"],
  ["男", "man", "ダン", "おとこ"],
  ["女", "woman", "ジョ", "おんな"],
  ["子", "child", "シ", "こ"],
  ["父", "father", "フ", "ちち"],
  ["母", "mother", "ボ", "はは"],
  ["友", "friend", "ユウ", "とも"],
  // School
  ["学", "study; learning", "ガク", "まな(ぶ)"],
  ["校", "school", "コウ", ""],
  ["先", "ahead; previous", "セン", "さき"],
  ["生", "life; birth", "セイ", "い(きる) う(まれる)"],
  ["本", "book; origin", "ホン", "もと"],
  ["名", "name", "メイ", "な"],
  // Verbs
  ["行", "go", "コウ", "い(く)"],
  ["来", "come", "ライ", "く(る)"],
  ["出", "exit; go out", "シュツ", "で(る)"],
  ["入", "enter", "ニュウ", "はい(る)"],
  ["見", "see; look", "ケン", "み(る)"],
  ["話", "speak; talk", "ワ", "はな(す)"],
  ["聞", "hear; ask", "ブン", "き(く)"],
  ["読", "read", "ドク", "よ(む)"],
  ["書", "write", "ショ", "か(く)"],
  ["食", "eat", "ショク", "た(べる)"],
  ["休", "rest", "キュウ", "やす(む)"],
  // Position & directions
  ["上", "up; above", "ジョウ", "うえ"],
  ["下", "down; below", "カ", "した"],
  ["中", "middle; inside", "チュウ", "なか"],
  ["外", "outside", "ガイ", "そと"],
  ["東", "east", "トウ", "ひがし"],
  ["西", "west", "セイ サイ", "にし"],
  ["南", "south", "ナン", "みなみ"],
  ["北", "north", "ホク", "きた"],
  ["右", "right", "ウ ユウ", "みぎ"],
  ["左", "left", "サ", "ひだり"],
  // Nature
  ["山", "mountain", "サン", "やま"],
  ["川", "river", "セン", "かわ"],
  // "heaven" alone, so it can't double up with 空 "sky; empty" in options.
  ["天", "heaven", "テン", ""],
  ["気", "spirit; energy", "キ ケ", ""],
  ["雨", "rain", "ウ", "あめ"],
  // Descriptions
  ["大", "big", "ダイ タイ", "おお(きい)"],
  ["小", "small", "ショウ", "ちい(さい)"],
  ["高", "tall; expensive", "コウ", "たか(い)"],
  ["長", "long", "チョウ", "なが(い)"],
  ["白", "white", "ハク", "しろ(い)"],
  // Country & travel
  ["国", "country", "コク", "くに"],
  ["語", "language", "ゴ", "かた(る)"],
  ["電", "electricity", "デン", ""],
  ["車", "car; vehicle", "シャ", "くるま"],
  // Everyday life — the second tier, toward N4.
  // Body & senses
  ["手", "hand", "シュ", "て"],
  ["足", "foot; leg", "ソク", "あし"],
  ["目", "eye", "モク", "め"],
  ["口", "mouth", "コウ", "くち"],
  ["耳", "ear", "ジ", "みみ"],
  ["頭", "head", "トウ", "あたま"],
  ["体", "body", "タイ", "からだ"],
  ["心", "heart; mind", "シン", "こころ"],
  // Think, make & use
  ["思", "think", "シ", "おも(う)"],
  ["知", "know", "チ", "し(る)"],
  ["住", "live; reside", "ジュウ", "す(む)"],
  ["待", "wait", "タイ", "ま(つ)"],
  ["持", "hold; carry", "ジ", "も(つ)"],
  ["使", "use", "シ", "つか(う)"],
  ["作", "make", "サク", "つく(る)"],
  ["送", "send", "ソウ", "おく(る)"],
  // Buy, sell & move
  ["帰", "return home", "キ", "かえ(る)"],
  ["買", "buy", "バイ", "か(う)"],
  ["売", "sell", "バイ", "う(る)"],
  ["教", "teach", "キョウ", "おし(える)"],
  ["立", "stand", "リツ", "た(つ)"],
  ["歩", "walk", "ホ", "ある(く)"],
  ["走", "run", "ソウ", "はし(る)"],
  ["起", "get up; wake", "キ", "お(きる)"],
  // Seasons & sky
  ["春", "spring", "シュン", "はる"],
  ["夏", "summer", "カ", "なつ"],
  ["秋", "autumn", "シュウ", "あき"],
  ["冬", "winter", "トウ", "ふゆ"],
  ["雪", "snow", "セツ", "ゆき"],
  ["風", "wind", "フウ", "かぜ"],
  ["空", "sky; empty", "クウ", "そら"],
  ["星", "star", "セイ", "ほし"],
  // Nature, animals & food
  ["花", "flower", "カ", "はな"],
  ["海", "sea", "カイ", "うみ"],
  ["犬", "dog", "ケン", "いぬ"],
  ["魚", "fish", "ギョ", "さかな"],
  ["鳥", "bird", "チョウ", "とり"],
  ["肉", "meat", "ニク", ""],
  ["茶", "tea", "チャ サ", ""],
  ["牛", "cow", "ギュウ", "うし"],
  // Colours & opposites
  ["新", "new", "シン", "あたら(しい)"],
  ["古", "old", "コ", "ふる(い)"],
  ["多", "many", "タ", "おお(い)"],
  ["少", "few; a little", "ショウ", "すく(ない) すこ(し)"],
  ["早", "early", "ソウ", "はや(い)"],
  ["青", "blue", "セイ", "あお(い)"],
  ["赤", "red", "セキ", "あか(い)"],
  ["黒", "black", "コク", "くろ(い)"],
  // Around town
  ["家", "house; home", "カ ケ", "いえ"],
  ["店", "shop", "テン", "みせ"],
  ["駅", "station", "エキ", ""],
  ["町", "town", "チョウ", "まち"],
  ["道", "road; way", "ドウ", "みち"],
  ["社", "company; shrine", "シャ", ""],
  ["会", "meet; society", "カイ", "あ(う)"],
  ["場", "place", "ジョウ", "ば"],
];

export const ALL_KANJI: Kanji[] = KANJI_ROWS.map(([id, meaning, on, kun]) => ({
  id,
  meaning,
  on: on ? on.split(" ") : [],
  kun: kun ? kun.split(" ") : [],
}));

export const KANJI_BY_ID: ReadonlyMap<string, Kanji> = new Map(
  ALL_KANJI.map((k) => [k.id, k]),
);

/** Rows given as [written form, hiragana reading, gloss]. */
const WORD_ROWS: [string, string, string][] = [
  ["一つ", "ひとつ", "one (thing)"],
  ["一人", "ひとり", "one person; alone"],
  ["二つ", "ふたつ", "two (things)"],
  ["二人", "ふたり", "two people"],
  ["三つ", "みっつ", "three (things)"],
  ["四つ", "よっつ", "four (things)"],
  ["五つ", "いつつ", "five (things)"],
  ["六つ", "むっつ", "six (things)"],
  ["七つ", "ななつ", "seven (things)"],
  ["八つ", "やっつ", "eight (things)"],
  ["九つ", "ここのつ", "nine (things)"],
  ["十時", "じゅうじ", "ten o'clock"],
  ["百円", "ひゃくえん", "one hundred yen"],
  ["三百", "さんびゃく", "three hundred"],
  ["千円", "せんえん", "one thousand yen"],
  ["一万円", "いちまんえん", "ten thousand yen"],
  ["半分", "はんぶん", "half"],
  ["日本", "にほん", "Japan"],
  ["今日", "きょう", "today"],
  ["毎日", "まいにち", "every day"],
  ["月", "つき", "the moon"],
  ["一月", "いちがつ", "January"],
  ["火", "ひ", "fire"],
  ["水", "みず", "water"],
  ["木", "き", "tree"],
  ["お金", "おかね", "money"],
  ["土", "つち", "soil; the ground"],
  ["今年", "ことし", "this year"],
  ["毎年", "まいとし", "every year"],
  ["時間", "じかん", "time (duration)"],
  ["何時", "なんじ", "what time"],
  ["五分", "ごふん", "five minutes"],
  ["人間", "にんげん", "human being"],
  ["午前", "ごぜん", "a.m."],
  ["午後", "ごご", "p.m."],
  ["今", "いま", "now"],
  ["名前", "なまえ", "name"],
  ["前", "まえ", "front; before"],
  ["後ろ", "うしろ", "behind"],
  ["何", "なに", "what"],
  ["人", "ひと", "person"],
  ["日本人", "にほんじん", "Japanese person"],
  ["男の子", "おとこのこ", "boy"],
  ["女の子", "おんなのこ", "girl"],
  ["子ども", "こども", "child"],
  ["父", "ちち", "(my) father"],
  ["お父さん", "おとうさん", "dad"],
  ["母", "はは", "(my) mother"],
  ["お母さん", "おかあさん", "mum"],
  ["友だち", "ともだち", "friend"],
  ["学生", "がくせい", "student"],
  ["大学", "だいがく", "university"],
  ["学校", "がっこう", "school"],
  ["先生", "せんせい", "teacher"],
  ["先月", "せんげつ", "last month"],
  ["本", "ほん", "book"],
  ["日本語", "にほんご", "Japanese (language)"],
  ["行く", "いく", "to go"],
  ["来る", "くる", "to come"],
  ["来年", "らいねん", "next year"],
  ["出る", "でる", "to leave; to go out"],
  ["入る", "はいる", "to enter"],
  ["見る", "みる", "to see"],
  ["話す", "はなす", "to speak"],
  ["電話", "でんわ", "telephone"],
  ["聞く", "きく", "to listen; to ask"],
  ["読む", "よむ", "to read"],
  ["書く", "かく", "to write"],
  ["食べる", "たべる", "to eat"],
  ["休む", "やすむ", "to rest"],
  ["休み", "やすみ", "day off; break"],
  ["上", "うえ", "top; above"],
  ["下", "した", "bottom; below"],
  ["中", "なか", "inside"],
  ["中国", "ちゅうごく", "China"],
  ["外", "そと", "outside"],
  ["外国", "がいこく", "foreign country"],
  ["東", "ひがし", "east"],
  ["東京", "とうきょう", "Tokyo"],
  ["西", "にし", "west"],
  ["南", "みなみ", "south"],
  ["北", "きた", "north"],
  ["右", "みぎ", "right"],
  ["左", "ひだり", "left"],
  ["山", "やま", "mountain"],
  ["川", "かわ", "river"],
  ["天気", "てんき", "weather"],
  ["電気", "でんき", "electricity; light"],
  ["雨", "あめ", "rain"],
  ["大きい", "おおきい", "big"],
  ["小さい", "ちいさい", "small"],
  ["高い", "たかい", "tall; expensive"],
  ["長い", "ながい", "long"],
  ["白い", "しろい", "white"],
  ["国", "くに", "country"],
  ["電車", "でんしゃ", "train"],
  ["車", "くるま", "car"],
  // Everyday life — vocabulary for the second tier.
  ["手", "て", "hand"],
  ["足", "あし", "foot; leg"],
  ["目", "め", "eye"],
  ["入口", "いりぐち", "entrance"],
  ["出口", "でぐち", "exit"],
  ["耳", "みみ", "ear"],
  ["頭", "あたま", "head"],
  ["体", "からだ", "body"],
  ["心", "こころ", "heart; mind"],
  ["思う", "おもう", "to think"],
  ["知る", "しる", "to know"],
  ["住む", "すむ", "to live (somewhere)"],
  ["待つ", "まつ", "to wait"],
  ["持つ", "もつ", "to hold; to carry"],
  ["使う", "つかう", "to use"],
  ["作る", "つくる", "to make"],
  ["送る", "おくる", "to send"],
  ["帰る", "かえる", "to go home"],
  ["買う", "かう", "to buy"],
  ["買い物", "かいもの", "shopping"],
  ["売る", "うる", "to sell"],
  ["売店", "ばいてん", "kiosk; stand"],
  ["教える", "おしえる", "to teach"],
  ["立つ", "たつ", "to stand"],
  ["歩く", "あるく", "to walk"],
  ["走る", "はしる", "to run"],
  ["起きる", "おきる", "to get up"],
  ["春", "はる", "spring"],
  ["夏", "なつ", "summer"],
  ["秋", "あき", "autumn"],
  ["冬", "ふゆ", "winter"],
  ["雪", "ゆき", "snow"],
  ["風", "かぜ", "wind"],
  ["空", "そら", "sky"],
  ["空気", "くうき", "air"],
  ["星", "ほし", "star"],
  ["花", "はな", "flower"],
  ["花火", "はなび", "fireworks"],
  ["海", "うみ", "sea"],
  ["北海道", "ほっかいどう", "Hokkaido"],
  ["犬", "いぬ", "dog"],
  ["魚", "さかな", "fish"],
  ["鳥", "とり", "bird"],
  ["小鳥", "ことり", "small bird"],
  ["肉", "にく", "meat"],
  ["牛肉", "ぎゅうにく", "beef"],
  ["お茶", "おちゃ", "green tea"],
  ["新しい", "あたらしい", "new"],
  ["新聞", "しんぶん", "newspaper"],
  ["古い", "ふるい", "old (things)"],
  ["多い", "おおい", "many"],
  ["少し", "すこし", "a little"],
  ["早い", "はやい", "early"],
  ["青い", "あおい", "blue"],
  ["赤い", "あかい", "red"],
  ["黒い", "くろい", "black"],
  ["家", "いえ", "house"],
  ["店", "みせ", "shop"],
  ["駅", "えき", "station"],
  ["町", "まち", "town"],
  ["道", "みち", "road; way"],
  ["会う", "あう", "to meet"],
  ["会社", "かいしゃ", "company"],
  ["会場", "かいじょう", "venue"],
];

export const ALL_WORDS: KanjiWord[] = WORD_ROWS.map(
  ([id, reading, meaning]) => ({
    id,
    reading,
    meaning,
    kanjiIds: [...id].filter((ch) => KANJI_BY_ID.has(ch)),
  }),
);

export const WORD_BY_ID: ReadonlyMap<string, KanjiWord> = new Map(
  ALL_WORDS.map((w) => [w.id, w]),
);

const WORDS_FOR_KANJI: Map<string, KanjiWord[]> = new Map();
for (const word of ALL_WORDS) {
  for (const id of word.kanjiIds) {
    const list = WORDS_FOR_KANJI.get(id) ?? [];
    list.push(word);
    WORDS_FOR_KANJI.set(id, list);
  }
}

/** Words from the vocabulary that contain kanji `id`. Every kanji has one. */
export const wordsForKanji = (id: string): KanjiWord[] =>
  WORDS_FOR_KANJI.get(id) ?? [];

/**
 * Visually confusable kanji — the mix-ups beginners actually make
 * (人/入, 木/本/休, 日/白/百 …), used to pick sharp wrong answers.
 */
const KANJI_CONFUSION: string[][] = [
  ["一", "二", "三"],
  ["人", "入"],
  ["木", "本", "休"],
  ["日", "白", "百"],
  ["千", "十", "土"],
  ["大", "天"],
  ["右", "左"],
  ["間", "聞"],
  ["語", "話", "読"],
  ["午", "半"],
  ["母", "毎"],
  ["名", "外"],
  ["車", "東"],
  ["西", "四"],
  ["金", "今"],
  ["円", "月"],
  ["電", "雨"],
  ["出", "山"],
  ["上", "下"],
  ["犬", "大", "天"],
  ["牛", "午", "半"],
  ["会", "今", "金"],
  ["待", "持"],
  ["少", "小"],
  ["多", "名"],
  ["体", "休"],
  ["歩", "走", "足"],
  ["思", "男"],
  ["買", "見"],
  ["雪", "電", "雨"],
  ["早", "春", "星"],
  ["古", "口"],
];

const CONFUSION: Map<string, Set<string>> = new Map();
for (const group of KANJI_CONFUSION) {
  for (const id of group) {
    const set = CONFUSION.get(id) ?? new Set<string>();
    for (const other of group) if (other !== id) set.add(other);
    CONFUSION.set(id, set);
  }
}

/** Ids of kanji visually confusable with `id`. */
export const confusableKanjiIds = (id: string): string[] => [
  ...(CONFUSION.get(id) ?? []),
];

/** Every kanji with at least one visual confusable — the pool for the
 * "look-alikes" drill (人/入, 木/本/休, 日/白/百, etc.). */
export const confusableKanjiPool = (): string[] => [...CONFUSION.keys()];

/** Readings joined for display, e.g. "スイ · みず". */
export const readingsLabel = (kanji: Kanji): string =>
  [...kanji.on, ...kanji.kun].join(" · ");
