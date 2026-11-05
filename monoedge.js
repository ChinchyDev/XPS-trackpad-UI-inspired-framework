/* ==========================================================================
   monoedge.js : optional behaviour for the components CSS cannot do alone.
   No dependencies, no build step. Everything hangs off window.ME.
     ME.chart(host, series, opts)     line / area / step / multi-series / sparkline
     ME.combobox(input, opts)         autocomplete, multi-select, tag input
     ME.datepicker(input, opts)       date (and optional time) picker
     ME.palette(dialog, opts)         command palette (Ctrl/Cmd+K)
     ME.upload(root, opts)            file upload (drop zone + list)
     ME.tabsOverflow(el)              fades the clipped side of a scrolled tab strip
     ME.tree(root, nodes, opts)       tree view
     ME.toolbar(el)                   roving-tabindex toolbar
     ME.wizard(root, opts)            stepper / wizard
     ME.icon(name, size)              <svg> markup for a sprite icon
     ME.scroll(el, opts)              lit thumb + edge lights on a scroller (or data-me-scroll)
     ME.split(el, opts)               split footer with a neutral state (click the chosen side again, or Esc, to undo)
   ========================================================================== */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
let uid = 0; const nid = p => `${p}-${++uid}`;
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v === false || v == null) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v); }
  e.append(...kids); return e;
}
/* icon markup from the sprite (load monoedge-icons.js first). size: 'sm' | 'lg' | 'xl' */
const icon = (name, size) => `<svg class="me-ico${size ? ' me-ico--' + size : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fire = (t, name, detail) => t.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
const fireNative = (t, name) => t.dispatchEvent(new Event(name, { bubbles: true }));

/* compact number: 12400 -> 12.4k, 1200000 -> 1.2M */
function fmt(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return +(n / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return +(n / 1e6).toFixed(1) + 'M';
  if (a >= 1e4) return +(n / 1e3).toFixed(1) + 'k';
  return Number.isInteger(n) ? String(n) : String(+n.toFixed(2));
}
const full = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
function niceScale(mn, mx, ticks = 4) {
  if (mn === mx) { mn -= 1; mx += 1; }
  const raw = (mx - mn) / ticks, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  return { min: Math.floor(mn / step + 1e-9) * step, max: Math.ceil(mx / step - 1e-9) * step, step };
}

/* ------------------------------------------------------------------ chart */
/* series: [numbers] or [{name, data, signal, alt, area, step}] ; null values leave a gap.
   opts: labels, unit, min, max, axis, step, area, spark, legend, table, caption, empty */
function chart(host, input, o = {}) {
  const series = Array.isArray(input) && input.length && input[0] !== null && typeof input[0] === 'object' && !Array.isArray(input[0]) ? input : [{ data: input }];
  const all = series.flatMap(s => s.data).filter(Number.isFinite);
  host.replaceChildren();
  if (!all.length) { host.append(el('div', { class: 'me-empty' }, el('span', { class: 'me-title', text: o.empty || 'No data yet' }))); return; }
  const n = Math.max(...series.map(s => s.data.length));
  const W = 600, H = 160, pad = o.spark ? 2 : 8;
  let mn = o.min ?? Math.min(...all), mx = o.max ?? Math.max(...all), step = null;
  if (o.axis && o.min == null && o.max == null && o.nice !== false) ({ min: mn, max: mx, step } = niceScale(mn, mx));
  if (mn === mx) { mn -= 1; mx += 1; }
  if (o.axis && step === null) step = niceScale(mn, mx).step;   /* explicit min/max: keep the range, but put ticks on round numbers */
  const sx = i => n === 1 ? W / 2 : pad + i * (W - 2 * pad) / (n - 1);
  const sy = v => H - pad - (v - mn) / (mx - mn) * (H - 2 * pad);
  const base = sy(Math.min(Math.max(0, mn), mx));
  const f = x => +x.toFixed(1);
  const ticks = []; if (step) for (let v = Math.ceil(mn / step - 1e-9) * step; v <= mx + 1e-9; v += step) ticks.push(+v.toFixed(6)); else for (let k = 0; k <= 4; k++) ticks.push(mn + (mx - mn) * k / 4);

  let svg = `<svg class="me-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" focusable="false" aria-hidden="true">`;
  svg += ticks.map(v => `<line class="grid" x1="0" x2="${W}" y1="${f(sy(v))}" y2="${f(sy(v))}"/>`).join('');
  svg += `<line class="axis" x1="0" x2="${W}" y1="${H - pad}" y2="${H - pad}"/>`;
  if (mn < 0 && mx > 0) svg += `<line class="zero" x1="0" x2="${W}" y1="${f(sy(0))}" y2="${f(sy(0))}"/>`;
  series.forEach((s, si) => {
    const gid = nid('me-g'), stepped = s.step ?? o.step, attrs = (s.signal ? ` data-signal="${s.signal}"` : '') + (s.alt ? ' data-alt' : '');
    const showArea = s.area ?? ((o.area ?? true) && si === 0 && !s.alt);
    const segs = []; let cur = [];
    s.data.forEach((v, i) => { if (Number.isFinite(v)) cur.push([i, v]); else if (cur.length) { segs.push(cur); cur = []; } });
    if (cur.length) segs.push(cur);
    let g = `<g${attrs}><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sig);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--sig);stop-opacity:0"/></linearGradient></defs>`;
    for (const seg of segs) {
      if (seg.length === 1) { g += `<rect class="solo" x="${f(sx(seg[0][0]) - 3)}" y="${f(sy(seg[0][1]) - 3)}" width="6" height="6"/>`; continue; }
      const d = seg.map(([i, v], k) => k === 0 ? `M${f(sx(i))},${f(sy(v))}` : stepped ? `H${f(sx(i))}V${f(sy(v))}` : `L${f(sx(i))},${f(sy(v))}`).join('');
      if (showArea) g += `<path class="area" fill="url(#${gid})" d="${d}L${f(sx(seg[seg.length - 1][0]))},${f(base)}L${f(sx(seg[0][0]))},${f(base)}Z"/>`;
      g += `<path class="line" d="${d}"/>`;
    }
    svg += g + '</g>';
  });
  if (!o.spark) {
    for (let i = 0; i < n; i++) {
      const tip = (o.labels ? o.labels[i] + ': ' : '') + series.map(s => (series.length > 1 && s.name ? s.name + ' ' : '') + (Number.isFinite(s.data[i]) ? full(s.data[i]) + (o.unit || '') : 'no data')).join(' · ');
      svg += `<g class="col"><rect class="hit" x="${f(sx(i) - W / n / 2)}" y="0" width="${f(W / n)}" height="${H}"><title>${esc(tip)}</title></rect>`;
      series.forEach(s => { if (Number.isFinite(s.data[i])) svg += `<rect class="pt"${s.signal ? ` data-signal="${s.signal}"` : ''}${s.alt ? ' data-alt' : ''} x="${f(sx(i) - 3)}" y="${f(sy(s.data[i]) - 3)}" width="6" height="6"/>`; });
      svg += '</g>';
    }
  }
  svg += '</svg>';

  const body = el('div', { class: 'me-chart-body' });
  body.innerHTML = svg;
  if (o.axis && !o.spark) {
    const y = el('div', { class: 'me-chart-y', 'aria-hidden': 'true' });
    ticks.forEach(v => { const sp = el('span', { text: fmt(v) }); sp.style.top = f(sy(v)) + 'px'; y.append(sp); });
    body.prepend(y);
  }
  host.append(body);
  host.toggleAttribute('data-y', !!(o.axis && !o.spark));
  if (o.labels && !o.spark) {
    const idx = n <= 12 ? [...Array(n).keys()] : [...Array(6).keys()].map(k => Math.round(k * (n - 1) / 5));
    host.append(el('div', { class: 'me-chart-x', 'aria-hidden': 'true' }, ...idx.map(i => el('span', { text: o.labels[i] }))));
  }
  if (!o.spark && o.legend !== false && series.length > 1) {
    host.append(el('ul', { class: 'me-legend' }, ...series.map(s => el('li', { 'data-signal': s.signal, 'data-alt': s.alt ? '' : null, text: s.name || '' }))));
  }
  if (o.table && !o.spark) {   /* text alternative for assistive tech */
    host.setAttribute('role', 'group');
    const t = el('table', { class: 'me-sr' }, el('caption', { text: o.caption || 'Chart data' }));
    t.append(el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Point' }), ...series.map((s, i) => el('th', { scope: 'col', text: s.name || 'Value ' + (i + 1) })))));
    const tb = el('tbody'); for (let i = 0; i < n; i++) tb.append(el('tr', {}, el('th', { scope: 'row', text: o.labels ? o.labels[i] : String(i + 1) }), ...series.map(s => el('td', { text: Number.isFinite(s.data[i]) ? full(s.data[i]) + (o.unit || '') : 'no data' }))));
    t.append(tb); host.append(t);
  }
}

/* ---------------------------------------------------------------- popover */
function popover(pop, anchor, { sameWidth = false } = {}) {
  const place = () => {
    const r = anchor.getBoundingClientRect();
    if (sameWidth) pop.style.width = r.width + 'px';
    const h = pop.offsetHeight, w = pop.offsetWidth, below = innerHeight - r.bottom, above = r.top;
    const top = below < h + 8 && above > below ? r.top - h - 4 : r.bottom + 4;
    pop.style.top = Math.max(4, top) + 'px';
    pop.style.left = Math.max(4, Math.min(r.left, innerWidth - w - 4)) + 'px';
  };
  return {
    isOpen: () => pop.matches(':popover-open'),
    open() { if (!pop.matches(':popover-open')) pop.showPopover(); place(); addEventListener('scroll', place, true); addEventListener('resize', place); },
    close() { if (pop.matches(':popover-open')) pop.hidePopover(); removeEventListener('scroll', place, true); removeEventListener('resize', place); },
    place,
  };
}

/* ---------------------------------------------------------------- listbox */
function mark(parent, text, q) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) { parent.append(text); return; }
  parent.append(text.slice(0, i), el('mark', { text: text.slice(i, i + q.length) }), text.slice(i + q.length));
}
/* o: items(q) -> [{value,label,group,hint,picked}], pick(item), autoActive, empty */
function listbox(ul, input, o) {
  let items = [], active = -1;
  if (!ul.id) ul.id = nid('me-lb');
  function setActive(i, scroll = true) {
    active = i;
    $$('.me-option', ul).forEach(li => { const on = +li.dataset.i === i; li.toggleAttribute('data-active', on); });
    const cur = i >= 0 ? $(`.me-option[data-i="${i}"]`, ul) : null;
    if (cur) { input.setAttribute('aria-activedescendant', cur.id); if (scroll) cur.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
  }
  function render(q = '') {
    items = o.items(q); ul.replaceChildren(); let g;
    items.forEach((it, i) => {
      if (it.group && it.group !== g) { ul.append(el('li', { role: 'presentation', class: 'me-option-group', text: it.group })); g = it.group; }
      const li = el('li', { role: 'option', class: 'me-option', id: `${ul.id}-o${i}`, 'data-i': i, 'aria-selected': it.picked ? 'true' : 'false' });
      const t = el('span', { class: 'me-option-text' }); mark(t, it.label, it.custom ? '' : q); li.append(t);
      if (it.hint) li.append(el('span', { class: 'me-option-hint', text: it.hint }));
      li.addEventListener('mousedown', e => e.preventDefault());
      li.addEventListener('click', () => o.pick(it));
      li.addEventListener('mousemove', () => { if (active !== i) setActive(i, false); });
      ul.append(li);
    });
    if (!items.length) ul.append(el('li', { role: 'presentation', class: 'me-option-empty', text: o.empty || 'No matches' }));
    setActive(items.length && o.autoActive ? 0 : -1);
    return items.length;
  }
  return {
    render,
    move(d) { if (!items.length) return; setActive(active < 0 ? (d > 0 ? 0 : items.length - 1) : (active + d + items.length) % items.length); },
    first() { if (items.length) setActive(0); }, last() { if (items.length) setActive(items.length - 1); },
    current: () => items[active] || null,
    count: () => items.length,
  };
}

/* --------------------------------------------------------------- combobox */
/* opts: options [string|{value,label,group,hint}], multi, custom, value, onChange(value), label, limit, empty, anchor */
function combobox(input, o = {}) {
  const anchor = o.anchor || input.closest('.me-anchor') || input.parentElement;
  const norm = x => typeof x === 'string' ? { value: x, label: x } : x;
  const getOpts = () => (typeof o.options === 'function' ? o.options() : opts).map(norm); let opts = typeof o.options === 'function' ? [] : (o.options || []); const multi = !!o.multi, custom = !!o.custom;
  const picked = new Map((o.value || []).map(norm).map(x => [x.value, x]));
  const pop = el('div', { class: 'me-pop', popover: 'manual' });
  const ul = el('ul', { class: 'me-listbox', role: 'listbox', id: nid('me-lb'), 'aria-label': o.label || input.getAttribute('aria-label') || (input.labels[0]?.textContent || 'Suggestions') });
  if (multi) ul.setAttribute('aria-multiselectable', 'true');
  pop.append(ul); (anchor.closest('dialog') || document.body).append(pop);
  const live = el('span', { class: 'me-sr', 'aria-live': 'polite' }); document.body.append(live);
  const pp = popover(pop, anchor, { sameWidth: true });
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', ul.id); input.setAttribute('aria-haspopup', 'listbox'); input.setAttribute('autocomplete', 'off');
  if (multi) anchor.classList.add('me-tags');
  let lastPick = null, silent = false;

  const lb = listbox(ul, input, {
    autoActive: !custom, empty: o.empty,
    items(q) {
      if (!multi && lastPick !== null && q === lastPick) q = '';
      const ql = q.toLowerCase();
      let out = getOpts().filter(x => !ql || x.label.toLowerCase().includes(ql)).slice(0, o.limit || 50).map(x => ({ ...x, picked: picked.has(x.value) || (!multi && x.label === input.value) }));
      if (multi && custom && q.trim() && !getOpts().some(x => x.label.toLowerCase() === ql) && !picked.has(q.trim())) out.push({ value: q.trim(), label: q.trim(), custom: true, hint: 'Add' });
      return out;
    },
    pick,
  });
  function open() { const n = lb.render(input.value); pp.open(); input.setAttribute('aria-expanded', 'true'); live.textContent = n ? `${n} result${n === 1 ? '' : 's'} available` : 'No results'; }
  function close() { pp.close(); input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function emit() { const v = value(); o.onChange?.(v); fire(input, 'me-change', v); }
  function value() { return multi ? [...picked.keys()] : input.value; }
  function pick(it) {
    if (multi) {
      if (picked.has(it.value) && !it.custom) picked.delete(it.value); else picked.set(it.value, it);
      input.value = ''; drawTags(); lb.render(''); pp.place(); emit();
    } else {
      silent = true; input.value = it.label; lastPick = it.label; input.dataset.value = it.value;
      fireNative(input, 'input'); fireNative(input, 'change'); silent = false; close(); emit();
    }
  }
  function drawTags() {
    $$('.me-tag', anchor).forEach(t => t.remove());
    for (const it of picked.values()) {
      const b = el('button', { type: 'button', 'aria-label': `Remove ${it.label}`, text: '×' });
      b.addEventListener('click', () => { picked.delete(it.value); drawTags(); if (pp.isOpen()) lb.render(input.value); input.focus(); emit(); });
      anchor.insertBefore(el('span', { class: 'me-tag' }, el('span', { text: it.label }), b), input);
    }
  }
  function addTyped() { const t = input.value.trim().replace(/,$/, '').trim(); if (!t) return false; pick({ value: t, label: t, custom: true }); return true; }
  input.addEventListener('input', () => { if (silent) return; lastPick = null; open(); });
  input.addEventListener('click', () => { if (!pp.isOpen() && getOpts().length) open(); });
  input.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== input) close(); }, 0); });
  input.addEventListener('keydown', e => {
    const isOpen = pp.isOpen();
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!isOpen) { open(); lb.first(); } else lb.move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!isOpen) { open(); lb.last(); } else lb.move(-1); }
    else if (e.key === 'Enter') {
      const it = isOpen ? lb.current() : null;
      if (it) { e.preventDefault(); pick(it); } else if (multi && custom && input.value.trim()) { e.preventDefault(); addTyped(); }
    }
    else if (e.key === ',' && multi && custom) { e.preventDefault(); addTyped(); }
    else if (e.key === 'Escape' && isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Backspace' && multi && !input.value && picked.size) { picked.delete([...picked.keys()].pop()); drawTags(); emit(); }
    else if (e.key === 'Tab') close();
  });
  if (multi) { input.addEventListener('paste', e => { const t = e.clipboardData?.getData('text') || ''; if (custom && t.includes(',')) { e.preventDefault(); t.split(',').map(s => s.trim()).filter(Boolean).forEach(v => picked.set(v, { value: v, label: v })); drawTags(); emit(); } }); drawTags(); }
  const api = { open, close, get value() { return value(); }, set options(a) { opts = a; }, set(v) { if (multi) { picked.clear(); v.map(norm).forEach(x => picked.set(x.value, x)); drawTags(); } else input.value = v; } };
  input.me = api; return api;
}

/* ---------------------------------------------------------- command palette */
/* opts: items() -> [{group,label,hint,keywords,run}], hotkey (default true) */
function palette(dlg, o = {}) {
  const input = $('input', dlg), ul = $('.me-listbox', dlg);
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-controls', ul.id || (ul.id = nid('me-lb')));
  const lb = listbox(ul, input, {
    autoActive: true, empty: 'Nothing matches',
    items(q) { const ql = q.trim().toLowerCase(); return o.items().filter(x => !ql || (x.label + ' ' + (x.keywords || '') + ' ' + (x.group || '')).toLowerCase().includes(ql)).slice(0, 30).map((x, i) => ({ ...x, value: i })); },
    pick(it) { dlg.close(); it.run(); },
  });
  const open = () => { if (dlg.open) return; dlg.showModal(); input.value = ''; lb.render(''); input.focus(); };
  input.addEventListener('input', () => lb.render(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); lb.move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); lb.move(-1); }
    else if (e.key === 'Enter') { const it = lb.current(); if (it) { e.preventDefault(); dlg.close(); it.run(); } }
  });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  if (o.hotkey !== false) document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? dlg.close() : open(); } });
  return { open, close: () => dlg.close() };
}

/* -------------------------------------------------------------- date picker */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const p2 = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const sameDay = (a, b) => a && b && iso(a) === iso(b);
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec((s || '').trim()); if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
}

function datepicker(input, o = {}) {
  const anchor = input.closest('.me-anchor'), withTime = o.time ?? input.hasAttribute('data-time'), ws = o.weekStart ?? 1, step = o.minuteStep || 5;
  const min = parseDate(o.min || input.dataset.min), max = parseDate(o.max || input.dataset.max);
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const clamp = d => min && d < min ? new Date(min) : max && d > max ? new Date(max) : d;
  const trigger = el('button', { type: 'button', class: 'me-affix', 'aria-label': o.triggerLabel || 'Choose date', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' });
  trigger.innerHTML = icon('calendar'); anchor.append(trigger);
  const tid = nid('me-cal');
  const pop = el('div', { class: 'me-pop me-cal', popover: 'manual', role: 'dialog', 'aria-label': 'Choose date' });
  const title = el('span', { class: 'me-cal-title', id: tid, 'aria-live': 'polite' });
  const prev = el('button', { type: 'button', class: 'me-cal-nav', 'aria-label': 'Previous month' }); prev.innerHTML = icon('chevron-left');
  const next = el('button', { type: 'button', class: 'me-cal-nav', 'aria-label': 'Next month' }); next.innerHTML = icon('chevron-right');
  const grid = el('table', { class: 'me-cal-grid', role: 'grid', 'aria-labelledby': tid });
  const todayB = el('button', { type: 'button', class: 'me-cal-act', text: 'Today' }), clearB = el('button', { type: 'button', class: 'me-cal-act', text: 'Clear' });
  const foot = el('div', { class: 'me-cal-foot' }, todayB, clearB);
  pop.append(el('div', { class: 'me-cal-head' }, prev, title, next), grid);
  let hSel, mSel;
  if (withTime) {
    const mk = (label, n, stp) => { const s = el('select', { 'aria-label': label }); for (let i = 0; i < n; i += stp) s.append(el('option', { value: i, text: p2(i) })); return s; };
    hSel = mk('Hour', 24, 1); mSel = mk('Minute', 60, step);
    pop.append(el('div', { class: 'me-cal-time' }, el('span', { class: 'me-label', text: 'Time' }), hSel, el('span', { text: ':' }), mSel));
    foot.append(el('button', { type: 'button', class: 'me-cal-act', 'data-done': '', text: 'Done' }));
  }
  pop.append(foot); (anchor.closest('dialog') || document.body).append(pop);
  const pp = popover(pop, anchor);
  let sel = parseDate(input.value), view = sel || today(), act = sel || clamp(today());

  const out = d => iso(d) + (withTime ? ` ${p2(+hSel.value)}:${p2(+mSel.value)}` : '');
  function render(focus) {
    title.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
    const first = new Date(view.getFullYear(), view.getMonth(), 1), off = (first.getDay() - ws + 7) % 7;
    const head = el('tr', {}); for (let i = 0; i < 7; i++) { const dn = (ws + i) % 7; head.append(el('th', { scope: 'col', abbr: DOW[dn], text: DOW[dn].slice(0, 2) })); }
    const tb = el('tbody');
    for (let r = 0; r < 6; r++) {
      const tr = el('tr', { role: 'row' });
      for (let c = 0; c < 7; c++) {
        const d = new Date(view.getFullYear(), view.getMonth(), 1 - off + r * 7 + c), key = iso(d);
        const dis = (min && d < min) || (max && d > max);
        const b = el('button', { type: 'button', class: 'me-cal-day', 'data-date': key, tabindex: key === iso(act) ? '0' : '-1', 'aria-label': d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), text: d.getDate() });
        if (d.getMonth() !== view.getMonth()) b.setAttribute('data-out', '');
        if (sameDay(d, today())) b.setAttribute('aria-current', 'date');
        if (dis) b.disabled = true;
        tr.append(el('td', { role: 'gridcell', 'aria-selected': sameDay(d, sel) ? 'true' : 'false' }, b));
      }
      tb.append(tr);
    }
    grid.replaceChildren(el('thead', {}, head), tb);
    todayB.disabled = !!((min && today() < min) || (max && today() > max));
    if (focus) $(`[data-date="${iso(act)}"]`, grid)?.focus();
  }
  function goto(d, focus = true) { act = clamp(d); view = new Date(act.getFullYear(), act.getMonth(), 1); render(focus); }
  function setTimeUI() { if (!withTime) return; const d = sel || new Date(); hSel.value = String(sel ? sel.getHours() : 9); const m = sel ? sel.getMinutes() : 0; if (![...mSel.options].some(o => +o.value === m)) mSel.append(el('option', { value: m, text: p2(m) })); mSel.value = String(m); }
  function commit(d, closeAfter = true) {
    sel = d; input.value = d ? out(d) : ''; input.removeAttribute('aria-invalid'); fireNative(input, 'input'); fireNative(input, 'change');
    if (closeAfter) { close(); input.focus(); } else render(false);
  }
  function open() {
    sel = parseDate(input.value); view = sel || today(); act = sel || clamp(today()); setTimeUI(); render(false);
    pp.open(); trigger.setAttribute('aria-expanded', 'true'); render(true);
    setTimeout(() => document.addEventListener('pointerdown', outside), 0);
  }
  function close() { pp.close(); trigger.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside); }
  function outside(e) { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); }

  trigger.addEventListener('click', () => pp.isOpen() ? close() : open());
  prev.addEventListener('click', () => goto(new Date(view.getFullYear(), view.getMonth() - 1, Math.min(act.getDate(), 28)), false));
  next.addEventListener('click', () => goto(new Date(view.getFullYear(), view.getMonth() + 1, Math.min(act.getDate(), 28)), false));
  todayB.addEventListener('click', () => commit(withDay(today()), !withTime));
  clearB.addEventListener('click', () => commit(null));
  const withDay = d => { if (withTime) d.setHours(+hSel.value, +mSel.value); return d; };
  grid.addEventListener('click', e => { const b = e.target.closest('.me-cal-day'); if (b && !b.disabled) commit(withDay(parseDate(b.dataset.date)), !withTime); });
  if (withTime) {
    $('[data-done]', pop).addEventListener('click', () => { close(); input.focus(); });
    [hSel, mSel].forEach(s => s.addEventListener('change', () => commit(withDay(sel ? new Date(sel) : today()), false)));
  }
  pop.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); input.focus(); return; }
    if (e.key === 'Tab') { const f = $$('button:not([disabled]):not([tabindex="-1"]), select', pop); if (!f.length) return; const i = f.indexOf(document.activeElement); const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1); e.preventDefault(); f[n].focus(); return; }
    if (!e.target.classList.contains('me-cal-day')) return;
    const y = act.getFullYear(), m = act.getMonth(), d = act.getDate();
    const mv = { ArrowLeft: [y, m, d - 1], ArrowRight: [y, m, d + 1], ArrowUp: [y, m, d - 7], ArrowDown: [y, m, d + 7],
      Home: [y, m, d - ((act.getDay() - ws + 7) % 7)], End: [y, m, d + 6 - ((act.getDay() - ws + 7) % 7)],
      PageUp: e.shiftKey ? [y - 1, m, d] : [y, m - 1, d], PageDown: e.shiftKey ? [y + 1, m, d] : [y, m + 1, d] }[e.key];
    if (!mv) return; e.preventDefault();
    let t = new Date(mv[0], mv[1], mv[2]); if ((e.key.startsWith('Page')) && t.getMonth() !== ((mv[1] % 12) + 12) % 12) t = new Date(mv[0], mv[1] + 1, 0);
    goto(t);
  });
  input.addEventListener('keydown', e => { if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); open(); } });
  input.addEventListener('change', () => { if (pp.isOpen()) return; const v = input.value.trim(); if (!v) { sel = null; input.removeAttribute('aria-invalid'); return; } const d = parseDate(v); input.setAttribute('aria-invalid', String(!d || !!(min && d < min) || !!(max && d > max))); if (d) sel = d; });
  const api = { open, close, get date() { return parseDate(input.value); } };
  input.me = api; return api;
}

/* ------------------------------------------------------------------ upload */
const bytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
/* root = .me-field.me-upload containing label.me-drop>input[type=file], ul.me-files, span.me-error-msg */
function upload(root, o = {}) {
  const input = $('input[type=file]', root), drop = $('.me-drop', root), list = $('.me-files', root), err = $('.me-error-msg', root);
  const accept = (o.accept || input.accept || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean), maxSize = o.maxSize || +input.dataset.maxSize || Infinity, multi = input.multiple;
  let files = [];
  const okType = f => !accept.length || accept.some(a => a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : a.startsWith('.') ? f.name.toLowerCase().endsWith(a) : f.type === a);
  function add(fl) {
    const bad = [];
    for (const f of fl) { if (!okType(f)) bad.push(`${f.name} is not an accepted file type.`); else if (f.size > maxSize) bad.push(`${f.name} is larger than ${bytes(maxSize)}.`); else { if (!multi) { files.forEach(x => x.url && URL.revokeObjectURL(x.url)); files = []; } f.url = f.type.startsWith('image/') ? URL.createObjectURL(f) : null; files.push(f); } }
    err.textContent = bad.join(' '); bad.length ? (root.dataset.signal = 'err', input.setAttribute('aria-invalid', 'true')) : (root.removeAttribute('data-signal'), input.removeAttribute('aria-invalid'));
    sync(); draw(); fire(root, 'me-files', files);
  }
  function sync() { try { const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); input.files = dt.files; } catch (_) { } }
  function draw() {
    list.replaceChildren(...files.map(f => {
      const b = el('button', { type: 'button', 'aria-label': `Remove ${f.name}` }); b.innerHTML = icon('close');
      b.addEventListener('click', () => { if (f.url) URL.revokeObjectURL(f.url); files = files.filter(x => x !== f); sync(); draw(); input.focus(); fire(root, 'me-files', files); });
      return el('li', { class: 'me-file' }, f.url ? el('img', { class: 'me-thumb', src: f.url, alt: '' }) : null, el('span', { class: 'me-file-name', text: f.name }), el('span', { class: 'me-file-size', text: bytes(f.size) }), b);
    }));
  }
  input.addEventListener('change', () => add([...input.files]));
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.setAttribute('data-over', ''); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); if (t === 'drop' || !drop.contains(e.relatedTarget)) drop.removeAttribute('data-over'); }));
  drop.addEventListener('drop', e => add([...e.dataTransfer.files]));
  return { get files() { return files; }, add, clear() { files = []; sync(); draw(); } };
}

/* ------------------------------------------------------------ tabs overflow */
function tabsOverflow(t) {
  if (t._me) return t._me; 
  const upd = () => {
    const max = t.scrollWidth - t.clientWidth, x = Math.abs(t.scrollLeft), m = [];
    if (x > 2) m.push('start'); if (max - x > 2) m.push('end');
    m.length ? t.dataset.more = m.join(' ') : t.removeAttribute('data-more');
  };
  t.addEventListener('scroll', upd, { passive: true });
  t.addEventListener('focusin', e => e.target.scrollIntoView?.({ inline: 'nearest', block: 'nearest' }));
  t.addEventListener('click', e => e.target.closest('button')?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' }));
  if (window.ResizeObserver) new ResizeObserver(upd).observe(t);
  upd(); t._me = upd; return upd;
}

/* -------------------------------------------------------------------- tree */
/* nodes: [{label, children, open, id}] */
function tree(root, nodes, o = {}) {
  root.setAttribute('role', 'tree'); root.classList.add('me-tree'); root.replaceChildren();
  const build = (list, ul, level) => list.forEach(n => {
    const li = el('li', { role: 'treeitem', 'aria-level': level, 'aria-selected': 'false', tabindex: '-1' }); li._n = n;
    const row = el('span', { class: 'me-tree-row' }, el('span', { class: 'me-tree-twist', 'aria-hidden': 'true' }), el('span', { text: n.label }));
    li.append(row);
    if (n.children?.length) { li.setAttribute('aria-expanded', n.open ? 'true' : 'false'); const sub = el('ul', { role: 'group' }); build(n.children, sub, level + 1); li.append(sub); }
    ul.append(li);
  });
  build(nodes, root, 1);
  const all = () => $$('[role=treeitem]', root);
  const visible = () => all().filter(li => { let p = li.parentElement.closest('[role=treeitem]'); while (p) { if (p.getAttribute('aria-expanded') !== 'true') return false; p = p.parentElement.closest('[role=treeitem]'); } return true; });
  const focusItem = li => { all().forEach(x => x.tabIndex = -1); li.tabIndex = 0; li.focus(); };
  const select = li => { all().forEach(x => x.setAttribute('aria-selected', String(x === li))); o.onSelect?.(li._n); fire(root, 'me-select', li._n); };
  const toggle = (li, on) => { if (li.hasAttribute('aria-expanded')) li.setAttribute('aria-expanded', String(on ?? li.getAttribute('aria-expanded') !== 'true')); };
  (all()[0]).tabIndex = 0;
  root.addEventListener('click', e => { const row = e.target.closest('.me-tree-row'); if (!row) return; const li = row.parentElement; focusItem(li); select(li); toggle(li); });
  root.addEventListener('keydown', e => {
    const li = e.target.closest('[role=treeitem]'); if (!li || li !== e.target) return;
    const v = visible(), i = v.indexOf(li), open = li.getAttribute('aria-expanded');
    const k = {
      ArrowDown: () => v[i + 1] && focusItem(v[i + 1]), ArrowUp: () => v[i - 1] && focusItem(v[i - 1]), Home: () => focusItem(v[0]), End: () => focusItem(v[v.length - 1]),
      ArrowRight: () => open === 'false' ? toggle(li, true) : open === 'true' && focusItem($('[role=treeitem]', li)),
      ArrowLeft: () => open === 'true' ? toggle(li, false) : (li.parentElement.closest('[role=treeitem]') && focusItem(li.parentElement.closest('[role=treeitem]'))),
      Enter: () => { select(li); toggle(li); }, ' ': () => { select(li); toggle(li); },
    }[e.key];
    if (k) { e.preventDefault(); k(); }
  });
  return { select: id => { const li = all().find(x => x._n.id === id); if (li) { select(li); focusItem(li); } } };
}

/* ----------------------------------------------------------------- toolbar */
function toolbar(t) {
  if (t._me) return; t._me = true;
  const items = () => $$('button:not([disabled])', t);
  items().forEach((b, i) => b.tabIndex = i ? -1 : 0);
  t.addEventListener('focusin', e => { if (e.target.matches('button')) items().forEach(b => b.tabIndex = b === e.target ? 0 : -1); });
  t.addEventListener('keydown', e => {
    const it = items(), i = it.indexOf(document.activeElement); if (i < 0) return;
    const n = { ArrowRight: (i + 1) % it.length, ArrowLeft: (i - 1 + it.length) % it.length, Home: 0, End: it.length - 1 }[e.key];
    if (n !== undefined) { e.preventDefault(); it[n].focus(); }
  });
}

/* ------------------------------------------------------------------ wizard */
/* root contains ol.me-steps>li, [data-step-panel] sections (in order), [data-back], [data-next]. opts.validate(i) -> bool */
function wizard(root, o = {}) {
  const steps = $$('.me-steps > li', root), panels = $$('[data-step-panel]', root), back = $('[data-back]', root), next = $('[data-next]', root);
  let cur = 0;
  function go(i) {
    cur = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((li, j) => {
      li.toggleAttribute('data-done', j < cur); j === cur ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current');
      $('.me-sr', li)?.remove(); if (j < cur) li.prepend(el('span', { class: 'me-sr', text: 'Completed: ' }));
    });
    panels.forEach((p, j) => p.hidden = j !== cur);
    back.disabled = cur === 0; next.textContent = cur === steps.length - 1 ? (o.finishLabel || 'Finish') : 'Next';
    fire(root, 'me-step', cur);
  }
  next.addEventListener('click', () => { if (o.validate && !o.validate(cur)) return; if (cur === steps.length - 1) fire(root, 'me-finish', cur); else go(cur + 1); });
  back.addEventListener('click', () => go(cur - 1));
  go(0); return { go, get step() { return cur; } };
}

/* ------------------------------------------------------------------ scroll */
/* Lit thumb (drag target, shows on hover / scroll) + edge lights (lead on small scrollers and on touch). Native scrolling is never replaced.
   view: the element that scrolls (overflow:auto). It is wrapped in .me-scroll. opts: edges 'auto' | 'on' | 'off', compact (px height under which edges turn on), compactX */
const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
function scroll(view, o = {}) {
  if (view._meScroll) return view._meScroll;
  const wrap = el('div', { class: 'me-scroll' });
  view.replaceWith(wrap); view.classList.add('me-scroll-view'); wrap.append(view);
  const tr = {}, th = {};
  for (const a of ['y', 'x']) { tr[a] = el('div', { class: 'me-scroll-track', 'data-axis': a, 'aria-hidden': 'true' }); th[a] = el('div', { class: 'me-scroll-thumb' }); tr[a].append(th[a]); wrap.append(tr[a]); }
  for (const e of ['top', 'bottom', 'left', 'right']) wrap.append(el('i', { class: 'me-scroll-edge', 'data-edge': e, 'aria-hidden': 'true' }));
  wrap.append(el('div', { class: 'me-scroll-corner', 'aria-hidden': 'true' }));
  const coarse = matchMedia('(pointer: coarse)');
  const K = { y: { st: 'scrollTop', sz: 'scrollHeight', cl: 'clientHeight', pos: 'top', len: 'height', ptr: 'clientY' }, x: { st: 'scrollLeft', sz: 'scrollWidth', cl: 'clientWidth', pos: 'left', len: 'width', ptr: 'clientX' } };
  const edgesOn = a => o.edges === 'on' || (o.edges !== 'off' && (coarse.matches || view[K[a].cl] <= (a === 'y' ? (o.compact ?? 320) : (o.compactX ?? 480))));
  const trackLen = a => (a === 'y' ? tr.y.clientHeight : tr.x.clientWidth) - 12;
  function layout() {
    if (!view.clientHeight && !view.clientWidth) return;   // not rendered
    const over = { y: view.scrollHeight > view.clientHeight + 1, x: view.scrollWidth > view.clientWidth + 1 };
    wrap.toggleAttribute('data-both', over.x && over.y);
    const more = [];
    for (const a of ['y', 'x']) {
      const k = K[a]; tr[a].hidden = !over[a]; if (!over[a]) continue;
      const max = view[k.sz] - view[k.cl], len = trackLen(a), tl = Math.max(28, len * view[k.cl] / view[k.sz]);
      th[a].style[k.len] = tl + 'px'; th[a].style[k.pos] = (6 + (len - tl) * (view[k.st] / max)) + 'px';
      if (edgesOn(a)) { if (view[k.st] > 2) more.push(a === 'y' ? 'top' : 'left'); if (max - view[k.st] > 2) more.push(a === 'y' ? 'bottom' : 'right'); }
    }
    more.length ? wrap.dataset.more = more.join(' ') : wrap.removeAttribute('data-more');
    const scrolls = over.x || over.y;   // a scroller with nothing focusable inside must itself be reachable by keyboard
    if (scrolls && !view.hasAttribute('tabindex') && !view.querySelector(FOCUSABLE)) { view.tabIndex = 0; view.dataset.meTab = ''; }
    else if (!scrolls && view.hasAttribute('data-me-tab')) { view.removeAttribute('tabindex'); delete view.dataset.meTab; }
  }
  let q = 0, idle; const sched = () => { if (!q) q = requestAnimationFrame(() => { q = 0; layout(); }); };
  view.addEventListener('scroll', () => { sched(); wrap.setAttribute('data-active', ''); clearTimeout(idle); idle = setTimeout(() => wrap.removeAttribute('data-active'), 1100); }, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(sched).observe(view);
  new MutationObserver(sched).observe(view, { childList: true, subtree: true, characterData: true });
  coarse.addEventListener?.('change', sched);
  for (const a of ['y', 'x']) {
    const k = K[a]; let start = null;
    th[a].addEventListener('pointerdown', e => { e.preventDefault(); th[a].setPointerCapture(e.pointerId); tr[a].setAttribute('data-drag', ''); start = { p: e[k.ptr], s: view[k.st] }; });
    th[a].addEventListener('pointermove', e => { if (!start) return; view[k.st] = start.s + (e[k.ptr] - start.p) * (view[k.sz] - view[k.cl]) / (trackLen(a) - parseFloat(th[a].style[k.len])); });
    const end = () => { start = null; tr[a].removeAttribute('data-drag'); };
    th[a].addEventListener('pointerup', end); th[a].addEventListener('pointercancel', end);
    tr[a].addEventListener('pointerdown', e => { if (e.target !== tr[a]) return; const p = e[k.ptr] - tr[a].getBoundingClientRect()[k.pos]; view[k.st] += (p < parseFloat(th[a].style[k.pos]) ? -1 : 1) * view[k.cl] * .9; });
  }
  layout();
  return (view._meScroll = { wrap, view, layout });
}

/* ------------------------------------------------------------------- split */
function split(el, o = {}) {
  const btns = $$('button', el);
  const set = c => { btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === c))); c ? el.dataset.chosen = c : el.removeAttribute('data-chosen'); fire(el, 'me-split', c); o.onChange?.(c); };
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.getAttribute('aria-busy') === 'true') return; set(b.getAttribute('aria-pressed') === 'true' && !o.sticky ? null : b.dataset.c); });
  el.addEventListener('keydown', e => { if (e.key === 'Escape' && el.dataset.chosen) { e.stopPropagation(); set(null); } });
  return { set, get chosen() { return el.dataset.chosen || null; } };
}

function init() {
  $$('[data-me-scroll]').forEach(v => scroll(v, { edges: v.dataset.meScroll || 'auto' }));
  $$('.me-tabs, .me-rail').forEach(tabsOverflow);
  $$('.me-toolbar').forEach(toolbar);
}
window.ME = { icon, chart, fmt, combobox, datepicker, palette, upload, tabsOverflow, tree, toolbar, wizard, split, scroll, init };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
