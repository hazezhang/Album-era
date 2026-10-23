export type Interpretation = {
  description: string;
  generationPrompt: string;
  metadata: Record<string, unknown>;
};

export type GenerationStage = "upload" | "backend" | "vision" | "generation";
export type GenerationResult = {
  requestId: string;
  imageDataUrl: string;
  interpretation: Interpretation;
  timings: { visionMs: number; generationMs: number; totalMs: number };
};

export type GenerationFailure = {
  requestId: string;
  error: string;
  code: string;
  stage: GenerationStage;
  retryable: boolean;
  upstreamStatus?: number;
  retryAfterSeconds?: number;
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
