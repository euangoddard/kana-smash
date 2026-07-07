/* Deployed Worker module (wrangler.jsonc `main` points at dist/_worker.js,
 * where the client build copies this file). Providing it here stops the
 * Qwik adapter generating its fetch-only default, so the cron `scheduled`
 * handler is deployed too. The import path is relative to dist/. */
import { fetch, scheduled } from "../server/entry.cloudflare-pages.js";

export default { fetch, scheduled };
