import { defineField, defineType } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Ustawienia strony',
  type: 'document',
  fields: [
    defineField({ name: 'companyName', title: 'Nazwa firmy', type: 'string' }),
    defineField({ name: 'nip', title: 'NIP', type: 'string' }),
    defineField({ name: 'regon', title: 'REGON', type: 'string' }),
    defineField({ name: 'koncesja', title: 'Nr koncesji MSWiA', type: 'string' }),
    defineField({ name: 'emailRD', title: 'Email R&D', type: 'string' }),
    defineField({ name: 'emailB2G', title: 'Email B2G', type: 'string' }),
    defineField({ name: 'emailHandel', title: 'Email handel', type: 'string' }),
    defineField({ name: 'emailBiuro', title: 'Email biuro', type: 'string' }),
    defineField({ name: 'facebookUrl', title: 'Facebook URL', type: 'url' }),
    defineField({ name: 'instagramUrl', title: 'Instagram URL', type: 'url' }),
    defineField({ name: 'lat', title: 'Latitude', type: 'number' }),
    defineField({ name: 'lng', title: 'Longitude', type: 'number' }),
  ],
  preview: { select: { title: 'companyName' } },
})
