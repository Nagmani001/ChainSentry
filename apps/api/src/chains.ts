import { env } from "./env.js";

export type EnvName = "devnet" | "testnet" | "mainnet";

export interface ChainInfo {
  environment: EnvName;
  chainId: number;
  network: string;
  rpc: string;
  traceRpc: string;
}

export const CHAINS: Record<EnvName, ChainInfo> = {
  mainnet: { environment: "mainnet", chainId: 1, network: "mainnet", rpc: env.rpc.mainnet, traceRpc: env.traceRpc.mainnet },
  testnet: { environment: "testnet", chainId: 11155111, network: "sepolia", rpc: env.rpc.testnet, traceRpc: env.traceRpc.testnet },
  devnet: { environment: "devnet", chainId: 17000, network: "holesky", rpc: env.rpc.devnet, traceRpc: env.traceRpc.devnet },
};

export function resolveChain(environment: string): ChainInfo {
  const chain = CHAINS[environment as EnvName];
  if (!chain) {
    throw new Error(
      `Unknown environment "${environment}". Use one of: devnet, testnet, mainnet.`,
    );
  }
  return chain;
}
