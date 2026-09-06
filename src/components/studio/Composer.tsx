"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Icon from "./Icon";

/**
 * The "+ Add ..." button that lives in a page header. Paired with `Composer`
 * below, it replaces the collapsed `<details>` panels whose only affordance
 * was a "+" sitting the full width of the page away from its own label.
 */
export function AddButton({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" className="primary-action add-button" aria-expanded={open} onClick={onToggle}>
      <Icon name={open ? "close" : "plus"} size={17} />
      <span>{open ? "Cancel" : label}</span>
    </button>
  );
}

/**
 * The form the add button reveals, inline and directly beneath the page's
 * tabs. Opening moves focus to the first field so the keyboard path is one
 * click and straight into typing.
 */
export function Composer({ open, title, children }: { open: boolean; title: string; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      host.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  if (!open) return null;

  return (
    <section className="composer" ref={host} aria-label={title}>
      <p className="composer-title">{title}</p>
      {children}
    </section>
  );
}
