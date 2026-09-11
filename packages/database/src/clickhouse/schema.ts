import type { ClickHouseClient } from "./client.js";

export const EVENTS_TABLE = "events";
export const TRANSACTIONS_TABLE = "transactions";
export const TRACES_TABLE = "traces";

const EVENTS_DDL = `
CREATE TABLE IF NOT EXISTS ${EVENTS_TABLE} (
  chain_id UInt32,
  contract_address String,
  block_number UInt64,
  block_timestamp DateTime,
  tx_hash String,
  tx_index UInt32,
  log_index UInt32,
  event_name LowCardinality(String),
  event_signature String,
  topic0 String,
  args String,
  data String,
  removed UInt8 DEFAULT 0,
  ingested_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(block_timestamp)
ORDER BY (contract_address, block_number, log_index)
`;

const TRANSACTIONS_DDL = `
CREATE TABLE IF NOT EXISTS ${TRANSACTIONS_TABLE} (
  chain_id UInt32,
  contract_address String,
  block_number UInt64,
  block_timestamp DateTime,
  tx_hash String,
  tx_index UInt32,
  from_address String,
  to_address String,
  value String,
  gas_used UInt64,
  gas_price UInt64,
  effective_gas_price UInt64,
  status UInt8,
  method_selector String,
  ingested_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(block_timestamp)
ORDER BY (contract_address, block_number, tx_hash)
`;

const TRACES_DDL = `
CREATE TABLE IF NOT EXISTS ${TRACES_TABLE} (
  chain_id UInt32,
  contract_address String,
  block_number UInt64,
  block_timestamp DateTime,
  tx_hash String,
  tx_index UInt32,
  trace_address String,
  depth UInt16,
  call_type LowCardinality(String),
  from_address String,
  to_address String,
  value String,
  gas UInt64,
  gas_used UInt64,
  input String,
  output String,
  method_selector String,
  error String,
  ingested_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(block_timestamp)
ORDER BY (contract_address, block_number, tx_hash, trace_address)
`;

export interface EventRow {
  chain_id: number;
  contract_address: string;
  block_number: number;
  block_timestamp: number;
  tx_hash: string;
  tx_index: number;
  log_index: number;
  event_name: string;
  event_signature: string;
  topic0: string;
  args: string;
  data: string;
  removed: number;
}

export interface TransactionRow {
  chain_id: number;
  contract_address: string;
  block_number: number;
  block_timestamp: number;
  tx_hash: string;
  tx_index: number;
  from_address: string;
  to_address: string;
  value: string;
  gas_used: number;
  gas_price: number;
  effective_gas_price: number;
  status: number;
  method_selector: string;
}

export interface TraceRow {
  chain_id: number;
  contract_address: string;
  block_number: number;
  block_timestamp: number;
  tx_hash: string;
  tx_index: number;
  trace_address: string;
  depth: number;
  call_type: string;
  from_address: string;
  to_address: string;
  value: string;
  gas: number;
  gas_used: number;
  input: string;
  output: string;
  method_selector: string;
  error: string;
}

export async function migrateClickHouse(client: ClickHouseClient): Promise<void> {
  await client.command({ query: EVENTS_DDL });
  await client.command({ query: TRANSACTIONS_DDL });
  await client.command({ query: TRACES_DDL });
}

export async function insertEvents(
  client: ClickHouseClient,
  rows: EventRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await client.insert({ table: EVENTS_TABLE, values: rows, format: "JSONEachRow" });
}

export async function insertTransactions(
  client: ClickHouseClient,
  rows: TransactionRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await client.insert({
    table: TRANSACTIONS_TABLE,
    values: rows,
    format: "JSONEachRow",
  });
}

export async function insertTraces(
  client: ClickHouseClient,
  rows: TraceRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await client.insert({ table: TRACES_TABLE, values: rows, format: "JSONEachRow" });
}
