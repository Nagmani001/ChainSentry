export type VizType =
  "line" | "bar" | "area" | "stat" | "table" | "pie" | "logs" | "trace";

export type DashboardSection = "metrics" | "logs" | "traces";

export interface Panel {
  id: string;
  title: string;
  viz: VizType;
  sql: string;
  gridPos: { x: number; y: number; w: number; h: number };
  unit?: string;
}

export interface DashboardSpec {
  refreshInterval: number;
  panels: Panel[];
}

export interface Dashboard {
  id: string;
  name: string;
  slug: string;
  section: DashboardSection;
  isDefault: boolean;
  contractId: string | null;
  spec: DashboardSpec;
}

export type Environment = "devnet" | "testnet" | "mainnet";

export interface Contract {
  id: string;
  address: string;
  chainId: number;
  environment: Environment;
  name: string | null;
}

export interface CreateContractInput {
  address: string;
  environment: Environment;
  prompt: string;
}

export interface CreateContractResult {
  contract: Contract;
  contractName: string | null;
  deployBlock: number | null;
  plan: {
    selectedEvents: string[];
    includeTransactions: boolean;
    notes: string[];
  };
  ingestResult?: { inserted?: number; events?: number } | null;
}

export interface QueryResult {
  columns: { name: string; type: string }[];
  rows: Record<string, unknown>[];
  rowCount: number;
  elapsedMs: number;
}

export interface AgentResult {
  answer: string;
  panel: Panel | null;
  steps: { sql: string; rowCount: number }[];
}

export interface IncidentTurn {
  role: "user" | "agent";
  text: string;
}

export interface IncidentResult {
  answer: string;
  steps: { sql: string; rowCount: number }[];
}

export interface AuthUser {
  id: string;
  privyId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
}

export interface OrgMember {
  id: string;
  role: string;
  user: AuthUser;
}

export interface Organization {
  id: string;
  name: string;
  ownerUserId: string;
  owner?: AuthUser;
  members: OrgMember[];
}

export interface AlertRule {
  id: string;
  orgId: string;
  contractId: string | null;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  windowMin: number;
  channel: "email" | "call";
  active: boolean;
  contract?: Contract | null;
}

export interface OnCallSlot {
  id: string;
  orgId: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  user: AuthUser;
}

export interface AlertIssue {
  id: string;
  orgId: string;
  ruleId: string;
  assigneeId: string | null;
  status: "open" | "resolved" | "verified";
  severity: string;
  observedValue: number;
  threshold: number;
  message: string;
  resolvedAt: string | null;
  verifiedAt: string | null;
  incentiveWei: string | null;
  incentiveTx: string | null;
  rule: AlertRule;
  assignee?: AuthUser | null;
  resolvedBy?: AuthUser | null;
  verifiedBy?: AuthUser | null;
}

export interface AlertingContext {
  user: AuthUser | null;
  orgs: Organization[];
  contracts: Contract[];
}

export interface OrgAlertingData {
  rules: AlertRule[];
  slots: OnCallSlot[];
  issues: AlertIssue[];
}
