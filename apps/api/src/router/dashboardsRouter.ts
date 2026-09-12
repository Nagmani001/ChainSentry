import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../clients.js";
import { queryString, routeParam, slugify } from "../lib/route.js";

export const dashboardsRouter: Router = Router();

const upsertDashboardSchema = z.object({
  name: z.string().min(1),
  spec: z.unknown(),
  section: z.enum(["metrics", "logs", "traces"]).optional(),
  contractId: z.string().optional(),
});

dashboardsRouter.get("/", async (req: Request, res: Response) => {
  const section = queryString(req.query.section);
  const dashboards = await prisma.dashboard.findMany({
    where: section ? { section } : undefined,
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  res.json(dashboards);
});

dashboardsRouter.post("/", async (req: Request, res: Response) => {
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

dashboardsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  const dashboard = await prisma.dashboard.findUnique({ where: { id } });
  if (!dashboard) return res.status(404).json({ error: "dashboard not found" });
  res.json(dashboard);
});

dashboardsRouter.put("/:id", async (req: Request, res: Response) => {
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

dashboardsRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  try {
    await prisma.dashboard.delete({ where: { id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "dashboard not found" });
  }
});
