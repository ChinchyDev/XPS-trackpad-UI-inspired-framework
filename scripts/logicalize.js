// One-way refactor helper (kept for the record and for re-running on new CSS): rewrites physical CSS to logical CSS so the framework works in RTL.
//   node scripts/logicalize.js edgelit.css [more.css|.html ...]      (HTML: only <style> blocks are touched)
// What it does, and only where the LTR result stays pixel-identical:
//   margin/padding/border/left/right (+ -width/-color/-style)  ->  logical (inline-start / inline-end)
//   text-align: left|right                                      ->  start | end
//   4-value border-radius                                       ->  border-{start,end}-{start,end}-radius
//   box-shadow with an inset x-offset, translateX(px), linear-gradient(90deg | to right | to left)  ->  multiplied by var(--dir) (1 in LTR, -1 in RTL)
// What it leaves alone: rules that centre with left:50% + translateX(-50%) (symmetric), vertical (180deg) gradients, and anything it cannot prove equivalent.
const fs = require('fs'); const postcss = require('postcss');

const MAP = { 'margin-left': 'margin-inline-start', 'margin-right': 'margin-inline-end', 'padding-left': 'padding-inline-start', 'padding-right': 'padding-inline-end',
  'border-left': 'border-inline-start', 'border-right': 'border-inline-end', 'border-left-width': 'border-inline-start-width', 'border-right-width': 'border-inline-end-width',
  'border-left-color': 'border-inline-start-color', 'border-right-color': 'border-inline-end-color', 'border-left-style': 'border-inline-start-style', 'border-right-style': 'border-inline-end-style',
  'left': 'inset-inline-start', 'right': 'inset-inline-end' };

function splitTop(v) { const out = []; let d = 0, cur = ''; for (const ch of v) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ' ' && d === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; }
const stats = { renamed: 0, align: 0, radius: 0, shadow: 0, translate: 0, gradient: 0, skippedCentred: 0 };

function transform(css) {
  const root = postcss.parse(css);
  root.walkRules(rule => {
    const centred = rule.nodes.some(n => n.type === 'decl' && n.prop === 'transform' && /translate(X)?\(\s*-50%/.test(n.value));
    rule.walkDecls(d => {
      if (d.parent !== rule) return;
      // 1. property names
      if (MAP[d.prop] && !(centred && (d.prop === 'left' || d.prop === 'right'))) { d.prop = MAP[d.prop]; stats.renamed++; }
      else if (centred && (d.prop === 'left' || d.prop === 'right')) stats.skippedCentred++;
      // 2. text-align
      if (d.prop === 'text-align' && /^(left|right)$/.test(d.value)) { d.value = d.value === 'left' ? 'start' : 'end'; stats.align++; }
      // 3. 4-value border-radius (TL TR BR BL) -> logical longhands
      if (d.prop === 'border-radius') {
        const p = splitTop(d.value);
        if (p.length === 4 && !p.every(x => x === p[0])) {
          const [tl, tr, br, bl] = p; const s = d.important ? ' !important' : '';
          d.cloneBefore({ prop: 'border-start-start-radius', value: tl }); d.cloneBefore({ prop: 'border-start-end-radius', value: tr });
          d.cloneBefore({ prop: 'border-end-end-radius', value: br }); d.cloneBefore({ prop: 'border-end-start-radius', value: bl }); d.remove(); stats.radius++; void s;
        }
      }
      // 4. directional magnitudes -> * var(--dir)
      {
        let v = d.value;
        if (d.prop === 'box-shadow' || d.prop === '--sig-shadow' || d.prop === '--sig-tick-shadow') {
          const nv = v.replace(/inset\s+(-?[\d.]+px)(\s+(?:0|-?[\d.]+px)\s)/g, (m, x, rest) => (x === '0px' ? m : `inset calc(${x} * var(--dir))${rest}`));
          if (nv !== v) { v = nv; stats.shadow++; }
        }
        const nt = v.replace(/translateX\((-?[\d.]+px)\)/g, (m, x) => (centred ? m : `translateX(calc(${x} * var(--dir)))`));
        if (nt !== v) { v = nt; stats.translate++; }
        const ng = v.replace(/linear-gradient\(\s*(-?90deg|to right|to left)\s*,/g, (m, a) => `linear-gradient(calc(${a === 'to left' || a === '-90deg' ? '-90deg' : '90deg'} * var(--dir)),`);
        if (ng !== v) { v = ng; stats.gradient++; }
        if (v !== d.value) d.value = v;
      }
    });
  });
  return root.toString();
}

module.exports = { transform, stats };
if (require.main === module) {
  for (const f of process.argv.slice(2)) {
    const src = fs.readFileSync(f, 'utf8');
    if (f.endsWith('.html')) fs.writeFileSync(f, src.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, a, b, c) => a + transform(b) + c));
    else fs.writeFileSync(f, transform(src));
  }
  console.log(JSON.stringify(stats));
}
