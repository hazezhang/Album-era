"use client";

import { useRef, useState } from "react";
import { ArrowDown, Flower2, ImagePlus, RotateCcw } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type Mode = "fresh" | "preserved";
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

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [name, setName] = useState("Time machine study");
  const [palette, setPalette] = useState(FALLBACK);
  const [mode, setMode] = useState<Mode>("fresh");
  const [reading, setReading] = useState(false);
  const [ready, setReady] = useState(false);

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
        <button className="build" disabled={!cover || reading} onClick={() => setReady(true)}>Build the florist brief <ArrowDown /></button>
        {!cover && <small className="hint">Upload a cover to build your first brief.</small>}
      </section>

      <section className="brief" id="brief">
        <div className="brief-copy"><p className="eyebrow">FLORIST REFERENCE</p><h2>A clear recipe,<br />not just an AI image.</h2><p>The card preserves the cover’s colour hierarchy and translates it into materials a florist can source or substitute.</p></div>
        <article className={`card ${ready ? "ready" : ""}`}>
          <header><div><small>BOUQUET STUDY</small><h3>{name}</h3></div><code>{mode === "fresh" ? "FRESH / 01" : "PRESERVED / 02"}</code></header>
          <div className="card-body">
            <div className="source">{cover ? <img src={cover} alt="Source cover" /> : <div />}<span>{palette.map((colour, i) => <i key={`${colour}-card-${i}`} style={{ background: colour }} />)}</span></div>
            <div className="recipe"><small>MATERIAL RECIPE</small>{RECIPES[mode].map(([flower, role], i) => <div key={flower}><code>{String(i + 1).padStart(2, "0")}</code><strong>{flower}</strong><span>{role}</span></div>)}</div>
          </div>
          <footer><div><small>COLOUR RATIO</small><p>45% dominant · 25% light · 20% secondary · 10% accent</p></div><div><small>SHAPE</small><p>Asymmetrical, open silhouette with one clear focal cluster.</p></div></footer>
          <button disabled={!ready}>{ready ? "Reference card ready" : "Preview unlocks after upload"}</button>
        </article>
      </section>
    </main>
  );
}
