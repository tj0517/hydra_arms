import { defineField, defineType } from 'sanity'

export const shopBrandsBlock = defineType({
  name: 'shopBrandsBlock',
  title: 'Marki / Producenci',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Nagłówek (opcjonalnie)',
      type: 'string',
      description: 'Np. "Producenci, których produkty oferujemy"',
    }),
    defineField({
      name: 'items',
      title: 'Marki',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Nazwa marki', type: 'string' }),
            defineField({
              name: 'logo',
              title: 'Logo (opcjonalnie)',
              type: 'image',
              options: { hotspot: false },
              description: 'Preferowany format: PNG z przezroczystym tłem lub SVG. Białe/szare logo na ciemnym tle.',
            }),
            defineField({
              name: 'link',
              title: 'Link (opcjonalnie)',
              type: 'string',
              description: 'Np. filtr kategorii: /sklep?brand=glock',
            }),
          ],
          preview: {
            select: { title: 'name', media: 'logo' },
            prepare({ title, media }) {
              return { title: title || '(bez nazwy)', media }
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
          { title: 'Siatka (zawijana)', value: 'grid' },
          { title: 'Poziomy pasek (przewijany)', value: 'scroll' },
        ],
        layout: 'radio',
      },
      initialValue: 'grid',
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
        title: `Marki: ${title || '(bez nagłówka)'}`,
        subtitle: `${items?.length ?? 0} marek`,
      }
    },
  },
})
