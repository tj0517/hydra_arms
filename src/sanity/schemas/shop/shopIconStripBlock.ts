import { defineField, defineType } from 'sanity'

export const shopIconStripBlock = defineType({
  name: 'shopIconStripBlock',
  title: 'Pasek ikon / zaufanie',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Nagłówek (opcjonalnie)',
      type: 'string',
    }),
    defineField({
      name: 'items',
      title: 'Elementy',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'icon',
              title: 'Ikona',
              type: 'string',
              description: 'Nazwa ikony Lucide (np. shield, truck, package, clock, star). Lista: lucide.dev/icons',
            }),
            defineField({ name: 'label', title: 'Etykieta', type: 'string' }),
            defineField({ name: 'subtext', title: 'Podtekst (opcjonalnie)', type: 'string' }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'subtext' },
            prepare({ title, subtitle }) {
              return { title: title || '(bez etykiety)', subtitle }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'layout',
      title: 'Układ',
      type: 'string',
      options: {
        list: [
          { title: 'Poziomy (1 rząd)', value: 'horizontal' },
          { title: 'Siatka (2×N)', value: 'grid' },
        ],
        layout: 'radio',
      },
      initialValue: 'horizontal',
    }),
    defineField({
      name: 'background',
      title: 'Tło sekcji',
      type: 'string',
      options: {
        list: [
          { title: 'Przezroczyste', value: 'transparent' },
          { title: 'Ciemne', value: 'dark' },
          { title: 'Jasne', value: 'light' },
        ],
        layout: 'radio',
      },
      initialValue: 'transparent',
    }),
  ],
  preview: {
    select: { title: 'heading', items: 'items' },
    prepare({ title, items }) {
      return {
        title: `Pasek ikon: ${title || '(bez nagłówka)'}`,
        subtitle: `${items?.length ?? 0} elementów`,
      }
    },
  },
})
