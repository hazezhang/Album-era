"use client";

export default function VisualReadingPanel({ description, pending }: { description?: string; pending?: boolean }) {
  return <section className="reading-panel" aria-label="Visual Reading">
    <p className="eyebrow">02 / VISUAL READING</p>
    <h3>Reading the relationships.</h3>
    <div className="reading-vocabulary" aria-label="Visual vocabulary">
      {["Colour", "Structure", "Texture", "Contrast", "Rhythm / space"].map(term => <span key={term}>{term}</span>)}
    </div>
    <p>{description || (pending ? "Reading the source through the generation service…" : "The model's description will appear here after generation. The five terms above are the studio's visual vocabulary, not measured results.")}</p>
  </section>;
}
