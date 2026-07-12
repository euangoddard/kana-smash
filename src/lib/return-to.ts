/**
 * Where to send the learner when a session ends. Pages that link into a
 * quiz from somewhere other than the level list (the review hub, the
 * progress page) tag the link with ?from=…; the quiz reads it client-side
 * and points its Quit link and results actions back there.
 */

export interface ReturnTarget {
  href: string;
  label: string;
}

/**
 * Read the ?from= tag off the current browser URL. Client-only — call it
 * from a visible task or event handler. `progressScript` picks which tab
 * the progress page opens on ("hiragana" | "katakana" | "kanji").
 */
export const returnTargetFromLocation = (
  progressScript: string,
): ReturnTarget | null => {
  const from = new URLSearchParams(window.location.search).get("from");
  if (from === "review") {
    return { href: "/review/", label: "Back to review" };
  }
  if (from === "progress") {
    return {
      href: `/progress/?script=${progressScript}`,
      label: "Back to progress",
    };
  }
  return null;
};
