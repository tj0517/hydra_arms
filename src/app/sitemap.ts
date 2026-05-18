import type { MetadataRoute } from 'next'
import { sanityFetch } from '@/sanity/client'
import { groq } from 'next-sanity'
import { createPublicClient } from '@/lib/supabase/public'

const BASE_URL = 'https://hydraarms.pl'

const staticRoutes: MetadataRoute.Sitemap = [
  { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
  { url: `${BASE_URL}/uslugi`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
  { url: `${BASE_URL}/o-nas`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE_URL}/wspolpraca`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE_URL}/aktualnosci`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  { url: `${BASE_URL}/sklep`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
  { url: `${BASE_URL}/kontakt`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.6 },
  { url: `${BASE_URL}/polityka-prywatnosci`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  { url: `${BASE_URL}/regulamin`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [newsPosts, blogPosts, products] = await Promise.allSettled([
    sanityFetch<{ slug: string; publishedAt?: string }[]>({
      query: groq`*[_type == "newsPost"] | order(publishedAt desc) { "slug": slug.current, publishedAt }`,
    }),
    sanityFetch<{ slug: string; publishedAt?: string }[]>({
      query: groq`*[_type == "blogPost"] | order(publishedAt desc) { "slug": slug.current, publishedAt }`,
    }),
    (async () => {
      const sb = createPublicClient()
      if (!sb) return []
      const { data } = await sb
        .from('shop_products')
        .select('id, updated_at')
        .eq('is_active', true)
        .limit(500)
      return data ?? []
    })(),
  ])

  const newsRoutes: MetadataRoute.Sitemap =
    newsPosts.status === 'fulfilled' && Array.isArray(newsPosts.value)
      ? newsPosts.value.map((p) => ({
          url: `${BASE_URL}/aktualnosci/${p.slug}`,
          lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }))
      : []

  const blogRoutes: MetadataRoute.Sitemap =
    blogPosts.status === 'fulfilled' && Array.isArray(blogPosts.value)
      ? blogPosts.value.map((p) => ({
          url: `${BASE_URL}/blog/${p.slug}`,
          lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        }))
      : []

  const productRoutes: MetadataRoute.Sitemap =
    products.status === 'fulfilled' && Array.isArray(products.value)
      ? (products.value as { id: number; updated_at?: string }[]).map((p) => ({
          url: `${BASE_URL}/sklep/${p.id}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }))
      : []

  return [...staticRoutes, ...newsRoutes, ...blogRoutes, ...productRoutes]
}
