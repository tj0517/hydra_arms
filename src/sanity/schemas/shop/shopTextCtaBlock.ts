import { defineArrayMember, defineField, defineType } from 'sanity'

export const shopTextCtaBlock = defineType({
  name: 'shopTextCtaBlock',
  title: 'Tekst + CTA',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Nagłówek',
      type: 'string',
    }),
    defineField({
      name: 'body',
      title: 'Treść',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normalny', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
          ],
          lists: [{ title: 'Lista punktowana', value: 'bullet' }],
          marks: {
            decorators: [
              { title: 'Pogrubienie', value: 'strong' },
              { title: 'Kursywa', value: 'em' },
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                type: 'object',
                fields: [
                  defineField({ name: 'href', title: 'Link', type: 'string' }),
                ],
              }),
            ],
          },
        }),
      ],
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
    }),
    defineField({
      name: 'ctaSecondaryText',
      title: 'Tekst drugiego przycisku (opcjonalnie)',
      type: 'string',
    }),
    defineField({
      name: 'ctaSecondaryLink',
      title: 'Link drugiego przycisku',
      type: 'string',
    }),
    defineField({
      name: 'layout',
      title: 'Układ',
      type: 'string',
      options: {
        list: [
          { title: 'Wyśrodkowany', value: 'centered' },
          { title: 'Do lewej', value: 'left' },
          { title: 'Dwie kolumny (tekst + obraz)', value: 'split' },
        ],
        layout: 'radio',
      },
      initialValue: 'centered',
    }),
    defineField({
      name: 'image',
      title: 'Zdjęcie (dla układu dwukolumnowego)',
      type: 'image',
      options: { hotspot: true },
      hidden: ({ parent }) => parent?.layout !== 'split',
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
    select: { title: 'heading', subtitle: 'layout' },
    prepare({ title, subtitle }) {
      return {
        title: `Tekst: ${title || '(bez nagłówka)'}`,
        subtitle,
      }
    },
  },
})
