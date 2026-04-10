"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const TRIGGER = "yum";

export default function EasterEgg() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bufferRef = useRef("");

  useEffect(() => {
    const spawnCookie = () => {
      const container = containerRef.current;
      if (!container) return;
      const cookie = document.createElement("div");
      cookie.className = "cookie-fall";
      cookie.setAttribute("role", "img");
      cookie.setAttribute("aria-label", "3D cookie easter egg");
      cookie.style.left = `${Math.random() * 70 + 10}%`;
      container.appendChild(cookie);

      gsap.to(cookie, {
        y: window.innerHeight * 0.6,
        duration: 2.2,
        ease: "bounce.out",
        onComplete: () => cookie.remove()
      });
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key.length !== 1) return;
      bufferRef.current = (bufferRef.current + event.key.toLowerCase()).slice(-3);
      if (bufferRef.current === TRIGGER) spawnCookie();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return <div ref={containerRef} className="pointer-events-none fixed inset-0 z-[9998]" />;
}
