import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";

const DEFAULT_URL =
  process.env.DATABASE_URL ??
  "postgres://chainsentry:chainsentry@localhost:5432/chainsentry";

let prisma: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL ?? DEFAULT_URL,
      }),
    });
  }
  return prisma;
}

export type { PrismaClient };
export type { Prisma } from "../generated/prisma/index.js";