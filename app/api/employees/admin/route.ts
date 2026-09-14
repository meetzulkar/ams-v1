import {employeeFormSchema} from '@/lib/employee-form';
import {z} from 'zod';
import {NextResponse} from 'next/server';import {supabaseAdmin} from '@/lib/supabase';import {requireAdmin} from '@/lib/auth';
export async function GET(){const a=await requireAdmin();if(!a.ok)return NextResponse.json({message:'Unauthorized'},{status:a.status});const {data,error}=await supabaseAdmin().from('employees').select('*').order('full_name');return NextResponse.json({data,error},{status:error?500:200})}
async function saveEmployee(req:Request,editing:boolean){
 const a=await requireAdmin();if(!a.ok)return NextResponse.json({message:'Unauthorized'},{status:a.status});
 let body;try{body=await req.json()}catch{return NextResponse.json({message:'Invalid request.'},{status:400})}
 const parsed=employeeFormSchema.safeParse(body);
 if(!parsed.success){const issue=parsed.error.issues[0];return NextResponse.json({message:`${String(issue.path[0]||'Employee').replaceAll('_',' ')}: ${issue.message}`},{status:400})}
 if(editing&&!z.string().uuid().safeParse(body.id).success)return NextResponse.json({message:'Valid employee id required.'},{status:400});
 const s=supabaseAdmin();
 const result=editing?await s.from('employees').update(parsed.data).eq('id',body.id).select().single():await s.from('employees').insert(parsed.data).select().single();
 return NextResponse.json(result,{status:result.error?400:editing?200:201});
}
export async function POST(req:Request){return saveEmployee(req,false)}
export async function PATCH(req:Request){return saveEmployee(req,true)}
export async function DELETE(req:Request){const a=await requireAdmin();if(!a.ok)return NextResponse.json({message:'Unauthorized'},{status:a.status});const id=new URL(req.url).searchParams.get('id');if(!id)return NextResponse.json({message:'id required'},{status:400});const {error}=await supabaseAdmin().from('employees').delete().eq('id',id);return NextResponse.json({ok:!error,error},{status:error?400:200})}
