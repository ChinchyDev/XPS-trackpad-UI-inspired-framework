/* ==========================================================================
   monoedge-elements.js : custom elements over monoedge.js. Load AFTER monoedge.js (and monoedge-icons.js for <me-icon> and the date picker).
   Light DOM on purpose: the framework's CSS and tokens apply as-is, forms see the real inputs, and assistive tech sees ordinary markup.
     <me-icon name="plus" size="lg" flip label="Add">
     <me-chart values="[1,2,3]" labels='["a","b","c"]' unit=" L" axis step spark table label="Water use" caption="...">   (.series = [{name,data,alt}] for several lines)
     <me-scroll edges="auto|on|off" style="height:240px">...</me-scroll>
     <me-date label="Due" name="due" value="2026-11-10" min="2026-11-01" time hint="...">
     <me-combobox label="Crop" name="crop" options='["Tomato","Kale"]' multi custom value='["Kale"]'>
     <me-switch label="Auto mode" name="auto" checked>
   Attributes and properties both work (change an attribute and the element re-renders). Events bubble: input / change (date, combobox), change (switch).
   React: no wrapper is needed. React 19 passes props to custom elements as properties and listens with onChange; for older React set properties through a ref.
   ========================================================================== */
(() => {
'use strict';
if (!window.ME) { console.error('monoedge-elements.js needs monoedge.js first'); return; }
const define = (name, cls) => { if (!customElements.get(name)) customElements.define(name, cls); };
let uid = 0; const nid = p => `${p}-${++uid}`;
const json = (v, fb) => { if (v == null || v === '') return fb; try { return JSON.parse(v); } catch (_) { return fb; } };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const soon = (el, fn) => { if (el._q) return; el._q = Promise.resolve().then(() => { el._q = 0; if (el.isConnected) fn(); }); };   // coalesce several attribute changes into one render

/** Base: re-render when an observed attribute changes. */
class MeBase extends HTMLElement {
  connectedCallback() { this.render(); }
  attributeChangedCallback(n, o, v) { if (o !== v && this.isConnected && this._ready) soon(this, () => this.render()); }
}

/* ---- <me-icon> ---- */
class MeIcon extends MeBase {
  static observedAttributes = ['name', 'size', 'flip', 'label'];
  render() {
    this._ready = true;
    const label = this.getAttribute('label');
    this.innerHTML = ME.icon(this.getAttribute('name') || 'help', this.getAttribute('size') || '', this.hasAttribute('flip'));
    const svg = this.firstElementChild;
    if (label) { svg.removeAttribute('aria-hidden'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); }
  }
}

/* ---- <me-chart> ---- */
class MeChart extends MeBase {
  static observedAttributes = ['values', 'labels', 'unit', 'min', 'max', 'axis', 'step', 'spark', 'table', 'no-area', 'legend', 'caption', 'label', 'empty'];
  get series() { return this._series ?? json(this.getAttribute('values'), []); }
  set series(v) { this._series = v; if (this.isConnected) this.render(); }
  render() {
    this._ready = true;
    const n = k => (this.hasAttribute(k) ? +this.getAttribute(k) : undefined), b = k => this.hasAttribute(k);
    const spark = b('spark');
    this.classList.toggle('me-spark', spark);
    ME.chart(this, this.series, { labels: json(this.getAttribute('labels'), undefined), unit: this.getAttribute('unit') || '', min: n('min'), max: n('max'), axis: b('axis'), step: b('step'), spark, table: b('table'), area: b('no-area') ? false : undefined, legend: this.getAttribute('legend') === 'false' ? false : undefined, caption: this.getAttribute('caption') || undefined, empty: this.getAttribute('empty') || undefined });
    if (!b('table')) { const l = this.getAttribute('label'); if (l) { this.setAttribute('role', 'img'); this.setAttribute('aria-label', l); } }
  }
}

/* ---- <me-scroll> ---- */
class MeScroll extends HTMLElement {
  connectedCallback() { if (this._init) return; this._init = true; ME.scroll(this, { edges: this.getAttribute('edges') || 'auto' }); }
}

/* ---- field helpers ---- */
function field(host, { label, hint, inputAttrs = '' }) {
  const id = nid('me-f');
  host.innerHTML = `<div class="me-field"><label class="me-label" for="${id}">${esc(label || '')}</label><div class="me-anchor"><input id="${id}" ${inputAttrs}></div>${hint ? `<span class="me-hint" id="${id}-h">${esc(hint)}</span>` : ''}</div>`;
  const input = host.querySelector('input'); if (hint) input.setAttribute('aria-describedby', `${id}-h`);
  return input;
}

/* ---- <me-date> ---- */
class MeDate extends MeBase {
  static observedAttributes = ['label', 'name', 'value', 'min', 'max', 'time', 'placeholder', 'hint', 'disabled', 'required'];
  get value() { return this._input ? this._input.value : this.getAttribute('value') || ''; }
  set value(v) { if (this._input) { this._input.value = v; this._input.dispatchEvent(new Event('change', { bubbles: true })); } else this.setAttribute('value', v); }
  get date() { return this._input?.me?.date ?? null; }
  render() {
    this._ready = true; const keep = this._input ? this._input.value : this.getAttribute('value') || '', time = this.hasAttribute('time');
    const a = n => this.hasAttribute(n) ? `${n}="${esc(this.getAttribute(n))}"` : '';
    const input = field(this, { label: this.getAttribute('label'), hint: this.getAttribute('hint'), inputAttrs: `${a('name')} ${a('required')} ${a('disabled')} inputmode="numeric" placeholder="${esc(this.getAttribute('placeholder') || (time ? 'YYYY-MM-DD HH:MM' : 'YYYY-MM-DD'))}" value="${esc(keep)}" autocomplete="off"` });
    this._input = input; ME.datepicker(input, { time, min: this.getAttribute('min') || undefined, max: this.getAttribute('max') || undefined });
  }
}

/* ---- <me-combobox> ---- */
class MeCombobox extends MeBase {
  static observedAttributes = ['label', 'name', 'options', 'multi', 'custom', 'placeholder', 'hint'];
  get options() { return this._options ?? json(this.getAttribute('options'), []); }
  set options(v) { this._options = v; if (this.isConnected) this.render(); }
  get value() { return this._api ? this._api.value : (this.hasAttribute('multi') ? json(this.getAttribute('value'), []) : this.getAttribute('value') || ''); }
  set value(v) { this._pending = v; if (this._api) this._api.set(v); }
  render() {
    this._ready = true; const multi = this.hasAttribute('multi'), name = this.getAttribute('name');
    const initial = this._pending ?? (this._api ? this._api.value : (multi ? json(this.getAttribute('value'), []) : this.getAttribute('value') || ''));
    const input = field(this, { label: this.getAttribute('label'), hint: this.getAttribute('hint'), inputAttrs: `placeholder="${esc(this.getAttribute('placeholder') || '')}" ${!multi && name ? `name="${esc(name)}"` : ''}` });
    if (!multi && initial) input.value = initial;
    const hidden = () => { this.querySelectorAll('input[type=hidden]').forEach(h => h.remove()); if (multi && name) for (const v of this._api.value) { const h = document.createElement('input'); h.type = 'hidden'; h.name = name; h.value = v; this.append(h); } };
    this._api = ME.combobox(input, { options: this.options, multi, custom: this.hasAttribute('custom'), value: multi ? (Array.isArray(initial) ? initial : []) : undefined, onChange: () => { hidden(); this.dispatchEvent(new Event('change', { bubbles: true })); } });
    if (multi) hidden();
    this._input = input;
  }
}

/* ---- <me-switch> ---- */
class MeSwitch extends MeBase {
  static observedAttributes = ['label', 'name', 'checked', 'disabled'];
  get checked() { return this._on ?? this.hasAttribute('checked'); }
  set checked(v) { this._on = !!v; if (this.isConnected) this._sync(); }
  render() {
    this._ready = true; if (this._on === undefined) this._on = this.hasAttribute('checked');
    const id = nid('me-sw');
    this.innerHTML = `<span class="me-row" style="gap:8px"><span class="me-label" id="${id}">${esc(this.getAttribute('label') || '')}</span><button type="button" class="me-switch" role="switch" aria-labelledby="${id}"${this.hasAttribute('disabled') ? ' disabled' : ''}></button></span>${this.getAttribute('name') ? `<input type="hidden" name="${esc(this.getAttribute('name'))}">` : ''}`;
    this._btn = this.querySelector('button'); this._hid = this.querySelector('input');
    this._btn.addEventListener('click', () => { this._on = !this._on; this._sync(); this.dispatchEvent(new Event('change', { bubbles: true })); });
    this._sync();
  }
  _sync() { this._btn.setAttribute('aria-checked', String(this._on)); if (this._hid) { this._hid.value = 'on'; this._hid.disabled = !this._on; } }
}

define('me-icon', MeIcon); define('me-chart', MeChart); define('me-scroll', MeScroll);
define('me-date', MeDate); define('me-combobox', MeCombobox); define('me-switch', MeSwitch);
window.ME.elements = ['me-icon', 'me-chart', 'me-scroll', 'me-date', 'me-combobox', 'me-switch'];
})();
