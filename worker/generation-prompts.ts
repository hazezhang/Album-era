import type { Interpretation } from "../lib/generation-contract";

// Connection-test defaults only. Product owns all interpretation and aesthetic rules.
export const PROVISIONAL_VISION_PROMPT = `Briefly describe the visible content of the supplied image. Return only a JSON object with description (a short factual description), generationPrompt (a short provisional instruction for a bouquet inspired by the visible reference), and metadata (an object, which may be empty). Keep the entire response concise. Describe visible content only. These are provisional integration instructions; no final portrait-to-flower mapping is specified.`;
export const PROVISIONAL_IMAGE_PROMPT = `Generate an image of a bouquet using the supplied reference image and this provisional interpretation.\nDescription: {{description}}\nInstruction: {{generationPrompt}}`;

export function generationPrompt(template: string, interpretation: Interpretation) {
  // One substitution pass: tokens supplied by the model must not become new templates.
  return template.replace(/\{\{(description|generationPrompt)\}\}/g, (_, key: "description" | "generationPrompt") => interpretation[key]);
}
