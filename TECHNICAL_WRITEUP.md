# Hybrid Neural Portfolio - Technical Write-Up

## Overview
This foundation uses Next.js 14 (App Router), TypeScript, Tailwind CSS, GSAP + ScrollTrigger for the Neural String timeline, Framer Motion for draggable window UI, and React Three Fiber for the Big Bang transition and 3D bakery content. Zustand tracks the core hybrid mode (`isDesktopMode`).

## Architecture
- Timeline Mode: 500vh scroll canvas with an animated SVG path synced via ScrollTrigger. Timeline nodes fade in with GSAP and remain semantic (`article` tags for School, College, L5.ai).
- Transition: On scroll depth `window.innerHeight * 5`, the string vibrates, shatters into rectangular panes, and triggers a Three.js camera FOV zoom to simulate depth.
- Desktop Mode: A fixed, non-scrolling glassmorphism desktop with draggable windows and a z-index window manager.
- Mobile Fallback: Desktop windows collapse into a horizontal card carousel.

## Performance
- Scroll interactions use GPU-friendly transforms and lightweight SVG dash animations.
- 3D assets should be compressed `.glb` files under 500kb.
- Bakery imagery uses `next/image` for optimized loading.

## CMS
- Sanity.io is the intended CMS for blog posts, research papers, and bakery updates (planned integration).

## Requirement: Technical SEO & Keyword Ranking
Keywords to Target: [Your Name], L5.ai Consultant, Zendesk Automation Expert, B.Tech CSE India, AI Product Researcher, YUMMMO Bakery Founder.
Implementation:
- Server-Side Rendering (SSR): Use Next.js generateMetadata to ensure that even though the site is animated, search engines see a full HTML document with a proper h1 and description on page load.
- Semantic HTML: Wrap the "School" section in an <article> tag, the "College" section in another, and the "L5.ai" section in a third. Use h2 and h3 tags containing the keywords (e.g., <h2>Expertise in Zendesk and L5.ai</h2>) even if they are styled to look like part of the animation.
- JSON-LD Schema: Inject a Person and ProfessionalService schema into the <head>. This tells Google exactly who you are, your role at L5, and your brand (YUMMMO) in a language it understands.
- Alt-Text for 3D/Canvas: Every image or 3D model must have a descriptive alt or aria-label (e.g., "3D model of YUMMMO healthy chocolate truffle").
- Image Optimization: Use the next/image component to ensure high-resolution bakery photos don't slow down the site, which is a major Google ranking factor.
