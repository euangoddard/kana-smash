/*
 * WHAT IS THIS FILE?
 *
 * It's the entry point for Cloudflare Workers when building for production.
 * (The file keeps the "cloudflare-pages" name because the Workers adapter
 * reuses Qwik City's Cloudflare Pages middleware and expects this filename.)
 *
 * Learn more about the Cloudflare Workers integration here:
 * - https://qwik.dev/docs/deployments/cloudflare-workers/
 *
 * Alongside the Qwik City `fetch` handler we export a `scheduled` handler
 * so a cron trigger can send practice-reminder push notifications; both are
 * re-exported by public/_worker.js, the module wrangler actually deploys.
 */
import {
  createQwikCity,
  type PlatformCloudflarePages as PlatformCloudflareWorkers,
} from "@builder.io/qwik-city/middleware/cloudflare-pages";
import type {
  ExecutionContext,
  ScheduledController,
} from "@cloudflare/workers-types";
import qwikCityPlan from "@qwik-city-plan";
import { sendDueReminders, type ReminderEnv } from "./lib/server/push-sender";
import render from "./entry.ssr";

declare global {
  type QwikCityPlatform = PlatformCloudflareWorkers;
}

const fetch = createQwikCity({ render, qwikCityPlan });

const scheduled = (
  _controller: ScheduledController,
  env: ReminderEnv,
  ctx: ExecutionContext,
): void => {
  ctx.waitUntil(sendDueReminders(env));
};

export { fetch, scheduled };
