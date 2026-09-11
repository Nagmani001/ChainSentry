import type {
  AgentResult,
  Contract,
  Dashboard,
  DashboardSection,
  DashboardSpec,
  IncidentResult,
  IncidentTurn,
  QueryResult,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (body && (body.error?.message || body.error)) || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return body as T;
}

export const api = {
  listContracts: () => req<Contract[]>("/contracts"),
  listDashboards: (section?: DashboardSection) =>
    req<Dashboard[]>(
      `/dashboards${section ? `?section=${section}` : ""}`,
    ),
  getDashboard: (id: string) => req<Dashboard>(`/dashboards/${id}`),
  createDashboard: (
    name: string,
    spec: DashboardSpec,
    section: DashboardSection,
    contractId?: string,
  ) =>
    req<Dashboard>("/dashboards", {
      method: "POST",
      body: JSON.stringify({ name, spec, section, contractId }),
    }),
  updateDashboard: (id: string, data: { name?: string; spec?: DashboardSpec }) =>
    req<Dashboard>(`/dashboards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteDashboard: (id: string) =>
    req<void>(`/dashboards/${id}`, { method: "DELETE" }),
  runQuery: (sql: string, params?: Record<string, unknown>) =>
    req<QueryResult>("/query", {
      method: "POST",
      body: JSON.stringify({ sql, params }),
    }),
  agent: (prompt: string, contractId: string, section?: DashboardSection) =>
    req<AgentResult>("/agent", {
      method: "POST",
      body: JSON.stringify({ prompt, contractId, section }),
    }),
  incident: (prompt: string, contractId: string, history: IncidentTurn[]) =>
    req<IncidentResult>("/incident", {
      method: "POST",
      body: JSON.stringify({ prompt, contractId, history }),
    }),
};
