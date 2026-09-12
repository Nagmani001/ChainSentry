import { env } from "./env.js";

export interface NotifyInput {
  channel: string;
  toEmail?: string | null;
  toPhone?: string | null;
  subject: string;
  message: string;
}

export async function notifyOnCall(input: NotifyInput): Promise<string> {
  if (input.channel === "email") return sendEmail(input);
  if (input.channel === "call") return sendCall(input);
  return "notification skipped";
}

async function sendEmail(input: NotifyInput): Promise<string> {
  if (!env.resendApiKey)
    return "email skipped: RESEND_API_KEY is not configured";
  if (!input.toEmail) return "email skipped: assignee has no email";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.alertFromEmail,
      to: input.toEmail,
      subject: input.subject,
      text: input.message,
    }),
  });
  if (!res.ok) return `email failed: HTTP ${res.status}`;
  return "email sent";
}

async function sendCall(input: NotifyInput): Promise<string> {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromPhone) {
    return "call skipped: Twilio is not configured";
  }
  if (!input.toPhone) return "call skipped: assignee has no phone";
  const params = new URLSearchParams({
    From: env.twilioFromPhone,
    To: input.toPhone,
    Twiml: `<Response><Say>${input.message}</Say></Response>`,
  });
  const auth = Buffer.from(
    `${env.twilioAccountSid}:${env.twilioAuthToken}`,
  ).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );
  if (!res.ok) return `call failed: HTTP ${res.status}`;
  return "call placed";
}
