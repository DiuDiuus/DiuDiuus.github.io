// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://diudiuus.github.io',
  trailingSlash: 'always',
  compressHTML: true,
  i18n: {
    locales: ['en', 'ko'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
});
