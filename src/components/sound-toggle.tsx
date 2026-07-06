import { component$, type QRL } from "@builder.io/qwik";

interface SoundToggleProps {
  on: boolean;
  onToggle$: QRL<() => void>;
}

/** Switch for whether listening (sound-to-kana) questions are included. */
export const SoundToggle = component$<SoundToggleProps>(({ on, onToggle$ }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick$={onToggle$}
    class="card-link text-ink-soft min-h-12 gap-2 px-3 py-2 text-sm font-medium"
  >
    <span aria-hidden="true">{on ? "🔊" : "🔇"}</span>
    Listening questions
    <span class="text-ink font-semibold">{on ? "on" : "off"}</span>
  </button>
));
