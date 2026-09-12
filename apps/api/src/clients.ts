import {
  createClickHouseClient,
  getPrismaClient,
  type ClickHouseClient,
  type PrismaClient,
} from "@repo/database";

export const prisma: PrismaClient = getPrismaClient();
export const clickhouse: ClickHouseClient = createClickHouseClient();
