import ImageBouquetDemo from "@/components/image-bouquet-demo";
import StudyCollection from "@/components/study-collection";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export default function Home() {
  return <main className="editorial-site">
    <header className="editorial-header"><a href={`${base}/`} className="brand">ALBUM / BOUQUET</a><span>A VISUAL TRANSLATION STUDIO</span><nav aria-label="Main navigation"><a href="#translation">Studio</a><a href="#collection">Collection</a><a href="#receipt">Receipt</a></nav></header>
    <section className="editorial-hero"><div className="hero-copy"><p className="eyebrow">A VISUAL TRANSLATION STUDIO · EST. 2026</p><h1>You, as a<br /><em>bouquet.</em></h1><p className="hero-subline">An interpretation, not a definition.</p><p>Images have their own language — colour, structure, texture, rhythm and space. Album Bouquet translates these visual relationships into botanical compositions.</p><a className="action-button" href="#translation">Begin a Translation <span aria-hidden="true">↘</span></a></div><div className="hero-art"><img src={`${base}/lunar-veil-fresh.webp`} alt="A curated floral study against a restrained background" /><span>STUDY AB–001 / CURATED STUDY</span></div></section>
    <div className="editorial-rule"><span>DIFFERENT SOURCES</span><span>ONE LANGUAGE OF FLOWERS</span><span>ALBUM / BOUQUET</span></div>
    <ImageBouquetDemo />
    <StudyCollection />
    <section className="take-home" id="receipt"><div><p className="eyebrow">06 / TAKE A PIECE HOME</p><h2>A small record<br />of the translation.</h2><p>The material study includes a browser printable receipt. Future editions can carry the source, bouquet and its interpretation together.</p><a className="action-button" href={`${base}/material-study#exhibition-receipt`}>Explore the receipt ↗</a></div><div className="receipt-art"><span>ALBUM / BOUQUET</span><div>✳</div><p>AN INTERPRETATION,<br />NOT A DEFINITION.</p><small>PROTOTYPE / PREVIEW</small></div></section>
    <footer className="editorial-footer"><span>ALBUM / BOUQUET</span><span>Different sources. One language of flowers.</span><a href="#translation">Back to studio ↑</a></footer>
  </main>;
}
