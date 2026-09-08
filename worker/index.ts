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
  accentColor: string;
  accentColorRole: string;
  brightness: number;
  contrast: number;
  density: number;
  negativeSpace: number;
  warmth: number;
  darkMass: number;
  mood: string;
  composition: string;
  shape: string;
  structuralMotif: string;
  materialLanguage: string;
  culturalStyle: string;
  clicheRisks: string;
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
    title: text("title", "Untitled arrangement"), palette, signatureColor,
    signatureColorRole: text("signatureColorRole", "the image's most identity-defining chromatic signal"),
    accentColor,
    accentColorRole: text("accentColorRole", "a small but memorable contrasting signal"),
    brightness, contrast, density, negativeSpace, warmth, darkMass, mood: text("mood", derivedMood),
    composition: text("composition", "balanced asymmetry"), shape: text("shape", "Airy, asymmetric hand-tied silhouette."),
    structuralMotif: text("structuralMotif", "an off-centre focal mass interrupted by one dark line and one open void"),
    materialLanguage: text("materialLanguage", "matte botanicals contrasted with one translucent or reflective surface"),
    culturalStyle: text("culturalStyle", "contemporary editorial still life"),
    clicheRisks: text("clicheRisks", "symmetrical retail bouquet, predictable colour-matched roses, decorative filler and gift-shop wrapping"),
    rationale: text("rationale", "The bouquet translates the source image's visual hierarchy and atmosphere."), recipe,
  };
}

async function analyseReference(image: File, mode: BouquetMode, apiKey: string, model: string) {
  const encoded = await image.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer); let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  });
  const prompt = `You are an art director and expert florist. Analyse this image as a visual system to translate into a ${mode} editorial flower bouquet. Do not merely list colours or convert each colour into an obvious matching flower. Read dominant/secondary/accent colour ratios, the proportion and location of dark visual mass, light-dark distribution, contrast rhythm, density, negative-space placement, directional movement, depth, graphic geometry and emotional temperature. Identify the single signature colour that carries the image's identity; it may be a saturated chromatic signal rather than the colour covering the most pixels. Also identify the small contrasting accent colour that acts as the image's emotional punctuation and must not disappear. Match that accent hue literally: distinguish orange or amber from red and yellow, and never substitute one merely because all are warm. Describe the source's STRUCTURAL MOTIF: the strongest silhouette, crop, diagonal, frame, void, repetition or tension that should determine the bouquet's architecture. Describe its MATERIAL LANGUAGE: matte versus glossy, opaque versus transparent, soft versus hard, organic versus synthetic and any reflected-light quality. Describe its CULTURAL STYLE: era, music/fashion/editorial energy and degree of polish without naming or reproducing a person. Name the specific CLICHE RISKS that would make this source become a generic florist product. Choose realistic ${mode} botanical and limited florist construction materials that can carry those shapes and surfaces. Do not default to hydrangea, roses or colour-matched wrapping merely because they are easy palette matches. The recipe must assign the signature colour family to a shape-bearing material, preserve the dark mass with a real structural role when it is visually important, and assign the accent colour to one to three precise focal events. Pale neutrals may not become the primary mass unless the signature colour itself is neutral. Return only valid JSON with exactly these keys: title (short evocative English name), palette (five lowercase #rrggbb colours ordered dominant to accent), signatureColor (one lowercase #rrggbb colour), signatureColorRole (why and where it defines the image), accentColor (one lowercase #rrggbb colour), accentColorRole (why its small contrast matters), brightness, contrast, density, negativeSpace, warmth, darkMass (integers 0-100), mood (three concise descriptors), composition, shape, structuralMotif, materialLanguage, culturalStyle, clicheRisks, rationale (max 45 words), recipe (five objects with flower, role, quantity). Avoid invented species and decorative props.`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: `data:${image.type};base64,${encoded}`, detail: "high" }] }],
      max_output_tokens: 1600,
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
  form.append("prompt", `Create one photorealistic editorial studio photograph of a professionally constructed ${mode} hand-tied flower bouquet. The supplied image is a visual reference, not an object, face or scene to copy. This must feel like a fashion or album-cover art direction translated into flowers, never a conventional gift-shop bouquet.

VISUAL THESIS: ${analysis.culturalStyle}. Structural motif: ${analysis.structuralMotif}. Material language: ${analysis.materialLanguage}. Rebuild those relationships physically through the bouquet's silhouette, voids, planes, line gestures and surfaces. Preserve palette ${analysis.palette.join(", ")} in dominant-to-accent order; brightness ${analysis.brightness}/100; contrast ${analysis.contrast}/100; density ${analysis.density}/100; negative space ${analysis.negativeSpace}/100; dark visual mass ${analysis.darkMass}/100; mood ${analysis.mood}; composition ${analysis.composition}; silhouette ${analysis.shape}. Do not make colour matching the only connection.

ANTI-GENERIC COMPOSITION: use a deliberately asymmetric, off-centre editorial silhouette with one unmistakable graphic interruption, one controlled negative-space opening and no evenly distributed ring of flowers. Avoid these source-specific clichés: ${analysis.clicheRisks}. No default round hydrangea centre, evenly spaced roses, supermarket filler, pastel-on-pastel sweetness, symmetrical dome, bridal styling, or colour-matched wrapping used as a substitute for floral design. Wrapping must act as one or two clean graphic planes, not layered decorative ruffles.

COLOUR AND SHADOW: ${analysis.signatureColor} is the signature colour because ${analysis.signatureColorRole}; make it immediately recognisable through one concentrated shape-bearing gesture, not a uniform wash. Preserve the darkest palette colour as a substantial matte structural anchor or deep internal void in proportion to the source's ${analysis.darkMass}/100 dark mass; do not brighten it away. Build the main colour as a tonal ladder with dark and mid-value versions carrying most of the area and only a few luminous highlights. ${analysis.accentColor} matters because ${analysis.accentColorRole}; preserve its exact hue as a visible 3–5% punctuation in one to three precise focal events. It must survive at thumbnail size without becoming a second main colour.

MATERIAL TENSION: include at least one hard, clean or reflective/transparent florist material only where supported by the stated material language, contrasted against believable botanical softness. Use it as structure or reflected-light rhythm, never as a decorative prop. Use this feasible material direction: ${analysis.recipe.map((item) => `${item.flower} (${item.quantity}, ${item.role})`).join("; ")}.

BACKGROUND LOCK: isolate the bouquet against one seamless matte studio background using the darkest palette colour, solid or with only an extremely subtle shapeless tonal gradient. The only other visible elements may be coherent wrapping and a soft natural contact shadow. No scenery, architecture, landscape, plants outside the bouquet, fog, rain, bokeh, light orbs, windows, furniture, textural surfaces, decorative objects or props. Botanical realism is mandatory: anatomically correct petals, clean separate stems, plausible branching, natural surfaces, coherent wrapping and gravity. No malformed or fused petals, broken or duplicated stems, impossible species, floating elements, hands, people, faces, vase, text, logo or watermark.`);
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
