"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Contract, IncidentTurn } from "../lib/types";
import { Sidebar } from "./Sidebar";

const SUGGESTIONS = [
  "Summarise my contract's activity over the last 24 hours",
  "Are there any failed or reverted transactions?",
  "Which internal calls are reverting, and why?",
  "Who are the most active callers?",
];

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
        if (cs.length) setContractId(cs[0]!.id);
      } catch (e) {
        setBanner((e as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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
      setMessages((m) => [...m, { role: "agent", text: `⚠ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const empty = messages.length === 0;
  const disabled = busy || !contractId;

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">AI incident agent</span>
          <div className="spacer" />
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
                  c.address.slice(0, 8) +
                  "…"}
              </option>
            ))}
          </select>
          <span className="auth-chip" title="Authentication is not wired up yet">
            Auth · TBD
          </span>
        </div>

        {banner ? (
          <div
            className="agent-msg"
            style={{ margin: "8px 18px", borderColor: "var(--danger)" }}
          >
            {banner}
          </div>
        ) : null}

        {empty ? (
          <div className="incident-hero">
            <div className="incident-hero-title">Ask about your smart contract</div>
            <div className="incident-hero-sub">
              The incident agent inspects your indexed events, transactions and
              traces to answer questions and surface anomalies.
            </div>
            <div className="incident-hero-input">
              <input
                className="input"
                placeholder="Prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={disabled}
              />
              <button
                className="btn primary"
                onClick={() => send()}
                disabled={disabled}
              >
                Send
              </button>
            </div>
            <div className="incident-suggest">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="chip"
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
                  <div className="role">
                    {m.role === "user" ? "You" : "Incident agent"}
                  </div>
                  <div className="chat-text">{m.text}</div>
                </div>
              ))}
              {busy ? (
                <div className="chat-msg agent">
                  <div className="role">Incident agent</div>
                  <div className="chat-text dim">Investigating…</div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
            <div className="promptbar">
              <input
                className="input"
                placeholder="Ask a follow-up…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={disabled}
              />
              <button
                className="btn primary"
                onClick={() => send()}
                disabled={disabled}
              >
                {busy ? "Thinking…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
