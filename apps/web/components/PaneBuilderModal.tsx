"use client";

import { useState } from "react";
import { api } from "../lib/api";
import type {
  DashboardSection,
  Panel,
  QueryResult,
  VizType,
} from "../lib/types";
import { PanelChart } from "./PanelChart";

const VIZ_OPTIONS: VizType[] = [
  "line",
  "area",
  "bar",
  "stat",
  "pie",
  "table",
  "logs",
  "trace",
];

const METRICS_TEMPLATE = `SELECT event_name, count() AS count
FROM events FINAL
WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32}
GROUP BY event_name
ORDER BY count DESC`;

const LOGS_TEMPLATE = `SELECT block_timestamp, event_name, event_signature,
       block_number, log_index, tx_hash, topic0, args, data
FROM events FINAL
WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32}
ORDER BY block_number DESC, log_index DESC
LIMIT 200`;

const TRACES_TEMPLATE = `SELECT tx_hash, block_number, trace_address, depth,
       call_type, from_address, to_address, value, gas_used, method_selector, error
FROM traces FINAL
WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32}
ORDER BY block_number DESC, tx_index DESC, trace_address ASC
LIMIT 400`;

const TEMPLATE: Record<DashboardSection, string> = {
  metrics: METRICS_TEMPLATE,
  logs: LOGS_TEMPLATE,
  traces: TRACES_TEMPLATE,
};

const DEFAULT_VIZ: Record<DashboardSection, VizType> = {
  metrics: "bar",
  logs: "logs",
  traces: "trace",
};

export function PaneBuilderModal({
  initial,
  params,
  section,
  onClose,
  onSave,
}: {
  initial: Panel | null;
  params: Record<string, unknown>;
  section: DashboardSection;
  onClose: () => void;
  onSave: (panel: Panel) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "New panel");
  const [viz, setViz] = useState<VizType>(initial?.viz ?? DEFAULT_VIZ[section]);
  const [sql, setSql] = useState(initial?.sql ?? TEMPLATE[section]);
  const [preview, setPreview] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const runPreview = async () => {
    setRunning(true);
    setError(null);
    try {
      setPreview(await api.runQuery(sql, params));
    } catch (e) {
      setError((e as Error).message);
      setPreview(null);
    } finally {
      setRunning(false);
    }
  };

  const save = () => {
    onSave({
      id: initial?.id ?? `p-${Date.now()}`,
      title,
      viz,
      sql,
      unit: initial?.unit,
      gridPos: initial?.gridPos ?? { x: 0, y: 0, w: 6, h: 7 },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          {initial ? "Edit panel" : "Pane builder"}
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div>
            <div className="field-label">Title</div>
            <input
              className="input"
              style={{ width: "100%" }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <div className="field-label">Visualization</div>
            <div className="viz-row">
              {VIZ_OPTIONS.map((v) => (
                <button
                  key={v}
                  className={`btn ${viz === v ? "active" : ""}`}
                  onClick={() => setViz(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="field-label">ClickHouse query (params: {"{addr:String}"}, {"{chain:UInt32}"})</div>
            <textarea
              className="textarea"
              rows={7}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div>
            <div className="field-label">
              Preview{" "}
              {preview ? `· ${preview.rowCount} rows · ${preview.elapsedMs}ms` : ""}
            </div>
            <div className="preview-box">
              {error ? (
                <div className="panel-error">{error}</div>
              ) : preview ? (
                <PanelChart viz={viz} result={preview} unit={initial?.unit} />
              ) : (
                <div className="panel-loading">Run the query to preview.</div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={runPreview} disabled={running}>
            {running ? "Running…" : "Run preview"}
          </button>
          <button className="btn primary" onClick={save}>
            {initial ? "Update panel" : "Add panel"}
          </button>
        </div>
      </div>
    </div>
  );
}
