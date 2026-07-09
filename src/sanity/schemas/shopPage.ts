import { defineArrayMember, defineField, defineType } from 'sanity'

export const shopPage = defineType({
  name: 'shopPage',
  title: 'Sklep — strona główna',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Tytuł strony (SEO)',
      type: 'string',
      description: 'Używany w meta title. Np. "Sklep — Hydra Arms"',
      initialValue: 'Sklep — Hydra Arms',
    }),
    defineField({
      name: 'sections',
      title: 'Sekcje',
      type: 'array',
      description: 'Dodaj, usuń i przeciągnij sekcje w dowolnej kolejności.',
      of: [
        defineArrayMember({ type: 'shopBannerBlock', title: 'Baner' }),
        defineArrayMember({ type: 'shopProductPickerBlock', title: 'Produkty' }),
        defineArrayMember({ type: 'shopTileGridBlock', title: 'Siatka kafelków' }),
        defineArrayMember({ type: 'shopTextCtaBlock', title: 'Tekst + CTA' }),
        defineArrayMember({ type: 'shopIconStripBlock', title: 'Pasek ikon / zaufanie' }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', sections: 'sections' },
    prepare({ title, sections }) {
      return {
        title: title || 'Sklep — strona główna',
        subtitle: `${sections?.length ?? 0} sekcji`,
      }
    },
  },
})
