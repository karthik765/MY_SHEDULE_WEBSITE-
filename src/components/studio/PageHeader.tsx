import type { ReactNode } from "react";
import SectionScene from "./SectionScene";

/**
 * Every page opens the same way: label, title, one line of description, and —
 * when the page can create something — the primary action in the top-right.
 * Keeping the action here means "how do I add one of these?" has the same
 * answer on every page.
 */
export default function PageHeader({ eyebrow, title, description, action, children }: { eyebrow: string; title: string; description: string; action?: ReactNode; children?: ReactNode }) {
  // The decorative scene is anchored right; when there is also a primary
  // action it has to move over or the two sit on top of each other.
  return (
    <header className={`page-heading ${action || children ? "has-action" : ""}`}>
      <SectionScene />
      <div className="page-heading-text">
        <p className="eyebrow"><span />{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {(action || children) && <div className="page-heading-action">{action}{children}</div>}
    </header>
  );
}
