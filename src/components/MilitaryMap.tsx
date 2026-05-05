"use client";

import { useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STORE_LOCATION: [number, number] = [19.945, 50.065];
const DESKTOP_CENTER: [number, number] = [20.07, 50.065];

function getCenter(): [number, number] {
  if (typeof window === "undefined") return DESKTOP_CENTER;
  return window.innerWidth < 768 ? STORE_LOCATION : DESKTOP_CENTER;
}

export default function MilitaryMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: getCenter(),
      zoom: 11,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      dragPan: false,
      scrollZoom: false,
      touchZoomRotate: false,
      doubleClickZoom: false,
      keyboard: false,
    });

    // Custom marker — accent green target reticle with pulse
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim();
    const markerEl = document.createElement("div");
    markerEl.style.cssText = "position:relative;width:60px;height:60px;cursor:default;";
    markerEl.innerHTML = `
      <style>
        @keyframes markerPulse {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .marker-pulse {
          position: absolute;
          top: 50%; left: 50%;
          width: 20px; height: 20px;
          margin: -10px 0 0 -10px;
          border-radius: 50%;
          border: 1px solid ${accent};
          animation: markerPulse 2.5s ease-out infinite;
        }
        .marker-pulse-2 { animation-delay: 1.25s; }
      </style>
      <div class="marker-pulse"></div>
      <div class="marker-pulse marker-pulse-2"></div>
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:relative;">
        <circle cx="30" cy="30" r="22" stroke="${accent}" stroke-width="1" fill="none" opacity="0.4"/>
        <circle cx="30" cy="30" r="14" stroke="${accent}" stroke-width="0.75" fill="none" opacity="0.6"/>
        <circle cx="30" cy="30" r="4" fill="${accent}" opacity="1"/>
        <line x1="30" y1="2" x2="30" y2="12" stroke="${accent}" stroke-width="0.75" opacity="0.5"/>
        <line x1="30" y1="48" x2="30" y2="58" stroke="${accent}" stroke-width="0.75" opacity="0.5"/>
        <line x1="2" y1="30" x2="12" y2="30" stroke="${accent}" stroke-width="0.75" opacity="0.5"/>
        <line x1="48" y1="30" x2="58" y2="30" stroke="${accent}" stroke-width="0.75" opacity="0.5"/>
      </svg>
    `;

    new maplibregl.Marker({ element: markerEl })
      .setLngLat(STORE_LOCATION)
      .addTo(map.current);

    // Once loaded, apply green military color filter
    map.current.on("load", () => {
      const m = map.current!;
      const style = m.getStyle();
      if (!style?.layers) return;

      for (const layer of style.layers) {
        const id = layer.id;
        const type = layer.type;

        if (type === "background") {
          m.setPaintProperty(id, "background-color", "#080a04");
        } else if (type === "fill") {
          m.setPaintProperty(id, "fill-color", "#0c1008");
        } else if (type === "line") {
          m.setPaintProperty(id, "line-color", "rgba(192,200,199,0.12)");
        } else if (type === "symbol") {
          m.setPaintProperty(id, "text-color", `rgba(${parseInt(accent.slice(1,3),16)},${parseInt(accent.slice(3,5),16)},${parseInt(accent.slice(5,7),16)},0.25)`);
        }
      }

      // Water
      if (m.getLayer("water")) {
        m.setPaintProperty("water", "fill-color", "#060903");
      }
    });

    const onResize = () => {
      map.current?.easeTo({ center: getCenter(), duration: 300 });
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const handleZoom = useCallback((direction: "in" | "out") => {
    if (!map.current) return;
    const zoom = map.current.getZoom() + (direction === "in" ? 1 : -1);
    map.current.easeTo({ zoom, center: STORE_LOCATION, duration: 300 });
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full opacity-70" />
      {/* Green tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={{ background: "rgba(5,20,5,0.4)" }}
      />
      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(19,255,21,0.15) 2px, rgba(19,255,21,0.15) 4px)",
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(5,5,5,0.7) 100%)",
        }}
      />
      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col">
        <button
          onClick={() => handleZoom("in")}
          className="w-8 h-8 border border-white/10 bg-bg/70 backdrop-blur-sm text-text-dim hover:text-accent hover:border-accent/30 transition-all duration-300 font-[var(--font-mono)] text-[16px] flex items-center justify-center"
        >
          +
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="w-8 h-8 border border-white/10 border-t-0 bg-bg/70 backdrop-blur-sm text-text-dim hover:text-accent hover:border-accent/30 transition-all duration-300 font-[var(--font-mono)] text-[16px] flex items-center justify-center"
        >
          −
        </button>
      </div>
    </div>
  );
}
