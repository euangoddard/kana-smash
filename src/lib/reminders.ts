/** Practice reminders for the installed PWA — a progressive enhancement.
 *
 * Reminders are Web Push notifications sent by a Cloudflare Worker cron
 * job (src/lib/server/push-sender.ts): the page subscribes via the
 * PushManager API and registers the subscription plus slot times with
 * /api/reminders, and the service worker (public/sw.js) shows whatever the
 * server pushes. Push needs an installed PWA on iOS and notification
 * permission everywhere, so `reminderSupport()` gates everything and
 * callers render nothing when it reports unsupported.
 *
 * The server row is the source of truth for the schedule; localStorage
 * only remembers this device's ID and the last-saved config for the UI.
 */

export type ReminderSlot = "morning" | "evening";

export interface ReminderConfig {
  /** "HH:MM" 24-hour local time, or null when the slot is off. */
  morning: string | null;
  evening: string | null;
}

export const DEFAULT_TIMES: Record<ReminderSlot, string> = {
  morning: "08:00",
  evening: "20:00",
};

const CONFIG_KEY = "kana-smash:reminders";
const DEVICE_ID_KEY = "kana-smash:device-id";

/** Matches PUBLIC key generation — keep in step with wrangler.jsonc `vars`. */
const VAPID_PUBLIC_KEY =
  "BCocvoRfp8k9DUMEXFnWqJ0d2xfkd138R2FqsLJ1FYwdfLphnHavOOUA-Z5rvdcA7AOZhyu0-z-eu2jAvOKAZIw";

export const isInstalledPwa = (): boolean =>
  matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator &&
    (navigator as { standalone?: boolean }).standalone === true);

/** True only in an installed PWA on a browser with every API we need. */
export const reminderSupport = async (): Promise<boolean> => {
  if (!isInstalledPwa()) return false;
  if (
    !("serviceWorker" in navigator) ||
    !("Notification" in window) ||
    !("PushManager" in window)
  ) {
    return false;
  }
  return (await navigator.serviceWorker.getRegistration()) !== undefined;
};

export const loadReminders = (): ReminderConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return JSON.parse(stored) as ReminderConfig;
  } catch {
    // Corrupt entry — fall through to the default.
  }
  return { morning: null, evening: null };
};

const getDeviceId = (): string => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

/** applicationServerKey wants raw bytes, not the base64url string. */
const vapidKeyBytes = (): Uint8Array => {
  const base64 = VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

export type SaveResult = "saved" | "permission-denied" | "error";

/**
 * Persist the config and keep the push subscription in step: subscribed
 * and registered with the server while any slot is on (asking for
 * notification permission first), unsubscribed once both are off.
 */
export const saveReminders = async (
  config: ReminderConfig,
): Promise<SaveResult> => {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return "error";

  const anyOn = config.morning !== null || config.evening !== null;
  try {
    if (anyOn) {
      if (Notification.permission !== "granted") {
        if ((await Notification.requestPermission()) !== "granted") {
          return "permission-denied";
        }
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyBytes(),
      });
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          subscription: subscription.toJSON(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          morning: config.morning,
          evening: config.evening,
        }),
      });
      if (!response.ok) return "error";
    } else {
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();
      const response = await fetch("/api/reminders", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      if (!response.ok) return "error";
    }
  } catch (error) {
    console.error("Saving reminders failed:", error);
    return "error";
  }

  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  return "saved";
};
