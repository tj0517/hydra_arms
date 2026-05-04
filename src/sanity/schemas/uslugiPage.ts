import { defineField, defineType } from 'sanity'

export const uslugiPage = defineType({
  name: 'uslugiPage',
  title: 'Strona Usługi',
  type: 'document',
  fields: [
    defineField({ name: 'introText', title: 'Tekst intro', type: 'text' }),
    defineField({
      name: 'competencies',
      title: 'Kompetencje',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'id', title: 'ID (np. 01)', type: 'string' }),
            defineField({ name: 'tab', title: 'Etykieta zakładki', type: 'string' }),
            defineField({ name: 'title', title: 'Tytuł', type: 'string' }),
            defineField({ name: 'desc', title: 'Opis', type: 'text' }),
            defineField({
              name: 'tags',
              title: 'Tagi',
              type: 'array',
              of: [{ type: 'string' }],
            }),
            defineField({ name: 'cta', title: 'Tekst CTA', type: 'string' }),
            defineField({
              name: 'image',
              title: 'Zdjęcie',
              type: 'image',
              options: { hotspot: true },
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'tab' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'introText' } },
})
