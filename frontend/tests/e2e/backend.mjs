// Starts the API for the e2e run on port 8001 against a fresh `orderops_e2e` database, so dev data is never touched.
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const backend = fileURLToPath(new URL("../../../backend", import.meta.url));
const venv = join(backend, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const python = existsSync(venv) ? venv : process.platform === "win32" ? "python" : "python3";

const databaseUrl = execFileSync(python, ["-m", "scripts.reset_test_db", "orderops_e2e"], { cwd: backend, encoding: "utf8" }).trim();
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  SECRET_KEY: "e2e-secret-key-that-is-at-least-32-characters",
  ADMIN_EMAIL: "admin@e2e.local",
  ADMIN_PASSWORD: "e2e-admin-password",
};
const api = spawn(python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"], { cwd: backend, env, stdio: "inherit" });
api.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => api.kill(signal));
