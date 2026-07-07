/** Cron-triggered Web Push sender for practice reminders.
 *
 * Runs from the Worker's `scheduled` handler (see src/entry.cloudflare-pages.tsx)
 * every 15 minutes. Each subscribed device has a row in D1 with its push
 * subscription, IANA timezone and "HH:MM" slot times; a slot is due when its
 * local time has passed today, it hasn't fired today, and we're still within
 * the catch-up window. Push services answer 404/410 for expired
 * subscriptions, which is our cue to drop the row.
 */
import {
  buildPushPayload,
  type PushMessage,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";
import type { D1Database } from "@cloudflare/workers-types";

export interface ReminderEnv {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}

export type ReminderSlot = "morning" | "evening";

interface ReminderRow {
  device_id: string;
  subscription: string;
  timezone: string;
  morning: string | null;
  evening: string | null;
  last_sent_morning: string | null;
  last_sent_evening: string | null;
}

export const REMINDER_COPY: Record<
  ReminderSlot,
  { title: string; body: string }
> = {
  morning: {
    title: "Morning kana time ☀️",
    body: "Ten quick questions before the day runs away.",
  },
  evening: {
    title: "Evening kana review 🌙",
    body: "Wind down with a short drill — keep the streak alive.",
  },
};

/* Cron granularity is 15 minutes and delivery is best-effort, so treat a
 * reminder as "due" for a few hours after its set time rather than only at
 * the exact minute. */
const REMINDER_WINDOW_MINUTES = 4 * 60;

const SLOTS: ReminderSlot[] = ["morning", "evening"];

/** Local "YYYY-MM-DD" date and minutes-since-midnight in the given zone. */
const localNow = (
  timezone: string,
  now: Date,
): { date: string; minutes: number } => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
};

const parseMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const dueSlots = (row: ReminderRow, now: Date): ReminderSlot[] => {
  const local = localNow(row.timezone, now);
  return SLOTS.filter((slot) => {
    const time = row[slot];
    if (!time) return false;
    if (row[`last_sent_${slot}`] === local.date) return false;
    const elapsed = local.minutes - parseMinutes(time);
    return elapsed >= 0 && elapsed <= REMINDER_WINDOW_MINUTES;
  });
};

/** Sends one slot's notification. Returns what to do with the row. */
const sendPush = async (
  subscription: PushSubscription,
  slot: ReminderSlot,
  vapid: VapidKeys,
): Promise<"sent" | "expired" | "failed"> => {
  const message: PushMessage = {
    data: JSON.stringify({ slot, ...REMINDER_COPY[slot] }),
    options: { ttl: REMINDER_WINDOW_MINUTES * 60, urgency: "normal" },
  };
  const payload = await buildPushPayload(message, subscription, vapid);
  const response = await fetch(subscription.endpoint, payload);
  if (response.ok) return "sent";
  if (response.status === 404 || response.status === 410) return "expired";
  console.error(
    `Push for ${slot} rejected: ${response.status} ${await response.text()}`,
  );
  return "failed";
};

export const sendDueReminders = async (env: ReminderEnv): Promise<void> => {
  const vapid: VapidKeys = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
  const now = new Date();
  const { results } = await env.DB.prepare(
    "SELECT * FROM reminders WHERE morning IS NOT NULL OR evening IS NOT NULL",
  ).all<ReminderRow>();

  for (const row of results) {
    try {
      const subscription = JSON.parse(row.subscription) as PushSubscription;
      for (const slot of dueSlots(row, now)) {
        const outcome = await sendPush(subscription, slot, vapid);
        if (outcome === "expired") {
          await env.DB.prepare("DELETE FROM reminders WHERE device_id = ?")
            .bind(row.device_id)
            .run();
          break;
        }
        if (outcome === "sent") {
          const local = localNow(row.timezone, now);
          await env.DB.prepare(
            `UPDATE reminders SET last_sent_${slot} = ? WHERE device_id = ?`,
          )
            .bind(local.date, row.device_id)
            .run();
        }
      }
    } catch (error) {
      // One bad row (corrupt subscription, bogus timezone) mustn't block the rest.
      console.error(`Reminder for device ${row.device_id} failed:`, error);
    }
  }
};
