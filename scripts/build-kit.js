// Builds agent-kit/: a self-contained folder you can drop into any project (or point an AI agent at) to use or reproduce the monoedge design.
//   npm run build:kit              write agent-kit/
//   node scripts/build-kit.js --check   fail if agent-kit/ is out of date
// DESIGN.md is generated from kit-src/DESIGN.template.md + the live tokens + the icon sprite, so values are never typed twice.
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'agent-kit');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

const FILES = ['monoedge.css', 'monoedge.js', 'monoedge-elements.js', 'monoedge-icons.js', 'icons/sprite.svg',
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

function build() {
  const pkg = JSON.parse(rd('package.json'));
  const design = rd('kit-src/DESIGN.template.md').replace('{{version}}', pkg.version || '0.0.0').replace('{{tokens}}', tokensSection()).replace('{{icons}}', iconsList());
  const files = new Map();
  for (const f of FILES) files.set(RENAME[f] || f, fs.readFileSync(path.join(root, f)));
  files.set('DESIGN.md', design);
  files.set('README.md', rd('kit-src/README.md'));
  files.set('LICENSE-FONTS.md', rd('kit-src/LICENSE-FONTS.md'));
  files.set('examples/starter.html', rd('kit-src/starter.html'));
  return files;
}

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
module.exports = { build };
