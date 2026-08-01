/**
 * Patches only the new homePage fields added in the latest schema update.
 * Safe to run on an existing Sanity project — does NOT overwrite other fields.
 *
 *   npx tsx scripts/patch-homepage-fields.ts
 */

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

async function patch() {
  await client
    .patch('homePage')
    .setIfMissing({
      aktualosciHeading: 'Aktualności',
      potencjalTitle: 'POTENCJAŁ I ODPOWIEDZIALNOŚĆ',
      potencjalBody:
        'HYDRA ARMS to krakowski ośrodek kompetencyjny dedykowany dla sektora Security & Defense. Specjalizujemy się w wytwarzaniu zaawansowanych komponentów o wysokim stopniu skomplikowania.',
      blogHeading: 'Blog',
    })
    .commit()

  console.log('✅ homePage fields patched — open Studio to verify.')
}

patch().catch((err) => {
  console.error('❌ Patch failed:', err)
  process.exit(1)
})
