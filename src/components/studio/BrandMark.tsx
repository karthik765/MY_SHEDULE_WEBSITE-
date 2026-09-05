import Image from "next/image";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className={`sculptural-brand ${compact ? "sculptural-brand-small" : ""}`}><Image src="/cinematic/k-obsidian.png" width={84} height={104} alt="Sculptural K" sizes={compact ? "28px" : "64px"} /></span>;
}
