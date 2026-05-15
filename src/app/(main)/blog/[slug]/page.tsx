import { notFound } from 'next/navigation'
import PostDetailClient from '@/components/PostDetailClient'
import { sanityFetch } from '@/sanity/client'
import { blogPostBySlugQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'
import { MOCK_BLOG_DETAIL } from '@/lib/mockPosts'

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

  if (!raw) {
    const mock = MOCK_BLOG_DETAIL[slug]
    if (!mock) notFound()
    return <PostDetailClient post={mock} backHref="/blog" backLabel="Blog" video="/video/dark-terrain.mp4" />
  }

  const post = {
    ...raw,
    coverImage: raw.coverImage ? urlFor(raw.coverImage).width(1400).url() : undefined,
  }

  return (
    <PostDetailClient
      post={post}
      backHref="/blog"
      backLabel="Blog"
      video="/video/dark-terrain.mp4"
    />
  )
}
