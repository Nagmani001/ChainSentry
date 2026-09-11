export type VizType =
  | "line"
  | "bar"
  | "area"
  | "stat"
  | "table"
  | "pie"
  | "logs"
  | "trace";

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

export interface Contract {
  id: string;
  address: string;
  chainId: number;
  environment: "devnet" | "testnet" | "mainnet";
  name: string | null;
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
