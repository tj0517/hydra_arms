import { defineField, defineType } from 'sanity'
import { ProductPickerInput } from '../../components/ProductPickerInput'

export const shopProductPickerBlock = defineType({
  name: 'shopProductPickerBlock',
  title: 'Produkty',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Nagłówek sekcji',
      type: 'string',
      description: 'Np. "Bestsellery", "Nowości", "Polecane"',
    }),
    defineField({
      name: 'subtitle',
      title: 'Etykieta nad nagłówkiem',
      type: 'string',
      description: 'Mała etykieta wyświetlana nad nagłówkiem. Np. "Wybór redakcji".',
    }),
    defineField({
      name: 'selectionMode',
      title: 'Które produkty pokazać?',
      type: 'string',
      options: {
        list: [
          { title: 'Bestsellery — ostatnio wyróżnione produkty', value: 'best_sellers' },
          { title: 'Nowości — ostatnio dodane do katalogu', value: 'new_arrivals' },
          { title: 'Promocje — produkty z obniżoną ceną', value: 'on_sale' },
          { title: 'Ręczny wybór — wybierz konkretne produkty poniżej', value: 'manual' },
        ],
        layout: 'radio',
      },
      initialValue: 'best_sellers',
    }),
    defineField({
      name: 'productIds',
      title: 'Wybrane produkty',
      type: 'array',
      of: [{ type: 'string' }],
      components: { input: ProductPickerInput },
      hidden: ({ parent }) => parent?.selectionMode !== 'manual',
    }),
    defineField({
      name: 'limit',
      title: 'Liczba produktów',
      type: 'number',
      description: 'Ile produktów wyświetlić (2–12). Domyślnie 4. Ignorowane w trybie ręcznym.',
      initialValue: 4,
      validation: (Rule) => Rule.min(2).max(12),
      hidden: ({ parent }) => parent?.selectionMode === 'manual',
    }),
    defineField({
      name: 'layout',
      title: 'Układ siatki',
      type: 'string',
      options: {
        list: [
          { title: '4 kolumny', value: '4col' },
          { title: '3 kolumny', value: '3col' },
          { title: '2 kolumny (duże karty)', value: '2col' },
        ],
        layout: 'radio',
      },
      initialValue: '4col',
    }),
    defineField({
      name: 'ctaText',
      title: 'Tekst linku "Zobacz więcej"',
      type: 'string',
      description: 'Zostaw puste żeby nie pokazywać linku.',
    }),
    defineField({
      name: 'ctaLink',
      title: 'Link "Zobacz więcej"',
      type: 'string',
      description: 'Np. /sklep',
    }),
  ],
  preview: {
    select: { title: 'heading', subtitle: 'selectionMode' },
    prepare({ title, subtitle }) {
      const modeLabel: Record<string, string> = {
        best_sellers: '★ Bestsellery',
        new_arrivals: '↑ Nowości',
        on_sale: '% Promocje',
        manual: '✎ Ręczny wybór',
      }
      return {
        title: `Produkty: ${title || '(bez nagłówka)'}`,
        subtitle: modeLabel[subtitle] || subtitle,
      }
    },
  },
})
