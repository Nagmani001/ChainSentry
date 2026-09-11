import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Abi } from "viem";
import { env } from "./env.js";
import type { GeneratedConfig } from "./configgen.js";

const run = promisify(execFile);

export interface DeployResult {
  projectPath: string;
  status: "generated" | "deployed" | "deploy_failed";
  target: string;
  message: string;
  queryUrl: string | null;
}

export interface DeployInput {
  deploymentId: string;
  contractName: string;
  network: string;
  abi: Abi;
  config: GeneratedConfig;
}

function packageJson(name: string): string {
  return JSON.stringify(
    {
      name: `chainsentry-${name.toLowerCase()}`,
      version: "0.0.1",
      scripts: {
        codegen: "graph codegen",
        build: "graph build",
        deploy: "graph deploy",
      },
      dependencies: {
        "@graphprotocol/graph-cli": "0.97.1",
        "@graphprotocol/graph-ts": "0.38.0",
      },
    },
    null,
    2,
  );
}

async function writeProject(input: DeployInput): Promise<string> {
  const projectPath = join(env.generatedDir, input.deploymentId);
  await mkdir(join(projectPath, "src"), { recursive: true });
  await mkdir(join(projectPath, "abis"), { recursive: true });

  await Promise.all([
    writeFile(join(projectPath, "subgraph.yaml"), input.config.subgraphYaml),
    writeFile(join(projectPath, "schema.graphql"), input.config.schemaGraphql),
    writeFile(join(projectPath, "src", "mapping.ts"), input.config.mappingsTs),
    writeFile(
      join(projectPath, "abis", `${input.contractName}.json`),
      JSON.stringify(input.abi, null, 2),
    ),
    writeFile(join(projectPath, "package.json"), packageJson(input.contractName)),
  ]);

  return projectPath;
}

async function graph(projectPath: string, args: string[]): Promise<string> {
  const { stdout, stderr } = await run(
    "npx",
    ["-y", "@graphprotocol/graph-cli@0.97.1", ...args],
    { cwd: projectPath, timeout: 300000, maxBuffer: 10 * 1024 * 1024 },
  );
  return `${stdout}\n${stderr}`.trim();
}

export async function deploySubgraph(input: DeployInput): Promise<DeployResult> {
  const projectPath = await writeProject(input);
  const slug = `${input.contractName.toLowerCase()}-${input.network}`;

  if (env.graphNodeUrl) {
    const ipfs = env.ipfsUrl || "http://localhost:5001";
    try {
      await graph(projectPath, ["codegen"]);
      await graph(projectPath, ["build"]);
      await graph(projectPath, [
        "create",
        slug,
        "--node",
        env.graphNodeUrl,
      ]).catch(() => "");
      const out = await graph(projectPath, [
        "deploy",
        slug,
        "--node",
        env.graphNodeUrl,
        "--ipfs",
        ipfs,
        "--version-label",
        "v0.0.1",
      ]);
      return {
        projectPath,
        status: "deployed",
        target: `graph-node:${env.graphNodeUrl}`,
        message: out.slice(-2000),
        queryUrl: `${env.graphNodeUrl.replace(/\/$/, "")}/subgraphs/name/${slug}`,
      };
    } catch (err) {
      return {
        projectPath,
        status: "deploy_failed",
        target: `graph-node:${env.graphNodeUrl}`,
        message: (err as Error).message.slice(-2000),
        queryUrl: null,
      };
    }
  }

  if (env.graphDeployKey) {
    try {
      await graph(projectPath, ["codegen"]);
      await graph(projectPath, ["build"]);
      const out = await graph(projectPath, [
        "deploy",
        slug,
        "--studio",
        "--deploy-key",
        env.graphDeployKey,
        "--version-label",
        "v0.0.1",
      ]);
      return {
        projectPath,
        status: "deployed",
        target: "subgraph-studio",
        message: out.slice(-2000),
        queryUrl: `https://api.studio.thegraph.com/query/<studio-id>/${slug}/v0.0.1`,
      };
    } catch (err) {
      return {
        projectPath,
        status: "deploy_failed",
        target: "subgraph-studio",
        message: (err as Error).message.slice(-2000),
        queryUrl: null,
      };
    }
  }

  return {
    projectPath,
    status: "generated",
    target: "disk",
    message:
      "Deployable subgraph project written to disk. Set GRAPH_NODE_URL (+IPFS_URL) to deploy to a local graph-node, or GRAPH_DEPLOY_KEY to publish to Subgraph Studio. ChainSentry's RPC ingester is already streaming this contract's data into ClickHouse.",
    queryUrl: null,
  };
}
