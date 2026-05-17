import { notFound } from 'next/navigation'
import PostDetailClient from '@/components/PostDetailClient'
import { sanityFetch } from '@/sanity/client'
import { newsPostBySlugQuery } from '@/sanity/queries'
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

export default async function AktualnosciDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let raw: RawPost | null = null

  try {
    raw = await sanityFetch<RawPost>({ query: newsPostBySlugQuery, params: { slug } })
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
    />
  )
}
