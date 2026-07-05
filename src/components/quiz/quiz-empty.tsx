import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

interface QuizEmptyProps {
  script: string;
}

/** Shown when a weak-areas session has no data to build a quiz from. */
export const QuizEmpty = component$<QuizEmptyProps>(({ script }) => (
  <div class="mt-16 text-center">
    <p class="font-display text-xl font-bold">Nothing to review — yet.</p>
    <p class="text-ink-soft mx-auto mt-2 max-w-sm">
      Weak-spot sessions are built from your mistakes. Complete a couple of
      regular levels first, then come back.
    </p>
    <Link
      href={`/${script}/`}
      class="bg-indigo-ai text-paper hover:bg-indigo-deep mt-6 inline-block rounded-xl px-5 py-3 font-semibold"
    >
      Choose a level
    </Link>
  </div>
));
