"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export interface TabItem {
  value: string;
  label: string;
}

/**
 * The app's one tab bar. It replaces four separate implementations that had
 * drifted apart (underline tabs, orange segmented pills, inline
 * `style={{backgroundColor}}` buttons, and the demo's own bar), so a tab looks
 * and behaves the same on every page.
 *
 * The active marker is a single element that travels between tabs rather than
 * one underline per button, which is what makes switching read as movement.
 * Its position is measured from the live DOM, so it stays correct through font
 * loading, resizes and text-size changes; until the first measurement lands it
 * renders hidden rather than sliding in from the left edge.
 */
export function Tabs({ items, value, onChange, ariaLabel }: { items: TabItem[]; value: string; onChange: (value: string) => void; ariaLabel: string }) {
  const list = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const container = list.current;
    const active = container?.querySelector<HTMLElement>("[aria-selected='true']");
    if (!container || !active) return;
    const left = active.offsetLeft;
    const width = active.offsetWidth;
    // Bail out when nothing moved. Callers commonly build `items` inline, so
    // this effect re-runs on every render — returning a fresh object each time
    // would loop forever.
    setMarker((prev) => (prev && prev.left === left && prev.width === width ? prev : { left, width }));
  }, []);

  useLayoutEffect(measure, [measure, value, items.length]);

  useEffect(() => {
    const container = list.current;
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    // Web fonts land after first paint and change every tab's width.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [measure]);

  // Roving arrow-key navigation, per the WAI-ARIA tabs pattern.
  function onKeyDown(event: React.KeyboardEvent) {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const index = items.findIndex((item) => item.value === value);
    const next = items[(index + offset + items.length) % items.length];
    onChange(next.value);
    list.current?.querySelectorAll<HTMLElement>("[role='tab']")[items.indexOf(next)]?.focus();
  }

  return (
    <div className="tab-bar" ref={list} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`tab-${item.value}`}
            aria-selected={selected}
            aria-controls={`panel-${item.value}`}
            tabIndex={selected ? 0 : -1}
            className="tab-button"
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
      <span
        className="tab-marker"
        aria-hidden="true"
        hidden={!marker}
        style={marker ? { transform: `translateX(${marker.left}px)`, width: marker.width } : undefined}
      />
    </div>
  );
}

/**
 * The panel a tab reveals. Keying it on `value` restarts the enter animation
 * on every switch, which is what gives tab changes a visible transition
 * instead of an instant swap.
 */
export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <div key={value} id={`panel-${value}`} role="tabpanel" aria-labelledby={`tab-${value}`} tabIndex={-1} className="tab-panel">
      {children}
    </div>
  );
}

/**
 * A filter control — visually distinct from tabs on purpose. Tabs switch what
 * you are looking at; this narrows what is already on screen.
 */
export function SegmentedControl({ items, value, onChange, ariaLabel }: { items: TabItem[]; value: string; onChange: (value: string) => void; ariaLabel: string }) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {items.map((item) => (
        <button key={item.value} type="button" aria-pressed={item.value === value} onClick={() => onChange(item.value)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
