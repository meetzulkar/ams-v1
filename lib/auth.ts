import {cookies} from 'next/headers';
import {ADMIN_COOKIE,validAdminSession} from './admin-session';
export async function requireAdmin(){const jar=await cookies();if(!validAdminSession(jar.get(ADMIN_COOKIE)?.value))return {ok:false as const,status:401};return {ok:true as const}}
