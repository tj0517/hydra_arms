import { createClient } from 'next-sanity'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export const client = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2025-01-01',
      useCdn: false,
    })
  : null

export async function sanityFetch<T>({
  query,
  params = {},
  revalidate = 60,
}: {
  query: string
  params?: Record<string, unknown>
  revalidate?: number | false
}): Promise<T | null> {
  if (!client) return null
  return client.fetch<T>(query, params, {
    next: { revalidate },
  })
}
