---
name: verify
description: Build, launch, and drive Kana Smash to verify changes end-to-end in a real browser.
---

# Verifying Kana Smash

Qwik City app; quizzes are built **client-side** (localStorage + Math.random),
so curling routes only proves SSR renders "Preparing your session…". Real
verification needs a browser.

## Launch

```bash
npm run dev          # Vite dev server on http://localhost:5173
```

Wait for `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → 200.

## Drive

Playwright ~1.61 is available (`npm i playwright` in the scratchpad; Chromium
is already in `~/Library/Caches/ms-playwright`). A fresh `chromium.launch()`
context has empty localStorage — good for testing first-run states (locked
weak-spot panel, "not started" chips, empty weak-areas quiz).

Selectors that matter:

- Answer grid: `div[role=group][aria-label=Answers] button`; after answering,
  the correct button contains `.bg-matcha` (the ◯ stamp), then click
  `#quiz-next`.
- Matching round columns: `div[role=group][aria-label=Characters|Sounds]`
  (kana) or `[aria-label=Kanji|Meanings]` (kanji). Wrong pairs lock the board
  for 550 ms — wait ~650 ms between brute-force attempts.
- Mastery chips on level pages: `a[href='...'] span.rounded-full`. They fill
  in via a client task — **wait ~500 ms after navigation** or you'll read
  "not started" and think progress is broken (it isn't).

## Gotchas

- **Stale-options trap**: Qwik fine-grained updates can leave child-component
  text stale while attributes update. When checking question transitions,
  assert the option _text_ changed, not just the heading.
- Headless Chromium on this Mac _does_ expose a Japanese TTS voice, so
  listening questions appear in quizzes; don't assume they're skipped.
- Flows worth driving: home → levels → full 10-question quiz → matching round
  → results → back to levels (chip updated, weak-spots unlocked), plus
  `/…/quiz/weak-areas/` empty state and a bogus level id (404).
