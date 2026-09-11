import { createPublicClient, http, type PublicClient } from "viem";
import {
  createClickHouseClient,
  getPrismaClient,
  type ClickHouseClient,
  type PrismaClient,
} from "@repo/database";
import type { ChainInfo } from "./chains.js";

export const prisma: PrismaClient = getPrismaClient();
export const clickhouse: ClickHouseClient = createClickHouseClient();

const rpcClients = new Map<number, PublicClient>();

export function getRpcClient(chain: ChainInfo): PublicClient {
  const existing = rpcClients.get(chain.chainId);
  if (existing) return existing;
  const client = createPublicClient({
    transport: http(chain.rpc, { batch: true, retryCount: 2 }),
  });
  rpcClients.set(chain.chainId, client);
  return client;
}
