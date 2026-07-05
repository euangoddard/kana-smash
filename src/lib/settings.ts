/** Client-only user settings, stored alongside progress in localStorage. */

export const SOUND_SETTING_KEY = "kana-smash:settings:sound";

export const soundEnabled = (): boolean =>
  localStorage.getItem(SOUND_SETTING_KEY) !== "off";

export const setSoundEnabled = (on: boolean): void => {
  localStorage.setItem(SOUND_SETTING_KEY, on ? "on" : "off");
};
