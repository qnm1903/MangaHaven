import { defineConfig } from '@lingui/conf';

export default defineConfig({
  locales: ['en', 'vi'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: 'src/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  format: 'po',
  compileNamespace: 'es',
});
