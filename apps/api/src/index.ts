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
import { runAgent, runIncidentAgent } from "./agent.js";
import { env } from "./env.js";
import {
  createAlertRule,
  createOnCallSlot,
  createOrg,
  createOrgSchema,
  createRuleSchema,
  createSlotSchema,
  evaluateAlertRule,
  getAlertingContext,
  issueActionSchema,
  joinOrg,
  joinOrgSchema,
  listOrgData,
  resolveIssue,
  syncUser,
  userSchema,
  verifyIssue,
} from "./alerting.js";
import { requirePrivyUser } from "./auth.js";

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

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string")
    throw new Error(`missing route param: ${name}`);
  return value;
}

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const createContractSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid EVM address"),
  environment: z.enum(["devnet", "testnet", "mainnet"]),
  prompt: z.string().default(""),
  abi: z.unknown().optional(),
  fromBlock: z.number().int().optional(),
  toBlock: z.number().int().optional(),
  sync: z.boolean().optional(),
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.post("/auth/sync", async (req: Request, res: Response) => {
  try {
    const privyId = await requirePrivyUser(req);
    const parsed = userSchema.safeParse({ ...req.body, privyId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const user = await syncUser(parsed.data);
    return res.status(201).json(user);
  } catch (err) {
    return res.status(401).json({ error: (err as Error).message });
  }
});

app.get("/alerting/context", async (req: Request, res: Response) => {
  try {
    const privyId = await requirePrivyUser(req);
    return res.json(await getAlertingContext(privyId));
  } catch (err) {
    return res.status(401).json({ error: (err as Error).message });
  }
});

app.post("/orgs", async (req: Request, res: Response) => {
  try {
    const privyId = await requirePrivyUser(req);
    const parsed = createOrgSchema.safeParse({ ...req.body, privyId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    return res.status(201).json(await createOrg(parsed.data));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/orgs/join", async (req: Request, res: Response) => {
  try {
    const privyId = await requirePrivyUser(req);
    const parsed = joinOrgSchema.safeParse({ ...req.body, privyId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    return res.status(201).json(await joinOrg(parsed.data));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.get("/orgs/:id/alerting", async (req: Request, res: Response) => {
  const orgId = routeParam(req, "id");
  try {
    const privyId = await requirePrivyUser(req);
    return res.json(await listOrgData(orgId, privyId));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/orgs/:id/on-call", async (req: Request, res: Response) => {
  const orgId = routeParam(req, "id");
  try {
    const privyId = await requirePrivyUser(req);
    const parsed = createSlotSchema.safeParse({ ...req.body, privyId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    return res.status(201).json(await createOnCallSlot(orgId, parsed.data));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/orgs/:id/alerts", async (req: Request, res: Response) => {
  const orgId = routeParam(req, "id");
  try {
    const privyId = await requirePrivyUser(req);
    const parsed = createRuleSchema.safeParse({ ...req.body, privyId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    return res.status(201).json(await createAlertRule(orgId, parsed.data));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/alerts/:id/evaluate", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  try {
    const privyId = await requirePrivyUser(req);
    return res.json(await evaluateAlertRule(id, privyId));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/issues/:id/resolve", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  try {
    const privyId = await requirePrivyUser(req);
    const parsed = issueActionSchema.safeParse({ ...req.body, privyId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    return res.json(await resolveIssue(id, parsed.data));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/issues/:id/verify", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  try {
    const privyId = await requirePrivyUser(req);
    const parsed = issueActionSchema.safeParse({ ...req.body, privyId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    return res.json(await verifyIssue(id, parsed.data));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
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
      deployment: {
        id: result.deployment.id,
        eventNames: result.deployment.eventNames,
      },
      job: result.job,
      abiSource: result.abiSource,
      contractName: result.contractName,
      deployBlock: result.deployBlock,
      deploy: result.deploy,
      indexRange: { fromBlock: result.fromBlock, toBlock: result.toBlock },
      plan: {
        selectedEvents: result.plan.selectedEvents.map(
          (e: { name: string }) => e.name,
        ),
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
  const id = routeParam(req, "id");
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      deployments: { orderBy: { createdAt: "desc" }, take: 1 },
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  res.json(contract);
});

app.get("/contracts/:id/config", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const deployment = await prisma.deployment.findFirst({
    where: { contractId: id },
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
    artifact: {
      bucket: deployment.artifactBucket,
      prefix: deployment.artifactPrefix,
      manifestUrl: deployment.artifactManifestUrl,
    },
    "subgraph.yaml": deployment.subgraphYaml,
    "schema.graphql": deployment.schemaGraphql,
    "mapping.ts": deployment.mappingsTs,
  });
});

app.get("/contracts/:id/events", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const contract = await prisma.contract.findUnique({
    where: { id },
  });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  const eventName = queryString(req.query.event);
  const fromBlock = queryString(req.query.fromBlock);
  const toBlock = queryString(req.query.toBlock);
  const limit = queryString(req.query.limit);
  const rows = await queryEvents({
    contractAddress: contract.address,
    chainId: contract.chainId,
    eventName,
    fromBlock: fromBlock ? Number(fromBlock) : undefined,
    toBlock: toBlock ? Number(toBlock) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.json({ count: (rows as unknown[]).length, events: rows });
});

app.get("/contracts/:id/metrics", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const contract = await prisma.contract.findUnique({
    where: { id },
  });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  const metrics = await queryMetrics(contract.address, contract.chainId);
  res.json(metrics);
});

app.post("/contracts/:id/traces", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const contract = await prisma.contract.findUnique({
    where: { id },
  });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  res.status(501).json({
    error:
      "Trace ingestion is disabled until traces are available from a Graph-indexed source.",
  });
});

app.get("/jobs/:id", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const job = await prisma.ingestionJob.findUnique({
    where: { id },
  });
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
  const section = queryString(req.query.section);
  const dashboards = await prisma.dashboard.findMany({
    where: section ? { section } : undefined,
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  res.json(dashboards);
});

const upsertDashboardSchema = z.object({
  name: z.string().min(1),
  spec: z.unknown(),
  section: z.enum(["metrics", "logs", "traces"]).optional(),
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
  const id = routeParam(req, "id");
  const dashboard = await prisma.dashboard.findUnique({
    where: { id },
  });
  if (!dashboard) return res.status(404).json({ error: "dashboard not found" });
  res.json(dashboard);
});

app.put("/dashboards/:id", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const parsed = upsertDashboardSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const dashboard = await prisma.dashboard.update({
      where: { id },
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
  const id = routeParam(req, "id");
  try {
    await prisma.dashboard.delete({ where: { id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "dashboard not found" });
  }
});

const agentSchema = z.object({
  prompt: z.string().min(1),
  contractId: z.string().min(1),
  section: z.enum(["metrics", "logs", "traces"]).optional(),
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

const incidentSchema = z.object({
  prompt: z.string().min(1),
  contractId: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "agent"]),
        text: z.string(),
      }),
    )
    .optional(),
});

app.post("/incident", async (req: Request, res: Response) => {
  const parsed = incidentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const contract = await prisma.contract.findUnique({
    where: { id: parsed.data.contractId },
  });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  try {
    const result = await runIncidentAgent({
      prompt: parsed.data.prompt,
      history: parsed.data.history ?? [],
      contractAddress: contract.address,
      chainId: contract.chainId,
      contractName: contract.name ?? undefined,
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
