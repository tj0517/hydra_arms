import { defineField, defineType } from 'sanity'

export const certyfikatyPage = defineType({
  name: 'certyfikatyPage',
  title: 'Strona Certyfikaty',
  type: 'document',
  fields: [
    defineField({ name: 'introText', title: 'Tekst intro', type: 'text', rows: 3 }),
    defineField({
      name: 'certificates',
      title: 'Certyfikaty',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Nazwa / Numer', type: 'string' }),
            defineField({ name: 'desc', title: 'Opis', type: 'text', rows: 3 }),
            defineField({
              name: 'file',
              title: 'Plik PDF',
              type: 'file',
              options: { accept: '.pdf' },
            }),
          ],
          preview: { select: { title: 'name', subtitle: 'desc' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'introText' } },
})
