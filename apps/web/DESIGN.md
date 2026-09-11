---
name: ChainSentry
description: Grafana-dark observability console for smart contracts — logs, metrics, traces.
colors:
  canvas: "#111217"
  panel: "#181b1f"
  raised: "#22252b"
  overlay: "#1d1f24"
  input-bg: "#0e0f13"
  border: "rgba(204, 204, 220, 0.12)"
  border-medium: "rgba(204, 204, 220, 0.2)"
  border-weak: "rgba(204, 204, 220, 0.07)"
  text: "#ccccdc"
  text-2: "rgba(204, 204, 220, 0.65)"
  text-3: "rgba(204, 204, 220, 0.58)"
  blue: "#3d71d9"
  blue-hover: "#5581e0"
  blue-text: "#6e9fff"
  green: "#73bf69"
  yellow: "#fade2a"
  orange: "#ff9830"
  red: "#f2495c"
  red-strong: "#e02f44"
  purple: "#b877d9"
  cyan: "#4dd0e1"
typography:
  display:
    fontFamily: "Roboto Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "42px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontVariant: "tabular-nums"
  headline:
    fontFamily: "Inter, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.03em"
  mono:
    fontFamily: "Roboto Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.5
    fontVariant: "tabular-nums"
rounded:
  ctrl: "2px"
  panel: "3px"
  overlay: "6px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "40px"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.ctrl}"
    height: "32px"
    padding: "0 12px"
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "#ffffff"
    rounded: "{rounded.ctrl}"
    height: "32px"
    padding: "0 12px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
    textColor: "#ffffff"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.ctrl}"
    height: "32px"
    padding: "0 12px"
  button-lg:
    backgroundColor: "{colors.blue}"
    textColor: "#ffffff"
    rounded: "{rounded.ctrl}"
    height: "38px"
    padding: "0 18px"
  input:
    backgroundColor: "{colors.input-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.ctrl}"
    height: "32px"
    padding: "0 11px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "6px 10px 10px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.ctrl}"
    padding: "8px 10px"
  nav-item-active:
    backgroundColor: "rgba(204, 204, 220, 0.09)"
    textColor: "#ffffff"
    rounded: "{rounded.ctrl}"
    padding: "8px 10px"
  chip:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: ChainSentry

## Overview

**Creative North Star: "The Control Room"**

ChainSentry is Grafana rebuilt for smart contracts, and it wears that lineage without apology. This is the observability console a category-fluent operator trusts on sight: a near-black canvas, panels one shade lighter, hairline dividers, dense rows, and monospaced numbers that line up column-to-column. The tool disappears into the task. There is no hero imagery, no gradient stat cards, no glowing cyber-grid — the deliberate refusal of the "web3 neon dashboard" default. Brand lives in precise chrome (a docked nav rail, a real command palette, a breadcrumb bar) rather than in decoration.

Density is a feature, not a compromise. Controls are 32px tall, panel headers 34px, the topbar and nav-brand a tight 44px. Type steps down to 11–13px in chrome and data tables so a full incident picture fits one viewport. Color is spent carefully: the surface is a five-step gray-blue ramp (canvas → panel → raised → overlay), text is a soft off-white (`#ccccdc`) dimmed by opacity rather than by new hex values, and saturated color appears only where it carries meaning — blue for interaction, the classic viz palette for data and status.

The voice is engineer-to-engineer: terse labels, terminal vernacular, values before prose. Every measurement, address, hash and timestamp is rendered in Roboto Mono with tabular figures; everything else is Inter. The result reads as native to anyone who already runs Prometheus, Grafana, or Loki.

**Key Characteristics:**
- Grafana-dark surface ramp: canvas `#111217`, panel `#181b1f`, raised `#22252b`, overlay `#1d1f24`.
- Hairline borders (`rgba(204,204,220,0.07–0.2)`) do the separating; surfaces are flat.
- Blue (`#3d71d9`) is the only chrome accent; the classic viz palette is reserved for data.
- Inter for UI, Roboto Mono + tabular-nums for every value.
- Small radii (2px controls, 3px panels), dense 32px controls, docked 244px nav rail.

## Colors

A five-step dark gray-blue surface ramp carries almost the entire UI; saturated hues are rationed and always meaningful.

### Primary
- **Signal Blue** (`#3d71d9`): The single chrome accent. Fills primary buttons, the active/selected state of controls (segmented tabs, `.btn.active`, command-palette selection), input focus borders, and the grid drag-placeholder. Interaction is the only thing allowed to be blue.
- **Link Blue** (`#6e9fff`): The brighter tint (`blue-text`) for links, active icons, mono hashes/selectors in traces and logs, and the AI-agent role label. Used on text and 1px marks, never as a large fill.
- **Blue Hover** (`#5581e0`): The hover state of primary fills only.

### Secondary — The Classic Viz Palette
The Grafana-canon series colors, used for chart series, status, and call-trace typing — never for UI chrome.
- **Green** (`#73bf69`): Healthy/success signal — mainnet env badge, positive status, transferred `value` in traces, first chart series.
- **Yellow** (`#fade2a`): Attention/warm signal — starred favorites, CREATE opcodes in traces.
- **Orange** (`#ff9830`): Warning — testnet env badge, warn alerts, warn empty-state mark.
- **Red** (`#f2495c`) / **Red Strong** (`#e02f44`): Error/danger — error alerts, panel errors, revert/error badges, SELFDESTRUCT, danger icon-button hover.
- **Purple** (`#b877d9`): devnet env badge, DELEGATECALL typing.
- **Cyan** (`#4dd0e1`): STATICCALL typing and a chart series slot.

### Neutral
- **Canvas** (`#111217`): The app background — nav rail, topbar, variable bar, promptbar all sit on it.
- **Panel** (`#181b1f`): Raised content surfaces — dashboard panels, cards, modals, sticky table headers.
- **Raised** (`#22252b`): The next step up — kbd chips, avatars, agent messages, chip backgrounds, item marks.
- **Overlay** (`#1d1f24`): Floating layers — the command palette body and native select menus.
- **Input Surface** (`#0e0f13`): Recessed field background, darker than canvas so inputs read as wells.
- **Off-White Text** (`#ccccdc`): Primary text. Secondary (`rgba(204,204,220,0.65)`) and tertiary (`rgba(204,204,220,0.58)`) are the same color dimmed by opacity.
- **Hairline Borders** (`rgba(204,204,220,0.07 / 0.12 / 0.2)`): weak / default / medium dividers and control strokes.

### Named Rules
**The Chrome-Not-Decoration Rule.** The only branded flourish is the orange→red gradient (`linear-gradient(135deg, #ff9830, #f2495c)`), and it appears in exactly two places: the 3px active-nav left bar and the wordmark. It never enters content, buttons, or panels.

**The Signal-Color Rule.** The classic viz palette (green/yellow/orange/red/purple/cyan) is reserved for data and status — chart series, env badges, alerts, trace-call typing. Never use a signal color for chrome, and never introduce a saturated color that isn't carrying a meaning.

**The One Accent Rule.** Blue (`#3d71d9` fill, `#6e9fff` on text) is the sole interaction accent. If an element is blue, it is actionable, selected, or a link.

**The Dim-By-Opacity Rule.** Text and border hierarchy come from opacity steps on `rgba(204,204,220,…)`, not from new gray hexes. Reach for `text-2`/`text-3`, not a new value.

## Typography

**Display / Body Font:** Inter (with Helvetica Neue, Arial, system-ui fallback), loaded via next/font.
**Data / Mono Font:** Roboto Mono (with ui-monospace, SFMono-Regular, Menlo fallback), loaded via next/font.

**Character:** A clean neutral sans for chrome and prose, paired with a precise monospace for anything numeric or on-chain. The pairing signals "instrument, not marketing site." Base size is a compact 14px / line-height 1.5.

### Hierarchy
- **Display** (Roboto Mono 600, 42px, line-height 1.05, `-0.02em`, tabular-nums): Single-value stat panels only. The big number is always mono.
- **Headline** (Inter 600, 24–26px, `-0.02em`): Standalone screen heroes — the connect card title, the incident-agent hero.
- **Title** (Inter 600, 15–18px, `-0.01em`): Section and container titles — dashboard title (17px), page `h1` (18px), modal/cmdk titles (15px).
- **Body** (Inter 400, 14px, line-height 1.5): Default UI text, nav items, buttons, form controls.
- **Label** (Inter 600, 11–12px, `0.02–0.04em`, often UPPERCASE): Badges, field labels, group tags, kbd hints. Env badges and trace-type chips uppercase.
- **Mono / Data** (Roboto Mono, 11.5–13.5px, tabular-nums): Tables, log streams, call trees, addresses, hashes, timestamps, kbd chips, variable labels.

### Named Rules
**The Mono-For-Data Rule.** Every value, address, transaction hash, selector, gas figure, and timestamp is Roboto Mono with `font-variant-numeric: tabular-nums`. Prose, labels, and headings are Inter. If it's a number that can change, it's mono.

## Layout

The app is a two-column CSS grid shell: a docked left nav rail (`--nav-w: 244px`, collapsing to 56px) and a fluid main column, filling `100vh`/`100vw` with `overflow: hidden` so only inner regions scroll. The main column stacks a 44px topbar (breadcrumbs + centered ⌘K trigger + right actions), then per-surface chrome, then a scrolling content region.

Dashboards add a stacked toolbar rhythm below the topbar: a `dash-toolbar` (title, star, refresh picker), a template-variable pill row (`var-bar`) for contract/environment, and a scrolling `canvas` (12px 16px padding) hosting a `react-grid-layout` panel grid. The connect screen is a centered two-column grid — a `minmax(0,1fr)` form panel plus a 336px sticky recent-contracts aside — capped at `max-width: 1120px`.

Spacing is dense and rhythmic: 1px gaps between nav items, 6–8px inside controls, 8–12px between toolbar items, 12–16px page padding, 24–28px inside marketing-weight cards (connect panel). Control height is a consistent 32px (38px for large/hero). Breakpoints: 900px (connect collapses to one column, ⌘K trigger hides), 720px (nav rail becomes a fixed off-canvas drawer, mobile menu button appears), 560px (segmented tabs and hero buttons go full-width).

## Elevation & Depth

Depth is conveyed almost entirely by **tonal layering plus hairline borders**, not shadows. The surface ramp (canvas → panel → raised → overlay) tells you what floats above what; a 1px `rgba(204,204,220,…)` border draws every edge. Panels are flat at rest and merely brighten their border on hover (`border-weak` → `border`). Drop shadows are reserved for genuinely floating layers — modals, the command palette, tooltips, and the mobile nav drawer — where they read as structural (this layer is above the page), never ambient decoration.

### Shadow Vocabulary
- **Modal Lift** (`box-shadow: 0 16px 48px rgba(0,0,0,0.55)`): Center-screen dialogs over a `blur(2px)` scrim.
- **Palette Lift** (`box-shadow: 0 20px 60px rgba(0,0,0,0.6)`): The ⌘K command palette, dropped from 12vh.
- **Tooltip Lift** (`box-shadow: 0 4px 12px rgba(0,0,0,0.5)`): Recharts hover tooltips.
- **Drawer Lift** (`box-shadow: 0 0 40px rgba(0,0,0,0.6)`): The off-canvas nav rail on mobile.
- **Active-Tab Underline** (`box-shadow: inset 0 -2px 0 var(--blue)`): The one inset shadow — marks the selected segmented tab.

### Named Rules
**The Flat-Panel Rule.** Content surfaces are flat and bordered. Shadows only appear on layers that literally float above the page (modal, palette, tooltip, drawer). A dashboard panel never casts a shadow.

## Shapes

The form language is tight and rectilinear — small radii signal "instrument." Controls and interactive chrome use a 2px radius (`--radius-ctrl`); panels, cards, alerts, and agent messages use 3px (`--radius`); floating overlays (modal, command palette, connect panels) soften slightly to 6px. Fully round (`999px`) is reserved for pill affordances: sample chips, aside counts, env badges' status dots (circles). Borders are always 1px and hairline. Icons are a custom stroked line set (24×24 viewBox, `stroke-width: 1.9`, round caps/joins, `currentColor`) — never filled glyphs or an icon font.

## Components

### Buttons
- **Shape:** Sharp 2px radius (`--radius-ctrl`), 32px tall (38px `.lg`), 0 12px padding, 14px/500 label, 7px icon gap.
- **Default:** Transparent fill, 1px `border-medium` stroke, `text` label. Hover: faint `rgba(204,204,220,0.07)` wash + brighter border.
- **Primary:** Solid `blue` fill and border, white label. Hover: `blue-hover`. Used for the one committing action per surface ("Connect & observe").
- **Active (toggle):** `rgba(61,113,217,0.15)` fill, `blue` border, `blue-text` label.
- **Ghost:** No border, `text-2` label, hover wash — for low-emphasis and icon-adjacent actions.
- **Icon button:** 30×30 (26×26 in panel headers), no border, `text-2`, hover wash; `.danger` hover goes red, `.star.on` goes yellow.

### Inputs / Fields
- **Style:** Recessed `input-bg` (`#0e0f13`) well, 1px `border-medium`, 2px radius, 32px tall (40px on the connect form, 44px on the incident hero).
- **Focus:** Border shifts to `blue` (no glow); focus-within on affix wrappers. Global `:focus-visible` draws a 2px `blue-text` outline.
- **Error:** Border shifts to `red`; helper text (`form-help.err`) turns red. Affix inputs support a mono prefix (e.g. `0x`) and a valid/invalid status glyph (green check / red).
- **Select:** Same shell with a custom chevron; `.bare` variant strips border/background for inline use (refresh interval, variable pills).

### Cards / Containers
- **Panel (signature):** `panel` background, 1px `border-weak`, 3px radius, flat. A 34px header (drag grip, title, loading dot, hover-revealed action buttons) over a scrolling body. Hover brightens the border to `border`; editing state uses `border-medium`.
- **Connect panel / aside:** `panel` background, 1px `border`, 6px radius, 28px padding.
- **Shadow Strategy:** None (see Elevation). Flat, border-separated.

### Navigation
- **Nav rail:** Canvas background, 244px docked (56px collapsed, off-canvas drawer < 720px), right hairline border. Items are 14px/`text-2`, 2px radius, 8px 10px padding, 1px apart.
- **Hover:** `rgba(204,204,220,0.07)` wash, text → `text`.
- **Active:** `rgba(204,204,220,0.09)` wash, white text, 500 weight, and a 3px orange→red brand gradient bar on the left edge.
- **Children:** Indented to 34px, 13.5px.

### Command Palette (signature)
- Centered overlay dropped 12vh over a `blur(2px)` scrim, 620px max, `overlay` background, 6px radius, Palette-Lift shadow. A 16px search row over a scrolling list; each item has a bordered icon tile, label, hint, and right-aligned uppercase group tag. Active item: `rgba(61,113,217,0.16)` wash, `blue-text` icon.

### Chips / Badges
- **Sample chip:** `raised` fill, `border-medium`, fully round (999px), 13px — recent/example affordances.
- **Env badge:** Tinted by environment — green (mainnet), orange (testnet), purple (devnet) — as a saturated text color over a ~16% tint fill and matching-alpha border, uppercase 11px/600.
- **Log / trace badge:** Tinted mono-adjacent pill (blue for log level, red uppercase for error/revert, per-opcode color for call type).

### Data Displays (signature)
- **Stat:** Left-aligned 42px mono value with a smaller `text-2` unit suffix.
- **Table (`tbl`):** Full-width, mono 12.5px body with tabular-nums, Inter `text-2` sticky headers on `panel`, hairline row borders, faint hover.
- **Log stream / Call tree:** Mono, expandable rows with carets; log detail as a 150px/1fr key-value grid; trace frames indented with an L-connector and per-opcode color-typed pills.
- **Charts (Recharts):** Series drawn from the 8-color viz palette; axis text is 10px mono `text-2`; grid lines `border-weak`; tooltips on `panel` with `border-medium` and 3px radius.

## Do's and Don'ts

### Do:
- **Do** build on the surface ramp — canvas `#111217` for chrome, panel `#181b1f` for content, raised `#22252b` for the next lift, overlay `#1d1f24` for floating layers.
- **Do** render every value, address, hash, and timestamp in Roboto Mono with tabular-nums; keep prose and labels in Inter.
- **Do** keep controls at 32px, radii at 2px (controls) / 3px (panels), and separate surfaces with 1px hairline borders.
- **Do** reserve blue (`#3d71d9` / `#6e9fff`) for interaction and the classic viz palette for data and status.
- **Do** derive text and border hierarchy from opacity steps on `rgba(204,204,220,…)`.

### Don't:
- **Don't** add drop shadows to resting content; only genuinely floating layers (modal, palette, tooltip, drawer) cast shadows.
- **Don't** spend a signal color on chrome, or introduce a saturated hue that doesn't carry meaning — no gradient stat cards, no neon glow, no cyber-grid.
- **Don't** let the orange→red brand gradient leave the active-nav bar and wordmark.
- **Don't** round controls past their scale — no pill-shaped buttons, no large radii on panels (999px is only for chips, counts, and status dots).
- **Don't** use a filled glyph set or icon font; icons are the custom 1.9px stroked line set on a 24×24 grid.
