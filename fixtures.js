// Persistent-profile fixture (per the machine's CLAUDE.md rules for Playwright on Windows).
// Launching Edge/Chrome with a throwaway profile triggers a Windows logon check that can lock the account,
// so every worker gets its own persistent profile folder. Test files import { test, expect } from here,
// never from '@playwright/test'.
const base = require('@playwright/test');
const path = require('path');
const project = path.basename(__dirname).replace(/\W+/g, '-');

exports.test = base.test.extend({
  context: async ({}, use, testInfo) => {
    // Edge (Chromium) is the default. Firefox and WebKit are allowed for the cross-browser projects only; each gets its own profile folders.
    const { browserName = 'chromium', defaultBrowserType, ...opts } = testInfo.project.use;
    const ctx = await base[browserName].launchPersistentContext(
      `C:/pw-profiles/${project}-${browserName}-${testInfo.parallelIndex}`,
      { ...(browserName === 'chromium' ? { channel: 'msedge' } : {}), headless: true, ...opts }
    );
    await use(ctx);
    await ctx.close();
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? await context.newPage());
  },
});
exports.expect = base.expect;
