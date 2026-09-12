import { PrivyClient } from "@privy-io/server-auth";
import type { Request } from "express";
import { env } from "./env.js";

let privy: PrivyClient | null = null;

function client(): PrivyClient {
  if (!env.privyAppId || !env.privyAppSecret) {
    throw new Error("Privy server auth is not configured.");
  }
  if (!privy) privy = new PrivyClient(env.privyAppId, env.privyAppSecret);
  return privy;
}

export async function requirePrivyUser(req: Request): Promise<string> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    throw new Error("Privy sign-in required.");
  const token = header.replace(/^Bearer\s+/, "").trim();
  const claims = await client().verifyAuthToken(token);
  return claims.userId;
}
