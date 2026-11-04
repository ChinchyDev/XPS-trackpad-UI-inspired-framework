// Runs against the local files with the Edge that is already installed (no browser download).
//   npm test                                  -> everything
//   npx playwright test garden -g "rules"     -> one group
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { channel: 'msedge', headless: true, reducedMotion: 'no-preference' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1300, height: 820 } }, grepInvert: /@responsive/ },
    { name: 'phone', use: { viewport: { width: 390, height: 800 }, hasTouch: true }, grep: /@responsive/ },
  ],
});
