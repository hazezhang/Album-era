"use client";

import { useRef, useState } from "react";
import { ArrowDown, Check, Download, Flower2, ImagePlus, RotateCcw, Sparkles } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

type Mode = "fresh" | "preserved";
type StyleId = "time" | "cherry" | "heavy" | "moss";
type Recipe = [string, string][];
type VisualAnalysis = {
  brightness: number;
  contrast: number;
  saturation: number;
  density: number;
  negativeSpace: number;
  warmth: number;
  mood: string;
};
type GeneratedAnalysis = VisualAnalysis & {
  title: string;
  palette: string[];
  composition: string;
  shape: string;
  rationale: string;
  recipe: Array<{ flower: string; role: string; quantity: string }>;
};
type GeneratedBouquet = { imageDataUrl: string; analysis: GeneratedAnalysis };
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const GENERATION_API_URL = process.env.NEXT_PUBLIC_GENERATION_API_URL ?? `${BASE_PATH}/api/generate`;

const FALLBACK = ["#477aa7", "#e5d29b", "#8d502c", "#9db8c1", "#182a3b"];
const FALLBACK_ANALYSIS: VisualAnalysis = {
  brightness: 46, contrast: 58, saturation: 45, density: 50, negativeSpace: 42, warmth: 48,
  mood: "Quiet · cinematic · balanced",
};
const STYLES: Record<StyleId, {
  index: string; title: string; type: string; mood: string; cover: string; realCover?: boolean;
  bouquets: Record<Mode, string>; recipes: Record<Mode, Recipe>; shape: string;
}> = {
  time: {
    index: "01", title: "Lunar veil", type: "Ambient study", mood: "Midnight blue · pearl · amber",
    cover: `${BASE_PATH}/lunar-veil-cover.webp`,
    bouquets: { fresh: `${BASE_PATH}/lunar-veil-fresh.webp`, preserved: `${BASE_PATH}/lunar-veil-preserved.webp` },
    recipes: {
      fresh: [["White ranunculus", "focal · 5 stems"], ["Delphinium", "line · 5 stems"], ["Baby's breath", "air · 7 stems"], ["Silver foliage", "texture · 4 stems"], ["Amber poppy", "accent · 1 bloom"]],
      preserved: [["Preserved ranunculus", "focal · 4 stems"], ["Dried delphinium", "line · 5 stems"], ["Bleached gypsophila", "air · 7 stems"], ["Silver lunaria", "texture · 5 stems"], ["Dried poppy", "accent · 1 bloom"]],
    },
    shape: "Moonlit vertical silhouette with a light, translucent edge.",
  },
  cherry: {
    index: "02", title: "Cherry static", type: "Pop study", mood: "Cherry red · powder pink · silver",
    cover: `${BASE_PATH}/cherry-static-cover.webp`,
    bouquets: { fresh: `${BASE_PATH}/cherry-static-bouquet.webp`, preserved: `${BASE_PATH}/cherry-static-preserved.webp` },
    recipes: {
      fresh: [["Anthurium", "focal · 3 stems"], ["Ranunculus", "secondary · 7 stems"], ["Pink lily", "volume · 3 stems"], ["Silver brunia", "texture · 5 stems"], ["Oxblood foliage", "line · 4 stems"]],
      preserved: [["Red hydrangea", "volume · 3 heads"], ["Sola wood rose", "focal · 4 stems"], ["Dyed ruscus", "line · 5 stems"], ["Silver brunia", "texture · 5 stems"], ["Dried palm", "structure · 2 stems"]],
    },
    shape: "Tall fashion silhouette with two sharp structural accents.",
  },
  heavy: {
    index: "03", title: "Heavy weather", type: "Hip-hop study", mood: "Cobalt · tobacco · chrome",
    cover: `${BASE_PATH}/heavy-weather-cover.webp`,
    bouquets: { fresh: `${BASE_PATH}/heavy-weather-bouquet.webp`, preserved: `${BASE_PATH}/heavy-weather-preserved.webp` },
    recipes: {
      fresh: [["Delphinium", "line · 5 stems"], ["Cymbidium", "focal · 4 stems"], ["Eryngium", "texture · 6 stems"], ["Anthurium", "structure · 2 stems"], ["Silver palm", "accent · 2 stems"]],
      preserved: [["Cobalt hydrangea", "volume · 2 heads"], ["Banksia", "focal · 3 stems"], ["Sola orchid", "light · 5 blooms"], ["Globe thistle", "texture · 7 stems"], ["Dried palm", "structure · 4 stems"]],
    },
    shape: "Lean vertical silhouette with hard metallic lines.",
  },
  moss: {
    index: "04", title: "Moss memory", type: "Indie study", mood: "Moss · parchment · faded blue",
    cover: `${BASE_PATH}/moss-memory-cover.webp`,
    bouquets: { fresh: `${BASE_PATH}/moss-memory-bouquet.webp`, preserved: `${BASE_PATH}/moss-memory-preserved.webp` },
    recipes: {
      fresh: [["Hellebore", "focal · 5 stems"], ["Cosmos", "light · 6 stems"], ["Delphinium", "line · 3 stems"], ["Olive", "foliage · 5 stems"], ["Moss", "texture · 3 clusters"]],
      preserved: [["Sage hydrangea", "volume · 3 heads"], ["Sola cosmos", "focal · 4 stems"], ["Dried delphinium", "line · 3 stems"], ["Preserved olive", "foliage · 5 stems"], ["Moss", "texture · 4 clusters"]],
    },
    shape: "Airy meadow silhouette with one natural wandering branch.",
  },
};
const STUDY_ORDER: StyleId[] = ["time", "cherry", "heavy", "moss"];

function hex(rgb: number[]) {
  return `#${rgb.map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("")}`;
}
function gap(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}
function rgbFromHex(value: string) {
  return [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16));
}
function visualMood(analysis: Omit<VisualAnalysis, "mood">) {
  const light = analysis.brightness >= 58 ? "Luminous" : analysis.brightness <= 34 ? "Nocturnal" : "Muted";
  const energy = analysis.contrast >= 62 || analysis.density >= 64 ? "dramatic" : analysis.density <= 38 ? "quiet" : "rhythmic";
  const air = analysis.negativeSpace >= 55 ? "airy" : analysis.density >= 64 ? "lush" : "balanced";
  return `${light} · ${energy} · ${air}`;
}
function matchStyle(palette: string[], analysis: VisualAnalysis): StyleId {
  const colours = palette.slice(0, 3).map(rgbFromHex);
  const average = colours.reduce((sum, colour) => sum.map((v, i) => v + colour[i]), [0, 0, 0]).map((v) => v / colours.length);
  const [r, g, b] = average;
  const green = Math.max(0, (g - Math.max(r, b) * .82) / 90) * 100;
  const blue = Math.max(0, (b - r * .84) / 90) * 100;
  const red = Math.max(0, (r - Math.max(g, b) * .83) / 90) * 100;
  const distance = (value: number, target: number) => Math.abs(value - target);
  const scores: Record<StyleId, number> = {
    time: blue * .9 - distance(analysis.brightness, 38) * .35 - distance(analysis.density, 45) * .22 + analysis.negativeSpace * .1,
    cherry: red * 1.05 + analysis.saturation * .32 + analysis.warmth * .18 - distance(analysis.density, 66) * .18,
    heavy: analysis.contrast * .38 + analysis.density * .23 + (100 - analysis.brightness) * .2 + blue * .18 + analysis.warmth * .1,
    moss: green * 1.05 + (100 - analysis.saturation) * .13 + analysis.negativeSpace * .25 - distance(analysis.brightness, 50) * .16,
  };
  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as StyleId;
}
async function readCover(file: File) {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image(); next.onload = () => resolve(next); next.onerror = reject; next.src = src;
  });
  const canvas = document.createElement("canvas"); canvas.width = 72; canvas.height = 72;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { src, palette: FALLBACK, analysis: FALLBACK_ANALYSIS };
  context.drawImage(image, 0, 0, 72, 72);
  const data = context.getImageData(0, 0, 72, 72).data;
  const counts = new Map<string, { rgb: number[]; count: number }>();
  const luminance: number[] = [];
  let saturationTotal = 0; let warmthTotal = 0; let edgeTotal = 0; let calmPixels = 0;
  for (let pixel = 0; pixel < 72 * 72; pixel += 1) {
    const i = pixel * 4; const raw = [data[i], data[i + 1], data[i + 2]];
    const [r, g, b] = raw; const max = Math.max(r, g, b); const min = Math.min(r, g, b);
    const light = .2126 * r + .7152 * g + .0722 * b;
    luminance.push(light); saturationTotal += max ? (max - min) / max : 0;
    warmthTotal += Math.max(0, Math.min(1, .5 + (r - b) / 255));
    if (pixel % 4 !== 0) continue;
    const rgb = raw.map((v) => Math.min(255, Math.round(v / 32) * 32));
    const key = rgb.join("-"); const old = counts.get(key);
    counts.set(key, { rgb, count: (old?.count ?? 0) + 1 });
  }
  for (let y = 1; y < 72; y += 1) for (let x = 1; x < 72; x += 1) {
    const here = luminance[y * 72 + x];
    const delta = (Math.abs(here - luminance[y * 72 + x - 1]) + Math.abs(here - luminance[(y - 1) * 72 + x])) / 2;
    edgeTotal += delta; if (delta < 9) calmPixels += 1;
  }
  const mean = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
  const deviation = Math.sqrt(luminance.reduce((sum, value) => sum + (value - mean) ** 2, 0) / luminance.length);
  const baseAnalysis = {
    brightness: Math.round(mean / 2.55),
    contrast: Math.min(100, Math.round(deviation / .75)),
    saturation: Math.round(saturationTotal / luminance.length * 100),
    density: Math.min(100, Math.round(edgeTotal / ((71 * 71) * .32))),
    negativeSpace: Math.round(calmPixels / (71 * 71) * 100),
    warmth: Math.round(warmthTotal / luminance.length * 100),
  };
  const analysis = { ...baseAnalysis, mood: visualMood(baseAnalysis) };
  const selected: number[][] = [];
  for (const item of [...counts.values()].sort((a, b) => b.count - a.count)) {
    if (selected.every((colour) => gap(colour, item.rgb) > 64)) selected.push(item.rgb);
    if (selected.length === 5) break;
  }
  return { src, palette: selected.length >= 3 ? selected.map(hex) : FALLBACK, analysis };
}

function StudyCard({ id }: { id: StyleId }) {
  const study = STYLES[id];
  const [edition, setEdition] = useState<Mode>("fresh");
  return (
    <article className="study-card">
      <div className="study-images">
        <div className={`study-cover ${study.realCover ? "real-cover" : ""}`}>
          {study.realCover ? <img src={study.cover} alt="Time machine by mj apanay featuring aren park cover" /> :
            <><img src={study.cover} alt={`${study.title} fictional cover artwork`} /><div className="cover-type"><small>ALBUM / BOUQUET STUDY</small><strong>{study.title}</strong></div></>}
        </div>
        <div className="bouquet-stage">
          <img key={study.bouquets[edition]} className="study-bouquet" src={study.bouquets[edition]} alt={`${study.title} ${edition} bouquet`} />
          <div className="edition-switch" role="radiogroup" aria-label={`${study.title} bouquet material`}>
            <button className={edition === "fresh" ? "active" : ""} role="radio" aria-checked={edition === "fresh"} onClick={() => setEdition("fresh")}>FRESH</button>
            <button className={edition === "preserved" ? "active" : ""} role="radio" aria-checked={edition === "preserved"} onClick={() => setEdition("preserved")}>PRESERVED</button>
          </div>
        </div>
      </div>
      <footer><span>{study.index}</span><div><small>{study.type} · {edition}</small><h3>{study.title}</h3><p>{study.mood}</p></div><p>{study.recipes[edition].map(([flower]) => flower).join(" · ")}</p></footer>
    </article>
  );
}

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const result = useRef<HTMLElement>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [name, setName] = useState("Untitled cover");
  const [palette, setPalette] = useState(FALLBACK);
  const [analysis, setAnalysis] = useState(FALLBACK_ANALYSIS);
  const [mode, setMode] = useState<Mode>("fresh");
  const [reading, setReading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("Reading the cover");
  const [matched, setMatched] = useState<StyleId | null>(null);
  const [generated, setGenerated] = useState<GeneratedBouquet | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  async function select(file?: File) {
    if (!file) return;
    setReading(true); setMatched(null); setGenerated(null); setGenerationError(null); setSourceFile(file);
    try {
      const analysed = await readCover(file);
      setCover(analysed.src); setPalette(analysed.palette); setAnalysis(analysed.analysis); setName(file.name.replace(/\.[^/.]+$/, ""));
      window.setTimeout(() => document.querySelector(".translate")?.scrollIntoView({ behavior: "smooth" }), 150);
    } finally { setReading(false); }
  }
  function reset() {
    setCover(null); setSourceFile(null); setName("Untitled cover"); setPalette(FALLBACK); setAnalysis(FALLBACK_ANALYSIS); setMatched(null); setGenerated(null); setGenerationError(null); setGenerating(false);
    if (input.current) input.current.value = "";
    document.querySelector("#studio")?.scrollIntoView({ behavior: "smooth" });
  }
  async function generate() {
    if (!cover || !sourceFile || reading || generating) return;
    setGenerating(true); setMatched(null); setGenerated(null); setGenerationError(null);
    setGenerationStep("Reading colour, light and spatial rhythm");
    try {
      const form = new FormData(); form.append("image", sourceFile); form.append("mode", mode);
      window.setTimeout(() => setGenerationStep("Building a reference-led bouquet"), 1800);
      const response = await fetch(GENERATION_API_URL, { method: "POST", body: form });
      const payload = await response.json().catch(() => ({})) as Partial<GeneratedBouquet> & { error?: string };
      if (!response.ok || !payload.imageDataUrl || !payload.analysis) throw new Error(payload.error || "The live generator did not return a bouquet.");
      setGenerationStep("Checking botanical structure");
      setGenerated({ imageDataUrl: payload.imageDataUrl, analysis: payload.analysis });
      setPalette(payload.analysis.palette); setAnalysis(payload.analysis);
    } catch (error) {
      setMatched(matchStyle(palette, analysis));
      setGenerationError(error instanceof Error ? error.message : "Live generation failed.");
    } finally {
      setGenerating(false);
      window.setTimeout(() => result.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }
  const output = matched ? STYLES[matched] : null;
  const bouquetSrc = generated?.imageDataUrl ?? (output ? output.bouquets[mode] : null);
  const resultTitle = generated?.analysis.title ?? output?.title;
  const resultShape = generated?.analysis.shape ?? output?.shape;
  const resultRecipe: Recipe = generated
    ? generated.analysis.recipe.map((item) => [item.flower, `${item.role} · ${item.quantity}`])
    : output?.recipes[mode] ?? [];

  async function downloadCard() {
    if (!cover || !bouquetSrc || !resultTitle || !resultShape) return;
    const canvas = document.createElement("canvas"); canvas.width = 1400; canvas.height = 900;
    const context = canvas.getContext("2d"); if (!context) return;
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
    });
    const [sourceImage, bouquetImage] = await Promise.all([load(cover), load(bouquetSrc)]);
    context.fillStyle = "#eee9dc"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#171916"; context.font = "24px Arial"; context.fillText("ALBUM / BOUQUET · FLORIST REFERENCE", 70, 70);
    context.font = "56px Georgia"; context.fillText(name.slice(0, 34), 70, 145);
    context.drawImage(sourceImage, 70, 205, 310, 310); context.drawImage(bouquetImage, 420, 205, 520, 520);
    palette.forEach((colour, index) => { context.fillStyle = colour; context.fillRect(70 + index * 62, 535, 62, 52); });
    context.fillStyle = "#171916"; context.font = "22px Arial"; context.fillText(`${mode.toUpperCase()} · ${resultTitle.toUpperCase()}`, 990, 225);
    resultRecipe.forEach(([flower, role], index) => {
      context.font = "25px Georgia"; context.fillText(`${String(index + 1).padStart(2, "0")}  ${flower}`, 990, 290 + index * 82);
      context.font = "17px Arial"; context.fillStyle = "#656861"; context.fillText(role, 1032, 318 + index * 82); context.fillStyle = "#171916";
    });
    context.font = "18px Arial"; context.fillText(resultShape, 70, 775);
    context.fillStyle = "#656861"; context.font = "16px Arial";
    context.fillText(`${analysis.mood} · light ${analysis.brightness} · contrast ${analysis.contrast} · density ${analysis.density} · air ${analysis.negativeSpace}`, 70, 815);
    const link = document.createElement("a"); link.download = `${name || "album"}-${mode}-florist-card.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }

  return (
    <main>
      <header className="topbar"><a className="wordmark" href="#studio"><Flower2 /> ALBUM / BOUQUET</a><span>INTERACTIVE DEMO · 002</span></header>

      <section className="studio" id="studio">
        <div className="intro">
          <p className="eyebrow">A SONG, MADE PHYSICAL</p><h1>Turn a cover<br />into flowers.</h1>
          <p className="lede">Upload an album or song cover. Its colour, contrast and mood become a bouquet a florist can actually make.</p>
          <button className="upload" onClick={() => input.current?.click()} type="button"><ImagePlus />{cover ? "Choose another cover" : "Upload a cover"}</button>
          <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => select(event.target.files?.[0])} />
          <small>Your image is sent securely to the generation service and is not stored by this demo.</small>
        </div>
        <div className="workbench">
          <div className="cover-frame">{cover ? <img src={cover} alt="Uploaded album or song cover" /> : <div className="placeholder"><span>DROP</span><span>THE</span><span>COVER</span></div>}<b>01 / SOURCE</b></div>
          <aside className="dna">
            <div className="dna-title"><span>ALBUM DNA</span>{cover && <button onClick={reset} aria-label="Reset"><RotateCcw /></button>}</div>
            <h2>{reading ? "Reading image…" : name}</h2>
            <div className="palette" aria-label="Extracted colour palette">{palette.map((colour, index) => <i key={`${colour}-${index}`} style={{ background: colour }} />)}</div>
            <code>{palette.join(" · ").toUpperCase()}</code>
            {cover && <div className="visual-dna" aria-label="Visual analysis">
              <span><b>{analysis.brightness}</b> LIGHT</span><span><b>{analysis.contrast}</b> CONTRAST</span>
              <span><b>{analysis.density}</b> DENSITY</span><span><b>{analysis.negativeSpace}</b> AIR</span>
              <p>{analysis.mood}</p>
            </div>}
          </aside>
        </div>
      </section>

      <section className="translate">
        <div className="section-heading"><span>02</span><div><p className="eyebrow">CHOOSE THE MATERIAL</p><h2>How should it live?</h2></div></div>
        <div className="modes" role="radiogroup" aria-label="Bouquet material">
          <button className={mode === "fresh" ? "active" : ""} role="radio" aria-checked={mode === "fresh"} onClick={() => { setMode("fresh"); setMatched(null); setGenerated(null); setGenerationError(null); }}><span>01</span><strong>Fresh flowers</strong><small>Seasonal, fragrant and alive. Includes florist substitutions.</small></button>
          <button className={mode === "preserved" ? "active" : ""} role="radio" aria-checked={mode === "preserved"} onClick={() => { setMode("preserved"); setMatched(null); setGenerated(null); setGenerationError(null); }}><span>02</span><strong>Preserved flowers</strong><small>Long-lasting, sculptural and easier to recreate as a gift.</small></button>
        </div>
        <button className="build" disabled={!cover || reading || generating} onClick={generate}><span>{generating ? generationStep : "Generate my bouquet"}</span>{generating ? <Sparkles className="pulse" /> : <ArrowDown />}</button>
        {!cover && <small className="hint">Upload a cover first to unlock generation.</small>}
        {generating && <div className="generation-line"><i /></div>}
      </section>

      <section className={`result ${bouquetSrc ? "ready" : ""}`} ref={result} aria-live="polite">
        {bouquetSrc && resultTitle && resultShape ? <>
          <div className="result-copy">
            <p className="eyebrow">YOUR BOUQUET · {mode.toUpperCase()} · {generated ? "LIVE GENERATION" : "FALLBACK STUDY"}</p><h2>{resultTitle}</h2>
            <p>{generated ? "Generated from the uploaded image as a high-fidelity visual reference." : <>Live generation was unavailable, so this is the closest <strong>{output?.type}</strong> case study.</>}</p>
            <div className="match-note"><small>VISUAL TRANSLATION</small><p>{generated?.analysis.rationale ?? `${analysis.mood}. The fallback carries over light level, contrast rhythm, density and negative space—not only colour.`}</p></div>
            {generationError && <p className="generation-error">LIVE API FALLBACK · {generationError}</p>}
            <div className="result-palette">{palette.map((colour, index) => <i key={`${colour}-result-${index}`} style={{ background: colour }} />)}</div>
            <div className="result-actions"><button className="primary" onClick={downloadCard}><Download /> Download florist card</button><button onClick={reset}><RotateCcw /> Try another cover</button></div>
            <small>{generated ? "Unique API-generated reference. Review botanical feasibility with your florist." : "Fallback preview only — not an API-generated result."}</small>
          </div>
          <div className="result-art">
            <div className="result-source"><img src={cover!} alt="Your uploaded cover" /><span>SOURCE</span></div>
            <div className="result-bouquet"><img src={bouquetSrc} alt={`${generated ? "Generated" : "Fallback"} ${mode} bouquet reference`} /><span>BOUQUET / {mode.toUpperCase()}</span></div>
          </div>
          <article className="florist-card">
            <header><div><small>FLORIST REFERENCE</small><h3>{name}</h3></div><code>{mode === "fresh" ? "FRESH / 01" : "PRESERVED / 02"}</code></header>
            <div className="florist-body">
              <div className="mini-source"><img src={cover!} alt="" /><span>{palette.map((colour, index) => <i key={`${colour}-card-${index}`} style={{ background: colour }} />)}</span></div>
              <div className="recipe"><small>MATERIAL RECIPE</small>{resultRecipe.map(([flower, role], index) => <div key={`${flower}-${index}`}><code>{String(index + 1).padStart(2, "0")}</code><strong>{flower}</strong><span>{role}</span></div>)}</div>
            </div>
            <footer><div><small>COLOUR ORDER</small><p>Dominant → secondary → light → accent</p></div><div><small>SHAPE</small><p>{resultShape}</p></div></footer>
            <div className="card-status"><Check /> {generated ? "API generated · ready for review" : "Fallback study · generation unavailable"}</div>
          </article>
        </> : <div className="result-empty"><span>03</span><p>Your generated bouquet and florist brief will appear here.</p></div>}
      </section>

      <section className="demo-study" aria-labelledby="demo-title">
        <header><div><p className="eyebrow">TRANSLATION STUDIES · 001—004</p><h2 id="demo-title">A record shelf,<br />made botanical.</h2></div><p>Swipe across four music worlds. In every card, switch between fresh and preserved flowers without changing the cover.</p></header>
        <Carousel className="study-carousel" opts={{ align: "start", dragFree: true }}>
          <CarouselContent>{STUDY_ORDER.map((id) => <CarouselItem className="study-slide" key={id}><StudyCard id={id} /></CarouselItem>)}</CarouselContent>
          <div className="carousel-controls"><CarouselPrevious /><CarouselNext /></div>
        </Carousel>
      </section>
    </main>
  );
}
