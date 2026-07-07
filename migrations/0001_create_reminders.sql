-- Web Push practice reminders: one row per subscribed device.
CREATE TABLE reminders (
  device_id TEXT PRIMARY KEY,
  -- PushSubscription JSON (endpoint + p256dh/auth keys) from the browser.
  subscription TEXT NOT NULL,
  -- IANA timezone name, e.g. "Europe/London".
  timezone TEXT NOT NULL,
  -- "HH:MM" 24-hour local time, or NULL when the slot is off.
  morning TEXT,
  evening TEXT,
  -- Local date ("YYYY-MM-DD") each slot last fired, so we notify once a day.
  last_sent_morning TEXT,
  last_sent_evening TEXT,
  updated_at TEXT NOT NULL
);
