/**
 * Recorded pronunciation for each kana, keyed by canonical (hiragana) id.
 * Covers the 46 base gojūon + 25 dakuten/handakuten sounds; yōon
 * combinations (きゃ, しゃ, …) have no entry — see `~/lib/audio.ts` for the
 * speech-synthesis fallback used for those. じ/ぢ and ず/づ share a
 * recording since they're pronounced identically (yotsugana).
 */
export const KANA_AUDIO_FILE: Readonly<Record<string, string>> = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  を: "wo",
  ん: "n",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  だ: "da",
  ぢ: "ji",
  づ: "zu",
  で: "de",
  ど: "do",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
};

/** mp3/ogg pair for the recording of kana `id`, or null if there isn't one (yōon). */
export const kanaAudioSources = (
  id: string,
): { mp3: string; ogg: string } | null => {
  const file = KANA_AUDIO_FILE[id];
  if (!file) return null;
  return { mp3: `/audio/${file}.mp3`, ogg: `/audio/${file}.ogg` };
};
