"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LayoutItem } from "react-grid-layout";
import { api } from "../lib/api";
import type { Contract, Dashboard, Panel } from "../lib/types";
import { Sidebar } from "../components/Sidebar";
import { DashboardGrid } from "../components/DashboardGrid";
import { PaneBuilderModal } from "../components/PaneBuilderModal";

const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
];

interface AgentMsg {
  role: "user" | "agent";
  text: string;
}

export default function Page() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [contractId, setContractId] = useState<string>("");
  const [dashboardId, setDashboardId] = useState<string>("");

  const [panels, setPanels] = useState<Panel[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [builder, setBuilder] = useState<{ panel: Panel | null } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [messages, setMessages] = useState<AgentMsg[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cs, ds] = await Promise.all([
          api.listContracts(),
          api.listDashboards(),
        ]);
        setContracts(cs);
        setDashboards(ds);
        if (cs.length) setContractId(cs[0]!.id);
        if (ds.length) setDashboardId(ds[0]!.id);
      } catch (e) {
        setBanner((e as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    const d = dashboards.find((x) => x.id === dashboardId);
    if (d) {
      setPanels(d.spec.panels ?? []);
      setRefreshInterval(d.spec.refreshInterval ?? 0);
      setDirty(false);
    }
  }, [dashboardId, dashboards]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const t = setInterval(() => setRefreshTick((v) => v + 1), refreshInterval * 1000);
    return () => clearInterval(t);
  }, [refreshInterval]);

  const contract = contracts.find((c) => c.id === contractId);
  const params = useMemo(() => {
    const c = contracts.find((x) => x.id === contractId);
    return c ? { addr: c.address.toLowerCase(), chain: c.chainId } : {};
  }, [contracts, contractId]);

  const onLayoutChange = useCallback((layout: LayoutItem[]) => {
    setPanels((prev) =>
      prev.map((p) => {
        const l = layout.find((x) => x.i === p.id);
        return l ? { ...p, gridPos: { x: l.x, y: l.y, w: l.w, h: l.h } } : p;
      }),
    );
    setDirty(true);
  }, []);

  const upsertPanel = (panel: Panel) => {
    setPanels((prev) => {
      const exists = prev.some((p) => p.id === panel.id);
      return exists
        ? prev.map((p) => (p.id === panel.id ? panel : p))
        : [...prev, panel];
    });
    setDirty(true);
    setBuilder(null);
  };

  const deletePanel = (id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
    setDirty(true);
  };

  const save = async () => {
    const d = dashboards.find((x) => x.id === dashboardId);
    if (!d) return;
    setSaving(true);
    try {
      const spec = { refreshInterval, panels };
      const updated = await api.updateDashboard(d.id, { spec });
      setDashboards((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
      setDirty(false);
      setEditMode(false);
    } catch (e) {
      setBanner((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveAsNew = async () => {
    const name = window.prompt("New dashboard name", "My dashboard");
    if (!name) return;
    setSaving(true);
    try {
      const created = await api.createDashboard(
        name,
        { refreshInterval, panels },
        contractId || undefined,
      );
      setDashboards((prev) => [...prev, created]);
      setDashboardId(created.id);
      setDirty(false);
      setEditMode(false);
    } catch (e) {
      setBanner((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const sendPrompt = async () => {
    const text = prompt.trim();
    if (!text || !contractId) return;
    setPrompt("");
    setMessages((m) => [...m, { role: "user", text }]);
    setAgentBusy(true);
    try {
      const res = await api.agent(text, contractId);
      setMessages((m) => [...m, { role: "agent", text: res.answer }]);
      if (res.panel) {
        upsertPanel({ ...res.panel, gridPos: { x: 0, y: 0, w: 6, h: 7 } });
        setEditMode(true);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "agent", text: `⚠ ${(e as Error).message}` }]);
    } finally {
      setAgentBusy(false);
    }
  };

  return (
    <div className="app">
      <Sidebar active="metrics" />
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">Metrics</span>
          <select
            className="select"
            value={dashboardId}
            onChange={(e) => setDashboardId(e.target.value)}
          >
            {dashboards.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
          >
            {contracts.length === 0 ? <option value="">No contracts</option> : null}
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.name ?? "Contract") + " · " + c.environment + " · " + c.address.slice(0, 8) + "…"}
              </option>
            ))}
          </select>

          <div className="spacer" />

          <select
            className="select"
            value={refreshInterval}
            onChange={(e) => {
              setRefreshInterval(Number(e.target.value));
              setDirty(true);
            }}
            title="Refresh interval"
          >
            {REFRESH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                ↻ {o.label}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => setRefreshTick((v) => v + 1)}>
            ↻ Refresh
          </button>
          {editMode ? (
            <button className="btn primary" onClick={() => setBuilder({ panel: null })}>
              + Add panel
            </button>
          ) : null}
          <button
            className={`btn ${editMode ? "active" : ""}`}
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "Done editing" : "Edit dashboard"}
          </button>
          <button className="btn primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : dirty ? "Save*" : "Save"}
          </button>
          <button className="btn ghost" onClick={saveAsNew} title="Save as new dashboard">
            Save as…
          </button>
        </div>

        {banner ? (
          <div className="agent-msg" style={{ margin: "8px 18px", borderColor: "var(--danger)" }}>
            {banner}
          </div>
        ) : null}

        <div className="canvas">
          {contracts.length === 0 ? (
            <div className="empty">
              No contracts ingested yet.<br />
              POST a contract to the API, then metrics will appear here.
            </div>
          ) : panels.length === 0 ? (
            <div className="empty">
              This dashboard has no panels.<br />
              Turn on “Edit dashboard” and add one, or ask the copilot below.
            </div>
          ) : (
            <DashboardGrid
              panels={panels}
              params={params}
              refreshTick={refreshTick}
              editMode={editMode}
              onLayoutChange={onLayoutChange}
              onEditPanel={(id) =>
                setBuilder({ panel: panels.find((p) => p.id === id) ?? null })
              }
              onDeletePanel={deletePanel}
            />
          )}
        </div>

        {messages.length > 0 ? (
          <div className="agent-log">
            {messages.slice(-6).map((m, i) => (
              <div key={i} className={`agent-msg ${m.role}`}>
                <div className="role">{m.role === "user" ? "You" : "Copilot"}</div>
                {m.text}
              </div>
            ))}
          </div>
        ) : null}

        <div className="promptbar">
          <input
            className="input"
            placeholder="Ask anything or build pane with prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendPrompt()}
            disabled={agentBusy || !contractId}
          />
          <button className="btn primary" onClick={sendPrompt} disabled={agentBusy || !contractId}>
            {agentBusy ? "Thinking…" : "Send"}
          </button>
        </div>
      </div>

      {builder ? (
        <PaneBuilderModal
          initial={builder.panel}
          params={params}
          onClose={() => setBuilder(null)}
          onSave={upsertPanel}
        />
      ) : null}
    </div>
  );
}
