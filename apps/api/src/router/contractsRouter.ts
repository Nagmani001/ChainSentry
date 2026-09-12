import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../clients.js";
import { runPipeline } from "../pipeline.js";
import { queryEvents, queryMetrics } from "../queries.js";
import { queryString, routeParam } from "../lib/route.js";

export const contractsRouter: Router = Router();

const createContractSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid EVM address"),
  environment: z.enum(["devnet", "testnet", "mainnet"]),
  prompt: z.string().default(""),
  abi: z.unknown().optional(),
  fromBlock: z.number().int().optional(),
  toBlock: z.number().int().optional(),
  sync: z.boolean().optional(),
});

contractsRouter.post("/", async (req: Request, res: Response) => {
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

contractsRouter.get("/", async (_req: Request, res: Response) => {
  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: { jobs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  res.json(contracts);
});

contractsRouter.get("/:id", async (req: Request, res: Response) => {
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

contractsRouter.get("/:id/config", async (req: Request, res: Response) => {
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

contractsRouter.get("/:id/events", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const contract = await prisma.contract.findUnique({ where: { id } });
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

contractsRouter.get("/:id/metrics", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  const metrics = await queryMetrics(contract.address, contract.chainId);
  res.json(metrics);
});

contractsRouter.post("/:id/traces", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return res.status(404).json({ error: "contract not found" });
  res.status(501).json({
    error:
      "Trace ingestion is disabled until traces are available from a Graph-indexed source.",
  });
});
