export type EnvName = "devnet" | "testnet" | "mainnet";

export interface ChainInfo {
  environment: EnvName;
  chainId: number;
  network: string;
}

export const CHAINS: Record<EnvName, ChainInfo> = {
  mainnet: { environment: "mainnet", chainId: 1, network: "mainnet" },
  testnet: { environment: "testnet", chainId: 11155111, network: "sepolia" },
  devnet: { environment: "devnet", chainId: 17000, network: "holesky" },
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
