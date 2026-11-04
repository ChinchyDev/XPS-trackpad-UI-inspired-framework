// garden.html is the deployment of the framework: every behaviour and every design RULE is checked here.
// Rule numbers refer to TODO.md "Round 4: DESIGN RULES".
const { test, expect } = require('@playwright/test');
const { url } = require('./helpers');

const app = (page, hash = '#app') => page.goto(url('garden.html', hash));

test.describe('login flow', () => {
  test('wrong password shows an error alert', async ({ page }) => {
    await page.goto(url('garden.html'));
    await page.fill('#email', 'admin@plotline.io'); await page.fill('#pw', 'nope');
    await page.click('#login-btn');
    await expect(page.locator('#login-err')).toBeVisible();
    await expect(page.locator('#login-err')).toHaveAttribute('data-signal', 'err');
  });
  test('empty submit flags both fields', async ({ page }) => {
    await page.goto(url('garden.html')); await page.click('#login-btn');
    await expect(page.locator('#f-email')).toHaveAttribute('data-signal', 'err');
    await expect(page.locator('#f-pw')).toHaveAttribute('data-signal', 'err');
  });
  test('correct credentials enter the app and show a notch toast', async ({ page }) => {
    await page.goto(url('garden.html'));
    await page.fill('#email', 'admin@plotline.io'); await page.fill('#pw', 'garden');
    await page.click('#login-btn');
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#toasts .me-alert')).toHaveAttribute('data-signal', 'ok');
  });
  test('theme toggle on login carries into the app', async ({ page }) => {
    await page.goto(url('garden.html'));
    await page.click('.login-theme [data-v=light]');
    await page.fill('#email', 'admin@plotline.io'); await page.fill('#pw', 'garden'); await page.click('#login-btn');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('#seg-theme [data-v=light]')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('app behaviour', () => {
  test('side rail switches views and keeps exactly one aria-current', async ({ page }) => {
    await app(page);
    for (const v of ['beds', 'irrigation', 'tasks', 'users', 'overview']) {
      await page.click(`.me-side [data-view=${v}]`);
      await expect(page.locator(`.me-side [data-view=${v}]`)).toHaveAttribute('aria-current', 'page');
      await expect(page.locator(`#views > [data-v=${v}]`)).toBeVisible();
      await expect(page.locator('.me-side [aria-current=page]')).toHaveCount(1);
    }
  });
  test('sidebar collapses to an icon rail and back', async ({ page }) => {
    await app(page);
    const w = () => page.locator('.me-side').evaluate(e => e.getBoundingClientRect().width);
    expect(await w()).toBeGreaterThan(200);
    await page.click('[data-collapse]');
    await expect.poll(w).toBeLessThan(80);
    await expect(page.locator('[data-collapse]')).toHaveAttribute('aria-expanded', 'false');
    await page.hover('.me-side [data-view=beds]');
    await expect(page.locator('.me-side [data-view=beds] .me-side-txt')).toBeVisible();
    await page.click('[data-collapse]');
    await expect.poll(w).toBeGreaterThan(200);
  });
  test('beds: select a row, add a bed with validation', async ({ page }) => {
    await app(page, '#app-beds');
    const rows = page.locator('#bed-t tbody tr');
    expect(await rows.count()).toBeGreaterThan(3);
    await rows.nth(1).click();
    await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.click('#add-bed');
    await expect(page.locator('#dlg-bed')).toBeVisible();
    await page.fill('#nb-name', ''); await page.click('#sp-bed [data-c=l]');
    await expect(page.locator('#nb-name-f')).toHaveAttribute('data-signal', 'err');
    await page.fill('#nb-name', 'Test bed'); await page.fill('#nb-area', '6'); await page.click('#sp-bed [data-c=l]');
    await expect(page.locator('#dlg-bed')).toBeHidden();
    await expect(page.locator('#bed-t')).toContainText('Test bed');
  });
  test('irrigation: switch toggles, run shows busy then clears', async ({ page }) => {
    await app(page, '#app-irrigation');
    const sw = page.locator('#zones .me-switch').first();
    const was = await sw.getAttribute('aria-checked'); await sw.click();
    await expect(sw).not.toHaveAttribute('aria-checked', was);
    const run = page.locator('#zones [data-run]').first(); await run.click();
    await expect(run).toHaveAttribute('aria-busy', 'true');
    await expect(run).not.toHaveAttribute('aria-busy', 'true', { timeout: 8000 });
  });
  test('tasks: checkbox toggles completed state', async ({ page }) => {
    await app(page, '#app-tasks');
    const was = await page.locator('#task-list .me-check').first().isChecked();
    await page.locator('#task-list .me-check').first().click();
    expect(await page.locator('#task-list .me-check').first().isChecked()).toBe(!was);
  });
  test('users: destructive dialog focuses the SAFE action', async ({ page }) => {
    await app(page, '#app-users-del');
    await expect(page.locator('#dlg-del')).toBeVisible();
    await expect(page.locator('#dlg-del [autofocus]')).toBeFocused();
  });
  test('Esc closes a dialog and the user menu', async ({ page }) => {
    await app(page, '#app-beds-modal'); await page.keyboard.press('Escape');
    await expect(page.locator('#dlg-bed')).toBeHidden();
    await page.click('#um-btn'); await expect(page.locator('#um')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.locator('#um')).toBeHidden();
  });
});

test.describe('design rules', () => {
  for (const theme of ['dark', 'light']) {
    const hash = theme === 'dark' ? '#app' : '#app-light';

    test(`R1 backgrounds are never pure black or white (${theme})`, async ({ page }) => {
      await app(page, hash);
      const t = await page.evaluate(() => { const cs = getComputedStyle(document.body);
        return ['--color-canvas', '--color-panel', '--color-surface', '--color-overlay'].map(k => cs.getPropertyValue(k).trim().toLowerCase()); });
      for (const c of t) expect(['#000', '#000000', '#fff', '#ffffff']).not.toContain(c);
    });

    test(`radius: nothing exceeds 4px (${theme})`, async ({ page }) => {
      await app(page, hash + '-beds');
      const bad = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.offsetParent !== null).map(e => {
        const c = getComputedStyle(e);
        return [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomLeftRadius, c.borderBottomRightRadius].map(parseFloat).some(r => r > 4) ? e.tagName + '.' + e.className : null; }).filter(Boolean));
      expect(bad).toEqual([]);
    });

    test(`R4 every alert is full perimeter (${theme})`, async ({ page }) => {
      await app(page, hash);
      const alerts = page.locator('#views .me-alert:visible');
      expect(await alerts.count()).toBeGreaterThan(0);
      for (const a of await alerts.all()) {
        const v = await a.evaluate(e => ['--lit-t', '--lit-r', '--lit-b', '--lit-l'].map(k => getComputedStyle(e).getPropertyValue(k).trim()));
        for (const x of v) expect(x).not.toMatch(/^(none|)$/);
      }
    });
  }

  test('R2/R3 rail: selected item lights, siblings do not, dividers are detached', async ({ page }) => {
    await app(page);
    const op = sel => page.locator(sel).evaluate(e => +getComputedStyle(e, '::before').opacity);
    expect(await op('.me-side [data-view=overview]')).toBe(1);
    expect(await op('.me-side [data-view=irrigation]')).toBe(0);
    const d = await page.locator('.me-side [data-view=beds]').evaluate(e => { const c = getComputedStyle(e, '::after'); return { left: c.left, right: c.right, h: c.height }; });
    expect(parseFloat(d.left)).toBeGreaterThan(8); expect(parseFloat(d.right)).toBeGreaterThan(8); expect(d.h).toBe('1px');
  });

  test('R5 notification is a top-centre notch lit on the bottom edge only', async ({ page }) => {
    await app(page);
    await page.click('.me-side [data-view=tasks]'); await page.fill('#new-task', 'notch test'); await page.keyboard.press('Enter');
    const t = page.locator('#toasts .me-alert'); await expect(t).toBeVisible();
    await page.waitForTimeout(1700);
    const info = await t.evaluate(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return { top: r.top, centre: r.left + r.width / 2, vw: innerWidth, t: cs.getPropertyValue('--lit-t').trim(), l: cs.getPropertyValue('--lit-l').trim(),
        r: cs.getPropertyValue('--lit-r').trim(), b: cs.getPropertyValue('--lit-b').trim(), tl: cs.borderTopLeftRadius, bl: cs.borderBottomLeftRadius }; });
    expect(info.top).toBeLessThanOrEqual(1);
    expect(Math.abs(info.centre - info.vw / 2)).toBeLessThan(2);
    expect([info.t, info.l, info.r]).toEqual(['none', 'none', 'none']);
    expect(info.b).not.toBe('none');
    expect(info.tl).toBe('0px'); expect(info.bl).toBe('4px');
    await expect(t).toHaveClass(/is-out/, { timeout: 8000 });
  });

  test('R8 checkbox emits no light; switch ON has a trail', async ({ page }) => {
    await app(page, '#app-tasks');
    const pseudo = await page.locator('.me-check').first().evaluate(e => getComputedStyle(e, '::before').content);
    expect(['none', 'normal']).toContain(pseudo);
    await app(page, '#app-irrigation');
    const on = page.locator('#zones .me-switch[aria-checked=true]').first();
    expect(await on.evaluate(e => getComputedStyle(e).backgroundImage)).toContain('linear-gradient');
  });

  test('R9 table hover and selected rows are visibly different', async ({ page }) => {
    await app(page, '#app-beds');
    const rows = page.locator('#bed-t tbody tr');
    await rows.nth(2).click(); await rows.nth(4).hover(); await page.waitForTimeout(400);
    const bar = r => r.locator('td').first().evaluate(e => { const c = getComputedStyle(e, '::before'); return { o: +c.opacity, w: parseFloat(c.width) }; });
    const sel = await bar(rows.nth(2)), hov = await bar(rows.nth(4));
    expect(sel.o).toBe(1); expect(hov.o).toBeGreaterThan(0.2); expect(hov.o).toBeLessThan(0.6); expect(sel.w).toBeGreaterThan(hov.w);
  });

  test('keyboard: rail items are reachable in order with a visible focus ring', async ({ page }) => {
    await app(page);
    await page.locator('.me-side [data-view=overview]').focus();
    for (const v of ['beds', 'irrigation']) {
      await page.keyboard.press('Tab');
      await expect(page.locator(`.me-side [data-view=${v}]`)).toBeFocused();
      const o = await page.locator(`.me-side [data-view=${v}]`).evaluate(e => getComputedStyle(e).outlineStyle);
      expect(o).not.toBe('none');
    }
  });
});

test.describe('responsive @responsive', () => {
  test('no horizontal page scroll; rails lie on their side', async ({ page }) => {
    await app(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator('.me-rail').first()).toHaveAttribute('data-axis', 'x');
    await page.click('.me-side [data-view=beds]');
    await expect(page.locator('.me-side [data-view=beds]')).toBeInViewport();
  });
  test('touch targets are at least 44px', async ({ page }) => {
    await app(page);
    const small = await page.evaluate(() => [...document.querySelectorAll('.me-side button, .me-btn, .me-switch')].filter(e => e.offsetParent)
      .map(e => [e.className, e.getBoundingClientRect().height]).filter(([, h]) => h < 43));
    expect(small).toEqual([]);
  });
});
