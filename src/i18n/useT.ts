import { useStore } from '@/data/store';
import { translations, TranslationKey } from './translations';

export function useT() {
  const { language } = useStore();
  return (key: TranslationKey) => translations[language][key];
}
