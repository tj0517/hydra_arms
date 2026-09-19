'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { PortableText } from '@portabletext/react'
import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { urlFor } from '@/sanity/image'
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types'
import ProductCard from './ProductCard'

// ── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImage = any

interface BannerBlock {
  _key: string
  _type: 'shopBannerBlock'
  heading?: string
  subtitle?: string
  image?: SanityImage
  videoPath?: string
  video?: { asset?: { url?: string } }
  ctaText?: string
  ctaLink?: string
  theme?: 'dark' | 'light'
  height?: 'full' | 'half' | 'compact'
}

interface ProductPickerBlock {
  _key: string
  _type: 'shopProductPickerBlock'
  heading?: string
  subtitle?: string
  selectionMode?: 'best_sellers' | 'new_arrivals' | 'on_sale' | 'manual'
  productIds?: string[]
  limit?: number
  layout?: '4col' | '3col' | '2col'
  ctaText?: string
  ctaLink?: string
}

interface TileGridBlock {
  _key: string
  _type: 'shopTileGridBlock'
  heading?: string
  subtitle?: string
  tiles?: Array<{ _key: string; label?: string; description?: string; image?: SanityImage; link?: string }>
  columns?: '2' | '3' | '4' | '5'
}

interface TextCtaBlock {
  _key: string
  _type: 'shopTextCtaBlock'
  heading?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any[]
  ctaText?: string
  ctaLink?: string
  ctaSecondaryText?: string
  ctaSecondaryLink?: string
  layout?: 'centered' | 'left' | 'split'
  image?: SanityImage
  background?: 'transparent' | 'dark' | 'light'
}

interface IconStripBlock {
  _key: string
  _type: 'shopIconStripBlock'
  heading?: string
  items?: Array<{ _key: string; icon?: string; label?: string; subtext?: string }>
  layout?: 'horizontal' | 'grid'
  background?: 'transparent' | 'dark' | 'light'
}

interface FaqBlock {
  _key: string
  _type: 'shopFaqBlock'
  heading?: string
  subtitle?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items?: Array<{ _key: string; question?: string; answer?: any[] }>
  background?: 'transparent' | 'dark' | 'light'
}

interface StatsBlock {
  _key: string
  _type: 'shopStatsBlock'
  heading?: string
  items?: Array<{ _key: string; value?: string; label?: string; subtext?: string }>
  background?: 'transparent' | 'dark' | 'light'
}

interface BrandsBlock {
  _key: string
  _type: 'shopBrandsBlock'
  heading?: string
  items?: Array<{ _key: string; name?: string; logo?: SanityImage; link?: string }>
  layout?: 'grid' | 'scroll'
  background?: 'transparent' | 'dark' | 'light'
}

interface RichTextBlock {
  _key: string
  _type: 'shopRichTextBlock'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any[]
  layout?: 'centered' | 'left'
  maxWidth?: 'narrow' | 'normal' | 'wide'
  background?: 'transparent' | 'dark' | 'light'
}

interface AlertBlock {
  _key: string
  _type: 'shopAlertBlock'
  message?: string
  type?: 'info' | 'warning' | 'promo'
  link?: string
  linkText?: string
}

export type ShopSection =
  | BannerBlock
  | ProductPickerBlock
  | TileGridBlock
  | TextCtaBlock
  | IconStripBlock
  | FaqBlock
  | StatsBlock
  | BrandsBlock
  | RichTextBlock
  | AlertBlock

interface Props {
  sections: ShopSection[]
  resolvedProducts: Record<string, ShopProduct[]>
  categories: ShopCategory[]
}

// ── Icon resolver ──────────────────────────────────────────────────────────────

function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const pascal = name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[pascal] as React.ComponentType<LucideProps> | undefined
  if (!Icon) return <span className="w-5 h-5 inline-block" />
  return <Icon {...props} />
}

// ── Block renderers ────────────────────────────────────────────────────────────

function heightClass(h?: string) {
  if (h === 'full') return 'min-h-screen'
  if (h === 'compact') return 'min-h-[200px]'
  return 'min-h-[440px] md:min-h-[520px]'
}

function BannerSection({ block }: { block: BannerBlock }) {
  const imgUrl = block.image ? urlFor(block.image).width(1600).height(800).url() : null
  const videoUrl = block.video?.asset?.url ?? block.videoPath ?? null
  const textColor = block.theme === 'light' ? 'text-black' : 'text-white'
  const subtitleColor = block.theme === 'light' ? 'text-black/60' : 'text-white/60'

  return (
    <section className={`relative w-full overflow-hidden flex items-center ${heightClass(block.height)}`}>
      {/* Background */}
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : imgUrl ? (
        <Image
          src={imgUrl}
          alt={block.heading ?? ''}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-white/[0.03]" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)] w-full">
        {block.heading && (
          <h2 className={`text-4xl md:text-6xl font-bold tracking-tight leading-tight max-w-2xl mb-4 ${textColor}`}>
            {block.heading}
          </h2>
        )}
        {block.subtitle && (
          <p className={`text-lg md:text-xl max-w-xl mb-8 ${subtitleColor}`}>
            {block.subtitle}
          </p>
        )}
        {block.ctaText && block.ctaLink && (
          <Link
            href={block.ctaLink}
            className="inline-block border border-accent text-accent font-[var(--font-mono)] text-xs tracking-[0.2em] px-8 py-3 hover:bg-accent hover:text-black transition-all duration-200"
          >
            {block.ctaText}
          </Link>
        )}
      </div>

      {/* Bottom border accent */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
    </section>
  )
}

function ProductPickerSection({
  block,
  products,
  categories,
}: {
  block: ProductPickerBlock
  products: ShopProduct[]
  categories: ShopCategory[]
}) {
  if (!products.length) return null

  const colClass =
    block.layout === '2col'
      ? 'grid-cols-1 sm:grid-cols-2'
      : block.layout === '3col'
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-2 md:grid-cols-4'

  return (
    <section className="py-10 md:py-16 max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)]">
      {(block.heading || block.subtitle) && (
        <div className="flex items-end justify-between mb-6">
          <div>
            {block.subtitle && (
              <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-1.5">
                {block.subtitle}
              </p>
            )}
            {block.heading && (
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {block.heading}
              </h2>
            )}
          </div>
          {block.ctaText && block.ctaLink && (
            <Link
              href={block.ctaLink}
              className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent tracking-[0.2em] transition-colors"
            >
              {block.ctaText} →
            </Link>
          )}
        </div>
      )}
      <div className={`grid ${colClass} gap-3 md:gap-4`}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} categories={categories} />
        ))}
      </div>
    </section>
  )
}

const colsMap: Record<string, string> = {
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-2 md:grid-cols-3',
  '4': 'grid-cols-2 md:grid-cols-4',
  '5': 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
}

function TileGridSection({ block }: { block: TileGridBlock }) {
  if (!block.tiles?.length) return null
  const cols = colsMap[block.columns ?? '4'] ?? colsMap['4']

  return (
    <section className="py-10 md:py-16 max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)]">
      {(block.heading || block.subtitle) && (
        <div className="mb-6">
          {block.subtitle && (
            <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-1.5">
              {block.subtitle}
            </p>
          )}
          {block.heading && (
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {block.heading}
            </h2>
          )}
        </div>
      )}
      <div className={`grid ${cols} gap-3`}>
        {block.tiles.map((tile) => {
          const imgUrl = tile.image ? urlFor(tile.image).width(600).height(400).url() : null
          const inner = (
            <div className="group relative overflow-hidden border border-white/10 hover:border-accent/40 aspect-[4/3] flex items-end bg-white/[0.02] transition-all duration-300">
              {imgUrl && (
                <Image
                  src={imgUrl}
                  alt={tile.label ?? ''}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative z-10 p-4 w-full">
                {tile.label && (
                  <p className="text-sm font-semibold text-white leading-snug group-hover:text-accent transition-colors">
                    {tile.label}
                  </p>
                )}
                {tile.description && (
                  <p className="font-[var(--font-mono)] text-[9px] text-white/50 mt-1 tracking-wider">
                    {tile.description}
                  </p>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-px bg-accent origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </div>
          )
          return tile.link ? (
            <Link key={tile._key} href={tile.link}>
              {inner}
            </Link>
          ) : (
            <div key={tile._key}>{inner}</div>
          )
        })}
      </div>
    </section>
  )
}

const bgClass: Record<string, string> = {
  dark: 'bg-white/[0.03]',
  light: 'bg-white/10',
  transparent: '',
}

function TextCtaSection({ block }: { block: TextCtaBlock }) {
  const isSplit = block.layout === 'split'
  const isCentered = block.layout === 'centered' || !block.layout
  const bg = bgClass[block.background ?? 'transparent']
  const imgUrl = block.image ? urlFor(block.image).width(800).height(600).url() : null

  return (
    <section className={`${bg} py-16 md:py-20`}>
      <div
        className={`max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)] ${
          isSplit ? 'grid grid-cols-1 md:grid-cols-2 gap-12 items-center' : ''
        }`}
      >
        <div className={isCentered ? 'text-center max-w-2xl mx-auto' : 'max-w-2xl'}>
          {block.heading && (
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">
              {block.heading}
            </h2>
          )}
          {block.body && (
            <div className="prose prose-invert prose-sm max-w-none text-text-dim [&_p]:leading-relaxed [&_ul]:mt-3 [&_li]:mt-1">
              <PortableText value={block.body} />
            </div>
          )}
          {(block.ctaText || block.ctaSecondaryText) && (
            <div className={`flex flex-wrap gap-3 mt-8 ${isCentered ? 'justify-center' : ''}`}>
              {block.ctaText && block.ctaLink && (
                <Link
                  href={block.ctaLink}
                  className="inline-block border border-accent text-accent font-[var(--font-mono)] text-xs tracking-[0.2em] px-8 py-3 hover:bg-accent hover:text-black transition-all duration-200"
                >
                  {block.ctaText}
                </Link>
              )}
              {block.ctaSecondaryText && block.ctaSecondaryLink && (
                <Link
                  href={block.ctaSecondaryLink}
                  className="inline-block border border-white/20 text-text-dim font-[var(--font-mono)] text-xs tracking-[0.2em] px-8 py-3 hover:border-white/40 hover:text-white transition-all duration-200"
                >
                  {block.ctaSecondaryText}
                </Link>
              )}
            </div>
          )}
        </div>
        {isSplit && imgUrl && (
          <div className="relative aspect-[4/3] overflow-hidden border border-white/10">
            <Image src={imgUrl} alt={block.heading ?? ''} fill className="object-cover" />
          </div>
        )}
      </div>
    </section>
  )
}

function IconStripSection({ block }: { block: IconStripBlock }) {
  if (!block.items?.length) return null
  const bg = bgClass[block.background ?? 'transparent']
  const isGrid = block.layout === 'grid'

  return (
    <section className={`${bg} py-10 md:py-12`}>
      <div className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)]">
        {block.heading && (
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-6 text-center">
            {block.heading}
          </p>
        )}
        <div
          className={
            isGrid
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6'
              : 'flex flex-wrap justify-center gap-8 md:gap-12'
          }
        >
          {block.items.map((item) => (
            <div
              key={item._key}
              className={`flex ${isGrid ? 'flex-col items-start' : 'flex-col items-center text-center'} gap-2`}
            >
              {item.icon && (
                <DynamicIcon
                  name={item.icon}
                  size={20}
                  className="text-accent flex-shrink-0"
                />
              )}
              {item.label && (
                <span className="text-sm font-medium text-white/80">{item.label}</span>
              )}
              {item.subtext && (
                <span className="font-[var(--font-mono)] text-[10px] text-text-dim">{item.subtext}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FaqItem({ question, answer }: { question: string; answer?: any[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-sm md:text-base font-medium text-white/90 group-hover:text-white transition-colors leading-snug">
          {question}
        </span>
        <span className={`text-accent flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
          <LucideIcons.Plus size={16} />
        </span>
      </button>
      {open && answer && (
        <div className="pb-5 prose prose-invert prose-sm max-w-none text-text-dim [&_p]:leading-relaxed [&_ul]:mt-2 [&_li]:mt-1">
          <PortableText value={answer} />
        </div>
      )}
    </div>
  )
}

function FaqSection({ block }: { block: FaqBlock }) {
  if (!block.items?.length) return null
  const bg = bgClass[block.background ?? 'transparent']
  const hasHeader = block.heading || block.subtitle

  return (
    <section className={`${bg} py-12 md:py-20`}>
      {hasHeader && (
        <div className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)] mb-10">
          {block.subtitle && (
            <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-2">
              {block.subtitle}
            </p>
          )}
          {block.heading && (
            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              {block.heading}
            </h2>
          )}
          <div className="mt-6 w-8 h-px bg-accent" />
        </div>
      )}
      <div className="border-t border-white/10" />
      {block.items.map((item) => (
        <div key={item._key}>
          <div className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)]">
            <FaqItem question={item.question ?? ''} answer={item.answer} />
          </div>
          <div className="border-b border-white/10" />
        </div>
      ))}
    </section>
  )
}

function StatItem({ item, borderLeft }: { item: NonNullable<StatsBlock['items']>[number]; borderLeft?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center px-6 py-6 md:py-0 ${borderLeft ? 'border-l border-white/10' : ''}`}>
      {item.value && (
        <span className="text-4xl md:text-6xl font-bold text-accent tracking-tight leading-none whitespace-nowrap">
          {item.value}
        </span>
      )}
      {item.label && (
        <span className="text-sm font-semibold text-white/80 mt-3">{item.label}</span>
      )}
      {item.subtext && (
        <span className="font-[var(--font-mono)] text-[10px] text-text-dim mt-1">{item.subtext}</span>
      )}
    </div>
  )
}

function StatsSection({ block }: { block: StatsBlock }) {
  if (!block.items?.length) return null
  const bg = bgClass[block.background ?? 'dark']
  const items = block.items
  const row1 = items.slice(0, 2)
  const row2 = items.slice(2, 4)

  return (
    <section className={`${bg} py-14 md:py-20`}>
      {block.heading && (
        <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-10 text-center">
          {block.heading}
        </p>
      )}

      {/* Mobile: two rows separated by a full-viewport border */}
      <div className="md:hidden">
        <div className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)] grid grid-cols-2">
          {row1.map((item, i) => <StatItem key={item._key} item={item} borderLeft={i > 0} />)}
        </div>
        {row2.length > 0 && (
          <>
            <div className="border-t border-white/10" />
            <div className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)] grid grid-cols-2">
              {row2.map((item, i) => <StatItem key={item._key} item={item} borderLeft={i > 0} />)}
            </div>
          </>
        )}
      </div>

      {/* Desktop: single 4-col row */}
      <div className="hidden md:block max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)]">
        <div className="grid grid-cols-4">
          {items.map((item, i) => <StatItem key={item._key} item={item} borderLeft={i > 0} />)}
        </div>
      </div>
    </section>
  )
}

function BrandsSection({ block }: { block: BrandsBlock }) {
  if (!block.items?.length) return null
  const bg = bgClass[block.background ?? 'transparent']
  const isScroll = block.layout === 'scroll'

  return (
    <section className={`${bg} border-y border-white/[0.07] py-12 md:py-16`}>
      <div className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)]">
        {block.heading && (
        <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-3">
          Producenci
        </p>
      )}
      <div className="md:grid md:grid-cols-[1fr_2fr] md:gap-20 md:items-start">
          {block.heading && (
            <div className="mb-8 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                {block.heading}
              </h2>
            </div>
          )}
          <div
            className={
              isScroll
                ? 'flex gap-8 overflow-x-auto pb-1 scrollbar-none'
                : 'flex flex-wrap gap-x-10 gap-y-5 items-center'
            }
          >
            {block.items.map((item) => {
              const logoUrl = item.logo ? urlFor(item.logo).height(48).url() : null
              const inner = logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={item.name ?? ''}
                  width={100}
                  height={40}
                  className="object-contain max-h-10 w-auto opacity-40 hover:opacity-90 transition-opacity duration-200 flex-shrink-0"
                />
              ) : (
                <span className="text-lg md:text-xl font-bold uppercase tracking-[0.06em] text-white/30 hover:text-white/80 transition-colors duration-200 whitespace-nowrap">
                  {item.name}
                </span>
              )
              return item.link ? (
                <Link key={item._key} href={item.link}>{inner}</Link>
              ) : (
                <div key={item._key}>{inner}</div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

const maxWidthClass: Record<string, string> = {
  narrow: 'max-w-[640px]',
  normal: 'max-w-[800px]',
  wide: 'max-w-full',
}

function RichTextSection({ block }: { block: RichTextBlock }) {
  if (!block.body?.length) return null
  const bg = bgClass[block.background ?? 'transparent']
  const mw = maxWidthClass[block.maxWidth ?? 'normal']
  const isCentered = block.layout === 'centered'

  return (
    <section className={`${bg} py-12 md:py-16`}>
      <div className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)]">
        <div
          className={`${mw} prose prose-invert prose-sm md:prose-base max-w-none text-text-dim
            [&_h2]:text-white [&_h2]:text-2xl md:[&_h2]:text-3xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-0 [&_h2]:mb-4
            [&_h3]:text-white/90 [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:leading-relaxed [&_p]:text-white/60 [&_ul]:mt-3 [&_li]:mt-1
            [&_a]:text-accent [&_a]:no-underline hover:[&_a]:underline
            ${isCentered ? 'mx-auto text-center' : 'border-l-2 border-accent/30 pl-6 md:pl-8'}`}
        >
          <PortableText value={block.body} />
        </div>
      </div>
    </section>
  )
}

const alertStyle: Record<string, string> = {
  info: 'bg-blue-900/40 border-blue-500/30 text-blue-200',
  warning: 'bg-yellow-900/40 border-yellow-500/30 text-yellow-200',
  promo: 'bg-accent/10 border-accent/30 text-accent',
}

function AlertSection({ block }: { block: AlertBlock }) {
  if (!block.message) return null
  const style = alertStyle[block.type ?? 'info']

  return (
    <div className={`w-full border-y ${style} py-4`}>
      <div className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)] flex items-center justify-center gap-4 flex-wrap text-center">
        <span className="font-[var(--font-mono)] text-[11px] tracking-wider leading-relaxed">{block.message}</span>
        {block.link && block.linkText && (
          <Link
            href={block.link}
            className="font-[var(--font-mono)] text-[11px] tracking-wider underline underline-offset-2 hover:no-underline flex-shrink-0 whitespace-nowrap"
          >
            {block.linkText} →
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Main renderer ──────────────────────────────────────────────────────────────

export default function ShopPageSections({ sections, resolvedProducts, categories }: Props) {
  return (
    <div>
      {sections.map((section) => {
        switch (section._type) {
          case 'shopBannerBlock':
            return <BannerSection key={section._key} block={section} />
          case 'shopProductPickerBlock':
            return (
              <ProductPickerSection
                key={section._key}
                block={section}
                products={resolvedProducts[section._key] ?? []}
                categories={categories}
              />
            )
          case 'shopTileGridBlock':
            return <TileGridSection key={section._key} block={section} />
          case 'shopTextCtaBlock':
            return <TextCtaSection key={section._key} block={section} />
          case 'shopIconStripBlock':
            return <IconStripSection key={section._key} block={section} />
          case 'shopFaqBlock':
            return <FaqSection key={section._key} block={section} />
          case 'shopStatsBlock':
            return <StatsSection key={section._key} block={section} />
          case 'shopBrandsBlock':
            return <BrandsSection key={section._key} block={section} />
          case 'shopRichTextBlock':
            return <RichTextSection key={section._key} block={section} />
          case 'shopAlertBlock':
            return <AlertSection key={section._key} block={section} />
          default:
            return null
        }
      })}
    </div>
  )
}
