import { defineArrayMember, defineField, defineType } from 'sanity'

export const shopBannerBlock = defineType({
  name: 'shopBannerBlock',
  title: 'Baner',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Nagłówek',
      type: 'string',
    }),
    defineField({
      name: 'subtitle',
      title: 'Podtytuł',
      type: 'string',
    }),
    defineField({
      name: 'image',
      title: 'Zdjęcie tła',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'videoPath',
      title: 'Ścieżka wideo (opcjonalnie)',
      type: 'string',
      description: 'Ścieżka do pliku MP4 (np. /promo.mp4). Jeśli podane, zastępuje zdjęcie.',
    }),
    defineField({
      name: 'ctaText',
      title: 'Tekst przycisku',
      type: 'string',
    }),
    defineField({
      name: 'ctaLink',
      title: 'Link przycisku',
      type: 'string',
      description: 'Ścieżka wewnętrzna (np. /sklep/kategoria) lub URL zewnętrzny.',
    }),
    defineField({
      name: 'theme',
      title: 'Kolor tekstu',
      type: 'string',
      options: {
        list: [
          { title: 'Jasny (biały tekst)', value: 'dark' },
          { title: 'Ciemny (czarny tekst)', value: 'light' },
        ],
        layout: 'radio',
      },
      initialValue: 'dark',
    }),
    defineField({
      name: 'height',
      title: 'Wysokość banera',
      type: 'string',
      options: {
        list: [
          { title: 'Pełny ekran', value: 'full' },
          { title: 'Połowa ekranu', value: 'half' },
          { title: 'Kompaktowy', value: 'compact' },
        ],
        layout: 'radio',
      },
      initialValue: 'half',
    }),
  ],
  preview: {
    select: { title: 'heading', subtitle: 'subtitle', media: 'image' },
    prepare({ title, subtitle, media }) {
      return { title: `Baner: ${title || '(bez nagłówka)'}`, subtitle, media }
    },
  },
})
