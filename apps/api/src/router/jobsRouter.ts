import { Router, type Request, type Response } from "express";
import { prisma } from "../clients.js";
import { routeParam } from "../lib/route.js";

export const jobsRouter: Router = Router();

jobsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const job = await prisma.ingestionJob.findUnique({ where: { id } });
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json(job);
});
