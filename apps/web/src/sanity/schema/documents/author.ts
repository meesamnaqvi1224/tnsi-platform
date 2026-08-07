import { defineField, defineType } from 'sanity';

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'role', title: 'Designation', type: 'string' }),
    defineField({
      name: 'photo',
      title: 'Portrait',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt text' }],
    }),
    defineField({ name: 'bio', title: 'Biography', type: 'text', rows: 4 }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
  ],
  preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
});
