import { execFile } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
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
    writeFile(
      join(projectPath, "package.json"),
      packageJson(input.contractName),
    ),
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

async function installDeps(projectPath: string): Promise<void> {
  try {
    await access(join(projectPath, "node_modules"));
    return;
  } catch {}
  await run("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts"], {
    cwd: projectPath,
    timeout: 300000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

export async function deploySubgraph(
  input: DeployInput,
): Promise<DeployResult> {
  const projectPath = await writeProject(input);
  const slug =
    env.graphSubgraphSlug ||
    `${input.contractName.toLowerCase()}-${input.network}`;

  if (env.graphNodeUrl) {
    const ipfs = env.ipfsUrl || "http://localhost:5001";
    try {
      await installDeps(projectPath);
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
        env.graphVersionLabel,
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
      await installDeps(projectPath);
      await graph(projectPath, ["codegen"]);
      await graph(projectPath, ["build"]);
      const out = await graph(projectPath, [
        "deploy",
        slug,
        "--deploy-key",
        env.graphDeployKey,
        "--version-label",
        `${env.graphVersionLabel}-${Math.floor(Date.now() / 1000)}`,
      ]);
      const queryUrl = env.graphStudioId
        ? `https://api.studio.thegraph.com/query/${env.graphStudioId}/${slug}/version/latest`
        : null;
      return {
        projectPath,
        status: "deployed",
        target: "subgraph-studio",
        message: out.slice(-2000),
        queryUrl,
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
      "Deployable subgraph project written to disk. Set GRAPH_NODE_URL (+IPFS_URL) or GRAPH_DEPLOY_KEY to deploy it, then ChainSentry will ingest blockchain data from the subgraph query endpoint into ClickHouse.",
    queryUrl: null,
  };
}
