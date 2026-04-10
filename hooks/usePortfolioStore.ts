import { create } from "zustand";

// These modes drive the whole homepage experience from first scroll to desktop overlay and back again.
export type PortfolioMode =
  | "timeline_intro"
  | "timeline_scroll"
  | "fracturing"
  | "desktop"
  | "reassembling";

type PortfolioState = {
  mode: PortfolioMode;
  isDesktopMode: boolean;
  isTransitioning: boolean;
  reassembleSignal: number;
  setMode: (mode: PortfolioMode) => void;
  startTransition: () => void;
  enterDesktopMode: () => void;
  exitDesktopMode: () => void;
  requestReassemble: () => void;
  finishReassemble: () => void;
};

export const usePortfolioStore = create<PortfolioState>((set) => ({
  mode: "timeline_intro",
  isDesktopMode: false,
  isTransitioning: false,
  reassembleSignal: 0,
  // `setMode` is the generic escape hatch used by UI layers that only need to switch the visible state.
  setMode: (mode) =>
    set({
      mode,
      isDesktopMode: mode === "desktop"
    }),
  // These helpers make the major animation transitions readable at the call site.
  startTransition: () => set({ mode: "fracturing", isTransitioning: true }),
  enterDesktopMode: () => set({ mode: "desktop", isDesktopMode: true, isTransitioning: false }),
  exitDesktopMode: () => set({ mode: "reassembling", isDesktopMode: false }),
  requestReassemble: () =>
    set((state) => ({
      mode: "reassembling",
      isTransitioning: true,
      // Incrementing the signal gives effects a reliable way to react even if the mode string is unchanged.
      reassembleSignal: state.reassembleSignal + 1
    })),
  finishReassemble: () => set({ mode: "timeline_scroll", isTransitioning: false, isDesktopMode: false })
}));
