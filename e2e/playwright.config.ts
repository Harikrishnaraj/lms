import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Node 22 ships loadEnvFile, so credentials need no dotenv dependency.
// Playwright loads this config as CJS, hence __dirname rather than
// import.meta.url (which throws here).
const envFile = join(__dirname, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

/**
 * Targets the DEPLOYED stack by default (Vercel frontend + Railway API),
 * because that is the only place Tasks 21-24 have ever run end to end.
 * Point WEB_BASE_URL / API_BASE_URL at localhost to run the same suite
 * against a local `pnpm dev`.
 */
export const WEB_BASE_URL = process.env.WEB_BASE_URL ?? 'https://lmsbuild12345-beige.vercel.app';
export const API_BASE_URL =
  process.env.API_BASE_URL ?? 'https://api-production-83e59.up.railway.app/api/v1';

export default defineConfig({
  testDir: './specs',
  // These hit a real deployment over the public internet: a cold Railway
  // container plus a Vercel lambda cold start is comfortably slower than
  // Playwright's 30s default.
  timeout: 60_000,
  expect: { timeout: 15_000 },

  // Never allow an accidentally-committed .only to silently shrink the run.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // The authenticated specs mutate shared tenant state (grades, settings,
  // assignments) on ONE shared deployment. Running them in parallel would
  // make them race each other, so workers are pinned to 1. Revisit only
  // once each worker gets its own seeded tenant.
  workers: 1,
  fullyParallel: false,

  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: WEB_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
