// Builds agent-kit/: a self-contained folder you can drop into any project (or point an AI agent at) to use or reproduce the edgelit design.
//   npm run build:kit              write agent-kit/
//   node scripts/build-kit.js --check   fail if agent-kit/ is out of date
// DESIGN.md is generated from kit-src/DESIGN.template.md + the live tokens + the icon sprite, so values are never typed twice.
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'agent-kit');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

const FILES = ['edgelit.css', 'edgelit.js', 'edgelit-elements.js', 'edgelit-icons.js', 'icons/sprite.svg',
  'dist/tokens.css', 'dist/tokens.json', 'dist/tokens.js', 'dist/fallback.css', 'dist/tailwind.preset.js',
  'fonts/fonts.css', 'fonts/jost-latin.woff2', 'fonts/jost-latin-ext.woff2', 'fonts/cormorant-garamond-latin.woff2', 'fonts/cormorant-garamond-latin-ext.woff2'];
// kit file name -> source (flattened where the framework expects it at the top level)
const RENAME = { 'dist/tokens.json': 'tokens.json', 'dist/tailwind.preset.js': 'tailwind.preset.js' };

function flat(obj, prefix = []) {
  const rows = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') rows.push(...flat(v, [...prefix, k])); else rows.push([[...prefix, k], v]);
  }
  return rows;
}
const cssName = p => '--' + p.filter(x => x !== 'base').join('-');
function table(title, rows, note) {
  return `**${title}**${note ? ` ${note}` : ''}\n\n| Token | Value |\n|---|---|\n` + rows.map(([n, v]) => `| \`${n}\` | \`${String(v).replace(/\|/g, '\\|')}\` |`).join('\n') + '\n';
}
function tokensSection() {
  const t = JSON.parse(rd('dist/tokens.json'));
  const core = flat(t.core).map(([p, v]) => [cssName(p.map((x, i) => (i === 0 && x === 'font' ? 'font' : x))), v]);
  const theme = th => flat(t[th]).filter(([p]) => !/rgb$/.test(p[p.length - 1])).map(([p, v]) => [cssName(p), v]);
  return [table('Core (both themes)', core), table('Dark theme', theme('dark'), '(`data-theme="dark"`, the default)'), table('Light theme', theme('light'), '(`data-theme="light"`)')].join('\n');
}
function iconsList() {
  return [...rd('icons/sprite.svg').matchAll(/id="i-([a-z0-9-]+)"/g)].map(m => '`' + m[1] + '`').join(', ');
}

const FONT_FILES = f => f.startsWith('fonts/');
const GOOGLE_ONLY = css => css.replace(/@import url\("fonts\/fonts\.css"\);[^\n]*\n/, '').replace(/ *\/\* online mode:[^*]*\*\//, '');
/** variant 'kit' (agent-kit/: offline fonts bundled) or 'release' (the zip: no fonts, Google Fonts online only). */
function build(variant = 'kit') {
  const online = variant === 'release';
  const pkg = JSON.parse(rd('package.json'));
  const strip = (t, keep, drop) => t.replace(new RegExp(`<!--${drop}-->[\\s\\S]*?<!--/${drop}-->\\n?`, 'g'), '').replace(new RegExp(`<!--/?${keep}-->`, 'g'), '');
  const design = strip(rd('kit-src/DESIGN.template.md'), online ? 'online' : 'local', online ? 'local' : 'online').replace('{{version}}', pkg.version || '0.0.0').replace('{{tokens}}', tokensSection()).replace('{{icons}}', iconsList());
  const files = new Map();
  for (const f of FILES) { if (online && FONT_FILES(f)) continue; files.set(RENAME[f] || f, fs.readFileSync(path.join(root, f))); }
  if (online) files.set('edgelit.css', Buffer.from(GOOGLE_ONLY(rd('edgelit.css'))));
  files.set('DESIGN.md', design);
  if (!online) { files.set('README.md', rd('kit-src/README.md')); files.set('LICENSE-FONTS.md', rd('kit-src/LICENSE-FONTS.md')); }
  files.set('examples/starter.html', rd('kit-src/starter.html'));
  return files;
}

if (require.main === module) {
const files = build();
if (process.argv.includes('--check')) {
  const bad = [];
  for (const [f, buf] of files) { const p = path.join(out, f); if (!fs.existsSync(p) || !Buffer.from(buf).equals(fs.readFileSync(p))) bad.push(f); }
  if (bad.length) { console.error('agent-kit is out of date (run npm run build:kit): ' + bad.join(', ')); process.exit(1); }
  console.log('agent-kit is current.');
} else {
  fs.rmSync(out, { recursive: true, force: true });
  for (const [f, buf] of files) { const p = path.join(out, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); }
  console.log(`agent-kit: ${files.size} files written.`);
}
}
module.exports = { build };
