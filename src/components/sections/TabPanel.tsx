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
  const contentRef = useRef<HTMLDivElement>(null)
  const activeIndex = tabs.findIndex((t) => t.id === activeId)

  useEffect(() => {
    if (!contentRef.current) return
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    )
  }, [activeId])

  return (
    <>
      <div className="flex gap-4 sm:gap-6 px-[clamp(32px,5vw,64px)] py-3.5 border-b border-white/10 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`font-[var(--font-mono)] text-[12px] sm:text-[14px] tracking-[1.12px] transition-colors duration-300 whitespace-nowrap shrink-0 ${
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
                <span className="text-white/30">/{String(tabs.length).padStart(2, "0")}</span>
              </span>
            </div>
          </div>
          {children(activeId, activeIndex)}
        </div>
      </div>
    </>
  )
}
