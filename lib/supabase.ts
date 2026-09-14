import {createClient} from '@supabase/supabase-js';

export function getSupabaseUrl(){const value=process.env.NEXT_PUBLIC_SUPABASE_URL||'';return value.replace(/\/rest\/v1\/?$/,'')}
export function supabaseAdmin(){return createClient(getSupabaseUrl(),process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}})}
export function supabasePublic(){return createClient(getSupabaseUrl(),process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)}
