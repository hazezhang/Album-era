"use client";
import { SOURCE_OPTIONS, type SourceType } from "@/lib/source-types";

export default function SourceSelector({ value, onChange, disabled = false }: { value: SourceType; onChange: (source: SourceType) => void; disabled?: boolean }) {
  return <div className="source-options" aria-label="Source type">
    {SOURCE_OPTIONS.map(option => <button type="button" key={option.id} className={`source-option ${value === option.id ? "selected" : ""}`} aria-pressed={value === option.id} disabled={disabled} onClick={() => onChange(option.id)}>
      <span className="meta-line"><span>{option.number} / SOURCE</span><span>{option.status}</span></span>
      <strong>{option.title}</strong><span className="source-description">{option.description}</span>
    </button>)}
  </div>;
}
