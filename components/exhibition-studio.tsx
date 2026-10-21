"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Printer, RotateCcw } from "lucide-react";

type Material = { id: string; name: string; cn: string; feel: string; color: string; accent: string; form: string };
const MATERIALS: Material[] = [
  { id: "velvet", name: "Velvet", cn: "丝绒", feel: "soft / quiet", color: "#283a66", accent: "#a8b5de", form: "rounded petals" },
  { id: "foil", name: "Metallic foil", cn: "金属箔", feel: "bright / restless", color: "#4f7ba8", accent: "#e2bb77", form: "linear stems" },
  { id: "mesh", name: "Sheer fabric", cn: "薄纱", feel: "weightless / open", color: "#a5bac0", accent: "#e4d9c5", form: "airy clusters" },
  { id: "paper", name: "Textured paper", cn: "肌理纸", feel: "earthy / grounded", color: "#667568", accent: "#d5c6ac", form: "structured leaves" },
  { id: "ribbon", name: "Satin ribbon", cn: "缎带", feel: "fluid / tender", color: "#926d83", accent: "#dfb7c3", form: "trailing curves" },
  { id: "thread", name: "Cotton thread", cn: "棉线", feel: "fragile / rhythmic", color: "#7a8098", accent: "#e2dfd6", form: "delicate lines" },
];
const POEMS = [
  ["Somewhere between the quiet and the light, something begins to bloom.", "在寂静与微光之间，有什么正悄悄盛开。"],
  ["You can carry a small piece of the night into tomorrow.", "你可以把一小片夜色，带到明天。"],
  ["Even the spaces between things can hold a flower.", "即使是事物之间的空隙，也能容下一朵花。"],
  ["The shape of a feeling is never quite symmetrical.", "一种情绪的形状，从来不必完全对称。"],
  ["For a moment, let the ordinary become a little strange.", "让寻常之物，在这一刻稍稍变得陌生。"],
];
const SIZE = 20;
function PixelFlower({ selected, edition = 0 }: { selected: Material[]; edition?: number }) {
  const lead = selected[edition % selected.length] ?? MATERIALS[0];
  const other = selected[(edition + 1) % selected.length] ?? MATERIALS[2];
  const last = selected[(edition + 2) % selected.length] ?? MATERIALS[3];
  const petals = [[7, 4], [9, 3], [11, 5], [9, 6], [5, 8], [7, 7], [9, 9], [11, 8], [13, 7], [12, 10], [6, 11], [8, 12], [10, 12]];
  return <svg viewBox={`0 0 ${SIZE} ${SIZE}`} shapeRendering="crispEdges" role="img" aria-label="Pixel bouquet generated from selected materials">
    {[[8, 10, 9, 17], [11, 9, 9, 17], [6, 11, 9, 17], [13, 10, 9, 17]].map(([x,y,xx,yy], i) => <path key={i} d={`M${x} ${y}L${xx} ${yy}`} stroke="#4e675d" strokeWidth=".6" />)}
    {petals.map(([x,y], i) => <rect key={i} x={x + (selected.length > 2 && i%4 === 0 ? 1 : 0)} y={y} width={i%3 === 0 ? 2 : 1.6} height={i%4 === 0 ? 2 : 1.6} fill={[lead.color, other.color, lead.accent, last.color][i%4]} />)}
    <rect x="8" y="7" width="2" height="2" fill={lead.accent}/>
    <rect x="12" y="8" width="1.5" height="1.5" fill={other.accent}/>
    <path d="M7 15L12 15L10 19L9 19Z" fill="#e5e2d9" stroke="#b8b7b0" strokeWidth=".25" />
    <rect x="9" y="16" width="2" height=".5" fill={last.color} />
  </svg>;
}
export default function ExhibitionStudio() {
  const [ids, setIds] = useState<string[]>([]);
  const [edition, setEdition] = useState(0);
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const selected = MATERIALS.filter(item => ids.includes(item.id));
  const ready = ids.length >= 2;
  const index = useMemo(() => ids.reduce((n, id, i) => n + (MATERIALS.findIndex(x => x.id === id) + 1) * (i + 3), 0) % POEMS.length, [ids]);
  const toggle = (id: string) => { setEdition(0); setIds(current => current.includes(id) ? current.filter(x=>x!==id) : current.length < 3 ? [...current,id] : current); };
  const reset = () => { setIds([]); setEdition(0); };
  return <section className="exhibition-studio" id="exhibition">
    <div className="exhibition-heading">
      <p className="eyebrow">EXHIBITION PROTOTYPE / MATERIAL TO MEMORY</p>
      <h2>Choose what you feel.<br/><em>Carry what it becomes.</em></h2>
      <p>Touch and arrange 2–3 materials at the installation table. This digital rehearsal translates their textures into a botanical form and a take-away receipt.</p>
    </div>
    <div className="exhibition-grid">
      <div className="exhibition-selector">
        <div className="exhibition-section-name"><span>01 / SELECT YOUR MATERIALS</span><span>{ids.length} / 3</span></div>
        <div className="material-grid">{MATERIALS.map(item => <button key={item.id} onClick={()=>toggle(item.id)} aria-pressed={ids.includes(item.id)} className={`material-tile ${ids.includes(item.id)?"selected":""}`} type="button">
          <span className={`material-texture material-${item.id}`} style={{"--material-color":item.color,"--material-accent":item.accent} as React.CSSProperties}/>
          <span className="material-label"><strong>{item.name}</strong><small>{item.cn} · {item.feel}</small></span>
          <span className="material-check">{ids.includes(item.id) ? "✓" : "+"}</span>
        </button>)}</div>
        <p className="exhibition-hint">Select at least two materials. In the physical installation, visitors can arrange the matching samples beneath a camera.</p>
        <button className="exhibition-reset" onClick={reset} type="button"><RotateCcw size={15}/> Start again</button>
      </div>
      <div className="exhibition-result">
        <div className="exhibition-section-name"><span>02 / TRANSLATED OBJECT</span><span>STUDY {String(edition % 3 + 1).padStart(2,"0")}</span></div>
        <div className="exhibition-art">
          {ready ? <PixelFlower selected={selected} edition={edition} /> : <div className="exhibition-empty"><span>✳</span><p>Every texture<br/>has a language.</p></div>}
        </div>
        <div className="exhibition-caption">
          <div><span className="exhibition-kicker">THE MATERIAL PALETTE</span><p>{ready ? selected.map(x=>x.name).join(" / ") : "Waiting for a combination"}</p></div>
          <div><span className="exhibition-kicker">COMPOSITION</span><p>{ready ? selected.map(x=>x.form).join(" · ") : "—"}</p></div>
        </div>
        <div className="exhibition-actions">
          <button disabled={!ready} onClick={()=>setEdition(x=>(x+1)%3)} type="button">Create another edition <ArrowRight size={16}/></button>
          <button disabled={!ready} onClick={()=>window.print()} type="button"><Printer size={16}/> Print receipt</button>
        </div>
        {ready && <p className="exhibition-notice">Preview only: the bouquet is a deterministic pixel illustration, not yet camera-driven AI generation. Browser printing is enabled.</p>}
      </div>
    </div>
    <div className="receipt-panel">
      <div><p className="eyebrow">03 / A SMALL MEMORY TO KEEP</p><h3>Your receipt,<br/>your poem.</h3><p>Designed for monochrome 58 mm thermal paper. A compact pixel silhouette and a short poetic line become a physical keepsake.</p><div className="receipt-language"><button className={language==="en"?"active":""} onClick={()=>setLanguage("en")}>EN</button><button className={language==="zh"?"active":""} onClick={()=>setLanguage("zh")}>中文</button></div></div>
      <div className="receipt-paper" id="exhibition-receipt"><div className="receipt-top">A L B U M / B O U Q U E T</div><div className="receipt-rule">********************************</div><div className="receipt-id">MATERIAL STUDY / {String(edition%3+1).padStart(3,"0")}</div>
        <div className="receipt-visual">{ready ? <PixelFlower selected={selected} edition={edition}/> : <div className="receipt-placeholder">[ YOUR FLOWERS HERE ]</div>}</div>
        <p className="receipt-poem">{ready ? POEMS[index][language==="en"?0:1] : "A little something, made of feeling."}</p>
        <div className="receipt-rule">--------------------------------</div><div className="receipt-materials">{ready ? selected.map(x=>x.name.toUpperCase()).join(" + ") : "SELECT 2–3 MATERIALS"}</div><div className="receipt-footer">TAKE THIS MOMENT WITH YOU<br/>✳ THANK YOU FOR BEING HERE ✳</div>
      </div>
    </div>
    <style jsx global>{`
      .exhibition-studio{padding:6rem 5vw;background:#e9e8e1;color:#18253c;scroll-margin-top:30px}.exhibition-heading{max-width:850px;margin-bottom:3rem}.exhibition-heading .eyebrow,.receipt-panel .eyebrow{color:#547b9d}.exhibition-heading h2{font:400 clamp(2.8rem,5vw,5.8rem)/1 Georgia,serif;letter-spacing:-.045em}.exhibition-heading em{color:#447eaa;font-weight:400}.exhibition-heading>p:last-child{max-width:680px;line-height:1.8;color:#596779}.exhibition-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:2rem}.exhibition-selector,.exhibition-result{min-width:0}.exhibition-section-name{display:flex;justify-content:space-between;padding:1rem 0;border-top:1px solid #98a1a6;font:11px/1.4 monospace;letter-spacing:.1em}.material-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.material-tile{border:1px solid #c6cacb;background:#f6f5f0;text-align:left;padding:10px;cursor:pointer;display:grid;grid-template-columns:80px 1fr 20px;gap:12px;align-items:center;color:#18253c}.material-tile.selected{border:2px solid #447eaa;padding:9px;background:#edf3f7}.material-texture{height:75px;background:var(--material-color);display:block}.material-velvet{background:radial-gradient(ellipse at 30% 30%,var(--material-accent),transparent 55%),var(--material-color)}.material-foil{background:linear-gradient(120deg,var(--material-color) 25%,var(--material-accent) 40%,var(--material-color) 55%,#dde3e1 70%,var(--material-color))}.material-mesh{background:repeating-linear-gradient(45deg,transparent 0 5px,#fff8 6px 7px),var(--material-color)}.material-paper{background:repeating-linear-gradient(3deg,transparent 0 3px,#fff3 4px 5px),var(--material-color)}.material-ribbon{background:repeating-linear-gradient(140deg,var(--material-color) 0 18px,var(--material-accent) 20px 26px,var(--material-color) 28px 47px)}.material-thread{background:repeating-linear-gradient(120deg,var(--material-accent) 0 2px,var(--material-color) 2px 11px)}.material-label strong,.material-label small{display:block}.material-label strong{font-size:14px}.material-label small{font-size:11px;margin-top:7px;color:#6d7780}.material-check{text-align:center;font-size:18px}.exhibition-hint,.exhibition-notice{font-size:12px;line-height:1.65;color:#697583}.exhibition-reset{border:0;background:none;color:#476f94;cursor:pointer;display:flex;align-items:center;gap:8px;padding:12px 0}.exhibition-art{min-height:415px;background:#dfe4e5;display:grid;place-items:center}.exhibition-art svg{width:min(75%,340px);filter:drop-shadow(0 16px 12px #0002)}.exhibition-empty{text-align:center;color:#8d9aa6}.exhibition-empty span{font-size:70px}.exhibition-empty p{font:28px/1.2 Georgia,serif}.exhibition-caption{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1.1rem 0}.exhibition-kicker{font:10px monospace;color:#7c858d}.exhibition-caption p{font:13px/1.5 Georgia,serif;margin:.5rem 0}.exhibition-actions{display:flex;gap:10px;flex-wrap:wrap}.exhibition-actions button{display:flex;align-items:center;gap:7px;padding:12px 15px;border:1px solid #426c90;background:#254b70;color:#fff;cursor:pointer;font-size:12px}.exhibition-actions button+button{background:transparent;color:#254b70}.exhibition-actions button:disabled{opacity:.35;cursor:not-allowed}.receipt-panel{display:grid;grid-template-columns:1fr 1fr;gap:4rem;margin-top:5rem;padding:3rem;border-top:1px solid #9ca6ad;align-items:start}.receipt-panel h3{font:400 clamp(2.5rem,4vw,4.7rem)/1 Georgia,serif}.receipt-panel p{max-width:370px;line-height:1.8;color:#526273}.receipt-language{display:flex;gap:8px;margin-top:2rem}.receipt-language button{padding:9px 18px;border:1px solid #9faeb7;background:transparent;color:#18253c;cursor:pointer}.receipt-language button.active{background:#254b70;color:#fff}.receipt-paper{width:290px;max-width:100%;margin:auto;padding:23px 18px 34px;background:#fff;color:#151515;text-align:center;box-shadow:0 12px 25px #0002;font:11px/1.5 monospace;overflow-wrap:anywhere}.receipt-top{font-weight:bold;letter-spacing:.05em}.receipt-rule{margin:15px 0}.receipt-id,.receipt-materials{font-size:10px}.receipt-visual{height:245px;display:grid;place-items:center}.receipt-visual svg{width:205px;filter:grayscale(1) contrast(1.8)}.receipt-placeholder{color:#999}.receipt-poem{font:italic 15px/1.6 Georgia,serif!important;color:#111!important;margin:4px auto 20px!important}.receipt-footer{margin-top:22px;font-size:9px;line-height:2}
      @media(max-width:850px){.exhibition-grid,.receipt-panel{grid-template-columns:1fr}.receipt-panel{padding:2rem 0;gap:2rem}.exhibition-art{min-height:320px}}@media(max-width:480px){.exhibition-studio{padding:4rem 5vw}.material-grid{grid-template-columns:1fr}.material-tile{grid-template-columns:70px 1fr 20px}.material-texture{height:60px}.receipt-panel{margin-top:3rem}}
      @media print{@page{size:58mm auto;margin:0}body{background:#fff!important}.topbar,.studio,.translate,.result,.studies,.exhibition-heading,.exhibition-grid,.receipt-panel>div:first-child,footer{display:none!important}.exhibition-studio,.receipt-panel{display:block!important;margin:0!important;padding:0!important;background:#fff!important}.receipt-paper{box-shadow:none!important;width:58mm!important;max-width:58mm!important;margin:0!important;padding:5mm 3mm!important}.receipt-visual{height:45mm}.receipt-visual svg{width:38mm}}
    `}</style>
  </section>;
}
