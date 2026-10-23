export type SourceType = "portrait" | "album_artwork" | "materials";

export const SOURCE_OPTIONS: Array<{ id: SourceType; number: string; title: string; description: string; status: string }> = [
  { id: "portrait", number: "01", title: "Portrait", description: "Outfits, colour, fabric and the graphic shape of a photograph.", status: "Live generation" },
  { id: "album_artwork", number: "02", title: "Album artwork", description: "A cover's colour, composition and visual rhythm.", status: "Live generation" },
  { id: "materials", number: "03", title: "Material composition", description: "A tactile study of texture and arrangement.", status: "Prototype / preview" },
];

export function sourceLabel(source: SourceType) {
  return SOURCE_OPTIONS.find(option => option.id === source)?.title ?? "Source";
}
