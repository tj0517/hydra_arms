import { defineField, defineType } from 'sanity'

export const service = defineType({
  name: 'service',
  title: 'Usługi',
  type: 'document',
  fields: [
    defineField({ name: 'id', title: 'ID (np. 01)', type: 'string' }),
    defineField({ name: 'label', title: 'Krótka etykieta', type: 'string' }),
    defineField({ name: 'title', title: 'Tytuł', type: 'string' }),
    defineField({ name: 'desc', title: 'Opis', type: 'text' }),
    defineField({
      name: 'tags',
      title: 'Tagi',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'image',
      title: 'Zdjęcie',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'imagePath',
      title: 'Ścieżka zdjęcia (fallback)',
      type: 'string',
      description: 'Lokalna ścieżka do zdjęcia (używana gdy brak zdjęcia Sanity)',
    }),
    defineField({ name: 'order', title: 'Kolejność', type: 'number' }),
  ],
  orderings: [{ title: 'Kolejność', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'label', media: 'image' } },
})
