import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bffpwkgtuukmldwtujxq.supabase.co';
const supabaseAnonKey = 'sb_publishable_S7HNPHpqB3bDOPeGhX1yzg_PiPdkynw';

// Mobile OAuth requires implicit flow.
// supabase-js v2 defaults to PKCE which returns a short-lived `code` that
// must be exchanged server-side. On Android custom-scheme redirects the code
// exchange breaks because the code verifier can be lost across the Chrome
// Custom Tab boundary. Implicit flow returns access_token directly in the
// hash fragment, which is the correct approach for native apps.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    autoRefreshToken: true,
    persistSession: false,   // authStore owns session persistence via AsyncStorage
    detectSessionInUrl: false,
  },
});
