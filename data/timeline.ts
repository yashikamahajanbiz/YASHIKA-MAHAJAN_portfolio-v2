export type TimelineEvent = {
  id: string;
  title: string;
  year: string;
  description: string;
  accent?: "neural" | "warm";
  at: number;
};
//Placing of tiles
export const timelineEvents: TimelineEvent[] = [
  {
    id: "journey-start",
    title: "Journey Start",
    year: "Now",
    description: "From systems-driven engineering to AI product research and founder-led execution.",
    accent: "neural",
    at: 0.36
  },
  {
    id: "Education",
    title: "Education",
    year: "2007-2017",
    description: "Polaroids, art lab notebooks, and the first sparks of future-building.",
    accent: "warm",
    at: 0.46
  },
  {
    id: "college",
    title: "College",
    year: "2017-2019",
    description: "Leadership, campus ventures, and a growing obsession with systems thinking.",
    accent: "neural",
    at: 0.56
  },
  {
    id: "btech",
    title: "B.Tech CSE",
    year: "2019-2023",
    description: "Code snippets floating through neon fields, shipping products in the open as an AI Product Researcher.",
    accent: "neural",
    at: 0.66
  },
  {
    id: "bakery",
    title: "YUMMMO Origin",
    year: "2022-Present",
    description: "Warm, organic flavors turning into a boutique bakery lab.",
    accent: "warm",
    at: 0.76
  },
  {
    id: "l5ai",
    title: "L5.ai",
    year: "2023-Present",
    description: "Zendesk automation and AI product research at enterprise scale with L5.ai.",
    accent: "neural",
    at: 0.90
  },

  {
    id: "exp",
    title: "exp",
    year: "2023-Present",
    description: "Zendesk automation and AI product research at enterprise scale with L5.ai.",
    accent: "neural",
    at: 0.99
  }

];
