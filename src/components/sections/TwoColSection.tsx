import React from "react"

interface TwoColSectionProps {
  left: React.ReactNode
  right: React.ReactNode
  leftClassName?: string
  rightClassName?: string
  className?: string
}

export default function TwoColSection({
  left,
  right,
  leftClassName = "",
  rightClassName = "",
  className = "",
}: TwoColSectionProps) {
  return (
    <section className={`grid grid-cols-1 md:grid-cols-2 ${className}`}>
      <div className={leftClassName}>{left}</div>
      <div className={rightClassName}>{right}</div>
    </section>
  )
}
