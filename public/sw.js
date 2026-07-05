/* Kana Smash service worker: offline-first for a fully static app.
 * Hashed build assets are cached forever (cache-first); pages are
 * network-first with a cache fallback so content updates when online. */

const CACHE = "kana-smash-v2";
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
