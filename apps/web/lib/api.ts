import type {
  AgentResult,
  AlertingContext,
  AlertIssue,
  AlertRule,
  Contract,
  CreateContractInput,
  CreateContractResult,
  Dashboard,
  DashboardSection,
  DashboardSpec,
  IncidentResult,
  IncidentTurn,
  OnCallSlot,
  OrgAlertingData,
  Organization,
  QueryResult,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  createContract: (input: CreateContractInput) =>
    req<CreateContractResult>("/contracts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listDashboards: (section?: DashboardSection) =>
    req<Dashboard[]>(`/dashboards${section ? `?section=${section}` : ""}`),
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
  updateDashboard: (
    id: string,
    data: { name?: string; spec?: DashboardSpec },
  ) =>
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
  syncUser: (input: {
    privyId: string;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  }) =>
    req("/auth/sync", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  alertingContext: (privyId: string) =>
    req<AlertingContext>(
      `/alerting/context?privyId=${encodeURIComponent(privyId)}`,
    ),
  createOrg: (privyId: string, name: string) =>
    req<Organization>("/orgs", {
      method: "POST",
      body: JSON.stringify({ privyId, name }),
    }),
  joinOrg: (privyId: string, orgId: string) =>
    req("/orgs/join", {
      method: "POST",
      body: JSON.stringify({ privyId, orgId }),
    }),
  orgAlerting: (orgId: string, privyId: string) =>
    req<OrgAlertingData>(
      `/orgs/${orgId}/alerting?privyId=${encodeURIComponent(privyId)}`,
    ),
  createOnCallSlot: (
    orgId: string,
    input: {
      privyId: string;
      userId: string;
      startsAt: string;
      endsAt: string;
    },
  ) =>
    req<OnCallSlot>(`/orgs/${orgId}/on-call`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createAlertRule: (
    orgId: string,
    input: {
      privyId: string;
      contractId?: string | null;
      name: string;
      metric: string;
      operator: string;
      threshold: number;
      windowMin: number;
      channel: "email" | "call";
    },
  ) =>
    req<AlertRule>(`/orgs/${orgId}/alerts`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  evaluateAlert: (id: string, privyId: string) =>
    req<{ triggered: boolean; value: number; notification?: string }>(
      `/alerts/${id}/evaluate`,
      { method: "POST", body: JSON.stringify({ privyId }) },
    ),
  resolveIssue: (id: string, privyId: string) =>
    req<AlertIssue>(`/issues/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ privyId }),
    }),
  verifyIssue: (
    id: string,
    input: { privyId: string; incentiveWei?: string; incentiveTx?: string },
  ) =>
    req<AlertIssue>(`/issues/${id}/verify`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
