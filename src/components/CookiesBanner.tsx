"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type CookiePrefs = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "hydra_cookie_consent";

export default function CookiesBanner() {
  const [visible, setVisible] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) setVisible(true);
  }, []);

  const save = (p: CookiePrefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setVisible(false);
  };

  const acceptAll = () => save({ necessary: true, analytics: true, marketing: true });
  const saveSelected = () => save(prefs);
  const rejectAll = () => save({ necessary: true, analytics: false, marketing: false });

  if (!visible) return null;

  const toggleRow = (key: keyof CookiePrefs) => {
    if (key === "necessary") return;
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const categories: { key: keyof CookiePrefs; label: string; desc: string; required?: boolean }[] = [
    {
      key: "necessary",
      label: "NIEZBĘDNE",
      desc: "Sesja, bezpieczeństwo, preferencje. Wymagane do działania serwisu.",
      required: true,
    },
    {
      key: "analytics",
      label: "ANALITYCZNE",
      desc: "Pomiar ruchu i zachowania użytkowników (Google Analytics / Plausible).",
    },
    {
      key: "marketing",
      label: "MARKETINGOWE",
      desc: "Reklamy dostosowane do profilu. Dane mogą być udostępniane partnerom.",
    },
  ];

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      {/* dim overlay — max ~15% opacity */}
      <div className="absolute inset-0 bg-black/[0.55]" />

      {/* Terminal window */}
      <div className="relative w-full max-w-[640px] border border-accent/20 bg-[#060806]/[0.85] shadow-[0_0_80px_color-mix(in_srgb,var(--color-accent)_4%,transparent)] overflow-hidden">

        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] z-[1]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, color-mix(in srgb, var(--color-accent) 15%, transparent) 2px, color-mix(in srgb, var(--color-accent) 15%, transparent) 4px)",
          }}
        />
        {/* CRT inner glow */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{ boxShadow: "inset 0 0 100px color-mix(in srgb, var(--color-accent) 3%, transparent)" }}
        />

        {/* Title bar */}
        <div className="relative z-[2] flex items-center gap-3 px-5 py-2.5 border-b border-accent/15 bg-accent/[0.04]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent/20" />
          </div>
          <span className="font-[var(--font-mono)] text-[11px] text-accent/50 tracking-[0.15em] uppercase">
            hydra-arms@terminal:~/cookies — POLITYKA PLIKÓW COOKIE
          </span>
        </div>

        {/* Body */}
        <div className="relative z-[2] p-6 space-y-5">

          {/* Boot lines */}
          <div className="font-[var(--font-mono)] text-[11px] text-accent/40 leading-[1.8] space-y-0">
            <div>HYDRA ARMS — ZARZĄDZANIE PRYWATNOŚCIĄ v1.0</div>
            <div>Ładowanie modułu cookies... <span className="text-accent/70">OK</span></div>
            <div>Protokół RODO/DSGVO aktywny. <span className="text-accent/70">EU-COMPLIANT</span></div>
          </div>

          <div className="border-t border-accent/10" />

          {/* Intro text */}
          <p className="font-[var(--font-mono)] text-[12px] text-accent/60 leading-[1.8]">
            Używamy plików cookie, by zapewnić prawidłowe działanie serwisu oraz — za Twoją zgodą — analizować ruch i wyświetlać spersonalizowane treści. Szczegóły w{" "}
            <Link href="/polityka-prywatnosci" className="text-accent hover:text-white transition-colors">
              Polityce Prywatności
            </Link>
            .
          </p>

          {/* Category toggles */}
          <div className="space-y-3">
            {categories.map(({ key, label, desc, required }) => (
              <div key={key} className="flex items-start gap-3">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => toggleRow(key)}
                  disabled={required}
                  aria-label={`Przełącz ${label}`}
                  className="mt-0.5 shrink-0 w-8 h-4 relative"
                >
                  <span
                    className={`absolute inset-0 border transition-colors duration-200 ${
                      prefs[key] ? "border-accent bg-accent/10" : "border-accent/25 bg-transparent"
                    } ${required ? "opacity-50" : ""}`}
                  />
                  <span
                    className={`absolute top-[3px] w-[10px] h-[10px] bg-accent transition-all duration-200 ${
                      prefs[key] ? "left-[18px]" : "left-[3px]"
                    } ${required ? "opacity-50" : ""}`}
                  />
                </button>

                <div>
                  <div className="font-[var(--font-mono)] text-[12px] text-accent tracking-[0.1em]">
                    {label}
                    {required && (
                      <span className="text-accent/30 ml-2">[WYMAGANE]</span>
                    )}
                  </div>
                  <div className="font-[var(--font-mono)] text-[11px] text-accent/40 leading-[1.6] mt-0.5">
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-accent/10" />

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Accept all — primary */}
            <div className="relative px-6 py-2 inline-flex items-center">
              <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/50" />
              <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-accent/50" />
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-accent/50" />
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/50" />
              <button
                onClick={acceptAll}
                className="font-[var(--font-mono)] text-[12px] tracking-[1px] text-accent hover:text-white transition-colors duration-200"
              >
                AKCEPTUJ WSZYSTKIE
              </button>
            </div>

            {/* Save selection */}
            <button
              onClick={saveSelected}
              className="font-[var(--font-mono)] text-[12px] tracking-[1px] text-accent/60 hover:text-accent border border-accent/20 px-5 py-2 transition-colors duration-200"
            >
              ZAPISZ WYBÓR
            </button>

            {/* Reject optional */}
            <button
              onClick={rejectAll}
              className="font-[var(--font-mono)] text-[12px] tracking-[1px] text-accent/35 hover:text-accent/60 transition-colors duration-200 ml-auto"
            >
              TYLKO NIEZBĘDNE
            </button>
          </div>

          {/* Footer note */}
          <div className="font-[var(--font-mono)] text-[10px] text-accent/20 leading-[1.6]">
            $ Możesz zmienić preferencje w każdej chwili w ustawieniach strony.
          </div>
        </div>
      </div>
    </div>
  );
}
