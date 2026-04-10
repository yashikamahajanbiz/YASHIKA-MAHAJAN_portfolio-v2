# Hybrid Neural Portfolio (v2)

Stable baseline built on Next.js 14 (App Router), TypeScript, Tailwind, GSAP, Framer Motion, and React Three Fiber.

## Status

This is the primary Next.js codebase in the repo.
Use this app if you want the most maintainable place to customize content, animation, and layout.

## Local Dev

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Where To Customize

- `app/layout.tsx` sets global metadata, JSON-LD, and shared visual layers.
- `components/sections/ClientHome.tsx` chooses which major experience is visible.
- `components/neural/NeuralString.tsx` controls the scroll-to-fracture timeline sequence.
- `components/desktop/DesktopEnvironment.tsx` controls the desktop-mode overlay after the fracture.
- `hooks/usePortfolioStore.ts` is the main state machine for switching between modes.

## Linting Note

`npm audit` may report moderate vulnerabilities from ESLint's internal dependency (`ajv`).
These are dev-time only (lint tooling), not production runtime issues.
We keep ESLint enabled for code quality.
# YASHIKA-MAHAJAN_portfolio-v2
# YASHIKA-MAHAJAN_portfolio-v2
