import "./env.js";
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { z } from "zod";
import { migrateClickHouse } from "@repo/database";
import { clickhouse, prisma } from "./clients.js";
import { runPipeline } from "./pipeline.js";
import { queryEvents, queryMetrics } from "./queries.js";
import { runReadOnlyQuery } from "./rawQuery.js";
import { ensureDefaultDashboards } from "./dashboards.js";
import { runAgent } from "./agent.js";
import { env } from "./env.js";

const app: Express = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "5mb" }));

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "dashboard"
  );
}

const createContractSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid EVM address"),
  environment: z.enum(["devnet", "testnet", "mainnet"]),
  prompt: z.string().default(""),
  abi: z.unknown().optional(),
  fromBlock: z.number().int().optional(),
  toBlock: z.number().int().optional(),
  maxBlocks: z.number().int().positive().optional(),
  sync: z.boolean().optional(),
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.post("/contracts", async (req: Request, res: Response) => {
  const parsed = createContractSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const result = await runPipeline(parsed.data);
    return res.status(201).json({
      contract: result.contract,
      deployment: { id: result.deployment.id, eventNames: result.deployment.eventNames },
      job: result.job,
      abiSource: result.abiSource,
      contractName: result.contractName,
      deployBlock: result.deployBlock,
      deploy: result.deploy,
      indexRange: { fromBlock: result.fromBlock, toBlock: result.toBlock },
      plan: {
        selectedEvents: result.plan.selectedEvents.map((e) => e.name),
        includeTransactions: result.plan.includeTransactions,
        notes: result.plan.notes,
      },
      config: result.config,
      ingestResult: result.ingestResult,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/contracts", async (_req: Request, res: Response) => {
  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: { jobs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  res.json(contracts);
});

app.get("/contracts/:id", async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: {
      deployments: { orderBy: { createdAt: "desc" }, take: 1 },
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  res.json(contract);
});

app.get("/contracts/:id/config", async (req: Request, res: Response) => {
  const deployment = await prisma.deployment.findFirst({
    where: { contractId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  if (!deployment) return res.status(404).json({ error: "no config found" });
  res.json({
    prompt: deployment.prompt,
    eventNames: deployment.eventNames,
    deploy: {
      status: deployment.deployStatus,
      target: deployment.deployTarget,
      projectPath: deployment.projectPath,
      queryUrl: deployment.queryUrl,
      message: deployment.deployMessage,
    },
    "subgraph.yaml": deployment.subgraphYaml,
    "schema.graphql": deployment.schemaGraphql,
    "mapping.ts": deployment.mappingsTs,
  });
});

app.get("/contracts/:id/events", async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  const rows = await queryEvents({
    contractAddress: contract.address,
    chainId: contract.chainId,
    eventName: req.query.event as string | undefined,
    fromBlock: req.query.fromBlock ? Number(req.query.fromBlock) : undefined,
    toBlock: req.query.toBlock ? Number(req.query.toBlock) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json({ count: (rows as unknown[]).length, events: rows });
});

app.get("/contracts/:id/metrics", async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  const metrics = await queryMetrics(contract.address, contract.chainId);
  res.json(metrics);
});

app.get("/jobs/:id", async (req: Request, res: Response) => {
  const job = await prisma.ingestionJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json(job);
});

const querySchema = z.object({
  sql: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

app.post("/query", async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const result = await runReadOnlyQuery(parsed.data.sql, parsed.data.params);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.get("/dashboards", async (req: Request, res: Response) => {
  const section = req.query.section as string | undefined;
  const dashboards = await prisma.dashboard.findMany({
    where: section ? { section } : undefined,
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  res.json(dashboards);
});

const upsertDashboardSchema = z.object({
  name: z.string().min(1),
  spec: z.unknown(),
  section: z.enum(["metrics", "logs"]).optional(),
  contractId: z.string().optional(),
});

app.post("/dashboards", async (req: Request, res: Response) => {
  const parsed = upsertDashboardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const base = slugify(parsed.data.name);
  const slug = `${base}-${Date.now().toString(36)}`;
  const dashboard = await prisma.dashboard.create({
    data: {
      name: parsed.data.name,
      slug,
      section: parsed.data.section ?? "metrics",
      contractId: parsed.data.contractId ?? null,
      spec: parsed.data.spec as object,
    },
  });
  res.status(201).json(dashboard);
});

app.get("/dashboards/:id", async (req: Request, res: Response) => {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: req.params.id },
  });
  if (!dashboard) return res.status(404).json({ error: "dashboard not found" });
  res.json(dashboard);
});

app.put("/dashboards/:id", async (req: Request, res: Response) => {
  const parsed = upsertDashboardSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const dashboard = await prisma.dashboard.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.spec !== undefined
          ? { spec: parsed.data.spec as object }
          : {}),
      },
    });
    res.json(dashboard);
  } catch {
    res.status(404).json({ error: "dashboard not found" });
  }
});

app.delete("/dashboards/:id", async (req: Request, res: Response) => {
  try {
    await prisma.dashboard.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "dashboard not found" });
  }
});

const agentSchema = z.object({
  prompt: z.string().min(1),
  contractId: z.string().min(1),
  section: z.enum(["metrics", "logs"]).optional(),
});

app.post("/agent", async (req: Request, res: Response) => {
  const parsed = agentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const contract = await prisma.contract.findUnique({
    where: { id: parsed.data.contractId },
  });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  try {
    const result = await runAgent({
      prompt: parsed.data.prompt,
      contractAddress: contract.address,
      chainId: contract.chainId,
      contractName: contract.name ?? undefined,
      section: parsed.data.section,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

async function main() {
  await migrateClickHouse(clickhouse);
  await ensureDefaultDashboards();
  app.listen(env.port, () => {
    console.log(`ChainSentry API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("failed to start:", err);
  process.exit(1);
});

export default app;
