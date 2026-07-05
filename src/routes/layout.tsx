import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div class="flex min-h-dvh flex-col">
      <a
        href="#main"
        class="focus:bg-indigo-ai focus:text-paper sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header class="border-paper-line border-b">
        <div class="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            class="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <span
              aria-hidden="true"
              class="bg-shu text-paper grid size-9 place-items-center rounded-lg"
            >
              {/* Hanko stamp: the maru (correct mark) */}
              <svg viewBox="0 0 24 24" class="size-6" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="7.5"
                  stroke="currentColor"
                  stroke-width="2.5"
                />
              </svg>
            </span>
            <span class="text-lg">
              Kana <span class="text-shu">Smash</span>
            </span>
          </Link>
          <nav aria-label="Main">
            <Link
              href="/progress/"
              class="text-indigo-ai rounded-lg px-3 py-2 text-sm font-medium underline-offset-4 hover:underline"
            >
              My progress
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" class="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-16">
        <Slot />
      </main>
    </div>
  );
});
