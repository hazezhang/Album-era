export type BouquetMode = "fresh" | "preserved";

export type BouquetAnalysis = {
  title: string;
  palette: string[];
  dominantColorWorld: string;
  supportingHue: string;
  shadowNeutral: string;
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
  primaryGesture: string;
  spatialLogic: string;
  dominantTension: string;
  composition: string;
  shape: string;
  materialLanguage: string;
  constructionPlan: string;
  packaging: string;
  lightingBackground: string;
  culturalStyle: string;
  humanInterferenceRemoved: string;
  rationale: string;
  recipe: Array<{ flower: string; role: string; quantity: string }>;
};

export type BouquetQa = {
  pass: boolean;
  hardRejectReasons: string[];
  referenceFidelity: string;
  artDirection: string;
  visualQuality: string;
  feasibility: string;
  backgroundConsistency: string;
  primaryGestureVisible: boolean;
  ordinaryFloristWouldNotDo: string;
};

const NEGATIVE_CONSTRAINTS = [
  "conventional round bouquet",
  "symmetrical florist arrangement",
  "evenly distributed flowers",
  "central hydrangea mass",
  "uniformly scattered roses",
  "lush filler flowers",
  "rainbow colour balance",
  "excessive natural green",
  "layered ruffled wrapping",
  "wedding bouquet aesthetic",
  "luxury florist advertisement",
  "ecommerce product photography",
  "excessive gloss",
  "uniformly saturated petals",
  "background scenery",
  "unnecessary decorative props",
];

export function buildAnalysisPrompt(mode: BouquetMode) {
  return `You are the visual-analysis stage of an album-art-to-bouquet system. Analyse the reference as a designed visual system, not as a list of depicted objects. The goal is an editorial object / album artwork translated into floral sculpture, not a luxury florist bouquet.

Read in this order: overall brightness; environmental colour cast and temperature; largest colour field and atmosphere-defining dark weight; subject-to-environment area relationship; light and shadow; composition; material language; styled clothing/architecture/objects; local semantic details.

PORTRAIT DE-BIASING: when a person appears, environment, clothing, light, temperature and composition outrank accessories, which outrank skin, facial features and ordinary hair colour. Black hair, skin, eyes and facial shadows are human defaults: exclude them from the palette and darkMass unless an unusual colour, silhouette or repeated role makes them essential to the whole composition. State what interference you removed.

Extract exactly ONE Primary Gesture by asking: what is the single most valuable abnormal visual action in this image? It may be a void, off-centre mass, isolated accent, occlusion, extreme extension, fracture, scale imbalance or soft/hard conflict. Do not invent several equal creative ideas. All later choices must serve this one gesture.

Compress colour into 3–4 functional roles: dominant colour world, supporting hue, shadow/neutral and accent. Preserve internal dark/mid/light hierarchy within the dominant world. Keep the accent's literal hue and restrict it to 1–3 events. Describe colour by its behaviour before selecting materials; never map blue→hydrangea, pink→rose, black→black flower, green→foliage or white→white rose automatically.

Choose a spatial logic such as compressed, off-axis, vertical, falling, fragmented, blocked, split, void-led or sculptural asymmetry. Space outranks fullness. Select realistic ${mode} florals and florist-available construction materials by shape, spatial role and surface before colour or species. Every material must be purchasable, cuttable, bindable and stable in a hand-tied bouquet. No architectural screens, walls, backdrop mesh, unsupported plates or free-standing scenic structures. Keep the recipe limited and feasible, and state how non-floral elements connect to the binding point.

Return only valid JSON with exactly these keys: title, palette (3–4 lowercase #rrggbb colours in dominant/support/shadow/accent order), dominantColorWorld (description plus dark/mid/light behaviour), supportingHue, shadowNeutral, signatureColor (lowercase #rrggbb), signatureColorRole, accentColor (lowercase #rrggbb), accentColorRole, brightness, contrast, density, negativeSpace, warmth, darkMass (0–100 integers, excluding incidental human features), mood (three concise descriptors), primaryGesture (one sentence, one action only), spatialLogic, dominantTension, composition, shape, materialLanguage, constructionPlan (one sentence explaining attachment, support and hand-held feasibility), packaging, lightingBackground (light direction and shadow only; background is fixed elsewhere), culturalStyle, humanInterferenceRemoved, rationale (max 45 words), recipe (3–5 objects with flower, role, quantity). No markdown.`;
}

export function buildGenerationPrompt(mode: BouquetMode, analysis: BouquetAnalysis, revisionReasons: string[] = []) {
  const revision = revisionReasons.length
    ? `\nREVISION TARGET: the previous candidate was rejected for: ${revisionReasons.join("; ")}. Correct only these failures while preserving the source analysis and its single Primary Gesture.\n`
    : "";
  return `Create one photorealistic editorial floral sculpture using the supplied image only as a visual reference. Do not reproduce its person, objects or scene. Do not begin from flower names.

1. PRIMARY GESTURE: ${analysis.primaryGesture}. Make this the one memorable decision; every other element is subordinate.

2. SPATIAL COMPOSITION: ${analysis.spatialLogic}. ${analysis.composition}. Preserve deliberate void, imbalance, crop, occlusion or extension instead of filling empty areas.

3. DOMINANT TENSION: ${analysis.dominantTension}. Keep one controlled wrongness; do not add several competing tricks.

4. BRIGHTNESS / TEMPERATURE: brightness ${analysis.brightness}/100, warmth ${analysis.warmth}/100, contrast ${analysis.contrast}/100, mood ${analysis.mood}. Preserve the reference's high-, mid- or low-key atmosphere. If a person is present, ignore ordinary hair, skin, eyes and facial shadow as colour or darkness instructions. Removed interference: ${analysis.humanInterferenceRemoved}.

5. COLOR HIERARCHY: palette ${analysis.palette.join(", ")}. Dominant world: ${analysis.dominantColorWorld}. Supporting hue: ${analysis.supportingHue}. Shadow/neutral: ${analysis.shadowNeutral}. Signature ${analysis.signatureColor}: ${analysis.signatureColorRole}. Accent ${analysis.accentColor}: ${analysis.accentColorRole}; keep its literal hue visible in only 1–3 small events. The dominant colour must have dark/mid/light layers and must not be made louder by maximising area, saturation and brightness at once.

6. SILHOUETTE: ${analysis.shape}. Do not default to an upper-wide, lower-narrow fan or formulaic asymmetry.

7. MATERIAL BEHAVIOR: ${analysis.materialLanguage}. Use only florist-available flowers, branches, leaves, matte florist paper, translucent waterproof paper or acetate, organza, floral wire, narrow reeds and commercially available preserved or sprayed botanical materials. Use them for graphic shape, void, occlusion, reflection and texture—not as decoration. The finished object must be physically buildable, liftable and hand-held by one person. Every non-floral element must remain within a plausible bouquet scale and visibly connect to stems, taped wire, a reed support or the binding point. No mesh wall, perforated screen, architectural backdrop, free-standing panel, heavy metal sheet, impossible floating plane or material that functions as scenery. Construction: ${analysis.constructionPlan}.

8. FLORAL ELEMENTS: use a limited, botanically feasible set treated as sculptural forms: ${analysis.recipe.map((item) => `${item.flower} (${item.quantity}, ${item.role})`).join("; ")}. It is acceptable for flowers to occupy only one third of the visible object. Remove anything used only to fill space or appear rich.

9. PACKAGING: ${analysis.packaging}. Packaging is a compositional plane, not a gift border. It may be incomplete, one-sided, folded, translucent, occluding or mostly behind the flowers, but it must be cut from real florist paper or film and secured at the bouquet's binding point. Stems may remain exposed. Do not enlarge packaging into a wall, floor or background.

10. LIGHTING / BACKGROUND: use the same seamless matte light neutral-grey studio background, approximately #d8d8d4, for every generated result. The background is fixed across the series and must not inherit the reference palette, Primary Gesture, pattern or material. It contains only a subtle natural contact shadow. ${analysis.lightingBackground}. Use editorial crop and directional light when they serve the Primary Gesture, while keeping pale and dark materials clearly separated from the neutral background.
${revision}
11. NEGATIVE CONSTRAINTS: no ${NEGATIVE_CONSTRAINTS.join(", no ")}. No coloured or patterned background, mesh wall, perforated screen, architectural plane, scenic construction, people, faces, hands, vase, text, logo, watermark, malformed petals, fused flowers, duplicated or broken stems, floating elements or impossible species.`;
}

export function buildQaPrompt(analysis: BouquetAnalysis) {
  return `Compare IMAGE 1 (reference) with IMAGE 2 (generated bouquet). Judge the bouquet under Album / Bouquet Runtime Aesthetic Spec v2.0. Do not reward prettiness, expensive flowers or simple colour matching.

Expected single Primary Gesture: ${analysis.primaryGesture}
Expected spatial logic: ${analysis.spatialLogic}
Expected dominant tension: ${analysis.dominantTension}
Expected palette roles: ${analysis.dominantColorWorld}; ${analysis.supportingHue}; ${analysis.shadowNeutral}; accent ${analysis.accentColor}
Reference brightness/warmth: ${analysis.brightness}/100 and ${analysis.warmth}/100
Human interference that must remain excluded: ${analysis.humanInterferenceRemoved}

Hard reject if ANY applies: correct colours but ordinary gift bouquet; dominant colour is a large uniformly saturated wash; accent hue is missing; background is not the fixed seamless matte light neutral grey; background copies any reference colour, pattern, gesture or scene; incidental hair/skin/features dominate; flowers are evenly scattered; all space is filled; layered traditional gift wrapping; no clearly visible Primary Gesture; any mesh wall, perforated screen, backdrop structure, unsupported plane or scenic material appears; any element cannot be purchased, cut, wired, tied and hand-held as a real bouquet.

Also ask: would the composition survive if expensive flowers were replaced with ordinary materials? What exact decision would an ordinary florist usually not make?

Return only JSON with exactly: pass (boolean), hardRejectReasons (array of short strings), referenceFidelity (one sentence), artDirection (one sentence), visualQuality (one sentence), feasibility (one sentence about how the object can actually be made and held), backgroundConsistency (one sentence), primaryGestureVisible (boolean), ordinaryFloristWouldNotDo (one concrete but physically feasible decision). Pass must be false when hardRejectReasons is non-empty.`;
}
