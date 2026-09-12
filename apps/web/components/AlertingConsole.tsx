"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { api } from "../lib/api";
import type {
  AlertingContext,
  AlertIssue,
  AlertRule,
  Contract,
  OnCallSlot,
  Organization,
  OrgAlertingData,
} from "../lib/types";
import { Icon } from "./Icon";

const METRICS = [
  { value: "event_count", label: "Event count" },
  { value: "tx_count", label: "Transaction count" },
  { value: "success_rate", label: "Success rate" },
  { value: "avg_gas", label: "Average gas" },
  { value: "total_value_eth", label: "Value moved" },
];

const OPERATORS = [">", ">=", "<", "<=", "="];

function privyIdentity(user: unknown) {
  const u = user as {
    id?: string;
    email?: { address?: string };
    phone?: { number?: string };
    wallet?: { address?: string };
  } | null;
  return {
    privyId: u?.id ?? "",
    email: u?.email?.address ?? null,
    phone: u?.phone?.number ?? null,
    name: u?.email?.address ?? u?.wallet?.address ?? null,
  };
}

function dtLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function shortId(value: string | null | undefined) {
  if (!value) return "unassigned";
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function issueTone(status: string) {
  if (status === "verified") return "ok";
  if (status === "resolved") return "warn";
  return "bad";
}

export function AlertingConsole({ mode }: { mode: "alerts" | "issues" }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const identity = useMemo(() => privyIdentity(user), [user]);
  const [context, setContext] = useState<AlertingContext | null>(null);
  const [orgId, setOrgId] = useState("");
  const [orgData, setOrgData] = useState<OrgAlertingData>({
    rules: [],
    slots: [],
    issues: [],
  });
  const [orgName, setOrgName] = useState("Protocol Ops");
  const [joinId, setJoinId] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rule, setRule] = useState({
    name: "",
    contractId: "",
    metric: "total_value_eth",
    operator: ">",
    threshold: "",
    windowMin: "15",
    channel: "email" as "email" | "call",
  });
  const [slot, setSlot] = useState({ userId: "", startsAt: "", endsAt: "" });
  const [verify, setVerify] = useState({ incentiveWei: "", incentiveTx: "" });

  const activeOrg = useMemo(
    () => context?.orgs.find((o) => o.id === orgId) ?? null,
    [context, orgId],
  );
  const owner = activeOrg?.ownerUserId === context?.user?.id;

  const load = useCallback(async () => {
    if (!identity.privyId) return;
    await api.syncUser(identity);
    const next = await api.alertingContext(identity.privyId);
    setContext(next);
    const nextOrgId = orgId || next.orgs[0]?.id || "";
    setOrgId(nextOrgId);
    if (nextOrgId) {
      const data = await api.orgAlerting(nextOrgId, identity.privyId);
      setOrgData(data);
      setSlot((s) => ({
        ...s,
        userId:
          s.userId ||
          next.orgs.find((o) => o.id === nextOrgId)?.members[0]?.user.id ||
          "",
      }));
    }
  }, [identity, orgId]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (!slot.startsAt || !slot.endsAt) {
      const start = new Date(Date.now() - 5 * 60_000);
      const end = new Date(Date.now() + 8 * 60 * 60_000);
      setSlot((s) => ({
        ...s,
        startsAt: dtLocal(start),
        endsAt: dtLocal(end),
      }));
    }
    load().catch((e) => setBanner((e as Error).message));
  }, [ready, authenticated, load, slot.startsAt, slot.endsAt]);

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setBanner(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setBanner((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const createOrg = () =>
    withBusy(async () => {
      await api.createOrg(identity.privyId, orgName.trim());
    });

  const joinOrg = () =>
    withBusy(async () => {
      await api.joinOrg(identity.privyId, joinId.trim());
    });

  const createRule = () =>
    withBusy(async () => {
      await api.createAlertRule(orgId, {
        privyId: identity.privyId,
        contractId: rule.contractId || null,
        name: rule.name.trim(),
        metric: rule.metric,
        operator: rule.operator,
        threshold: Number(rule.threshold),
        windowMin: Number(rule.windowMin),
        channel: rule.channel,
      });
    });

  const createSlot = () =>
    withBusy(async () => {
      await api.createOnCallSlot(orgId, {
        privyId: identity.privyId,
        userId: slot.userId,
        startsAt: new Date(slot.startsAt).toISOString(),
        endsAt: new Date(slot.endsAt).toISOString(),
      });
    });

  const evaluate = (id: string) =>
    withBusy(async () => {
      const res = await api.evaluateAlert(id, identity.privyId);
      setBanner(
        res.triggered
          ? `Alert triggered at ${res.value}. ${res.notification ?? ""}`
          : `No alert. Current value is ${res.value}.`,
      );
    });

  const resolve = (id: string) =>
    withBusy(async () => {
      await api.resolveIssue(id, identity.privyId);
    });

  const verifyIssue = (id: string) =>
    withBusy(async () => {
      await api.verifyIssue(id, {
        privyId: identity.privyId,
        incentiveWei: verify.incentiveWei || undefined,
        incentiveTx: verify.incentiveTx || undefined,
      });
    });

  if (!ready) return <div className="panel-loading">Loading auth…</div>;

  if (!authenticated) {
    return (
      <div className="alert-page auth-gate">
        <section className="alert-hero">
          <div>
            <h1>{mode === "alerts" ? "Alerting" : "Issues"}</h1>
            <p>
              Sign in with Privy to create an org, assign on-call engineers, and
              route alerts to the current responder.
            </p>
          </div>
          <button className="btn primary lg" onClick={login}>
            Sign in with Privy
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="alert-page">
      <section className="alert-hero">
        <div>
          <h1>{mode === "alerts" ? "Alerting" : "Issues"}</h1>
          <p>
            Org-scoped alert rules evaluate Graph-indexed telemetry and notify
            the active on-call engineer by email or phone.
          </p>
        </div>
        <div className="alert-hero-actions">
          <span className="mono auth-id">{shortId(identity.privyId)}</span>
          <button className="btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </section>

      {banner ? <div className="alert-banner">{banner}</div> : null}

      <section className="alert-grid org-grid">
        <div className="alert-panel org-panel">
          <div className="alert-panel-head">
            <h2>Organization</h2>
            <span className="alert-count">{context?.orgs.length ?? 0}</span>
          </div>
          {context?.orgs.length ? (
            <div className="form-field compact">
              <label className="form-label">Active org</label>
              <select
                className="select"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                {context.orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <div className="form-help mono">{orgId}</div>
            </div>
          ) : (
            <div className="alert-empty">
              Create or join an org to unlock alerts.
            </div>
          )}
          <div className="org-actions">
            <input
              className="input"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Org name"
            />
            <button className="btn primary" disabled={busy} onClick={createOrg}>
              Create org
            </button>
            <input
              className="input mono"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="Org id"
            />
            <button
              className="btn"
              disabled={busy || !joinId.trim()}
              onClick={joinOrg}
            >
              Join org
            </button>
          </div>
        </div>

        <div className="alert-panel roster-panel">
          <div className="alert-panel-head">
            <h2>Members</h2>
            <span className={`state-pill ${owner ? "ok" : ""}`}>
              {owner ? "owner" : "member"}
            </span>
          </div>
          <div className="member-list">
            {activeOrg?.members.map((m) => (
              <div className="member-row" key={m.id}>
                <span className="nav-avatar">
                  <Icon name="user" size={14} />
                </span>
                <span>
                  {m.user.name ?? m.user.email ?? shortId(m.user.privyId)}
                </span>
                <span className="state-pill">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {mode === "alerts" ? (
        <AlertsMode
          orgId={orgId}
          contracts={context?.contracts ?? []}
          org={activeOrg}
          rules={orgData.rules}
          slots={orgData.slots}
          slot={slot}
          setSlot={setSlot}
          rule={rule}
          setRule={setRule}
          busy={busy}
          createRule={createRule}
          createSlot={createSlot}
          evaluate={evaluate}
        />
      ) : (
        <IssuesMode
          issues={orgData.issues}
          owner={owner}
          busy={busy}
          verify={verify}
          setVerify={setVerify}
          resolve={resolve}
          verifyIssue={verifyIssue}
        />
      )}
    </div>
  );
}

function AlertsMode(props: {
  orgId: string;
  contracts: Contract[];
  org: Organization | null;
  rules: AlertRule[];
  slots: OnCallSlot[];
  slot: { userId: string; startsAt: string; endsAt: string };
  setSlot: (slot: { userId: string; startsAt: string; endsAt: string }) => void;
  rule: {
    name: string;
    contractId: string;
    metric: string;
    operator: string;
    threshold: string;
    windowMin: string;
    channel: "email" | "call";
  };
  setRule: (rule: {
    name: string;
    contractId: string;
    metric: string;
    operator: string;
    threshold: string;
    windowMin: string;
    channel: "email" | "call";
  }) => void;
  busy: boolean;
  createRule: () => void;
  createSlot: () => void;
  evaluate: (id: string) => void;
}) {
  return (
    <section className="alert-grid main-alert-grid">
      <div className="alert-panel rule-builder">
        <div className="alert-panel-head">
          <h2>Rule builder</h2>
          <span className="state-pill ok">Graph data</span>
        </div>
        <div className="rule-form">
          <input
            className="input"
            value={props.rule.name}
            onChange={(e) =>
              props.setRule({ ...props.rule, name: e.target.value })
            }
            placeholder="Rule name"
            disabled={!props.orgId}
          />
          <select
            className="select"
            value={props.rule.contractId}
            onChange={(e) =>
              props.setRule({ ...props.rule, contractId: e.target.value })
            }
            disabled={!props.orgId}
          >
            <option value="">Select contract</option>
            {props.contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.address}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={props.rule.metric}
            onChange={(e) =>
              props.setRule({ ...props.rule, metric: e.target.value })
            }
          >
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="rule-threshold-row">
            <select
              className="select"
              value={props.rule.operator}
              onChange={(e) =>
                props.setRule({ ...props.rule, operator: e.target.value })
              }
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              className="input mono"
              value={props.rule.threshold}
              onChange={(e) =>
                props.setRule({ ...props.rule, threshold: e.target.value })
              }
            />
            <input
              className="input mono"
              value={props.rule.windowMin}
              onChange={(e) =>
                props.setRule({ ...props.rule, windowMin: e.target.value })
              }
            />
          </div>
          <div className="seg-tabs inline-tabs">
            <button
              className={props.rule.channel === "email" ? "active" : ""}
              onClick={() => props.setRule({ ...props.rule, channel: "email" })}
            >
              Email
            </button>
            <button
              className={props.rule.channel === "call" ? "active" : ""}
              onClick={() => props.setRule({ ...props.rule, channel: "call" })}
            >
              Phone call
            </button>
          </div>
          <button
            className="btn primary"
            disabled={
              props.busy ||
              !props.orgId ||
              !props.rule.name.trim() ||
              !props.rule.contractId ||
              !props.rule.threshold.trim()
            }
            onClick={props.createRule}
          >
            Create alert rule
          </button>
        </div>
      </div>

      <div className="alert-panel oncall-builder">
        <div className="alert-panel-head">
          <h2>On-call schedule</h2>
          <span className="alert-count">{props.slots.length}</span>
        </div>
        <div className="rule-form">
          <select
            className="select"
            value={props.slot.userId}
            onChange={(e) =>
              props.setSlot({ ...props.slot, userId: e.target.value })
            }
            disabled={!props.orgId}
          >
            <option value="">Select engineer</option>
            {props.org?.members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name ?? m.user.email ?? m.user.privyId}
              </option>
            ))}
          </select>
          <input
            className="input mono"
            type="datetime-local"
            value={props.slot.startsAt}
            onChange={(e) =>
              props.setSlot({ ...props.slot, startsAt: e.target.value })
            }
          />
          <input
            className="input mono"
            type="datetime-local"
            value={props.slot.endsAt}
            onChange={(e) =>
              props.setSlot({ ...props.slot, endsAt: e.target.value })
            }
          />
          <button
            className="btn"
            disabled={props.busy || !props.slot.userId}
            onClick={props.createSlot}
          >
            Assign on-call slot
          </button>
        </div>
        <div className="schedule-list">
          {props.slots.map((s) => (
            <div className="schedule-row" key={s.id}>
              <span>
                {s.user.name ?? s.user.email ?? shortId(s.user.privyId)}
              </span>
              <span className="mono">
                {new Date(s.startsAt).toLocaleString()} →{" "}
                {new Date(s.endsAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="alert-panel rules-table-panel">
        <div className="alert-panel-head">
          <h2>Rules</h2>
          <span className="alert-count">{props.rules.length}</span>
        </div>
        <div className="alert-table">
          {props.rules.map((r) => (
            <div className="alert-table-row" key={r.id}>
              <span>{r.name}</span>
              <span className="mono">
                {r.metric} {r.operator} {r.threshold}
              </span>
              <span>{r.channel}</span>
              <button
                className="btn"
                disabled={props.busy}
                onClick={() => props.evaluate(r.id)}
              >
                Evaluate now
              </button>
            </div>
          ))}
          {props.rules.length === 0 ? (
            <div className="alert-empty">No alert rules yet.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function IssuesMode(props: {
  issues: AlertIssue[];
  owner: boolean;
  busy: boolean;
  verify: { incentiveWei: string; incentiveTx: string };
  setVerify: (verify: { incentiveWei: string; incentiveTx: string }) => void;
  resolve: (id: string) => void;
  verifyIssue: (id: string) => void;
}) {
  return (
    <section className="alert-panel issues-panel">
      <div className="alert-panel-head">
        <h2>Issue queue</h2>
        <span className="alert-count">{props.issues.length}</span>
      </div>
      <div className="issues-list">
        {props.issues.map((issue) => (
          <div className="issue-row" key={issue.id}>
            <div className="issue-main">
              <span className={`state-pill ${issueTone(issue.status)}`}>
                {issue.status}
              </span>
              <strong>{issue.message}</strong>
              <span className="mono">
                observed {issue.observedValue} / threshold {issue.threshold}
              </span>
              <span>
                Assignee:{" "}
                {issue.assignee?.name ??
                  issue.assignee?.email ??
                  shortId(issue.assignee?.privyId)}
              </span>
            </div>
            <div className="issue-actions">
              {issue.status === "open" ? (
                <button
                  className="btn primary"
                  disabled={props.busy}
                  onClick={() => props.resolve(issue.id)}
                >
                  Resolve
                </button>
              ) : null}
              {issue.status === "resolved" && props.owner ? (
                <div className="verify-actions">
                  <input
                    className="input mono"
                    placeholder="incentive wei"
                    value={props.verify.incentiveWei}
                    onChange={(e) =>
                      props.setVerify({
                        ...props.verify,
                        incentiveWei: e.target.value,
                      })
                    }
                  />
                  <input
                    className="input mono"
                    placeholder="tx hash optional"
                    value={props.verify.incentiveTx}
                    onChange={(e) =>
                      props.setVerify({
                        ...props.verify,
                        incentiveTx: e.target.value,
                      })
                    }
                  />
                  <button
                    className="btn primary"
                    disabled={props.busy}
                    onClick={() => props.verifyIssue(issue.id)}
                  >
                    Verify fix
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {props.issues.length === 0 ? (
          <div className="alert-empty">
            No open issues. Alert triggers will appear here.
          </div>
        ) : null}
      </div>
    </section>
  );
}
