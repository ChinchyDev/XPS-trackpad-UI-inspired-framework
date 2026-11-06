// Visual regression: the safety net for refactors of edgelit.css (layers, tokens, logical properties...).
// Baselines live in tests/visual.spec.js-snapshots/. After an INTENDED visual change:  npx playwright test visual --update-snapshots
// Dynamic things (today's date, the calendar) are masked or avoided so a baseline does not rot overnight.
const { test, expect } = require('../fixtures');
const { url } = require('./helpers');

const OPTS = { maxDiffPixelRatio: 0.003, animations: 'disabled', caret: 'hide' };
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1500); };   // skeleton resolves at 1.2s

const garden = [
  ['login', ''], ['overview', '#app'], ['beds', '#app-beds'], ['beds-modal', '#app-beds-modal'], ['irrigation', '#app-irrigation'],
  ['tasks', '#app-tasks'], ['users', '#app-users'], ['delete-dialog', '#app-users-del'], ['collapsed', '#app-min'], ['telemetry', '#app-telemetry'],
  ['components', '#app-components'], ['palette', '#app-pal'], ['search-suggestions', '#app-combo'], ['user-menu', '#app-menu'],
];
for (const [theme, prefix] of [['dark', ''], ['light', 'light']]) {
  for (const [name, hash] of garden) {
    test(`garden ${name} (${theme})`, async ({ page }) => {
      const h = !hash ? (prefix ? '#light' : '') : (prefix ? hash.replace('#app', '#app-light') : hash);
      await page.goto(url('garden.html', h)); await settle(page);
      await expect(page).toHaveScreenshot(`garden-${name}-${theme}.png`, { ...OPTS, mask: [page.locator('#today')] });
    });
  }
}
for (const [theme, q] of [['dark', ''], ['light', '#light']]) {
  test(`gallery (${theme})`, async ({ page }) => {
    await page.goto(url('gallery.html', q)); await settle(page);
    await expect(page).toHaveScreenshot(`gallery-${theme}.png`, { ...OPTS, fullPage: true });
  });
  test(`dashboard (${theme})`, async ({ page }) => {
    await page.goto(url('dashboard.html', q)); await settle(page);
    await expect(page).toHaveScreenshot(`dashboard-${theme}.png`, OPTS);
  });
  test(`icon lab (${theme})`, async ({ page }) => {
    await page.goto(url('icons.html')); if (theme === 'light') await page.click('#seg-theme [data-v=light]'); await settle(page);
    await expect(page.locator('#h-pg').locator('xpath=ancestor::section')).toHaveScreenshot(`icons-playground-${theme}.png`, OPTS);
  });
}

// The color-mix() fallback must look like color-mix(). Force it on (a modern browser ignores `@supports not`, so flip the condition) and compare against the SAME baselines.
test.describe('color-mix fallback is visually equivalent', () => {
  const fs = require('fs'); const path = require('path'); const { root } = require('./helpers');
  const forced = fs.readFileSync(path.join(root, 'dist', 'fallback.css'), 'utf8').replace('@supports not (color: color-mix(in srgb, red, blue))', '@supports (color: red)');
  for (const [name, hash, theme] of [['overview', '#app', 'dark'], ['overview', '#app-light', 'light'], ['beds-modal', '#app-light-beds-modal', 'light'], ['components', '#app-components', 'dark'], ['collapsed', '#app-min', 'dark'], ['tasks', '#app-light-tasks', 'light'], ['palette', '#app-pal', 'dark']]) {
    test(`garden ${name} (${theme}) with the fallback forced on`, async ({ page }) => {
      await page.goto(url('garden.html', hash)); await settle(page);
      await page.addStyleTag({ content: forced }); await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`garden-${name}-${theme}.png`, { ...OPTS, maxDiffPixelRatio: 0.005, mask: [page.locator('#today')] });
    });
  }
});

// Right-to-left baselines
for (const [name, hash, theme] of [['overview', '#app-rtl', 'dark'], ['components', '#app-components-rtl', 'dark'], ['beds-modal', '#app-beds-modal-rtl', 'dark'], ['tasks', '#app-light-tasks-rtl', 'light']]) {
  test(`garden ${name} (${theme}, RTL)`, async ({ page }) => {
    await page.goto(url('garden.html', hash)); await settle(page);
    await expect(page).toHaveScreenshot(`garden-${name}-${theme}-rtl.png`, { ...OPTS, mask: [page.locator('#today')] });
  });
}

// Phone baselines (390px, touch). These pin the narrow-screen layout while media queries become container queries.
test.describe('phone layout @responsive', () => {
  for (const [name, hash] of [['overview', '#app'], ['beds-modal', '#app-beds-modal'], ['users', '#app-users'], ['components', '#app-components'], ['collapsed-nav', '#app-min']]) {
    test(`garden ${name} on a phone @responsive`, async ({ page }) => {
      await page.goto(url('garden.html', hash)); await settle(page);
      await expect(page).toHaveScreenshot(`garden-${name}-phone.png`, { ...OPTS, mask: [page.locator('#today')] });
    });
  }
});
