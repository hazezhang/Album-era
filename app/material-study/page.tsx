import ExhibitionStudio from "@/components/exhibition-studio";
export default function MaterialStudyPage() { return <main><nav className="archive-nav"><a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`}>← ALBUM / BOUQUET · COLLECTION</a><span>MATERIAL STUDY · PROTOTYPE</span></nav><ExhibitionStudio /></main>; }
