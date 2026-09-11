"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Contract, Environment, IncidentTurn } from "../lib/types";
import { Icon } from "./Icon";

const SUGGESTIONS = [
  "Summarise my contract's activity over the last 24 hours",
  "Are there any failed or reverted transactions?",
  "Which internal calls are reverting, and why?",
  "Who are the most active callers?",
];

const ENV_BADGE: Record<Environment, string> = {
  devnet: "env-dev",
  testnet: "env-test",
  mainnet: "env-main",
};

function shortAddr(a: string): string {
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function IncidentAgent() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractId, setContractId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<IncidentTurn[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const cs = await api.listContracts();
        setContracts(cs);
        const wanted =
          new URLSearchParams(window.location.search).get("c") ?? "";
        const pick = cs.find((c) => c.id === wanted) ?? cs[0];
        if (pick) setContractId(pick.id);
      } catch {
        setBanner(
          "Can't reach the ChainSentry API — the incident agent needs a running API to investigate.",
        );
      }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const active = contracts.find((c) => c.id === contractId);

  const send = async (text?: string) => {
    const q = (text ?? prompt).trim();
    if (!q || !contractId || busy) return;
    setPrompt("");
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await api.incident(q, contractId, history);
      setMessages((m) => [...m, { role: "agent", text: res.answer }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "agent", text: `${(e as Error).message}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const empty = messages.length === 0;
  const disabled = busy || !contractId;

  return (
    <div className="dash">
      <div className="dash-toolbar">
        <div className="dash-title-group">
          <span className="dash-title-mark">
            <Icon name="incident" size={18} />
          </span>
          <h1 className="dash-title">Incident agent</h1>
        </div>
        <div className="spacer" />
        <div className="var">
          <span className="var-label">contract</span>
          <div className="select-wrap">
            <select
              className="select"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            >
              {contracts.length === 0 ? <option value="">No contracts</option> : null}
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.name ?? "Contract") +
                    " · " +
                    c.environment +
                    " · " +
                    c.address.slice(0, 10) +
                    "…"}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} className="select-chevron" />
          </div>
        </div>
        {active ? (
          <span className={`env-badge ${ENV_BADGE[active.environment]}`}>
            {active.environment}
          </span>
        ) : null}
      </div>

      {banner ? (
        <div className="alert warn dash-alert">
          <Icon name="warning" size={16} />
          <span>{banner}</span>
          <button
            className="alert-dismiss"
            onClick={() => setBanner(null)}
            aria-label="Dismiss"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}

      {empty ? (
        <div className="incident-hero">
          <span className="incident-hero-mark">
            <Icon name="incident" size={30} />
          </span>
          <div className="incident-hero-title">Investigate your contract</div>
          <div className="incident-hero-sub">
            The incident agent inspects indexed events, transactions and traces
            to answer questions, correlate signals and surface anomalies —
            grounded in the on-chain record.
          </div>
          <div className="incident-hero-input">
            <input
              className="input"
              placeholder="Ask about anomalies, reverts, callers, gas…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={disabled}
            />
            <button className="btn primary lg" onClick={() => send()} disabled={disabled}>
              Investigate <Icon name="send" size={16} />
            </button>
          </div>
          <div className="incident-suggest">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="sample-chip"
                onClick={() => send(s)}
                disabled={disabled}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="incident-thread">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="chat-avatar">
                  <Icon name={m.role === "user" ? "user" : "incident"} size={15} />
                </div>
                <div className="chat-bubble">
                  <div className="role">
                    {m.role === "user" ? "You" : "Incident agent"}
                  </div>
                  <div className="chat-text">{m.text}</div>
                </div>
              </div>
            ))}
            {busy ? (
              <div className="chat-msg agent">
                <div className="chat-avatar">
                  <Icon name="incident" size={15} />
                </div>
                <div className="chat-bubble">
                  <div className="role">Incident agent</div>
                  <div className="chat-text dim">
                    <span className="typing">
                      <span />
                      <span />
                      <span />
                    </span>
                    Investigating the on-chain record…
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
          <div className="promptbar">
            <span className="promptbar-icon">
              <Icon name="incident" size={17} />
            </span>
            <input
              className="input"
              placeholder="Ask a follow-up…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={disabled}
            />
            <button className="btn primary" onClick={() => send()} disabled={disabled}>
              {busy ? (
                <>
                  <span className="spinner" /> Thinking…
                </>
              ) : (
                <>
                  Send <Icon name="send" size={16} />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
