const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = __dirname;
const isWin = process.platform === "win32";
const reload = !process.argv.includes("--no-reload");

const bin = isWin ? "python" : "python3";
const args = ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"];
if (reload) args.push("--reload");

const child = spawn(bin, args, {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
