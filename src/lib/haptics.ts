/** Tiny wrapper around the Vibration API, guarded for devices without it. */

const canVibrate = (): boolean =>
  typeof navigator !== "undefined" && "vibrate" in navigator;

/** Vibrate briefly for answer feedback: a quick tap for correct, a firmer double-buzz for incorrect. */
export const vibrateAnswerFeedback = (correct: boolean): void => {
  if (!canVibrate()) return;
  navigator.vibrate(correct ? 15 : [40, 60, 40]);
};
