export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://yashikamahajan.com/#person",
  name: "Yashika Mahajan",
  jobTitle: "CSE Engineer & Founder",
  description: "AI Product Researcher, Zendesk Automation Expert, and founder of YUMMMO.",
  worksFor: {
    "@type": "Organization",
    name: "L5.ai"
  },
  brand: {
    "@type": "Brand",
    name: "YUMMMO"
  },
  url: "https://yashikamahajan.com"
};

export const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://yashikamahajan.com/#service",
  name: "Yashika Mahajan Consulting",
  url: "https://yashikamahajan.com",
  areaServed: "Global",
  serviceType: ["Zendesk Automation", "AI Product Research"],
  provider: {
    "@type": "Person",
    "@id": "https://yashikamahajan.com/#person",
    name: "Yashika Mahajan"
  },
  brand: {
    "@type": "Brand",
    name: "YUMMMO"
  }
};
