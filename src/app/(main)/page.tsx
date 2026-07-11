import HomePageClient from '@/components/HomePageClient'
import { sanityFetch } from '@/sanity/client'
import { homePageQuery, servicesQuery, distributionChannelsQuery, latestNewsQuery, latestBlogQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'
import type { PostCardData } from '@/components/PostCard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImage = any

const filaryImgFallback: Record<string, string> = {
  "B2G": "/img/draws/vest.png",
  "B2B": "/img/draws/cnc.png",
  "B2C": "/img/draws/binoculars.png",
}

interface RawPost {
  _id: string
  title: string
  slug: string
  publishedAt?: string
  coverImage?: object
  excerpt?: string
  bodyExcerpt?: string
  tags?: string[]
  featured?: boolean
}

function resolveExcerpt(excerpt?: string, bodyExcerpt?: string): string | undefined {
  if (excerpt) return excerpt
  if (!bodyExcerpt) return undefined
  const words = bodyExcerpt.trim().split(/\s+/)
  return words.length > 30 ? words.slice(0, 30).join(' ') + '…' : bodyExcerpt.trim()
}

function mapPosts(raw: RawPost[] | null, prefix: string): PostCardData[] {
  return (raw ?? []).map((p) => ({
    ...p,
    coverImage: p.coverImage ? urlFor(p.coverImage).width(600).height(400).url() : undefined,
    excerpt: resolveExcerpt(p.excerpt, p.bodyExcerpt),
    href: `/${prefix}/${p.slug}`,
  }))
}

export default async function HomePage() {
  let services, filary: ({ tag: string; title: string; desc: string; image?: SanityImage } | null)[] | null, heroData
  let rawNews: RawPost[] | null = null
  let rawBlog: RawPost[] | null = null

  try {
    ;[services, filary, heroData, rawNews, rawBlog] = await Promise.all([
      sanityFetch<{ id: string; label: string; title: string; desc: string; tags: string[]; image?: SanityImage; imagePath?: string }[]>({ query: servicesQuery }),
      sanityFetch<{ tag: string; title: string; desc: string; image?: SanityImage }[]>({ query: distributionChannelsQuery }),
      sanityFetch<{ heroTagline1?: string; heroTagline2?: string; hudLabel?: string; aboutText?: string; heroVideo?: string }>({ query: homePageQuery }),
      sanityFetch<RawPost[]>({ query: latestNewsQuery }),
      sanityFetch<RawPost[]>({ query: latestBlogQuery }),
    ])
  } catch {
    services = null
    filary = null
    heroData = null
  }

  const mappedServices = services?.map((s, i) => ({
    id: s.id,
    label: s.label,
    title: s.title,
    desc: s.desc,
    tags: s.tags ?? [],
    img: s.image ? urlFor(s.image).width(800).url() : s.imagePath ?? `/img/service-0${i + 1}.jpg`,
  })) ?? undefined

  const mappedFilary = filary?.map(f => ({
    tag: f?.tag ?? '',
    title: f?.title ?? '',
    desc: f?.desc ?? '',
    img: f?.image ? urlFor(f.image).width(800).url() : filaryImgFallback[f?.tag ?? ''] ?? '',
    href: "/wspolpraca",
  })) ?? undefined

  return (
    <HomePageClient
      services={mappedServices}
      filary={mappedFilary}
      heroTagline1={heroData?.heroTagline1 || undefined}
      heroTagline2={heroData?.heroTagline2 || undefined}
      hudLabel={heroData?.hudLabel || undefined}
      aboutText={heroData?.aboutText || undefined}
      heroVideo={heroData?.heroVideo || undefined}
      recentNews={mapPosts(rawNews, 'aktualnosci')}
      recentBlog={mapPosts(rawBlog, 'blog')}
    />
  )
}
