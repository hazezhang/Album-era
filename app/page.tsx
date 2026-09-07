"use client";

import { useRef, useState } from "react";
import { ArrowDown, Check, Download, Flower2, ImagePlus, RotateCcw, Sparkles } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

type Mode = "fresh" | "preserved";
type StyleId = "time" | "cherry" | "heavy" | "moss";
type Recipe = [string, string][];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const FALLBACK = ["#477aa7", "#e5d29b", "#8d502c", "#9db8c1", "#182a3b"];
const STYLES: Record<StyleId, {
  index: string; title: string; type: string; mood: string; cover: string; realCover?: boolean;
  bouquets: Record<Mode, string>; recipes: Record<Mode, Recipe>; shape: string;
}> = {
  time: {
    index: "01", title: "Time machine", type: "Dream pop study", mood: "Slate blue · cream · caramel",
    cover: `${BASE_PATH}/time-machine-source.jpeg`, realCover: true,
    bouquets: { fresh: `${BASE_PATH}/time-machine-fresh.png`, preserved: `${BASE_PATH}/time-machine-preserved.png` },
    recipes: {
      fresh: [["Garden rose", "focal · 5 stems"], ["Ranunculus", "secondary · 6 stems"], ["Delphinium", "line · 4 stems"], ["Hydrangea", "volume · 2 heads"], ["Cymbidium", "accent · 3 blooms"]],
      preserved: [["Preserved hydrangea", "volume · 3 heads"], ["Sola wood rose", "focal · 5 stems"], ["Banksia", "structure · 3 stems"], ["Dyed ruscus", "line · 4 stems"], ["Palm spear", "accent · 1 stem"]],
    },
    shape: "Asymmetrical, open silhouette with a soft central cluster.",
  },
  cherry: {
    index: "02", title: "Cherry static", type: "Pop study", mood: "Cherry red · powder pink · silver",
    cover: `${BASE_PATH}/cherry-static-cover.png`,
    bouquets: { fresh: `${BASE_PATH}/cherry-static-bouquet.png`, preserved: `${BASE_PATH}/cherry-static-preserved.png` },
    recipes: {
      fresh: [["Anthurium", "focal · 3 stems"], ["Ranunculus", "secondary · 7 stems"], ["Pink lily", "volume · 3 stems"], ["Silver brunia", "texture · 5 stems"], ["Oxblood foliage", "line · 4 stems"]],
      preserved: [["Red hydrangea", "volume · 3 heads"], ["Sola wood rose", "focal · 4 stems"], ["Dyed ruscus", "line · 5 stems"], ["Silver brunia", "texture · 5 stems"], ["Dried palm", "structure · 2 stems"]],
    },
    shape: "Tall fashion silhouette with two sharp structural accents.",
  },
  heavy: {
    index: "03", title: "Heavy weather", type: "Hip-hop study", mood: "Cobalt · tobacco · chrome",
    cover: `${BASE_PATH}/heavy-weather-cover.png`,
    bouquets: { fresh: `${BASE_PATH}/heavy-weather-bouquet.png`, preserved: `${BASE_PATH}/heavy-weather-preserved.png` },
    recipes: {
      fresh: [["Delphinium", "line · 5 stems"], ["Cymbidium", "focal · 4 stems"], ["Eryngium", "texture · 6 stems"], ["Anthurium", "structure · 2 stems"], ["Silver palm", "accent · 2 stems"]],
      preserved: [["Cobalt hydrangea", "volume · 2 heads"], ["Banksia", "focal · 3 stems"], ["Sola orchid", "light · 5 blooms"], ["Globe thistle", "texture · 7 stems"], ["Dried palm", "structure · 4 stems"]],
    },
    shape: "Lean vertical silhouette with hard metallic lines.",
  },
  moss: {
    index: "04", title: "Moss memory", type: "Indie study", mood: "Moss · parchment · faded blue",
    cover: `${BASE_PATH}/moss-memory-cover.png`,
    bouquets: { fresh: `${BASE_PATH}/moss-memory-bouquet.png`, preserved: `${BASE_PATH}/moss-memory-preserved.png` },
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
function matchStyle(palette: string[]): StyleId {
  const colours = palette.slice(0, 3).map(rgbFromHex);
  const [r, g, b] = colours.reduce((sum, colour) => sum.map((v, i) => v + colour[i]), [0, 0, 0]).map((v) => v / colours.length);
  if (g > r * 1.06 && g > b * 0.92) return "moss";
  if (r > g * 1.12 && r > b * 1.08) return "cherry";
  if (b > r * 1.04 || (b > g && r < 145)) return "time";
  return "heavy";
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
  if (!context) return { src, palette: FALLBACK };
  context.drawImage(image, 0, 0, 72, 72);
  const data = context.getImageData(0, 0, 72, 72).data;
  const counts = new Map<string, { rgb: number[]; count: number }>();
  for (let i = 0; i < data.length; i += 16) {
    const rgb = [data[i], data[i + 1], data[i + 2]].map((v) => Math.min(255, Math.round(v / 32) * 32));
    const key = rgb.join("-"); const old = counts.get(key);
    counts.set(key, { rgb, count: (old?.count ?? 0) + 1 });
  }
  const selected: number[][] = [];
  for (const item of [...counts.values()].sort((a, b) => b.count - a.count)) {
    if (selected.every((colour) => gap(colour, item.rgb) > 64)) selected.push(item.rgb);
    if (selected.length === 5) break;
  }
  return { src, palette: selected.length >= 3 ? selected.map(hex) : FALLBACK };
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
  const [name, setName] = useState("Untitled cover");
  const [palette, setPalette] = useState(FALLBACK);
  const [mode, setMode] = useState<Mode>("fresh");
  const [reading, setReading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("Reading the cover");
  const [matched, setMatched] = useState<StyleId | null>(null);

  async function select(file?: File) {
    if (!file) return;
    setReading(true); setMatched(null);
    try {
      const analysed = await readCover(file);
      setCover(analysed.src); setPalette(analysed.palette); setName(file.name.replace(/\.[^/.]+$/, ""));
      window.setTimeout(() => document.querySelector(".translate")?.scrollIntoView({ behavior: "smooth" }), 150);
    } finally { setReading(false); }
  }
  function reset() {
    setCover(null); setName("Untitled cover"); setPalette(FALLBACK); setMatched(null); setGenerating(false);
    if (input.current) input.current.value = "";
    document.querySelector("#studio")?.scrollIntoView({ behavior: "smooth" });
  }
  async function generate() {
    if (!cover || reading || generating) return;
    setGenerating(true); setMatched(null);
    const steps = [["Extracting colour hierarchy", 650], ["Matching floral structure", 750], ["Preparing the florist brief", 700]] as const;
    for (const [label, wait] of steps) {
      setGenerationStep(label);
      await new Promise((resolve) => window.setTimeout(resolve, wait));
    }
    setMatched(matchStyle(palette)); setGenerating(false);
    window.setTimeout(() => result.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }
  const output = matched ? STYLES[matched] : null;

  async function downloadCard() {
    if (!cover || !output) return;
    const canvas = document.createElement("canvas"); canvas.width = 1400; canvas.height = 900;
    const context = canvas.getContext("2d"); if (!context) return;
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
    });
    const [sourceImage, bouquetImage] = await Promise.all([load(cover), load(output.bouquets[mode])]);
    context.fillStyle = "#eee9dc"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#171916"; context.font = "24px Arial"; context.fillText("ALBUM / BOUQUET · FLORIST REFERENCE", 70, 70);
    context.font = "56px Georgia"; context.fillText(name.slice(0, 34), 70, 145);
    context.drawImage(sourceImage, 70, 205, 310, 310); context.drawImage(bouquetImage, 420, 205, 520, 520);
    palette.forEach((colour, index) => { context.fillStyle = colour; context.fillRect(70 + index * 62, 535, 62, 52); });
    context.fillStyle = "#171916"; context.font = "22px Arial"; context.fillText(`${mode.toUpperCase()} · ${output.title.toUpperCase()}`, 990, 225);
    output.recipes[mode].forEach(([flower, role], index) => {
      context.font = "25px Georgia"; context.fillText(`${String(index + 1).padStart(2, "0")}  ${flower}`, 990, 290 + index * 82);
      context.font = "17px Arial"; context.fillStyle = "#656861"; context.fillText(role, 1032, 318 + index * 82); context.fillStyle = "#171916";
    });
    context.font = "18px Arial"; context.fillText(output.shape, 70, 790);
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
          <small>Your image stays in this browser during the demo.</small>
        </div>
        <div className="workbench">
          <div className="cover-frame">{cover ? <img src={cover} alt="Uploaded album or song cover" /> : <div className="placeholder"><span>DROP</span><span>THE</span><span>COVER</span></div>}<b>01 / SOURCE</b></div>
          <aside className="dna">
            <div className="dna-title"><span>ALBUM DNA</span>{cover && <button onClick={reset} aria-label="Reset"><RotateCcw /></button>}</div>
            <h2>{reading ? "Reading image…" : name}</h2>
            <div className="palette" aria-label="Extracted colour palette">{palette.map((colour, index) => <i key={`${colour}-${index}`} style={{ background: colour }} />)}</div>
            <code>{palette.join(" · ").toUpperCase()}</code>
          </aside>
        </div>
      </section>

      <section className="translate">
        <div className="section-heading"><span>02</span><div><p className="eyebrow">CHOOSE THE MATERIAL</p><h2>How should it live?</h2></div></div>
        <div className="modes" role="radiogroup" aria-label="Bouquet material">
          <button className={mode === "fresh" ? "active" : ""} role="radio" aria-checked={mode === "fresh"} onClick={() => { setMode("fresh"); setMatched(null); }}><span>01</span><strong>Fresh flowers</strong><small>Seasonal, fragrant and alive. Includes florist substitutions.</small></button>
          <button className={mode === "preserved" ? "active" : ""} role="radio" aria-checked={mode === "preserved"} onClick={() => { setMode("preserved"); setMatched(null); }}><span>02</span><strong>Preserved flowers</strong><small>Long-lasting, sculptural and easier to recreate as a gift.</small></button>
        </div>
        <button className="build" disabled={!cover || reading || generating} onClick={generate}><span>{generating ? generationStep : "Generate my bouquet"}</span>{generating ? <Sparkles className="pulse" /> : <ArrowDown />}</button>
        {!cover && <small className="hint">Upload a cover first to unlock generation.</small>}
        {generating && <div className="generation-line"><i /></div>}
      </section>

      <section className={`result ${output ? "ready" : ""}`} ref={result} aria-live="polite">
        {output ? <>
          <div className="result-copy">
            <p className="eyebrow">YOUR BOUQUET · {mode.toUpperCase()}</p><h2>{output.title}</h2>
            <p>Matched from your cover’s palette to the <strong>{output.type}</strong> floral system.</p>
            <div className="result-palette">{palette.map((colour, index) => <i key={`${colour}-result-${index}`} style={{ background: colour }} />)}</div>
            <div className="result-actions"><button className="primary" onClick={downloadCard}><Download /> Download florist card</button><button onClick={reset}><RotateCcw /> Try another cover</button></div>
            <small>MVP demo: art-directed matching engine. Production will generate a unique arrangement for every cover.</small>
          </div>
          <div className="result-art">
            <div className="result-source"><img src={cover!} alt="Your uploaded cover" /><span>SOURCE</span></div>
            <div className="result-bouquet"><img src={output.bouquets[mode]} alt={`Generated ${mode} bouquet reference`} /><span>BOUQUET / {mode.toUpperCase()}</span></div>
          </div>
          <article className="florist-card">
            <header><div><small>FLORIST REFERENCE</small><h3>{name}</h3></div><code>{mode === "fresh" ? "FRESH / 01" : "PRESERVED / 02"}</code></header>
            <div className="florist-body">
              <div className="mini-source"><img src={cover!} alt="" /><span>{palette.map((colour, index) => <i key={`${colour}-card-${index}`} style={{ background: colour }} />)}</span></div>
              <div className="recipe"><small>MATERIAL RECIPE</small>{output.recipes[mode].map(([flower, role], index) => <div key={flower}><code>{String(index + 1).padStart(2, "0")}</code><strong>{flower}</strong><span>{role}</span></div>)}</div>
            </div>
            <footer><div><small>COLOUR RATIO</small><p>45% dominant · 25% light · 20% secondary · 10% accent</p></div><div><small>SHAPE</small><p>{output.shape}</p></div></footer>
            <div className="card-status"><Check /> Ready to show a florist</div>
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
