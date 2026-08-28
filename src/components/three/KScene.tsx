"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Center, Float, OrbitControls, Text3D } from "@react-three/drei";

// Self-hosted nowhere — this is the standard, version-pinned Three.js example
// typeface (jsdelivr mirrors the npm package's static files), the same
// approach used across the React Three Fiber ecosystem. A real font glyph,
// not a hand-plotted shape — the lesson from the 2D logo: hand-plotted K
// shapes read wrong, the actual letterform never does.
const FONT_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json";

function FloatingShard({
  position,
  color,
  geometry,
}: {
  position: [number, number, number];
  color: string;
  geometry: "octahedron" | "torus" | "box";
}) {
  return (
    <Float speed={1.6} rotationIntensity={1.4} floatIntensity={1.8}>
      <mesh position={position}>
        {geometry === "octahedron" && <octahedronGeometry args={[0.35]} />}
        {geometry === "torus" && <torusGeometry args={[0.28, 0.09, 12, 24]} />}
        {geometry === "box" && <boxGeometry args={[0.4, 0.4, 0.4]} />}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.55}
          metalness={0.3}
          roughness={0.35}
          wireframe
        />
      </mesh>
    </Float>
  );
}

function SceneContents() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 3, 4]} intensity={38} color="#ff7a1a" />
      <pointLight position={[-3, -2, -3]} intensity={18} color="#39a0ff" />

      <Center>
        <Text3D
          font={FONT_URL}
          size={1.7}
          height={0.55}
          curveSegments={10}
          bevelEnabled
          bevelThickness={0.06}
          bevelSize={0.04}
          bevelSegments={4}
        >
          K
          <meshStandardMaterial
            color="#ff7a1a"
            emissive="#ff7a1a"
            emissiveIntensity={0.5}
            metalness={0.55}
            roughness={0.25}
          />
        </Text3D>
      </Center>

      <FloatingShard position={[-1.6, 1.1, -0.6]} color="#ffc24d" geometry="octahedron" />
      <FloatingShard position={[1.7, -0.9, -0.4]} color="#39ff6a" geometry="torus" />
      <FloatingShard position={[-1.4, -1.2, 0.3]} color="#2e9bff" geometry="box" />
      <FloatingShard position={[1.5, 1.3, 0.2]} color="#b14eff" geometry="octahedron" />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={2.2}
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
