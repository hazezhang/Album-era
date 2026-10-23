import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const contract = moduleUrl(compile(await readFile(new URL("../lib/generation-contract.ts", import.meta.url), "utf8")));
const prompts = moduleUrl(compile(await readFile(new URL("../worker/generation-prompts.ts", import.meta.url), "utf8")));
const source = compile(await readFile(new URL("../worker/generation.ts", import.meta.url), "utf8"))
  .replace('"../lib/generation-contract"', JSON.stringify(contract)).replace('"./generation-prompts"', JSON.stringify(prompts));
const { handleGeneration } = await import(moduleUrl(source));

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
const origin = "https://album-era.hazellfish-z.chatgpt.site";
const env = { OPENAI_API_KEY: "test-secret-do-not-echo", OPENAI_BASE_URL: "https://gateway.example/v1/", OPENAI_VISION_MODEL: "vision-alias", OPENAI_IMAGE_MODEL: "image-alias" };
const interpretation = { description: "A visible reference.", generationPrompt: "A provisional bouquet.", metadata: { provisional: true } };
const vision = text => Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: text ?? JSON.stringify(interpretation) }] }] });
const generated = () => Response.json({ data: [{ b64_json: png.toString("base64") }] });
function upload(file = new File([png], "input.png", { type: "image/png" }), requestOrigin = origin) {
  const body = new FormData(); if (file) body.append("image", file);
  return new Request(`${origin}/api/generate`, { method: "POST", headers: { Origin: requestOrigin }, body });
}
async function run(fetcher, request = upload(), config = env, extra = {}) {
  const response = await handleGeneration(request, config, { fetcher, requests: new Map(), ...extra });
  return { response, body: await response.json() };
}
const ok = async url => String(url).endsWith("/responses") ? vision() : generated();

test("valid upload invokes real protocol shapes and returns browser-ready image bytes", async () => {
  const calls = [];
  const { response, body } = await run(async (url, init) => {
    calls.push(url); assert.equal(init.headers.Authorization, `Bearer ${env.OPENAI_API_KEY}`);
    if (url.endsWith("/responses")) {
      const payload = JSON.parse(init.body); assert.equal(payload.model, "vision-alias");
      assert.match(payload.input[0].content[1].image_url, /^data:image\/png;base64,/); return vision();
    }
    assert.ok(init.body instanceof FormData); assert.equal(init.body.get("model"), "image-alias");
    assert.deepEqual(Buffer.from(await init.body.get("image[]").arrayBuffer()), png); return generated();
  });
  assert.equal(response.status, 200); assert.deepEqual(calls, ["https://gateway.example/v1/responses", "https://gateway.example/v1/images/edits"]);
  assert.equal(body.imageDataUrl, `data:image/png;base64,${png.toString("base64")}`);
  assert.deepEqual(body.interpretation, interpretation); assert.ok(body.requestId); assert.equal(typeof body.timings.totalMs, "number");
});

test("upload errors are distinct and never call the provider", async () => {
  const files = [
    [null, "IMAGE_REQUIRED", 400],
    [new File(["text"], "x.txt", { type: "text/plain" }), "UNSUPPORTED_IMAGE_TYPE", 415],
    [new File([], "x.png", { type: "image/png" }), "EMPTY_IMAGE", 400],
    [new File(["not an image"], "x.png", { type: "image/png" }), "INVALID_IMAGE", 415],
    [new File([new Uint8Array(8 * 1024 * 1024 + 1)], "x.png", { type: "image/png" }), "IMAGE_TOO_LARGE", 413],
  ];
  for (const [file, code, status] of files) {
    const { response, body } = await run(() => assert.fail("provider must not be called"), upload(file));
    assert.equal(response.status, status); assert.equal(body.code, code); assert.equal(body.stage, "upload");
  }
});

test("missing key and invalid provider URL fail before provider invocation", async () => {
  for (const [config, code] of [[{}, "NOT_CONFIGURED"], [{ ...env, OPENAI_BASE_URL: "http://insecure.example" }, "INVALID_CONFIGURATION"]]) {
    const { response, body } = await run(() => assert.fail("provider called"), upload(), config);
    assert.equal(response.status, 503); assert.equal(body.code, code);
  }
});

test("provider auth, access, rate limits and outages map to useful safe errors", async () => {
  for (const [status, code] of [[401, "PROVIDER_AUTH_ERROR"], [403, "MODEL_UNAVAILABLE"], [404, "MODEL_UNAVAILABLE"], [429, "PROVIDER_RATE_LIMITED"], [500, "PROVIDER_API_ERROR"]]) {
    const { response, body } = await run(async () => Response.json({ error: { message: env.OPENAI_API_KEY + " PRIVATE_IMAGE_CONTENT" } }, { status, headers: { "Retry-After": "12" } }));
    assert.equal(body.code, code); assert.equal(body.stage, "vision"); assert.equal(body.upstreamStatus, status);
    assert.doesNotMatch(JSON.stringify(body), /test-secret|PRIVATE_IMAGE_CONTENT/);
    if (status === 429) { assert.equal(response.status, 429); assert.equal(response.headers.get("Retry-After"), "12"); }
  }
});

test("vision handles JSON fences and split output and rejects malformed or incomplete responses", async () => {
  const good = [vision("```json\n" + JSON.stringify(interpretation) + "\n```"), Response.json({output:[{content:[{type:"output_text",text:'{"description":"x",'},{type:"output_text",text:'"generationPrompt":"y","metadata":{}}'}]}]})];
  for (const candidate of good) assert.equal((await run(async url => url.endsWith("/responses") ? candidate : generated())).response.status, 200);
  for (const [candidate, code] of [[vision("{broken"), "VISION_INVALID_JSON"], [vision('{}'), "VISION_INVALID_RESPONSE"], [Response.json({status:"incomplete", output:[]}), "VISION_INCOMPLETE"], [Response.json({output:{bad:true}}), "VISION_INVALID_RESPONSE"]]) {
    const result = await run(async () => candidate); assert.equal(result.body.code, code); assert.equal(result.body.stage, "vision");
  }
});

test("image errors are attributed to generation and never return success or fallback", async () => {
  for (const [payload, code] of [[{data:[]},"IMAGE_MISSING"],[{data:[{b64_json:"not base64"}]},"IMAGE_INVALID_DATA"],[{data:[{b64_json:Buffer.from("text").toString("base64")}]},"IMAGE_INVALID_DATA"]]) {
    const { response, body } = await run(async url => url.endsWith("/responses") ? vision() : Response.json(payload));
    assert.equal(response.status, 502); assert.equal(body.code, code); assert.equal(body.stage, "generation"); assert.equal(body.imageDataUrl, undefined);
  }
  const denied = await run(async url => url.endsWith("/responses") ? vision() : new Response("denied", {status:403}));
  assert.equal(denied.body.stage, "generation"); assert.equal(denied.body.code, "MODEL_UNAVAILABLE");
});

test("URL image output is downloaded without forwarding credentials", async () => {
  const result = await run(async (url, init) => {
    if (url.endsWith("/responses")) return vision();
    if (url.endsWith("/images/edits")) return Response.json({data:[{url:"https://images.example/output.png"}]});
    assert.equal(url, "https://images.example/output.png"); assert.equal(init.headers, undefined); return new Response(png);
  });
  assert.equal(result.response.status, 200); assert.match(result.body.imageDataUrl, /^data:image\/png/);
});

test("each provider phase has an explicit deadline", async () => {
  const stalled = () => new Promise(() => {});
  const visionTimeout = await run(stalled, upload(), env, {visionTimeoutMs:10});
  assert.equal(visionTimeout.response.status, 504); assert.equal(visionTimeout.body.stage, "vision");
  const imageTimeout = await run(async url => url.endsWith("/responses") ? vision() : stalled(), upload(), env, {imageTimeoutMs:10});
  assert.equal(imageTimeout.body.code, "API_TIMEOUT"); assert.equal(imageTimeout.body.stage, "generation");
});

test("provider network errors do not expose exception contents", async () => {
  const result = await run(async () => { throw new Error(env.OPENAI_API_KEY); });
  assert.equal(result.body.code, "PROVIDER_NETWORK_ERROR"); assert.doesNotMatch(JSON.stringify(result.body), /test-secret/);
});

test("rate limiting counts valid requests and permits retry after the window", async () => {
  const bucket = new Map(); let clock = 1000000;
  for (let i = 0; i < 3; i++) assert.equal((await run(ok, upload(), env, {requests:bucket,now:()=>clock})).response.status, 200);
  const blocked = await run(ok, upload(), env, {requests:bucket,now:()=>clock});
  assert.equal(blocked.response.status, 429); assert.equal(blocked.body.code, "RATE_LIMITED"); assert.equal(blocked.body.retryAfterSeconds, 600);
  clock += 600001; assert.equal((await run(ok, upload(), env, {requests:bucket,now:()=>clock})).response.status, 200);
});

test("CORS preflight works without credentials and arbitrary origins are rejected", async () => {
  const preflight = new Request(`${origin}/api/generate`, {method:"OPTIONS",headers:{Origin:origin}});
  assert.equal((await handleGeneration(preflight, {})).status, 204);
  assert.equal((await run(ok, upload(undefined, "https://untrusted.example"))).response.status, 403);
});

test("product prompts and separate image-provider settings are replaceable", async () => {
  const result = await run(async (url, init) => {
    if (url.endsWith("/responses")) { assert.equal(JSON.parse(init.body).input[0].content[0].text,"Product-supplied JSON vision instructions"); return vision(); }
    assert.equal(url,"https://image-gateway.example/v1/images/edits"); assert.equal(init.headers.Authorization,"Bearer image-only-key");
    assert.equal(init.body.get("prompt"),"Product instruction: A visible reference. / A provisional bouquet."); return generated();
  }, upload(), {...env, VISION_PROMPT:"Product-supplied JSON vision instructions", BOUQUET_IMAGE_PROMPT:"Product instruction: {{description}} / {{generationPrompt}}", OPENAI_IMAGE_BASE_URL:"https://image-gateway.example/v1", OPENAI_IMAGE_API_KEY:"image-only-key"});
  assert.equal(result.response.status,200);
});


test("classroom rate quota is configurable and still enforced", async () => {
  const bucket = new Map(); const config = {...env,GENERATION_RATE_LIMIT:"1"};
  assert.equal((await run(ok,upload(),config,{requests:bucket})).response.status,200);
  assert.equal((await run(ok,upload(),config,{requests:bucket})).body.code,"RATE_LIMITED");
});
