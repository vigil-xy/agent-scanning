import { pool } from "./pool.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const ddl = readFileSync(join(currentDir, "schema.sql"), "utf8");

export async function ensureSchema(): Promise<void> {
  await pool.query(ddl);
}
