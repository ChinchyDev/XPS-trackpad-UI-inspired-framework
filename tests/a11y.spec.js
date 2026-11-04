// axe-core on every garden view, both themes. Contrast is the check that matters most for this framework.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { url } = require('./helpers');

// [name, dark hash, light hash]
const states = [
  ['login', '', '#light'], ['login error', '#err', '#err-light'], ['overview', '#app', '#app-light'],
  ['beds', '#app-beds', '#app-light-beds'], ['beds modal', '#app-beds-modal', '#app-light-beds-modal'],
  ['irrigation', '#app-irrigation', '#app-light-irrigation'], ['tasks', '#app-tasks', '#app-light-tasks'],
  ['users', '#app-users', '#app-light-users'], ['delete dialog', '#app-users-del', '#app-light-users-del'],
  ['collapsed rail', '#app-min', '#app-light-min'],
];
for (const [name, dark, light] of states) for (const [theme, hash] of [['dark', dark], ['light', light]]) {
  test(`axe: ${name} (${theme})`, async ({ page }) => {
    await page.goto(url('garden.html', hash));
    await page.waitForTimeout(1800); // let the notch entrance settle
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    const msgs = r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
    expect(msgs).toEqual([]);
  });
}
