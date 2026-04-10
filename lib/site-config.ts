const CLASSIC_PORTFOLIO_FALLBACK = "/classic-sub";

export function getClassicPortfolioUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_CLASSIC_PORTFOLIO_URL?.trim();

  return configuredUrl || CLASSIC_PORTFOLIO_FALLBACK;
}

export { CLASSIC_PORTFOLIO_FALLBACK };
