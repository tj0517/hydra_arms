import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PostDetailClient from '@/components/PostDetailClient'
import { sanityFetch } from '@/sanity/client'
import { blogPostBySlugQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  let raw: RawPost | null = null
  try {
    raw = await sanityFetch<RawPost>({ query: blogPostBySlugQuery, params: { slug } })
  } catch {
    raw = null
  }
  if (!raw) return {}
  const ogImage = raw.coverImage ? urlFor(raw.coverImage).width(1200).height(630).url() : undefined
  return {
    title: raw.title,
    description: raw.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: raw.title,
      description: raw.excerpt,
      url: `/blog/${slug}`,
      type: 'article',
      publishedTime: raw.publishedAt,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: raw.title }] : undefined,
    },
  }
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let raw: RawPost | null = null

  try {
    raw = await sanityFetch<RawPost>({ query: blogPostBySlugQuery, params: { slug } })
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
      backHref="/blog"
      backLabel="Blog"
      video="/video/aerial-view.mp4"
    />
  )
}
