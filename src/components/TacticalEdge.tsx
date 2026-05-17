"use client";

/**
 * TacticalEdge
 * ────────────
 * Hover effect: full-colour photo cross-fades into white (or blue)
 * glowing edge-detection render on a dark #1a2426 background.
 *
 * Filter pipeline (SVG, no external libs):
 *   desaturate → dilate → difference → boost+alpha → glow → merge
 *
 * Key insight: feBlend "difference" preserves alpha=1 (unlike
 * feComposite arithmetic which zeroes alpha on both-opaque inputs).
 * The final feColorMatrix derives alpha from luminance so that only
 * edge pixels are opaque — non-edge areas are transparent, letting
 * the dark container background show through.
 */

import { useId } from "react";
import Image from "next/image";

export interface TacticalEdgeProps {
  src: string;
  alt: string;
  /** Edge glow colour: "white" (default), "green" (site accent) or "blue" */
  glow?: "white" | "green" | "blue";
  /** Show only the outer contour, suppressing interior detail */
  contourOnly?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export default function TacticalEdge({
  src,
  alt,
  glow = "green",
  contourOnly = false,
  width = 900,
  height = 600,
  className = "",
}: TacticalEdgeProps) {

  /* Unique filter ID — multiple instances on one page won't clash */
  const uid = useId().replace(/:/g, "");
  const filterId = `te-${uid}`;

  /*
   * Final feColorMatrix values per glow variant.
   * Layout: 5 columns × 4 rows  (R, G, B, A)
   *   col 0-2: input RGB weights
   *   col 3:   input Alpha weight (always 0 here)
   *   col 4:   bias
   *
   * White: amplify R/G/B equally → pure white edges
   * Blue:  heavily boost B, moderate G, low R → cold cyan (#1af-ish)
   */
  /* #13FF15 → R=0.07  G=1.0  B=0.08
     Green matrix: G channel dominates (×14), slight R (×2), no B
     Blue matrix:  B dominates (×16), moderate G (×8), faint R (×3) */
  const colourMatrix =
    glow === "green"
      ? "2 0 0 0 0  14 0 0 0 0.05  1 0 0 0 0  20 20 20 0 -0.4"
      : glow === "blue"
      ? "3 0 0 0 0  8 0 0 0 0.03  16 0 0 0 0.08  20 20 20 0 -0.4"
      : "8 0 0 0 0  8 0 0 0 0  8 0 0 0 0  20 20 20 0 -0.4";

  return (
    <div className={`relative ${className}`}>
      {/* ── SVG filter definition (invisible, 0×0) ─────────────────── */}
      <svg
        width="0" height="0"
        aria-hidden="true"
        className="absolute"
        style={{ position: "absolute", overflow: "hidden" }}
      >
        <defs>
          <filter
            id={filterId}
            x="0%" y="0%" width="100%" height="100%"
            colorInterpolationFilters="sRGB"
          >
            {/* 0. Fill letterbox transparent areas with white.
                object-contain leaves alpha=0 outside the image content.
                The dilate step would see white→transparent as a huge
                contrast edge, drawing lines around the image boundary.
                Flooding white behind the source removes that contrast. */}
            <feFlood floodColor="white" result="white" />
            <feComposite in="SourceGraphic" in2="white" operator="over" result="filled" />

            {/* 1. Desaturate → greyscale */}
            <feColorMatrix
              in="filled"
              type="saturate" values="0"
              result="grey"
            />

            {/* 1b. Pre-blur to kill interior texture (contourOnly) */}
            {contourOnly && (
              <feGaussianBlur in="grey" stdDeviation="4" result="grey" />
            )}

            {/* 2. Dilate: expand bright pixels outward */}
            <feMorphology
              in="grey"
              operator="dilate" radius={contourOnly ? 2 : 1}
              result="dilated"
            />

            {/* 3. Difference → edges bright, bg/interior dark */}
            <feBlend
              in="dilated" in2="grey"
              mode="difference"
              result="rawEdges"
            />

            {/* 4. Colour tint + alpha from luminance */}
            <feColorMatrix
              in="rawEdges" type="matrix"
              values={colourMatrix}
              result="brightEdges"
            />

            {/* 5. Glow blur */}
            <feGaussianBlur
              in="brightEdges" stdDeviation={contourOnly ? 2 : 3}
              result="glow"
            />

            {/* 6. Merge: glow beneath + crisp edge on top */}
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="brightEdges" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Edge-detection render — always on.
          Filter on <img> directly (not the wrapper) so the dark bg is unfiltered.
          Non-edge pixels → alpha = 0 → #1a2426 shows through. */}
      <div className="relative z-10 h-full">
        <Image
          src={src} alt={alt}
          width={width} height={height}
          className="w-full h-full object-contain"
          draggable={false}
          style={{ filter: `url(#${filterId})` }}
        />
      </div>
    </div>
  );
}
