import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase';
export async function GET(req:Request){
 const auth=await requireAdmin();if(!auth.ok)return NextResponse.json({message:'Unauthorized'},{status:401});
 const params=new URL(req.url).searchParams;const id=params.get('id');
 if(!z.string().uuid().safeParse(id).success)return NextResponse.json({message:'Invalid record.'},{status:400});
 const s=supabaseAdmin();let path:string|undefined;let bucket='';let name='photo.jpg';
 if(params.get('kind')==='attendance'){
  const phase=params.get('phase');if(phase!=='check_in'&&phase!=='check_out')return NextResponse.json({message:'Invalid photo.'},{status:400});
  const {data,error}=await s.from('attendance').select('check_in_photo_path,check_out_photo_path').eq('id',id).maybeSingle();
  if(error)return NextResponse.json({message:'Unable to load photo.'},{status:500});
  path=phase==='check_in'?data?.check_in_photo_path:data?.check_out_photo_path;bucket='attendance-photos';name=`${phase}-${id}.jpg`;
 }else if(params.get('kind')==='document'){
  const index=Number(params.get('index'));if(!params.has('index')||!Number.isInteger(index)||index<0)return NextResponse.json({message:'Invalid document.'},{status:400});
  const {data,error}=await s.from('employees').select('documents').eq('id',id).maybeSingle();
  if(error)return NextResponse.json({message:'Unable to load document.'},{status:500});
  const document=data?.documents?.[index];path=document?.path;name=document?.name||'document';bucket='employee-documents';
 }else return NextResponse.json({message:'Invalid media type.'},{status:400});
 if(!path)return NextResponse.json({message:'No file recorded.'},{status:404});
 const {data,error}=await s.storage.from(bucket).download(path);
 if(error||!data)return NextResponse.json({message:'File unavailable. Please contact the administrator.'},{status:404});
 const type=data.type||'application/octet-stream';
 const inline=['image/jpeg','image/png','image/webp','application/pdf'].includes(type);
 return new NextResponse(data,{headers:{'Content-Type':type,'Content-Disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'"}});
}
