import express, { type Express, Request, Response } from "express";

const app: Express = express();

app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT ?? 3001;

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

export default app;
