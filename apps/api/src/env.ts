import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../.env") });
config({ path: resolve(here, "../.env") });

(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const alchemyApiKey = process.env.ALCHEMY_API_KEY?.trim();
const alchemyUrl = (network: string, fallback: string) =>
  alchemyApiKey
    ? `https://${network}.g.alchemy.com/v2/${alchemyApiKey}`
    : fallback;

export const env = {
  port: Number(process.env.PORT ?? 3001),
  graphApiKey: process.env.GRAPH_API_KEY ?? "",
  graphDeployKey: process.env.GRAPH_DEPLOY_KEY ?? "",
  graphNodeUrl: process.env.GRAPH_NODE_URL ?? "",
  ipfsUrl: process.env.IPFS_URL ?? "",
  generatedDir: resolve(here, "../../../generated/subgraphs"),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  rpc: {
    mainnet:
      process.env.RPC_MAINNET ??
      alchemyUrl("eth-mainnet", "https://ethereum-rpc.publicnode.com"),
    testnet:
      process.env.RPC_TESTNET ??
      alchemyUrl("eth-sepolia", "https://ethereum-sepolia-rpc.publicnode.com"),
    devnet:
      process.env.RPC_DEVNET ??
      alchemyUrl("eth-holesky", "https://ethereum-holesky-rpc.publicnode.com"),
  },
  traceRpc: {
    mainnet:
      process.env.TRACE_RPC_MAINNET ??
      alchemyUrl("eth-mainnet", "https://eth.drpc.org"),
    testnet:
      process.env.TRACE_RPC_TESTNET ??
      alchemyUrl("eth-sepolia", "https://sepolia.drpc.org"),
    devnet:
      process.env.TRACE_RPC_DEVNET ??
      alchemyUrl("eth-holesky", "https://holesky.drpc.org"),
  },
};
