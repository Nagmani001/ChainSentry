-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('devnet', 'testnet', 'mainnet');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'generating', 'deploying', 'indexing', 'live', 'failed');

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "environment" "Environment" NOT NULL,
    "name" TEXT,
    "abi" JSONB NOT NULL,
    "deployBlock" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "subgraphYaml" TEXT NOT NULL,
    "schemaGraphql" TEXT NOT NULL,
    "mappingsTs" TEXT NOT NULL,
    "eventNames" TEXT[],
    "projectPath" TEXT,
    "deployStatus" TEXT,
    "deployTarget" TEXT,
    "deployMessage" TEXT,
    "queryUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'metrics',
    "contractId" TEXT,
    "spec" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionJob" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "deploymentId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "startBlock" BIGINT NOT NULL,
    "lastIndexedBlock" BIGINT,
    "targetBlock" BIGINT,
    "eventsIngested" INTEGER NOT NULL DEFAULT 0,
    "txIngested" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contract_address_chainId_key" ON "Contract"("address", "chainId");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_slug_key" ON "Dashboard"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionJob_deploymentId_key" ON "IngestionJob"("deploymentId");

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
