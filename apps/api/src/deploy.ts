import { execFile } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { Storage } from "@google-cloud/storage";
import type { Abi } from "viem";
import { env } from "./env.js";
import type { GeneratedConfig } from "./configgen.js";

const run = promisify(execFile);
const storage = new Storage(
  env.gcsProjectId ? { projectId: env.gcsProjectId } : undefined,
);

interface ArtifactUpload {
  bucket: string | null;
  prefix: string | null;
  manifestUrl: string | null;
}

export interface DeployResult {
  projectPath: string;
  status: "generated" | "deployed" | "deploy_failed";
  target: string;
  message: string;
  queryUrl: string | null;
  artifactBucket: string | null;
  artifactPrefix: string | null;
  artifactManifestUrl: string | null;
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

function publicUrl(bucket: string, key: string): string {
  if (env.gcsPublicBaseUrl) {
    return `${env.gcsPublicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
  return `gs://${bucket}/${key}`;
}

async function uploadArtifacts(input: DeployInput): Promise<ArtifactUpload> {
  if (!env.gcsSubgraphBucket) {
    return { bucket: null, prefix: null, manifestUrl: null };
  }
  const bucket = storage.bucket(env.gcsSubgraphBucket);
  const prefix = `subgraphs/${input.deploymentId}`;
  const files = [
    {
      name: "subgraph.yaml",
      content: input.config.subgraphYaml,
      contentType: "application/x-yaml",
    },
    {
      name: "schema.graphql",
      content: input.config.schemaGraphql,
      contentType: "application/graphql",
    },
    {
      name: "src/mapping.ts",
      content: input.config.mappingsTs,
      contentType: "application/typescript",
    },
    {
      name: `abis/${input.contractName}.json`,
      content: JSON.stringify(input.abi, null, 2),
      contentType: "application/json",
    },
    {
      name: "package.json",
      content: packageJson(input.contractName),
      contentType: "application/json",
    },
  ];
  const manifest = {
    deploymentId: input.deploymentId,
    contractName: input.contractName,
    network: input.network,
    generatedAt: new Date().toISOString(),
    files: files.map((file) => ({
      name: file.name,
      url: publicUrl(env.gcsSubgraphBucket, `${prefix}/${file.name}`),
    })),
  };
  await Promise.all([
    ...files.map((file) =>
      bucket.file(`${prefix}/${file.name}`).save(file.content, {
        contentType: file.contentType,
        resumable: false,
      }),
    ),
    bucket
      .file(`${prefix}/manifest.json`)
      .save(JSON.stringify(manifest, null, 2), {
        contentType: "application/json",
        resumable: false,
      }),
  ]);
  return {
    bucket: env.gcsSubgraphBucket,
    prefix,
    manifestUrl: publicUrl(env.gcsSubgraphBucket, `${prefix}/manifest.json`),
  };
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
  const artifact = await uploadArtifacts(input);
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
        artifactBucket: artifact.bucket,
        artifactPrefix: artifact.prefix,
        artifactManifestUrl: artifact.manifestUrl,
      };
    } catch (err) {
      return {
        projectPath,
        status: "deploy_failed",
        target: `graph-node:${env.graphNodeUrl}`,
        message: (err as Error).message.slice(-2000),
        queryUrl: null,
        artifactBucket: artifact.bucket,
        artifactPrefix: artifact.prefix,
        artifactManifestUrl: artifact.manifestUrl,
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
        artifactBucket: artifact.bucket,
        artifactPrefix: artifact.prefix,
        artifactManifestUrl: artifact.manifestUrl,
      };
    } catch (err) {
      return {
        projectPath,
        status: "deploy_failed",
        target: "subgraph-studio",
        message: (err as Error).message.slice(-2000),
        queryUrl: null,
        artifactBucket: artifact.bucket,
        artifactPrefix: artifact.prefix,
        artifactManifestUrl: artifact.manifestUrl,
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
    artifactBucket: artifact.bucket,
    artifactPrefix: artifact.prefix,
    artifactManifestUrl: artifact.manifestUrl,
  };
}
