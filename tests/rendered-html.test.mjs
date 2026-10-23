import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

test("renders the album bouquet studio", async () => {
  const worker = await loadWorker();

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>Album \/ Bouquet<\/title>/i);
  assert.match(html, /You, as a/);
  assert.match(html, /Choose your source/i);
  assert.match(html, /Upload image/);
  assert.match(html, /Generate bouquet/);
  assert.match(html, /Curated Study/);
});

test("keeps live generation behind a configured server secret", async () => {
  const worker = await loadWorker();
  const form = new FormData();
  form.append("mode", "fresh");
  form.append("image", new File([new Uint8Array([0xff, 0xd8, 0xff])], "cover.jpg", { type: "image/jpeg" }));

  const response = await worker.fetch(
    new Request("https://album-era.hazellfish-z.chatgpt.site/api/generate", {
      method: "POST",
      headers: { origin: "https://album-era.hazellfish-z.chatgpt.site" },
      body: form,
    }),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 503);
  const failure = await response.json();
  assert.equal(failure.code, "NOT_CONFIGURED");
  assert.equal(failure.stage, "backend");
  assert.equal(failure.retryable, false);
  assert.equal(failure.requestId, response.headers.get("X-Request-ID"));
  assert.equal(typeof failure.error, "string");
});


test("renders the upload-only MVP without a camera control or fallback success", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("https://album-era.hazellfish-z.chatgpt.site/demo", {headers:{accept:"text/html"}}), {ASSETS:{fetch:async()=>new Response("Not found",{status:404})}}, {waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,200);
  const html = await response.text();
  assert.match(html,/Upload image/); assert.match(html,/Generate bouquet/);
  assert.doesNotMatch(html,/Open camera|AI generation complete|FALLBACK STUDY/);
});

test("keeps the album workflow and material receipt on clearly labelled archive routes", async () => {
  const worker = await loadWorker();
  const env = {ASSETS:{fetch:async()=>new Response("Not found",{status:404})}};
  const ctx = {waitUntil(){},passThroughOnException(){}};
  const album = await worker.fetch(new Request("https://album-era.hazellfish-z.chatgpt.site/album-studio",{headers:{accept:"text/html"}}),env,ctx);
  assert.equal(album.status,200); assert.match(await album.text(),/Fresh flowers|Upload a cover/);
  const materials = await worker.fetch(new Request("https://album-era.hazellfish-z.chatgpt.site/material-study",{headers:{accept:"text/html"}}),env,ctx);
  assert.equal(materials.status,200); assert.match(await materials.text(),/MATERIAL COMPOSITION|Print receipt/);
});
