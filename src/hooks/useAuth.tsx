import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import i18n from '@/i18n';
import { SUPPORTED_LANGUAGES } from '@/i18n';

const SUPPORTED = SUPPORTED_LANGUAGES.map((l) => l.code) as readonly string[];

async function syncLanguageFromProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('language')
    .eq('id', userId)
    .maybeSingle();
  const lang = data?.language;
  if (lang && SUPPORTED.includes(lang) && i18n.resolvedLanguage !== lang) {
    await i18n.changeLanguage(lang);
  }
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          // Defer to avoid blocking auth callback
          setTimeout(() => { syncLanguageFromProfile(session.user.id); }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        syncLanguageFromProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
};
