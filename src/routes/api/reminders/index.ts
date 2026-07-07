/** Practice-reminder subscriptions, keyed by a client-generated device ID.
 *
 * POST   — upsert a device's push subscription, timezone and slot times.
 * PATCH  — swap a rotated subscription for an existing row, matched by the
 *          old endpoint (sent by the service worker's pushsubscriptionchange
 *          handler, which doesn't know the device ID).
 * DELETE — remove a device (both slots switched off).
 *
 * The cron sender in src/lib/server/push-sender.ts reads these rows.
 */
import type { RequestHandler } from "@builder.io/qwik-city";
import type { ReminderEnv } from "~/lib/server/push-sender";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface SubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const isValidSubscription = (value: unknown): value is SubscriptionJson => {
  const subscription = value as SubscriptionJson | null;
  return (
    typeof subscription?.endpoint === "string" &&
    subscription.endpoint.startsWith("https://") &&
    typeof subscription.keys?.p256dh === "string" &&
    typeof subscription.keys?.auth === "string"
  );
};

const isValidTimezone = (timezone: unknown): timezone is string => {
  if (typeof timezone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const isValidSlot = (time: unknown): time is string | null =>
  time === null || (typeof time === "string" && TIME_PATTERN.test(time));

const dbOf = (platform: QwikCityPlatform) =>
  (platform.env as unknown as ReminderEnv).DB;

/** Malformed JSON is the client's fault: report 400, not a parse crash. */
const readBody = async <T>(
  parseBody: () => Promise<unknown>,
): Promise<T | null> => {
  try {
    return (await parseBody()) as T;
  } catch {
    return null;
  }
};

export const onPost: RequestHandler = async ({ parseBody, platform, json }) => {
  const body = await readBody<{
    deviceId?: unknown;
    subscription?: unknown;
    timezone?: unknown;
    morning?: unknown;
    evening?: unknown;
  }>(parseBody);

  if (
    typeof body?.deviceId !== "string" ||
    body.deviceId.length === 0 ||
    body.deviceId.length > 64 ||
    !isValidSubscription(body.subscription) ||
    !isValidTimezone(body.timezone) ||
    !isValidSlot(body.morning) ||
    !isValidSlot(body.evening)
  ) {
    json(400, { error: "Invalid reminder payload" });
    return;
  }

  await dbOf(platform)
    .prepare(
      `INSERT INTO reminders (device_id, subscription, timezone, morning, evening, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (device_id) DO UPDATE SET
         subscription = excluded.subscription,
         timezone = excluded.timezone,
         morning = excluded.morning,
         evening = excluded.evening,
         updated_at = excluded.updated_at`,
    )
    .bind(
      body.deviceId,
      JSON.stringify(body.subscription),
      body.timezone,
      body.morning,
      body.evening,
      new Date().toISOString(),
    )
    .run();

  json(200, { ok: true });
};

export const onPatch: RequestHandler = async ({
  parseBody,
  platform,
  json,
}) => {
  const body = await readBody<{
    oldEndpoint?: unknown;
    subscription?: unknown;
  }>(parseBody);

  if (
    typeof body?.oldEndpoint !== "string" ||
    !isValidSubscription(body.subscription)
  ) {
    json(400, { error: "Invalid resubscription payload" });
    return;
  }

  await dbOf(platform)
    .prepare(
      `UPDATE reminders SET subscription = ?1, updated_at = ?2
       WHERE json_extract(subscription, '$.endpoint') = ?3`,
    )
    .bind(
      JSON.stringify(body.subscription),
      new Date().toISOString(),
      body.oldEndpoint,
    )
    .run();

  json(200, { ok: true });
};

export const onDelete: RequestHandler = async ({
  parseBody,
  platform,
  json,
}) => {
  const body = await readBody<{ deviceId?: unknown }>(parseBody);
  if (typeof body?.deviceId !== "string") {
    json(400, { error: "Invalid payload" });
    return;
  }

  await dbOf(platform)
    .prepare("DELETE FROM reminders WHERE device_id = ?")
    .bind(body.deviceId)
    .run();

  json(200, { ok: true });
};
