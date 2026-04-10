"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import * as THREE from "three";
import { usePortfolioStore } from "@/hooks/usePortfolioStore";

function WarpScene({
  trigger,
  energy,
  mode
}: {
  trigger: boolean;
  energy: number;
  mode: "timeline_intro" | "timeline_scroll" | "fracturing" | "desktop" | "reassembling";
}) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const { camera, invalidate } = useThree();

  useEffect(() => {
    // A quick FOV punch sells the feeling that the scene is diving into a transition state.
    if (!trigger) return;
    const perspective = camera as THREE.PerspectiveCamera;
    const fromFov = perspective.fov;
    gsap.to(perspective, {
      fov: 32,
      duration: 1.2,
      ease: "power3.inOut",
      onUpdate: () => perspective.updateProjectionMatrix(),
      onComplete: () => {
        perspective.fov = fromFov;
        perspective.updateProjectionMatrix();
      }
    });
  }, [camera, trigger]);

  useEffect(() => {
    // Fracture mode gets its own shake-and-stretch timeline so the background reacts with the foreground string.
    const group = groupRef.current;
    if (!group || mode !== "fracturing") return;

    const tl = gsap.timeline();
    tl.to(group.position, {
      x: 0.08,
      y: -0.06,
      duration: 0.12,
      repeat: 7,
      yoyo: true,
      ease: "steps(2)"
    });
    tl.to(
      group.scale,
      {
        x: 1.18,
        y: 1.18,
        z: 1.18,
        duration: 0.42,
        ease: "power3.out"
      },
      "<0.1"
    );
    tl.to(
      group.rotation,
      {
        z: 0.4,
        duration: 0.42,
        ease: "power2.out"
      },
      "<"
    );

    return () => {
      tl.kill();
      gsap.set(group.position, { x: 0, y: 0, z: 0 });
      gsap.set(group.scale, { x: 1, y: 1, z: 1 });
      gsap.set(group.rotation, { x: 0, y: 0, z: 0 });
    };
  }, [mode]);

  useEffect(() => {
    // Demand-based rendering keeps the canvas lighter by invalidating at a controlled rate.
    const fps = mode === "fracturing" ? 12 : energy > 0.9 ? 20 : 16;
    const tickMs = Math.round(1000 / fps);
    const interval = window.setInterval(() => {
      if (!document.hidden) invalidate();
    }, tickMs);
    return () => window.clearInterval(interval);
  }, [energy, invalidate, mode]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // Rotate the background form slightly faster as transition energy rises.
    mesh.rotation.y += delta * (0.18 + energy * 0.2);
    mesh.rotation.x += delta * (0.1 + energy * 0.14);

    const core = coreRef.current;
    if (core) {
      // Counter-rotate the inner core to add depth without extra geometry.
      core.rotation.y -= delta * (0.12 + energy * 0.12);
      core.rotation.x += delta * 0.06;
    }

    const material = mesh.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 0.18 + energy * 0.14;
    material.opacity = 0.16 + energy * 0.16;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1.16, 0.2, 64, 8]} />
        <meshStandardMaterial
          color="#2dd4ff"
          emissive="#2dd4ff"
          emissiveIntensity={0.24}
          wireframe
          opacity={0.22}
          transparent
        />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshBasicMaterial color="#7df9ff" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

export default function TransitionCanvas({ trigger }: { trigger: boolean }) {
  const mode = usePortfolioStore((state) => state.mode);
  const energy = mode === "fracturing" || mode === "reassembling" ? 1 : mode === "desktop" ? 0.28 : 0.52;
  const layerOpacity = mode === "fracturing" ? 0.76 : mode === "reassembling" ? 0.66 : 0.36;

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500"
      style={{ opacity: layerOpacity }}
      aria-label="3D transition warp"
      role="img"
    >
      <Canvas
        dpr={[1, 1]}
        frameloop="demand"
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 6], fov: 55 }}
      >
        <ambientLight intensity={0.18 + energy * 0.2} />
        <directionalLight position={[4, 4, 4]} intensity={0.35 + energy * 0.4} />
        <WarpScene trigger={trigger} energy={energy} mode={mode} />
      </Canvas>
    </div>
  );
}
