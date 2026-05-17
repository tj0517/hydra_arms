import SubpageHero from '@/components/SubpageHero'
import PostListClient from '@/components/PostListClient'
import { sanityFetch } from '@/sanity/client'
import { newsPostsQuery } from '@/sanity/queries'
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
}

export default async function AktualnosciPage() {
  let posts: PostCardData[] = []

  try {
    const raw = await sanityFetch<RawPost[]>({ query: newsPostsQuery })
    posts = (raw ?? []).map((p) => ({
      ...p,
      coverImage: p.coverImage ? urlFor(p.coverImage).width(600).height(400).url() : undefined,
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
