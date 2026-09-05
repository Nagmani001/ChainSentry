import { createClient, type ClickHouseClient } from "@clickhouse/client";

const DEFAULT_CONFIG = {
  url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
  username: process.env.CLICKHOUSE_USER ?? "chainsentry",
  password: process.env.CLICKHOUSE_PASSWORD ?? "chainsentry",
  database: process.env.CLICKHOUSE_DB ?? "chainsentry",
};

export function createClickHouseClient(): ClickHouseClient {
  return createClient(DEFAULT_CONFIG);
}

export type { ClickHouseClient };