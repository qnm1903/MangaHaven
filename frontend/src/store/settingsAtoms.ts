import { atomWithStorage } from 'jotai/utils';
import britainFlag from '@/assets/britain.svg';
import vietnamFlag from '@/assets/vietnam.svg';
import japanFlag from '@/assets/japan.svg';

export type UiLocale = 'vi' | 'en';

export const uiLanguageAtom = atomWithStorage<UiLocale>('ui-language', 'vi');

export type LanguageCode = 'en' | 'vi' | 'ja';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English',      nativeLabel: 'Tiếng Anh',     flag: britainFlag },
  { code: 'vi', label: 'Vietnamese',   nativeLabel: 'Tiếng Việt',  flag: vietnamFlag },
  { code: 'ja', label: 'Japanese',     nativeLabel: 'Tiếng Nhật',       flag: japanFlag   },
];

function getStoredLanguages(): LanguageCode[] {
  if (typeof window === 'undefined') return ['en'];
  try {
    const raw = localStorage.getItem('chapter-languages');
    if (raw) {
      const parsed = JSON.parse(raw) as LanguageCode[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return ['en'];
}

export const chapterLanguagesAtom = atomWithStorage<LanguageCode[]>(
  'chapter-languages',
  getStoredLanguages()
);