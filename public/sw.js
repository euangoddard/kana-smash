/* Kana Smash service worker: offline-first for a fully static app.
 * Hashed build assets are cached forever (cache-first); pages are
 * network-first with a cache fallback so content updates when online. */

const CACHE = "kana-smash-v3";
const KANA_AUDIO_FILES = [
  "a",
  "i",
  "u",
  "e",
  "o",
  "ka",
  "ki",
  "ku",
  "ke",
  "ko",
  "sa",
  "shi",
  "su",
  "se",
  "so",
  "ta",
  "chi",
  "tsu",
  "te",
  "to",
  "na",
  "ni",
  "nu",
  "ne",
  "no",
  "ha",
  "hi",
  "fu",
  "he",
  "ho",
  "ma",
  "mi",
  "mu",
  "me",
  "mo",
  "ya",
  "yu",
  "yo",
  "ra",
  "ri",
  "ru",
  "re",
  "ro",
  "wa",
  "wo",
  "n",
  "ga",
  "gi",
  "gu",
  "ge",
  "go",
  "za",
  "ji",
  "zu",
  "ze",
  "zo",
  "da",
  "de",
  "do",
  "ba",
  "bi",
  "bu",
  "be",
  "bo",
  "pa",
  "pi",
  "pu",
  "pe",
  "po",
];
const SHELL = [
  "/",
  "/manifest.json",
  "/fonts/bricolage-grotesque.woff2",
  "/icons/icon-192.png",
  "/icons/badge-96.png",
  ...KANA_AUDIO_FILES.flatMap((name) => [
    `/audio/${name}.mp3`,
    `/audio/${name}.ogg`,
  ]),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const cachePut = (request, response) => {
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy));
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cachePut(request, response);
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match("/"))
            .then((cached) => cached ?? Response.error()),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) cachePut(request, response);
          return response;
        }),
    ),
  );
});

/* Practice reminders: the page registers a push subscription with the
 * server (see src/lib/reminders.ts); a Cloudflare Worker cron job pushes
 * { slot, title, body } payloads when a reminder is due. */

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const { slot, title, body } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: `kana-smash-${slot}`,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window" })
      .then((windows) =>
        windows.length > 0 ? windows[0].focus() : self.clients.openWindow("/"),
      ),
  );
});

/* Push services occasionally rotate subscriptions; resubscribe with the
 * same options and tell the server which endpoint was replaced. */
self.addEventListener("pushsubscriptionchange", (event) => {
  const oldSubscription = event.oldSubscription;
  if (!oldSubscription) return;
  event.waitUntil(
    self.registration.pushManager
      .subscribe(oldSubscription.options)
      .then((subscription) =>
        fetch("/api/reminders", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            oldEndpoint: oldSubscription.endpoint,
            subscription: subscription.toJSON(),
          }),
        }),
      ),
  );
});
