import { defineField, defineType } from 'sanity'

export const wspolpracaPage = defineType({
  name: 'wspolpracaPage',
  title: 'Strona Współpraca',
  type: 'document',
  fields: [
    defineField({ name: 'introText', title: 'Tekst intro', type: 'text' }),
    defineField({ name: 'secondText', title: 'Tekst drugi', type: 'text' }),
    defineField({
      name: 'fundamenty',
      title: 'Fundamenty',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'id', title: 'ID (np. 01)', type: 'string' }),
            defineField({ name: 'title', title: 'Tytuł', type: 'string' }),
            defineField({ name: 'desc', title: 'Opis', type: 'text' }),
          ],
          preview: { select: { title: 'title', subtitle: 'id' } },
        },
      ],
    }),
    defineField({
      name: 'korzysciTabs',
      title: 'Zakładki korzyści',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'id', title: 'ID (klucz)', type: 'string' }),
            defineField({ name: 'label', title: 'Etykieta zakładki', type: 'string' }),
            defineField({ name: 'title', title: 'Tytuł zawartości', type: 'string' }),
            defineField({ name: 'desc', title: 'Opis', type: 'text' }),
          ],
          preview: { select: { title: 'label' } },
        },
      ],
    }),
    defineField({
      name: 'ethicsItems',
      title: 'Elementy kodeksu etyki',
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
