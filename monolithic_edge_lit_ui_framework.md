# Monolithic Edge-Lit UI Framework (v1.0)
**Design Specification Document**

The Monolithic Edge-Lit framework (also referred to as the "XPS Trackpad" architecture) abandons traditional rounded, floating container cards. Instead, it defines interactive zones through structural 1px micro-dividers, 2px micro-radii, and precise edge-illumination physics. Light acts as structure.

---

## Phase 1: Architectural Foundations & Dual-Theme Physics

### 1.1 Global Token Architecture
The physical geometry of the framework relies on strict adherence to a micro-scale and a 4px layout grid.

*   **Geometry Tokens:**
    *   `--radius-none`: `0px` — Used for flush interior grid intersections.
    *   `--radius-micro`: `2px` — The absolute maximum curve applied to any outer boundary. 
    *   `--stroke-hairline`: `1px` — Structural grid lines and XPS input boundaries.
    *   `--stroke-bar`: `2px` — Top light-bars and active edge indicators.

*   **Spacing Scale (4px Base):**
    *   `space-1 (4px)` to `space-2 (8px)`: Component-level interior gaps.
    *   `space-4 (16px)` to `space-6 (24px)`: Panel padding and grid layout gaps.

*   **Typography Scale:**
    *   **Labels/Meta:** `10px` size / `14px` line-height / `0.15em` tracking (Uppercase).
    *   **Body/Inputs:** `12px` size / `18px` line-height / `0.02em` tracking.
    *   **Section Headers:** `14px` size / `20px` line-height / `0.10em` tracking (Uppercase).

### 1.2 Dual-Theme Illumination Physics
The framework adapts to light and dark environments by changing light emission physics rather than structural geometry.

| Physics Trait | Dark Mode (`#08090d`) | Light Mode (`#f8fafc`) |
| :--- | :--- | :--- |
| **Grid Lines** | Translucent light (`rgba(255, 255, 255, 0.08)`) | High-density dark (`rgba(0, 0, 0, 0.12)`) |
| **Active Glows** | Unmasked Gaussian halos radiating outward | Directional inset etches and soft ambient washes |
| **Top Light-Bar** | High-luminance neon (`#6366f1`) | Saturated cobalt core (`#3730a3`) |
| **Backlighting** | Top-down radial emission (`25%` opacity) | Subtle photonic surface wash (`8%` opacity) |

---

## Phase 2: Core Primitive Components

### 2.1 XPS Boundary Inputs
Inputs use zero top/bottom borders. They are framed exclusively by 1px vertical tick marks on the left and right edges.

```css
.xps-field-anchor {
  position: relative;
  background: transparent;
}
/* Idle State: Short 1px ticks */
.xps-field-anchor::before, .xps-field-anchor::after {
  content: '';
  position: absolute;
  top: 20%; bottom: 20%;
  width: 1px;
  background: var(--mono-divider-active);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.xps-field-anchor::before { left: 0; }
.xps-field-anchor::after { right: 0; }

/* Focus State: Full height + Glow */
.xps-field-anchor:focus-within::before, .xps-field-anchor:focus-within::after {
  top: 10%; bottom: 10%;
  background: var(--mono-accent);
  box-shadow: var(--xps-tick-shadow);
}
```

### 2.2 Monolithic Edge-Lit Checkboxes
A `14px` x `14px` square (`2px` radius). Selection creates an L-shaped light reveal along the top and left edges, eliminating standard centered checkmarks.

```css
.mono-checkbox:checked {
  background: var(--mono-accent-fill);
  border-color: transparent;
}
.mono-checkbox:checked::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-top: 2px solid var(--mono-accent-bar);
  border-left: 2px solid var(--mono-accent-bar);
  border-radius: var(--radius-micro) 0 0 0;
  box-shadow: var(--mono-accent-shadow);
}
```

### 2.3 Recessed Trackpad Slide Switches & Sliders
*   **Switches:** A recessed channel (`border: 1px solid var(--mono-divider)`) with a 2px-wide vertical node. When active, the node slides right, glowing brightly.
*   **Precision Sliders:** The track is a 1px hairline. The thumb is a 2px-wide vertical tick marker projecting above and below the track, glowing on interaction.

---

## Phase 3: Composite Patterns

### 3.1 Monolithic Header & Navigation Docks
Navbars do not use floating background pills for active tabs. Instead, tabs sit flush inside a 1px grid row.
*   **Active Tab:** Features a `2px` top light-bar. The left and right 1px vertical borders fade out toward the bottom using a CSS linear gradient mask.
*   **Grid:** All navigation items are separated by 1px full-height hairlines.

### 3.2 Data Grids & Dense Tables
Tables abandon striped backgrounds and rounded outer borders.
*   **Structure:** Pure intersecting 1px grids.
*   **Hover State:** Row hover triggers a left-edge `2px` accent light-bar rather than a full row background tint.

### 3.3 Overlay Panels & Modals
Floating surfaces utilize a 1px outer frame with a `2px` radius and heavy drop shadows (`0 30px 60px rgba(0,0,0,0.6)` in Dark Mode). 
*   **Split Actions:** Footer actions (Accept/Cancel) share one panel split by a 1px line. Clicking an action causes the central divider to glow directionally and triggers a fading border reveal on the chosen side.

---

## Phase 4: State Matrix & Accessibility (a11y)

### 4.1 The 6-State Component Matrix

1.  **Default:** Muted text, transparent backgrounds, `0.08` opacity hairlines.
2.  **Hover:** Text brightens to primary text color; hairline borders step up to `0.20` opacity.
3.  **Focus (Keyboard):** Triggers same geometry/light behavior as Active, plus a `outline: 1px solid var(--mono-accent)` offset by `4px` strictly for keyboard-navigation accessibility.
4.  **Active (Pressed):** Top light bars illuminate, radial backlights trigger, and shadows bloom.
5.  **Disabled:** Overall opacity reduced to `0.40`. Pointer events disabled. Light-emission variables (`--mono-accent-shadow`, `--mono-accent-fill`) forced to transparent. 
6.  **Error / Validation:** XPS boundary ticks and top light-bars switch to Amber (`#f59e0b`) or Crimson (`#f43f5e`).

### 4.2 Accessibility Fallbacks
```css
/* High Contrast / Reduced Motion Override */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
@media (prefers-contrast: more) {
  :root {
    --mono-divider: rgba(255, 255, 255, 0.4);
    --xps-tick-idle: rgba(255, 255, 255, 0.8);
  }
}
```

---

## Phase 5: Final Token Export & Implementation

### 5.1 Base CSS Variables (`theme.css`)
```css
:root, [data-theme="dark"] {
  --color-canvas: #08090d;
  --color-panel: #101218;
  --color-surface: #161922;
  --color-text-primary: #f1f5f9;
  --color-text-muted: #64748b;
  --stroke-divider: rgba(255, 255, 255, 0.08);
  --stroke-divider-active: rgba(255, 255, 255, 0.20);
  
  --accent-base: #6366f1;
  --accent-core: #818cf8;
  --accent-glow: rgba(99, 102, 241, 0.45);
  --accent-fill: radial-gradient(ellipse at top, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
  --accent-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
  
  --radius-micro: 2px;
  --font-mono: -apple-system, BlinkMacSystemFont, "SF Pro Display", monospace;
}

[data-theme="light"] {
  --color-canvas: #f1f5f9;
  --color-panel: #ffffff;
  --color-surface: #f8fafc;
  --color-text-primary: #0f172a;
  --color-text-muted: #64748b;
  --stroke-divider: rgba(0, 0, 0, 0.08);
  --stroke-divider-active: rgba(0, 0, 0, 0.22);
  
  --accent-base: #4338ca;
  --accent-core: #3730a3;
  --accent-glow: rgba(67, 56, 202, 0.20);
  --accent-fill: radial-gradient(ellipse at top, rgba(67, 56, 202, 0.08) 0%, transparent 75%);
  --accent-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(67, 56, 202, 0.15);
}
```

### 5.2 Tailwind CSS Configuration (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        panel: "var(--color-panel)",
        surface: "var(--color-surface)",
        text: {
          primary: "var(--color-text-primary)",
          muted: "var(--color-text-muted)",
        },
        divider: {
          DEFAULT: "var(--stroke-divider)",
          active: "var(--stroke-divider-active)",
        },
        accent: {
          DEFAULT: "var(--accent-base)",
          core: "var(--accent-core)",
        }
      },
      borderRadius: {
        micro: "var(--radius-micro)",
      },
      boxShadow: {
        'accent-glow': "var(--accent-shadow)",
      },
      backgroundImage: {
        'accent-fill': "var(--accent-fill)",
      },
      fontFamily: {
        mono: "var(--font-mono)",
      },
      letterSpacing: {
        'label': '0.15em',
        'title': '0.10em',
        'body': '0.02em',
      }
    }
  },
  plugins: [],
}
```