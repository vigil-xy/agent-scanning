import { config } from "../config.js";
import nodemailer from "nodemailer";

export interface AlertEvent {
  id: string;
  teamId: string | null;
  type: string;
  message: string;
  severity: string;
  channels: string[];
  createdAt: string;
}

type AlertSubscriber = (event: AlertEvent) => void;

const subscribers = new Set<AlertSubscriber>();

export function subscribeToAlerts(subscriber: AlertSubscriber): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function publishAlert(event: AlertEvent): void {
  for (const subscriber of subscribers) {
    subscriber(event);
  }
}

async function sendPagerDuty(event: AlertEvent): Promise<void> {
  if (!config.pagerDutyRoutingKey) {
    return;
  }

  const severityMap: Record<string, "critical" | "error" | "warning" | "info"> = {
    critical: "critical",
    high: "error",
    medium: "warning",
    low: "info",
  };

  const severity = severityMap[event.severity.toLowerCase()] ?? "error";

  const response = await fetch(config.pagerDutyApiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      routing_key: config.pagerDutyRoutingKey,
      event_action: "trigger",
      dedup_key: `agent-ops-${event.id}`,
      payload: {
        summary: `[${event.type}] ${event.message}`,
        severity,
        source: config.pagerDutySource,
        component: "agent-orchestration",
        group: event.teamId ?? "global",
        class: "policy-governance",
        custom_details: {
          alertId: event.id,
          createdAt: event.createdAt,
          channels: event.channels,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`PagerDuty request failed with ${response.status}`);
  }
}

async function sendEmail(event: AlertEvent): Promise<void> {
  if (!config.smtpHost || !config.alertEmailFrom || !config.alertEmailTo) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser && config.smtpPass ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });

  await transporter.sendMail({
    from: config.alertEmailFrom,
    to: config.alertEmailTo,
    subject: `AgentOps [${event.severity.toUpperCase()}] ${event.type}`,
    text: `${event.message}\n\nAlert ID: ${event.id}\nTeam: ${event.teamId ?? "global"}\nCreated: ${event.createdAt}`,
  });
}

export async function notifyChannels(event: AlertEvent): Promise<void> {
  if (event.channels.includes("slack") && config.slackWebhookUrl) {
    await fetch(config.slackWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `[${event.severity.toUpperCase()}] ${event.message}`,
      }),
    }).catch(() => undefined);
  }

  if (event.channels.includes("pagerduty") && config.pagerDutyRoutingKey) {
    await sendPagerDuty(event).catch((error) => {
      console.error("PagerDuty delivery failed", error);
    });
  }

  if (event.channels.includes("email") && config.alertEmailTo) {
    await sendEmail(event).catch((error) => {
      console.error("Email delivery failed", error);
    });
  }
}
