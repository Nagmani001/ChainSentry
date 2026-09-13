import hre from "hardhat";

const { ethers } = hre;
const vaultAddress = process.env.VAULT_ADDRESS;
const count = Number(process.env.TX_COUNT || 2);
const value = ethers.parseEther(process.env.DEPOSIT_ETH || "0.0001");

if (!vaultAddress) throw new Error("VAULT_ADDRESS is required");

const vault = await ethers.getContractAt("SentryDemoVault", vaultAddress);

for (let i = 0; i < count; i += 1) {
  const correlationId = ethers.id(`normal-${Date.now()}-${i}`);
  const tx = await vault.depositAndProbe(correlationId, { value });
  const receipt = await tx.wait();
  console.log(
    JSON.stringify({
      kind: "normal",
      tx: receipt.hash,
      blockNumber: receipt.blockNumber,
      correlationId
    })
  );
}
