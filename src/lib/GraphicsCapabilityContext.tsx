"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { detectSoftwareRendering } from "./softwareRendering";

interface GraphicsCapability {
  lowGraphicsMode: boolean;
}

const GraphicsCapabilityContext = createContext<GraphicsCapability>({
  lowGraphicsMode: false,
});

export function GraphicsCapabilityProvider({ children }: { children: ReactNode }) {
  const [lowGraphicsMode, setLowGraphicsMode] = useState(false);

  useEffect(() => {
    const reason = detectSoftwareRendering();
    if (!reason) return;

    setLowGraphicsMode(true);
    document.documentElement.setAttribute("data-low-graphics", "");

    if (process.env.NODE_ENV === "development") {
      const detail =
        reason === "no-webgl"
          ? "signal: webgl-context-failed (no GPU / context creation refused)"
          : "signal: software-renderer-detected (Microsoft Basic Render Driver / SwiftShader / llvmpipe)";
      console.warn(`[HydraArms] Low graphics mode enabled — ${detail}`);
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
