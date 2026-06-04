import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'compact';
  className?: string;
}

export const LanguageSwitcher = ({ variant = 'icon', className }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation();
  const current =
    SUPPORTED_LANGUAGES.find((l) => i18n.resolvedLanguage?.startsWith(l.code)) ??
    SUPPORTED_LANGUAGES[1];

  const handleChange = async (code: string) => {
    await i18n.changeLanguage(code);
    // Mark as an explicit user choice so post-login sync pushes (not pulls).
    try { sessionStorage.setItem('jammate-lang-manual', '1'); } catch { /* ignore */ }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ language: code }).eq('id', user.id);
      try { sessionStorage.removeItem('jammate-lang-manual'); } catch { /* ignore */ }
    }
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === 'icon' ? 'icon' : 'sm'}
          className={className}
          aria-label={t('language')}
        >
          {variant === 'icon' ? (
            <Globe className="h-5 w-5" />
          ) : (
            <span className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4" />
              <span>{current.flag}</span>
              <span className="uppercase">{current.code}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={
              current.code === lang.code ? 'font-semibold text-primary' : undefined
            }
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
