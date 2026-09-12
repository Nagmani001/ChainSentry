# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are technical operators of on-chain systems, reaching for ChainSentry in three recurring situations:

- **Protocol / dApp dev teams** — engineers who own a deployed contract, doing ongoing monitoring and incident response on their own protocol.
- **DevOps / on-call SRE** — operators watching dashboards and reacting to production anomalies (revert spikes, gas burn, dropped confirmation rates) under time pressure.
- **Analysts / researchers** — people studying any public contract's activity without owning it: metrics, flows, and behavioral patterns.

Across all three the job is the same shape: understand what a smart contract is _actually doing_ on-chain, fast, without having instrumented it ahead of time.

## Product Purpose

ChainSentry is an observability stack for smart contracts — "Prometheus / Grafana / Loki for smart contracts." It treats a deployed Ethereum contract as the backend layer and reconstructs an observability picture from Graph-indexed on-chain data, because event logs and transaction context already exist as a free, public, append-only record. Success means an operator can point at any contract and immediately see, dashboard, query, and diagnose its behavior — with no code changes to the contract and no prior instrumentation.

## Positioning

The differentiator is the **zero-config flow**: paste a contract address + chain (devnet / testnet / mainnet) + a natural-language prompt → the backend fetches the ABI, auto-generates a subgraph, deploys it, queries The Graph, and stores Graph-indexed on-chain data in ClickHouse — which dashboards and the AI Incident Agent then query. No developer instrumentation is required because the telemetry is derived from the chain itself. A neighboring APM/observability product cannot truthfully claim this: it depends on the contract being the observed backend and the public chain being the append-only data source.

## Operating Context

- Three observability pillars mapped to Graph-indexed on-chain primitives: **Logs** = decoded event entities; **Metrics** = derived time-series from indexed event and transaction context; **Traces** = Graph-provided call/correlation data when available, correlated on txHash.
- An **AI Incident Agent** (conversational): anomaly detection → pull correlated traces + logs + metrics → root-cause analysis.
- An **MCP server** exposing the same data to external agents/tools.
- Dashboard usage pattern: left navigation rail (Metrics / Logs / Traces / AI Incident Agent / web2↔web3) plus a prompt-driven "pane builder" that composes a grid of panels.
- Environments map to Graph networks: mainnet = chain 1, testnet = Sepolia (11155111), devnet = Holesky (17000).

## Capabilities and Constraints

- Ingestion is **generated subgraph → The Graph query API → ClickHouse**. Blockchain-derived frontend data and ClickHouse telemetry must come from Graph-indexed entities, not direct RPC reads.
- Data stores split by role: **Postgres** (Prisma) holds app / config / job state (Contract, Deployment, IngestionJob); **ClickHouse** holds telemetry (`events`, `transactions` as ReplacingMergeTree, queried with FINAL for dedup, isolated by `chain_id`).
- ABI resolution via Sourcify v2 zero-config lookup.
- Frontend stack (existing, not a fresh decision): Next.js 16, React 19, `react-grid-layout` for the dashboard, Recharts for charts, Geist Sans + Geist Mono, in a Turborepo + pnpm monorepo (`apps/web`).
- Start block comes from the request when provided, otherwise the generated subgraph starts at block 0 so The Graph is the indexing source of truth.
- Auto-generated subgraph mappings simplify Solidity tuples to String, so `graph build` may fail on tuple-heavy events.
- Traces must be backed by Graph-indexed data before being stored or displayed; RPC trace ingestion is out of product scope.

## Brand Commitments

- **Name:** ChainSentry.
- **Voice:** technical and precise — engineer-to-engineer, terse, using terminal/observability vernacular (Prometheus/Grafana/Loki-adjacent). No marketing fluff; the vocabulary of the domain is the vocabulary of the product.
- Existing incumbent visual world (dark control-room aesthetic, green signal accent, monospace-forward) is design authority to be documented and preserved unless a future redesign is explicitly requested.

## Evidence on Hand

- End-to-end ingestion verified on real mainnet/testnet contracts (2026-09-11): Seaport (mainnet, 65 events), UniswapV3Pool (mainnet, 20 events), WETH9 (Sepolia, 24 events).
- Wireframe and doc images stored in `.claude/prompt-images/`.
- No testimonials, customer names, benchmarks, pricing, or SLA/uptime claims exist yet — future work must not fabricate them.

## Product Principles

1. **Zero instrumentation, ever.** The contract and the public chain are the only inputs; anything requiring the operator to change their contract is out of scope.
2. **The chain is the source of truth.** Telemetry is derived from a public, append-only record — reconstruction over collection.
3. **From address to insight in one move.** The paste-and-prompt path is the product; every feature should shorten the distance between "here is a contract" and "here is what it's doing."
4. **Speak the operator's language.** Match the mental model and vocabulary of observability tooling (logs/metrics/traces, RCA, panels) so the tool feels native to people who already run Grafana/Prometheus.
5. **Correlated, not siloed.** Logs, metrics, and traces are joinable on shared keys (txHash, chain_id) so an incident can be walked end to end.
