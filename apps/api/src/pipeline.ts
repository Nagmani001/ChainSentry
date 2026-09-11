import { getAddress, type Abi } from "viem";
import { prisma, getRpcClient } from "./clients.js";
import { resolveChain } from "./chains.js";
import { fetchAbi, extractEvents } from "./abi.js";
import { parsePrompt } from "./prompt.js";
import { findDeployBlock } from "./deployBlock.js";
import { generateConfig } from "./configgen.js";
import { deploySubgraph } from "./deploy.js";
import { ingestContract } from "./ingest.js";

const DEFAULT_LOOKBACK = 5000n;

export interface PipelineInput {
  address: string;
  environment: string;
  prompt: string;
  abi?: unknown;
  fromBlock?: number;
  toBlock?: number;
  maxBlocks?: number;
  sync?: boolean;
}

function sanitizeName(name: string | undefined): string {
  if (!name) return "Contract";
  const clean = name.replace(/[^A-Za-z0-9]/g, "");
  return clean.length > 0 ? clean : "Contract";
}

export async function runPipeline(input: PipelineInput) {
  const chain = resolveChain(input.environment);
  const address = getAddress(input.address);
  const lowerAddress = address.toLowerCase();

  const abiResult = await fetchAbi(address, chain.chainId, input.abi);
  const abi = abiResult.abi as Abi;
  const allEvents = extractEvents(abi);
  if (allEvents.length === 0) {
    throw new Error("ABI contains no events; nothing to index.");
  }

  const plan = parsePrompt(input.prompt, allEvents);

  const client = getRpcClient(chain);
  const head = await client.getBlockNumber();
  const deployBlock = await findDeployBlock(client, address as `0x${string}`, head);

  const lookback = input.maxBlocks != null ? BigInt(input.maxBlocks) : DEFAULT_LOOKBACK;
  const toBlock = input.toBlock != null ? BigInt(input.toBlock) : head;
  let fromBlock: bigint;
  if (input.fromBlock != null) {
    fromBlock = BigInt(input.fromBlock);
  } else if (deployBlock != null) {
    const floor = toBlock > lookback ? toBlock - lookback : 0n;
    fromBlock = deployBlock > floor ? deployBlock : floor;
  } else {
    fromBlock = toBlock > lookback ? toBlock - lookback : 0n;
  }

  const contractName = sanitizeName(abiResult.name);
  const configStartBlock = Number(deployBlock ?? fromBlock);
  const config = generateConfig({
    contractName,
    address,
    network: chain.network,
    startBlock: configStartBlock,
    selectedEvents: plan.selectedEvents,
  });

  const contract = await prisma.contract.upsert({
    where: { address_chainId: { address: lowerAddress, chainId: chain.chainId } },
    create: {
      address: lowerAddress,
      chainId: chain.chainId,
      environment: chain.environment,
      name: abiResult.name ?? null,
      abi: abi as object[],
      deployBlock: deployBlock ?? null,
    },
    update: {
      abi: abi as object[],
      name: abiResult.name ?? null,
      deployBlock: deployBlock ?? null,
    },
  });

  const deployment = await prisma.deployment.create({
    data: {
      contractId: contract.id,
      prompt: input.prompt,
      subgraphYaml: config.subgraphYaml,
      schemaGraphql: config.schemaGraphql,
      mappingsTs: config.mappingsTs,
      eventNames: config.entityNames,
    },
  });

  const job = await prisma.ingestionJob.create({
    data: {
      contractId: contract.id,
      deploymentId: deployment.id,
      status: "deploying",
      startBlock: fromBlock,
      targetBlock: toBlock,
    },
  });

  const deployResult = await deploySubgraph({
    deploymentId: deployment.id,
    contractName,
    network: chain.network,
    abi,
    config,
  });
  const updatedDeployment = await prisma.deployment.update({
    where: { id: deployment.id },
    data: {
      projectPath: deployResult.projectPath,
      deployStatus: deployResult.status,
      deployTarget: deployResult.target,
      deployMessage: deployResult.message,
      queryUrl: deployResult.queryUrl,
    },
  });

  const runIngestion = async () => {
    try {
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: { status: "indexing" },
      });
      const result = await ingestContract({
        chain,
        address: lowerAddress,
        abi,
        selectedEvents: plan.selectedEvents,
        includeTransactions: plan.includeTransactions,
        fromBlock,
        toBlock,
        onProgress: async ({ lastBlock, eventsIngested, txIngested }) => {
          await prisma.ingestionJob.update({
            where: { id: job.id },
            data: {
              lastIndexedBlock: lastBlock,
              eventsIngested,
              txIngested,
            },
          });
        },
      });
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: "live",
          lastIndexedBlock: result.lastBlock,
          eventsIngested: result.eventsIngested,
          txIngested: result.txIngested,
        },
      });
      return result;
    } catch (err) {
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: { status: "failed", error: (err as Error).message },
      });
      throw err;
    }
  };

  let ingestResult = null;
  if (input.sync) {
    ingestResult = await runIngestion();
  } else {
    void runIngestion().catch((err) =>
      console.error(`[job ${job.id}] ingestion failed:`, err.message),
    );
  }

  return {
    contract,
    deployment: updatedDeployment,
    job,
    chain,
    abiSource: abiResult.source,
    contractName,
    deployBlock,
    fromBlock,
    toBlock,
    plan,
    config,
    deploy: deployResult,
    ingestResult,
  };
}
