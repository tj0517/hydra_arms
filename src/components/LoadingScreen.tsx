"use client";

import { useEffect, useState } from "react";

const ACCENT = "#b8d95a";

const BOOT_LINES = [
  { text: "> HYDRA ARMS SYSTEMS v2.1.4", color: "#ffffff" },
  { text: "> INICJALIZACJA MODUŁÓW...", color: "#888888" },
  { text: "> ŁADOWANIE PROTOKOŁÓW........ OK", color: ACCENT },
  { text: "> BEZPIECZNE POŁĄCZENIE....... OK", color: ACCENT },
  { text: "> SYSTEM GOTOWY", color: "#ffffff" },
];

export default function LoadingScreen() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "glitching" | "done">("loading");
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("loading-active");
    return () => document.documentElement.classList.remove("loading-active");
  }, []);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let t = 200;

    // Show lines one by one
    BOOT_LINES.forEach((_, i) => {
      timeouts.push(
        setTimeout(() => {
          setVisibleLines(i + 1);
          setProgress(Math.round(((i + 1) / BOOT_LINES.length) * 100));
        }, t)
      );
      t += 250;
    });

    // Glitch out
    timeouts.push(setTimeout(() => setPhase("glitching"), t + 100));

    // Remove
    timeouts.push(
      setTimeout(() => {
        setPhase("done");
        setRemoved(true);
        document.documentElement.classList.remove("loading-active");
        window.dispatchEvent(new Event("loadingDone"));
      }, t + 600)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Safety
  useEffect(() => {
    const t = setTimeout(() => {
      setRemoved(true);
      document.documentElement.classList.remove("loading-active");
      window.dispatchEvent(new Event("loadingDone"));
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  if (removed) return null;

  const filled = Math.round(progress / 5);

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
      <div style={{ position: "relative", zIndex: 3 }}>
        {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
          <div
            key={i}
            className="animate-fadeIn"
            style={{
              fontSize: 14,
              lineHeight: 1.9,
              whiteSpace: "pre",
              letterSpacing: "0.04em",
              color: line.color,
            }}
          >
            {line.text}
          </div>
        ))}
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.9,
            whiteSpace: "pre",
            letterSpacing: "0.04em",
            color: "#888888",
            marginTop: 12,
          }}
        >
          [{"█".repeat(filled)}{"░".repeat(20 - filled)}] {progress}%
        </div>
      </div>
    </div>
  );
}
