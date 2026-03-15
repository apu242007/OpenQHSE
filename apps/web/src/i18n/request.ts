import { getRequestConfig } from 'next-intl/server';

export const locales = ['es', 'en', 'pt'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

export default getRequestConfig(async ({ requestLocale }) => {
  // During GitHub Pages static export (output:'export'), requestLocale reads
  // headers() which is unavailable at pre-render time. Skip it and use the
  // default locale — the root layout already hardcodes locale="es".
  let locale: Locale = defaultLocale;
  if (process.env.GITHUB_PAGES !== 'true') {
    const requested = await requestLocale;
    locale = locales.includes(requested as Locale) ? (requested as Locale) : defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
