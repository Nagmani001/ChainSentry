import { clickhouse } from "./clients.js";

export interface EventQuery {
  contractAddress: string;
  chainId: number;
  eventName?: string;
  fromBlock?: number;
  toBlock?: number;
  limit?: number;
}

export async function queryEvents(q: EventQuery) {
  const conditions = ["contract_address = {addr:String}", "chain_id = {chain:UInt32}"];
  const params: Record<string, unknown> = {
    addr: q.contractAddress.toLowerCase(),
    chain: q.chainId,
    limit: q.limit ?? 100,
  };
  if (q.eventName) {
    conditions.push("event_name = {ev:String}");
    params.ev = q.eventName;
  }
  if (q.fromBlock != null) {
    conditions.push("block_number >= {fromB:UInt64}");
    params.fromB = q.fromBlock;
  }
  if (q.toBlock != null) {
    conditions.push("block_number <= {toB:UInt64}");
    params.toB = q.toBlock;
  }

  const rs = await clickhouse.query({
    query: `
      SELECT chain_id, contract_address, block_number, block_timestamp,
             tx_hash, log_index, event_name, event_signature, topic0, args
      FROM events FINAL
      WHERE ${conditions.join(" AND ")}
      ORDER BY block_number DESC, log_index DESC
      LIMIT {limit:UInt32}
    `,
    query_params: params,
    format: "JSONEachRow",
  });
  return rs.json();
}

export async function queryMetrics(contractAddress: string, chainId: number) {
  const params = { addr: contractAddress.toLowerCase(), chain: chainId };

  const txRs = await clickhouse.query({
    query: `
      SELECT
        count() AS tx_count,
        countIf(status = 1) AS success_count,
        countIf(status = 0) AS revert_count,
        round(countIf(status = 1) / greatest(count(), 1) * 100, 2) AS success_rate_pct,
        sum(gas_used) AS total_gas_used,
        round(avg(gas_used), 0) AS avg_gas_used,
        toString(sum(toUInt256OrZero(value))) AS total_value_wei,
        uniqExact(from_address) AS unique_callers,
        min(block_number) AS first_block,
        max(block_number) AS last_block
      FROM transactions FINAL
      WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32}
    `,
    query_params: params,
    format: "JSONEachRow",
  });
  const txStats = ((await txRs.json()) as Record<string, unknown>[])[0] ?? {};

  const evRs = await clickhouse.query({
    query: `
      SELECT event_name, count() AS count
      FROM events FINAL
      WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32}
      GROUP BY event_name
      ORDER BY count DESC
    `,
    query_params: params,
    format: "JSONEachRow",
  });
  const eventBreakdown = await evRs.json();

  const totalEvents = (eventBreakdown as { count: string }[]).reduce(
    (acc, r) => acc + Number(r.count),
    0,
  );

  return {
    transactions: txStats,
    events: { total: totalEvents, byType: eventBreakdown },
  };
}
