import { $, component$, useSignal, useStore } from "@builder.io/qwik";
import { useVisibleTask$ } from "@builder.io/qwik";
import {
  DEFAULT_TIMES,
  loadReminders,
  reminderSupport,
  saveReminders,
  type ReminderConfig,
  type ReminderSlot,
} from "~/lib/reminders";

const SLOTS: { slot: ReminderSlot; label: string; kanji: string }[] = [
  { slot: "morning", label: "Morning", kanji: "朝" },
  { slot: "evening", label: "Evening", kanji: "夜" },
];

/**
 * Daily practice reminder settings. Renders nothing unless the app is
 * running as an installed PWA in a browser that supports push
 * notifications — a pure progressive enhancement.
 */
export const PracticeReminders = component$(() => {
  const supported = useSignal(false);
  const saving = useSignal(false);
  const error = useSignal<"permission-denied" | "error" | null>(null);
  const config = useStore<ReminderConfig>({ morning: null, evening: null });

  // Support detection and stored config are client-only by nature.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    if (!(await reminderSupport())) return;
    const stored = loadReminders();
    config.morning = stored.morning;
    config.evening = stored.evening;
    supported.value = true;
  });

  const persist = $(async () => {
    saving.value = true;
    const result = await saveReminders({
      morning: config.morning,
      evening: config.evening,
    });
    saving.value = false;
    if (result === "saved") {
      error.value = null;
    } else {
      // The save didn't stick — put the switches back how the server has them.
      error.value = result;
      const stored = loadReminders();
      config.morning = stored.morning;
      config.evening = stored.evening;
    }
  });

  if (!supported.value) return null;

  return (
    <section class="mt-12" aria-label="Practice reminders">
      <h2 class="font-display text-lg font-bold">Daily reminders</h2>
      <p class="text-ink-soft mt-2 text-sm">
        Let this device nudge you to practise. Reminders arrive as
        notifications, even when the app is closed.
      </p>

      <div class="mt-4 space-y-3">
        {SLOTS.map(({ slot, label, kanji }) => {
          const on = config[slot] !== null;
          return (
            <div
              key={slot}
              class={[
                "flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors",
                on ? "border-indigo-ai bg-indigo-wash/50" : "border-paper-line",
              ]}
            >
              <span
                lang="ja"
                aria-hidden="true"
                class={[
                  "font-kana w-8 shrink-0 text-xl font-semibold",
                  on ? "text-indigo-deep" : "text-ink-faint",
                ]}
              >
                {kanji}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-ink text-sm font-semibold">{label} reminder</p>
                <p
                  class={[
                    "text-xs",
                    on ? "text-indigo-deep font-medium" : "text-ink-soft",
                  ]}
                >
                  {on ? "Daily on this device" : "Off"}
                </p>
              </div>
              {on && (
                <label class="text-ink-soft flex items-center gap-2 text-sm">
                  <span class="sr-only">{label} reminder time</span>
                  <input
                    type="time"
                    value={config[slot] ?? DEFAULT_TIMES[slot]}
                    disabled={saving.value}
                    onChange$={async (_, el) => {
                      if (el.value) {
                        config[slot] = el.value;
                        await persist();
                      }
                    }}
                    class="border-paper-line bg-paper text-ink min-h-11 rounded-lg border-2 px-2 font-semibold"
                  />
                </label>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${label} reminder`}
                disabled={saving.value}
                onClick$={async () => {
                  config[slot] = on ? null : DEFAULT_TIMES[slot];
                  await persist();
                }}
                class={[
                  "relative h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors disabled:cursor-wait disabled:opacity-50",
                  on
                    ? "border-indigo-ai bg-indigo-ai"
                    : "border-paper-line bg-paper-deep",
                ]}
              >
                <span
                  aria-hidden="true"
                  class={[
                    "absolute top-0.5 left-0.5 size-5 rounded-full transition-transform",
                    on ? "bg-paper translate-x-5" : "bg-ink-faint",
                  ]}
                />
              </button>
            </div>
          );
        })}
      </div>

      {error.value === "permission-denied" && (
        <p class="text-shu-deep mt-3 text-sm" role="alert">
          Notifications are blocked for Kana Smash. Allow them in your browser’s
          site settings, then switch a reminder on again.
        </p>
      )}
      {error.value === "error" && (
        <p class="text-shu-deep mt-3 text-sm" role="alert">
          Saving your reminder didn’t work — check your connection and try
          again.
        </p>
      )}
    </section>
  );
});
