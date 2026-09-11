"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Panel, QueryResult } from "../lib/types";
import { PanelChart } from "./PanelChart";

export function PanelCard({
  panel,
  params,
  refreshTick,
  editMode,
  onEdit,
  onDelete,
}: {
  panel: Panel;
  params: Record<string, unknown>;
  refreshTick: number;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.runQuery(panel.sql, params);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [panel.sql, params]);

  useEffect(() => {
    load();
  }, [load, refreshTick]);

  return (
    <div className={`panel ${editMode ? "editing" : ""}`}>
      <div className="panel-head">
        {editMode ? <span className="panel-drag panel-drag-handle">⠿</span> : null}
        <span className="panel-title">{panel.title}</span>
        <div className="panel-actions">
          <button className="icon-btn" title="Refresh" onClick={load}>
            ↻
          </button>
          {editMode ? (
            <>
              <button className="icon-btn" title="Edit" onClick={onEdit}>
                ✎
              </button>
              <button className="icon-btn" title="Remove" onClick={onDelete}>
                ✕
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="panel-body">
        {loading && !result ? (
          <div className="panel-loading">Running query…</div>
        ) : error ? (
          <div className="panel-error">{error}</div>
        ) : result ? (
          <PanelChart viz={panel.viz} result={result} unit={panel.unit} />
        ) : null}
      </div>
    </div>
  );
}
