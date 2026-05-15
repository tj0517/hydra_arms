import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './src/sanity/schemas'

const SINGLETONS = ['homePage', 'oNasPage', 'uslugiPage', 'wspolpracaPage', 'siteSettings', 'navigation']
const POST_TYPES = ['newsPost', 'blogPost']

export default defineConfig({
  name: 'default',
  title: 'HYDRA ARMS CMS',
  basePath: '/studio',

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Zawartość')
          .items([
            S.listItem()
              .title('Ustawienia strony')
              .id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.listItem()
              .title('Nawigacja')
              .id('navigation')
              .child(S.document().schemaType('navigation').documentId('navigation')),
            S.divider(),
            S.listItem()
              .title('Strona główna')
              .id('homePage')
              .child(S.document().schemaType('homePage').documentId('homePage')),
            S.listItem()
              .title('O nas')
              .id('oNasPage')
              .child(S.document().schemaType('oNasPage').documentId('oNasPage')),
            S.listItem()
              .title('Usługi')
              .id('uslugiPage')
              .child(S.document().schemaType('uslugiPage').documentId('uslugiPage')),
            S.listItem()
              .title('Współpraca')
              .id('wspolpracaPage')
              .child(S.document().schemaType('wspolpracaPage').documentId('wspolpracaPage')),
            S.divider(),
            S.listItem().title('Aktualności').id('newsPost')
              .child(S.documentTypeList('newsPost').title('Aktualności')),
            S.listItem().title('Blog').id('blogPost')
              .child(S.documentTypeList('blogPost').title('Blog')),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) =>
                item.getId() &&
                !SINGLETONS.includes(item.getId()!) &&
                !POST_TYPES.includes(item.getId()!)
            ),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
