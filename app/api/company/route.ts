import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase';
export async function GET(){
 try{const {data,error}=await supabaseAdmin().from('company_settings').select('company_name,logo_url').limit(1).maybeSingle();if(error)throw error;return NextResponse.json({companyName:data?.company_name||'Tumkur Concrete Spun Pipes',logoUrl:data?.logo_url||'/tumkur-concrete-logo-transparent.png'},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({companyName:'Tumkur Concrete Spun Pipes',logoUrl:'/tumkur-concrete-logo-transparent.png'})}
}
