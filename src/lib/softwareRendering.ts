const SOFTWARE_RENDERER_PATTERNS = [
  "swiftshader",
  "microsoft basic render driver",
  "llvmpipe",
  "software rasterizer",
  "softpipe",
  "mesa offscreen",
];

export function isSoftwareRendering(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    // No WebGL at all → software path
    if (!gl) return true;

    const dbgInfo = gl.getExtension("WEBGL_debug_renderer_info");
    // Extension blocked (privacy mode etc.) → can't tell, assume GPU OK
    if (!dbgInfo) return false;

    const renderer = (
      gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) as string
    ).toLowerCase();

    return SOFTWARE_RENDERER_PATTERNS.some((p) => renderer.includes(p));
  } catch {
    return false;
  }
}
