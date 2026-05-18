import type { Metadata } from 'next'
import UslugiPageClient from '@/components/UslugiPageClient'

export const metadata: Metadata = {
  title: 'Usługi',
  description:
    'Zaawansowane usługi inżynieryjne dla sektora obronnego: projektowanie, wytwarzanie, doradztwo i obrót uzbrojeniem. Sprawdź nasze kompetencje.',
  alternates: { canonical: '/uslugi' },
  openGraph: {
    title: 'Usługi | HYDRA ARMS',
    description:
      'Zaawansowane usługi inżynieryjne dla sektora obronnego: projektowanie, wytwarzanie, doradztwo i obrót uzbrojeniem.',
    url: '/uslugi',
  },
}
import { sanityFetch } from '@/sanity/client'
import { uslugiPageQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImage = any

export default async function UslugiPage() {
  let data: {
    introText?: string
    competencies?: { id: string; tab: string; title: string; desc: string; tags: string[]; cta: string; image?: SanityImage }[]
  } | null = null

  try {
    data = await sanityFetch({ query: uslugiPageQuery })
  } catch {
    data = null
  }

  const mappedCompetencies = data?.competencies?.map((c, i) => ({
    id: c.id,
    tab: c.tab,
    title: c.title,
    desc: c.desc,
    tags: c.tags ?? [],
    cta: c.cta,
    img: c.image ? urlFor(c.image).width(800).url() : `/service-0${i + 1}.jpg`,
  })) ?? undefined

  return (
    <UslugiPageClient
      introText={data?.introText}
      competencies={mappedCompetencies}
    />
  )
}
