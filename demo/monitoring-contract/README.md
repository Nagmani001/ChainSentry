# ChainSentry Video Demo Contract

This is an isolated demo for recording the hackathon video. It does not affect the main ChainSentry app, Docker setup, or CD pipeline.

## What The Contract Shows

`SentryDemoVault` behaves like a production contract that depends on another contract, `DependencyProbe`.

Normal flow:

`depositAndProbe()` receives ETH, emits `DepositObserved`, calls the dependency, and emits `DependencyCallSucceeded`.

Incident flow:

The dependency is switched to unhealthy. `depositAndProbe()` still accepts the user transaction, catches the failed external call, emits `DependencyCallFailed`, and every third failure emits `IncidentMarker`.

There is also `forceRevert()` if you want to show an explicitly failed transaction in a block explorer.

## Setup

```bash
cd demo/monitoring-contract
cp .env.example .env
npm install
```

Fill `.env`:

```bash
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
```

## Deploy

```bash
npm run deploy
```

Copy the printed addresses into `.env`:

```bash
VAULT_ADDRESS=0x...
DEPENDENCY_ADDRESS=0x...
```

Use `VAULT_ADDRESS` in ChainSentry as the contract address. Select `testnet`, because this demo uses Sepolia.

Good prompt for ChainSentry:

```text
Monitor deposits, dependency call failures, incident markers, transaction volume, gas usage, and success rate.
```

## Send Normal Traffic

Run this first so the dashboard has healthy activity:

```bash
TX_COUNT=2 npm run traffic
```

In the video, show the metrics/logs pages after ChainSentry indexes the contract.

## Alert Setup In ChainSentry

Create an on-call slot for yourself with your email and phone number.

Create one alert rule on this contract:

```text
Metric: event_count
Operator: >=
Threshold: 5
Window: 15 minutes
Channel: call or email
```

This threshold stays quiet after the normal traffic, then triggers after the incident traffic.

## Trigger The Incident

```bash
TX_COUNT=6 npm run incident
```

This switches the dependency to unhealthy and sends six transactions that emit failure and incident events.

After ChainSentry indexes the new events, evaluate the alert from the UI. If you want to trigger evaluation from the script instead, fill these in `.env`:

```bash
CHAINSENTRY_API_URL=https://YOUR_BACKEND_URL
CHAINSENTRY_PRIVY_TOKEN=YOUR_PRIVY_ACCESS_TOKEN
CHAINSENTRY_ALERT_RULE_ID=YOUR_ALERT_RULE_ID
```

Then run:

```bash
npm run evaluate
```

## Suggested 4 Minute Video Flow

1. Explain the problem: backend engineers have observability, smart contracts usually do not.
2. Show `SentryDemoVault` depending on `DependencyProbe`.
3. Deploy or show the deployed address, then connect it in ChainSentry.
4. Run `npm run traffic` and show logs/metrics starting to appear.
5. Create the alert rule and on-call setup.
6. Run `npm run incident`, show failure events and incident markers.
7. Evaluate the alert and show the email or phone call coming in.
