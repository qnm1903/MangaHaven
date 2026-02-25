import { useEffect, useState } from 'react';
import { I18nProvider } from '@lingui/react';
import { i18n, type Messages } from '@lingui/core';
import { RouterProvider, type AnyRouter } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { Toaster } from '@/components/ui/sonner';
import { uiLanguageAtom, type UiLocale } from '@/store/settingsAtoms';

async function loadCatalog(locale: UiLocale) {
  const mod = await import(`../locales/${locale}/messages.po`) as { messages: Messages };
  i18n.load(locale, mod.messages);
  i18n.activate(locale);
}

const defaultLocale = (() => {
  try {
    return JSON.parse(localStorage.getItem('ui-language') ?? '"vi"') as UiLocale;
  } catch {
    return 'vi' as UiLocale;
  }
})();

loadCatalog(defaultLocale);

type I18nAppProps = {
  router: AnyRouter;
};

export const I18nApp = ({ router }: I18nAppProps) => {
  const locale = useAtomValue(uiLanguageAtom);
  const [ready, setReady] = useState(i18n.locale === locale);

  useEffect(() => {
    if (i18n.locale === locale) {
      setReady(true);
      return;
    }
    setReady(false);
    loadCatalog(locale).then(() => setReady(true));
  }, [locale]);

  if (!ready) return null;

  return (
    <I18nProvider i18n={i18n}>
      <RouterProvider router={router} />
      <Toaster />
    </I18nProvider>
  );
};