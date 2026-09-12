import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../.env") });
config({ path: resolve(here, "../.env") });

(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

export const env = {
  port: Number(process.env.PORT ?? 3001),
  graphApiKey: process.env.GRAPH_API_KEY ?? "",
  graphDeployKey: process.env.GRAPH_DEPLOY_KEY ?? "",
  graphNodeUrl: process.env.GRAPH_NODE_URL ?? "",
  graphStudioId: process.env.GRAPH_STUDIO_ID ?? "",
  graphVersionLabel: process.env.GRAPH_VERSION_LABEL ?? "v0.0.1",
  ipfsUrl: process.env.IPFS_URL ?? "",
  generatedDir: resolve(here, "../../../generated/subgraphs"),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};
