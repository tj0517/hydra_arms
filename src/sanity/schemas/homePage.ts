import { defineField, defineType } from 'sanity'

export const homePage = defineType({
  name: 'homePage',
  title: 'Strona główna',
  type: 'document',
  fields: [
    defineField({
      name: 'heroTagline1',
      title: 'Hero — linia 1',
      type: 'string',
      description: 'Pierwsza linia tekstu w sekcji hero (SplitText)',
    }),
    defineField({
      name: 'heroTagline2',
      title: 'Hero — linia 2',
      type: 'string',
      description: 'Druga linia tekstu w sekcji hero (SplitText)',
    }),
    defineField({
      name: 'hudLabel',
      title: 'HUD label',
      type: 'string',
      description: 'Tekst HUD nad taglines (np. // HYDRA ARMS - PL-2026)',
    }),
    defineField({
      name: 'aboutText',
      title: 'Tekst sekcji "O nas"',
      type: 'text',
      description: 'Tekst ScrollRevealText w sekcji o nas na stronie głównej',
    }),
    defineField({
      name: 'heroVideo',
      title: 'Ścieżka wideo hero',
      type: 'string',
      description: 'Ścieżka do pliku video hero (np. /hero-overflow.mp4)',
    }),
  ],
  preview: { select: { title: 'heroTagline1' } },
})
