#!/usr/bin/env node
// scripts/factory-tap.mjs — test adapter for principled-factory (profile "next-vitest").
// Runs Vitest with its JSON reporter and prints TAP that the factory's parseTap/judgeVisible can judge:
//   - one line per AC ID: `ok N - AC-LEAVE-07` only if EVERY counted test whose title starts with that ID passed;
//     `not ok` if any of them failed or a test file that declares it failed to load;
//   - one line per other test, with a stable name `file > describe > title` (no timings, unlike --reporter=tap-flat);
//   - a file that failed to load: `not ok N - tests/x.test.ts` (the factory treats a failing *.ts name as a load failure);
//   - with --checks: `typecheck`, `lint`, `ac-coverage` lines first. Do NOT list them in the task's visibleTests:
//     judgeVisible fails on ANY `not ok`, and at baseline they may legitimately be red (tests import code not yet written).
// Usage: node scripts/factory-tap.mjs [--checks] [vitest filters…]   (exit 1 if anything is not ok)
// Windows: spawns `node <cli.js>` directly — npm/npx are shell shims that the factory cannot spawn.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const AC = /^AC-[A-Z]{2,12}-\d{2}(?![\w-])/;
const AC_IN_SOURCE = /\b(?:it|test)(?:\.\w+)*\(\s*["'`](AC-[A-Z]{2,12}-\d{2})(?![\w-])/g;
const argv = process.argv.slice(2);
const withChecks = argv.includes("--checks");
const filters = argv.filter((a) => a !== "--checks");
const cwd = process.cwd();
const rel = (p) => path.relative(cwd, p).split(path.sep).join("/");
const lines = []; // { ok, name, diag }
const run = (args) => spawnSync(process.execPath, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const tail = (r) => `${r.stdout ?? ""}\n${r.stderr ?? ""}`.trim().split("\n").slice(-25).join("\n");

if (withChecks) {
  const typegen = run(["node_modules/next/dist/bin/next", "typegen"]);
  const tsc = typegen.status === 0 ? run(["node_modules/typescript/bin/tsc", "--noEmit"]) : typegen;
  lines.push({ ok: tsc.status === 0, name: "typecheck", diag: tsc.status === 0 ? "" : tail(tsc) });
  const lint = run(["node_modules/eslint/bin/eslint.js", "--max-warnings", "0"]);
  lines.push({ ok: lint.status === 0, name: "lint", diag: lint.status === 0 ? "" : tail(lint) });
  const cov = run(["scripts/check-ac-coverage.mjs"]);
  lines.push({ ok: cov.status === 0, name: "ac-coverage", diag: cov.status === 0 ? "" : tail(cov) });
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "factory-tap-"));
const outFile = path.join(outDir, "vitest.json");
const vitest = run(["node_modules/vitest/vitest.mjs", "run", "--reporter=json", `--outputFile=${outFile}`, ...filters]);
let report = null;
try { report = JSON.parse(fs.readFileSync(outFile, "utf8")); } catch { /* reported below */ }
fs.rmSync(outDir, { recursive: true, force: true });

const acs = new Map(); // id → { ok, diag[] }
const mark = (id, ok, diag) => {
  const a = acs.get(id) ?? { ok: true, diag: [] };
  a.ok &&= ok;
  if (!ok && diag) a.diag.push(diag);
  acs.set(id, a);
};

if (!report) {
  lines.push({ ok: false, name: "vitest", diag: tail(vitest) });
} else {
  for (const file of report.testResults) {
    const name = rel(file.name);
    if (file.status === "failed" && !file.assertionResults.length) {
      lines.push({ ok: false, name, diag: String(file.message ?? "").slice(0, 2000) });
      let src = "";
      try { src = fs.readFileSync(file.name, "utf8"); } catch { /* unreadable */ }
      for (const m of src.matchAll(AC_IN_SOURCE)) mark(m[1], false, `${name} failed to load`);
      continue;
    }
    for (const t of file.assertionResults) {
      if (!["passed", "failed"].includes(t.status)) continue; // skipped / todo / pending are not counted
      const ok = t.status === "passed";
      const diag = ok ? "" : `${name} > ${t.title}\n${(t.failureMessages ?? []).join("\n").slice(0, 1500)}`;
      const id = t.title.match(AC)?.[0];
      if (id) mark(id, ok, diag);
      else lines.push({ ok, name: [name, ...t.ancestorTitles, t.title].join(" > "), diag });
    }
  }
  for (const [id, a] of [...acs].sort(([x], [y]) => x.localeCompare(y))) {
    lines.push({ ok: a.ok, name: id, diag: a.diag.join("\n\n") });
  }
}

const out = ["TAP version 13", `1..${lines.length}`];
lines.forEach((l, i) => {
  out.push(`${l.ok ? "ok" : "not ok"} ${i + 1} - ${l.name.replace(/[\r\n]+/g, " ").replace(/\s#\s/g, " ")}`);
  if (!l.ok && l.diag) out.push("  ---", ...l.diag.split("\n").map((d) => `  ${d}`), "  ...");
});
process.stdout.write(out.join("\n") + "\n");
process.exitCode = lines.every((l) => l.ok) ? 0 : 1;
