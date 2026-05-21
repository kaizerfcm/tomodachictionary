/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_PAYMENT_URL_INTL?: string;
  readonly VITE_PLATFORM?: 'web' | 'android';
  readonly VITE_ALLOW_FREE_AD_REMOVAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
