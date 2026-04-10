import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { personJsonLd, serviceJsonLd } from "@/lib/jsonld";
import AdaptiveGlow from "@/components/shared/AdaptiveGlow";
import CustomCursor from "@/components/shared/CustomCursor";
import EasterEgg from "@/components/shared/EasterEgg";
import Atmosphere from "@/components/shared/Atmosphere";

// Centralize SEO and social metadata here so page-level components can stay focused on UI.
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = "https://yashikamahajan.com";
  const title = "Yashika Mahajan | CSE Engineer & Founder";
  const description = "A journey from B.Tech CSE to AI Research and the world of YUMMMO.";
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: "/"
    },
    keywords: [
      "Yashika Mahajan",
      "L5.ai Consultant",
      "Zendesk Automation Expert",
      "B.Tech CSE India",
      "AI Product Researcher",
      "YUMMMO Bakery Founder"
    ],
    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: "Yashika Mahajan Portfolio",
      title,
      description
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD makes the portfolio easier for search engines and rich previews to understand. */}
        <Script
          id="jsonld-person"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <Script
          id="jsonld-service"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="cursor-hidden">
        {/* These layers sit above the app shell so every route shares the same visual language. */}
        <Atmosphere />
        <AdaptiveGlow />
        {children}
        <CustomCursor />
        <EasterEgg />
      </body>
    </html>
  );
}
