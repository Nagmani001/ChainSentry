"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import type { Contract, Environment } from "../lib/types";
import { Icon } from "./Icon";

const ENVIRONMENTS: { key: Environment; label: string; chain: string }[] = [
  { key: "devnet", label: "Devnet", chain: "Holesky" },
  { key: "testnet", label: "Testnet", chain: "Sepolia" },
  { key: "mainnet", label: "Mainnet", chain: "Ethereum" },
];

const ENV_BADGE: Record<Environment, string> = {
  devnet: "env-dev",
  testnet: "env-test",
  mainnet: "env-main",
};

function shortAddr(a: string): string {
  return a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
}

export function ConnectScreen() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [prompt, setPrompt] = useState("");
  const [environment, setEnvironment] = useState<Environment>("mainnet");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recent, setRecent] = useState<Contract[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRecent(await api.listContracts());
      } catch {
        setRecent([]);
      } finally {
        setLoadingRecent(false);
      }
    })();
  }, []);

  const valid = /^0x[a-fA-F0-9]{40}$/.test(address.trim());

  const connect = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createContract({
        address: address.trim(),
        environment,
        prompt: prompt.trim(),
      });
      router.push(`/metrics?c=${res.contract.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="connect">
      <div className="connect-panel">
        <div className="connect-header">
          <h1 className="connect-title">Connect a contract</h1>
          <p className="connect-sub">
            Point ChainSentry at any deployed contract. It fetches the ABI,
            builds a subgraph and stores Graph-indexed logs and metrics — no
            instrumentation required.
          </p>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="addr">
            Contract address
          </label>
          <div className={`input-affix ${address && !valid ? "invalid" : ""}`}>
            <span className="input-prefix">0x</span>
            <input
              id="addr"
              className="input mono"
              placeholder="0000000000000000000000000000000000000000"
              value={address.replace(/^0x/, "")}
              onChange={(e) =>
                setAddress("0x" + e.target.value.replace(/^0x/, "").trim())
              }
              onKeyDown={(e) => e.key === "Enter" && connect()}
              spellCheck={false}
              autoComplete="off"
            />
            {address ? (
              <span className={`input-status ${valid ? "ok" : "bad"}`}>
                <Icon name={valid ? "check" : "close"} size={15} />
              </span>
            ) : null}
          </div>
          {address && !valid ? (
            <div className="form-help err">
              Enter a 40-character hex EVM address.
            </div>
          ) : (
            <div className="form-help">
              An ERC-20, AMM pool, marketplace — any verified contract works.
            </div>
          )}
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="prompt">
            What do you want to observe?
            <span className="form-optional">optional</span>
          </label>
          <input
            id="prompt"
            className="input"
            placeholder="e.g. swaps, reverts and gas over the last few thousand blocks"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connect()}
          />
          <div className="form-help">
            The prompt selects which events to index and which metrics to
            derive.
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Environment</label>
          <div className="segmented" role="tablist" aria-label="Environment">
            {ENVIRONMENTS.map((env) => (
              <button
                key={env.key}
                role="tab"
                aria-selected={environment === env.key}
                className={`seg ${environment === env.key ? "active" : ""}`}
                onClick={() => setEnvironment(env.key)}
              >
                <span className="seg-label">{env.label}</span>
                <span className="seg-chain">{env.chain}</span>
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="alert error">
            <Icon name="warning" size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="connect-actions">
          <button
            className="btn primary lg"
            onClick={connect}
            disabled={!valid || submitting}
          >
            {submitting ? (
              <>
                <span className="spinner" /> Indexing chain…
              </>
            ) : (
              <>
                Connect &amp; observe
                <Icon name="arrowRight" size={17} />
              </>
            )}
          </button>
          {submitting ? (
            <span className="connect-progress">
              Fetching ABI, backfilling and decoding — this can take a moment.
            </span>
          ) : null}
        </div>

        <div className="samples">
          <span className="samples-label">
            Connected contracts and dashboards are loaded from the API after
            sign-in.
          </span>
        </div>
      </div>

      <aside className="connect-aside">
        <div className="aside-head">
          <span className="aside-title">Connected contracts</span>
          <span className="aside-count">{recent.length}</span>
        </div>
        {loadingRecent ? (
          <div className="aside-skeleton">
            <span className="sk-row" />
            <span className="sk-row" />
            <span className="sk-row" />
          </div>
        ) : recent.length === 0 ? (
          <div className="aside-empty">
            <Icon name="apps" size={22} />
            <p>No contracts yet.</p>
            <span>Connect one to start streaming telemetry.</span>
          </div>
        ) : (
          <div className="aside-list">
            {recent.map((c) => (
              <Link key={c.id} href={`/metrics?c=${c.id}`} className="ds-row">
                <span className="ds-mark">
                  <Icon name="chart" size={16} />
                </span>
                <span className="ds-body">
                  <span className="ds-name">{c.name ?? "Contract"}</span>
                  <span className="ds-addr mono">{shortAddr(c.address)}</span>
                </span>
                <span className={`env-badge ${ENV_BADGE[c.environment]}`}>
                  {c.environment}
                </span>
                <span className="ds-go">
                  <Icon name="chevronRight" size={16} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
