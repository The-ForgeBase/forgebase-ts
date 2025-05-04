import type { Config } from 'tailwindcss';
import { createGlobPatternsForDependencies } from '@nx/angular/tailwind';
import { join } from 'node:path';

export default {
  darkMode: 'class',
  presets: [require('@spartan-ng/brain/hlm-tailwind-preset')],
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html,md,analog,ag}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['InterVariable', 'sans-serif'],
      },
      colors: {
        primary: 'var(--primary-color)',
        accent: 'var(--accent-color)',
      },
      typography: (theme: any) => ({
        zinc: {
          css: {
            '--tw-prose-headings': theme('colors.zinc.950'),
            '--tw-prose-body': theme('colors.zinc.600'),
            maxWidth: 'none',
            h1: {
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: theme('margin.2'),
              lineHeight: 1.11111,
            },
            h2: {
              fontSize: theme('fontSize.lg'),
              fontWeight: theme('fontWeight.semibold'),
              marginBottom: theme('margin.2'),
            },
            h3: {
              fontSize: theme('fontSize.base'),
              fontWeight: theme('fontWeight.semibold'),
              marginBottom: theme('margin.2'),
            },
            p: {
              lineHeight: '28px',
            },
          },
        },
        invert: {
          css: {
            code: {
              backgroundColor: theme('colors.zinc.950'),
              color: theme('colors.white'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function ({ addUtilities }: any) {
      addUtilities({
        '.prose code[class^="language-"]': {
          '@apply !bg-inherit': {},
        },
      });
    },
  ],
} satisfies Config;
