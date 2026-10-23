import ImageBouquetDemo from "@/components/image-bouquet-demo";
export default function DemoPage() {
  return <main style={{maxWidth:1100,margin:"0 auto",padding:"32px 24px",minHeight:"100vh",background:"#e9e8e1",color:"#18253c"}}>
    <a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`}>← Album / Bouquet</a>
    <h1 style={{font:"36px Georgia,serif",margin:"28px 0"}}>Image to bouquet</h1>
    <ImageBouquetDemo />
  </main>;
}
