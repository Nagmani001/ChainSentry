import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../clients.js";
import { runAgent, runIncidentAgent } from "../agent.js";

export const agentRouter: Router = Router();
export const incidentRouter: Router = Router();

const agentSchema = z.object({
  prompt: z.string().min(1),
  contractId: z.string().min(1),
  section: z.enum(["metrics", "logs", "traces"]).optional(),
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

agentRouter.post("/", async (req: Request, res: Response) => {
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

incidentRouter.post("/", async (req: Request, res: Response) => {
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
