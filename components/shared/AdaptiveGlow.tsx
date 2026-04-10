"use client";

import { useEffect } from "react";

const NIGHT_START = 19;
const NIGHT_END = 6;

function isNightTime(date: Date) {
  const hour = date.getHours();
  return hour >= NIGHT_START || hour < NIGHT_END;
}

export default function AdaptiveGlow() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateGlow = () => {
      const glow = isNightTime(new Date()) || media.matches ? 0.9 : 0.55;
      root.style.setProperty("--neural-glow", glow.toString());
    };

    updateGlow();
    const interval = window.setInterval(updateGlow, 5 * 60 * 1000);

    media.addEventListener("change", updateGlow);
    return () => {
      clearInterval(interval);
      media.removeEventListener("change", updateGlow);
    };
  }, []);

  return null;
}
