import { Router, type Request, type Response } from "express";
import { requirePrivyUser } from "../auth.js";
import { syncUser, userSchema } from "../alerting.js";

export const authRouter: Router = Router();

authRouter.post("/sync", async (req: Request, res: Response) => {
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
