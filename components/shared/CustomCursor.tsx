"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    let raf = 0;
    const move = (event: PointerEvent) => {
      const { clientX, clientY } = event;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cursor.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      });
    };

    const handleOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const heavy = target.closest("[data-heavy='true']");
      if (heavy) dotRef.current?.classList.add("loading");
    };

    const handleOut = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const heavy = target.closest("[data-heavy='true']");
      if (heavy) dotRef.current?.classList.remove("loading");
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);

    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
    };
  }, []);

  return (
    <div ref={cursorRef} className="pointer-events-none fixed left-0 top-0 z-[9999] hidden md:block">
      <div ref={dotRef} className="cursor-dot absolute" />
    </div>
  );
}
