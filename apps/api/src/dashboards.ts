import { prisma } from "./clients.js";

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

const EVENTS_WHERE =
  "contract_address = {addr:String} AND chain_id = {chain:UInt32}";
const TX_WHERE = EVENTS_WHERE;

export function defaultPanels(): Panel[] {
  return [
    {
      id: "stat-tx",
      title: "Total Transactions",
      viz: "stat",
      gridPos: { x: 0, y: 0, w: 3, h: 3 },
      sql: `SELECT count() AS value FROM transactions FINAL WHERE ${TX_WHERE}`,
    },
    {
      id: "stat-success",
      title: "Success Rate",
      viz: "stat",
      unit: "%",
      gridPos: { x: 3, y: 0, w: 3, h: 3 },
      sql: `SELECT round(countIf(status = 1) / greatest(count(), 1) * 100, 2) AS value FROM transactions FINAL WHERE ${TX_WHERE}`,
    },
    {
      id: "stat-callers",
      title: "Unique Callers",
      viz: "stat",
      gridPos: { x: 6, y: 0, w: 3, h: 3 },
      sql: `SELECT uniqExact(from_address) AS value FROM transactions FINAL WHERE ${TX_WHERE}`,
    },
    {
      id: "stat-value",
      title: "Value Transacted (ETH)",
      viz: "stat",
      unit: "ETH",
      gridPos: { x: 9, y: 0, w: 3, h: 3 },
      sql: `SELECT round(sum(toUInt256OrZero(value)) / 1e18, 4) AS value FROM transactions FINAL WHERE ${TX_WHERE}`,
    },
    {
      id: "tx-over-time",
      title: "Transactions Over Time",
      viz: "line",
      gridPos: { x: 0, y: 3, w: 6, h: 7 },
      sql: `SELECT toStartOfMinute(block_timestamp) AS t, count() AS transactions, countIf(status = 0) AS reverts FROM transactions FINAL WHERE ${TX_WHERE} GROUP BY t ORDER BY t`,
    },
    {
      id: "events-by-type",
      title: "Events by Type",
      viz: "bar",
      gridPos: { x: 6, y: 3, w: 6, h: 7 },
      sql: `SELECT event_name, count() AS count FROM events FINAL WHERE ${EVENTS_WHERE} GROUP BY event_name ORDER BY count DESC LIMIT 20`,
    },
    {
      id: "gas-over-time",
      title: "Avg Gas Used Over Time",
      viz: "area",
      gridPos: { x: 0, y: 10, w: 6, h: 7 },
      sql: `SELECT toStartOfMinute(block_timestamp) AS t, round(avg(gas_used)) AS avg_gas, max(gas_used) AS max_gas FROM transactions FINAL WHERE ${TX_WHERE} GROUP BY t ORDER BY t`,
    },
    {
      id: "recent-events",
      title: "Recent Events",
      viz: "table",
      gridPos: { x: 6, y: 10, w: 6, h: 7 },
      sql: `SELECT block_number, event_name, tx_hash, block_timestamp FROM events FINAL WHERE ${EVENTS_WHERE} ORDER BY block_number DESC, log_index DESC LIMIT 50`,
    },
  ];
}

export function defaultLogPanels(): Panel[] {
  return [
    {
      id: "log-total",
      title: "Total Log Records",
      viz: "stat",
      gridPos: { x: 0, y: 0, w: 3, h: 3 },
      sql: `SELECT count() AS value FROM events FINAL WHERE ${EVENTS_WHERE}`,
    },
    {
      id: "log-types",
      title: "Distinct Event Types",
      viz: "stat",
      gridPos: { x: 3, y: 0, w: 3, h: 3 },
      sql: `SELECT uniqExact(event_name) AS value FROM events FINAL WHERE ${EVENTS_WHERE}`,
    },
    {
      id: "log-blocks",
      title: "Blocks With Logs",
      viz: "stat",
      gridPos: { x: 6, y: 0, w: 3, h: 3 },
      sql: `SELECT uniqExact(block_number) AS value FROM events FINAL WHERE ${EVENTS_WHERE}`,
    },
    {
      id: "log-latest",
      title: "Latest Block",
      viz: "stat",
      gridPos: { x: 9, y: 0, w: 3, h: 3 },
      sql: `SELECT max(block_number) AS value FROM events FINAL WHERE ${EVENTS_WHERE}`,
    },
    {
      id: "log-volume",
      title: "Log Volume Over Time",
      viz: "area",
      gridPos: { x: 0, y: 3, w: 6, h: 6 },
      sql: `SELECT toStartOfMinute(block_timestamp) AS t, count() AS logs FROM events FINAL WHERE ${EVENTS_WHERE} GROUP BY t ORDER BY t`,
    },
    {
      id: "log-by-type",
      title: "Logs by Event Type",
      viz: "bar",
      gridPos: { x: 6, y: 3, w: 6, h: 6 },
      sql: `SELECT event_name, count() AS count FROM events FINAL WHERE ${EVENTS_WHERE} GROUP BY event_name ORDER BY count DESC LIMIT 20`,
    },
    {
      id: "log-stream",
      title: "Live Event Log Stream",
      viz: "logs",
      gridPos: { x: 0, y: 9, w: 12, h: 12 },
      sql: `SELECT block_timestamp, event_name, event_signature, block_number, log_index, tx_hash, topic0, args, data FROM events FINAL WHERE ${EVENTS_WHERE} ORDER BY block_number DESC, log_index DESC LIMIT 200`,
    },
  ];
}

const TRACES_WHERE = EVENTS_WHERE;

export function defaultTracePanels(): Panel[] {
  return [
    {
      id: "trace-calls",
      title: "Total Internal Calls",
      viz: "stat",
      gridPos: { x: 0, y: 0, w: 3, h: 3 },
      sql: `SELECT count() AS value FROM traces FINAL WHERE ${TRACES_WHERE}`,
    },
    {
      id: "trace-txs",
      title: "Traced Transactions",
      viz: "stat",
      gridPos: { x: 3, y: 0, w: 3, h: 3 },
      sql: `SELECT uniqExact(tx_hash) AS value FROM traces FINAL WHERE ${TRACES_WHERE}`,
    },
    {
      id: "trace-depth",
      title: "Max Call Depth",
      viz: "stat",
      gridPos: { x: 6, y: 0, w: 3, h: 3 },
      sql: `SELECT max(depth) AS value FROM traces FINAL WHERE ${TRACES_WHERE}`,
    },
    {
      id: "trace-failed",
      title: "Failed Calls",
      viz: "stat",
      gridPos: { x: 9, y: 0, w: 3, h: 3 },
      sql: `SELECT countIf(error != '') AS value FROM traces FINAL WHERE ${TRACES_WHERE}`,
    },
    {
      id: "trace-by-type",
      title: "Calls by Type",
      viz: "pie",
      gridPos: { x: 0, y: 3, w: 4, h: 7 },
      sql: `SELECT call_type, count() AS count FROM traces FINAL WHERE ${TRACES_WHERE} GROUP BY call_type ORDER BY count DESC`,
    },
    {
      id: "trace-callees",
      title: "Top Internal Callees",
      viz: "bar",
      gridPos: { x: 4, y: 3, w: 8, h: 7 },
      sql: `SELECT to_address, count() AS calls FROM traces FINAL WHERE ${TRACES_WHERE} AND depth > 0 GROUP BY to_address ORDER BY calls DESC LIMIT 15`,
    },
    {
      id: "trace-gas",
      title: "Gas Used by Internal Calls Over Time",
      viz: "area",
      gridPos: { x: 0, y: 10, w: 6, h: 6 },
      sql: `SELECT toStartOfMinute(block_timestamp) AS t, sum(gas_used) AS gas_used FROM traces FINAL WHERE ${TRACES_WHERE} GROUP BY t ORDER BY t`,
    },
    {
      id: "trace-tree",
      title: "Call Trees (recent transactions)",
      viz: "trace",
      gridPos: { x: 6, y: 10, w: 6, h: 12 },
      sql: `SELECT tx_hash, block_number, trace_address, depth, call_type, from_address, to_address, value, gas_used, method_selector, error FROM traces FINAL WHERE ${TRACES_WHERE} ORDER BY block_number DESC, tx_index DESC, trace_address ASC LIMIT 400`,
    },
  ];
}

export function defaultSpec(section: DashboardSection): DashboardSpec {
  const panels =
    section === "logs"
      ? defaultLogPanels()
      : section === "traces"
        ? defaultTracePanels()
        : defaultPanels();
  return { refreshInterval: 0, panels };
}

async function ensureSectionDefault(
  section: DashboardSection,
  name: string,
  slug: string,
) {
  const existing = await prisma.dashboard.findFirst({
    where: { isDefault: true, section },
  });
  if (existing) return existing;
  return prisma.dashboard.create({
    data: {
      name,
      slug,
      section,
      isDefault: true,
      spec: defaultSpec(section) as object,
    },
  });
}

export async function ensureDefaultDashboards() {
  await ensureSectionDefault("metrics", "Contract Overview", "contract-overview");
  await ensureSectionDefault("logs", "Event Logs", "event-logs");
  await ensureSectionDefault("traces", "Transaction Traces", "transaction-traces");
}
