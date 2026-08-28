"use client";

import dynamic from "next/dynamic";

// WebGL needs the browser — loaded client-only, after mount, with a plain
// loading placeholder so there's never a server/client markup mismatch.
const KScene = dynamic(() => import("@/components/three/KScene"), {
  ssr: false,
  loading: () => <div className="k-scene-loading" />,
});

export default function LeftRail() {
  return (
    <aside className="rail-panel k-scene-panel hidden lg:flex lg:flex-col" aria-hidden="true">
      <div className="rail-panel-label">
        <span>SIGNAL // K</span>
      </div>
      <div className="k-scene-stage">
        <KScene />
      </div>
      <p className="rail-panel-hint">drag to rotate</p>
    </aside>
  );
}
