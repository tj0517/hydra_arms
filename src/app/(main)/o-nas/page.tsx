import type { Metadata } from 'next'
import ONasPageClient from '@/components/ONasPageClient'

export const metadata: Metadata = {
  title: 'O nas',
  description:
    'Poznaj HYDRA ARMS — interdyscyplinarny ośrodek inżynieryjny z misją dostarczania zaawansowanych rozwiązań dla sektora obronnego. Nasza historia, wartości i kompetencje.',
  alternates: { canonical: '/o-nas' },
  openGraph: {
    title: 'O nas | HYDRA ARMS',
    description:
      'Poznaj HYDRA ARMS — interdyscyplinarny ośrodek inżynieryjny z misją dostarczania zaawansowanych rozwiązań dla sektora obronnego.',
    url: '/o-nas',
  },
}
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
