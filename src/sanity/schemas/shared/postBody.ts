import { defineArrayMember, defineField } from 'sanity'

export const postBodyField = defineField({
  name: 'body',
  title: 'Treść',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normalny', value: 'normal' },
        { title: 'H1', value: 'h1' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'Cytat', value: 'blockquote' },
      ],
      lists: [
        { title: 'Lista punktowana', value: 'bullet' },
        { title: 'Lista numerowana', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Pogrubienie', value: 'strong' },
          { title: 'Kursywa', value: 'em' },
          { title: 'Podkreślenie', value: 'underline' },
          { title: 'Przekreślenie', value: 'strike-through' },
          { title: 'Kod', value: 'code' },
        ],
        annotations: [
          defineArrayMember({
            name: 'externalLink',
            title: 'Link zewnętrzny',
            type: 'object',
            fields: [
              defineField({ name: 'url', title: 'URL', type: 'url' }),
              defineField({ name: 'openInNewTab', title: 'Otwórz w nowej karcie', type: 'boolean', initialValue: true }),
            ],
          }),
          defineArrayMember({
            name: 'internalLink',
            title: 'Link wewnętrzny',
            type: 'object',
            fields: [
              defineField({ name: 'href', title: 'Ścieżka (np. /uslugi)', type: 'string' }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      name: 'postImage',
      title: 'Zdjęcie',
      type: 'object',
      fields: [
        defineField({ name: 'image', title: 'Zdjęcie', type: 'image', options: { hotspot: true } }),
        defineField({ name: 'alt', title: 'Tekst alternatywny', type: 'string' }),
        defineField({ name: 'caption', title: 'Podpis', type: 'string' }),
        defineField({
          name: 'layout',
          title: 'Układ',
          type: 'string',
          options: {
            list: [
              { title: 'Pełna szerokość', value: 'full' },
              { title: 'Do lewej', value: 'left' },
              { title: 'Do prawej', value: 'right' },
              { title: 'Środek', value: 'center' },
            ],
          },
          initialValue: 'full',
        }),
      ],
      preview: {
        select: { title: 'alt', subtitle: 'caption', media: 'image' },
        prepare({ title, subtitle, media }) {
          return { title: title || 'Zdjęcie', subtitle, media }
        },
      },
    }),
    defineArrayMember({
      name: 'mermaidBlock',
      title: 'Diagram Mermaid',
      type: 'object',
      fields: [
        defineField({ name: 'code', title: 'Kod Mermaid', type: 'text' }),
        defineField({ name: 'caption', title: 'Podpis', type: 'string' }),
      ],
      preview: {
        select: { title: 'caption', subtitle: 'code' },
        prepare({ title, subtitle }) {
          return { title: title || 'Diagram', subtitle: subtitle?.slice(0, 60) }
        },
      },
    }),
    defineArrayMember({
      name: 'calloutBlock',
      title: 'Wyróżnik',
      type: 'object',
      fields: [
        defineField({ name: 'text', title: 'Tekst', type: 'text' }),
        defineField({
          name: 'type',
          title: 'Typ',
          type: 'string',
          options: {
            list: [
              { title: 'Info', value: 'info' },
              { title: 'Ostrzeżenie', value: 'warning' },
              { title: 'Wskazówka', value: 'tip' },
            ],
          },
          initialValue: 'info',
        }),
      ],
      preview: {
        select: { title: 'type', subtitle: 'text' },
        prepare({ title, subtitle }) {
          return { title: `[${title?.toUpperCase() || 'INFO'}]`, subtitle: subtitle?.slice(0, 80) }
        },
      },
    }),
    defineArrayMember({
      name: 'codeBlock',
      title: 'Blok kodu',
      type: 'object',
      fields: [
        defineField({ name: 'code', title: 'Kod', type: 'text' }),
        defineField({ name: 'language', title: 'Język (np. typescript)', type: 'string' }),
      ],
      preview: {
        select: { title: 'language', subtitle: 'code' },
        prepare({ title, subtitle }) {
          return { title: title || 'kod', subtitle: subtitle?.slice(0, 60) }
        },
      },
    }),
  ],
})
