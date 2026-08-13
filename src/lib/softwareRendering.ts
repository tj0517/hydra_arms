const SOFTWARE_RENDERER_PATTERNS = [
  "swiftshader",
  "microsoft basic render driver",
  "llvmpipe",
  "software rasterizer",
  "softpipe",
  "mesa offscreen",
];

export type SoftwareRenderingReason = "no-webgl" | "software-renderer" | null;

/**
 * Returns the reason lowGraphicsMode should be enabled, or null if GPU is fine.
 *
 * Detection uses two complementary signals:
 *
 * 1. failIfMajorPerformanceCaveat: true — the standard WebGL way. Chrome/Firefox
 *    return null from getContext() when hardware acceleration is disabled (e.g.
 *    chrome://settings/system), even if a software WebGL context would succeed.
 *    Works without any extension.
 *
 * 2. WEBGL_debug_renderer_info — secondary check for known software renderer
 *    strings (SwiftShader, Microsoft Basic Render Driver, llvmpipe…). Used as
 *    fallback when the caveat flag is not honored (some drivers report
 *    failIfMajorPerformanceCaveat incorrectly).
 */
export function detectSoftwareRendering(): SoftwareRenderingReason {
  try {
    const canvas = document.createElement("canvas");

    // ── Primary check ──────────────────────────────────────────────────────────
    // failIfMajorPerformanceCaveat causes the browser to return null whenever it
    // would fall back to software rendering. This is the most reliable signal and
    // does not require the WEBGL_debug_renderer_info extension.
    const glStrict = canvas.getContext("webgl", {
      failIfMajorPerformanceCaveat: true,
    }) as WebGLRenderingContext | null;

    if (!glStrict) {
      // Distinguish "software WebGL exists" from "no WebGL at all"
      const glAny = (canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
      return glAny ? "software-renderer" : "no-webgl";
    }

    // ── Secondary check ────────────────────────────────────────────────────────
    // Some drivers pass the caveat check but still run in software. Catch those
    // via the renderer string when the extension is available.
    const dbgInfo = glStrict.getExtension("WEBGL_debug_renderer_info");
    if (dbgInfo) {
      const renderer = (
        glStrict.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) as string
      ).toLowerCase();
      if (SOFTWARE_RENDERER_PATTERNS.some((p) => renderer.includes(p))) {
        return "software-renderer";
      }
    }

    return null;
  } catch {
    return "no-webgl";
  }
}
