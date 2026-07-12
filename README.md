# Kana Smash ⚡️

A mobile-first PWA for learning to read the Japanese kana — hiragana and
katakana — built with [Qwik City](https://qwik.dev/qwikcity/overview/) and
Tailwind CSS v4.

## Features

- **Two scripts, row-based levels** — hiragana and katakana each have 24
  levels covering the 46 basics, dakuten/handakuten (が, ぱ …) and yōon
  combinations (きゃ, しゅ …), plus cumulative checkpoints. All levels are
  open from the start.
- **Three exercise types**, all multiple choice:
  - _Read it_ — see a character, pick the romaji
  - _Recall it_ — see romaji, pick the character
  - _Hear it_ — speech synthesis says the sound, pick the character
    (automatically skipped when the device has no Japanese voice)
- **Smart wrong answers** — distractors are drawn from visually confusable
  characters (シ/ツ, ソ/ン, は/ほ …) and same-row/column sounds, so quizzes
  target real mix-ups.
- **Weakness tracking** — every answer is stored locally with
  recency-weighted accuracy per character, shown as a gojūon-grid heatmap
  on the Progress page. A special _weak spots_ level drills your worst
  characters for each script.
- **Daily review (spaced repetition)** — each character earns a longer
  review interval for every consecutive correct answer and comes due just
  before you'd forget it. The `/review/` hub shows what's due per course;
  intervals are derived from the stored attempt history, so no extra state.
- **Streaks & a daily goal** — every answered question counts toward a
  20-a-day goal; consecutive practised days build a streak (with best),
  shown on the home page, review hub and results screens.
- **Real words** — kana vocabulary levels (ねこ, がっこう, コーヒー …)
  drill whole-word reading where yōon, sokuon and long vowels actually
  bite; word answers feed the per-kana progress records.
- **Kanji** — the 80 JLPT N5 kanji plus a second everyday tier toward N4
  (136 in all), drilled by meaning and by reading inside real words, both
  tracked separately.
- **Challenge mode** — a 60-second speed round per course over characters
  you've met, with a local best score to beat.
- **Accessible** — large tap targets, visible focus rings, live-region
  answer feedback, `lang="ja"` on all kana, reduced-motion support,
  Japanese-style 〇/✗ marks for correct/incorrect.
- **Installable & offline** — web manifest plus a service worker; progress
  lives in `localStorage`, no backend, no account.

## Where things live

```
src/
├── data/         kana/kanji/word datasets, confusion maps, level definitions
├── lib/          progress, SRS scheduling, streaks, quiz generation, speech
└── routes/
    ├── index.tsx                       home — pick a script
    ├── [script]/index.tsx              level list (hiragana | katakana)
    ├── [script]/quiz/[levelId]/        kana quiz session
    ├── [script]/words/quiz/[levelId]/  word-reading quiz session
    ├── kanji/                          kanji level list + quiz sessions
    ├── review/                         daily review hub (SRS + streak)
    ├── challenge/                      60-second speed rounds
    └── progress/                       accuracy heatmap
```

## Development

```shell
npm start           # dev server
npm run build       # production build (client + worker)
npm run serve       # build + run the worker locally (wrangler dev)
npm run preview     # build + local preview
npm run lint        # eslint
npm run build.types # typecheck
```

## Deployment (Cloudflare Workers)

The app deploys as a Cloudflare Worker (adapter in
`adapters/cloudflare-workers/`): static assets are served from `dist/`,
pages are server-rendered, and a cron trigger sends practice-reminder
push notifications (see `wrangler.jsonc`).

```shell
npm run deploy      # build + wrangler deploy
```

### Practice reminders

Reminders are Web Push notifications. The pieces:

- `src/components/practice-reminders.tsx` — settings UI (installed PWA only)
- `src/lib/reminders.ts` — push subscription + `/api/reminders` client
- `src/routes/api/reminders/index.ts` — subscription CRUD, backed by D1
- `src/lib/server/push-sender.ts` — cron-driven sender (every 15 min)
- `public/sw.js` — shows the pushed notification

One-time setup on a new environment:

```shell
npx wrangler d1 create kana-smash          # then update database_id in wrangler.jsonc
npx wrangler d1 migrations apply kana-smash --remote
npx web-push generate-vapid-keys           # then update the TWO public-key copies:
                                           #   wrangler.jsonc vars.VAPID_PUBLIC_KEY
                                           #   src/lib/reminders.ts VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY  # private half; locally: .dev.vars
```
