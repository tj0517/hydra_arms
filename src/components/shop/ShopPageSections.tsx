'use client'

import Image from 'next/image'
import Link from 'next/link'
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

export type ShopSection = BannerBlock | ProductPickerBlock | TileGridBlock | TextCtaBlock | IconStripBlock

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
  const textColor = block.theme === 'light' ? 'text-black' : 'text-white'
  const subtitleColor = block.theme === 'light' ? 'text-black/60' : 'text-white/60'

  return (
    <section className={`relative w-full overflow-hidden flex items-center ${heightClass(block.height)}`}>
      {/* Background */}
      {block.videoPath ? (
        <video
          src={block.videoPath}
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
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 w-full">
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
    <section className="max-w-[1400px] mx-auto px-6 md:px-10">
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
    <section className="max-w-[1400px] mx-auto px-6 md:px-10">
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
        className={`max-w-[1400px] mx-auto px-6 md:px-10 ${
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
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
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

// ── Main renderer ──────────────────────────────────────────────────────────────

export default function ShopPageSections({ sections, resolvedProducts, categories }: Props) {
  return (
    <div className="space-y-16 py-10">
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
          default:
            return null
        }
      })}
    </div>
  )
}
