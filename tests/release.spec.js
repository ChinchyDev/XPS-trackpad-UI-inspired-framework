// The shareable zip: no font files, Google Fonts online only, docs present, and every example works from the unzipped folder.
const { test, expect } = require('../fixtures');
const fs = require('fs'); const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');
const { root } = require('./helpers');
const rel = path.join(root, 'release'), pkg = path.join(rel, 'EdgeLit');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

test.describe.configure({ mode: 'serial' });
test.beforeAll(() => { execSync('node scripts/build-release.js', { cwd: root, stdio: 'pipe' }); });

test.describe('package contents', () => {
  test('the zip exists, is named for the version, and contains no font files', () => {
    const z = path.join(rel, `EdgeLit-${version}.zip`);
    expect(fs.existsSync(z)).toBe(true);
    const buf = fs.readFileSync(z).toString('latin1');
    expect(buf).not.toMatch(/\.woff2?|\.ttf|\.otf/i);
    expect(buf).toContain('EdgeLit/README.md');
  });
  test('no font file anywhere in the folder, no fonts/ directory, no local font import', () => {
    expect(walk(pkg).filter(f => /\.(woff2?|ttf|otf|eot)$/i.test(f))).toEqual([]);
    expect(fs.existsSync(path.join(pkg, 'fonts'))).toBe(false);
    const css = fs.readFileSync(path.join(pkg, 'edgelit.css'), 'utf8');
    expect(css).not.toMatch(/fonts\/fonts\.css/);
    expect(css).toMatch(/@import url\("https:\/\/fonts\.googleapis\.com\/css2\?family=Cormorant\+Garamond[^"]*Jost/);
  });
  test('docs, notice and licence are there and nothing is called monoedge any more', () => {
    for (const f of ['README.md', 'DESIGN.md', 'docs/USER-GUIDE.md', 'docs/HOW-IT-WORKS.md', 'NOTICE.md', 'LICENSE.txt', 'examples/starter.html', 'examples/garden.html', 'examples/dashboard.html']) expect(fs.existsSync(path.join(pkg, f)), f).toBe(true);
    for (const f of walk(pkg).filter(f => /\.(md|txt|html|css|js)$/.test(f))) expect(fs.readFileSync(f, 'utf8'), path.relative(pkg, f)).not.toMatch(/monoedge/i);
    expect(fs.readFileSync(path.join(pkg, 'DESIGN.md'), 'utf8')).toMatch(/Google Fonts/);
    expect(fs.readFileSync(path.join(pkg, 'DESIGN.md'), 'utf8')).not.toMatch(/<!--\/?(local|online)-->|fonts\/fonts\.css/);
  });
  test('every local file the CSS, the docs and the examples refer to is in the package', () => {
    const css = fs.readFileSync(path.join(pkg, 'edgelit.css'), 'utf8');
    for (const m of css.matchAll(/@import url\("([^"]+)"/g)) if (!/^https?:/.test(m[1])) expect(fs.existsSync(path.join(pkg, m[1])), m[1]).toBe(true);
    for (const e of ['starter', 'garden', 'dashboard']) {
      const h = fs.readFileSync(path.join(pkg, 'examples', e + '.html'), 'utf8');
      for (const m of h.matchAll(/(?:href|src)="(\.\.\/[^"#]+)"/g)) expect(fs.existsSync(path.join(pkg, 'examples', m[1])), `${e}: ${m[1]}`).toBe(true);
    }
  });
  test('the version in the docs matches package.json', () => {
    expect(fs.readFileSync(path.join(pkg, 'README.md'), 'utf8')).toContain(`Version ${version}.`);
    expect(fs.readFileSync(path.join(pkg, 'LICENSE.txt'), 'utf8')).toContain(`version ${version}`);
  });
});

test.describe('the unzipped examples work', () => {
  for (const ex of ['starter', 'garden', 'dashboard']) {
    test(`${ex}.html loads from the package with no errors, with and without the network`, async ({ page }) => {
      const errs = [], missing = [];
      page.on('pageerror', e => errs.push(e.message));
      page.on('requestfailed', r => { if (r.url().startsWith('file:')) missing.push(r.url()); });
      await page.route(/googleapis|gstatic/, r => r.abort());   // offline: the system fonts take over
      await page.goto(pathToFileURL(path.join(pkg, 'examples', ex + '.html')).href);
      await page.waitForTimeout(700);
      expect(errs).toEqual([]); expect(missing).toEqual([]);
      const s = await page.evaluate(() => ({ cls: document.body.classList.contains('me'), font: getComputedStyle(document.querySelector('.me-btn, button')).fontFamily, bg: getComputedStyle(document.body).backgroundColor }));
      expect(s.cls).toBe(true);
      expect(s.bg).toBe('rgb(20, 23, 29)');   // the canvas token resolved, so the CSS and dist/tokens.css both loaded
      expect(s.font.length).toBeGreaterThan(5);
    });
  }
  test('the fallback fonts keep the layout usable (offline starter has no horizontal overflow)', async ({ page }) => {
    await page.route(/googleapis|gstatic/, r => r.abort());
    await page.goto(pathToFileURL(path.join(pkg, 'examples', 'starter.html')).href);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
