import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase';
export async function POST(req:Request){
 if(!(await requireAdmin()).ok)return NextResponse.json({message:'Unauthorized'},{status:401});
 try{
  const form=await req.formData();const file=form.get('file');
  if(!(file instanceof File)||!file.size||file.size>2*1024*1024)return NextResponse.json({message:'Choose a PNG, JPEG or WebP logo up to 2 MB.'},{status:400});
  const bytes=Buffer.from(await file.arrayBuffer());let type='',ext='';
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){type='image/png';ext='png'}
  else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){type='image/jpeg';ext='jpg'}
  else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){type='image/webp';ext='webp'}
  else return NextResponse.json({message:'Only PNG, JPEG and WebP images are supported.'},{status:400});
  const s=supabaseAdmin();const bucket='company-assets';const path=`logos/${crypto.randomUUID()}.${ext}`;
  const {data:settings,error:settingsError}=await s.from('company_settings').select('id').limit(1).maybeSingle();if(settingsError)throw settingsError;
  if(!settings)return NextResponse.json({message:'Save your company settings before uploading a logo.'},{status:400});
  const {data:existing,error:bucketError}=await s.storage.getBucket(bucket);
  if(bucketError||!existing){const {error}=await s.storage.createBucket(bucket,{public:true,fileSizeLimit:2*1024*1024,allowedMimeTypes:['image/png','image/jpeg','image/webp']});if(error)throw error;}
  const {error:uploadError}=await s.storage.from(bucket).upload(path,bytes,{contentType:type,upsert:false});if(uploadError)throw uploadError;
  const {data:{publicUrl}}=s.storage.from(bucket).getPublicUrl(path);
  const {error}=await s.from('company_settings').update({logo_url:publicUrl,updated_at:new Date().toISOString()}).eq('id',settings.id);
  if(error){await s.storage.from(bucket).remove([path]);throw error;}
  return NextResponse.json({logoUrl:publicUrl,message:'Company logo updated.'});
 }catch{return NextResponse.json({message:'Unable to upload logo. Check Storage access and try again.'},{status:500})}
}
