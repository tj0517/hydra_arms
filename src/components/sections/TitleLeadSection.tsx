import React from "react"
import Link from "next/link"
import TypewriterTitle from "@/components/TypewriterTitle"
import SectionLabel from "@/components/ui/SectionLabel"

interface TitleLeadSectionProps {
  title: string
  body: string
  ctaHref?: string
  sectionLabel?: string
  sectionClassName?: string
  pt?: string
  bodyGridCols?: string
  bodyPb?: string
  children?: React.ReactNode
}

export default function TitleLeadSection({
  title,
  body,
  ctaHref,
  sectionLabel,
  sectionClassName = "",
  pt = "pt-12 md:pt-16",
  bodyGridCols = "sm:grid-cols-2",
  bodyPb = "pb-0 md:pb-4",
  children,
}: TitleLeadSectionProps) {
  return (
    <section className={sectionClassName}>
      {sectionLabel && <SectionLabel label={sectionLabel} />}
      <div className={`${pt} px-[clamp(32px,5vw,64px)]`}>
        <TypewriterTitle
          as="h2"
          className="text-[clamp(1.75rem,9.26vw,140px)] font-medium text-white leading-[1.05] tracking-[-0.5px] md:tracking-[-2px] uppercase"
          speed={60}
        >
          {title}
        </TypewriterTitle>
        <div className={`grid grid-cols-1 ${bodyGridCols} gap-8 mt-8 ${bodyPb} md:gap-16 md:mt-16`}>
          <div>
            <p className="text-text-dim text-[15px] md:text-[18px] font-normal leading-[1.7] md:leading-[30px] text-justify">
              {body}
            </p>
          </div>
          <div className="hidden md:flex items-start justify-end">
            {ctaHref ? (
              <Link
                href={ctaHref}
                className="group w-[100px] h-[100px] border border-white/10 hover:border-accent/40 flex items-center justify-center transition-all duration-300"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-dim group-hover:text-accent transition-colors duration-300">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            ) : (
              <div className="w-[100px] h-[100px] border border-white/10 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-dim">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}
