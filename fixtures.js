// Persistent-profile fixture (per the machine's CLAUDE.md rules for Playwright on Windows).
// Launching Edge/Chrome with a throwaway profile triggers a Windows logon check that can lock the account,
// so every worker gets its own persistent profile folder. Test files import { test, expect } from here,
// never from '@playwright/test'.
const base = require('@playwright/test');
const path = require('path');
const project = path.basename(__dirname).replace(/\W+/g, '-');

exports.test = base.test.extend({
  context: async ({}, use, testInfo) => {
    const ctx = await base.chromium.launchPersistentContext(
      `C:/pw-profiles/${project}-${testInfo.parallelIndex}`,
      { channel: 'msedge', headless: true, ...testInfo.project.use }
    );
    await use(ctx);
    await ctx.close();
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? await context.newPage());
  },
});
exports.expect = base.expect;
