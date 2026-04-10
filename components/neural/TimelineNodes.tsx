"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { timelineEvents } from "@/data/timeline";
import OverviewCard from "@/components/neural/OverviewCard";
import { NODE_TOP_GUARD, STRING_CENTER_X } from "@/lib/layout";
import { usePortfolioStore } from "@/hooks/usePortfolioStore";

gsap.registerPlugin(ScrollTrigger);

export default function TimelineNodes() {
  const nodeRefs = useRef<HTMLDivElement[]>([]);
  const mode = usePortfolioStore((state) => state.mode);

  useEffect(() => {
    const tweens: gsap.core.Tween[] = [];
    const triggers: ScrollTrigger[] = [];

    nodeRefs.current.forEach((node) => {
      if (!node) return;
      const tween = gsap.fromTo(
        node,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: node,
            start: "top 74%",
            toggleActions: "play none none reverse"
          }
        }
      );
      if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      tweens.push(tween);
    });

    return () => {
      triggers.forEach((trigger) => trigger.kill());
      tweens.forEach((tween) => tween.kill());
    };
  }, []);

  const renderWrapper = (id: string, children: React.ReactNode) => {
    if (id === "school" || id === "college" || id === "l5ai") {
      return <article>{children}</article>;
    }
    return <section>{children}</section>;
  };

  return (
    <div
      className={`timeline-section absolute inset-0 z-10 transition-opacity duration-500 ${
        mode === "timeline_intro" ? "opacity-0" : "opacity-100"
      }`}
    >
      {timelineEvents.map((event, index) => {
        const accent = event.accent === "warm" ? "text-warm" : "text-neural";
        const bg = event.accent === "warm" ? "bg-warm/20" : "bg-neural/10";
        const heavy = event.id === "btech" || event.id === "l5ai";
        const lane =
          event.id === "journey-start" ? "center" : index % 2 === 0 ? "left" : "right";
        const laneClass =
          lane === "center"
            ? "md:-translate-x-1/2"
            : lane === "left"
              ? "md:-translate-x-[115%]"
              : "md:translate-x-[15%]";

        return (
          <div
            key={event.id}
            ref={(el) => {
              if (el) nodeRefs.current[index] = el;
            }}
            className={`neural-node pointer-events-auto absolute w-[min(460px,90vw)] -translate-x-1/2 ${laneClass}`}
            style={{
              left: STRING_CENTER_X,
              top: `max(${NODE_TOP_GUARD}px, ${event.at * 100}%)`
            }}
            data-heavy={heavy ? "true" : "false"}
          >
            {renderWrapper(
              event.id,
              event.id === "journey-start" ? (
                <OverviewCard />
              ) : (
                <div className={`glass-panel tile-glow ${bg} rounded-3xl p-6 md:p-7`}>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${event.accent === "warm" ? "bg-warm" : "bg-neural"}`} />
                  <p className={`text-sm uppercase tracking-[0.32em] ${accent}`}>{event.year}</p>
                </div>
                <h2 className="mt-4 text-2xl font-semibold">
                  {event.id === "l5ai"
                    ? "Expertise in Zendesk and L5.ai"
                    : event.id === "btech"
                      ? "B.Tech CSE India"
                      : event.title}
                </h2>
                {event.id === "bakery" && (
                  <h3 className="mt-2 text-sm uppercase tracking-[0.28em] text-warm">YUMMMO Bakery Founder</h3>
                )}
                <p className="mt-3 text-sm text-slate-200/90">{event.description}</p>
                {event.id === "bakery" && (
                  <div className="mt-4 overflow-hidden rounded-2xl">
                    <Image
                      src="/bakery-placeholder.svg"
                      alt="Bakery product moodboard preview"
                      width={400}
                      height={260}
                      className="h-auto w-full"
                    />
                  </div>
                )}
                {event.id === "btech" && (
                  <div className="mt-4" style={{ perspective: "800px" }}>
                    <div
                      className="animate-float rounded-2xl bg-black/40 p-4 font-mono text-xs text-neural"
                      style={{ transform: "translateZ(40px)" }}
                    >
                      <p>$ compile neural-string --timeline --scroll</p>
                      <p>$ ship research notes to production</p>
                    </div>
                  </div>
                )}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
