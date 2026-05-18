import type { Metadata } from 'next'
import SubpageHero from '@/components/SubpageHero'
import PostListClient from '@/components/PostListClient'
import { sanityFetch } from '@/sanity/client'
import { newsPostsQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'

export const metadata: Metadata = {
  title: 'Aktualności',
  description:
    'Najnowsze informacje, komunikaty i aktualności HYDRA ARMS — bądź na bieżąco z wydarzeniami w sektorze obronnym i naszymi działaniami.',
  alternates: { canonical: '/aktualnosci' },
  openGraph: {
    title: 'Aktualności | HYDRA ARMS',
    description:
      'Najnowsze informacje, komunikaty i aktualności HYDRA ARMS.',
    url: '/aktualnosci',
  },
}
import type { PostCardData } from '@/components/PostCard'

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

export default async function AktualnosciPage() {
  let posts: PostCardData[] = []

  try {
    const raw = await sanityFetch<RawPost[]>({ query: newsPostsQuery })
    posts = (raw ?? []).map((p) => ({
      ...p,
      coverImage: p.coverImage ? urlFor(p.coverImage).width(600).height(400).url() : undefined,
      excerpt: resolveExcerpt(p.excerpt, p.bodyExcerpt),
      href: `/aktualnosci/${p.slug}`,
    }))
  } catch {
    posts = []
  }

  return (
    <main>
      <SubpageHero
        subtitle="HYDRA ARMS / Aktualności"
        title="Aktualności"
        video="/video/aerial-view.mp4"
      />
      <PostListClient posts={posts} />
    </main>
  )
}
