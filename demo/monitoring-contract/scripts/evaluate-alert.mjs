import "dotenv/config";

const apiUrl = process.env.CHAINSENTRY_API_URL;
const token = process.env.CHAINSENTRY_PRIVY_TOKEN;
const ruleId = process.env.CHAINSENTRY_ALERT_RULE_ID;

if (!apiUrl) throw new Error("CHAINSENTRY_API_URL is required");
if (!token) throw new Error("CHAINSENTRY_PRIVY_TOKEN is required");
if (!ruleId) throw new Error("CHAINSENTRY_ALERT_RULE_ID is required");

const res = await fetch(`${apiUrl.replace(/\/$/, "")}/alerts/${ruleId}/evaluate`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: "{}"
});

const body = await res.text();
console.log(JSON.stringify({ ok: res.ok, status: res.status, body }, null, 2));
