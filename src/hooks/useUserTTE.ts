import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserTTESettings {
  signer_name: string;
  signer_position: string;
  is_active: boolean;
}

export interface TTESettings {
  signer_name: string;
  signer_position: string;
  enabled: boolean;
}

export function useUserTTE() {
  const { user } = useAuth();
  const [tteSettings, setTTESettings] = useState<UserTTESettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserTTE();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserTTE = async () => {
    if (!user) return;
    
    try {
      // First try to get user-specific TTE settings
      const { data: userTTE, error } = await supabase
        .from('user_tte_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user TTE:', error);
      }

      if (userTTE) {
        setTTESettings({
          signer_name: userTTE.signer_name,
          signer_position: userTTE.signer_position,
          is_active: userTTE.is_active ?? true,
        });
      } else {
        // Fallback to global TTE settings
        const globalTTE = await getGlobalTTESettings();
        setTTESettings({
          signer_name: globalTTE.signer_name,
          signer_position: globalTTE.signer_position,
          is_active: globalTTE.enabled,
        });
      }
    } catch (error) {
      console.error('Error in fetchUserTTE:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGlobalTTESettings = async (): Promise<TTESettings> => {
    const { data: tteData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'tte_settings')
      .maybeSingle();

    const value = tteData?.value as Record<string, unknown> | null;
    
    return {
      signer_name: (value?.signer_name as string) || '',
      signer_position: (value?.signer_position as string) || 'Direktur',
      enabled: value?.enabled !== false,
    };
  };

  // Convert to TTESettings format for PDF generators
  const getTTEForPDF = (): TTESettings => {
    if (tteSettings) {
      return {
        signer_name: tteSettings.signer_name,
        signer_position: tteSettings.signer_position,
        enabled: tteSettings.is_active,
      };
    }
    return {
      signer_name: '',
      signer_position: 'Direktur',
      enabled: true,
    };
  };

  // Async version that always fetches fresh data
  const fetchTTEForPDF = async (): Promise<TTESettings> => {
    if (!user) {
      return {
        signer_name: '',
        signer_position: 'Direktur',
        enabled: true,
      };
    }

    try {
      // First try to get user-specific TTE settings
      const { data: userTTE } = await supabase
        .from('user_tte_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userTTE) {
        return {
          signer_name: userTTE.signer_name,
          signer_position: userTTE.signer_position,
          enabled: userTTE.is_active ?? true,
        };
      }

      // Fallback to global TTE settings
      return await getGlobalTTESettings();
    } catch (error) {
      console.error('Error fetching TTE for PDF:', error);
      return {
        signer_name: '',
        signer_position: 'Direktur',
        enabled: true,
      };
    }
  };

  return {
    tteSettings,
    loading,
    getTTEForPDF,
    fetchTTEForPDF,
    refetch: fetchUserTTE,
  };
}

// Standalone function for use outside of React components
export async function fetchUserTTESettings(userId: string): Promise<TTESettings> {
  try {
    // First try to get user-specific TTE settings
    const { data: userTTE } = await supabase
      .from('user_tte_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (userTTE) {
      return {
        signer_name: userTTE.signer_name,
        signer_position: userTTE.signer_position,
        enabled: userTTE.is_active ?? true,
      };
    }

    // Fallback to global TTE settings
    const { data: tteData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'tte_settings')
      .maybeSingle();

    const value = tteData?.value as Record<string, unknown> | null;
    
    return {
      signer_name: (value?.signer_name as string) || '',
      signer_position: (value?.signer_position as string) || 'Direktur',
      enabled: value?.enabled !== false,
    };
  } catch (error) {
    console.error('Error fetching user TTE settings:', error);
    return {
      signer_name: '',
      signer_position: 'Direktur',
      enabled: true,
    };
  }
}
