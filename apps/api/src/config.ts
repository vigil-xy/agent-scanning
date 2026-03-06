import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/agent_ops",
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  pagerDutyApiUrl: process.env.PAGERDUTY_API_URL ?? "https://events.pagerduty.com/v2/enqueue",
  pagerDutyRoutingKey: process.env.PAGERDUTY_ROUTING_KEY,
  pagerDutySource: process.env.PAGERDUTY_SOURCE ?? "agent-ops-platform",
  alertEmailTo: process.env.ALERT_EMAIL_TO,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  alertEmailFrom: process.env.ALERT_EMAIL_FROM,
};
