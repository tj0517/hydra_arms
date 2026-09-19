import { defineArrayMember, defineField, defineType } from 'sanity'

export const shopRichTextBlock = defineType({
  name: 'shopRichTextBlock',
  title: 'Blok tekstu',
  type: 'object',
  fields: [
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
            { title: 'H4', value: 'h4' },
          ],
          lists: [
            { title: 'Lista punktowana', value: 'bullet' },
            { title: 'Lista numerowana', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Pogrubienie', value: 'strong' },
              { title: 'Kursywa', value: 'em' },
              { title: 'Kod', value: 'code' },
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                type: 'object',
                fields: [
                  defineField({ name: 'href', title: 'Link', type: 'string' }),
                  defineField({
                    name: 'blank',
                    title: 'Otwórz w nowej karcie',
                    type: 'boolean',
                    initialValue: false,
                  }),
                ],
              }),
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'layout',
      title: 'Wyrównanie tekstu',
      type: 'string',
      options: {
        list: [
          { title: 'Wyśrodkowany', value: 'centered' },
          { title: 'Do lewej', value: 'left' },
        ],
        layout: 'radio',
      },
      initialValue: 'left',
    }),
    defineField({
      name: 'maxWidth',
      title: 'Maksymalna szerokość',
      type: 'string',
      options: {
        list: [
          { title: 'Wąski (640px)', value: 'narrow' },
          { title: 'Normalny (800px)', value: 'normal' },
          { title: 'Szeroki (pełna kolumna)', value: 'wide' },
        ],
        layout: 'radio',
      },
      initialValue: 'normal',
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
    select: { body: 'body' },
    prepare({ body }) {
      const firstBlock = body?.[0]
      const text = firstBlock?.children?.map((c: { text?: string }) => c.text).join('') ?? ''
      return {
        title: 'Blok tekstu',
        subtitle: text ? text.slice(0, 60) + (text.length > 60 ? '…' : '') : '(brak treści)',
      }
    },
  },
})
