import { createClient, type SupabaseClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const REMEMBER_KEY = 'gantry-remember-me';

export function getRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_KEY) !== 'false';
}

export function setRememberMe(value: boolean): void {
  localStorage.setItem(REMEMBER_KEY, String(value));
  if (!value) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = localStorage.getItem(key);
        if (val) sessionStorage.setItem(key, val);
        localStorage.removeItem(key);
      }
    }
  }
}

const authStorage = {
  getItem: (key: string): string | null => {
    return getRememberMe() ? localStorage.getItem(key) : sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (getRememberMe()) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

function createSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signUp: async () => ({ data: { user: null, session: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => ({ error: null }),
        updateUser: async () => ({ data: { user: null }, error: null }),
      },
    } as unknown as SupabaseClient;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { storage: authStorage },
  });
}

export const supabase = createSupabase();
