import { IMAGE_TYPES, MAX_IMAGE_BYTES, type GenerationStage, type Interpretation } from "../lib/generation-contract";
import { generationPrompt, PROVISIONAL_IMAGE_PROMPT, PROVISIONAL_VISION_PROMPT } from "./generation-prompts";

export interface GenerationEnv {
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_VISION_MODEL?: string;
  OPENAI_IMAGE_MODEL?: string;
  OPENAI_IMAGE_BASE_URL?: string;
  OPENAI_IMAGE_API_KEY?: string;
  VISION_PROMPT?: string;
  BOUQUET_IMAGE_PROMPT?: string;
}

type Fetcher = typeof fetch;
type Options = { fetcher?: Fetcher; now?: () => number; requests?: Map<string, number[]>; visionTimeoutMs?: number; imageTimeoutMs?: number; development?: boolean };
const requests = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUEST_BODY = MAX_IMAGE_BYTES + 64 * 1024;
const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
const PUBLIC_ORIGINS = new Set(["https://album-era.hazellfish-z.chatgpt.site", "https://hazezhang.github.io", "http://localhost:3000", "http://localhost:5173"]);
const DEVELOPMENT_ORIGINS = new Set(["http://terminal.local:4173", "http://localhost:4173", "http://127.0.0.1:4173"]);

class Failure extends Error {
  constructor(public code: string, public stage: GenerationStage, message: string, public status = 502, public retryable = false, public upstreamStatus?: number, public retryAfterSeconds?: number) { super(message); }
}

export function providerBase(value?: string) {
  const base = (value?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  let url: URL;
  try { url = new URL(base); } catch { throw new Failure("INVALID_CONFIGURATION", "backend", "The generation service has an invalid API address.", 503); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Failure("INVALID_CONFIGURATION", "backend", "The generation service requires an HTTPS API address without credentials or query parameters.", 503);
  return base;
}

export function imageMime(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

async function limitedBytes(body: ReadableStream<Uint8Array> | null, maximum: number, stage: GenerationStage) {
  if (!body) return new Uint8Array();
  const reader = body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new Failure(stage === "upload" ? "IMAGE_TOO_LARGE" : "PROVIDER_RESPONSE_TOO_LARGE", stage, stage === "upload" ? "Choose an image of 8 MB or less." : "The provider returned an oversized response.", stage === "upload" ? 413 : 502); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return all;
}

function base64(bytes: Uint8Array) {
  let value = "";
  for (let i = 0; i < bytes.length; i += 0x8000) value += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(value);
}

export function parseInterpretation(value: unknown): Interpretation {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Failure("VISION_INVALID_RESPONSE", "vision", "The vision model returned an invalid interpretation.", 502, true);
  const raw = value as Record<string, unknown>;
  if (typeof raw.description !== "string" || !raw.description.trim() || raw.description.length > 2000 || typeof raw.generationPrompt !== "string" || !raw.generationPrompt.trim() || raw.generationPrompt.length > 6000) throw new Failure("VISION_INVALID_RESPONSE", "vision", "The vision interpretation is missing a description or generation instruction.", 502, true);
  if (raw.metadata !== undefined && (!raw.metadata || typeof raw.metadata !== "object" || Array.isArray(raw.metadata) || JSON.stringify(raw.metadata).length > 8000)) throw new Failure("VISION_INVALID_RESPONSE", "vision", "The vision model returned invalid metadata.", 502, true);
  return { description: raw.description.trim(), generationPrompt: raw.generationPrompt.trim(), metadata: (raw.metadata ?? {}) as Record<string, unknown> };
}

export function parseVision(payload: unknown) {
  const data = payload as { status?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (!data || data.status === "incomplete" || data.status === "failed") throw new Failure("VISION_INCOMPLETE", "vision", "The vision model did not complete its response. Please retry.", 502, true);
  if (data.output !== undefined && !Array.isArray(data.output)) throw new Failure("VISION_INVALID_RESPONSE", "vision", "The vision provider returned an invalid output structure.", 502, true);
  const text = (data.output ?? []).flatMap(item => item.content ?? []).filter(item => item.type === "output_text").map(item => item.text ?? "").join("").trim();
  try { return parseInterpretation(JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""))); }
  catch (error) { if (error instanceof Failure) throw error; throw new Failure("VISION_INVALID_JSON", "vision", "The vision model returned malformed JSON. Please retry.", 502, true); }
}

async function upstreamJson(fetcher: Fetcher, url: string, init: RequestInit, stage: GenerationStage, maximum: number) {
  const response = await fetcher(url, init);
  if (!response.ok) {
    // Do not echo provider error text: it can contain credentials, prompts or images.
    const retryAfter = Math.min(600, Math.max(1, Number(response.headers.get("Retry-After")) || 30));
    if (response.status === 401) throw new Failure("PROVIDER_AUTH_ERROR", stage, "The AI provider rejected the configured API key.", 502, false, 401);
    if (response.status === 403 || response.status === 404) throw new Failure("MODEL_UNAVAILABLE", stage, "The configured model or endpoint is unavailable to this API key.", 502, false, response.status);
    if (response.status === 429) throw new Failure("PROVIDER_RATE_LIMITED", stage, "The AI provider is rate limited. Please try again later.", 429, true, 429, retryAfter);
    throw new Failure("PROVIDER_API_ERROR", stage, `The ${stage === "vision" ? "vision" : "image"} provider rejected the request.`, 502, response.status >= 500 || response.status === 408, response.status);
  }
  try { return JSON.parse(new TextDecoder().decode(await limitedBytes(response.body, maximum, stage))); }
  catch (error) { if (error instanceof Failure) throw error; throw new Failure("PROVIDER_INVALID_JSON", stage, "The AI provider returned an invalid response.", 502, true); }
}

async function timed<T>(stage: GenerationStage, milliseconds: number, task: (signal: AbortSignal) => Promise<T>, parentSignal: AbortSignal) {
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => controller.abort(); parentSignal.addEventListener("abort", cancel, { once: true });
  if (parentSignal.aborted) controller.abort();
  try {
    return await Promise.race([task(controller.signal), new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Failure("API_TIMEOUT", stage, `The ${stage} request timed out. Please retry.`, 504, true)); }, milliseconds); })]);
  } catch (error) {
    if (error instanceof Failure) throw error;
    if (parentSignal.aborted) throw new Failure("REQUEST_CANCELLED", stage, "The generation request was cancelled.", 499, true);
    if (controller.signal.aborted) throw new Failure("API_TIMEOUT", stage, `The ${stage} request timed out. Please retry.`, 504, true);
    throw new Failure("PROVIDER_NETWORK_ERROR", stage, `The ${stage} provider could not be reached. Please retry.`, 502, true);
  } finally { clearTimeout(timer); parentSignal.removeEventListener("abort", cancel); }
}

export function parseBase64Image(value: unknown) {
  if (typeof value !== "string" || !value || value.length > MAX_OUTPUT_BYTES * 4 / 3 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Failure("IMAGE_INVALID_DATA", "generation", "The image provider returned invalid image data.", 502, true);
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0)); } catch { throw new Failure("IMAGE_INVALID_DATA", "generation", "The image provider returned invalid image data.", 502, true); }
  const mime = imageMime(bytes);
  if (!mime) throw new Failure("IMAGE_INVALID_DATA", "generation", "The provider response does not contain a supported image.", 502, true);
  return `data:${mime};base64,${value}`;
}

export async function handleGeneration(request: Request, env: GenerationEnv, options: Options = {}) {
  const id = crypto.randomUUID(); const now = options.now ?? Date.now; const start = now();
  const origin = request.headers.get("Origin") ?? "";
  const sameOrigin = origin === new URL(request.url).origin;
  const allowed = PUBLIC_ORIGINS.has(origin) || (options.development === true && DEVELOPMENT_ORIGINS.has(origin)) || (sameOrigin && new URL(request.url).protocol === "https:");
  const headers: Record<string, string> = { "Cache-Control": "no-store", Vary: "Origin", "X-Request-ID": id, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (allowed) headers["Access-Control-Allow-Origin"] = origin;
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers });
  try {
    if (!allowed) throw new Failure("ORIGIN_NOT_ALLOWED", "backend", "This website origin is not allowed to use this API.", 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") throw new Failure("METHOD_NOT_ALLOWED", "backend", "Use POST to generate a bouquet.", 405);
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("multipart/form-data;")) throw new Failure("INVALID_UPLOAD", "upload", "Upload the image using multipart form data.", 400);
    if (Number(request.headers.get("Content-Length")) > MAX_REQUEST_BODY) throw new Failure("IMAGE_TOO_LARGE", "upload", "Choose an image of 8 MB or less.", 413);
    const body = await limitedBytes(request.body, MAX_REQUEST_BODY, "upload");
    let form: FormData;
    try { form = await new Response(body, { headers: { "Content-Type": request.headers.get("Content-Type")! } }).formData(); }
    catch { throw new Failure("INVALID_UPLOAD", "upload", "The image upload could not be read.", 400); }
    const image = form.get("image");
    if (!(image instanceof File)) throw new Failure("IMAGE_REQUIRED", "upload", "Choose an image first.", 400);
    if (!IMAGE_TYPES.includes(image.type)) throw new Failure("UNSUPPORTED_IMAGE_TYPE", "upload", "Choose a JPEG, PNG or WebP image.", 415);
    if (!image.size) throw new Failure("EMPTY_IMAGE", "upload", "The selected image is empty.", 400);
    if (image.size > MAX_IMAGE_BYTES) throw new Failure("IMAGE_TOO_LARGE", "upload", "Choose an image of 8 MB or less.", 413);
    const imageBytes = new Uint8Array(await image.arrayBuffer());
    if (imageMime(imageBytes) !== image.type) throw new Failure("INVALID_IMAGE", "upload", "The file contents do not match its image format.", 415);
    if (!env.OPENAI_API_KEY?.trim()) throw new Failure("NOT_CONFIGURED", "backend", "The generation service has not been configured.", 503);
    const visionBase = providerBase(env.OPENAI_BASE_URL); const imageBase = providerBase(env.OPENAI_IMAGE_BASE_URL ?? env.OPENAI_BASE_URL);
    const visionModel = env.OPENAI_VISION_MODEL?.trim() || "gpt-5.4-mini";
    const imageModel = env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
    const imageKey = env.OPENAI_IMAGE_API_KEY?.trim() || env.OPENAI_API_KEY;
    const bucket = options.requests ?? requests; const client = request.headers.get("CF-Connecting-IP") ?? "unknown";
    for (const [key, values] of bucket) if (!values.some(t => now() - t < WINDOW_MS)) bucket.delete(key);
    const recent = (bucket.get(client) ?? []).filter(t => now() - t < WINDOW_MS);
    if (recent.length >= 3) throw new Failure("RATE_LIMITED", "backend", "Please wait before starting another generation.", 429, true, undefined, Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now()) / 1000)));
    if (bucket.size >= 10000 && !bucket.has(client)) throw new Failure("SERVICE_BUSY", "backend", "The generation service is busy. Please retry shortly.", 503, true);
    recent.push(now()); bucket.set(client, recent);
    const fetcher = options.fetcher ?? fetch; const visionStart = now();
    const interpretation = await timed("vision", options.visionTimeoutMs ?? 45000, async signal => parseVision(await upstreamJson(fetcher, `${visionBase}/responses`, {
      method: "POST", signal, headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: visionModel, input: [{ role: "user", content: [{ type: "input_text", text: env.VISION_PROMPT || PROVISIONAL_VISION_PROMPT }, { type: "input_image", image_url: `data:${image.type};base64,${base64(imageBytes)}`, detail: "auto" }] }], text: { format: { type: "json_object" } }, max_output_tokens: 2000, ...(/^gpt-[56](?:[.-]|$)/i.test(visionModel) ? { reasoning: { effort: "low" } } : {}) }),
    }, "vision", 64 * 1024)), request.signal);
    const visionMs = now() - visionStart; const generationStart = now();
    const imageDataUrl = await timed("generation", options.imageTimeoutMs ?? 65000, async signal => {
      const upload = new FormData(); upload.append("model", imageModel); upload.append("image[]", image, `reference.${image.type === "image/jpeg" ? "jpg" : image.type === "image/png" ? "png" : "webp"}`);
      upload.append("prompt", generationPrompt(env.BOUQUET_IMAGE_PROMPT || PROVISIONAL_IMAGE_PROMPT, interpretation));
      upload.append("size", "1024x1024"); upload.append("quality", "medium"); upload.append("output_format", "jpeg");
      const payload = await upstreamJson(fetcher, `${imageBase}/images/edits`, { method: "POST", signal, headers: { Authorization: `Bearer ${imageKey}` }, body: upload }, "generation", MAX_OUTPUT_BYTES * 1.4) as { data?: Array<{ b64_json?: string; url?: string }> };
      const result = payload?.data?.[0];
      if (result?.b64_json) return parseBase64Image(result.b64_json);
      if (result?.url) {
        let url: URL; try { url = new URL(result.url); } catch { throw new Failure("IMAGE_INVALID_URL", "generation", "The provider returned an invalid image address."); }
        if (url.protocol !== "https:" || url.username || url.password || /^(localhost|127\.|\[|0\.|10\.|192\.168\.|169\.254\.)/i.test(url.hostname)) throw new Failure("IMAGE_INVALID_URL", "generation", "The provider returned an unsupported image address.");
        const response = await fetcher(url.href, { signal, redirect: "error" });
        if (!response.ok) throw new Failure("IMAGE_DOWNLOAD_FAILED", "generation", "The generated image could not be retrieved.", 502, true, response.status);
        return parseBase64Image(base64(await limitedBytes(response.body, MAX_OUTPUT_BYTES, "generation")));
      }
      throw new Failure("IMAGE_MISSING", "generation", "The image provider returned no image. Please retry.", 502, true);
    }, request.signal);
    return reply({ requestId: id, imageDataUrl, interpretation, timings: { visionMs, generationMs: now() - generationStart, totalMs: now() - start } });
  } catch (error) {
    const failure = error instanceof Failure ? error : new Failure("INTERNAL_ERROR", "backend", "The generation service could not complete this request.", 500, true);
    if (failure.retryAfterSeconds) headers["Retry-After"] = String(failure.retryAfterSeconds);
    // Intentionally log only operational metadata, never exception bodies, prompts or uploads.
    console.warn("generation_failed", { requestId: id, code: failure.code, stage: failure.stage, upstreamStatus: failure.upstreamStatus, milliseconds: now() - start });
    return reply({ requestId: id, error: failure.message, code: failure.code, stage: failure.stage, retryable: failure.retryable, upstreamStatus: failure.upstreamStatus, retryAfterSeconds: failure.retryAfterSeconds }, failure.status);
  }
}
