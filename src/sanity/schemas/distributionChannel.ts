import { defineField, defineType } from 'sanity'

export const distributionChannel = defineType({
  name: 'distributionChannel',
  title: 'Kanały dystrybucji',
  type: 'document',
  fields: [
    defineField({ name: 'tag', title: 'Tag (np. B2G)', type: 'string' }),
    defineField({ name: 'title', title: 'Tytuł', type: 'string' }),
    defineField({ name: 'desc', title: 'Opis', type: 'text' }),
    defineField({ name: 'image', title: 'Zdjęcie', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'order', title: 'Kolejność', type: 'number' }),
  ],
  orderings: [{ title: 'Kolejność', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'tag' } },
})
