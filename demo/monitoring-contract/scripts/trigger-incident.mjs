import hre from "hardhat";

const { ethers } = hre;
const vaultAddress = process.env.VAULT_ADDRESS;
const dependencyAddress = process.env.DEPENDENCY_ADDRESS;
const count = Number(process.env.TX_COUNT || 6);
const value = ethers.parseEther(process.env.DEPOSIT_ETH || "0.0001");

if (!vaultAddress) throw new Error("VAULT_ADDRESS is required");
if (!dependencyAddress) throw new Error("DEPENDENCY_ADDRESS is required");

const dependency = await ethers.getContractAt("DependencyProbe", dependencyAddress);
const vault = await ethers.getContractAt("SentryDemoVault", vaultAddress);

const modeTx = await dependency.setHealthy(false);
await modeTx.wait();
console.log(JSON.stringify({ kind: "dependency", healthy: false, tx: modeTx.hash }));

for (let i = 0; i < count; i += 1) {
  const correlationId = ethers.id(`incident-${Date.now()}-${i}`);
  const tx = await vault.depositAndProbe(correlationId, { value });
  const receipt = await tx.wait();
  console.log(
    JSON.stringify({
      kind: "incident",
      tx: receipt.hash,
      blockNumber: receipt.blockNumber,
      correlationId
    })
  );
}

try {
  const tx = await vault.forceRevert();
  await tx.wait();
} catch (err) {
  console.log(JSON.stringify({ kind: "expected-revert", message: err.shortMessage || err.message }));
}
