"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Float, OrbitControls, Text3D } from "@react-three/drei";
import type { MeshStandardMaterial } from "three";

// Self-hosted nowhere — this is the standard, version-pinned Three.js example
// typeface (jsdelivr mirrors the npm package's static files), the same
// approach used across the React Three Fiber ecosystem. A real font glyph,
// not a hand-plotted shape — the lesson from the 2D logo: hand-plotted K
// shapes read wrong, the actual letterform never does.
const FONT_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json";

// Just the K now — no orbiting shapes around it. A slow emissive pulse gives
// it some life beyond the constant spin, like a sign catching current.
function PulsingK() {
  const mat = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) {
      mat.current.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 1.4) * 0.22;
    }
  });
  return (
    <Text3D
      font={FONT_URL}
      size={1.9}
      height={0.6}
      curveSegments={10}
      bevelEnabled
      bevelThickness={0.06}
      bevelSize={0.04}
      bevelSegments={4}
    >
      K
      <meshStandardMaterial ref={mat} color="#ff7a1a" emissive="#ff7a1a" metalness={0.55} roughness={0.25} />
    </Text3D>
  );
}

function SceneContents() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 3, 4]} intensity={40} color="#ff7a1a" />
      <pointLight position={[-3, -2, -3]} intensity={20} color="#39a0ff" />

      <Float speed={1.8} rotationIntensity={0} floatIntensity={0.6}>
        <Center>
          <PulsingK />
        </Center>
      </Float>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={3.2}
        minPolarAngle={Math.PI / 2 - 0.6}
        maxPolarAngle={Math.PI / 2 + 0.6}
      />
    </>
  );
}

export default function KScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 42 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <SceneContents />
      </Suspense>
    </Canvas>
  );
}
