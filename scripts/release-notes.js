#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function git(command) {
  return execSync(command, {
    encoding: "utf8",
    cwd: ROOT,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function latestTag() {
  try {
    return git("git describe --tags --abbrev=0");
  } catch {
    return "";
  }
}

const from = readArg("--from", latestTag());
const to = readArg("--to", "HEAD");
const outFile = readArg("--out", null);
const summary = process.env.SUMMARY || readArg("--summary", "");

const pkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
);
const version = pkg.version;
const date = new Date().toISOString().slice(0, 10);

const range = from ? `${from}..${to}` : to;
let subjects = [];
try {
  subjects = git(`git log --no-merges --pretty=format:%s ${range}`)
    .split("\n")
    .filter(Boolean);
} catch {
  subjects = [];
}

const groups = { features: [], fixes: [], chores: [], other: [] };
for (const subject of subjects) {
  if (/^chore\(release\)/i.test(subject)) continue;
  const match = subject.match(/^(\w+)(\([^)]*\))?!?:\s*(.+)$/);
  if (!match) {
    groups.other.push(subject);
    continue;
  }
  const type = match[1].toLowerCase();
  const text = match[3];
  if (type === "feat") {
    groups.features.push(text);
  } else if (type === "fix") {
    groups.fixes.push(text);
  } else if (
    ["refactor", "chore", "docs", "style", "perf", "test", "build", "ci"].includes(
      type
    )
  ) {
    groups.chores.push(`${type}: ${text}`);
  } else {
    groups.other.push(subject);
  }
}

function bullets(list, fallback) {
  return list.length ? list.map((item) => `- ${item}`).join("\n") : fallback;
}

const template = fs.readFileSync(
  path.join(ROOT, "docs", "RELEASE_TEMPLATE.md"),
  "utf8"
);

const notes = template
  .replace(/\{version\}/g, version)
  .replace(/\{date\}/g, date)
  .replace(/\{summary\}/g, summary || `Release v${version}.`)
  .replace(/\{from\}/g, from || "(first release)")
  .replace(/\{features\}/g, bullets(groups.features, "- None"))
  .replace(/\{fixes\}/g, bullets(groups.fixes, "- None"))
  .replace(/\{chores\}/g, bullets(groups.chores, "- None"))
  .replace(/\{other\}/g, bullets(groups.other, "- None"));

if (outFile) {
  fs.writeFileSync(path.join(ROOT, outFile), notes);
} else {
  process.stdout.write(notes);
}
