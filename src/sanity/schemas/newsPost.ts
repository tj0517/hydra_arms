import { defineField, defineType } from 'sanity'
import { postBodyField } from './shared/postBody'

export const newsPost = defineType({
  name: 'newsPost',
  title: 'Aktualności',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Tytuł', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Data publikacji',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Zdjęcie główne',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'excerpt',
      title: 'Zajawka',
      type: 'text',
      rows: 3,
      validation: (r) => r.max(300),
    }),
    defineField({
      name: 'tags',
      title: 'Tagi',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({ name: 'featured', title: 'Wyróżniony', type: 'boolean', initialValue: false }),
    postBodyField,
  ],
  orderings: [
    { title: 'Data malejąco', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title', date: 'publishedAt', media: 'coverImage' },
    prepare({ title, date, media }) {
      const formatted = date ? new Date(date).toLocaleDateString('pl-PL') : ''
      return { title, subtitle: formatted, media }
    },
  },
})
