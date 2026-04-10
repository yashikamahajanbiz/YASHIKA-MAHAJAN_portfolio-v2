"use client";

import { motion } from "framer-motion";
import { ReactNode, useEffect, useMemo, useState } from "react";

type WindowProps = {
  id: string;
  title: string;
  children: ReactNode;
  width?: string;
  height?: string;
  position: { x: number; y: number };
  zIndex: number;
  isActive: boolean;
  onFocus: (id: string) => void;
  tone?: "dark" | "light";
  className?: string;
};

export default function Window({
  id,
  title,
  children,
  width = "420px",
  height = "360px",
  position,
  zIndex,
  isActive,
  onFocus,
  tone = "dark",
  className
}: WindowProps) {
  const [viewport, setViewport] = useState({ width: 1280, height: 800 });

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const numericWidth = useMemo(() => Number.parseInt(width, 10) || 420, [width]);
  const numericHeight = useMemo(() => Number.parseInt(height, 10) || 360, [height]);
  const constraints = useMemo(
    () => ({
      left: -position.x + 16,
      top: -position.y + 16,
      right: viewport.width - position.x - numericWidth - 16,
      bottom: viewport.height - position.y - numericHeight - 16
    }),
    [numericHeight, numericWidth, position.x, position.y, viewport.height, viewport.width]
  );

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.2}
      dragConstraints={constraints}
      onPointerDown={() => onFocus(id)}
      className={`glass-panel absolute overflow-hidden rounded-2xl transition-shadow duration-300 ${
        isActive ? "ring-1 ring-cyan-300/50 shadow-[0_0_50px_rgba(125,249,255,0.24)]" : "shadow-black/30"
      } ${className ?? ""}`}
      style={{
        width,
        height,
        top: position.y,
        left: position.x,
        zIndex
      }}
    >
      <div
        className={`window-titlebar flex items-center justify-between px-4 py-2 text-xs uppercase tracking-[0.3em] ${
          tone === "dark" ? "text-slate-300" : "text-slate-900"
        }`}
      >
        <span>{title}</span>
        <div className="flex gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-400/70" />
          <span className="h-2 w-2 rounded-full bg-amber-300/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-300/70" />
        </div>
      </div>
      <div className={tone === "dark" ? "h-full bg-black/50 text-slate-100" : "h-full bg-white/80 text-slate-900"}>
        {children}
      </div>
    </motion.div>
  );
}
