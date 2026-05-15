import SubpageHero from '@/components/SubpageHero'
import PostListClient from '@/components/PostListClient'
import { sanityFetch } from '@/sanity/client'
import { blogPostsQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'
import type { PostCardData } from '@/components/PostCard'
import { MOCK_BLOG } from '@/lib/mockPosts'

interface RawPost {
  _id: string
  title: string
  slug: string
  publishedAt?: string
  coverImage?: object
  excerpt?: string
  tags?: string[]
  featured?: boolean
}

export default async function BlogPage() {
  let posts: PostCardData[] = []

  try {
    const raw = await sanityFetch<RawPost[]>({ query: blogPostsQuery })
    posts = (raw ?? []).map((p) => ({
      ...p,
      coverImage: p.coverImage ? urlFor(p.coverImage).width(600).height(400).url() : undefined,
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
        video="/video/dark-terrain.mp4"
      />
      <PostListClient posts={posts.length > 0 ? posts : MOCK_BLOG} />
    </main>
  )
}
