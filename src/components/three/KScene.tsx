"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, ExtrudeGeometry, RepeatWrapping, Shape, type Group } from "three";

function slab(points: number[][], depth = .35) {
  const shape = new Shape();
  points.forEach(([x, y], i) => i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025 });
}

function rockTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(256, 256);
  let seed = 7321;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const shade = 70 + seed % 135;
    pixels.data[i] = shade; pixels.data[i + 1] = shade; pixels.data[i + 2] = shade; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  return texture;
}

function ObsidianK({ active }: { active: boolean }) {
  const group = useRef<Group>(null);
  const viewport = useThree(state => state.viewport);
  const scale = Math.min(1, viewport.width / 4.1, viewport.height / 4.3);
  const [texture] = useState(rockTexture);
  const [geometry] = useState(() => ({
    core: slab([[-1.1,-1.6],[-.45,-1.6],[-.45,-.36],[.7,-1.6],[1.42,-1.6],[.14,.08],[1.42,1.6],[.66,1.6],[-.45,.46],[-.45,1.6],[-1.1,1.6]], .29),
    pieces: [
      slab([[-1.1,1.6],[-.48,1.6],[-.48,.59],[-1.1,.91]]),
      slab([[-1.1,.84],[-.48,.52],[-.48,-.47],[-1.1,-.16]]),
      slab([[-1.1,-.23],[-.48,-.54],[-.48,-1.6],[-1.1,-1.6]]),
      slab([[-.43,.39],[.69,1.6],[1.42,1.6],[.14,.13],[-.43,-.16]]),
      slab([[-.4,-.23],[.1,.04],[1.42,-1.6],[.72,-1.6]]),
    ],
  }));
  useEffect(() => () => { texture.dispose(); geometry.core.dispose(); geometry.pieces.forEach(piece => piece.dispose()); }, [texture, geometry]);
  useFrame(({ clock, pointer }, delta) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y += (-.2 + pointer.x * .2 + Math.sin(t * .25) * .08 - group.current.rotation.y) * Math.min(delta * 2, 1);
    group.current.rotation.x += (.07 + pointer.y * .05 - group.current.rotation.x) * Math.min(delta * 2, 1);
    group.current.position.y = Math.sin(t * (active ? .8 : .45)) * .07;
  });
  return <group scale={scale}>
    <group ref={group} rotation={[.07, -.2, -.03]}>
      <mesh geometry={geometry.core}><meshStandardMaterial color="#ff8c13" emissive="#ff5a00" emissiveIntensity={3} roughness={.7} /></mesh>
      {geometry.pieces.map((piece, i) => <mesh key={i} geometry={piece} position={[0, 0, .045]}><meshStandardMaterial color="#55524c" map={texture} bumpMap={texture} bumpScale={.09} roughness={.52} metalness={.7} /></mesh>)}
    </group>
    <mesh position={[.1,-1.9,0]}><cylinderGeometry args={[1.55,1.8,.22,64]} /><meshStandardMaterial color="#242322" metalness={.65} roughness={.55} /></mesh>
    <mesh position={[.1,-1.78,0]} rotation={[Math.PI / 2,0,0]}><torusGeometry args={[1.48,.014,8,80]} /><meshStandardMaterial color="#ff861f" emissive="#ff6b00" emissiveIntensity={2} /></mesh>
  </group>;
}

export default function KScene({ moving = true, active = false }: { moving?: boolean; active?: boolean }) {
  return <Canvas camera={{ position: [0, .05, 6.7], fov: 39 }} dpr={[1, 1.5]} frameloop={moving ? "always" : "demand"} gl={{ antialias: true, alpha: true }}>
    <hemisphereLight args={["#e4e6e2", "#321000", 2]} />
    <directionalLight position={[-3,5,4]} intensity={6} color="#f1f2ef" />
    <directionalLight position={[4,2,-2]} intensity={4} color="#ff8b27" />
    <pointLight position={[-.4,0,2]} intensity={16} color="#ff5b00" />
    <ObsidianK active={active} />
  </Canvas>;
}
