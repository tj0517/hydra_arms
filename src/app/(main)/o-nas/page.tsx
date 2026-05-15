import ONasPageClient from '@/components/ONasPageClient'
import { sanityFetch } from '@/sanity/client'
import { oNasPageQuery } from '@/sanity/queries'

export default async function ONasPage() {
  let data: {
    introText?: string
    missionTitle?: string
    missionDesc?: string
    missionItems?: { title: string; desc: string }[]
    certCards?: { tag: string; title: string; desc: string }[]
    fundamentyItems?: { title: string; desc: string }[]
  } | null = null

  try {
    data = await sanityFetch({ query: oNasPageQuery })
  } catch {
    data = null
  }

  return (
    <ONasPageClient
      introText={data?.introText}
      missionTitle={data?.missionTitle}
      missionDesc={data?.missionDesc}
      missionItems={data?.missionItems}
      certCards={data?.certCards}
      fundamentyItems={data?.fundamentyItems}
    />
  )
}
