"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isSoftwareRendering } from "./softwareRendering";

interface GraphicsCapability {
  lowGraphicsMode: boolean;
}

const GraphicsCapabilityContext = createContext<GraphicsCapability>({
  lowGraphicsMode: false,
});

export function GraphicsCapabilityProvider({ children }: { children: ReactNode }) {
  const [lowGraphicsMode, setLowGraphicsMode] = useState(false);

  useEffect(() => {
    if (!isSoftwareRendering()) return;

    setLowGraphicsMode(true);
    document.documentElement.setAttribute("data-low-graphics", "");

    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[HydraArms] Software rendering detected (no GPU acceleration) — low graphics mode enabled."
      );
    }
  }, []);

  return (
    <GraphicsCapabilityContext.Provider value={{ lowGraphicsMode }}>
      {children}
    </GraphicsCapabilityContext.Provider>
  );
}

export function useGraphicsCapability(): GraphicsCapability {
  return useContext(GraphicsCapabilityContext);
}
