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

const PALETTE = ["#2ee27a", "#4dd0e1", "#e2c14e", "#a78bfa", "#ef6f6f", "#7dd3fc"];

const AXIS = { stroke: "#5c6a61" };
const GRID = "#223028";

const tooltipStyle = {
  background: "#111613",
  border: "1px solid #2f4438",
  borderRadius: 8,
  fontSize: 12,
  color: "#d7e0da",
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
