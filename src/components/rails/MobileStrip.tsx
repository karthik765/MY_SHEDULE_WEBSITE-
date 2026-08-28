"use client";

import { useEffect, useState } from "react";
import { QUOTES } from "@/lib/rail-content";

// Lightweight mobile-only equivalent of the side rails: no WebGL (keeps
// small screens fast), just a slim auto-advancing strip so mobile still
// gets some motion instead of the rails just disappearing.
export default function MobileStrip() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 220);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mobile-strip lg:hidden">
      <span className="mobile-strip-k">
        <span>K</span>
      </span>
      <p className="mobile-strip-text" style={{ opacity: visible ? 1 : 0 }}>
        {QUOTES[index]}
      </p>
    </div>
  );
}
