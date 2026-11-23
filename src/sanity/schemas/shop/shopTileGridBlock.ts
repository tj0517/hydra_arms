import { defineField, defineType } from 'sanity'

export const shopTileGridBlock = defineType({
  name: 'shopTileGridBlock',
  title: 'Siatka kafelków',
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
      name: 'tiles',
      title: 'Kafelki',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Etykieta', type: 'string' }),
            defineField({ name: 'description', title: 'Opis (opcjonalnie)', type: 'string' }),
            defineField({
              name: 'image',
              title: 'Zdjęcie',
              type: 'image',
              options: { hotspot: true },
              description: 'Używane jako tło, gdy pole „Tło kafelka” jest puste.',
            }),
            defineField({
              name: 'icon',
              title: 'Ikona',
              type: 'image',
              options: { accept: 'image/svg+xml,image/png' },
              description: 'Ikona kategorii, najlepiej SVG, białe/jednokolorowe',
            }),
            defineField({
              name: 'background',
              title: 'Tło kafelka',
              type: 'image',
              options: { hotspot: true },
              description: 'Tło kafelka — pod przyciemnieniem',
            }),
            defineField({
              name: 'link',
              title: 'Link',
              type: 'string',
              description: 'Np. /sklep?category=pistolety lub /sklep/marka/glock',
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'link', image: 'image', icon: 'icon', background: 'background' },
            prepare({ title, subtitle, image, icon, background }) {
              return { title: title || '(bez etykiety)', subtitle, media: icon ?? background ?? image }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'variant',
      title: 'Wygląd kafelków',
      type: 'string',
      options: {
        list: [
          { title: 'Zdjęcie — etykieta na dole zdjęcia', value: 'photo' },
          { title: 'Ikona — ikona i etykieta na przyciemnionym tle', value: 'icon' },
        ],
        layout: 'radio',
      },
      initialValue: 'photo',
    }),
    defineField({
      name: 'columns',
      title: 'Liczba kolumn',
      type: 'string',
      options: {
        list: [
          { title: '2 kolumny', value: '2' },
          { title: '3 kolumny', value: '3' },
          { title: '4 kolumny', value: '4' },
          { title: '5 kolumn', value: '5' },
        ],
        layout: 'radio',
      },
      initialValue: '4',
    }),
  ],
  preview: {
    select: { title: 'heading', tiles: 'tiles' },
    prepare({ title, tiles }) {
      return {
        title: `Siatka: ${title || '(bez nagłówka)'}`,
        subtitle: `${tiles?.length ?? 0} kafelków`,
      }
    },
  },
})
