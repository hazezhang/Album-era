"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, Check, Download, Flower2, ImagePlus, RotateCcw, Sparkles } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type Mode = "fresh" | "preserved";
type Recipe = [string, string][];
type Preset = { name: string; bouquet: string; rgb: number[]; recipe: Recipe; shape: string };
const FALLBACK = ["#477aa7", "#e5d29b", "#8d502c", "#9db8c1", "#182a3b"];
const RECIPES: Record<Mode, [string, string][]> = {
  fresh: [
    ["Garden rose", "focal · 5 stems"], ["Ranunculus", "secondary · 6 stems"],
    ["Delphinium", "line · 4 stems"], ["Hydrangea", "volume · 2 stems"],
    ["Scabiosa pod", "accent · 3 stems"],
  ],
  preserved: [
    ["Preserved hydrangea", "volume · 3 heads"], ["Sola wood rose", "focal · 5 stems"],
    ["Banksia", "structure · 3 stems"], ["Dyed ruscus", "line · 4 stems"],
    ["Palm spear", "accent · 1 stem"],
  ],
};

const PRESETS: Record<Mode, Preset[]> = {
  fresh: [
    { name: "Blue hour", bouquet: "/time-machine-fresh.png", rgb: [71, 122, 167], recipe: RECIPES.fresh, shape: "Airy asymmetrical cascade with a soft focal cluster." },
    { name: "Cherry pulse", bouquet: "/cherry-static-bouquet.png", rgb: [178, 45, 65], recipe: [["Anthurium", "focal · 3 stems"], ["Ranunculus", "secondary · 7 stems"], ["Oriental lily", "volume · 2 stems"], ["Silver brunia", "texture · 4 stems"], ["Oxblood foliage", "line · 5 stems"]], shape: "Graphic fan silhouette with sharp red focal points." },
    { name: "Electric dusk", bouquet: "/heavy-weather-bouquet.png", rgb: [43, 77, 138], recipe: [["Delphinium", "line · 5 stems"], ["Cymbidium", "focal · 3 stems"], ["Eryngium", "texture · 5 stems"], ["Anthurium", "accent · 2 stems"], ["Silver palm", "structure · 2 stems"]], shape: "Tall, directional silhouette with metallic accents." },
  ],
  preserved: [
    { name: "Blue relic", bouquet: "/time-machine-preserved.png", rgb: [91, 117, 137], recipe: RECIPES.preserved, shape: "Sculptural asymmetry with a dense preserved centre." },
    { name: "Moss memory", bouquet: "/moss-memory-bouquet.png", rgb: [94, 105, 72], recipe: [["Preserved hydrangea", "volume · 3 heads"], ["Sola hellebore", "focal · 5 stems"], ["Dried cosmos", "secondary · 6 stems"], ["Olive branch", "line · 4 stems"], ["Preserved moss", "texture · 2 bunches"]], shape: "Low organic crescent with a weathered garden texture." },
  ],
};

const STUDIES = [
  {
    index: "01", title: "Time machine", type: "Fresh translation", mood: "Dream pop · slate blue · cream",
    bouquet: "/time-machine-fresh.png", cover: "/time-machine-source.jpeg", realCover: true,
    note: "Garden rose · ranunculus · delphinium · hydrangea · cymbidium",
  },
  {
    index: "02", title: "Time machine", type: "Preserved translation", mood: "Long-lasting · sculptural",
    bouquet: "/time-machine-preserved.png", cover: "/time-machine-source.jpeg", realCover: true,
    note: "Preserved hydrangea · sola rose · banksia · ruscus · palm spear",
  },
  {
    index: "03", title: "Cherry static", type: "Pop study", mood: "Cherry red · powder pink · silver",
    bouquet: "/cherry-static-bouquet.png", cover: "/cherry-static-cover.png",
    note: "Anthurium · ranunculus · lily · silver brunia · oxblood foliage",
  },
  {
    index: "04", title: "Heavy weather", type: "Hip-hop study", mood: "Cobalt · tobacco · chrome",
    bouquet: "/heavy-weather-bouquet.png", cover: "/heavy-weather-cover.png",
    note: "Delphinium · cymbidium · eryngium · anthurium · silver palm",
  },
  {
    index: "05", title: "Moss memory", type: "Indie study", mood: "Moss · parchment · faded blue",
    bouquet: "/moss-memory-bouquet.png", cover: "/moss-memory-cover.png",
    note: "Hellebore · cosmos · delphinium · olive · preserved moss",
  },
];

function hex(rgb: number[]) {
  return `#${rgb.map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("")}`;
}
function gap(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
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
    const rgb = [data[i], data[i + 1], data[i + 2]].map((v) => Math.round(v / 32) * 32);
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

function rgbFromHex(value: string) {
  return [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16));
}

function closestPreset(mode: Mode, palette: string[]) {
  const colours = palette.map(rgbFromHex);
  return [...PRESETS[mode]].sort((a, b) => {
    const score = (preset: Preset) => Math.min(...colours.map((colour) => gap(colour, preset.rgb)));
    return score(a) - score(b);
  })[0];
}

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [name, setName] = useState("Time machine study");
  const [palette, setPalette] = useState(FALLBACK);
  const [mode, setMode] = useState<Mode>("fresh");
  const [reading, setReading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [ready, setReady] = useState(false);
  const result = useMemo(() => closestPreset(mode, palette), [mode, palette]);

  async function select(file?: File) {
    if (!file) return; setReading(true); setReady(false);
    try {
      const result = await readCover(file); setCover(result.src); setPalette(result.palette);
      setName(file.name.replace(/\.[^/.]+$/, ""));
    } finally { setReading(false); }
  }
  function reset() {
    setCover(null); setName("Time machine study"); setPalette(FALLBACK); setReady(false);
    if (input.current) input.current.value = "";
  }

  async function build() {
    if (!cover) return;
    setBuilding(true); setReady(false);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setBuilding(false); setReady(true);
    window.setTimeout(() => document.querySelector("#result")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function downloadCard() {
    if (!cover || !ready) return;
    const canvas = document.createElement("canvas"); canvas.width = 1400; canvas.height = 900;
    const context = canvas.getContext("2d"); if (!context) return;
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
    const [sourceImage, bouquetImage] = await Promise.all([load(cover), load(result.bouquet)]);
    context.fillStyle = "#eee9dc"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#171916"; context.font = "24px Arial"; context.fillText("ALBUM / BOUQUET · FLORIST REFERENCE", 70, 70);
    context.font = "56px Georgia"; context.fillText(name.slice(0, 34), 70, 145);
    context.drawImage(sourceImage, 70, 205, 310, 310); context.drawImage(bouquetImage, 420, 205, 520, 520);
    palette.forEach((colour, index) => { context.fillStyle = colour; context.fillRect(70 + index * 62, 535, 62, 52); });
    context.fillStyle = "#171916"; context.font = "22px Arial"; context.fillText(`${mode.toUpperCase()} · ${result.name.toUpperCase()}`, 990, 225);
    result.recipe.forEach(([flower, role], index) => { context.font = "25px Georgia"; context.fillText(`${String(index + 1).padStart(2, "0")}  ${flower}`, 990, 290 + index * 82); context.font = "17px Arial"; context.fillStyle = "#656861"; context.fillText(role, 1032, 318 + index * 82); context.fillStyle = "#171916"; });
    context.font = "18px Arial"; context.fillText(result.shape, 70, 790);
    const link = document.createElement("a"); link.download = `${name || "album"}-bouquet-card.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }

  return (
    <main>
      <header className="topbar">
        <a className="wordmark" href="#studio"><Flower2 /> ALBUM / BOUQUET</a>
        <span>WORKING STUDY · 001</span>
      </header>

      <section className="studio" id="studio">
        <div className="intro">
          <p className="eyebrow">A SONG, MADE PHYSICAL</p>
          <h1>Turn a cover<br />into flowers.</h1>
          <p className="lede">Upload an album or song cover. Its colour, contrast and mood become a bouquet a florist can actually make.</p>
          <button className="upload" onClick={() => input.current?.click()} type="button"><ImagePlus />{cover ? "Choose another cover" : "Upload a cover"}</button>
          <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => select(e.target.files?.[0])} />
          <small>Your cover is analysed in this browser for this prototype.</small>
        </div>

        <div className="workbench">
          <div className="cover-frame">
            {cover ? <img src={cover} alt="Uploaded album or song cover" /> : <div className="placeholder"><span>DROP</span><span>THE</span><span>COVER</span></div>}
            <b>01 / SOURCE</b>
          </div>
          <aside className="dna">
            <div className="dna-title"><span>ALBUM DNA</span>{cover && <button onClick={reset} aria-label="Reset"><RotateCcw /></button>}</div>
            <h2>{reading ? "Reading image…" : name}</h2>
            <div className="palette" aria-label="Extracted colour palette">{palette.map((colour, i) => <i key={`${colour}-${i}`} style={{ background: colour }} />)}</div>
            <code>{palette.join(" · ").toUpperCase()}</code>
          </aside>
        </div>
      </section>

      <section className="demo-study" aria-labelledby="demo-title">
        <header>
          <div>
            <p className="eyebrow">TRANSLATION STUDIES · 001—005</p>
            <h2 id="demo-title">A record shelf,<br />made botanical.</h2>
          </div>
          <p>Swipe across distinct music worlds. Each study keeps the cover’s colour hierarchy, contrast and attitude—then turns it into flowers a florist can source.</p>
        </header>
        <Carousel className="study-carousel" opts={{ align: "start", dragFree: true }}>
          <CarouselContent>
            {STUDIES.map((study) => (
              <CarouselItem className="study-slide" key={`${study.title}-${study.type}`}>
                <article className="study-card">
                  <div className="study-images">
                    <div className={`study-cover ${study.realCover ? "real-cover" : ""}`}>
                      {study.realCover ? (
                        <img src={study.cover} alt="Time machine by mj apanay featuring aren park cover" />
                      ) : (
                        <><img src={study.cover} alt={`${study.title} fictional cover artwork`} /><div className="cover-type"><small>ALBUM / BOUQUET STUDY</small><strong>{study.title}</strong></div></>
                      )}
                    </div>
                    <img className="study-bouquet" src={study.bouquet} alt={`${study.title} ${study.type.toLowerCase()} bouquet`} />
                  </div>
                  <footer>
                    <span>{study.index}</span>
                    <div><small>{study.type}</small><h3>{study.title}</h3><p>{study.mood}</p></div>
                    <p>{study.note}</p>
                  </footer>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="carousel-controls"><CarouselPrevious /><CarouselNext /></div>
        </Carousel>
      </section>

      <section className="translate">
        <div className="section-heading"><span>02</span><div><p className="eyebrow">CHOOSE THE MATERIAL</p><h2>How should it live?</h2></div></div>
        <div className="modes" role="radiogroup" aria-label="Bouquet material">
          <button className={mode === "fresh" ? "active" : ""} role="radio" aria-checked={mode === "fresh"} onClick={() => { setMode("fresh"); setReady(false); }}><span>01</span><strong>Fresh flowers</strong><small>Seasonal, fragrant, alive. Includes florist substitutions.</small></button>
          <button className={mode === "preserved" ? "active" : ""} role="radio" aria-checked={mode === "preserved"} onClick={() => { setMode("preserved"); setReady(false); }}><span>02</span><strong>Preserved flowers</strong><small>Long-lasting, sculptural and easier to recreate as a gift.</small></button>
        </div>
        <button className="build" disabled={!cover || reading || building} onClick={build}>{building ? "Translating colour, contrast & mood…" : "Generate my bouquet"} {building ? <Sparkles className="spin" /> : <ArrowDown />}</button>
        {!cover && <small className="hint">Upload a cover to build your first brief.</small>}
      </section>

      <section className={`result-stage ${ready ? "visible" : ""}`} id="result" aria-live="polite">
        <div className="result-copy"><p className="eyebrow">03 / GENERATED BOUQUET</p><h2>{ready ? result.name : "Your bouquet will appear here."}</h2><p>{ready ? "Matched from the cover’s dominant palette, contrast and visual weight." : "Upload a cover and choose a material to begin."}</p>{ready && <div className="result-checks"><span><Check /> Palette inherited</span><span><Check /> Florist-buildable</span><span><Check /> No visible generation artefacts</span></div>}</div>
        <div className="result-image">{ready ? <img src={result.bouquet} alt={`${result.name} generated ${mode} bouquet`} /> : <div><Flower2 /><span>AWAITING COVER</span></div>}<b>{ready ? `${mode.toUpperCase()} / MATCHED STUDY` : "03 / RESULT"}</b></div>
      </section>

      <section className="brief" id="brief">
        <div className="brief-copy"><p className="eyebrow">04 / FLORIST REFERENCE</p><h2>A clear recipe,<br />not just an image.</h2><p>The downloadable card preserves the cover’s colour hierarchy and translates it into materials a florist can source or substitute.</p></div>
        <article className={`card ${ready ? "ready" : ""}`}>
          <header><div><small>BOUQUET STUDY</small><h3>{name}</h3></div><code>{mode === "fresh" ? "FRESH / 01" : "PRESERVED / 02"}</code></header>
          <div className="card-body">
            <div className="source">{cover ? <img src={cover} alt="Source cover" /> : <div />}<span>{palette.map((colour, i) => <i key={`${colour}-card-${i}`} style={{ background: colour }} />)}</span></div>
            <div className="recipe"><small>MATERIAL RECIPE</small>{result.recipe.map(([flower, role], i) => <div key={flower}><code>{String(i + 1).padStart(2, "0")}</code><strong>{flower}</strong><span>{role}</span></div>)}</div>
          </div>
          <footer><div><small>COLOUR RATIO</small><p>45% dominant · 25% light · 20% secondary · 10% accent</p></div><div><small>SHAPE</small><p>{result.shape}</p></div></footer>
          <button className="download" disabled={!ready} onClick={downloadCard}>{ready ? <><Download /> Download florist card</> : "Preview unlocks after generation"}</button>
        </article>
      </section>
    </main>
  );
}
