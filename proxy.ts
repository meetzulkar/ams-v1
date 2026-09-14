import {NextResponse,type NextRequest} from 'next/server';
import {ADMIN_COOKIE,validAdminSession} from '@/lib/admin-session';
export function proxy(req:NextRequest){
 const authenticated=validAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
 if(req.nextUrl.pathname==='/admin/login')return authenticated?NextResponse.redirect(new URL('/admin',req.url)):NextResponse.next();
 if(!authenticated)return NextResponse.redirect(new URL('/admin/login',req.url));
 return NextResponse.next();
}
export const config={matcher:['/admin/:path*']};
