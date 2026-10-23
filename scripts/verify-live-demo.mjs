import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// No provider credentials are read: this exercises the deployed public API.
const args = process.argv.slice(2);
const value = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const root = new URL("..", import.meta.url);
const site = new URL(value("--url") ?? "https://album-era.hazellfish-z.chatgpt.site");
if (site.protocol !== "https:") throw new Error("Use the deployed HTTPS Site URL.");
const output = path.resolve(value("--output-dir") ?? "outputs/live-demo-check");
await mkdir(output, { recursive: true });
const report = { kind: "production-api-only", browserVerified: false, startedAt: new Date().toISOString(), site: site.origin, checks: [], runs: [] };
const record = async () => writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
const page = await fetch(new URL("/demo", site), { signal: AbortSignal.timeout(30000) });
const html = await page.text();
report.checks.push({ name: "demo-page", status: page.status, passed: page.ok && html.includes("Generate bouquet") });
const invalid = new FormData(); invalid.append("image", new Blob(["invalid"], { type: "text/plain" }), "invalid.txt");
const rejected = await fetch(new URL("/api/generate", site), { method: "POST", headers: { Origin: site.origin }, body: invalid, signal: AbortSignal.timeout(30000) });
const rejection = await rejected.json();
report.checks.push({ name: "invalid-format", status: rejected.status, code: rejection.code, passed: rejected.status === 415 && rejection.code === "UNSUPPORTED_IMAGE_TYPE" });
await record();
console.log(JSON.stringify({ checks: report.checks }));
if (args.includes("--real")) {
  const names = ["lunar-veil-cover.webp", "cherry-static-cover.webp", "moss-memory-cover.webp"];
  const chosen = value("--input");
  if (chosen && !names.includes(chosen)) throw new Error("Choose one of the three non-personal reference fixtures.");
  for (const [index, name] of (chosen ? [chosen] : names).entries()) {
    const bytes = await readFile(new URL(`public/${name}`, root));
    const form = new FormData(); form.append("image", new Blob([bytes], { type: "image/webp" }), name);
    const start = Date.now();
    try {
      const response = await fetch(new URL("/api/generate", site), { method: "POST", headers: { Origin: site.origin }, body: form, signal: AbortSignal.timeout(125000) });
      const result = await response.json();
      const match = typeof result.imageDataUrl === "string" && result.imageDataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/);
      const run = { input: name, inputSha256: createHash("sha256").update(bytes).digest("hex"), status: response.status, milliseconds: Date.now() - start, requestId: result.requestId, timings: result.timings, code: result.code, stage: result.stage, error: result.error, browserVerified: false, passed: response.ok && !!match };
      if (match) { const image = Buffer.from(match[2], "base64"); run.imageBytes = image.length; run.outputFile = `run-${index + 1}.${match[1] === "jpeg" ? "jpg" : match[1]}`; await writeFile(path.join(output, run.outputFile), image); }
      report.runs.push(run); console.log(JSON.stringify(run));
    } catch (error) { const run = { input: name, passed: false, browserVerified: false, milliseconds: Date.now() - start, error: error.name }; report.runs.push(run); console.log(JSON.stringify(run)); }
    await record();
  }
}
report.finishedAt = new Date().toISOString(); await record();
if (report.checks.some(check => !check.passed) || report.runs.some(run => !run.passed)) process.exitCode = 1;
