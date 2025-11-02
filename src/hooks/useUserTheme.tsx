import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserTheme = () => {
  const [accentColor, setAccentColor] = useState<string>('#3b82f6');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserTheme();
  }, []);

  const loadUserTheme = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('theme_accent_color')
        .eq('id', user.id)
        .single();

      if (profile?.theme_accent_color) {
        setAccentColor(profile.theme_accent_color);
        document.documentElement.style.setProperty('--user-accent', profile.theme_accent_color);
      }
    } catch (error) {
      console.error('Error loading user theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (color: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ theme_accent_color: color })
        .eq('id', user.id);

      if (!error) {
        setAccentColor(color);
        document.documentElement.style.setProperty('--user-accent', color);
      }
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  return { accentColor, loading, updateTheme };
};
