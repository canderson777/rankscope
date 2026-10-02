/**
 * Runs the API server and Vite together, so `npm run dev` stays one command.
 * Avoids adding concurrently/npm-run-all as a dependency.
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

const children = [];

function run(name, command, args) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: isWindows, // npm/npx resolve through the shell on Windows
  });
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n[dev] ${name} exited with code ${code} — shutting down.`);
      shutdown(code);
    }
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("api", process.execPath, [`"${join(ROOT, "server", "index.mjs")}"`]);
run("vite", isWindows ? "npx.cmd" : "npx", ["vite"]);
