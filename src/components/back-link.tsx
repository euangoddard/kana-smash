import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

interface BackLinkProps {
  href: string;
  class?: string;
}

/** A "← Label" nav link back to a parent page. */
export const BackLink = component$<BackLinkProps>(({ href, class: extra }) => (
  <Link
    href={href}
    class={`text-indigo-ai underline-offset-4 hover:underline ${extra ?? ""}`}
  >
    ← <Slot />
  </Link>
));
