"use client";

import { useRef, useState } from "react";
import SubpageHero from "@/components/SubpageHero";
import Link from "next/link";

const departments = [
  { key: "R&D", label: "R&D — Badania i Rozwój", email: "research@hydra-arms.com" },
  { key: "B2G", label: "B2G — Sektor rządowy", email: "gov@hydra-arms.com" },
  { key: "HANDEL", label: "HANDEL — Sprzedaż", email: "sprzedaz@hydra-arms.com" },
  { key: "BIURO", label: "BIURO — Informacje ogólne", email: "office@hydra-arms.com" },
];

export default function KontaktPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [dept, setDept] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setSubmitted(true);
  };

  return (
    <main>
      <SubpageHero subtitle="HYDRA ARMS / Kontakt" title="Kontakt" video="/video/aerial-view.mp4" />

      {/* ─── MAIN CONTACT SECTION ─── */}
      <section className="border-t border-white/[0.25] px-[clamp(24px,5vw,64px)] py-20 md:py-28">
        <div className="max-w-[1300px] mx-auto">

          {/* Terminal window */}
          <div className="border border-accent/20 bg-[#060806] relative overflow-hidden">

            {/* Scanlines */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03] z-[1]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, color-mix(in srgb, var(--color-accent) 15%, transparent) 2px, color-mix(in srgb, var(--color-accent) 15%, transparent) 4px)",
              }}
            />
            {/* CRT glow */}
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{ boxShadow: "inset 0 0 120px color-mix(in srgb, var(--color-accent) 3%, transparent)" }}
            />

            {/* Title bar */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-accent/15 bg-accent/[0.04]">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-accent/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-accent/20" />
              </div>
              <span className="font-[var(--font-mono)] text-[11px] text-accent/50 tracking-[0.15em] uppercase">
                hydra-arms@terminal:~/kontakt — BEZPIECZNY KANAŁ ŁĄCZNOŚCI v2.4.1
              </span>
            </div>

            {/* Body */}
            <div className="relative z-[2] p-6 md:p-10">

              {/* Boot header */}
              <div className="font-[var(--font-mono)] text-[11px] text-accent/40 leading-[1.8] mb-8">
                <div>HYDRA ARMS — BEZPIECZNY KANAŁ ŁĄCZNOŚCI v2.4.1</div>
                <div>Inicjalizacja szyfrowanego kanału... <span className="text-accent/70">OK</span></div>
                <div>Połączenie nawiązane. Oczekiwanie na dane wejściowe.</div>
                <div>Protokół weryfikacji tożsamości aktywny. <span className="text-accent/70">RODO-COMPLIANT</span></div>
                <div className="mt-3 border-t border-accent/10 pt-1" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

                {/* ─── LEFT: CONTACT INFO ─── */}
                <div className="space-y-8">

                  {/* Company info */}
                  <div>
                    <div className="font-[var(--font-mono)] text-[12px] text-accent/50 mb-4">
                      $ cat /etc/hydra/company.conf
                    </div>
                    <div className="font-[var(--font-mono)] text-[13px] leading-[2.2] space-y-0">
                      <p className="text-white font-bold tracking-[0.15em]">HYDRA ARMS SP. Z O.O.</p>
                      <p className="text-text-dim"><span className="text-accent/50 w-24 inline-block">NIP</span><span className="text-accent/80">000 000 00 00</span></p>
                      <p className="text-text-dim"><span className="text-accent/50 w-24 inline-block">REGON</span><span className="text-accent/80">000000000</span></p>
                      <p className="text-text-dim"><span className="text-accent/50 w-24 inline-block">KONCESJA</span><span className="text-accent/80">MSWiA NR: B-000/00</span></p>
                    </div>
                  </div>

                  {/* Department emails */}
                  <div>
                    <div className="font-[var(--font-mono)] text-[12px] text-accent/50 mb-4">
                      $ cat /etc/hydra/contact.conf
                    </div>
                    <div className="font-[var(--font-mono)] text-[13px] leading-[2.4] space-y-0">
                      {departments.map((d) => (
                        <p key={d.key} className="text-text-dim">
                          <span className="text-accent/50 inline-block w-16">{d.key}</span>
                          <a href={`mailto:${d.email}`} className="text-accent hover:text-white transition-colors duration-200">
                            {d.email}
                          </a>
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Security status */}
                  <div>
                    <div className="font-[var(--font-mono)] text-[12px] text-accent/50 mb-3">
                      $ hydra --status
                    </div>
                    <div className="font-[var(--font-mono)] text-[12px] text-accent/30 leading-[2.2]">
                      <div>SZYFROWANIE:  <span className="text-accent/60">AES-256</span></div>
                      <div>PROTOKÓŁ:     <span className="text-accent/60">TLS 1.3</span></div>
                      <div>STATUS:       <span className="text-accent">AKTYWNY</span> <span className="terminal-blink">█</span></div>
                      <div>CZAS REAKCJI: <span className="text-accent/60">24-48h</span></div>
                    </div>
                  </div>

                  {/* Social */}
                  <div>
                    <div className="font-[var(--font-mono)] text-[12px] text-accent/50 mb-4">
                      $ hydra --social-links
                    </div>
                    <div className="flex gap-3">
                      <a
                        href="#!"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group w-10 h-10 border border-white/10 flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/30 transition-all duration-300 relative overflow-hidden"
                        aria-label="Facebook"
                      >
                        <div className="absolute inset-0 bg-accent/5 scale-0 group-hover:scale-100 transition-transform duration-300 origin-center" />
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="relative z-[1]">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </a>
                      <a
                        href="#!"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group w-10 h-10 border border-white/10 flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/30 transition-all duration-300 relative overflow-hidden"
                        aria-label="Instagram"
                      >
                        <div className="absolute inset-0 bg-accent/5 scale-0 group-hover:scale-100 transition-transform duration-300 origin-center" />
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="relative z-[1]">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                        </svg>
                      </a>
                      <a
                        href="mailto:kontakt@hydraarms.pl"
                        className="group w-10 h-10 border border-white/10 flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/30 transition-all duration-300 relative overflow-hidden"
                        aria-label="Email"
                      >
                        <div className="absolute inset-0 bg-accent/5 scale-0 group-hover:scale-100 transition-transform duration-300 origin-center" />
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="relative z-[1]">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                {/* ─── RIGHT: FORM ─── */}
                <div className="lg:border-l border-accent/10 lg:pl-10">
                  <div className="font-[var(--font-mono)] text-[12px] text-accent/50 mb-6">
                    $ hydra --wyslij-wiadomosc --allow-attachments
                  </div>

                  {submitted ? (
                    <div className="font-[var(--font-mono)] text-[13px] leading-[2] space-y-2">
                      <div className="text-accent/50">$ hydra --status-wysylania</div>
                      <div className="text-accent">WIADOMOŚĆ PRZEKAZANA. OCZEKUJ NA ODPOWIEDŹ.</div>
                      <div className="text-accent/40">Czas reakcji: 24–48h roboczych.</div>
                      <div className="mt-4">
                        <button
                          onClick={() => { setSubmitted(false); setFiles([]); setConsent(false); setDept(""); }}
                          className="font-[var(--font-mono)] text-[12px] text-accent/50 hover:text-accent transition-colors border border-accent/20 px-4 py-1.5"
                        >
                          WYŚLIJ KOLEJNĄ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">

                      {/* Name */}
                      <div className="flex items-center gap-2">
                        <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
                        <input
                          type="text"
                          placeholder="IMIĘ I NAZWISKO"
                          required
                          className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none placeholder:text-accent/20 caret-accent"
                        />
                      </div>
                      <div className="border-t border-accent/5" />

                      {/* Email */}
                      <div className="flex items-center gap-2">
                        <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
                        <input
                          type="email"
                          placeholder="ADRES EMAIL"
                          required
                          className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none placeholder:text-accent/20 caret-accent"
                        />
                      </div>
                      <div className="border-t border-accent/5" />

                      {/* Phone */}
                      <div className="flex items-center gap-2">
                        <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
                        <input
                          type="tel"
                          placeholder="TELEFON (OPCJONALNIE)"
                          className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none placeholder:text-accent/20 caret-accent"
                        />
                      </div>
                      <div className="border-t border-accent/5" />

                      {/* Department */}
                      <div className="flex items-center gap-2">
                        <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
                        <select
                          value={dept}
                          onChange={(e) => setDept(e.target.value)}
                          className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none caret-accent appearance-none cursor-pointer"
                          style={{ colorScheme: "dark" }}
                        >
                          <option value="" disabled className="bg-[#060806] text-accent/40">
                            DZIAŁ / DEPARTAMENT
                          </option>
                          {departments.map((d) => (
                            <option key={d.key} value={d.key} className="bg-[#060806] text-accent">
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="border-t border-accent/5" />

                      {/* Subject */}
                      <div className="flex items-center gap-2">
                        <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
                        <input
                          type="text"
                          placeholder="TYTUŁ / TEMAT"
                          required
                          className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none placeholder:text-accent/20 caret-accent"
                        />
                      </div>
                      <div className="border-t border-accent/5" />

                      {/* Message */}
                      <div className="flex items-start gap-2">
                        <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0 pt-0.5">&gt;</span>
                        <textarea
                          placeholder="TREŚĆ WIADOMOŚCI"
                          rows={7}
                          required
                          className="w-full bg-transparent text-accent font-[var(--font-mono)] text-[13px] tracking-[0.5px] focus:outline-none resize-none placeholder:text-accent/20 caret-accent"
                        />
                      </div>
                      <div className="border-t border-accent/5" />

                      {/* File attachment */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="font-[var(--font-mono)] text-[13px] text-accent/50 hover:text-accent transition-colors duration-200 flex items-center gap-2"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.47" />
                            </svg>
                            ZAŁĄCZ PLIKI
                            {files.length > 0 && (
                              <span className="text-accent">[ {files.length} plik{files.length > 1 ? "i" : ""} ]</span>
                            )}
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.txt"
                            onChange={handleFiles}
                            className="hidden"
                          />
                        </div>
                        {files.length > 0 && (
                          <div className="mt-2 ml-5 space-y-1">
                            {files.map((f, i) => (
                              <div key={i} className="font-[var(--font-mono)] text-[11px] text-accent/40 flex items-center gap-2">
                                <span className="text-accent/20">├─</span>
                                <span>{f.name}</span>
                                <span className="text-accent/20">({(f.size / 1024).toFixed(0)} KB)</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="font-[var(--font-mono)] text-[10px] text-accent/20 mt-1 ml-5">
                          PDF, DOC, JPG, PNG, ZIP — maks. 10 MB łącznie
                        </div>
                      </div>
                      <div className="border-t border-accent/5" />

                      {/* RODO consent */}
                      <div className="flex items-start gap-2 mt-2">
                        <label className="mt-0.5 shrink-0 w-3.5 h-3.5 relative cursor-pointer block">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            required
                          />
                          <span className="absolute inset-0 border border-accent/50 peer-checked:border-accent transition-colors duration-150" />
                          <span className="absolute inset-[3px] bg-accent scale-0 peer-checked:scale-100 transition-transform duration-150" />
                        </label>
                        <span className="font-[var(--font-mono)] text-[11px] text-accent/30 leading-[1.6]">
                          Wyrażam zgodę na przetwarzanie danych osobowych przez HYDRA ARMS SP. Z O.O.
                          w celu obsługi zgłoszenia kontaktowego, zgodnie z{" "}
                          <Link href="/polityka-prywatnosci" className="text-accent/60 hover:text-accent transition-colors">
                            Polityką Prywatności
                          </Link>.
                        </span>
                      </div>

                      {/* Submit */}
                      <div className="flex justify-end pt-3">
                        <div className="relative px-8 py-2 inline-flex items-center w-fit">
                          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
                          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
                          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
                          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
                          <button
                            type="submit"
                            disabled={!consent}
                            className="font-[var(--font-mono)] text-[13px] tracking-[1px] text-accent hover:text-white transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            WYŚLIJ ZGŁOSZENIE
                          </button>
                        </div>
                      </div>

                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
