import {NextResponse} from 'next/server';
import {ADMIN_COOKIE,SESSION_SECONDS,createAdminSession,passwordMatches} from '@/lib/admin-session';
const attempts=new Map<string,{count:number;until:number}>();
export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({message:'Invalid request origin.'},{status:403});
 if(!process.env.ADMIN_PANEL_PASSWORD)return NextResponse.json({message:'Admin password is not configured.'},{status:503});
 const key=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
 const now=Date.now();for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
 const record=attempts.get(key)||{count:0,until:now+15*60*1000};
 if(record.count>=10)return NextResponse.json({message:'Too many attempts. Please try again in 15 minutes.'},{status:429,headers:{'Retry-After':String(Math.ceil((record.until-now)/1000))}});
 let body;try{body=await req.json()}catch{return NextResponse.json({message:'Invalid request.'},{status:400})}
 if(!passwordMatches(body.panelPassword)){record.count++;attempts.set(key,record);return NextResponse.json({message:'Incorrect admin password.'},{status:401})}
 attempts.delete(key);
 const response=NextResponse.json({ok:true});
 response.cookies.set(ADMIN_COOKIE,createAdminSession(),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:SESSION_SECONDS});
 response.cookies.set('admin-panel-access','',{path:'/',maxAge:0});
 return response;
}
export async function DELETE(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({message:'Invalid request origin.'},{status:403});
 const response=NextResponse.json({ok:true});response.cookies.set(ADMIN_COOKIE,'',{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});return response;
}
