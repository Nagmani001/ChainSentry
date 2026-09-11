import type {
  AgentResult,
  Contract,
  Dashboard,
  DashboardSpec,
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
  listDashboards: () => req<Dashboard[]>("/dashboards"),
  getDashboard: (id: string) => req<Dashboard>(`/dashboards/${id}`),
  createDashboard: (name: string, spec: DashboardSpec, contractId?: string) =>
    req<Dashboard>("/dashboards", {
      method: "POST",
      body: JSON.stringify({ name, spec, contractId }),
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
  agent: (prompt: string, contractId: string) =>
    req<AgentResult>("/agent", {
      method: "POST",
      body: JSON.stringify({ prompt, contractId }),
    }),
};
