import { defineField, defineType } from 'sanity'

export const shopAlertBlock = defineType({
  name: 'shopAlertBlock',
  title: 'Komunikat / Ogłoszenie',
  type: 'object',
  fields: [
    defineField({
      name: 'message',
      title: 'Treść komunikatu',
      type: 'string',
      description: 'Krótki tekst wyświetlany w poziomym pasku. Np. "Sklep nieczynny 24–26.12.2025"',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'type',
      title: 'Typ komunikatu',
      type: 'string',
      options: {
        list: [
          { title: 'Informacja (niebieski)', value: 'info' },
          { title: 'Ostrzeżenie (żółty)', value: 'warning' },
          { title: 'Promocja (accent)', value: 'promo' },
        ],
        layout: 'radio',
      },
      initialValue: 'info',
    }),
    defineField({
      name: 'linkText',
      title: 'Tekst linku (opcjonalnie)',
      type: 'string',
      description: 'Np. "Dowiedz się więcej"',
    }),
    defineField({
      name: 'link',
      title: 'Link (opcjonalnie)',
      type: 'string',
    }),
  ],
  preview: {
    select: { title: 'message', subtitle: 'type' },
    prepare({ title, subtitle }) {
      return {
        title: `Komunikat: ${title || '(brak treści)'}`,
        subtitle,
      }
    },
  },
})
