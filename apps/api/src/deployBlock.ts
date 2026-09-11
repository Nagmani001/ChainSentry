import type { PublicClient } from "viem";

export async function findDeployBlock(
  client: PublicClient,
  address: `0x${string}`,
  head: bigint,
): Promise<bigint | null> {
  try {
    const codeNow = await client.getCode({ address });
    if (!codeNow || codeNow === "0x") return null;

    let lo = 0n;
    let hi = head;
    while (lo < hi) {
      const mid = (lo + hi) / 2n;
      const code = await client.getCode({ address, blockNumber: mid });
      if (code && code !== "0x") hi = mid;
      else lo = mid + 1n;
    }
    return lo;
  } catch {
    return null;
  }
}
