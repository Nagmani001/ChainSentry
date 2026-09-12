import {
  insertEvents,
  insertTransactions,
  type EventRow,
  type TransactionRow,
} from "@repo/database";
import type { ChainInfo } from "./chains.js";
import { clickhouse } from "./clients.js";
import { env } from "./env.js";

const GRAPH_BATCH = 1000;
const INSERT_BATCH = 2000;

interface GraphEvent {
  id: string;
  contractAddress: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  transactionIndex: string;
  logIndex: string;
  eventName: string;
  eventSignature: string;
  topic0: string;
  args: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gasLimit: string;
  input: string;
}

async function graphQuery<T>(
  queryUrl: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.graphApiKey) headers.Authorization = `Bearer ${env.graphApiKey}`;
  const res = await fetch(queryUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Graph query failed with HTTP ${res.status}`);
  const body = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }
  if (!body.data) throw new Error("Graph query returned no data.");
  return body.data;
}

async function fetchGraphEvents(input: {
  queryUrl: string;
  address: string;
  fromBlock: bigint;
  toBlock: bigint | null;
  skip: number;
}): Promise<GraphEvent[]> {
  const toFilter = input.toBlock != null ? ", blockNumber_lte: $toBlock" : "";
  const query = `query ChainSentryEvents($first: Int!, $skip: Int!, $address: Bytes!, $fromBlock: BigInt!${input.toBlock != null ? ", $toBlock: BigInt!" : ""}) {
  chainSentryEvents(first: $first, skip: $skip, orderBy: blockNumber, orderDirection: asc, where: { contractAddress: $address, blockNumber_gte: $fromBlock ${toFilter} }) {
    id
    contractAddress
    blockNumber
    blockTimestamp
    transactionHash
    transactionIndex
    logIndex
    eventName
    eventSignature
    topic0
    args
    from
    to
    value
    gasPrice
    gasLimit
    input
  }
}`;
  const variables: Record<string, unknown> = {
    first: GRAPH_BATCH,
    skip: input.skip,
    address: input.address.toLowerCase(),
    fromBlock: input.fromBlock.toString(),
  };
  if (input.toBlock != null) variables.toBlock = input.toBlock.toString();
  const data = await graphQuery<{ chainSentryEvents: GraphEvent[] }>(
    input.queryUrl,
    query,
    variables,
  );
  return data.chainSentryEvents;
}

export interface IngestOptions {
  chain: ChainInfo;
  address: string;
  queryUrl: string;
  includeTransactions: boolean;
  fromBlock: bigint;
  toBlock: bigint | null;
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

function eventRow(chain: ChainInfo, row: GraphEvent): EventRow {
  return {
    chain_id: chain.chainId,
    contract_address: row.contractAddress.toLowerCase(),
    block_number: Number(row.blockNumber),
    block_timestamp: Number(row.blockTimestamp),
    tx_hash: row.transactionHash,
    tx_index: Number(row.transactionIndex),
    log_index: Number(row.logIndex),
    event_name: row.eventName,
    event_signature: row.eventSignature,
    topic0: row.topic0,
    args: row.args,
    data: "",
    removed: 0,
  };
}

function transactionRow(chain: ChainInfo, row: GraphEvent): TransactionRow {
  return {
    chain_id: chain.chainId,
    contract_address: row.contractAddress.toLowerCase(),
    block_number: Number(row.blockNumber),
    block_timestamp: Number(row.blockTimestamp),
    tx_hash: row.transactionHash,
    tx_index: Number(row.transactionIndex),
    from_address: row.from.toLowerCase(),
    to_address: (row.to ?? "").toLowerCase(),
    value: row.value,
    gas_used: 0,
    gas_price: Number(row.gasPrice),
    effective_gas_price: Number(row.gasPrice),
    status: 1,
    method_selector: (row.input || "0x").slice(0, 10),
  };
}

export async function ingestContract(
  opts: IngestOptions,
): Promise<IngestResult> {
  let eventsIngested = 0;
  let txIngested = 0;
  let lastBlock = opts.fromBlock;
  let skip = 0;
  const seenTx = new Set<string>();

  while (true) {
    const rows = await fetchGraphEvents({
      queryUrl: opts.queryUrl,
      address: opts.address,
      fromBlock: opts.fromBlock,
      toBlock: opts.toBlock,
      skip,
    });
    if (rows.length === 0) break;

    const eventRows = rows.map((row) => eventRow(opts.chain, row));
    for (let i = 0; i < eventRows.length; i += INSERT_BATCH) {
      await insertEvents(clickhouse, eventRows.slice(i, i + INSERT_BATCH));
    }
    eventsIngested += eventRows.length;

    if (opts.includeTransactions) {
      const txRows = rows
        .filter((row) => {
          if (seenTx.has(row.transactionHash)) return false;
          seenTx.add(row.transactionHash);
          return true;
        })
        .map((row) => transactionRow(opts.chain, row));
      for (let i = 0; i < txRows.length; i += INSERT_BATCH) {
        await insertTransactions(clickhouse, txRows.slice(i, i + INSERT_BATCH));
      }
      txIngested += txRows.length;
    }

    lastBlock = rows.reduce((max, row) => {
      const block = BigInt(row.blockNumber);
      return block > max ? block : max;
    }, lastBlock);
    skip += rows.length;

    if (opts.onProgress) {
      await opts.onProgress({ lastBlock, eventsIngested, txIngested });
    }
    if (rows.length < GRAPH_BATCH) break;
  }

  return { eventsIngested, txIngested, lastBlock };
}
