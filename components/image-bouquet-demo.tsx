"use client";
import { useEffect, useRef, useState } from "react";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, type GenerationFailure, type GenerationResult } from "@/lib/generation-contract";
import { sourceLabel, type SourceType } from "@/lib/source-types";
import SourceSelector from "./source-selector";
import VisualReadingPanel from "./visual-reading-panel";
import TranslationResult from "./translation-result";

const endpoint = process.env.NEXT_PUBLIC_GENERATION_API_URL ?? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/generate`;
const labels = { upload: "Upload", backend: "Server", vision: "Image understanding", generation: "Image generation" };

export default function ImageBouquetDemo({ initialSource = "portrait" }: { initialSource?: SourceType }) {
  const input = useRef<HTMLInputElement>(null), activeRequest = useRef<AbortController | null>(null);
  const [source, setSource] = useState<SourceType>(initialSource);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null), [failure, setFailure] = useState<GenerationFailure | null>(null);
  const [busy, setBusy] = useState(false), [displayed, setDisplayed] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [elapsed, setElapsed] = useState(0), [retryAfter, setRetryAfter] = useState(0);
  useEffect(() => () => activeRequest.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { if (!busy) return; const timer = setInterval(() => setElapsed(v => v + 1), 1000); return () => clearInterval(timer); }, [busy]);
  useEffect(() => { if (!retryAfter) return; const timer = setTimeout(() => setRetryAfter(v => Math.max(0, v - 1)), 1000); return () => clearTimeout(timer); }, [retryAfter]);
  useEffect(() => {
    if (!result || displayed) return;
    const timer = setTimeout(() => { setBusy(false); setResult(null); setFailure({ requestId: result.requestId, stage: "generation", code: "IMAGE_DISPLAY_TIMEOUT", error: "The image could not finish loading. Please retry.", retryable: true }); }, 15000);
    return () => clearTimeout(timer);
  }, [result, displayed]);

  function select(next?: File) {
    if (!next || busy) return;
    setResult(null); setDisplayed(false); setFailure(null); setRetryAfter(0); setPreviewReady(false);
    if (!IMAGE_TYPES.includes(next.type) || !next.size || next.size > MAX_IMAGE_BYTES) {
      setFile(null); setPreview(null);
      setFailure({ requestId: "", stage: "upload", code: "INVALID_UPLOAD", error: "Choose a non-empty JPEG, PNG or WebP image of 8 MB or less.", retryable: false }); return;
    }
    setFile(next); setPreview(URL.createObjectURL(next));
  }

  function restart() {
    setFile(null); setPreview(null); setPreviewReady(false); setResult(null); setDisplayed(false); setFailure(null); setRetryAfter(0);
    if (input.current) input.current.value = "";
    document.getElementById("translation")?.scrollIntoView({ behavior: "smooth" });
  }

  function changeSource(next: SourceType) { if (next !== source) { restart(); setSource(next); } }

  async function generate() {
    if (!file || !previewReady || busy || retryAfter > 0 || source === "materials") return;
    setBusy(true); setElapsed(0); setFailure(null); setResult(null); setDisplayed(false);
    const controller = new AbortController(); activeRequest.current = controller;
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const form = new FormData(); form.append("image", file);
      const response = await fetch(endpoint, { method: "POST", body: form, signal: controller.signal });
      let payload: unknown;
      try { payload = await response.json(); }
      catch { throw { requestId: response.headers.get("X-Request-ID") ?? "", stage: "backend", code: "INVALID_SERVER_RESPONSE", error: "The server returned an unreadable response. Please retry.", retryable: true }; }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw { requestId: response.headers.get("X-Request-ID") ?? "", stage: "backend", code: "INVALID_SERVER_RESPONSE", error: "The server returned an invalid response. Please retry.", retryable: true };
      if (!response.ok) {
        const data = payload as Partial<GenerationFailure>;
        setRetryAfter(Math.min(600, Math.max(0, Number(data.retryAfterSeconds ?? response.headers.get("Retry-After")) || 0)));
        throw { ...data, requestId: data.requestId ?? "", stage: data.stage && data.stage in labels ? data.stage : "backend", code: data.code ?? "SERVER_ERROR", error: data.error ?? "The server could not generate this image.", retryable: data.retryable ?? true };
      }
      const data = payload as GenerationResult;
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(data.imageDataUrl ?? "") || !data.interpretation || typeof data.interpretation.description !== "string" || typeof data.interpretation.generationPrompt !== "string" || !data.requestId || !data.timings || !Number.isFinite(data.timings.totalMs)) throw { requestId: "", stage: "generation", code: "INVALID_IMAGE_RESPONSE", error: "The server returned no usable generated image.", retryable: true };
      setResult(data); // Completion requires the browser image's onLoad event.
    } catch (error) {
      setBusy(false); const typed = error as Partial<GenerationFailure>;
      setFailure(typed.code ? typed as GenerationFailure : { requestId: "", stage: "backend", code: controller.signal.aborted ? "CLIENT_TIMEOUT" : "NETWORK_ERROR", error: controller.signal.aborted ? "Generation exceeded two minutes. Please retry." : "The generation server could not be reached. Check your connection and retry.", retryable: true });
    } finally { clearTimeout(timer); if (activeRequest.current === controller) activeRequest.current = null; }
  }

  return <div className="translation-workspace" id="translation">
    <div className="section-intro"><p className="eyebrow">01 / CHOOSE YOUR SOURCE</p><h2>Begin a translation.</h2><p>Different sources. One language of flowers.</p></div>
    <SourceSelector value={source} onChange={changeSource} disabled={busy} />
    <div className="workspace-grid">
      <section className="source-upload" aria-label="Upload source">
        <p className="eyebrow">02 / {sourceLabel(source).toUpperCase()} INPUT</p>
        <div className="source-preview">{preview ? <img src={preview} alt="Uploaded source preview" onLoad={() => setPreviewReady(true)} onError={() => { setFile(null); setPreview(null); setPreviewReady(false); setFailure({requestId:"",stage:"upload",code:"IMAGE_DECODE_FAILED",error:"This image could not be opened. Choose another file.",retryable:false}); }} /> : <div><span>YOUR SOURCE</span><strong>{sourceLabel(source)}</strong></div>}</div>
        {source === "materials" ? <div className="workspace-action"><p>Material translation is an interactive prototype. Explore the texture study and printable browser receipt.</p><a className="action-button" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/material-study`}>Explore material study ↗</a></div> : <div className="workspace-action">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload reference image" disabled={busy} hidden onChange={e => { select(e.target.files?.[0]); e.target.value = ""; }} />
          <div className="workspace-buttons"><button type="button" disabled={busy} onClick={() => input.current?.click()}>{file ? "Choose another image" : "Upload image"}</button><button type="button" disabled={!file || !previewReady || busy || retryAfter > 0} onClick={generate}>{busy ? "Generating…" : retryAfter ? `Wait ${retryAfter}s` : failure && file ? "Retry generation" : "Generate bouquet"}</button></div>
          <small>JPEG, PNG or WebP · up to 8 MB. Your image is sent to the configured AI provider after Generate. This demo does not save uploads.</small>
          {source === "album_artwork" && <p className="archive-link">The original fresh / preserved workflow remains available in the <a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/album-studio`}>album studio archive ↗</a></p>}
        </div>}
      </section>
      <div className="workspace-reading"><VisualReadingPanel description={result?.interpretation.description} pending={busy && !result} />
        {busy && <p role="status" className="workspace-status">{result ? "Loading generated image…" : "Requesting visual reading and bouquet generation…"} {elapsed}s elapsed. This may take up to two minutes.</p>}
        {failure && <div role="alert" className="workspace-error"><strong>{labels[failure.stage] ?? "Server"} error</strong><p>{failure.error}</p><small>{failure.code}{failure.requestId ? ` · Reference ${failure.requestId}` : ""}</small></div>}
      </div>
    </div>
    {result && preview && <TranslationResult key={result.requestId} result={result} preview={preview} source={source} onRestart={restart} onDisplayed={() => { setDisplayed(true); setBusy(false); }} onDisplayError={() => { setBusy(false); setDisplayed(false); setResult(null); setFailure({ requestId: result.requestId, stage: "generation", code: "IMAGE_DISPLAY_FAILED", error: "The generated image could not be displayed. Please retry.", retryable: true }); }} />}
  </div>;
}
