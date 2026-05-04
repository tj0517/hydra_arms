import { defineField, defineType } from 'sanity'

export const oNasPage = defineType({
  name: 'oNasPage',
  title: 'Strona O nas',
  type: 'document',
  fields: [
    defineField({ name: 'introText', title: 'Tekst intro', type: 'text' }),
    defineField({ name: 'missionTitle', title: 'Tytuł misji', type: 'string' }),
    defineField({ name: 'missionDesc', title: 'Opis misji (drugi)', type: 'text' }),
    defineField({
      name: 'missionItems',
      title: 'Elementy misji',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Tytuł', type: 'string' }),
            defineField({ name: 'desc', title: 'Opis', type: 'text' }),
          ],
          preview: { select: { title: 'title' } },
        },
      ],
    }),
    defineField({
      name: 'certCards',
      title: 'Karty certyfikatów',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'tag', title: 'Tag', type: 'string' }),
            defineField({ name: 'title', title: 'Tytuł', type: 'string' }),
            defineField({ name: 'desc', title: 'Opis', type: 'text' }),
          ],
          preview: { select: { title: 'title', subtitle: 'tag' } },
        },
      ],
    }),
    defineField({
      name: 'fundamentyItems',
      title: 'Fundamenty działalności',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Tytuł', type: 'string' }),
            defineField({ name: 'desc', title: 'Opis', type: 'text' }),
          ],
          preview: { select: { title: 'title' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'introText' } },
})
