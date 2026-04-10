"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePortfolioStore } from "@/hooks/usePortfolioStore";

gsap.registerPlugin(ScrollTrigger);

export default function DynamicHeader() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const ymRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLDivElement | null>(null);
  const nameWrapRef = useRef<HTMLDivElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const scoreRef = useRef<HTMLDivElement | null>(null);
  const setMode = usePortfolioStore((state) => state.setMode);

  useLayoutEffect(() => {
    setMode("timeline_intro");

    const ctx = gsap.context(() => {
      const trigger = document.querySelector("[data-neural-section]");
      if (!trigger) return;

      gsap.set(ymRef.current, { opacity: 1, scale: 1 });
      gsap.set(nameRef.current, { opacity: 0, scale: 1.1 });
      gsap.set(nameWrapRef.current, { y: 0, scale: 1 });
      gsap.set(subtitleRef.current, { autoAlpha: 0, y: 18 });
      gsap.set(scoreRef.current, { autoAlpha: 0, y: 24 });

      const introTl = gsap.timeline({
        onComplete: () => {
          setMode("timeline_scroll");
        }
      });
      introTl.to({}, { duration: 0.95 });
      introTl.to(ymRef.current, {
        opacity: 0,
        scale: 0.74,
        duration: 0.72,
        ease: "power2.out"
      });
      introTl.to(
        nameRef.current,
        {
          opacity: 1,
          scale: 1,
          duration: 0.74,
          ease: "power2.out"
        },
        "<0.12"
      );
      introTl.set(ymRef.current, { display: "none" });

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger,
          start: "top+=60 top",
          end: "top+=960 top",
          scrub: true
        }
      });

      scrollTl.to(nameWrapRef.current, { y: -250, scale: 0.64, duration: 0.42, ease: "none" }, 0);
      scrollTl.to(subtitleRef.current, { autoAlpha: 1, y: -184, duration: 0.28, ease: "none" }, 0.12);
      scrollTl.to(scoreRef.current, { autoAlpha: 1, y: -172, duration: 0.28, ease: "none" }, 0.16);
      scrollTl.to(subtitleRef.current, { autoAlpha: 0, y: -216, duration: 0.22, ease: "none" }, 0.54);
      scrollTl.to(scoreRef.current, { autoAlpha: 0, y: -210, duration: 0.24, ease: "none" }, 0.58);
    }, wrapRef);

    return () => ctx.revert();
  }, [setMode]);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none sticky top-0 z-30 flex h-screen items-center justify-center"
    >
      <div className="relative w-full max-w-3xl text-center">
        <div ref={nameWrapRef} className="relative h-32 md:h-40">
          <div
            ref={ymRef}
            className="absolute inset-0 flex items-center justify-center text-6xl md:text-7xl font-extrabold tracking-tight text-white opacity-100"
          >
            YM
          </div>
          <div
            ref={nameRef}
            className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-semibold tracking-tight text-white opacity-0"
          >
            Yashika Mahajan
          </div>
        </div>

        <p
          ref={subtitleRef}
          className="mx-auto mt-3 max-w-2xl text-sm md:text-base text-slate-200"
        >
          AI Product Researcher, Zendesk Automation Expert, Founder at YUMMMO.
        </p>

        <div ref={scoreRef} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass-panel tile-glow rounded-2xl px-4 py-3">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Education</p>
            <p className="mt-2 text-sm font-semibold">B.Tech CSE</p>
          </div>
          <div className="glass-panel tile-glow rounded-2xl px-4 py-3">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Work</p>
            <p className="mt-2 text-sm font-semibold">L5.ai Consultant</p>
          </div>
          <div className="glass-panel tile-glow rounded-2xl px-4 py-3">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Founder</p>
            <p className="mt-2 text-sm font-semibold">YUMMMO Bakery</p>
          </div>
        </div>
      </div>
    </div>
  );
}
