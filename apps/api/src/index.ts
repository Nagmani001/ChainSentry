import "./env.js";
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { migrateClickHouse } from "@repo/database";
import { clickhouse } from "./clients.js";
import { ensureDefaultDashboards } from "./dashboards.js";
import { env } from "./env.js";
import { authRouter } from "./router/authRouter.js";
import {
  alertingRouter,
  alertRuleRouter,
  issueRouter,
  orgRouter,
} from "./router/alertingRouter.js";
import { contractsRouter } from "./router/contractsRouter.js";
import { jobsRouter } from "./router/jobsRouter.js";
import { queryRouter } from "./router/queryRouter.js";
import { dashboardsRouter } from "./router/dashboardsRouter.js";
import { agentRouter, incidentRouter } from "./router/agentRouter.js";

const app: Express = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/alerting", alertingRouter);
app.use("/orgs", orgRouter);
app.use("/alerts", alertRuleRouter);
app.use("/issues", issueRouter);
app.use("/contracts", contractsRouter);
app.use("/jobs", jobsRouter);
app.use("/query", queryRouter);
app.use("/dashboards", dashboardsRouter);
app.use("/agent", agentRouter);
app.use("/incident", incidentRouter);

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
