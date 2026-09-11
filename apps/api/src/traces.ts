import { insertTraces, type TraceRow } from "@repo/database";
import { clickhouse } from "./clients.js";
import { resolveChain, type ChainInfo } from "./chains.js";
import { runReadOnlyQuery } from "./rawQuery.js";

interface RawCall {
  type?: string;
  from?: string;
  to?: string;
  value?: string;
  gas?: string;
  gasUsed?: string;
  input?: string;
  output?: string;
  error?: string;
  revertReason?: string;
  calls?: RawCall[];
}

interface TxContext {
  chainId: number;
  contractAddress: string;
  blockNumber: number;
  blockTimestamp: number;
  txHash: string;
  txIndex: number;
}

function hexToNumber(hex: string | undefined): number {
  if (!hex) return 0;
  try {
    return Number(BigInt(hex));
  } catch {
    return 0;
  }
}

function hexToDecString(hex: string | undefined): string {
  if (!hex) return "0";
  try {
    return BigInt(hex).toString();
  } catch {
    return "0";
  }
}

function flatten(
  call: RawCall,
  ctx: TxContext,
  tracePath: string,
  depth: number,
  out: TraceRow[],
): void {
  const input = call.input ?? "";
  out.push({
    chain_id: ctx.chainId,
    contract_address: ctx.contractAddress,
    block_number: ctx.blockNumber,
    block_timestamp: ctx.blockTimestamp,
    tx_hash: ctx.txHash,
    tx_index: ctx.txIndex,
    trace_address: tracePath,
    depth,
    call_type: (call.type ?? "CALL").toUpperCase(),
    from_address: (call.from ?? "").toLowerCase(),
    to_address: (call.to ?? "").toLowerCase(),
    value: hexToDecString(call.value),
    gas: hexToNumber(call.gas),
    gas_used: hexToNumber(call.gasUsed),
    input: input.slice(0, 8192),
    output: (call.output ?? "").slice(0, 8192),
    method_selector: input.length >= 10 ? input.slice(0, 10) : "",
    error: call.error ?? call.revertReason ?? "",
  });
  const children = call.calls ?? [];
  children.forEach((child, i) =>
    flatten(child, ctx, tracePath === "" ? String(i) : `${tracePath}.${i}`, depth + 1, out),
  );
}

async function rpcTrace(rpcUrl: string, txHash: string): Promise<RawCall | null> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "debug_traceTransaction",
      params: [txHash, { tracer: "callTracer" }],
    }),
  });
  const body = (await res.json()) as { result?: RawCall; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result ?? null;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

export interface TraceIngestInput {
  environment: string;
  contractAddress: string;
  limit?: number;
}

export interface TraceIngestResult {
  requested: number;
  traced: number;
  frames: number;
  failures: { txHash: string; error: string }[];
}

export async function ingestTraces(
  input: TraceIngestInput,
): Promise<TraceIngestResult> {
  const chain: ChainInfo = resolveChain(input.environment);
  const addr = input.contractAddress.toLowerCase();
  const limit = Math.min(input.limit ?? 50, 200);

  const txs = await runReadOnlyQuery(
    `SELECT tx_hash, block_number, block_timestamp, tx_index
     FROM transactions FINAL
     WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32}
     ORDER BY block_number DESC
     LIMIT {lim:UInt32}`,
    { addr, chain: chain.chainId, lim: limit },
  );

  const failures: { txHash: string; error: string }[] = [];
  const allFrames: TraceRow[] = [];

  await mapPool(txs.rows, 4, async (row) => {
    const txHash = String(row.tx_hash);
    try {
      const root = await rpcTrace(chain.traceRpc, txHash);
      if (!root) return;
      const ctx: TxContext = {
        chainId: chain.chainId,
        contractAddress: addr,
        blockNumber: Number(row.block_number),
        blockTimestamp: Math.floor(
          new Date(String(row.block_timestamp) + "Z").getTime() / 1000,
        ),
        txHash,
        txIndex: Number(row.tx_index),
      };
      const frames: TraceRow[] = [];
      flatten(root, ctx, "", 0, frames);
      allFrames.push(...frames);
    } catch (err) {
      failures.push({ txHash, error: (err as Error).message });
    }
  });

  await insertTraces(clickhouse, allFrames);

  const tracedTxs = new Set(allFrames.map((f) => f.tx_hash));
  return {
    requested: txs.rows.length,
    traced: tracedTxs.size,
    frames: allFrames.length,
    failures: failures.slice(0, 10),
  };
}
