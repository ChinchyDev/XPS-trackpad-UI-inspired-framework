// Derive a complete accent (fill + text, dark and light) from ONE seed colour and check it against the gate.
//   node scripts/derive-accent.js "#7c3aed"                 print the derived colours and the contrast report
//   node scripts/derive-accent.js "oklch(0.7 0.15 150)" --write   also write them into tokens/*.tokens.json and rebuild dist/
// Also warns when the accent is too close to a signal colour (ok / warn / err / info).
// Hue and chroma are kept; only lightness moves, and only as far as needed to reach 3:1 (fill, light-bar) and 4.5:1 (text) on every surface.
const fs = require('fs'); const path = require('path');
const { deriveSignal, oklchStr, contrast, parse } = require('./colors');
const { differenceEuclidean } = require('culori');
const okDistance = differenceEuclidean('oklab');
/** Below this OKLab distance two fills read as the same colour side by side (Pinterest red vs the critical red = 0.03; default cyan vs sky-blue notice = 0.17). */
const TOO_CLOSE = 0.08;
const { resolveColours, build } = require('./build-tokens');
const root = path.resolve(__dirname, '..');

function surfaces() {
  const out = {};
  for (const mode of ['dark', 'light']) {
    const t = resolveColours(JSON.parse(fs.readFileSync(path.join(root, 'tokens', `${mode}.tokens.json`), 'utf8')));
    out[mode] = { mode, surfaces: Object.fromEntries(['canvas', 'panel', 'surface', 'overlay'].map(k => [k, t.color[k].$value])) };
  }
  return out;
}

/** Signals the accent is easily mistaken for, per theme: [{ name, distance }] for every signal fill closer than TOO_CLOSE. */
function clashes(fill, mode) {
  const t = resolveColours(JSON.parse(fs.readFileSync(path.join(root, 'tokens', `${mode}.tokens.json`), 'utf8')));
  return ['ok', 'warn', 'err', 'info'].map(k => ({ name: k, distance: okDistance(fill, t[k].base.$value) })).filter(c => c.distance < TOO_CLOSE);
}

/** Programmatic entry (used by tests): returns { dark:{fill,text}, light:{fill,text}, report:[...] } */
function derive(seed) {
  const themes = surfaces(), d = deriveSignal(seed, themes), report = [], warnings = [];
  for (const mode of ['dark', 'light']) {
    const s = d[mode], bgs = Object.values(themes[mode].surfaces);
    if (!s.fill || !s.text) { report.push(`${mode}: could not reach the contrast targets with this hue/chroma`); continue; }
    for (const c of clashes(s.fill, mode)) warnings.push(`${mode}: accent ${s.fill} is very close to the ${c.name} signal (distance ${c.distance.toFixed(3)}, below ${TOO_CLOSE}). Buttons, links and badges in the accent will look like ${c.name} states. Pick a more distinct accent, or change the ${c.name} signal in tokens/${mode}.tokens.json to a clearly different shade.`);
    report.push(`${mode}: fill ${s.fill} min ${Math.min(...bgs.map(b => contrast(s.fill, b))).toFixed(2)}:1 (need 3)   text ${s.text} min ${Math.min(...bgs.map(b => contrast(s.text, b))).toFixed(2)}:1 (need 4.5)`);
  }
  return { ...d, report, warnings };
}

module.exports = { derive };
if (require.main === module) (async () => {
  const seed = process.argv[2]; if (!seed || !parse(seed)) { console.error('usage: node scripts/derive-accent.js "<any CSS colour>" [--write]'); process.exit(2); }
  const r = derive(seed); console.log(r.report.join('\n'));
  if (r.warnings.length) console.log('\nWARNING: accent too close to a signal colour\n  ' + r.warnings.join('\n  ') + '\n  (Passing the contrast gate does not make an accent distinguishable from a signal. --write is still allowed.)');
  if (!r.dark.fill || !r.light.fill) process.exit(1);
  console.log(`\ntokens:\n  dark  accent.base ${oklchStr(r.dark.fill)}  accent.text ${oklchStr(r.dark.text)}\n  light accent.base ${oklchStr(r.light.fill)}  accent.text ${oklchStr(r.light.text)}`);
  if (process.argv.includes('--write')) {
    for (const mode of ['dark', 'light']) {
      const f = path.join(root, 'tokens', `${mode}.tokens.json`), t = JSON.parse(fs.readFileSync(f, 'utf8'));
      t.accent.base.$value = oklchStr(r[mode].fill); t.accent.text.$value = oklchStr(r[mode].text);
      fs.writeFileSync(f, JSON.stringify(t, null, 2) + '\n');
    }
    const b = await build(); if (b.fails.length) { console.error('gate failed after write:\n  ' + b.fails.join('\n  ')); process.exit(1); }
    console.log('written; dist/ rebuilt; gate passes. (Light-bar glow, focus ring and links all follow --accent.)');
  }
})();
