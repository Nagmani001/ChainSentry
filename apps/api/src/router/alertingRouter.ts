import { Router, type Request, type Response } from "express";
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
  verifyIssue,
} from "../alerting.js";
import { requirePrivyUser } from "../auth.js";
import { routeParam } from "../lib/route.js";

export const alertingRouter: Router = Router();
export const orgRouter: Router = Router();
export const alertRuleRouter: Router = Router();
export const issueRouter: Router = Router();

alertingRouter.get("/context", async (req: Request, res: Response) => {
  try {
    const privyId = await requirePrivyUser(req);
    return res.json(await getAlertingContext(privyId));
  } catch (err) {
    return res.status(401).json({ error: (err as Error).message });
  }
});

orgRouter.post("/", async (req: Request, res: Response) => {
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

orgRouter.post("/join", async (req: Request, res: Response) => {
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

orgRouter.get("/:id/alerting", async (req: Request, res: Response) => {
  const orgId = routeParam(req, "id");
  try {
    const privyId = await requirePrivyUser(req);
    return res.json(await listOrgData(orgId, privyId));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

orgRouter.post("/:id/on-call", async (req: Request, res: Response) => {
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

orgRouter.post("/:id/alerts", async (req: Request, res: Response) => {
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

alertRuleRouter.post("/:id/evaluate", async (req: Request, res: Response) => {
  const id = routeParam(req, "id");
  try {
    const privyId = await requirePrivyUser(req);
    return res.json(await evaluateAlertRule(id, privyId));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

issueRouter.post("/:id/resolve", async (req: Request, res: Response) => {
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

issueRouter.post("/:id/verify", async (req: Request, res: Response) => {
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
