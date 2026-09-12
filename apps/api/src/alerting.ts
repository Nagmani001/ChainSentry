import { z } from "zod";
import { prisma } from "./clients.js";
import { runReadOnlyQuery } from "./rawQuery.js";
import { notifyOnCall } from "./notifications.js";

export const userSchema = z.object({
  privyId: z.string().min(1),
  email: z.string().email().optional().nullable(),
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export const createOrgSchema = z.object({
  privyId: z.string().min(1),
  name: z.string().min(2),
});

export const joinOrgSchema = z.object({
  privyId: z.string().min(1),
  orgId: z.string().min(1),
});

export const createSlotSchema = z.object({
  privyId: z.string().min(1),
  userId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export const createRuleSchema = z.object({
  privyId: z.string().min(1),
  contractId: z.string().optional().nullable(),
  name: z.string().min(2),
  metric: z.enum([
    "event_count",
    "tx_count",
    "success_rate",
    "avg_gas",
    "total_value_eth",
  ]),
  operator: z.enum([">", ">=", "<", "<=", "="]),
  threshold: z.number(),
  windowMin: z.number().int().positive().max(1440).default(15),
  channel: z.enum(["email", "call"]),
});

export const issueActionSchema = z.object({
  privyId: z.string().min(1),
  incentiveWei: z.string().optional(),
  incentiveTx: z.string().optional(),
});

export type PrismaClientLike = typeof prisma;

async function userByPrivy(privyId: string) {
  return prisma.user.findUnique({ where: { privyId } });
}

export async function syncUser(input: z.infer<typeof userSchema>) {
  return prisma.user.upsert({
    where: { privyId: input.privyId },
    create: {
      privyId: input.privyId,
      email: input.email ?? null,
      name: input.name ?? null,
      phone: input.phone ?? null,
    },
    update: {
      email: input.email ?? null,
      name: input.name ?? null,
      phone: input.phone ?? null,
    },
  });
}

export async function createOrg(input: z.infer<typeof createOrgSchema>) {
  const user = await userByPrivy(input.privyId);
  if (!user) throw new Error("user not found");
  return prisma.organization.create({
    data: {
      name: input.name,
      ownerUserId: user.id,
      members: { create: { userId: user.id, role: "owner" } },
    },
    include: { owner: true, members: { include: { user: true } } },
  });
}

export async function joinOrg(input: z.infer<typeof joinOrgSchema>) {
  const user = await userByPrivy(input.privyId);
  if (!user) throw new Error("user not found");
  return prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: input.orgId, userId: user.id } },
    create: { orgId: input.orgId, userId: user.id, role: "member" },
    update: {},
    include: { org: true, user: true },
  });
}

export async function getAlertingContext(privyId: string): Promise<any> {
  const user = await userByPrivy(privyId);
  if (!user) return { user: null, orgs: [], contracts: [] };
  const [orgs, contracts] = await Promise.all([
    prisma.organization.findMany({
      where: { members: { some: { userId: user.id } } },
      include: {
        owner: true,
        members: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contract.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return { user, orgs, contracts };
}

async function membership(orgId: string, privyId: string) {
  const user = await userByPrivy(privyId);
  if (!user) throw new Error("user not found");
  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.id } },
    include: { org: true, user: true },
  });
  if (!member) throw new Error("user is not a member of this org");
  return member;
}

export async function listOrgData(
  orgId: string,
  privyId: string,
): Promise<any> {
  await membership(orgId, privyId);
  const [rules, slots, issues] = await Promise.all([
    prisma.alertRule.findMany({
      where: { orgId },
      include: { contract: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.onCallSlot.findMany({
      where: { orgId },
      include: { user: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.alertIssue.findMany({
      where: { orgId },
      include: {
        rule: true,
        assignee: true,
        resolvedBy: true,
        verifiedBy: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { rules, slots, issues };
}

export async function createOnCallSlot(
  orgId: string,
  input: z.infer<typeof createSlotSchema>,
) {
  await membership(orgId, input.privyId);
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (endsAt <= startsAt)
    throw new Error("on-call slot must end after it starts");
  return prisma.onCallSlot.create({
    data: { orgId, userId: input.userId, startsAt, endsAt },
    include: { user: true },
  });
}

export async function createAlertRule(
  orgId: string,
  input: z.infer<typeof createRuleSchema>,
): Promise<any> {
  const member = await membership(orgId, input.privyId);
  return prisma.alertRule.create({
    data: {
      orgId,
      contractId: input.contractId ?? null,
      createdById: member.userId,
      name: input.name,
      metric: input.metric,
      operator: input.operator,
      threshold: input.threshold,
      windowMin: input.windowMin,
      channel: input.channel,
    },
    include: { contract: true },
  });
}

function compare(value: number, operator: string, threshold: number): boolean {
  if (operator === ">") return value > threshold;
  if (operator === ">=") return value >= threshold;
  if (operator === "<") return value < threshold;
  if (operator === "<=") return value <= threshold;
  return value === threshold;
}

function metricSql(metric: string): string {
  if (metric === "event_count")
    return "SELECT count() AS value FROM events FINAL WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32} AND block_timestamp >= now() - INTERVAL {window:UInt32} MINUTE";
  if (metric === "success_rate")
    return "SELECT round(countIf(status = 1) / greatest(count(), 1) * 100, 2) AS value FROM transactions FINAL WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32} AND block_timestamp >= now() - INTERVAL {window:UInt32} MINUTE";
  if (metric === "avg_gas")
    return "SELECT round(avg(gas_used), 2) AS value FROM transactions FINAL WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32} AND block_timestamp >= now() - INTERVAL {window:UInt32} MINUTE";
  if (metric === "total_value_eth")
    return "SELECT sum(toUInt256OrZero(value)) / 1e18 AS value FROM transactions FINAL WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32} AND block_timestamp >= now() - INTERVAL {window:UInt32} MINUTE";
  return "SELECT count() AS value FROM transactions FINAL WHERE contract_address = {addr:String} AND chain_id = {chain:UInt32} AND block_timestamp >= now() - INTERVAL {window:UInt32} MINUTE";
}

async function currentOnCall(orgId: string) {
  const now = new Date();
  return prisma.onCallSlot.findFirst({
    where: { orgId, startsAt: { lte: now }, endsAt: { gte: now } },
    include: { user: true },
    orderBy: { startsAt: "asc" },
  });
}

export async function evaluateAlertRule(ruleId: string, privyId: string) {
  const rule = await prisma.alertRule.findUnique({
    where: { id: ruleId },
    include: { contract: true, org: true },
  });
  if (!rule) throw new Error("alert rule not found");
  await membership(rule.orgId, privyId);
  if (!rule.active) throw new Error("alert rule is disabled");
  if (!rule.contract) throw new Error("alert rule needs a contract");
  const result = await runReadOnlyQuery(metricSql(rule.metric), {
    addr: rule.contract.address,
    chain: rule.contract.chainId,
    window: rule.windowMin,
  });
  const value = Number(result.rows[0]?.value ?? 0);
  const triggered = compare(value, rule.operator, rule.threshold);
  if (!triggered) return { triggered: false, value };
  const existing = await prisma.alertIssue.findFirst({
    where: { ruleId: rule.id, status: { in: ["open", "resolved"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { triggered: true, value, issue: existing };
  const slot = await currentOnCall(rule.orgId);
  const message = `${rule.name}: ${rule.metric} is ${value} ${rule.operator} ${rule.threshold}`;
  const issue = await prisma.alertIssue.create({
    data: {
      orgId: rule.orgId,
      ruleId: rule.id,
      assigneeId: slot?.userId ?? null,
      observedValue: value,
      threshold: rule.threshold,
      message,
    },
    include: { rule: true, assignee: true },
  });
  const notification = await notifyOnCall({
    channel: rule.channel,
    toEmail: slot?.user.email,
    toPhone: slot?.user.phone,
    subject: `ChainSentry alert: ${rule.name}`,
    message,
  });
  return { triggered: true, value, issue, notification };
}

export async function resolveIssue(
  issueId: string,
  input: z.infer<typeof issueActionSchema>,
) {
  const issue = await prisma.alertIssue.findUnique({ where: { id: issueId } });
  if (!issue) throw new Error("issue not found");
  const member = await membership(issue.orgId, input.privyId);
  return prisma.alertIssue.update({
    where: { id: issueId },
    data: {
      status: "resolved",
      resolvedById: member.userId,
      resolvedAt: new Date(),
    },
    include: { rule: true, assignee: true, resolvedBy: true, verifiedBy: true },
  });
}

export async function verifyIssue(
  issueId: string,
  input: z.infer<typeof issueActionSchema>,
) {
  const issue = await prisma.alertIssue.findUnique({
    where: { id: issueId },
    include: { org: true },
  });
  if (!issue) throw new Error("issue not found");
  const member = await membership(issue.orgId, input.privyId);
  if (issue.org.ownerUserId !== member.userId) {
    throw new Error("only the org owner can verify and release incentives");
  }
  return prisma.alertIssue.update({
    where: { id: issueId },
    data: {
      status: "verified",
      verifiedById: member.userId,
      verifiedAt: new Date(),
      incentiveWei: input.incentiveWei ?? null,
      incentiveTx: input.incentiveTx ?? null,
    },
    include: { rule: true, assignee: true, resolvedBy: true, verifiedBy: true },
  });
}
