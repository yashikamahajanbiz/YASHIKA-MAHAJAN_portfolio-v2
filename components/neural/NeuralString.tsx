"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TimelineNodes from "@/components/neural/TimelineNodes";
import { usePortfolioStore } from "@/hooks/usePortfolioStore";
import dynamic from "next/dynamic";
import DynamicHeader from "@/components/sections/DynamicHeader";
import { STRING_CENTER_X } from "@/lib/layout";

gsap.registerPlugin(ScrollTrigger);

const TransitionCanvas = dynamic(() => import("@/components/neural/TransitionCanvas"), {
  ssr: false
});

export default function NeuralString() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const glowHeadRef = useRef<SVGPathElement | null>(null);
  const shardRefs = useRef<HTMLDivElement[]>([]);
  const hasShattered = useRef(false);
  const initialOffsetRef = useRef(0);
  const fractureArmedRef = useRef(true);
  const lastReadinessRef = useRef(0);
  const lastGlowRef = useRef(0);
  const reassemblePulseRef = useRef<HTMLDivElement | null>(null);
  const readinessBarRef = useRef<HTMLSpanElement | null>(null);
  const readinessLabelRef = useRef<HTMLSpanElement | null>(null);
  const shatterTlRef = useRef<gsap.core.Timeline | null>(null);
  const drawTriggerRef = useRef<ScrollTrigger | null>(null);
  const startTransition = usePortfolioStore((state) => state.startTransition);
  const enterDesktopMode = usePortfolioStore((state) => state.enterDesktopMode);
  const isTransitioning = usePortfolioStore((state) => state.isTransitioning);
  //Added mode subscription for visibility control
  const mode = usePortfolioStore((state) => state.mode);
  const reassembleSignal = usePortfolioStore((state) => state.reassembleSignal);
  const finishReassemble = usePortfolioStore((state) => state.finishReassemble);

  useEffect(() => {
    // This effect owns the entire scroll-driven fracture sequence and its reverse animation.
    const container = containerRef.current;
    const path = pathRef.current;
    const glowHead = glowHeadRef.current;
    if (!container || !path || !glowHead) return;

    hasShattered.current = false;
    // Keep line faint at start; glow ramps in near Journey Start.
    gsap.set(path, {
      opacity: 0.16,
      x: 0,
      strokeWidth: 2,
      filter: "none"
    });
    gsap.set(glowHead, {
      opacity: 0,
      strokeWidth: 5,
      filter: "drop-shadow(0 0 14px rgba(125, 249, 255, 0.9))"
    });
    gsap.set(shardRefs.current, { opacity: 0, x: 0, y: 0, rotate: 0, scale: 1 });

    const length = path.getTotalLength();
    // Start with part of the string already drawn so the hero feels alive before the user scrolls.
    const initialOffset = length * 0.75;
    initialOffsetRef.current = initialOffset;
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: initialOffset
    });
    gsap.set(glowHead, {
      strokeDasharray: `0 ${length}`,
      strokeDashoffset: length
    });

    const drawTween = gsap.to(path, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: 1
      }
    });
    drawTriggerRef.current = drawTween.scrollTrigger ?? null;

    const shatterTl = gsap.timeline({
      paused: true,
      onComplete: () => {
        // Once the fracture completes, stop the scroll timeline and reveal the desktop scene.
        drawTriggerRef.current?.disable();
        transitionTrigger.disable();
        enterDesktopMode();
      },
      onReverseComplete: () => {
        // Reset everything needed to make the opening journey playable again from the top.
        hasShattered.current = false;
        gsap.set(path, {
          opacity: 0.2,
          x: 0,
          strokeDashoffset: initialOffsetRef.current,
          strokeWidth: 2
        });
        gsap.set(glowHead, {
          opacity: 0,
          strokeDasharray: `0 ${length}`,
          strokeDashoffset: length,
          filter: "drop-shadow(0 0 14px rgba(125, 249, 255, 0.9))"
        });
        finishReassemble();
        window.scrollTo({ top: 0, behavior: "auto" });
        fractureArmedRef.current = false;
        drawTriggerRef.current?.enable();
        transitionTrigger.enable();
        ScrollTrigger.refresh();
      }
    });
    shatterTlRef.current = shatterTl;

    shatterTl.to(path, {
      x: -4,
      duration: 0.16,
      repeat: 12,
      yoyo: true,
      ease: "steps(2)"
    });

    shatterTl.to(
      path,
      {
        filter: "drop-shadow(0 0 20px rgba(125, 249, 255, 0.95))",
        strokeWidth: 3.8,
        duration: 0.25,
        repeat: 3,
        yoyo: true,
        ease: "steps(3)"
      },
      "<"
    );

    shatterTl.to(
      path,
      {
        opacity: 0,
        duration: 0.72,
        ease: "power2.out"
      },
      "<"
    );

    shatterTl.to(
      shardRefs.current,
      {
        opacity: 1,
        duration: 0.02
      },
      "<"
    );

    shatterTl.to(
      shardRefs.current,
      {
        x: () => gsap.utils.random(-240, 240),
        y: () => gsap.utils.random(-160, 160),
        rotate: () => gsap.utils.random(-30, 30),
        duration: 1.55,
        stagger: 0.06,
        ease: "power3.out"
      },
      "<"
    );

    const popTargets = [
      { x: -250, y: -110, rotate: -10, scale: 1.12 },
      { x: -120, y: 130, rotate: 8, scale: 1.06 },
      { x: 0, y: -150, rotate: -2, scale: 1.16 },
      { x: 150, y: 105, rotate: 11, scale: 1.06 },
      { x: 260, y: -95, rotate: -8, scale: 1.12 }
    ];

    shatterTl.to(
      shardRefs.current,
      {
        x: (index) => popTargets[index]?.x ?? 0,
        y: (index) => popTargets[index]?.y ?? 0,
        rotate: (index) => popTargets[index]?.rotate ?? 0,
        scale: (index) => popTargets[index]?.scale ?? 1,
        duration: 0.72,
        stagger: 0.04,
        ease: "back.out(1.5)"
      },
      ">"
    );

    const transitionTrigger = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        // Rearm the fracture only after the user moves far enough back up the page.
        if (!fractureArmedRef.current && self.progress < 0.35) {
          fractureArmedRef.current = true;
        }

        const readiness = gsap.utils.clamp(0, 1, (self.progress - 0.968) / 0.024);
        if (Math.abs(readiness - lastReadinessRef.current) > 0.04) {
          lastReadinessRef.current = readiness;
          if (readinessBarRef.current) {
            readinessBarRef.current.style.width = `${Math.round(readiness * 100)}%`;
          }
          if (readinessLabelRef.current) {
            readinessLabelRef.current.textContent =
              readiness > 0.05 ? "Hold Pull: Stability Low" : "Pull deeper to fracture the string";
          }
        }

        // Snake glow starts after Journey Start so it never overlaps the card on first reveal.
        const glowProgress = gsap.utils.clamp(0, 1, (self.progress - 0.41) / 0.34);
        if (Math.abs(glowProgress - lastGlowRef.current) > 0.02) {
          lastGlowRef.current = glowProgress;
          path.style.opacity = `${0.16 + glowProgress * 0.44}`;
          path.style.filter =
            glowProgress > 0.02
              ? `drop-shadow(0 0 ${2 + glowProgress * 8}px rgba(125, 249, 255, ${0.12 + glowProgress * 0.28}))`
              : "none";

          const headLength = 56 + glowProgress * 26;
          glowHead.style.opacity = `${glowProgress > 0.02 ? 0.95 : 0}`;
          glowHead.style.strokeDasharray = `${headLength} ${length}`;
          glowHead.style.strokeDashoffset = `${length * (1 - glowProgress)}`;
        }

        if (self.progress > 0.992 && fractureArmedRef.current && !hasShattered.current) {
          fractureArmedRef.current = false;
          hasShattered.current = true;
          startTransition();
          shatterTlRef.current?.timeScale(0.82).play(0);
        }
      }
    });
    const refreshTimeout = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);

    return () => {
      window.clearTimeout(refreshTimeout);
      shatterTlRef.current?.kill();
      shatterTlRef.current = null;
      drawTriggerRef.current = null;
      drawTween.scrollTrigger?.kill();
      transitionTrigger.kill();
    };
  }, [enterDesktopMode, startTransition, finishReassemble]);

  useEffect(() => {
    // Reassemble is driven by a store signal so the desktop view can trigger it without direct prop wiring.
    if (!reassembleSignal) return;
    const path = pathRef.current;
    const shatterTl = shatterTlRef.current;
    if (!path || !shatterTl) return;

    if (!hasShattered.current) {
      finishReassemble();
      window.scrollTo({ top: 0, behavior: "auto" });
      fractureArmedRef.current = false;
      return;
    }

    const length = path.getTotalLength();
    drawTriggerRef.current?.disable();

    const pulseEl = reassemblePulseRef.current;
    if (pulseEl) {
      gsap.fromTo(
        pulseEl,
        { opacity: 0 },
        {
          opacity: 0.38,
          duration: 0.42,
          repeat: 1,
          yoyo: true,
          ease: "power2.inOut"
        }
      );
    }

    gsap.fromTo(path, { filter: "drop-shadow(0 0 0px rgba(125, 249, 255, 0))" }, {
      filter: "drop-shadow(0 0 18px rgba(125, 249, 255, 0.9))",
      duration: 0.35,
      repeat: 1,
      yoyo: true,
      ease: "power2.inOut"
    });

    gsap.to(path, {
      strokeDashoffset: length,
      duration: 0.95,
      ease: "power2.inOut"
    });

    shatterTl.timeScale(1.15).reverse();
  }, [finishReassemble, reassembleSignal]);

  return (
    <section 
      ref={containerRef} 
      className="relative h-[500vh] w-full scroll-lock"
      data-neural-section
    >
      <div
        ref={reassemblePulseRef}
        className="pointer-events-none fixed inset-0 z-[25] opacity-0"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(125, 249, 255, 0.24), rgba(4, 8, 20, 0) 60%)"
        }}
      />
      <TransitionCanvas trigger={isTransitioning} />
      <DynamicHeader />
      <div className="pointer-events-none sticky top-0 h-screen">
        <svg
          className="absolute h-[500vh] w-2/3 md:w-1/3"
          viewBox="0 0 100 5000"
          preserveAspectRatio="none"
          style={{ left: STRING_CENTER_X, transform: "translateX(-50%)" }}
        >
          <path
            d="M50 0 C 45 400 55 800 50 1200 C 45 1600 60 2000 50 2400 C 42 2800 58 3200 50 3600 C 44 4000 56 4400 50 5000"
            stroke="rgba(125, 249, 255, 0.18)"
            strokeWidth="1"
            fill="none"
          />
          <path
            ref={pathRef}
            d="M50 0 C 45 400 55 800 50 1200 C 45 1600 60 2000 50 2400 C 42 2800 58 3200 50 3600 C 44 4000 56 4400 50 5000"
            stroke="#7df9ff"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            ref={glowHeadRef}
            d="M50 0 C 45 400 55 800 50 1200 C 45 1600 60 2000 50 2400 C 42 2800 58 3200 50 3600 C 44 4000 56 4400 50 5000"
            stroke="#9af7ff"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      <TimelineNodes />
      <div
        className={`pointer-events-none fixed left-1/2 z-[35] flex -translate-x-1/2 flex-col items-center gap-2 text-xs uppercase tracking-[0.34em] text-slate-400 transition-opacity duration-300 ${
          mode === "timeline_intro" || mode === "timeline_scroll" ? "opacity-100" : "opacity-0"
        }`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <span ref={readinessLabelRef}>Pull deeper to fracture the string</span>
        <span className="h-1 w-44 overflow-hidden rounded-full bg-white/10">
          <span ref={readinessBarRef} className="block h-full w-0 bg-cyan-300/80 transition-[width] duration-150" />
        </span>
      </div>
    </section>
  );
}
