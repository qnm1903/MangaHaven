import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/store/settingsAtoms';

interface LanguageFlagProps {
  languageCode: string;
  className?: string;
}

export function LanguageFlag({ languageCode, className = 'h-4 w-5' }: LanguageFlagProps) {
  // Normalize code: 'en' instead of 'EN' or 'eng'
  const normalizedCode = languageCode.toLowerCase().slice(0, 2) as LanguageCode;
  
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === normalizedCode);
  
  if (!language) {
    return (
      <span className={`inline-block shrink-0 min-h-4 min-w-5 text-xs font-medium text-neutral-500 ${className}`}>
        {languageCode.toUpperCase()}
      </span>
    );
  }
  
  return (
    <img
      src={language.flag}
      alt={language.label}
      title={language.label}
      className={`inline-block shrink-0 min-h-4 min-w-5 object-cover ${className}`}
    />
  );
}