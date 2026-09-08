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
  assert.match(html, /Upload a cover/);
  assert.match(html, /Generate my bouquet/);
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
  assert.deepEqual(await response.json(), {
    error: "Generation service is not configured.",
    code: "NOT_CONFIGURED",
  });
});
