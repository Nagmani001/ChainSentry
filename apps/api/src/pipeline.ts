import { getAddress, type Abi } from "viem";
import { prisma } from "./clients.js";
import { resolveChain } from "./chains.js";
import { fetchAbi, extractEvents } from "./abi.js";
import { parsePrompt } from "./prompt.js";
import { generateConfig } from "./configgen.js";
import { deploySubgraph } from "./deploy.js";
import { ingestContract } from "./ingest.js";

export interface PipelineInput {
  address: string;
  environment: string;
  prompt: string;
  abi?: unknown;
  fromBlock?: number;
  toBlock?: number;
  sync?: boolean;
}

function sanitizeName(name: string | undefined): string {
  if (!name) return "Contract";
  const clean = name.replace(/[^A-Za-z0-9]/g, "");
  return clean.length > 0 ? clean : "Contract";
}

export async function runPipeline(input: PipelineInput): Promise<any> {
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

  const fromBlock = input.fromBlock != null ? BigInt(input.fromBlock) : 0n;
  const toBlock = input.toBlock != null ? BigInt(input.toBlock) : null;

  const contractName = sanitizeName(abiResult.name);
  const configStartBlock = Number(fromBlock);
  const config = generateConfig({
    contractName,
    address,
    network: chain.network,
    startBlock: configStartBlock,
    selectedEvents: plan.selectedEvents,
  });

  const contract = await prisma.contract.upsert({
    where: {
      address_chainId: { address: lowerAddress, chainId: chain.chainId },
    },
    create: {
      address: lowerAddress,
      chainId: chain.chainId,
      environment: chain.environment,
      name: abiResult.name ?? null,
      abi: abi as object[],
      deployBlock: null,
    },
    update: {
      abi: abi as object[],
      name: abiResult.name ?? null,
      deployBlock: null,
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
      artifactBucket: deployResult.artifactBucket,
      artifactPrefix: deployResult.artifactPrefix,
      artifactManifestUrl: deployResult.artifactManifestUrl,
    },
  });

  const runIngestion = async () => {
    const MAX_RETRIES = 60;
    const RETRY_DELAY_MS = 30_000;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await prisma.ingestionJob.update({
          where: { id: job.id },
          data: { status: "indexing" },
        });
        if (!updatedDeployment.queryUrl) {
          throw new Error(
            "Subgraph was not deployed with a query URL. Configure GRAPH_NODE_URL or GRAPH_DEPLOY_KEY plus GRAPH_STUDIO_ID before indexing.",
          );
        }
        const result = await ingestContract({
          chain,
          address: lowerAddress,
          queryUrl: updatedDeployment.queryUrl,
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
        const message = (err as Error).message;
        const retriable = attempt < MAX_RETRIES - 1;
        if (retriable) {
          await prisma.ingestionJob.update({
            where: { id: job.id },
            data: { lastIndexedBlock: null, error: null },
          });
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        await prisma.ingestionJob.update({
          where: { id: job.id },
          data: { status: "failed", error: message },
        });
        throw err;
      }
    }
    throw new Error("Ingestion exhausted retries.");
  };

  let ingestResult = null;
  let returnedJob = job;
  if (!updatedDeployment.queryUrl) {
    returnedJob = await prisma.ingestionJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error:
          "Subgraph artifacts were stored in GCS but no deployed query URL is available for ingestion.",
      },
    });
  } else if (input.sync) {
    ingestResult = await runIngestion();
  } else {
    void runIngestion().catch((err) =>
      console.error(`[job ${job.id}] ingestion failed:`, err.message),
    );
  }

  return {
    contract,
    deployment: updatedDeployment,
    job: returnedJob,
    chain,
    abiSource: abiResult.source,
    contractName,
    deployBlock: null,
    fromBlock,
    toBlock,
    plan,
    config,
    deploy: deployResult,
    ingestResult,
  };
}
