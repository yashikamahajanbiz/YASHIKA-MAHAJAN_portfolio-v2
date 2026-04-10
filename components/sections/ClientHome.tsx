"use client";

import { usePortfolioStore } from "@/hooks/usePortfolioStore";
import NeuralString from "@/components/neural/NeuralString";
import DesktopEnvironment from "@/components/desktop/DesktopEnvironment";
import NormalPeopleSwitch from "@/components/shared/NormalPeopleSwitch";

export default function ClientHome() {
  const isDesktopMode = usePortfolioStore((state) => state.isDesktopMode);

  return (
    <main className="min-h-screen">
      <NormalPeopleSwitch />
      {/* The neural timeline is always mounted; desktop mode layers on top after the fracture transition. */}
      <NeuralString />
      {isDesktopMode && <DesktopEnvironment />}
    </main>
  );
}
