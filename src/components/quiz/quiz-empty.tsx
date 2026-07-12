import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

interface QuizEmptyProps {
  script: string;
  /** Override the default weak-spots copy, e.g. for an empty review queue. */
  title?: string;
  body?: string;
  /** Where the call to action leads — defaults to the script's level list. */
  href?: string;
  cta?: string;
}

/** Shown when a dynamic session (weak spots, review) has nothing to drill. */
export const QuizEmpty = component$<QuizEmptyProps>(
  ({ script, title, body, href, cta }) => (
    <div class="mt-16 text-center">
      <p class="font-display text-xl font-bold">
        {title ?? "Nothing to review — yet."}
      </p>
      <p class="text-ink-soft mx-auto mt-2 max-w-sm">
        {body ??
          "Weak-spot sessions are built from your mistakes. Complete a couple of regular levels first, then come back."}
      </p>
      <Link
        href={href ?? `/${script}/`}
        class="btn-primary mt-6 inline-block px-5 py-3"
      >
        {cta ?? "Choose a level"}
      </Link>
    </div>
  ),
);
