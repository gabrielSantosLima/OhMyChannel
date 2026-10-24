#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const channel = process.argv[2];
const env = { ...process.env };

if (channel === "beta" || channel === "development") {
  env.OHMYCHANNEL_CHANNEL = channel;
  args.shift();
}

const cli = path.join(
  __dirname,
  "..",
  "node_modules",
  "electronmon",
  "bin",
  "cli.js",
);

const child = spawn(process.execPath, [cli, ".", ...args], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
