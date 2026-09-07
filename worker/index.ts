/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_VISION_MODEL?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

type BouquetMode = "fresh" | "preserved";

type BouquetAnalysis = {
  title: string;
  palette: string[];
  signatureColor: string;
  signatureColorRole: string;
  brightness: number;
  contrast: number;
  density: number;
  negativeSpace: number;
  warmth: number;
  mood: string;
  composition: string;
  shape: string;
  rationale: string;
  recipe: Array<{ flower: string; role: string; quantity: string }>;
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ORIGINS = new Set([
  "https://album-era.hazellfish-z.chatgpt.site",
  "https://hazezhang.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
]);
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const generationRequests = new Map<string, number[]>();

function isAllowedOrigin(request: Request) {
  return ALLOWED_ORIGINS.has(request.headers.get("Origin") ?? "");
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, value: unknown, status = 200) {
  return Response.json(value, { status, headers: corsHeaders(request) });
}

function responseText(payload: { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }) {
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) if (content.type === "output_text" && content.text) return content.text;
  }
  throw new Error("Vision model returned no analysis text.");
}

function cleanAnalysis(value: unknown): BouquetAnalysis {
  if (!value || typeof value !== "object") throw new Error("Vision model returned invalid JSON.");
  const raw = value as Record<string, unknown>;
  const number = (key: string, fallback: number) => Math.max(0, Math.min(100, Number(raw[key]) || fallback));
  const text = (key: string, fallback: string) => typeof raw[key] === "string" && raw[key] ? String(raw[key]).slice(0, 280) : fallback;
  const palette = Array.isArray(raw.palette)
    ? raw.palette.filter((item): item is string => typeof item === "string" && /^#[0-9a-f]{6}$/i.test(item)).slice(0, 5)
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
  const brightness = number("brightness", 50);
  const contrast = number("contrast", 50);
  const density = number("density", 50);
  const negativeSpace = number("negativeSpace", 50);
  const warmth = number("warmth", 50);
  const derivedMood = [
    brightness < 35 ? "nocturnal" : brightness > 68 ? "luminous" : "muted",
    contrast > 70 ? "dramatic" : contrast < 35 ? "soft" : "rhythmic",
    warmth > 62 ? "warm" : warmth < 38 ? "cool" : density > 65 ? "lush" : negativeSpace > 58 ? "airy" : "balanced",
  ].join(" · ");
  return {
    title: text("title", "Untitled arrangement"), palette, signatureColor,
    signatureColorRole: text("signatureColorRole", "the image's most identity-defining chromatic signal"),
    brightness, contrast, density, negativeSpace, warmth, mood: text("mood", derivedMood),
    composition: text("composition", "balanced asymmetry"), shape: text("shape", "Airy, asymmetric hand-tied silhouette."),
    rationale: text("rationale", "The bouquet translates the source image's visual hierarchy and atmosphere."), recipe,
  };
}

async function analyseReference(image: File, mode: BouquetMode, apiKey: string, model: string) {
  const encoded = await image.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer); let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  });
  const prompt = `You are an art director and expert florist. Analyse this image as a visual system to translate into a ${mode} flower bouquet. Do not merely list colours. Read dominant/secondary/accent colour ratios, light-dark distribution, contrast rhythm, density, negative-space placement, directional movement, depth and emotional temperature. Identify the single signature colour that carries the image's identity; it may be a saturated chromatic signal rather than the colour covering the most pixels. Choose realistic ${mode} botanical materials that a florist can source. The recipe must assign the signature colour to its largest mass flower and to at least one line flower; pale neutrals may not be the primary mass unless the signature colour itself is neutral. Return only valid JSON with exactly these keys: title (short evocative English name), palette (five lowercase #rrggbb colours ordered dominant to accent), signatureColor (one lowercase #rrggbb colour), signatureColorRole (why and where it defines the image), brightness, contrast, density, negativeSpace, warmth (integers 0-100), mood (three concise descriptors), composition, shape, rationale (max 45 words), recipe (five objects with flower, role, quantity). Avoid invented species.`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: `data:${image.type};base64,${encoded}`, detail: "high" }] }],
      max_output_tokens: 1200,
    }),
  });
  if (!response.ok) throw new Error(`Vision analysis failed (${response.status}).`);
  const payload = await response.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  const rawText = responseText(payload).replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  return cleanAnalysis(JSON.parse(rawText));
}

async function generateBouquet(image: File, mode: BouquetMode, analysis: BouquetAnalysis, apiKey: string) {
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("image[]", image, image.name || "reference.png");
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append("output_format", "jpeg");
  form.append("output_compression", "88");
  form.append("prompt", `Create one photorealistic editorial product photograph of a professionally constructed ${mode} hand-tied flower bouquet. The supplied image is a visual reference, not an object to copy. Preserve its visual relationships: palette ${analysis.palette.join(", ")} in dominant-to-accent order; brightness ${analysis.brightness}/100; contrast ${analysis.contrast}/100; density ${analysis.density}/100; negative space ${analysis.negativeSpace}/100; mood ${analysis.mood}; composition ${analysis.composition}; silhouette ${analysis.shape}. COLOR LOCK: ${analysis.signatureColor} is the signature colour because ${analysis.signatureColorRole}. It must be the unmistakable first-read colour and form one or two concentrated hero masses across roughly 55–70% of the visible flower-head area—not small scattered accents. The largest round mass flower and the tallest line flower must both display this exact signature colour. Match its saturation and value closely; do not mute it into grey, dusty lavender or pastel. Pale neutral flowers must remain small highlights and occupy no more than 15% of the flower area in total. A contrasting warm accent must remain below 3% unless it is itself the signature colour. Use the darkest palette colour for the simple studio background so the signature colour remains luminous. Use exactly this feasible material direction: ${analysis.recipe.map((item) => `${item.flower} (${item.quantity}, ${item.role})`).join("; ")}. Make the connection to the source immediately legible through colour proportion, tonal hierarchy, spatial rhythm, density zones, directional movement and emotional atmosphere—not through literal objects, text or logos. Botanical realism is mandatory: anatomically correct petals, clean separate stems, plausible branching, natural material surfaces, coherent wrapping and gravity. No malformed or fused petals, broken or duplicated stems, plastic/waxy texture, impossible flower species, floating elements, hands, people, vase, text, logo, watermark or decorative props.`);
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form,
  });
  if (!response.ok) throw new Error(`Bouquet generation failed (${response.status}).`);
  const payload = await response.json() as { data?: Array<{ b64_json?: string }> };
  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) throw new Error("Image model returned no image.");
  return `data:image/jpeg;base64,${base64}`;
}

async function handleGenerate(request: Request, env: Env) {
  if (!isAllowedOrigin(request)) return jsonResponse(request, { error: "Origin not allowed." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed." }, 405);
  if (!env.OPENAI_API_KEY) return jsonResponse(request, { error: "Generation service is not configured.", code: "NOT_CONFIGURED" }, 503);
  const now = Date.now();
  const clientId = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const recentRequests = (generationRequests.get(clientId) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return jsonResponse(request, { error: "Too many generations. Please try again in a few minutes." }, 429);
  }
  recentRequests.push(now);
  generationRequests.set(clientId, recentRequests);
  try {
    const form = await request.formData();
    const image = form.get("image");
    const mode = form.get("mode") === "preserved" ? "preserved" : "fresh";
    if (!(image instanceof File) || !ALLOWED_IMAGE_TYPES.has(image.type)) return jsonResponse(request, { error: "Upload a JPEG, PNG or WebP image." }, 400);
    if (image.size > MAX_UPLOAD_BYTES) return jsonResponse(request, { error: "Image must be 8 MB or smaller." }, 413);
    const analysis = await analyseReference(image, mode, env.OPENAI_API_KEY, env.OPENAI_VISION_MODEL ?? "gpt-5.4-mini");
    const imageDataUrl = await generateBouquet(image, mode, analysis, env.OPENAI_API_KEY);
    return jsonResponse(request, { imageDataUrl, analysis });
  } catch (error) {
    console.error("bouquet_generation_failed", error);
    return jsonResponse(request, { error: error instanceof Error ? error.message : "Generation failed." }, 502);
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

    if (url.pathname === "/api/generate") return handleGenerate(request, env);

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
