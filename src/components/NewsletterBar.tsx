"use client";

import { useState } from "react";

const SEGMENTS = [
  { id: "aktualnosci", label: "AKTUALNOŚCI" },
  { id: "blog",        label: "BLOG"         },
  { id: "b2g",         label: "B2G"          },
  { id: "b2b",         label: "B2B"          },
  { id: "sklep",       label: "SKLEP"        },
];

export default function NewsletterBar() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["aktualnosci"]));
  const [email, setEmail]       = useState("");
  const [status, setStatus]     = useState<"idle" | "ok">("idle");

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || selected.size === 0) return;
    // TODO: wire to mailing provider (Resend / Mailchimp / etc.)
    setStatus("ok");
    setEmail("");
  };

  return (
    <div className="border-t border-white/[0.25] bg-[#060806] relative overflow-hidden">
      {/* Subtle scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(19,255,21,0.15) 2px, rgba(19,255,21,0.15) 4px)",
        }}
      />

      <div className="relative px-[clamp(32px,5vw,64px)] py-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-0">

        {/* ── Label ── */}
        <div className="shrink-0 lg:w-[190px] lg:border-r lg:border-white/10 lg:pr-8 lg:mr-8">
          <div className="font-[var(--font-mono)] text-[9px] text-accent/50 tracking-[0.22em] uppercase mb-0.5">
            // SUBSKRYBUJ
          </div>
          <div className="font-[var(--font-mono)] text-[12px] text-white tracking-[0.12em] uppercase">
            Kanał informacyjny
          </div>
        </div>

        {/* ── Segment checkboxes ── */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 lg:flex-1 lg:border-r lg:border-white/10 lg:pr-8 lg:mr-8">
          {SEGMENTS.map((seg) => {
            const on = selected.has(seg.id);
            return (
              <label key={seg.id} className="flex items-center gap-2 cursor-pointer group select-none">
                <span className="relative w-[11px] h-[11px] shrink-0">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(seg.id)}
                    className="sr-only"
                  />
                  <span
                    className={`absolute inset-0 border transition-colors duration-150 ${
                      on
                        ? "border-accent"
                        : "border-white/20 group-hover:border-accent/40"
                    }`}
                  />
                  {on && (
                    <span className="absolute inset-[2px] bg-accent" />
                  )}
                </span>
                <span
                  className={`font-[var(--font-mono)] text-[11px] tracking-[0.1em] transition-colors duration-150 ${
                    on
                      ? "text-accent"
                      : "text-text-dim group-hover:text-white/60"
                  }`}
                >
                  {seg.label}
                </span>
              </label>
            );
          })}
        </div>

        {/* ── Email + submit ── */}
        <div className="lg:w-[340px]">
          {status === "ok" ? (
            <p className="font-[var(--font-mono)] text-[11px] text-accent tracking-[0.12em] uppercase">
              <span className="terminal-blink">█</span>{" "}
              ZAPISANO — POTWIERDZENIE ZOSTANIE WYSŁANE
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-stretch">
              <div className="flex items-center gap-2 flex-1 border border-white/10 hover:border-accent/30 focus-within:border-accent/50 transition-colors duration-200 px-3 py-2">
                <span className="font-[var(--font-mono)] text-[12px] text-accent/40 shrink-0 leading-none">
                  &gt;
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="EMAIL@DOMENA.PL"
                  required
                  className="w-full bg-transparent font-[var(--font-mono)] text-[12px] text-accent tracking-[0.05em] focus:outline-none placeholder:text-accent/20 caret-accent"
                />
              </div>
              <button
                type="submit"
                className="font-[var(--font-mono)] text-[11px] tracking-[0.18em] uppercase text-bg bg-accent hover:bg-accent/80 transition-colors duration-200 px-5 whitespace-nowrap"
              >
                ZAPISZ
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
