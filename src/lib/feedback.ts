/**
 * Short synthesized chime/buzz for answer feedback, generated with the Web
 * Audio API rather than shipped as audio files. Respects the same sound
 * setting as spoken exercises, so muting one mutes both.
 */
import { soundEnabled } from "./settings";

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  const Ctx = window.AudioContext;
  if (!Ctx) return null;
  audioCtx ??= new Ctx();
  return audioCtx;
};

const playTone = (
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
): void => {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.15, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
};

/** Play a short chime (correct) or buzz (incorrect), unless sound is off. */
export const playAnswerFeedback = (correct: boolean): void => {
  if (!soundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (correct) {
    playTone(ctx, 880, now, 0.12);
    playTone(ctx, 1318.5, now + 0.1, 0.15);
  } else {
    playTone(ctx, 220, now, 0.22);
  }
};
