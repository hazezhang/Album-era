/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  buildAnalysisPrompt,
  buildGenerationPrompt,
  buildQaPrompt,
  type BouquetAnalysis,
  type BouquetMode,
  type BouquetQa,
} from "./aesthetic-runtime";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_IMAGE_MODEL?: string;
  OPENAI_VISION_MODEL?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ORIGINS = new Set([
  "https://album-era.hazellfish-z.chatgpt.site",
  "https://hazezhang.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
]);
const DEV_ORIGINS = import.meta.env.DEV
  ? new Set(["http://terminal.local:4173", "http://localhost:4173", "http://127.0.0.1:4173"])
  : new Set<string>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const generationRequests = new Map<string, number[]>();

function apiBaseUrl(env: Env) {
  const baseUrl = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("OPENAI_BASE_URL must be an HTTPS API base URL without credentials, query or fragment.");
  }
  return baseUrl;
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  return ALLOWED_ORIGINS.has(origin) || DEV_ORIGINS.has(origin);
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  return {
    ...(isAllowedOrigin(request) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, value: unknown, status = 200) {
  return Response.json(value, { status, headers: corsHeaders(request) });
}

type VisionResponse = {
  status?: string;
  incomplete_details?: { reason?: string };
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
};

function responseText(payload: VisionResponse) {
  if (payload.status === "incomplete") {
    const reason = payload.incomplete_details?.reason;
    throw new Error(reason === "max_output_tokens"
      ? "Vision analysis exceeded its output budget. Please try again."
      : "Vision model returned an incomplete response. Please try again.");
  }
  const text = (payload.output ?? []).flatMap(item => item.content ?? [])
    .filter(content => content.type === "output_text" && content.text)
    .map(content => content.text).join("");
  if (!text) throw new Error("Vision model returned no analysis text.");
  return text;
}

async function fileDataUrl(image: File) {
  const encoded = await image.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer); let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  });
  return `data:${image.type};base64,${encoded}`;
}

function cleanAnalysis(value: unknown): BouquetAnalysis {
  if (!value || typeof value !== "object") throw new Error("Vision model returned invalid JSON.");
  const raw = value as Record<string, unknown>;
  const number = (key: string, fallback: number) => {
    const value = Number(raw[key]);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
  };
  const text = (key: string, fallback: string) => typeof raw[key] === "string" && raw[key] ? String(raw[key]).slice(0, 280) : fallback;
  const palette = Array.isArray(raw.palette)
    ? raw.palette.filter((item): item is string => typeof item === "string" && /^#[0-9a-f]{6}$/i.test(item)).slice(0, 4)
    : [];
  const recipe = Array.isArray(raw.recipe) ? raw.recipe.slice(0, 6).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.flower !== "string") return [];
    return [{ flower: row.flower.slice(0, 60), role: String(row.role ?? "support").slice(0, 60), quantity: String(row.quantity ?? "3 stems").slice(0, 40) }];
  }) : [];
  if (palette.length < 3 || recipe.length < 3) throw new Error("Vision analysis was incomplete.");
  const signatureColor = typeof raw.signatureColor === "string" && /^#[0-9a-f]{6}$/i.test(raw.signatureColor)
    ? raw.signatureColor.toLowerCase()
    : palette[0];
  const accentColor = typeof raw.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(raw.accentColor)
    ? raw.accentColor.toLowerCase()
    : palette[palette.length - 1];
  const brightness = number("brightness", 50);
  const contrast = number("contrast", 50);
  const density = number("density", 50);
  const negativeSpace = number("negativeSpace", 50);
  const warmth = number("warmth", 50);
  const darkMass = number("darkMass", 25);
  const derivedMood = [
    brightness < 35 ? "nocturnal" : brightness > 68 ? "luminous" : "muted",
    contrast > 70 ? "dramatic" : contrast < 35 ? "soft" : "rhythmic",
    warmth > 62 ? "warm" : warmth < 38 ? "cool" : density > 65 ? "lush" : negativeSpace > 58 ? "airy" : "balanced",
  ].join(" · ");
  return {
    title: text("title", "Untitled arrangement"), palette,
    dominantColorWorld: text("dominantColorWorld", `${palette[0]} expressed through a dark, mid and light tonal ladder`),
    supportingHue: text("supportingHue", palette[1] ?? palette[0]),
    shadowNeutral: text("shadowNeutral", palette[2] ?? "soft neutral shadow"),
    signatureColor,
    signatureColorRole: text("signatureColorRole", "the image's most identity-defining chromatic signal"),
    accentColor,
    accentColorRole: text("accentColorRole", "a small but memorable contrasting signal"),
    brightness, contrast, density, negativeSpace, warmth, darkMass, mood: text("mood", derivedMood),
    primaryGesture: text("primaryGesture", "one off-centre mass held against a deliberate open void"),
    spatialLogic: text("spatialLogic", "off-axis"),
    dominantTension: text("dominantTension", "soft botanical forms held against one clean graphic plane"),
    composition: text("composition", "off-centre with deliberate negative space"), shape: text("shape", "A source-led sculptural silhouette."),
    materialLanguage: text("materialLanguage", "matte botanicals contrasted with one translucent or reflective surface"),
    constructionPlan: text("constructionPlan", "All non-floral materials are wired or taped to stems and secured at one hand-held binding point."),
    packaging: text("packaging", "one incomplete graphic plane placed where it reinforces the Primary Gesture"),
    lightingBackground: text("lightingBackground", "a clean studio field matching the source brightness and temperature"),
    culturalStyle: text("culturalStyle", "contemporary editorial still life"),
    humanInterferenceRemoved: text("humanInterferenceRemoved", "none, or incidental hair, skin and facial features when a person is present"),
    rationale: text("rationale", "The bouquet translates the source image's visual hierarchy and atmosphere."), recipe,
  };
}

async function analyseReference(image: File, mode: BouquetMode, apiKey: string, model: string, baseUrl: string) {
  const prompt = buildAnalysisPrompt(mode);
  const imageUrl = await fileDataUrl(image);
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: imageUrl, detail: "high" }] }],
      max_output_tokens: 4000,
      text: { format: { type: "json_object" } },
      ...(/^gpt-[56](?:[.-]|$)/i.test(model) ? { reasoning: { effort: "low" } } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Vision analysis failed (${response.status}).`);
  const payload = await response.json() as VisionResponse;
  const rawText = responseText(payload).replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  return cleanAnalysis(JSON.parse(rawText));
}

async function generateBouquet(image: File, mode: BouquetMode, analysis: BouquetAnalysis, apiKey: string, baseUrl: string, imageModel: string, revisionReasons: string[] = []) {
  const form = new FormData();
  form.append("model", imageModel);
  form.append("image[]", image, image.name || "reference.png");
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append("output_format", "jpeg");
  form.append("output_compression", "88");
  form.append("prompt", buildGenerationPrompt(mode, analysis, revisionReasons));
  const response = await fetch(`${baseUrl}/images/edits`, {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form,
  });
  if (!response.ok) throw new Error(`Bouquet generation failed (${response.status}).`);
  const payload = await response.json() as { data?: Array<{ b64_json?: string }> };
  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) throw new Error("Image model returned no image.");
  return `data:image/jpeg;base64,${base64}`;
}

function cleanQa(value: unknown): BouquetQa {
  if (!value || typeof value !== "object") throw new Error("Visual QA returned invalid JSON.");
  const raw = value as Record<string, unknown>;
  const reasons = Array.isArray(raw.hardRejectReasons)
    ? raw.hardRejectReasons.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
    : [];
  const sentence = (key: string, fallback: string) => typeof raw[key] === "string" && raw[key]
    ? String(raw[key]).slice(0, 240)
    : fallback;
  return {
    pass: raw.pass === true && reasons.length === 0,
    hardRejectReasons: reasons,
    referenceFidelity: sentence("referenceFidelity", "Reference fidelity requires review."),
    artDirection: sentence("artDirection", "Art direction requires review."),
    visualQuality: sentence("visualQuality", "Visual quality requires review."),
    feasibility: sentence("feasibility", "Physical construction requires review."),
    backgroundConsistency: sentence("backgroundConsistency", "Background consistency requires review."),
    primaryGestureVisible: raw.primaryGestureVisible === true,
    ordinaryFloristWouldNotDo: sentence("ordinaryFloristWouldNotDo", "No distinctive non-retail decision was identified."),
  };
}

async function evaluateBouquet(reference: File, candidateDataUrl: string, analysis: BouquetAnalysis, apiKey: string, model: string, baseUrl: string) {
  const referenceDataUrl = await fileDataUrl(reference);
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [
        { type: "input_text", text: buildQaPrompt(analysis) },
        { type: "input_text", text: "IMAGE 1 — REFERENCE" },
        { type: "input_image", image_url: referenceDataUrl, detail: "high" },
        { type: "input_text", text: "IMAGE 2 — GENERATED BOUQUET" },
        { type: "input_image", image_url: candidateDataUrl, detail: "high" },
      ] }],
      max_output_tokens: 2500,
      text: { format: { type: "json_object" } },
      ...(/^gpt-[56](?:[.-]|$)/i.test(model) ? { reasoning: { effort: "low" } } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Visual QA failed (${response.status}).`);
  const payload = await response.json() as VisionResponse;
  const rawText = responseText(payload).replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  return cleanQa(JSON.parse(rawText));
}

function apiGuard(request: Request, env: Env, bucket: string, maxRequests: number) {
  if (!isAllowedOrigin(request)) return jsonResponse(request, { error: "Origin not allowed." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed." }, 405);
  if (!env.OPENAI_API_KEY) return jsonResponse(request, { error: "Generation service is not configured.", code: "NOT_CONFIGURED" }, 503);
  const now = Date.now();
  const clientId = `${request.headers.get("CF-Connecting-IP") ?? "unknown"}:${bucket}`;
  const recentRequests = (generationRequests.get(clientId) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recentRequests.length >= maxRequests) {
    return jsonResponse(request, { error: "Too many generations. Please try again in a few minutes." }, 429);
  }
  recentRequests.push(now);
  generationRequests.set(clientId, recentRequests);
  return null;
}

function imageFromForm(form: FormData, key = "image") {
  const image = form.get(key);
  if (!(image instanceof File) || !ALLOWED_IMAGE_TYPES.has(image.type)) throw new Error(`${key} must be a JPEG, PNG or WebP image.`);
  if (image.size > MAX_UPLOAD_BYTES) throw new Error(`${key} must be 8 MB or smaller.`);
  return image;
}

function analysisFromForm(form: FormData) {
  const raw = form.get("analysis");
  if (typeof raw !== "string") throw new Error("Visual analysis is required.");
  return cleanAnalysis(JSON.parse(raw));
}

async function handleAnalyse(request: Request, env: Env) {
  const blocked = apiGuard(request, env, "analyse", 3);
  if (blocked) return blocked;
  try {
    const form = await request.formData();
    const image = imageFromForm(form);
    const mode = form.get("mode") === "preserved" ? "preserved" : "fresh";
    const visionModel = env.OPENAI_VISION_MODEL ?? "gpt-5.4-mini";
    const analysis = await analyseReference(image, mode, env.OPENAI_API_KEY, visionModel, apiBaseUrl(env));
    return jsonResponse(request, { analysis });
  } catch (error) {
    console.error("bouquet_analysis_failed", error);
    return jsonResponse(request, { error: error instanceof Error ? error.message : "Analysis failed." }, 502);
  }
}

async function handleRender(request: Request, env: Env) {
  const blocked = apiGuard(request, env, "render", 6);
  if (blocked) return blocked;
  try {
    const form = await request.formData();
    const image = imageFromForm(form);
    const mode = form.get("mode") === "preserved" ? "preserved" : "fresh";
    const analysis = analysisFromForm(form);
    const revisionReasonsRaw = form.get("revisionReasons");
    const revisionReasons = typeof revisionReasonsRaw === "string"
      ? (JSON.parse(revisionReasonsRaw) as unknown[]).filter((item): item is string => typeof item === "string").slice(0, 5)
      : [];
    const imageDataUrl = await generateBouquet(image, mode, analysis, env.OPENAI_API_KEY, apiBaseUrl(env), env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2", revisionReasons);
    return jsonResponse(request, { imageDataUrl });
  } catch (error) {
    console.error("bouquet_render_failed", error);
    return jsonResponse(request, { error: error instanceof Error ? error.message : "Rendering failed." }, 502);
  }
}

async function handleQa(request: Request, env: Env) {
  const blocked = apiGuard(request, env, "qa", 6);
  if (blocked) return blocked;
  try {
    const form = await request.formData();
    const reference = imageFromForm(form);
    const candidate = imageFromForm(form, "candidate");
    const analysis = analysisFromForm(form);
    const visionModel = env.OPENAI_VISION_MODEL ?? "gpt-5.4-mini";
    const qa = await evaluateBouquet(reference, await fileDataUrl(candidate), analysis, env.OPENAI_API_KEY, visionModel, apiBaseUrl(env));
    return jsonResponse(request, { qa });
  } catch (error) {
    console.error("bouquet_visual_qa_failed", error);
    return jsonResponse(request, { error: error instanceof Error ? error.message : "Visual QA failed." }, 502);
  }
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyse") return handleAnalyse(request, env);
    if (url.pathname === "/api/render") return handleRender(request, env);
    if (url.pathname === "/api/qa") return handleQa(request, env);
    if (url.pathname === "/api/generate") return jsonResponse(request, {
      error: "The generator now uses phased /api/analyse, /api/render and /api/qa requests.",
      code: "PHASED_GENERATION_REQUIRED",
    }, 409);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
