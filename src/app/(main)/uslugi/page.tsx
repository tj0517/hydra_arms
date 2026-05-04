import UslugiPageClient from '@/components/UslugiPageClient'
import { sanityFetch } from '@/sanity/client'
import { uslugiPageQuery } from '@/sanity/queries'

export default async function UslugiPage() {
  let data: {
    introText?: string
    competencies?: { id: string; tab: string; title: string; desc: string; tags: string[]; cta: string; img: string }[]
  } | null = null

  try {
    data = await sanityFetch({ query: uslugiPageQuery })
  } catch {
    data = null
  }

  return (
    <UslugiPageClient
      introText={data?.introText}
      competencies={data?.competencies}
    />
  )
}
