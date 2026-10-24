#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const channel =
  args[0] === "beta" || args[0] === "development" ? args.shift() : null;

async function main() {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: path.join(__dirname, "..", "vite.config.mjs"),
  });
  await server.listen();
  server.printUrls();

  const url = server.resolvedUrls ? server.resolvedUrls.local[0] : null;
  const env = { ...process.env };
  if (channel) env.OHMYCHANNEL_CHANNEL = channel;
  if (url) env.VITE_DEV_SERVER_URL = url;

  const cli = path.join(
    __dirname,
    "..",
    "node_modules",
    "electronmon",
    "bin",
    "cli.js"
  );

  const child = spawn(process.execPath, [cli, ".", ...args], {
    stdio: "inherit",
    env,
  });

  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    try {
      await server.close();
    } catch {
      /* ignore */
    }
  };

  child.on("exit", async (code) => {
    await close();
    process.exit(code ?? 0);
  });

  process.on("SIGINT", async () => {
    child.kill();
    await close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    child.kill();
    await close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
