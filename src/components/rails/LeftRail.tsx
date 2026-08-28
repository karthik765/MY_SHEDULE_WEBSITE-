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
    <aside className="k-scene-panel hidden lg:block" aria-hidden="true">
      <div className="k-scene-stage">
        <KScene />
      </div>
    </aside>
  );
}
