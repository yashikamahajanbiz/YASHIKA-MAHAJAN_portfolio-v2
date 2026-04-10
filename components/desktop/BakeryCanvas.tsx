"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function CookieCube() {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useFrame((state) => {
    if (!isVisible) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.x = state.clock.getElapsedTime() * 0.3;
    mesh.rotation.y = state.clock.getElapsedTime() * 0.5;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.45, 1.45, 1.45]} />
      <meshStandardMaterial color="#f2c278" roughness={0.45} metalness={0.08} />
    </mesh>
  );
}

export default function BakeryCanvas() {
  return (
    <div className="h-full w-full" role="img" aria-label="3D model of YUMMMO healthy chocolate truffle">
      <Canvas dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 2, 2]} intensity={1.1} />
        <CookieCube />
      </Canvas>
    </div>
  );
}
