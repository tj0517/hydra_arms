import type { Metadata } from 'next'
import SubpageHero from '@/components/SubpageHero'
import PostListClient from '@/components/PostListClient'
import { sanityFetch } from '@/sanity/client'
import { blogPostsQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Artykuły eksperckie HYDRA ARMS na temat inżynierii obronnej, technologii wojskowych i innowacji w sektorze bezpieczeństwa.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog | HYDRA ARMS',
    description:
      'Artykuły eksperckie HYDRA ARMS na temat inżynierii obronnej, technologii wojskowych i innowacji w sektorze bezpieczeństwa.',
    url: '/blog',
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

export default async function BlogPage() {
  let posts: PostCardData[] = []

  try {
    const raw = await sanityFetch<RawPost[]>({ query: blogPostsQuery })
    posts = (raw ?? []).map((p) => ({
      ...p,
      coverImage: p.coverImage ? urlFor(p.coverImage).width(600).height(400).url() : undefined,
      excerpt: resolveExcerpt(p.excerpt, p.bodyExcerpt),
      href: `/blog/${p.slug}`,
    }))
  } catch {
    posts = []
  }

  return (
    <main>
      <SubpageHero
        subtitle="HYDRA ARMS / Blog"
        title="Blog"
        video="/video/aerial-view.mp4"
      />
      <PostListClient posts={posts} />
    </main>
  )
}
