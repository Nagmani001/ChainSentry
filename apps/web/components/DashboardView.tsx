"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Layout } from "react-grid-layout";
import { api } from "../lib/api";
import type {
  Contract,
  Dashboard,
  DashboardSection,
  Environment,
  Panel,
} from "../lib/types";
import { DashboardGrid } from "./DashboardGrid";
import { PaneBuilderModal } from "./PaneBuilderModal";
import { Icon } from "./Icon";

const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
];

const ENV_BADGE: Record<Environment, string> = {
  devnet: "env-dev",
  testnet: "env-test",
  mainnet: "env-main",
};

interface AgentMsg {
  role: "user" | "agent";
  text: string;
}

function shortAddr(a: string): string {
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function DashboardView({
  section,
  title,
}: {
  section: DashboardSection;
  title: string;
}) {
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
  const [starred, setStarred] = useState(false);

  const [builder, setBuilder] = useState<{ panel: Panel | null } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [messages, setMessages] = useState<AgentMsg[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError(false);
    try {
      const [cs, ds] = await Promise.all([
        api.listContracts(),
        api.listDashboards(section),
      ]);
      setContracts(cs);
      setDashboards(ds);
      const wanted = new URLSearchParams(window.location.search).get("c") ?? "";
      const pick = cs.find((c) => c.id === wanted) ?? cs[0];
      if (pick) setContractId(pick.id);
      if (ds.length) setDashboardId(ds[0]!.id);
    } catch {
      setLoadError(true);
    }
  }, [section]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    const t = setInterval(
      () => setRefreshTick((v) => v + 1),
      refreshInterval * 1000,
    );
    return () => clearInterval(t);
  }, [refreshInterval]);

  const activeContract = useMemo(
    () => contracts.find((x) => x.id === contractId),
    [contracts, contractId],
  );

  const params = useMemo(() => {
    const c = activeContract;
    return c ? { addr: c.address.toLowerCase(), chain: c.chainId } : {};
  }, [activeContract]);

  const onLayoutChange = useCallback((layout: Layout) => {
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
      setBanner(`Couldn't save dashboard — ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveAsNew = async () => {
    const name = window.prompt("New dashboard name", `My ${title} dashboard`);
    if (!name) return;
    setSaving(true);
    try {
      const created = await api.createDashboard(
        name,
        { refreshInterval, panels },
        section,
        contractId || undefined,
      );
      setDashboards((prev) => [...prev, created]);
      setDashboardId(created.id);
      setDirty(false);
      setEditMode(false);
    } catch (e) {
      setBanner(`Couldn't save dashboard — ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const sendPrompt = async () => {
    const text = prompt.trim();
    if (!text || !contractId) return;
    setPrompt("");
    setAgentOpen(true);
    setMessages((m) => [...m, { role: "user", text }]);
    setAgentBusy(true);
    try {
      const res = await api.agent(text, contractId, section);
      setMessages((m) => [...m, { role: "agent", text: res.answer }]);
      if (res.panel) {
        upsertPanel({ ...res.panel, gridPos: { x: 0, y: 0, w: 6, h: 7 } });
        setEditMode(true);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "agent", text: `${(e as Error).message}` },
      ]);
    } finally {
      setAgentBusy(false);
    }
  };

  const noContracts = contracts.length === 0;

  return (
    <div className="dash">
      <div className="dash-toolbar">
        <div className="dash-title-group">
          <button
            className={`icon-btn star ${starred ? "on" : ""}`}
            onClick={() => setStarred((v) => !v)}
            title={starred ? "Unstar dashboard" : "Star dashboard"}
            aria-pressed={starred}
          >
            <Icon name="star" size={17} />
          </button>
          <h1 className="dash-title">{title}</h1>
        </div>

        <div className="spacer" />

        <div className="refresh-picker">
          <button
            className="refresh-now"
            onClick={() => setRefreshTick((v) => v + 1)}
            title="Refresh now"
          >
            <Icon name="sync" size={16} />
          </button>
          <div className="select-wrap refresh-interval">
            <select
              className="select bare"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              title="Auto refresh"
              aria-label="Auto refresh interval"
            >
              {REFRESH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value === 0 ? "Off" : o.label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} className="select-chevron" />
          </div>
        </div>

        {editMode ? (
          <button
            className="btn"
            onClick={() => setBuilder({ panel: null })}
            disabled={noContracts}
          >
            <Icon name="plus" size={16} /> Add panel
          </button>
        ) : null}
        <button
          className={`btn ${editMode ? "active" : ""}`}
          onClick={() => setEditMode((v) => !v)}
        >
          <Icon name="edit" size={16} />
          {editMode ? "Done" : "Edit"}
        </button>
        <button
          className="btn primary"
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? "Saving…" : dirty ? "Save*" : "Save"}
        </button>
        <button className="btn ghost" onClick={saveAsNew} title="Save as new dashboard">
          Save as
        </button>
      </div>

      <div className="var-bar">
        <div className="var">
          <span className="var-label">contract</span>
          <div className="select-wrap">
            <select
              className="select"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            >
              {noContracts ? <option value="">No contracts</option> : null}
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

        <div className="var">
          <span className="var-label">dashboard</span>
          <div className="select-wrap">
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
            <Icon name="chevronDown" size={14} className="select-chevron" />
          </div>
        </div>

        {activeContract ? (
          <span className={`env-badge ${ENV_BADGE[activeContract.environment]}`}>
            {activeContract.environment}
          </span>
        ) : null}
        {activeContract ? (
          <span className="var-addr mono">{shortAddr(activeContract.address)}</span>
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

      <div className="canvas">
        {loadError ? (
          <div className="empty">
            <span className="empty-mark warn">
              <Icon name="warning" size={26} />
            </span>
            <div className="empty-title">Can&apos;t reach the ChainSentry API</div>
            <div className="empty-sub">
              The dashboard couldn&apos;t load its contracts. Check that the API
              server is running, then try again.
            </div>
            <button className="btn primary" onClick={loadData}>
              <Icon name="sync" size={16} /> Retry
            </button>
          </div>
        ) : noContracts ? (
          <div className="empty">
            <span className="empty-mark">
              <Icon name="apps" size={26} />
            </span>
            <div className="empty-title">No contracts connected</div>
            <div className="empty-sub">
              Connect a contract and its {title.toLowerCase()} will stream in
              here.
            </div>
            <Link href="/" className="btn primary">
              <Icon name="plus" size={16} /> Connect a contract
            </Link>
          </div>
        ) : panels.length === 0 ? (
          <div className="empty">
            <span className="empty-mark">
              <Icon name="chart" size={26} />
            </span>
            <div className="empty-title">This dashboard is empty</div>
            <div className="empty-sub">
              Turn on <strong>Edit</strong> to add a panel, or ask the query
              copilot below to build one for you.
            </div>
            <button
              className="btn primary"
              onClick={() => {
                setEditMode(true);
                setBuilder({ panel: null });
              }}
            >
              <Icon name="plus" size={16} /> Add panel
            </button>
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

      {agentOpen && messages.length > 0 ? (
        <div className="agent-log">
          <div className="agent-log-head">
            <Icon name="incident" size={14} />
            <span>Query copilot</span>
            <div className="spacer" />
            <button
              className="icon-btn"
              onClick={() => setAgentOpen(false)}
              title="Hide"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
          {messages.slice(-6).map((m, i) => (
            <div key={i} className={`agent-msg ${m.role}`}>
              <div className="role">{m.role === "user" ? "You" : "Copilot"}</div>
              {m.text}
            </div>
          ))}
        </div>
      ) : null}

      <div className="promptbar">
        <span className="promptbar-icon">
          <Icon name="incident" size={17} />
        </span>
        <input
          className="input"
          placeholder="Ask a question or describe a panel to build…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendPrompt()}
          disabled={agentBusy || noContracts}
        />
        <button
          className="btn primary"
          onClick={sendPrompt}
          disabled={agentBusy || noContracts}
        >
          {agentBusy ? (
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

      {builder ? (
        <PaneBuilderModal
          initial={builder.panel}
          params={params}
          section={section}
          onClose={() => setBuilder(null)}
          onSave={upsertPanel}
        />
      ) : null}
    </div>
  );
}
