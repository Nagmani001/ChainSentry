"use client";

import { useMemo, useState } from "react";
import type { QueryResult } from "../lib/types";

interface Frame {
  txHash: string;
  blockNumber: string;
  traceAddress: string;
  depth: number;
  callType: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  methodSelector: string;
  error: string;
}

interface TxGroup {
  txHash: string;
  blockNumber: string;
  frames: Frame[];
}

function short(addr: string): string {
  if (!addr) return "—";
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function weiToEth(wei: string): string | null {
  if (!wei || wei === "0") return null;
  try {
    const v = BigInt(wei);
    if (v === 0n) return null;
    const whole = v / 10n ** 18n;
    const frac = (v % 10n ** 18n).toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : `${whole}`;
  } catch {
    return null;
  }
}

function toFrame(row: Record<string, unknown>): Frame {
  const s = (k: string) => String(row[k] ?? "");
  return {
    txHash: s("tx_hash"),
    blockNumber: s("block_number"),
    traceAddress: s("trace_address"),
    depth: Number(row["depth"] ?? 0),
    callType: s("call_type") || "CALL",
    from: s("from_address"),
    to: s("to_address"),
    value: s("value"),
    gasUsed: s("gas_used"),
    methodSelector: s("method_selector"),
    error: s("error"),
  };
}

function TxTree({ group, open }: { group: TxGroup; open: boolean }) {
  const [expanded, setExpanded] = useState(open);
  const failed = group.frames.some((f) => f.error);

  return (
    <div className={`ct-tx ${expanded ? "open" : ""}`}>
      <button className="ct-tx-head" onClick={() => setExpanded((v) => !v)}>
        <span className="log-caret">{expanded ? "▾" : "▸"}</span>
        <span className="ct-txhash">{short(group.txHash)}</span>
        <span className="ct-meta">block {group.blockNumber}</span>
        <span className="ct-meta">{group.frames.length} calls</span>
        {failed ? <span className="ct-err-badge">reverted</span> : null}
      </button>
      {expanded ? (
        <div className="ct-frames">
          {group.frames.map((f, i) => {
            const eth = weiToEth(f.value);
            return (
              <div
                className="ct-frame"
                key={i}
                style={{ paddingLeft: `${8 + f.depth * 18}px` }}
              >
                <span className={`ct-type ct-${f.callType.toLowerCase()}`}>
                  {f.callType}
                </span>
                <span className="ct-to">{short(f.to)}</span>
                {f.methodSelector ? (
                  <span className="ct-selector">{f.methodSelector}</span>
                ) : null}
                {eth ? <span className="ct-value">{eth} ETH</span> : null}
                <span className="ct-gas">{f.gasUsed} gas</span>
                {f.error ? <span className="ct-err">{f.error}</span> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CallTree({ result }: { result: QueryResult }) {
  const groups = useMemo(() => {
    const map = new Map<string, TxGroup>();
    const order: string[] = [];
    for (const row of result.rows) {
      const f = toFrame(row);
      if (!map.has(f.txHash)) {
        map.set(f.txHash, {
          txHash: f.txHash,
          blockNumber: f.blockNumber,
          frames: [],
        });
        order.push(f.txHash);
      }
      map.get(f.txHash)!.frames.push(f);
    }
    return order.map((h) => map.get(h)!);
  }, [result]);

  if (groups.length === 0) {
    return <div className="panel-loading">No traces. Backfill traces for this contract.</div>;
  }

  return (
    <div className="call-tree">
      {groups.map((g, i) => (
        <TxTree key={g.txHash} group={g} open={i === 0} />
      ))}
    </div>
  );
}
