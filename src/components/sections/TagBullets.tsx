interface TagBulletsProps {
  tags: string[]
  className?: string
}

export default function TagBullets({ tags, className = "" }: TagBulletsProps) {
  return (
    <div className={`flex gap-2.5 items-center py-2.5 flex-wrap ${className}`}>
      {tags.map((tag, ti) => (
        <span key={ti} className="flex items-center gap-2.5">
          <span className="font-[var(--font-mono)] text-[13px] md:text-[20px] text-accent/70 md:text-accent tracking-[0.2px]">
            {tag}
          </span>
          {ti < tags.length - 1 && (
            <span className="w-[4px] h-[4px] md:w-[5px] md:h-[5px] bg-[#d9d9d9]/50 md:bg-[#d9d9d9]" />
          )}
        </span>
      ))}
    </div>
  )
}
