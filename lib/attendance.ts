import {NextResponse} from 'next/server';
import {z} from 'zod';
import {supabaseAdmin} from './supabase';
import {todayIST,minutesSinceMidnightIST,istTime,minutesWorked,hoursLabel} from './time';
import {sendAttendanceEmail} from './email';
const input=z.object({employeeId:z.string().uuid(),photo:z.string().max(8_000_000).optional()});
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function recordAttendance(req:Request,mode:'checkin'|'checkout') {
  try {
    let body;try{body=await req.json()}catch{return NextResponse.json({message:'Invalid request.'},{status:400})}
    const parsed=input.safeParse(body);
    if(!parsed.success)return NextResponse.json({message:'A valid employee is required.'},{status:400});
    const {employeeId,photo}=parsed.data;
    let file:Buffer|undefined;
    if(mode==='checkin'||photo) {
      if(!photo||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))return NextResponse.json({message:'Capture a live photo before checking in.'},{status:400});
      file=Buffer.from(photo.split(',')[1],'base64');
      if(file.length<100||file[0]!==255||file[1]!==216||file[2]!==255)return NextResponse.json({message:'Invalid photo. Please capture again.'},{status:400});
    }
    const s=supabaseAdmin();
    const {data:employee,error:employeeError}=await s.from('employees').select('id,employee_id,full_name,status').eq('id',employeeId).eq('status','active').maybeSingle();
    if(employeeError)throw employeeError;
    if(!employee)return NextResponse.json({message:'Active employee not found.'},{status:404});
    const date=todayIST();const now=new Date();const time=now.toISOString();
    const {data:existing,error:readError}=await s.from('attendance').select('*').eq('employee_id',employeeId).eq('attendance_date',date).maybeSingle();
    if(readError)throw readError;
    if(mode==='checkin'&&existing?.check_in)return NextResponse.json({message:'Already checked in today.'},{status:409});
    if(mode==='checkout'&&!existing?.check_in)return NextResponse.json({message:'Check in first before checking out.'},{status:400});
    if(existing?.check_out)return NextResponse.json({message:'Already checked out today.'},{status:409});
    const {data:settings,error:settingsError}=await s.from('company_settings').select('late_after,half_day_hours,standard_hours').limit(1).maybeSingle();
    if(settingsError)throw settingsError;
    let saved;let message:string;
    if(mode==='checkin') {
      const [h,m]=(settings?.late_after||'09:30').split(':').map(Number);
      const late=minutesSinceMidnightIST(now)>h*60+m;
      const path=`${employee.id}/${date}/check-in-${crypto.randomUUID()}.jpg`;
      const {error:uploadError}=await s.storage.from('attendance-photos').upload(path,file!,{contentType:'image/jpeg',upsert:false});
      if(uploadError)throw uploadError;
      const payload={employee_id:employeeId,attendance_date:date,check_in:time,check_in_photo_path:path,status:late?'late':'present',penalty:late,penalty_reason:late?`Check-in after ${settings?.late_after||'09:30'} IST`:null,updated_at:time};
      const result=existing?await s.from('attendance').update(payload).eq('id',existing.id).is('check_in',null).is('check_out',null).select('id').maybeSingle():await s.from('attendance').insert(payload).select('id').single();
      if(result.error||!result.data){await s.storage.from('attendance-photos').remove([path]);if(result.error?.code==='23505'||!result.error)return NextResponse.json({message:'Attendance already recorded. Refresh your profile.'},{status:409});throw result.error;}
      saved=result.data;message=`Check-in saved at ${istTime(time)} IST.${late?' Late penalty applied.':''}`;
    } else {
      const worked=minutesWorked(existing.check_in,time);
      const half=worked<Number(settings?.half_day_hours??settings?.standard_hours??9)*60;
      let checkoutPath:string|undefined;
      if(file){checkoutPath=`${employee.id}/${date}/check-out-${crypto.randomUUID()}.jpg`;const {error}=await s.storage.from('attendance-photos').upload(checkoutPath,file,{contentType:'image/jpeg',upsert:false});if(error)throw error;}
      const {data,error}=await s.from('attendance').update({check_out:time,...(checkoutPath?{check_out_photo_path:checkoutPath}:{}),status:half?'half_day':existing.status,notes:half?'Worked less than configured full-day hours':existing.notes,updated_at:time}).eq('id',existing.id).is('check_out',null).select('id').maybeSingle();
      if((error||!data)&&checkoutPath)await s.storage.from('attendance-photos').remove([checkoutPath]);
      if(error)throw error;
      if(!data)return NextResponse.json({message:'Already checked out today.'},{status:409});
      saved=data;message=`Check-out saved at ${istTime(time)} IST. Worked ${hoursLabel(worked)}.${half?' Half day marked.':''}`;
    }
    const email=await sendAttendanceEmail(`${mode==='checkin'?'Check-in':'Check-out'} · ${employee.full_name}`,`<h2>${mode==='checkin'?'Check-in':'Check-out'}</h2><p>${escapeHtml(employee.full_name)} (${escapeHtml(employee.employee_id)})</p><p>${escapeHtml(message)}</p><p>Date: ${date}</p>`,saved.id,mode);
    return NextResponse.json({message,attendanceId:saved.id,email});
  } catch(error) {
    console.error('Attendance save failed:',error instanceof Error?error.message:'Database or storage error');
    return NextResponse.json({message:'Unable to save attendance. Please try again or contact the administrator.'},{status:500});
  }
}
