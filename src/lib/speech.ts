/**
 * Speech synthesis helpers. A Japanese voice is not guaranteed on every
 * device, and the voice list loads asynchronously — so callers must await
 * `findJapaneseVoice()` and hide sound exercises when it resolves null.
 *
 * IMPORTANT: never hold on to a SpeechSynthesisVoice object. Chrome
 * invalidates existing voice objects whenever `voiceschanged` fires again
 * (the list fills in over several ticks), and speaking with a stale one
 * fails silently. Only the list's readiness is cached; the voice itself
 * is looked up fresh for every utterance.
 */

let voicesLoaded: Promise<void> | undefined;

const waitForVoices = (): Promise<void> => {
  if (voicesLoaded) return voicesLoaded;
  if (
    !("speechSynthesis" in window) ||
    window.speechSynthesis.getVoices().length
  ) {
    voicesLoaded = Promise.resolve();
    return voicesLoaded;
  }
  // Voice list not loaded yet — wait for voiceschanged, with a timeout.
  voicesLoaded = new Promise((resolve) => {
    const settle = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", settle);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(settle, 1500);
    window.speechSynthesis.addEventListener("voiceschanged", settle);
  });
  return voicesLoaded;
};

const pickJapanese = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const japanese = voices.filter((v) => v.lang.toLowerCase().startsWith("ja"));
  // Known-good voices first (Apple ships novelty voices like "Grandpa"
  // that alphabetically outrank Kyoko), then local ones for offline use.
  const rank = (v: SpeechSynthesisVoice) =>
    (/kyoko|google|o-?ren|otoya/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0);
  return japanese.sort((a, b) => rank(b) - rank(a))[0] ?? null;
};

export const findJapaneseVoice =
  async (): Promise<SpeechSynthesisVoice | null> => {
    if (!("speechSynthesis" in window)) return null;
    await waitForVoices();
    return pickJapanese();
  };

/** Held so Chrome can't garbage-collect it before its events fire. */
let currentUtterance: SpeechSynthesisUtterance | null = null;

/** Speak Japanese text aloud. Resolves when playback finishes or fails. */
export const speakJapanese = async (text: string): Promise<void> => {
  const voice = await findJapaneseVoice();
  if (!voice) return;
  const synth = window.speechSynthesis;
  // Chrome wedges permanently if speak() lands in the same tick as
  // cancel() — give the queue a moment to actually clear.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    await new Promise((r) => setTimeout(r, 100));
  }
  // It can also get stuck in a paused state that mutes everything.
  synth.resume();
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.8;
  await new Promise<void>((resolve) => {
    const finish = () => {
      if (currentUtterance === utterance) currentUtterance = null;
      resolve();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    // Chrome sometimes drops end events entirely — never hang the caller.
    setTimeout(finish, 5000);
    synth.speak(utterance);
  });
};
