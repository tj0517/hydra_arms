"use client";

import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const KRAKOW: [number, number] = [19.94, 50.06];

export default function MilitaryMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: KRAKOW,
      zoom: 11,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });

    // Custom marker
    const markerEl = document.createElement("div");
    markerEl.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" stroke="#13ff15" stroke-width="1" fill="none" opacity="0.4"/>
        <circle cx="16" cy="16" r="8" stroke="#13ff15" stroke-width="0.75" fill="none" opacity="0.6"/>
        <circle cx="16" cy="16" r="3" fill="#13ff15"/>
        <line x1="16" y1="0" x2="16" y2="6" stroke="#13ff15" stroke-width="0.75" opacity="0.5"/>
        <line x1="16" y1="26" x2="16" y2="32" stroke="#13ff15" stroke-width="0.75" opacity="0.5"/>
        <line x1="0" y1="16" x2="6" y2="16" stroke="#13ff15" stroke-width="0.75" opacity="0.5"/>
        <line x1="26" y1="16" x2="32" y2="16" stroke="#13ff15" stroke-width="0.75" opacity="0.5"/>
      </svg>
    `;
    markerEl.style.cursor = "pointer";

    new maplibregl.Marker({ element: markerEl })
      .setLngLat(KRAKOW)
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
          m.setPaintProperty(id, "background-color", "#070a07");
        } else if (type === "fill") {
          m.setPaintProperty(id, "fill-color", "#0a0f0a");
        } else if (type === "line") {
          m.setPaintProperty(id, "line-color", "rgba(19,255,21,0.08)");
        } else if (type === "symbol") {
          m.setPaintProperty(id, "text-color", "rgba(19,255,21,0.25)");
        }
      }

      // Water
      if (m.getLayer("water")) {
        m.setPaintProperty("water", "fill-color", "#050805");
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
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
    </div>
  );
}
