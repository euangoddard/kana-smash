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
- **Accessible** — large tap targets, visible focus rings, live-region
  answer feedback, `lang="ja"` on all kana, reduced-motion support,
  Japanese-style 〇/✗ marks for correct/incorrect.
- **Installable & offline** — web manifest plus a service worker; progress
  lives in `localStorage`, no backend, no account.

## Where things live

```
src/
├── data/         kana dataset, confusion maps, level definitions
├── lib/          progress tracking, quiz generation, speech synthesis
└── routes/
    ├── index.tsx                       home — pick a script
    ├── [script]/index.tsx              level list (hiragana | katakana)
    ├── [script]/quiz/[levelId]/        quiz session
    └── progress/                       accuracy heatmap
```

## Development

```shell
npm start           # dev server
npm run build       # production build (static, dist/)
npm run preview     # build + local preview
npm run lint        # eslint
npm run build.types # typecheck
```

The production build is fully static (SSG via the static adapter in
`adapters/static/`) — deploy `dist/` to any static host.
