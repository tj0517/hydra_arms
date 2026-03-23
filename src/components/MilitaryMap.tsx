"use client";

import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Hydra Arms store address area in Kraków
const STORE_LOCATION: [number, number] = [19.945, 50.065];

export default function MilitaryMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: STORE_LOCATION,
      zoom: 11,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });

    // Custom marker — accent green target reticle
    const markerEl = document.createElement("div");
    markerEl.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="16" stroke="#b8d95a" stroke-width="1" fill="none" opacity="0.3"/>
        <circle cx="20" cy="20" r="10" stroke="#b8d95a" stroke-width="0.75" fill="none" opacity="0.5"/>
        <circle cx="20" cy="20" r="3" fill="#b8d95a" opacity="0.9"/>
        <line x1="20" y1="0" x2="20" y2="8" stroke="#b8d95a" stroke-width="0.75" opacity="0.4"/>
        <line x1="20" y1="32" x2="20" y2="40" stroke="#b8d95a" stroke-width="0.75" opacity="0.4"/>
        <line x1="0" y1="20" x2="8" y2="20" stroke="#b8d95a" stroke-width="0.75" opacity="0.4"/>
        <line x1="32" y1="20" x2="40" y2="20" stroke="#b8d95a" stroke-width="0.75" opacity="0.4"/>
      </svg>
    `;
    markerEl.style.cursor = "pointer";

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
          m.setPaintProperty(id, "background-color", "#070a07");
        } else if (type === "fill") {
          m.setPaintProperty(id, "fill-color", "#0a0f0a");
        } else if (type === "line") {
          m.setPaintProperty(id, "line-color", "rgba(184,217,90,0.07)");
        } else if (type === "symbol") {
          m.setPaintProperty(id, "text-color", "rgba(184,217,90,0.2)");
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
