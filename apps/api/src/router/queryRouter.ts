import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { runReadOnlyQuery } from "../rawQuery.js";

export const queryRouter: Router = Router();

const querySchema = z.object({
  sql: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

queryRouter.post("/", async (req: Request, res: Response) => {
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
