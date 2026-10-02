// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Production config for TC5 / TC6 — runs against the live Cloudflare Pages site
 * in a visible browser so the user can watch generation happen in real time.
 *
 * Usage:
 *   npm run test:scene:live:tc56
 *   or: npx playwright test tests/scene-export.spec.js --grep "TC[56]" \
 *         --config playwright.config.scene-live.js
 */
module.exports = defineConfig({
  testDir: './tests',

  // TC6 with real zoompan can take 45-60 min on a slow machine (ffmpeg.wasm load + 5-6 segments at 25 fps)
  timeout: 60 * 60 * 1000,

  retries: 0,   // never retry — these tests are slow and stateful
  workers: 1,

  use: {
    baseURL:    'https://authorr-ai.pages.dev',
    headless:   false,      // visible browser window
    slowMo:     150,        // 150 ms delay between actions — followable by eye
    screenshot: 'only-on-failure',
    video:      'on',       // record full video of the run for review
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir:  'test-results/live-artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-live', open: 'always' }],
  ],

  // No webServer — we're hitting the live site directly
});
