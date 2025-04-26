export const metaWith = (title: string, description: string) => [
  {
    name: 'description',
    content: description,
  },
  {
    name: 'author',
    content: 'Olalekan Raheem',
  },
  {
    property: 'og:title',
    content: title,
  },
  {
    property: 'og:site_name',
    content: 'The ForgeBase',
  },
  {
    property: 'og:type',
    content: 'website',
  },
  {
    property: 'og:url',
    content: 'https://the-forgebase.vercel.app/', // Updated URL
  },
  {
    property: 'og:description',
    content: description,
  },
  {
    property: 'og:image',
    content: 'https://the-forgebase.vercel.app/assets/og-image.png', // Updated image URL
  },

  {
    property: 'twitter:card',
    content: 'summary_large_image',
  },
  {
    property: 'twitter:title',
    content: title,
  },
  {
    property: 'twitter:description',
    content: description,
  },
  {
    property: 'twitter:image',
    content: 'https://the-forgebase.vercel.app/assets/og-image.png', // Updated image URL
  },
];
