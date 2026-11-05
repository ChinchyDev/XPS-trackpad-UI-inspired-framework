// monoedge.js components exercised in garden.html: chart variants, date picker, combobox / multi-select / tag input,
// command palette, file upload, tabs overflow, tree, toolbar, wizard. (axe for these states lives in a11y.spec.js)
const { test, expect } = require('../fixtures');
const { url } = require('./helpers');

const app = (page, hash = '#app') => page.goto(url('garden.html', hash));
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test.describe('chart variants', () => {
  test.beforeEach(async ({ page }) => { await app(page, '#app-telemetry'); });
  test('no chart renders NaN', async ({ page }) => {
    const bad = await page.evaluate(() => [...document.querySelectorAll('#views svg.me-chart-svg')].filter(s => /NaN|undefined/.test(s.outerHTML)).length);
    expect(bad).toBe(0);
  });
  test('comparison: two series, a dashed alt series, legend, y axis and a text table', async ({ page }) => {
    const c = page.locator('#ch-cmp');
    await expect(c.locator('path.line')).toHaveCount(2);
    await expect(c.locator('g[data-alt] path.line')).toHaveCount(1);
    await expect(c.locator('.me-legend li')).toHaveCount(2);
    expect(await c.locator('.me-chart-y span').count()).toBeGreaterThanOrEqual(3);
    await expect(c.locator('table.me-sr tbody tr')).toHaveCount(7);
    const dash = await c.locator('g[data-alt] path.line').evaluate(e => getComputedStyle(e).strokeDasharray);
    expect(dash).not.toBe('none');
  });
  test('only the first series gets an area wash', async ({ page }) => {
    await expect(page.locator('#ch-cmp path.area')).toHaveCount(1);
  });
  test('stepped line uses horizontal and vertical segments only', async ({ page }) => {
    const d = await page.locator('#ch-step path.line').first().getAttribute('d');
    expect(d).toMatch(/H[\d.]+V/); expect(d).not.toMatch(/L/);
  });
  test('below-zero data draws a zero line and negative axis labels', async ({ page }) => {
    const c = page.locator('#ch-temp');
    await expect(c.locator('line.zero')).toHaveCount(1);
    expect((await c.locator('.me-chart-y').innerText())).toContain('-');
  });
  test('null readings break the line into separate segments', async ({ page }) => {
    await expect(page.locator('#ch-gap path.line')).toHaveCount(2);
  });
  test('large numbers use compact axis labels, tooltips keep the full value', async ({ page }) => {
    const c = page.locator('#ch-big');
    expect(await c.locator('.me-chart-y').innerText()).toMatch(/\dM|\dk/);
    expect(await c.locator('rect.hit').last().locator('title').textContent()).toContain('1,840,000');
  });
  test('dense series: one hit target per point, only a handful of x labels', async ({ page }) => {
    const c = page.locator('#ch-dense');
    await expect(c.locator('rect.hit')).toHaveCount(90);
    await expect(c.locator('.me-chart-x span')).toHaveCount(6);
  });
  test('edge cases: single reading, flat line, empty state', async ({ page }) => {
    await expect(page.locator('#ch-one rect.solo')).toHaveCount(1);
    await expect(page.locator('#ch-flat path.line')).toHaveCount(1);
    await expect(page.locator('#ch-empty .me-empty')).toContainText('No readings yet');
  });
  test('axis ticks sit on round numbers even when min and max are given', async ({ page }) => {
    const txt = await page.locator('#ch-moist .me-chart-y').innerText();
    expect(txt).not.toMatch(/\.\d/);
    expect(txt.split(/\s+/).filter(Boolean).map(Number).every(n => n % 5 === 0)).toBe(true);
  });
  test('hovering a column reveals a square marker', async ({ page }) => {
    const c = page.locator('#ch-water');
    await c.locator('rect.hit').nth(3).hover();
    await expect(c.locator('g.col').nth(3).locator('rect.pt')).toHaveCSS('opacity', '1');
  });
  test('overview stat cards carry sparklines', async ({ page }) => {
    await app(page, '#app');
    await expect(page.locator('#sp-moist path.line')).toHaveCount(1);
    await expect(page.locator('#sp-water path.line')).toHaveCount(1);
  });
  test('dashboard.html telemetry shows the chart (placeholder replaced)', async ({ page }) => {
    await page.goto(url('dashboard.html'));
    await page.click('#t-tele');
    await expect(page.locator('#tps path.line')).toHaveCount(2);
    await expect(page.locator('#tps .me-legend li')).toHaveCount(2);
    await expect(page.locator('#p-tele .me-empty')).toHaveCount(0);
  });
});

test.describe('date and time picker', () => {
  const trig = '#dlg-bed button[aria-label="Choose date"]';
  test('opens from the trigger, picks a day with the mouse, writes ISO text', async ({ page }) => {
    await app(page, '#app-beds-modal');
    await page.click(trig);
    await expect(page.locator('.me-cal:popover-open')).toBeVisible();
    await expect(page.locator(trig)).toHaveAttribute('aria-expanded', 'true');
    const target = new Date(); target.setDate(target.getDate() + 3);
    await page.locator('.me-cal:popover-open .me-cal-day:not([disabled])').last().click();
    await expect(page.locator('.me-cal:popover-open')).toBeHidden();
    await expect(page.locator('#nb-harv')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    await expect(page.locator('#dlg-bed')).toHaveJSProperty('open', true);   // the dialog stayed open
  });
  test('keyboard: arrows move, PageDown changes month, Escape closes only the picker', async ({ page }) => {
    await app(page, '#app-beds-modal');
    await page.click(trig);
    const start = await page.evaluate(() => document.activeElement.dataset.date);
    await page.keyboard.press('ArrowRight');
    const next = await page.evaluate(() => document.activeElement.dataset.date);
    expect(next).not.toBe(start);
    const title = await page.locator('.me-cal:popover-open .me-cal-title').textContent();
    await page.keyboard.press('PageDown');
    expect(await page.locator('.me-cal:popover-open .me-cal-title').textContent()).not.toBe(title);
    await page.keyboard.press('Escape');
    await expect(page.locator('.me-cal:popover-open')).toBeHidden();
    await expect(page.locator('#dlg-bed')).toHaveJSProperty('open', true);
    await expect(page.locator('#nb-harv')).toBeFocused();
  });
  test('past days are disabled when a minimum is set', async ({ page }) => {
    await app(page, '#app-beds-modal');
    await page.click(trig);
    const y = new Date(); y.setDate(y.getDate() - 1);
    await expect(page.locator(`.me-cal:popover-open .me-cal-day[data-date="${iso(y)}"]`)).toBeDisabled();
    await expect(page.locator('.me-cal:popover-open .me-cal-day[aria-current="date"]')).toBeEnabled();
  });
  test('typed text is validated', async ({ page }) => {
    await app(page, '#app-beds-modal');
    await page.fill('#nb-harv', 'soon'); await page.locator('#nb-harv').blur();
    await expect(page.locator('#nb-harv')).toHaveAttribute('aria-invalid', 'true');
    await page.fill('#nb-harv', '2099-01-31'); await page.locator('#nb-harv').blur();
    await expect(page.locator('#nb-harv')).toHaveAttribute('aria-invalid', 'false');
  });
  test('harvest date feeds the new bed', async ({ page }) => {
    await app(page, '#app-beds');
    await page.click('#add-bed');
    await page.fill('#nb-name', 'Date bed');
    const d = new Date(); d.setDate(d.getDate() + 5);
    await page.fill('#nb-harv', iso(d)); await page.locator('#nb-harv').blur();
    await page.click('#sp-bed [data-c=l]');
    await expect(page.locator('#toasts .me-alert')).toContainText('Date bed');
    await expect(page.locator('#dlg-bed')).not.toHaveJSProperty('open', true);
    await page.fill('#search', 'Date bed');
    await expect(page.locator('#bed-t tbody tr')).toContainText('Harvest soon');
  });
  test('time mode adds hour and minute selects and writes HH:MM', async ({ page }) => {
    await app(page, '#app-components');
    await page.click('#c-dt + button');
    await page.locator('.me-cal:popover-open .me-cal-day:not([disabled])').nth(10).click();
    await page.selectOption('.me-cal:popover-open select[aria-label=Hour]', '14');
    await page.selectOption('.me-cal:popover-open select[aria-label=Minute]', '30');
    await expect(page.locator('#c-dt')).toHaveValue(/ 14:30$/);
    await page.click('.me-cal:popover-open [data-done]');
    await expect(page.locator('.me-cal:popover-open')).toBeHidden();
  });
  test('task due date shows on the new task', async ({ page }) => {
    await app(page, '#app-tasks');
    const t = new Date(); t.setDate(t.getDate() + 2);
    await page.fill('#new-due', iso(t));
    await page.fill('#new-task', 'Pick beans'); await page.keyboard.press('Enter');
    const row = page.locator('#task-list .task').first();
    await expect(row).toContainText('Pick beans');
    await expect(row.locator('.me-badge')).not.toHaveText('Today');
  });
});

test.describe('combobox, multi-select, tag input', () => {
  test('crop combobox filters, highlights, and picks with the keyboard', async ({ page }) => {
    await app(page, '#app-beds-modal');
    const i = page.locator('#nb-crop');
    await i.fill('to');
    await expect(i).toHaveAttribute('role', 'combobox');
    await expect(i).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.me-option').first()).toContainText('Tomato');
    await expect(page.locator('.me-option mark').first()).toHaveText('To');
    await i.press('ArrowDown'); await i.press('Enter');
    await expect(i).toHaveValue('Tomato');
    await expect(i).toHaveAttribute('aria-expanded', 'false');
  });
  test('active option is exposed through aria-activedescendant', async ({ page }) => {
    await app(page, '#app-beds-modal');
    const i = page.locator('#nb-crop'); await i.fill('a'); await i.press('ArrowDown');
    const id = await i.getAttribute('aria-activedescendant'); expect(id).toBeTruthy();
    await expect(page.locator('#' + id)).toHaveAttribute('data-active', '');
  });
  test('Escape closes the list but not the dialog; a free-text crop is allowed', async ({ page }) => {
    await app(page, '#app-beds-modal');
    const i = page.locator('#nb-crop'); await i.fill('Dragon fruit');
    await expect(page.locator('.me-option-empty')).toBeVisible();
    await i.press('Escape');
    await expect(page.locator('#dlg-bed')).toHaveJSProperty('open', true);
    await expect(i).toHaveValue('Dragon fruit');
  });
  test('global search suggests beds, crops and people, and filters the table', async ({ page }) => {
    await app(page, '#app');
    await page.fill('#search', 'sam');
    await expect(page.locator('.me-option-group', { hasText: 'People' })).toBeVisible();
    await page.fill('#search', 'tomato');
    await expect(page.locator('.me-option', { hasText: 'Tomato row 1' })).toBeVisible();
    await page.locator('.me-option', { hasText: 'Tomato row 1' }).click();
    await expect(page.locator('#views > [data-v=beds]')).toBeVisible();
    await expect(page.locator('#bed-t tbody tr')).toHaveCount(1);
  });
  test('multi-select: pre-filled tags, toggle an option, remove a tag, Backspace removes the last', async ({ page }) => {
    await app(page, '#app-components');
    const i = page.locator('#c-crops'), tags = page.locator('#c-crops').locator('xpath=..').locator('.me-tag');
    await expect(tags).toHaveCount(2);
    await i.click(); await i.fill('kale'); await i.press('ArrowDown'); await i.press('Enter');
    await expect(tags).toHaveCount(3);
    await expect(i).toHaveValue('');
    await expect(page.locator('.me-listbox[aria-label="Crops in rotation"]')).toBeVisible();
    await tags.first().locator('button').click();
    await expect(tags).toHaveCount(2);
    await i.focus(); await i.press('Backspace');
    await expect(tags).toHaveCount(1);
  });
  test('tag input adds on Enter and on comma, and ignores duplicates', async ({ page }) => {
    await app(page, '#app-components');
    const i = page.locator('#c-tags'), tags = i.locator('xpath=..').locator('.me-tag');
    await expect(tags).toHaveCount(1);
    await i.fill('organic'); await i.press('Enter');
    await i.fill('shaded'); await i.press(',');
    await expect(tags).toHaveCount(3);
    await i.fill('organic'); await i.press('Enter');
    await expect(tags).toHaveCount(3);
  });
});

test.describe('command palette', () => {
  test('Ctrl+K opens, filters, Enter jumps to the view, Escape closes', async ({ page }) => {
    await app(page, '#app');
    await page.keyboard.press('Control+k');
    await expect(page.locator('#dlg-pal')).toBeVisible();
    await expect(page.locator('#pal-q')).toBeFocused();
    await page.keyboard.type('tele');
    await expect(page.locator('#pal-list .me-option').first()).toContainText('Telemetry');
    await page.keyboard.press('Enter');
    await expect(page.locator('#dlg-pal')).toBeHidden();
    await expect(page.locator('#views > [data-v=telemetry]')).toBeVisible();
    await page.keyboard.press('Control+k'); await page.keyboard.press('Escape');
    await expect(page.locator('#dlg-pal')).toBeHidden();
  });
  test('jump to a bed by name and run an action', async ({ page }) => {
    await app(page, '#app');
    await page.click('#pal-btn'); await page.keyboard.type('carrot'); await page.keyboard.press('Enter');
    await expect(page.locator('#bed-t tbody tr')).toHaveCount(1);
    await page.keyboard.press('Control+k'); await page.keyboard.type('light theme'); await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
  test('arrow keys move the active option; grouped results; empty state', async ({ page }) => {
    await app(page, '#app-pal');
    await expect(page.locator('#dlg-pal')).toBeVisible();
    await expect(page.locator('#pal-list .me-option-group').first()).toBeVisible();
    const first = await page.locator('#pal-q').getAttribute('aria-activedescendant');
    await page.keyboard.press('ArrowDown');
    expect(await page.locator('#pal-q').getAttribute('aria-activedescendant')).not.toBe(first);
    await page.keyboard.type('zzzz');
    await expect(page.locator('.me-option-empty')).toBeVisible();
  });
  test('palette does not open on the login screen', async ({ page }) => {
    await page.goto(url('garden.html'));
    await page.keyboard.press('Control+k');
    await expect(page.locator('#dlg-pal')).toBeHidden();
  });
});

test.describe('file upload', () => {
  test('accepts an image, shows a thumbnail, lets you remove it', async ({ page }) => {
    await app(page, '#app-beds-modal');
    await page.setInputFiles('#nb-photo input[type=file]', { name: 'bed.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.locator('#nb-photo .me-file')).toHaveCount(1);
    await expect(page.locator('#nb-photo .me-thumb')).toHaveCount(1);
    await page.click('#nb-photo .me-file button');
    await expect(page.locator('#nb-photo .me-file')).toHaveCount(0);
  });
  test('rejects the wrong type and oversize files with an alert', async ({ page }) => {
    await app(page, '#app-beds-modal');
    await page.setInputFiles('#nb-photo input[type=file]', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
    await expect(page.locator('#nb-photo')).toHaveAttribute('data-signal', 'err');
    await expect(page.locator('#nb-photo .me-error-msg')).toContainText('not an accepted file type');
    await expect(page.locator('#nb-photo .me-file')).toHaveCount(0);
    await page.setInputFiles('#nb-photo input[type=file]', { name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(5.5 * 1048576) });
    await expect(page.locator('#nb-photo .me-error-msg')).toContainText('larger than 5.0 MB');
    await page.setInputFiles('#nb-photo input[type=file]', { name: 'ok.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.locator('#nb-photo')).not.toHaveAttribute('data-signal', 'err');
  });
  test('multiple mode keeps every valid file; single mode replaces', async ({ page }) => {
    await app(page, '#app-components');
    await page.setInputFiles('#c-up input[type=file]', [{ name: 'a.png', mimeType: 'image/png', buffer: PNG }, { name: 'b.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') }]);
    await expect(page.locator('#c-up .me-file')).toHaveCount(2);
    await app(page, '#app-beds-modal');
    await page.setInputFiles('#nb-photo input[type=file]', { name: 'a.png', mimeType: 'image/png', buffer: PNG });
    await page.setInputFiles('#nb-photo input[type=file]', { name: 'b.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.locator('#nb-photo .me-file')).toHaveCount(1);
    await expect(page.locator('#nb-photo .me-file-name')).toHaveText('b.png');
  });
  test('the drop zone shows a frame at rest (locatable) and lights while dragging', async ({ page }) => {
    await app(page, '#app-components');
    const d = page.locator('#c-up .me-drop');
    expect(await d.evaluate(e => getComputedStyle(e).borderTopStyle)).toBe('dashed');
    await d.dispatchEvent('dragenter');
    await expect(d).toHaveAttribute('data-over', '');
    expect(await d.evaluate(e => getComputedStyle(e).borderTopStyle)).toBe('solid');
  });
  test('keyboard focus lights the drop zone', async ({ page }) => {
    await app(page, '#app-components');
    await page.locator('#c-up input').focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    expect(await page.locator('#c-up .me-drop').evaluate(e => getComputedStyle(e).borderTopStyle)).toBe('solid');
  });
});

test.describe('tabs overflow hint', () => {
  test('a clipped tab strip reports hidden tabs on the right, then on the left', async ({ page }) => {
    await app(page, '#app-components');
    const t = page.locator('#c-tabs');
    await expect(t).toHaveAttribute('data-more', 'end');
    expect(await t.evaluate(e => getComputedStyle(e).maskImage)).toContain('gradient');
    await t.evaluate(e => { e.scrollLeft = e.scrollWidth; });
    await expect(t).toHaveAttribute('data-more', 'start');
  });
  test('focusing a clipped tab scrolls it into view', async ({ page }) => {
    await app(page, '#app-components');
    await page.locator('#ct-0').focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    await expect(page.locator('#ct-6')).toHaveAttribute('aria-selected', 'true');
    const vis = await page.evaluate(() => { const t = document.querySelector('#c-tabs').getBoundingClientRect(), b = document.querySelector('#ct-6').getBoundingClientRect(); return b.right <= t.right + 1; });
    expect(vis).toBe(true);
  });
  test('a strip that fits has no hint', async ({ page }) => {
    await app(page, '#app-users');
    await expect(page.locator('#user-tabs')).not.toHaveAttribute('data-more', /.*/);
  });
});

test.describe('tree view', () => {
  test('click expands and selects; arrow keys walk the tree', async ({ page }) => {
    await app(page, '#app-components');
    const south = page.locator('#c-tree > [role=treeitem]').nth(1);
    await expect(south).toHaveAttribute('aria-expanded', 'false');
    await south.locator('> .me-tree-row').click();
    await expect(south).toHaveAttribute('aria-expanded', 'true');
    await expect(south).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#c-tree-out')).toContainText('South');
    await page.keyboard.press('ArrowDown');
    await expect(south.locator('[role=treeitem]').first()).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(south).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(south).toHaveAttribute('aria-expanded', 'false');
  });
  test('only one treeitem is in the tab order (roving tabindex)', async ({ page }) => {
    await app(page, '#app-components');
    expect(await page.locator('#c-tree [role=treeitem][tabindex="0"]').count()).toBe(1);
  });
  test('selected and hover rows look different (rule 9)', async ({ page }) => {
    await app(page, '#app-components');
    const first = page.locator('#c-tree > [role=treeitem]').first();
    await first.locator('> .me-tree-row').click();
    const sel = await first.locator('> .me-tree-row').evaluate(e => getComputedStyle(e).boxShadow);
    const other = page.locator('#c-tree > [role=treeitem]').nth(2).locator('> .me-tree-row');
    await other.hover();
    const hov = await other.evaluate(e => getComputedStyle(e).boxShadow);
    expect(sel).not.toBe(hov);
  });
});

test.describe('toolbar', () => {
  test('roving focus with arrows; toggles change the note', async ({ page }) => {
    await app(page, '#app-components');
    const tb = page.locator('#c-tb');
    expect(await tb.locator('button[tabindex="0"]').count()).toBe(1);
    await tb.locator('button').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tb.locator('button').nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(tb.locator('button').last()).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tb.locator('button').first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tb.locator('[data-fmt=bold]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#c-note')).toHaveCSS('font-weight', '700');
    await tb.locator('[data-al=center]').click();
    await expect(tb.locator('[data-al=left]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#c-note')).toHaveCSS('text-align', 'center');
  });
});

test.describe('stepper / wizard', () => {
  test('moves through steps, blocks an empty crop, marks completed steps, finishes with a toast', async ({ page }) => {
    await app(page, '#app-components');
    const steps = page.locator('#wiz .me-steps > li');
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('#wiz [data-back]')).toBeDisabled();
    await page.click('#wiz [data-next]');
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(steps.nth(0)).toHaveAttribute('data-done', '');
    await page.click('#wiz [data-next]');
    await expect(page.locator('#w-crop-f')).toHaveAttribute('data-signal', 'err');
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await page.fill('#w-crop', 'Kale');
    await page.click('#wiz [data-next]');
    await expect(steps.nth(2)).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('#w-sum')).toContainText('Kale in the North zone');
    await expect(page.locator('#wiz [data-next]')).toHaveText('Create bed');
    await page.click('#wiz [data-next]');
    await expect(page.locator('#toasts .me-alert')).toContainText('Bed created');
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
  });
  test('Back returns to the previous step and clears its done mark', async ({ page }) => {
    await app(page, '#app-components');
    await page.click('#wiz [data-next]'); await page.click('#wiz [data-back]');
    await expect(page.locator('#wiz .me-steps > li').nth(0)).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('#wiz .me-steps > li[data-done]')).toHaveCount(0);
  });
});

test.describe('library design rules', () => {
  test('nothing in the new components exceeds the 4px radius cap', async ({ page }) => {
    await app(page, '#app-components');
    await page.click('#c-date + button');
    const worst = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('#views *, .me-pop, .me-pop *')].map(e => parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0)));
    expect(worst).toBeLessThanOrEqual(4);
  });
  test('popover inherits the theme (light)', async ({ page }) => {
    await app(page, '#app-light-components');
    await page.click('#c-date + button');
    const bg = await page.locator('.me-cal:popover-open').evaluate(e => getComputedStyle(e).backgroundColor);
    expect(bg).toBe('rgb(244, 246, 247)');   // light overlay #f4f6f7
  });
});
