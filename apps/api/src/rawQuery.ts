import { clickhouse } from "./clients.js";

const FORBIDDEN =
  /\b(insert|alter|drop|create|truncate|delete|update|attach|detach|rename|optimize|system|grant|revoke|set|kill|use)\b/i;

export interface QueryResult {
  columns: { name: string; type: string }[];
  rows: Record<string, unknown>[];
  rowCount: number;
  elapsedMs: number;
}

export function validateSql(sqlRaw: string): string {
  const sql = sqlRaw.trim().replace(/;+\s*$/, "");
  if (!sql) throw new Error("Empty query.");
  if (sql.includes(";")) {
    throw new Error("Only a single statement is allowed (no semicolons).");
  }
  if (!/^(select|with)\b/i.test(sql)) {
    throw new Error("Only SELECT / WITH queries are allowed.");
  }
  if (FORBIDDEN.test(sql)) {
    throw new Error("Query contains a forbidden keyword (read-only access only).");
  }
  return sql;
}

export async function runReadOnlyQuery(
  sqlRaw: string,
  params?: Record<string, unknown>,
): Promise<QueryResult> {
  const sql = validateSql(sqlRaw);
  const started = Date.now();
  const rs = await clickhouse.query({
    query: sql,
    query_params: params,
    format: "JSON",
    clickhouse_settings: {
      readonly: "2",
      max_execution_time: 30,
      max_result_rows: "10000",
      result_overflow_mode: "break",
    },
  });
  const body = (await rs.json()) as {
    meta: { name: string; type: string }[];
    data: Record<string, unknown>[];
  };
  return {
    columns: body.meta ?? [],
    rows: body.data ?? [],
    rowCount: (body.data ?? []).length,
    elapsedMs: Date.now() - started,
  };
}
