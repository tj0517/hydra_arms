import type { Metadata } from 'next'
import WspolpracaPageClient from '@/components/WspolpracaPageClient'

export const metadata: Metadata = {
  title: 'Współpraca',
  description:
    'Nawiąż strategiczne partnerstwo z HYDRA ARMS. Oferujemy przejrzyste warunki współpracy B2G i B2B w obszarze zaawansowanych rozwiązań obronnych.',
  alternates: { canonical: '/wspolpraca' },
  openGraph: {
    title: 'Współpraca | HYDRA ARMS',
    description:
      'Nawiąż strategiczne partnerstwo z HYDRA ARMS. Oferujemy przejrzyste warunki współpracy B2G i B2B.',
    url: '/wspolpraca',
  },
}
import { sanityFetch } from '@/sanity/client'
import { wspolpracaPageQuery } from '@/sanity/queries'

export default async function WspolpracaPage() {
  let data: {
    introText?: string
    secondText?: string
    fundamenty?: { id: string; title: string; desc: string }[]
    korzysciTabs?: { id: string; label: string; title: string; desc: string }[]
    ethicsItems?: { title: string; desc: string }[]
  } | null = null

  try {
    data = await sanityFetch({ query: wspolpracaPageQuery })
  } catch {
    data = null
  }

  return (
    <WspolpracaPageClient
      introText={data?.introText}
      secondText={data?.secondText}
      fundamenty={data?.fundamenty}
      korzysciTabs={data?.korzysciTabs}
      ethicsItems={data?.ethicsItems}
    />
  )
}
