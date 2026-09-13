import { mkdir, writeFile } from "node:fs/promises";
import hre from "hardhat";

const { ethers } = hre;

const dependencyFactory = await ethers.getContractFactory("DependencyProbe");
const dependency = await dependencyFactory.deploy();
await dependency.waitForDeployment();

const vaultFactory = await ethers.getContractFactory("SentryDemoVault");
const vault = await vaultFactory.deploy(await dependency.getAddress());
await vault.waitForDeployment();

const deployment = {
  network: hre.network.name,
  chainId: Number((await ethers.provider.getNetwork()).chainId),
  dependency: await dependency.getAddress(),
  vault: await vault.getAddress()
};

await mkdir("deployments", { recursive: true });
await writeFile(
  `deployments/${hre.network.name}.json`,
  `${JSON.stringify(deployment, null, 2)}\n`
);

console.log(JSON.stringify(deployment, null, 2));
