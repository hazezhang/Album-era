"use client";
import { useEffect, useRef, useState } from "react";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, type GenerationFailure, type GenerationResult } from "@/lib/generation-contract";

const endpoint = process.env.NEXT_PUBLIC_GENERATION_API_URL ?? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/generate`;
const labels = { upload: "Upload", backend: "Server", vision: "Image understanding", generation: "Image generation" };

export default function ImageBouquetDemo() {
  const input = useRef<HTMLInputElement>(null), activeRequest = useRef<AbortController | null>(null);
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

  async function generate() {
    if (!file || !previewReady || busy || retryAfter > 0) return;
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
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(data.imageDataUrl ?? "") || !data.interpretation || typeof data.interpretation.description !== "string" || !data.requestId || !data.timings || !Number.isFinite(data.timings.totalMs)) throw { requestId: "", stage: "generation", code: "INVALID_IMAGE_RESPONSE", error: "The server returned no usable generated image.", retryable: true };
      setResult(data); // Completion requires the browser image's onLoad event.
    } catch (error) {
      setBusy(false); const typed = error as Partial<GenerationFailure>;
      setFailure(typed.code ? typed as GenerationFailure : { requestId: "", stage: "backend", code: controller.signal.aborted ? "CLIENT_TIMEOUT" : "NETWORK_ERROR", error: controller.signal.aborted ? "Generation exceeded two minutes. Please retry." : "The generation server could not be reached. Check your connection and retry.", retryable: true });
    } finally { clearTimeout(timer); if (activeRequest.current === controller) activeRequest.current = null; }
  }

  return <section className="image-bouquet-demo" aria-label="AI image to bouquet demo">
    <div className="exhibition-section-name"><span>IMAGE UPLOAD → AI BOUQUET</span><span>LIVE DEMO</span></div>
    <p>Upload an image to generate a bouquet. Interpretation rules are provisional while the product team defines the final experience.</p>
    <div className="upload-demo-grid"><div>
      {preview ? <img className="upload-demo-image" src={preview} alt="Uploaded reference" onLoad={() => setPreviewReady(true)} onError={() => { setFile(null); setPreview(null); setPreviewReady(false); setFailure({requestId:"",stage:"upload",code:"IMAGE_DECODE_FAILED",error:"This image could not be opened. Choose another file.",retryable:false}); }} /> : <div className="upload-demo-empty">Choose a reference image</div>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload reference image" disabled={busy} hidden onChange={e => { select(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="upload-demo-actions"><button type="button" disabled={busy} onClick={() => input.current?.click()}>{file ? "Choose another image" : "Upload image"}</button><button type="button" disabled={!file || !previewReady || busy || retryAfter > 0} onClick={generate}>{busy ? "Generating…" : retryAfter ? `Wait ${retryAfter}s` : failure && file ? "Retry generation" : "Generate bouquet"}</button></div>
      <small>JPEG, PNG or WebP · up to 8 MB. Images are sent to the configured AI provider after Generate; this demo does not save uploads.</small>
      {busy && <p role="status">{result ? "Loading generated image…" : "Understanding the image and generating your bouquet…"} {elapsed}s elapsed. This may take up to two minutes.</p>}
      {failure && <div role="alert" className="upload-demo-error"><strong>{labels[failure.stage] ?? "Server"} error</strong><p>{failure.error}</p><small>{failure.code}{failure.requestId ? ` · Reference ${failure.requestId}` : ""}</small></div>}
    </div><div className="upload-demo-output" aria-live="polite">
      {result ? <><img className="upload-demo-image" src={result.imageDataUrl} alt="AI-generated bouquet" onLoad={() => { setDisplayed(true); setBusy(false); }} onError={() => { setBusy(false); setDisplayed(false); setResult(null); setFailure({ requestId: result.requestId, stage: "generation", code: "IMAGE_DISPLAY_FAILED", error: "The generated image could not be displayed. Please retry.", retryable: true }); }} />
        {displayed && <p role="status"><strong>AI generation complete</strong></p>}<p>{result.interpretation.description}</p>{displayed && <small>{Math.round(result.timings.totalMs / 1000)}s on the server · {result.requestId}</small>}
      </> : <div className="upload-demo-empty">Your generated bouquet will appear here.</div>}
    </div></div>
    <style jsx>{`.image-bouquet-demo{margin:0 0 3rem;color:#18253c}.image-bouquet-demo>p{max-width:720px;line-height:1.65;color:#526273}.exhibition-section-name{display:flex;justify-content:space-between;gap:1rem;border-top:1px solid #9ca6ad;padding:1rem 0;font:11px monospace;letter-spacing:.08em}.upload-demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}.upload-demo-image{width:100%;height:auto;aspect-ratio:1;object-fit:contain;background:#dce1e3}.upload-demo-empty{min-height:280px;padding:2rem;display:grid;place-items:center;background:#dce1e3;text-align:center;color:#536577;font:24px Georgia,serif}.upload-demo-actions{display:flex;gap:10px;margin:14px 0;flex-wrap:wrap}.upload-demo-actions button{padding:12px 18px;border:1px solid #254b70;background:transparent;color:#254b70;cursor:pointer}.upload-demo-actions button:last-child{background:#254b70;color:white}.upload-demo-actions button:disabled{opacity:.45;cursor:not-allowed}.image-bouquet-demo small{font-size:12px;line-height:1.65;color:#647383}.upload-demo-output{padding:14px;background:#f6f5f0}.upload-demo-output p{line-height:1.6}.upload-demo-error{margin-top:1rem;padding:14px;border:1px solid #b03232;color:#962121}.upload-demo-error p{margin:.5rem 0}@media(max-width:800px){.upload-demo-grid{grid-template-columns:1fr}}`}</style>
  </section>;
}
