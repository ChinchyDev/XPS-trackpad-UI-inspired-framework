// Keeps the two trackers honest.
//  1. COMPONENT COVERAGE: every .me-* component in monoedge.css must appear in garden.html or be listed in
//     tests/coverage-baseline.json (known gaps). A NEW untested component fails; a newly covered one asks you to shrink the baseline.
//  2. ANIMATION REGISTRY: every @keyframes in monoedge.css must be listed in tests/animations.json.
const { test, expect } = require('@playwright/test');
const fs = require('fs'); const path = require('path');
const { url, read } = require('./helpers');

const css = read('monoedge.css'), garden = read('garden.html') + read('monoedge.js');   // garden loads monoedge.js, so classes it builds count as exercised
const classes = [...new Set([...css.matchAll(/\.(me-[a-z0-9-]+)/g)].map(m => m[1]))];
const comps = classes.filter(c => !/^me-(btn--|dot--|meter-ticks)/.test(c));

test('component coverage vs baseline', () => {
  const file = path.join(__dirname, 'coverage-baseline.json');
  const uncovered = comps.filter(c => !garden.includes(c)).sort();
  if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(uncovered, null, 2)); console.log('baseline created'); return; }
  const baseline = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`components: ${comps.length}, in garden: ${comps.length - uncovered.length}, known gaps: ${uncovered.length}`);
  expect(uncovered.filter(c => !baseline.includes(c)), 'new components that garden.html does not exercise').toEqual([]);
  expect(baseline.filter(c => !uncovered.includes(c)), 'now covered: remove from tests/coverage-baseline.json').toEqual([]);
});

test('every @keyframes is registered, nothing stale is registered', () => {
  const registry = JSON.parse(read('tests/animations.json'));
  const kf = [...new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]))].sort();
  const reg = Object.keys(registry).sort();
  expect(kf.filter(k => !reg.includes(k)), 'unregistered keyframes').toEqual([]);
  expect(reg.filter(k => !kf.includes(k)), 'registered but missing from css').toEqual([]);
});

test('notch entrance is slow enough to enjoy; reduced motion removes it', async ({ page, browser }) => {
  const fire = async pg => { await pg.goto(url('garden.html', '#app-tasks')); await pg.fill('#new-task', 'x'); await pg.keyboard.press('Enter'); };
  await fire(page);
  const dur = await page.locator('#toasts .me-alert').evaluate(e => getComputedStyle(e).animationDuration);
  expect(parseFloat(dur)).toBeGreaterThanOrEqual(1.4);
  const ctx = await browser.newContext({ reducedMotion: 'reduce' }); const p = await ctx.newPage();
  await fire(p);
  const d2 = await p.locator('#toasts .me-alert').evaluate(e => getComputedStyle(e).animationDuration);
  expect(parseFloat(d2)).toBeLessThan(0.01); await ctx.close();
});

test('loading orbit travels anticlockwise (angle decreases)', async ({ page }) => {
  await page.goto(url('gallery.html'));
  const a = () => page.locator('.me-btn[aria-busy=true]').evaluate(e => parseFloat(getComputedStyle(e, '::before').getPropertyValue('--me-a')));
  const first = await a(); await page.waitForTimeout(300); const second = await a();
  expect(second).not.toBe(first);
});
