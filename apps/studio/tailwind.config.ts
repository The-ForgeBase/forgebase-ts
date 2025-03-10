import type { Config } from 'tailwindcss';
import { createGlobPatternsForDependencies } from '@nx/angular/tailwind';
import { join } from 'node:path';
import PrimeUI from 'tailwindcss-primeui';

export default {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html,md,analog,ag}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [PrimeUI],
} satisfies Config;
