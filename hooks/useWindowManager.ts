"use client";

import { useMemo, useState } from "react";

type WindowId = string;

type WindowManager = {
  bringToFront: (id: WindowId) => void;
  getZIndex: (id: WindowId) => number;
  isActive: (id: WindowId) => boolean;
};

export function useWindowManager(ids: WindowId[]): WindowManager {
  const [order, setOrder] = useState<WindowId[]>(ids);

  const bringToFront = (id: WindowId) => {
    setOrder((prev) => {
      if (!prev.includes(id)) return prev;
      return [...prev.filter((item) => item !== id), id];
    });
  };

  const zMap = useMemo(() => {
    const base = 20;
    return order.reduce<Record<string, number>>((acc, id, index) => {
      acc[id] = base + index;
      return acc;
    }, {});
  }, [order]);

  const getZIndex = (id: WindowId) => zMap[id] ?? 20;
  const activeWindow = order[order.length - 1];
  const isActive = (id: WindowId) => activeWindow === id;

  return { bringToFront, getZIndex, isActive };
}
