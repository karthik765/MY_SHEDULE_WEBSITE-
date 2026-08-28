"use client";

import { useEffect, useState } from "react";
import { QUOTES } from "@/lib/rail-content";

export default function QuoteWidget() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 220);
    }, 9000);
    return () => clearInterval(id);
  }, []);

  function next() {
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => (i + 1) % QUOTES.length);
      setVisible(true);
    }, 220);
  }

  return (
    <div className="rail-panel widget-panel">
      <div className="rail-panel-label">
        <span>SIGNAL // TRANSMISSION</span>
      </div>
      <p
        className="widget-quote-text"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(4px)" }}
      >
        “{QUOTES[index]}”
      </p>
      <button type="button" onClick={next} className="comic-btn px-3 py-1 text-xs self-start">
        Next →
      </button>
    </div>
  );
}
