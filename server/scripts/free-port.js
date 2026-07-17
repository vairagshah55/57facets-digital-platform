/* Free the dev server port before nodemon starts, so a leftover/orphaned
   instance never causes EADDRINUSE. Wired as the npm "predev" hook.
   Best-effort and cross-platform (Windows / macOS / Linux); never throws. */
const { execSync } = require("child_process");

// Must match how src/index.js resolves PORT, or we free the wrong port.
require("dotenv").config({ path: __dirname + "/../.env" });

const PORT = process.env.PORT || 5000;

function pidsOnPort(port) {
  const pids = new Set();
  try {
    if (process.platform === "win32") {
      const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
      for (const line of out.split("\n")) {
        if (line.includes(`:${port} `) && /LISTENING/i.test(line)) {
          const pid = line.trim().split(/\s+/).pop();
          if (pid && pid !== "0") pids.add(pid);
        }
      }
    } else {
      const out = execSync(`lsof -ti tcp:${port} || true`, { encoding: "utf8" });
      out.split("\n").map((s) => s.trim()).filter(Boolean).forEach((p) => pids.add(p));
    }
  } catch {
    /* netstat/lsof unavailable — nothing we can do, let nodemon try. */
  }
  return [...pids];
}

const pids = pidsOnPort(PORT);
for (const pid of pids) {
  try {
    execSync(process.platform === "win32" ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`, { stdio: "ignore" });
    console.log(`[free-port] freed port ${PORT} (killed PID ${pid})`);
  } catch {
    /* already gone / no permission — ignore */
  }
}
if (!pids.length) console.log(`[free-port] port ${PORT} is free`);
