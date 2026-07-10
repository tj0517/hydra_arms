"use client"

import { useRef, useEffect, useState } from "react"
import gsap from "gsap"
import React from "react"

export interface TabItem {
  id: string
  label: string
}

interface TabPanelProps {
  tabs: TabItem[]
  contentPb?: string
  contentPx?: string
  contentClassName?: string
  contentBorder?: boolean
  children: (activeId: string, activeIndex: number) => React.ReactNode
}

export default function TabPanel({
  tabs,
  contentPb = "pb-16",
  contentPx = "px-[clamp(32px,5vw,80px)]",
  contentClassName = "",
  contentBorder = true,
  children,
}: TabPanelProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const activeIndex = tabs.findIndex((t) => t.id === activeId)
  const activeLabel = tabs.find((t) => t.id === activeId)?.label ?? ""

  useEffect(() => {
    if (!contentRef.current) return
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    )
  }, [activeId])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [dropdownOpen])

  return (
    <>
      {/* Mobile / tablet: custom dropdown */}
      <div className="md:hidden border-b border-white/10 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-[clamp(32px,5vw,64px)] py-3"
        >
          <span className="font-[var(--font-mono)] text-[13px] text-accent/50 shrink-0">&gt;</span>
          <span className="font-[var(--font-mono)] text-[13px] tracking-[1px] flex-1 text-left">
            <span className="text-text-dim">[</span>
            <span className="text-accent"> {activeLabel} </span>
            <span className="text-text-dim">]</span>
          </span>
          <svg
            className={`shrink-0 text-accent/50 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <path d="M2 4l4 4 4-4"/>
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-50 border-t border-white/10 bg-[#0a0b0a]">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => { setActiveId(tab.id); setDropdownOpen(false); }}
                className={`w-full text-left flex items-center gap-2 px-[clamp(32px,5vw,64px)] py-3 font-[var(--font-mono)] text-[13px] tracking-[1px] transition-colors duration-150 ${
                  i < tabs.length - 1 ? "border-b border-white/5" : ""
                } ${activeId === tab.id ? "text-accent bg-accent/5" : "text-text-dim hover:text-text hover:bg-white/[0.03]"}`}
              >
                <span className="text-text-dim/50 w-5 shrink-0 font-[var(--font-mono)] text-[11px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-text-dim">[</span>
                <span className={activeId === tab.id ? "text-accent" : ""}> {tab.label} </span>
                <span className="text-text-dim">]</span>
                {activeId === tab.id && (
                  <span className="ml-auto text-accent text-[10px]">▸</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: tab strip */}
      <div className="hidden md:flex gap-6 px-[clamp(32px,5vw,64px)] py-3.5 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`font-[var(--font-mono)] text-[14px] tracking-[1.12px] transition-colors duration-300 whitespace-nowrap shrink-0 ${
              activeId === tab.id ? "text-text" : "text-text-dim hover:text-text"
            }`}
          >
            <span className="text-text-dim">[</span>
            <span className={activeId === tab.id ? "text-accent" : ""}> {tab.label} </span>
            <span className="text-text-dim">]</span>
          </button>
        ))}
      </div>

      <div className={contentBorder ? "border-b border-white/10" : ""}>
        <div ref={contentRef} className={`${contentPx} pt-10 ${contentPb} ${contentClassName}`}>
          <div className="mb-9">
            <div className="border border-text/50 px-2 py-1 inline-block">
              <span className="font-[var(--font-mono)] text-[18px]">
                <span className="text-accent">{String(activeIndex + 1).padStart(2, "0")}</span>
                <span className="text-white/50">/{String(tabs.length).padStart(2, "0")}</span>
              </span>
            </div>
          </div>
          {children(activeId, activeIndex)}
        </div>
      </div>
    </>
  )
}
