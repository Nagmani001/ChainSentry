import { getAddress, toEventSelector, type Abi, type AbiEvent } from "viem";

export interface AbiResult {
  abi: Abi;
  source: string;
  name?: string;
}

async function trySourcify(
  chainId: number,
  address: string,
): Promise<AbiResult | null> {
  const url = `https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=abi,compilation`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      abi?: Abi;
      match?: string;
      compilation?: { name?: string };
    };
    if (!body.abi) return null;
    return {
      abi: body.abi,
      source: `sourcify:${body.match ?? "match"}`,
      name: body.compilation?.name,
    };
  } catch {
    return null;
  }
}

export async function fetchAbi(
  address: string,
  chainId: number,
  providedAbi?: unknown,
): Promise<AbiResult> {
  if (providedAbi) {
    const abi = (
      typeof providedAbi === "string" ? JSON.parse(providedAbi) : providedAbi
    ) as Abi;
    return { abi, source: "provided" };
  }

  const checksummed = getAddress(address);
  const result = await trySourcify(chainId, checksummed);
  if (result) return result;

  throw new Error(
    `Could not fetch ABI for ${checksummed} on chain ${chainId} (not verified on Sourcify). Pass "abi" in the request body.`,
  );
}

export interface EventInfo {
  name: string;
  signature: string;
  topic0: string;
  item: AbiEvent;
}

export function extractEvents(abi: Abi): EventInfo[] {
  const events: EventInfo[] = [];
  for (const item of abi) {
    if (item.type !== "event") continue;
    const ev = item as AbiEvent;
    const signature = `${ev.name}(${ev.inputs.map((i) => i.type).join(",")})`;
    events.push({ name: ev.name, signature, topic0: toEventSelector(ev), item: ev });
  }
  return events;
}
