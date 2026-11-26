// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jiwookim.dev',
  trailingSlash: 'always',
  compressHTML: true,
  i18n: {
    locales: ['en', 'ko'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
});
