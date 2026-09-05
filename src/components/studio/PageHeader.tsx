import type { ReactNode } from "react";
import SectionScene from "./SectionScene";

export default function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <header className="page-heading">
      <SectionScene />
      <div><p className="eyebrow"><span />{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>
      {children && <div className="page-heading-action">{children}</div>}
    </header>
  );
}
