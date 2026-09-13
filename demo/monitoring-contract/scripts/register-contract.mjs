import "dotenv/config";
import { readFile } from "node:fs/promises";

const apiUrl = process.env.CHAINSENTRY_API_URL;
const address = process.env.CHAINSENTRY_CONTRACT_ADDRESS || process.env.VAULT_ADDRESS;

if (!apiUrl) throw new Error("CHAINSENTRY_API_URL is required");
if (!address) throw new Error("CHAINSENTRY_CONTRACT_ADDRESS or VAULT_ADDRESS is required");

const artifact = JSON.parse(
  await readFile("artifacts/contracts/SentryDemoVault.sol/SentryDemoVault.json", "utf8")
);

const res = await fetch(`${apiUrl.replace(/\/$/, "")}/contracts`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    address,
    environment: "testnet",
    prompt:
      "Monitor deposits, dependency call failures, incident markers, transaction volume, gas usage, and success rate.",
    abi: artifact.abi,
    sync: false
  })
});

const body = await res.text();
console.log(JSON.stringify({ ok: res.ok, status: res.status, body }, null, 2));
