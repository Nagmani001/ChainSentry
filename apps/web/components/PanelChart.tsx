"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QueryResult, VizType } from "../lib/types";
import { LogStream } from "./LogStream";
import { CallTree } from "./CallTree";

const PALETTE = [
  "#73BF69",
  "#5794F2",
  "#FF9830",
  "#B877D9",
  "#F2495C",
  "#FADE2A",
  "#4DD0E1",
  "#FF7383",
];

const AXIS = { stroke: "rgba(204,204,220,0.35)" };
const GRID = "rgba(204,204,220,0.09)";

const tooltipStyle = {
  background: "#181b1f",
  border: "1px solid rgba(204,204,220,0.2)",
  borderRadius: 3,
  fontSize: 12,
  color: "#ccccdc",
  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
};

function isNumericish(v: unknown): boolean {
  if (typeof v === "number") return true;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return true;
  return false;
}

function fmtXLabel(v: unknown): string {
  const s = String(v ?? "");
  const m = /^\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2})/.exec(s);
  return m ? m[1]! : s;
}

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

export function PanelChart({
  viz,
  result,
  unit,
}: {
  viz: VizType;
  result: QueryResult;
  unit?: string;
}) {
  const cols = result.columns.map((c) => c.name);
  const rows = result.rows;

  if (viz === "logs") {
    return <LogStream result={result} />;
  }

  if (viz === "trace") {
    return <CallTree result={result} />;
  }

  if (rows.length === 0) {
    return <div className="panel-loading">No data.</div>;
  }

  if (viz === "stat") {
    const valueCol =
      cols.find((c) => c === "value") ??
      cols.find((c) => isNumericish(rows[0]![c])) ??
      cols[0]!;
    const raw = rows[0]![valueCol];
    const display = isNumericish(raw)
      ? num(raw).toLocaleString(undefined, { maximumFractionDigits: 4 })
      : String(raw);
    return (
      <div className="stat">
        <div className="stat-value">
          {display}
          {unit ? <span className="stat-unit">{unit}</span> : null}
        </div>
      </div>
    );
  }

  if (viz === "table") {
    return (
      <table className="tbl">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c} title={String(r[c] ?? "")}>
                  {String(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const xKey = cols[0]!;
  const seriesKeys = cols
    .slice(1)
    .filter((c) => rows.some((r) => isNumericish(r[c])));
  const activeSeries = seriesKeys.length > 0 ? seriesKeys : [cols[1] ?? xKey];

  const data = rows.map((r) => {
    const o: Record<string, unknown> = { [xKey]: fmtXLabel(r[xKey]) };
    for (const k of activeSeries) o[k] = num(r[k]);
    return o;
  });

  if (viz === "pie") {
    const valueKey = activeSeries[0]!;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={xKey}
            outerRadius="80%"
            label={(e: { name?: string }) => e.name ?? ""}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (viz === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} {...AXIS} tick={{ fontSize: 10 }} />
          <YAxis {...AXIS} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
          {activeSeries.map((k, i) => (
            <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (viz === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} {...AXIS} tick={{ fontSize: 10 }} />
          <YAxis {...AXIS} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          {activeSeries.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={PALETTE[i % PALETTE.length]}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.15}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} tick={{ fontSize: 10 }} />
        <YAxis {...AXIS} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} />
        {activeSeries.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
