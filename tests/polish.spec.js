// 1B: gaps in what already exists. Collapsed-rail beacon, field focus cues (WCAG 2.4.13), idle boundary contrast (1.4.11),
// split-footer neutral state, illumination levels, CSS-only rail axis.
const { test, expect } = require('../fixtures');
const { url, read } = require('./helpers');
const app = (page, hash = '#app') => page.goto(url('garden.html', hash));

// ---- contrast helpers (run in node on token strings read from the page)
const parse = c => {
  c = c.trim(); let m;
  if ((m = /^#([0-9a-f]{6})$/i.exec(c))) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  if ((m = /^rgba?\(([^)]+)\)$/.exec(c))) { const p = m[1].split(',').map(x => parseFloat(x)); return [p[0], p[1], p[2], p[3] ?? 1]; }
  throw new Error('colour ' + c);
};
const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const tokens = (page, names) => page.evaluate(n => { const s = getComputedStyle(document.documentElement); return Object.fromEntries(n.map(k => [k, s.getPropertyValue(k)])); }, names);

for (const theme of ['dark', 'light']) {
  test.describe(`${theme} theme`, () => {
    const hash = theme === 'light' ? '#app-light-tasks' : '#app-tasks';
    test('idle field boundary (side ticks) is at least 3:1 on every surface a field can sit on (WCAG 1.4.11)', async ({ page }) => {
      await app(page, hash);
      const t = await tokens(page, ['--tick-idle', '--color-canvas', '--color-panel', '--color-surface', '--color-overlay', '--color-text-muted']);
      const tick = parse(t['--tick-idle']), muted = parse(t['--color-text-muted']);
      for (const bg of ['--color-canvas', '--color-panel', '--color-surface', '--color-overlay']) {
        const base = parse(t[bg]);
        const tinted = [0, 1, 2].map(i => base[i] * .89 + muted[i] * .11);   // the field's own gradient wash, worst case
        for (const under of [base.slice(0, 3), tinted]) {
          const r = ratio(over(tick, under), under);
          console.log(`${theme} tick on ${bg}: ${r.toFixed(2)}`);
          expect(r, `${theme} tick on ${bg}`).toBeGreaterThanOrEqual(3);
        }
      }
    });
    test('focus cue colour is at least 3:1 against the unfocused field (2.4.13)', async ({ page }) => {
      await app(page, hash);
      const t = await tokens(page, ['--accent', '--color-panel', '--color-canvas']);
      for (const bg of ['--color-panel', '--color-canvas']) expect(ratio(parse(t['--accent']), parse(t[bg]))).toBeGreaterThanOrEqual(3);
    });
  });
}

test.describe('field focus has a second cue', () => {
  test('focused field draws a 2px bar on top and bottom as well as the side ticks', async ({ page }) => {
    await app(page, '#app-tasks');
    const a = page.locator('.me-anchor', { has: page.locator('#new-task') });
    const before = await a.evaluate(e => getComputedStyle(e).boxShadow);
    await page.locator('#new-task').focus();
    const after = await a.evaluate(e => getComputedStyle(e).boxShadow);
    expect(before).toBe('none');
    expect((after.match(/inset/g) || []).length).toBe(2);
    expect(after).toMatch(/0px 2px 0px/); expect(after).toMatch(/0px -2px 0px/);
    await expect.poll(() => a.evaluate(e => getComputedStyle(e, '::before').width)).toBe('2px');   // ticks are still there (after their .25s transition)
  });
  test('an error field keeps its signal colour when focused', async ({ page }) => {
    await app(page, '#app-beds-modal');
    await page.fill('#nb-name', ''); await page.click('#sp-bed [data-c=l]');
    await page.locator('#nb-name').focus();
    const sh = await page.locator('.me-anchor', { has: page.locator('#nb-name') }).evaluate(e => getComputedStyle(e).boxShadow);
    expect(sh).toContain('244, 63, 94');   // --err #f43f5e
  });
});

test.describe('collapsed rail beacon', () => {
  test('a count becomes a tiny vertical light-bar, the number stays in the accessible name', async ({ page }) => {
    await app(page, '#app-min');
    const badge = page.locator('#task-count');
    const box = await badge.boundingBox();
    expect(box.width).toBeLessThanOrEqual(3); expect(box.height).toBeGreaterThan(8);
    const bg = await badge.evaluate(e => getComputedStyle(e).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    const n = await badge.textContent();
    await expect(page.getByRole('button', { name: new RegExp('Tasks\\s*' + n) })).toBeVisible();
  });
  test('the beacon uses the signal colour and disappears at zero', async ({ page }) => {
    await app(page, '#app-min');
    await expect(page.locator('#task-count')).toHaveAttribute('data-signal', 'warn');
    await page.evaluate(() => { const b = document.querySelector('#task-count'); b.textContent = '0'; b.setAttribute('data-zero', ''); });
    await expect(page.locator('#task-count')).toBeHidden();
  });
  test('expanded rail still shows a normal badge', async ({ page }) => {
    await app(page, '#app');
    const box = await page.locator('#task-count').boundingBox();
    expect(box.width).toBeGreaterThan(6);
  });
});

test.describe('split footer neutral state', () => {
  test('clicking the chosen side again returns to neutral; Esc does too', async ({ page }) => {
    await page.goto(url('dashboard.html'));
    const sp = page.locator('#split');
    await sp.locator('[data-c=l]').click();
    await expect(sp).toHaveAttribute('data-chosen', 'l');
    await expect(page.locator('#status')).toContainText('ALLOCATING');
    await sp.locator('[data-c=l]').click();
    await expect(sp).not.toHaveAttribute('data-chosen', /.*/);
    await expect(sp.locator('[aria-pressed=true]')).toHaveCount(0);
    await expect(page.locator('#status')).toContainText('Awaiting');
    await sp.locator('[data-c=r]').click();
    await expect(sp).toHaveAttribute('data-chosen', 'r');
    await page.keyboard.press('Escape');
    await expect(sp).not.toHaveAttribute('data-chosen', /.*/);
  });
  test('choosing the other side still switches directly', async ({ page }) => {
    await page.goto(url('dashboard.html'));
    const sp = page.locator('#split');
    await sp.locator('[data-c=l]').click(); await sp.locator('[data-c=r]').click();
    await expect(sp).toHaveAttribute('data-chosen', 'r');
    await expect(sp.locator('[data-c=l]')).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('illumination levels', () => {
  const level = loc => loc.evaluate(e => getComputedStyle(e).getPropertyValue('--lit-level').trim());
  test('an interactive lit control gets rest / hover / pressed levels without data-lit-hover', async ({ page }) => {
    await app(page, '#app');
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'lit-x'; b.className = 'me-btn me-lit'; b.dataset.lit = 't'; b.textContent = 'Lit'; document.querySelector('#views').prepend(b); });
    const b = page.locator('#lit-x');
    expect(await level(b)).toBe('.2');
    await b.hover(); expect(await level(b)).toBe('.6');
    await page.mouse.down(); expect(await level(b)).toBe('1'); await page.mouse.up();
  });
  test('data-lit-level still overrides, and a static lit surface is not dimmed', async ({ page }) => {
    await app(page, '#app');
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'lit-y'; b.className = 'me-btn me-lit'; b.dataset.lit = 't'; b.dataset.litLevel = 'hover'; document.querySelector('#views').prepend(b); });
    expect(await level(page.locator('#lit-y'))).toBe('.55');
    expect(await level(page.locator('#um'))).toBe('');   // the user menu is a surface, not a control
  });
});

test.describe('rails lie on their side by CSS container query', () => {
  test('desktop: main rails are vertical, the footer icon group is horizontal and goes vertical when collapsed', async ({ page }) => {
    await app(page, '#app');
    await expect(page.locator('.me-rail').first()).toHaveCSS('flex-direction', 'column');
    await expect(page.locator('.me-rail[data-h]')).toHaveCSS('flex-direction', 'row');
    await page.click('[data-collapse]');
    await expect(page.locator('.me-rail[data-h]')).toHaveCSS('flex-direction', 'column');
  });
  test('no rail is switched by script', async () => {
    expect(read('garden.html')).not.toMatch(/data-axis|railMQ/);
  });
  test('the selected-item wash points across in a vertical rail and down in a horizontal one', async ({ page }) => {
    await app(page, '#app');
    const v = await page.locator('.me-rail').first().locator('[aria-current=page]').evaluate(e => getComputedStyle(e).backgroundImage);
    expect(v).toContain('90deg');
    await page.setViewportSize({ width: 600, height: 800 });
    const h = await page.locator('.me-rail').first().locator('[aria-current=page]').evaluate(e => getComputedStyle(e).backgroundImage);
    expect(h).toContain('linear-gradient');
    expect(h).not.toContain('90deg');   // default direction = top to bottom
  });
});

test('legacy me-scan keyframes are gone', () => {
  expect(read('monoedge.css')).not.toContain('me-scan');
  expect(read('tests/animations.json')).not.toContain('me-scan');
});

test('busy split button orbits like a busy button', async ({ page }) => {
  await page.goto(url('dashboard.html'));
  await page.click('#t-inf');
  await page.click('#run');
  const anim = await page.locator('#run').evaluate(e => getComputedStyle(e, '::before').animationName);
  expect(anim).toBe('me-orbit');
});

test('light mode keeps the ambient wash of a lit edge faint', async ({ page }) => {
  await app(page, '#app-light-beds-modal');
  const w = await page.locator('#dlg-bed').evaluate(e => getComputedStyle(e).getPropertyValue('--lit-wash-c'));
  expect(w).toContain('6%');
});
test('disabled calendar days are dimmed, not struck through', async ({ page }) => {
  await app(page, '#app-beds-modal-date');
  const d = page.locator('.me-cal:popover-open .me-cal-day:disabled').first();
  expect(await d.evaluate(e => getComputedStyle(e).textDecorationLine)).toBe('none');
});
test('upload drop zone text is centred and close together', async ({ page }) => {
  await app(page, '#app-components');
  const b = await page.locator('#c-up .me-drop > span').evaluateAll(a => a.map(e => e.getBoundingClientRect()));
  expect(b[1].top - b[0].bottom).toBeLessThan(12);
});
