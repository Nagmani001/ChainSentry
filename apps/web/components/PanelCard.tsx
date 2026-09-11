"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Panel, QueryResult } from "../lib/types";
import { PanelChart } from "./PanelChart";
import { Icon } from "./Icon";

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
        {editMode ? (
          <span className="panel-drag panel-drag-handle" title="Drag to move">
            <Icon name="grip" size={15} />
          </span>
        ) : null}
        <span className="panel-title">{panel.title}</span>
        {loading ? <span className="panel-loading-dot" /> : null}
        <div className="panel-actions">
          <button className="icon-btn" title="Refresh" onClick={load}>
            <Icon name="sync" size={15} />
          </button>
          {editMode ? (
            <>
              <button className="icon-btn" title="Edit" onClick={onEdit}>
                <Icon name="edit" size={15} />
              </button>
              <button className="icon-btn danger" title="Remove" onClick={onDelete}>
                <Icon name="trash" size={15} />
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
