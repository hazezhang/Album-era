"use client";
import { useState } from "react";
import type { GenerationResult } from "@/lib/generation-contract";
import { sourceLabel, type SourceType } from "@/lib/source-types";

export default function TranslationResult({ result, preview, source, onRestart, onDisplayed, onDisplayError }: {
  result: GenerationResult; preview: string; source: SourceType; onRestart: () => void; onDisplayed: () => void; onDisplayError: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  function download() {
    const link = document.createElement("a"); link.href = result.imageDataUrl;
    link.download = `album-bouquet-${result.requestId.slice(0, 8)}.${result.imageDataUrl.startsWith("data:image/png") ? "png" : result.imageDataUrl.startsWith("data:image/webp") ? "webp" : "jpg"}`;
    link.click();
  }
  return <section className="translation-result" aria-label="Bouquet result">
    <div className="result-intro"><p className="eyebrow">04 / THE BOUQUET · LIVE GENERATION</p><h3>One source, another form.</h3><p>AI generated from your {sourceLabel(source).toLowerCase()} image.</p></div>
    <div className="result-pair"><figure><img src={preview} alt={`Uploaded ${sourceLabel(source).toLowerCase()} source`} /><figcaption>01 / SOURCE · {sourceLabel(source)}</figcaption></figure><figure><img src={result.imageDataUrl} alt="AI-generated bouquet" onLoad={() => {setLoaded(true);onDisplayed();}} onError={onDisplayError} /><figcaption>02 / BOUQUET · {loaded ? "IMAGE DISPLAYED" : "LOADING IMAGE"}</figcaption></figure></div>
    {loaded && <div className="result-note"><div><span className="meta-line">VISUAL READING</span><p>{result.interpretation.description}</p></div><div><span className="meta-line">WHY THIS BOUQUET? · PROVISIONAL GENERATION BRIEF</span><p>{result.interpretation.generationPrompt}</p><small>This is the model's generation instruction. The image has not been independently checked against it.</small></div></div>}
    {loaded && <div className="result-toolbar"><small>Live generation · {Math.round(result.timings.totalMs / 1000)}s server time · {result.requestId}</small><div><button type="button" onClick={download}>Download bouquet</button><a className="result-text-link" href="#receipt">Receipt study ↘</a><button type="button" onClick={onRestart}>Begin another translation</button></div></div>}
  </section>;
}
