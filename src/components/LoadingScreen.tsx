"use client";

import { useEffect, useRef, useState } from "react";

const BOOT_LINES = [
  { text: "> HYDRA ARMS SYSTEMS v2.1.4", color: "#ffffff" },
  { text: "> INITIALIZING CORE MODULES...", color: "#888888" },
  { text: "> LOADING DEFENSE PROTOCOLS... OK", color: "#13ff15" },
  { text: "> SECURE CONNECTION........... OK", color: "#13ff15" },
  { text: "> SYSTEM READY", color: "#ffffff" },
];

const CHAR_MS = 22;
const LINE_GAP_MS = 100;

export default function LoadingScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"typing" | "glitching" | "done">("typing");
  const [removed, setRemoved] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.documentElement.classList.add("loading-active");
    return () => document.documentElement.classList.remove("loading-active");
  }, []);

  // Single effect — schedule every character and line upfront
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let t = 200; // initial delay

    const totalChars = BOOT_LINES.reduce((s, l) => s + l.text.length, 0);
    let charsSoFar = 0;

    BOOT_LINES.forEach((line) => {
      // Create line element
      const lineEl = document.createElement("div");
      lineEl.style.cssText = `
        font-size: 14px;
        line-height: 1.9;
        white-space: pre;
        letter-spacing: 0.04em;
        color: ${line.color};
        font-family: var(--font-mono), monospace;
      `;
      // Don't add to DOM yet — add when first char appears

      let addedToDom = false;

      for (let ci = 0; ci < line.text.length; ci++) {
        const charIndex = ci;
        const currentTotal = ++charsSoFar;

        timeouts.push(
          setTimeout(() => {
            if (!addedToDom) {
              // Insert before the progress bar
              const progressEl = container.querySelector(".ls-bar");
              if (progressEl) {
                container.insertBefore(lineEl, progressEl);
              } else {
                container.appendChild(lineEl);
              }
              addedToDom = true;
            }
            lineEl.textContent = line.text.slice(0, charIndex + 1);

            // Update progress bar
            const pct = Math.round((currentTotal / totalChars) * 100);
            const filled = Math.round(pct / 5);
            const bar = container.querySelector(".ls-bar");
            if (bar) {
              bar.textContent = `[${"█".repeat(filled)}${"░".repeat(20 - filled)}] ${pct}%`;
            }
          }, t)
        );

        t += CHAR_MS;
      }

      t += LINE_GAP_MS;
    });

    // Glitch out
    const glitchStart = t + 100;
    timeouts.push(setTimeout(() => setPhase("glitching"), glitchStart));

    // Remove
    const removeAt = glitchStart + 500;
    timeouts.push(
      setTimeout(() => {
        setPhase("done");
        setRemoved(true);
        document.documentElement.classList.remove("loading-active");
        window.dispatchEvent(new Event("loadingDone"));
      }, removeAt)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Safety
  useEffect(() => {
    const t = setTimeout(() => {
      setRemoved(true);
      document.documentElement.classList.remove("loading-active");
      window.dispatchEvent(new Event("loadingDone"));
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  if (removed) return null;

  return (
    <div
      className={`ls ${phase === "glitching" ? "ls--glitch" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono), monospace",
      }}
    >
      <div className="ls-scanlines" />
      <div
        ref={containerRef}
        style={{ position: "relative", zIndex: 3 }}
      >
        <div
          className="ls-bar"
          style={{
            fontSize: 14,
            lineHeight: 1.9,
            whiteSpace: "pre",
            letterSpacing: "0.04em",
            color: "#888888",
            marginTop: 12,
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          [░░░░░░░░░░░░░░░░░░░░] 0%
        </div>
      </div>
    </div>
  );
}
