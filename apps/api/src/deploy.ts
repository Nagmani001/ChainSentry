import { Storage } from "@google-cloud/storage";
import type { Abi } from "viem";
import { env } from "./env.js";
import type { GeneratedConfig } from "./configgen.js";

const gcsCredentials = env.gcsServiceAccountKeyBase64
  ? JSON.parse(Buffer.from(env.gcsServiceAccountKeyBase64, "base64").toString("utf8"))
  : env.gcsServiceAccountKey
    ? JSON.parse(env.gcsServiceAccountKey)
    : undefined;
const storage = new Storage({
  ...(env.gcsProjectId ? { projectId: env.gcsProjectId } : {}),
  ...(gcsCredentials ? { credentials: gcsCredentials } : {}),
});

interface ArtifactUpload {
  bucket: string | null;
  prefix: string | null;
  manifestUrl: string | null;
}

export interface DeployResult {
  projectPath: string | null;
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

interface SubgraphArtifactFile {
  name: string;
  content: string;
  contentType: string;
}

export interface StoredSubgraphConfig {
  subgraphYaml: string;
  schemaGraphql: string;
  mappingsTs: string;
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

function publicUrl(bucket: string, key: string): string {
  if (env.gcsPublicBaseUrl) {
    return `${env.gcsPublicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
  return `gs://${bucket}/${key}`;
}

function artifactFiles(input: DeployInput): SubgraphArtifactFile[] {
  return [
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
}

async function uploadArtifacts(input: DeployInput): Promise<ArtifactUpload> {
  if (!env.gcsSubgraphBucket) {
    throw new Error("GCS_SUBGRAPH_BUCKET is required for subgraph artifact storage.");
  }
  const bucket = storage.bucket(env.gcsSubgraphBucket);
  const prefix = `subgraphs/${input.deploymentId}`;
  const files = artifactFiles(input);
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

export async function getStoredSubgraphConfig(
  bucketName: string | null,
  prefix: string | null,
): Promise<StoredSubgraphConfig | null> {
  if (!bucketName || !prefix) return null;
  const bucket = storage.bucket(bucketName);
  const [subgraphYaml, schemaGraphql, mappingsTs] = await Promise.all([
    bucket.file(`${prefix}/subgraph.yaml`).download(),
    bucket.file(`${prefix}/schema.graphql`).download(),
    bucket.file(`${prefix}/src/mapping.ts`).download(),
  ]);
  return {
    subgraphYaml: subgraphYaml[0].toString("utf8"),
    schemaGraphql: schemaGraphql[0].toString("utf8"),
    mappingsTs: mappingsTs[0].toString("utf8"),
  };
}

export async function deploySubgraph(
  input: DeployInput,
): Promise<DeployResult> {
  const artifact = await uploadArtifacts(input);
  return {
    projectPath: null,
    status: "generated",
    target: "gcs",
    message: "Deployable subgraph project stored in Google Cloud Storage.",
    queryUrl: null,
    artifactBucket: artifact.bucket,
    artifactPrefix: artifact.prefix,
    artifactManifestUrl: artifact.manifestUrl,
  };
}
