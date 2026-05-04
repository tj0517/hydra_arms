import { defineField, defineType } from 'sanity'

export const navigation = defineType({
  name: 'navigation',
  title: 'Nawigacja',
  type: 'document',
  fields: [
    defineField({
      name: 'links',
      title: 'Linki nawigacji',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'href', title: 'URL', type: 'string' }),
            defineField({ name: 'label', title: 'Etykieta', type: 'string' }),
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'links' } },
})
