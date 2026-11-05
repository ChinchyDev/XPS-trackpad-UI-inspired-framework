// Runs against the local files with the Edge that is already installed (no browser download).
// The browser is launched by fixtures.js with a persistent profile (see CLAUDE.md); do NOT set `channel` here or use `browser.newContext()` in tests.
//   npm test                                  -> everything
//   npx playwright test garden -g "rules"     -> one group
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  workers: 4,   // fixed: fixtures.js gives each worker its own persistent profile (C:/pw-profiles/<project>-0..3), so this caps the profile count
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { headless: true, reducedMotion: 'no-preference' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1300, height: 820 } }, grepInvert: /@responsive/ },
    { name: 'phone', use: { viewport: { width: 390, height: 800 }, hasTouch: true }, grep: /@responsive/ },
  ],
});
