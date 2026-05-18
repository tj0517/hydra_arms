import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PostDetailClient from '@/components/PostDetailClient'
import { sanityFetch } from '@/sanity/client'
import { newsPostBySlugQuery, otherNewsPostsQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'
import type { PostCardData } from '@/components/PostCard'

interface RawPost {
  _id: string
  title: string
  slug: string
  publishedAt?: string
  coverImage?: object
  excerpt?: string
  tags?: string[]
  featured?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any[]
}

interface RawOtherPost {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  let raw: RawPost | null = null
  try {
    raw = await sanityFetch<RawPost>({ query: newsPostBySlugQuery, params: { slug } })
  } catch {
    raw = null
  }
  if (!raw) return {}
  const ogImage = raw.coverImage ? urlFor(raw.coverImage).width(1200).height(630).url() : undefined
  return {
    title: raw.title,
    description: raw.excerpt,
    alternates: { canonical: `/aktualnosci/${slug}` },
    openGraph: {
      title: raw.title,
      description: raw.excerpt,
      url: `/aktualnosci/${slug}`,
      type: 'article',
      publishedTime: raw.publishedAt,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: raw.title }] : undefined,
    },
  }
}

export default async function AktualnosciDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let raw: RawPost | null = null
  let otherPosts: PostCardData[] = []

  try {
    [raw] = await Promise.all([
      sanityFetch<RawPost>({ query: newsPostBySlugQuery, params: { slug } }),
    ])
    const rawOthers = await sanityFetch<RawOtherPost[]>({ query: otherNewsPostsQuery, params: { slug } })
    otherPosts = (rawOthers ?? []).map((p) => ({
      ...p,
      coverImage: p.coverImage ? urlFor(p.coverImage).width(600).height(400).url() : undefined,
      excerpt: resolveExcerpt(p.excerpt, p.bodyExcerpt),
      href: `/aktualnosci/${p.slug}`,
    }))
  } catch {
    raw = null
  }

  if (!raw) notFound()

  const post = {
    ...raw,
    coverImage: raw.coverImage ? urlFor(raw.coverImage).width(1400).url() : undefined,
  }

  return (
    <PostDetailClient
      post={post}
      backHref="/aktualnosci"
      backLabel="Aktualności"
      video="/video/aerial-view.mp4"
      otherPosts={otherPosts}
    />
  )
}
