import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { ensureSchema } from "./db/schema.js";
import apiRouter from "./routes/api.js";

async function startServer(): Promise<void> {
  await ensureSchema();

  const app = express();

  app.use(
    cors({
      origin: config.allowedOrigin,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "agent-ops-api" });
  });

  app.use("/api", apiRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(config.port, () => {
    console.log(`AgentOps API listening on http://localhost:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API server", error);
  console.error("\nTroubleshooting:");
  console.error("1) Ensure PostgreSQL is running: docker compose up -d postgres");
  console.error("2) Ensure Docker daemon is running (Docker Desktop)");
  console.error("3) Check DATABASE_URL in apps/api/.env");
  process.exit(1);
});
