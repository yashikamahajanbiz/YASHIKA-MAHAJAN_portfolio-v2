"use client";

import Window from "@/components/desktop/Window";
import { useWindowManager } from "@/hooks/useWindowManager";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { usePortfolioStore } from "@/hooks/usePortfolioStore";

const windowIds = ["terminal", "bakery", "vision"];

const BakeryCanvas = dynamic(() => import("@/components/desktop/BakeryCanvas"), {
  ssr: false
});

export default function DesktopEnvironment() {
  const { bringToFront, getZIndex, isActive } = useWindowManager(windowIds);
  const desktopRef = useRef<HTMLDivElement | null>(null);
  const holdValueRef = useRef({ value: 0 });
  const holdTweenRef = useRef<gsap.core.Tween | null>(null);
  const bufferRef = useRef("");
  const reassemblingRef = useRef(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isArming, setIsArming] = useState(false);
  const exitDesktopMode = usePortfolioStore((state) => state.exitDesktopMode);
  const requestReassemble = usePortfolioStore((state) => state.requestReassemble);

  useEffect(() => {
    // Lock page scrolling while the faux desktop is active so the experience feels like a mode switch.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const beginReassemble = useCallback(() => {
    if (reassemblingRef.current) return;
    const desktop = desktopRef.current;
    if (!desktop) return;

    reassemblingRef.current = true;

    // Fade the windows first, then collapse the whole desktop layer and hand control back to the timeline.
    gsap.to(".desktop-window", {
      scale: 0.2,
      opacity: 0,
      duration: 0.55,
      ease: "power3.in",
      stagger: 0.05
    });

    gsap.to(desktop, {
      opacity: 0,
      duration: 0.65,
      ease: "power3.in",
      onComplete: () => {
        exitDesktopMode();
        requestReassemble();
        setIsArming(false);
        gsap.set(desktop, { clearProps: "all" });
        reassemblingRef.current = false;
      }
    });
  }, [exitDesktopMode, requestReassemble]);

  const stopHold = () => {
    // Ease the hold progress back down so accidental presses do not snap the UI.
    setIsHolding(false);
    setIsArming(false);
    holdTweenRef.current?.kill();
    holdTweenRef.current = null;
    holdTweenRef.current = gsap.to(holdValueRef.current, {
      value: 0,
      duration: 0.22,
      ease: "power2.out",
      onUpdate: () => setHoldProgress(holdValueRef.current.value)
    });
  };

  const startHold = () => {
    // Holding the action button acts like a safety latch before reassembling the timeline.
    if (reassemblingRef.current) return;
    setIsHolding(true);
    setIsArming(true);
    holdTweenRef.current?.kill();
    holdTweenRef.current = gsap.to(holdValueRef.current, {
      value: 1,
      duration: 1.15,
      ease: "none",
      onUpdate: () => setHoldProgress(holdValueRef.current.value),
      onComplete: () => {
        setIsHolding(false);
        setIsArming(false);
        setHoldProgress(0);
        holdValueRef.current.value = 0;
        beginReassemble();
      }
    });
  };

  useEffect(() => {
    // Hidden keyboard shortcut for testing the return transition without pointer gestures.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.length !== 1) return;
      bufferRef.current = (bufferRef.current + event.key.toLowerCase()).slice(-10);
      if (bufferRef.current === "reassemble") {
        beginReassemble();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [beginReassemble]);

  return (
    <section className="fixed inset-0 z-30 overflow-hidden">
      <div className="mesh-gradient absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: holdProgress * 0.35,
          background:
            "radial-gradient(circle at 50% 45%, rgba(125,249,255,0.28), rgba(0,0,0,0) 62%)"
        }}
      />
      <aside className="desktop-return-switch control-orb control-orb--return" aria-label="Return to the main timeline">
        <p className="desktop-return-switch__eyebrow">Need the full story again?</p>
        <button
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={() => {
            if (isHolding) stopHold();
          }}
          className="desktop-return-switch__link desktop-return-switch__link--hold"
          style={{
            background: `linear-gradient(135deg, rgba(125, 249, 255, ${0.18 + holdProgress * 0.4}), rgba(255,255,255,0.08))`
          }}
          aria-label="Hold to reassemble timeline"
        >
          <span className="desktop-return-switch__copy">
            <strong>{isArming ? "Reassembling" : isHolding ? "Hold steady" : "Hold to Reassemble"}</strong>
            <small>Collapse the desktop and return to the hero layer.</small>
          </span>
          <span className="desktop-return-switch__badge" aria-hidden="true">
            {Math.max(1, Math.round(holdProgress * 100))}%
          </span>
        </button>
        <p className="desktop-return-switch__shortcut" aria-label="Keyboard shortcut">
          Or type <span>reassemble</span> anywhere.
        </p>
      </aside>

      <div ref={desktopRef} className="absolute inset-0 hidden lg:block">
        {/* Desktop windows tell the personal story through draggable, app-like panels. */}
        <Window
          id="terminal"
          title="Terminal.exe"
          position={{ x: 120, y: 120 }}
          zIndex={getZIndex("terminal")}
          isActive={isActive("terminal")}
          onFocus={bringToFront}
          tone="dark"
          width="480px"
          height="320px"
          className="desktop-window window-terminal"
        >
          <div className="p-5 font-mono text-xs leading-relaxed text-emerald-200">
            <p>$ tail -f zendesk.log</p>
            <p>- Zendesk automations: 42 active rules</p>
            <p>- AI deflection rate: 38%</p>
            <p>- L5.ai research queue: green</p>
            <p className="mt-4">$ cat experience.txt</p>
            <p>Consultant - Automation - Product Research</p>
          </div>
        </Window>

        <Window
          id="bakery"
          title="Bakery.app"
          position={{ x: 640, y: 160 }}
          zIndex={getZIndex("bakery")}
          isActive={isActive("bakery")}
          onFocus={bringToFront}
          tone="light"
          width="420px"
          height="380px"
          className="desktop-window window-bakery"
        >
          <BakeryCanvas />
        </Window>

        <Window
          id="vision"
          title="Vision.log"
          position={{ x: 260, y: 520 }}
          zIndex={getZIndex("vision")}
          isActive={isActive("vision")}
          onFocus={bringToFront}
          tone="light"
          width="460px"
          height="260px"
          className="desktop-window window-vision"
        >
          <div className="p-6 text-sm">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-slate-500">Goals</p>
            <p className="mt-3 text-lg font-semibold">Ivy League + MBA track</p>
            <p className="mt-2 text-slate-700">
              Build the research bridge from CSE to AI product leadership while scaling YUMMMO.
            </p>
          </div>
        </Window>
      </div>

      <div className="absolute inset-0 flex items-center lg:hidden">
        {/* Mobile falls back to a swipeable card stack instead of freeform windows. */}
        <div className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto px-6">
          <div className="min-w-[80vw] snap-center rounded-3xl bg-black/60 p-6 text-slate-100">
            <h3 className="text-lg font-semibold">Terminal.exe</h3>
            <p className="mt-3 text-xs font-mono">Zendesk automation streams + L5.ai research notes.</p>
          </div>
          <div className="min-w-[80vw] snap-center rounded-3xl bg-white/70 p-6 text-slate-900">
            <h3 className="text-lg font-semibold">Bakery.app</h3>
            <p className="mt-3 text-sm">3D cookie lab (mobile preview).</p>
          </div>
          <div className="min-w-[80vw] snap-center rounded-3xl bg-white/70 p-6 text-slate-900">
            <h3 className="text-lg font-semibold">Vision.log</h3>
            <p className="mt-3 text-sm">MBA goals + research roadmap.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
