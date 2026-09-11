"use client";

import { useMemo, useState } from "react";
import type { QueryResult } from "../lib/types";
import { Icon } from "./Icon";

const TIME_KEYS = ["block_timestamp", "timestamp", "time", "t"];
const NAME_KEYS = ["event_name", "name", "event"];
const SUMMARY_KEYS = ["event_signature", "signature", "message", "data"];

function pick(cols: string[], candidates: string[]): string | null {
  for (const c of candidates) if (cols.includes(c)) return c;
  return null;
}

function fmtTime(v: unknown): string {
  const s = String(v ?? "");
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(s);
  return m ? `${m[1]} ${m[2]}` : s;
}

function prettyArgs(v: unknown): string {
  const s = String(v ?? "");
  if (!s) return "";
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function argsSummary(v: unknown): string {
  const s = String(v ?? "");
  if (!s) return "";
  try {
    const obj = JSON.parse(s) as Record<string, unknown>;
    return Object.entries(obj)
      .map(([k, val]) => `${k}=${String(val)}`)
      .join("  ");
  } catch {
    return s;
  }
}

function LogRow({
  row,
  cols,
  timeKey,
  nameKey,
}: {
  row: Record<string, unknown>;
  cols: string[];
  timeKey: string | null;
  nameKey: string | null;
}) {
  const [open, setOpen] = useState(false);
  const summaryKey = pick(cols, SUMMARY_KEYS);
  const summary =
    cols.includes("args") && argsSummary(row["args"])
      ? argsSummary(row["args"])
      : summaryKey
        ? String(row[summaryKey] ?? "")
        : "";

  return (
    <div className={`log-row ${open ? "open" : ""}`}>
      <button className="log-line" onClick={() => setOpen((v) => !v)}>
        <span className="log-caret">
          <Icon name={open ? "chevronDown" : "chevronRight"} size={13} />
        </span>
        {timeKey ? (
          <span className="log-time">{fmtTime(row[timeKey])}</span>
        ) : null}
        {nameKey ? (
          <span className="log-badge">{String(row[nameKey] ?? "")}</span>
        ) : null}
        <span className="log-summary">{summary}</span>
      </button>
      {open ? (
        <div className="log-detail">
          {cols.map((c) => (
            <div className="log-field" key={c}>
              <div className="log-field-key">{c}</div>
              <pre className="log-field-val">
                {c === "args" ? prettyArgs(row[c]) : String(row[c] ?? "")}
              </pre>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LogStream({ result }: { result: QueryResult }) {
  const cols = useMemo(() => result.columns.map((c) => c.name), [result]);
  const timeKey = pick(cols, TIME_KEYS);
  const nameKey = pick(cols, NAME_KEYS);

  if (result.rows.length === 0) {
    return <div className="panel-loading">No log records.</div>;
  }

  return (
    <div className="log-stream">
      {result.rows.map((row, i) => (
        <LogRow
          key={i}
          row={row}
          cols={cols}
          timeKey={timeKey}
          nameKey={nameKey}
        />
      ))}
    </div>
  );
}
