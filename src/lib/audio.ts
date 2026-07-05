/**
 * Kana sound playback: a bundled recording where we have one, falling back
 * to speech synthesis for the yōon combinations that aren't recorded (see
 * `~/data/kana-audio.ts`).
 */
import { kanaAudioSources } from "~/data/kana-audio";
import { findJapaneseVoice, speakJapanese } from "./speech";

/** Whether kana `id` can be played back at all on this device. */
export const kanaSoundAvailable = async (id: string): Promise<boolean> =>
  kanaAudioSources(id) !== null || (await findJapaneseVoice()) !== null;

/** Held so a new play() call can interrupt whatever's still playing. */
let currentAudio: HTMLAudioElement | null = null;

/** Prefer ogg (smaller) where the browser supports it, else mp3. */
const pickAudioUrl = (sources: { mp3: string; ogg: string }): string => {
  const probe = new Audio();
  return probe.canPlayType("audio/ogg") ? sources.ogg : sources.mp3;
};

/** Play the sound for kana `id`. Resolves when playback finishes or fails. */
export const playKanaSound = async (
  id: string,
  text: string,
): Promise<void> => {
  const sources = kanaAudioSources(id);
  if (!sources) return speakJapanese(text);
  currentAudio?.pause();
  const audio = new Audio(pickAudioUrl(sources));
  currentAudio = audio;
  await new Promise<void>((resolve) => {
    const finish = () => resolve();
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    audio.play().catch(finish);
  });
};
