---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/metrics/page.tsx","app/logs/page.tsx","app/traces/page.tsx","app/incident/page.tsx"]
---

## Scope

ChainSentry web app, full revamp. Surfaces: Home/connect (`/`), Metrics/Logs/Traces dashboards (`/metrics`, `/logs`, `/traces`), Incident agent (`/incident`). Visitor mode: Operate.

## Audience & task

Protocol/dApp dev teams, on-call SRE, and analysts. Job: point at any deployed contract and immediately observe it (logs/metrics/traces) with no instrumentation. Entry task: paste address + prompt, pick environment, land in a live dashboard.

## Direction contract

THESIS: This is Grafana for smart contracts — the observability control room a category-fluent operator trusts on sight. It refuses the "web3 neon dashboard" default (glowing green cyber-grid, gradient stat cards) and the previous timid green-accent starter. The tool disappears into the task; brand lives in precise chrome, not decoration.

OWN-WORLD: Grafana-dark canon at full fidelity. Canvas `#111217`, panels `#181b1f`, raised `#22252b`; hairline borders `rgba(204,204,220,0.09-0.15)`; text `#ccccdc` / secondary `rgba(204,204,220,0.65)`. Blue primary `#3d71d9` (fills), link/accent `#6e9fff`. Classic viz palette (green `#73BF69`, yellow `#FADE2A`, orange `#FF9830`, red `#F2495C`, blue `#5794F2`, purple `#B877D9`). Inter UI + Roboto Mono data. Small radii (2px controls/panels), dense rows, docked left nav rail with icon+label sections and a left active-bar, breadcrumb top bar with a real ⌘K command palette, dashboard toolbar with time-range picker + refresh cadence, template-variable pill row for contract/environment.

STORY: Operator arrives → understands this is an observability tool → connects a contract in one form → is dropped into a populated dashboard → navigates Metrics/Logs/Traces and asks the Incident agent. They believe: "this behaves exactly like the monitoring stack I already run."

FIRST VIEWPORT (Home): left nav rail docked; breadcrumb bar "Home" + centered "Search or jump to… ⌘K"; content is a connect card centered on canvas — heading, contract-address input, observe-prompt input, environment segmented tabs (devnet/testnet/mainnet), primary blue "Connect & observe" button; below it a recent-contracts list. Submitting POSTs /contracts then routes to /metrics for that contract.

FORM: Grafana observability console — the category canon, brief-pinned by the user ("exactly grafana, 99% grafana style"). No concept roll: a brief-pinned direction beats the roll. Craft bar = real Grafana / Grafana Explore.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
