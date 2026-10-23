"use client";
import { useState } from "react";
type Edition = "fresh" | "preserved";
type StudyCardData = { id: string; title: string; sourceImage: string; bouquets: Record<Edition, string>; colour: string; note: string; provenance: "Curated Study" };
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const studies: StudyCardData[] = [
  { id: "AB–001", title: "Lunar veil", sourceImage: `${base}/lunar-veil-cover.webp`, bouquets: { fresh: `${base}/lunar-veil-fresh.webp`, preserved: `${base}/lunar-veil-preserved.webp` }, colour: "Midnight blue · pearl · amber", note: "An airy vertical silhouette, shaped around light and space.", provenance: "Curated Study" },
  { id: "AB–002", title: "Cherry static", sourceImage: `${base}/cherry-static-cover.webp`, bouquets: { fresh: `${base}/cherry-static-bouquet.webp`, preserved: `${base}/cherry-static-preserved.webp` }, colour: "Cherry red · powder pink · silver", note: "A tall arrangement with sharp structural accents.", provenance: "Curated Study" },
  { id: "AB–003", title: "Heavy weather", sourceImage: `${base}/heavy-weather-cover.webp`, bouquets: { fresh: `${base}/heavy-weather-bouquet.webp`, preserved: `${base}/heavy-weather-preserved.webp` }, colour: "Cobalt · tobacco · chrome", note: "A lean silhouette with contrasting hard lines.", provenance: "Curated Study" },
  { id: "AB–004", title: "Moss memory", sourceImage: `${base}/moss-memory-cover.webp`, bouquets: { fresh: `${base}/moss-memory-bouquet.webp`, preserved: `${base}/moss-memory-preserved.webp` }, colour: "Moss · parchment · faded blue", note: "An open meadow composition with a wandering branch.", provenance: "Curated Study" },
];
function StudyCard({ study }: { study: StudyCardData }) {
  const [edition, setEdition] = useState<Edition>("fresh");
  return <article className="collection-card"><div className="study-pair"><img src={study.sourceImage} alt={`${study.title} fictional album artwork`} /><img src={study.bouquets[edition]} alt={`${study.title} ${edition} curated bouquet study`} /></div>
    <div className="collection-caption"><span className="meta-line">{study.id} · ALBUM ARTWORK · {study.provenance}</span><h3>{study.title}</h3><p>{study.colour}</p><p>{study.note}</p><div className="edition-tabs" role="group" aria-label={`${study.title} botanical edition`}><button type="button" aria-pressed={edition === "fresh"} onClick={() => setEdition("fresh")}>Fresh</button><button type="button" aria-pressed={edition === "preserved"} onClick={() => setEdition("preserved")}>Preserved</button></div></div>
  </article>;
}
export default function StudyCollection() {
  return <section className="collection-section" id="collection"><div className="section-intro"><p className="eyebrow">05 / TRANSLATION COLLECTION</p><h2>Many sources.<br />Many expressions.</h2><p>Four curated album studies show how colour, structure and texture can take different botanical forms. These are gallery works, separate from your live generation.</p></div>
    <div className="collection-grid">{studies.map(study => <StudyCard key={study.id} study={study} />)}</div>
    <div className="collection-end"><div><span className="meta-line">MATERIAL COMPOSITION · PROTOTYPE / PREVIEW</span><h3>Texture as a source.</h3><p>The material experiment creates a deterministic pixel illustration and a browser printable receipt.</p></div><a className="action-button" href={`${base}/material-study`}>Visit material study ↗</a></div>
  </section>;
}
