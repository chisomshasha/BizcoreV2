import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bffpwkgtuukmldwtujxq.supabase.co';
const supabaseAnonKey = 'sb_publishable_S7HNPHpqB3bDOPeGhX1yzg_PiPdkynw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
