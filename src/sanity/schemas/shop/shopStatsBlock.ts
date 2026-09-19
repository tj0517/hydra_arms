import { defineField, defineType } from 'sanity'

export const shopStatsBlock = defineType({
  name: 'shopStatsBlock',
  title: 'Liczby / Statystyki',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Nagłówek nad statystykami (opcjonalnie)',
      type: 'string',
    }),
    defineField({
      name: 'items',
      title: 'Statystyki',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'value',
              title: 'Wartość',
              type: 'string',
              description: 'Np. "500+", "12 lat", "100%"',
            }),
            defineField({ name: 'label', title: 'Etykieta', type: 'string' }),
            defineField({ name: 'subtext', title: 'Dodatkowy opis (opcjonalnie)', type: 'string' }),
          ],
          preview: {
            select: { title: 'value', subtitle: 'label' },
            prepare({ title, subtitle }) {
              return { title: title || '(brak wartości)', subtitle }
            },
          },
        },
      ],
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
      initialValue: 'dark',
    }),
  ],
  preview: {
    select: { title: 'heading', items: 'items' },
    prepare({ title, items }) {
      return {
        title: `Statystyki: ${title || '(bez nagłówka)'}`,
        subtitle: `${items?.length ?? 0} pozycji`,
      }
    },
  },
})
