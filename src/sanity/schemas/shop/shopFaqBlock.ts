import { defineArrayMember, defineField, defineType } from 'sanity'

export const shopFaqBlock = defineType({
  name: 'shopFaqBlock',
  title: 'FAQ / Pytania i odpowiedzi',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Nagłówek (opcjonalnie)',
      type: 'string',
    }),
    defineField({
      name: 'subtitle',
      title: 'Podtytuł (opcjonalnie)',
      type: 'string',
    }),
    defineField({
      name: 'items',
      title: 'Pytania i odpowiedzi',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'question', title: 'Pytanie', type: 'string' }),
            defineField({
              name: 'answer',
              title: 'Odpowiedź',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'block',
                  styles: [{ title: 'Normalny', value: 'normal' }],
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
                        fields: [defineField({ name: 'href', title: 'Link', type: 'string' })],
                      }),
                    ],
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'question' },
            prepare({ title }) {
              return { title: title || '(bez pytania)' }
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
      initialValue: 'transparent',
    }),
  ],
  preview: {
    select: { title: 'heading', items: 'items' },
    prepare({ title, items }) {
      return {
        title: `FAQ: ${title || '(bez nagłówka)'}`,
        subtitle: `${items?.length ?? 0} pytań`,
      }
    },
  },
})
