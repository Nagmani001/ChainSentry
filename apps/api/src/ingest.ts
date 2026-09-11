import {
  decodeEventLog,
  type Abi,
  type Log,
  type PublicClient,
} from "viem";
import {
  insertEvents,
  insertTransactions,
  type EventRow,
  type TransactionRow,
} from "@repo/database";
import type { ChainInfo } from "./chains.js";
import { clickhouse, getRpcClient } from "./clients.js";
import type { EventInfo } from "./abi.js";

const MAX_CHUNK = 800;
const RPC_CONCURRENCY = 8;
const INSERT_BATCH = 2000;

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
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

async function adaptiveGetLogs(
  client: PublicClient,
  address: `0x${string}`,
  from: bigint,
  to: bigint,
): Promise<Log[]> {
  try {
    return (await client.getLogs({ address, fromBlock: from, toBlock: to })) as Log[];
  } catch (err) {
    if (from >= to) throw err;
    const mid = from + (to - from) / 2n;
    const left = await adaptiveGetLogs(client, address, from, mid);
    const right = await adaptiveGetLogs(client, address, mid + 1n, to);
    return [...left, ...right];
  }
}

export interface IngestOptions {
  chain: ChainInfo;
  address: string;
  abi: Abi;
  selectedEvents: EventInfo[];
  includeTransactions: boolean;
  fromBlock: bigint;
  toBlock: bigint;
  onProgress?: (info: {
    lastBlock: bigint;
    eventsIngested: number;
    txIngested: number;
  }) => Promise<void> | void;
}

export interface IngestResult {
  eventsIngested: number;
  txIngested: number;
  lastBlock: bigint;
}

export async function ingestContract(opts: IngestOptions): Promise<IngestResult> {
  const client = getRpcClient(opts.chain);
  const address = opts.address.toLowerCase() as `0x${string}`;
  const selectedTopics = new Set(opts.selectedEvents.map((e) => e.topic0));

  const blockTsCache = new Map<string, number>();
  const seenTx = new Set<string>();
  let eventsIngested = 0;
  let txIngested = 0;
  let lastBlock = opts.fromBlock;

  for (let from = opts.fromBlock; from <= opts.toBlock; from += BigInt(MAX_CHUNK)) {
    const to =
      from + BigInt(MAX_CHUNK - 1) > opts.toBlock
        ? opts.toBlock
        : from + BigInt(MAX_CHUNK - 1);

    const rawLogs = await adaptiveGetLogs(client, address, from, to);
    const logs = rawLogs.filter(
      (l) => l.topics[0] && selectedTopics.has(l.topics[0]),
    );

    if (logs.length > 0) {
      const uniqueBlocks = [
        ...new Set(logs.map((l) => l.blockNumber!.toString())),
      ].filter((b) => !blockTsCache.has(b));
      await mapPool(uniqueBlocks, RPC_CONCURRENCY, async (bn) => {
        const block = await client.getBlock({ blockNumber: BigInt(bn) });
        blockTsCache.set(bn, Number(block.timestamp));
      });

      const eventRows: EventRow[] = logs.map((log) => {
        let eventName = "unknown";
        let args = "{}";
        try {
          const decoded = decodeEventLog({
            abi: opts.abi,
            data: log.data,
            topics: log.topics,
          });
          eventName = decoded.eventName ?? "unknown";
          args = JSON.stringify(decoded.args ?? {}, bigintReplacer);
        } catch {
          /* keep raw */
        }
        const sig = opts.selectedEvents.find((e) => e.topic0 === log.topics[0]);
        return {
          chain_id: opts.chain.chainId,
          contract_address: address,
          block_number: Number(log.blockNumber),
          block_timestamp: blockTsCache.get(log.blockNumber!.toString()) ?? 0,
          tx_hash: log.transactionHash ?? "",
          tx_index: Number(log.transactionIndex ?? 0),
          log_index: Number(log.logIndex ?? 0),
          event_name: eventName,
          event_signature: sig?.signature ?? "",
          topic0: log.topics[0] ?? "",
          args,
          data: log.data,
          removed: log.removed ? 1 : 0,
        };
      });

      for (let i = 0; i < eventRows.length; i += INSERT_BATCH) {
        await insertEvents(clickhouse, eventRows.slice(i, i + INSERT_BATCH));
      }
      eventsIngested += eventRows.length;

      if (opts.includeTransactions) {
        const txHashes = [
          ...new Set(logs.map((l) => l.transactionHash!).filter(Boolean)),
        ].filter((h) => !seenTx.has(h));
        const txRows = (
          await mapPool(txHashes, RPC_CONCURRENCY, async (hash) => {
            try {
              const [tx, receipt] = await Promise.all([
                client.getTransaction({ hash: hash as `0x${string}` }),
                client.getTransactionReceipt({ hash: hash as `0x${string}` }),
              ]);
              seenTx.add(hash);
              const row: TransactionRow = {
                chain_id: opts.chain.chainId,
                contract_address: address,
                block_number: Number(receipt.blockNumber),
                block_timestamp:
                  blockTsCache.get(receipt.blockNumber.toString()) ?? 0,
                tx_hash: hash,
                tx_index: Number(receipt.transactionIndex ?? 0),
                from_address: tx.from.toLowerCase(),
                to_address: (tx.to ?? "").toLowerCase(),
                value: tx.value.toString(),
                gas_used: Number(receipt.gasUsed),
                gas_price: Number(tx.gasPrice ?? 0n),
                effective_gas_price: Number(receipt.effectiveGasPrice ?? 0n),
                status: receipt.status === "success" ? 1 : 0,
                method_selector: (tx.input ?? "0x").slice(0, 10),
              };
              return row;
            } catch {
              return null;
            }
          })
        ).filter((r): r is TransactionRow => r !== null);

        for (let i = 0; i < txRows.length; i += INSERT_BATCH) {
          await insertTransactions(clickhouse, txRows.slice(i, i + INSERT_BATCH));
        }
        txIngested += txRows.length;
      }
    }

    lastBlock = to;
    if (opts.onProgress) {
      await opts.onProgress({ lastBlock, eventsIngested, txIngested });
    }
  }

  return { eventsIngested, txIngested, lastBlock };
}
