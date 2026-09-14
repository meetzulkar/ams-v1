import nodemailer from 'nodemailer';
import {supabaseAdmin} from './supabase';
import {attendanceEmailHtml,type EmailAttendance} from './attendance-email';
export async function sendAttendanceEmail(subject:string,html:string,attendanceId?:string,eventType='attendance') {
  const s=supabaseAdmin();
  let recipients:string[]=[];
  let status='failed';let message='';
  try {
    const {data:settings,error}=await s.from('company_settings').select('*').limit(1).maybeSingle();
    if(error)throw error;
    const user=settings?.smtp_user||process.env.GMAIL_USER;
    const pass=settings?.smtp_password||process.env.GMAIL_APP_PASSWORD;
    recipients=(settings?.email_recipients||[]).filter(Boolean);
    if(!user||!pass||!recipients.length){status='skipped';message='Configure SMTP credentials and recipients in Admin Settings.';}
    else {
      const attachments:{filename:string;content:Buffer;cid:string;contentType:string}[]=[];
      if(attendanceId){
        const {data:record,error:recordError}=await s.from('attendance').select('attendance_date,check_in,check_out,check_in_photo_path,check_out_photo_path,worked_minutes,status,penalty,employees(full_name,employee_id,department,designation)').eq('id',attendanceId).single();
        if(recordError)throw recordError;
        const photos:{phase:'check_in'|'check_out';cid:string}[]=[];
        for(const phase of ['check_in','check_out'] as const){
          const path=record[`${phase}_photo_path`];if(!path)continue;
          const {data:photo,error:photoError}=await s.storage.from('attendance-photos').download(path);
          if(photoError||!photo)throw new Error('Unable to attach attendance photo.');
          const cid=`${phase}-${attendanceId}@attendance-pro`;
          attachments.push({filename:`${phase}-${record.attendance_date}.jpg`,content:Buffer.from(await photo.arrayBuffer()),cid,contentType:'image/jpeg'});
          photos.push({phase,cid});
        }
        html=attendanceEmailHtml(record as unknown as EmailAttendance,settings?.company_name||'Attendance Pro',photos);
      }
      const port=Number(settings?.smtp_port||465);
      const transporter=nodemailer.createTransport({host:settings?.smtp_host||'smtp.gmail.com',port,secure:settings?.smtp_secure??port===465,auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
      await transporter.sendMail({from:settings?.gmail_from||user,to:recipients.join(','),subject:`${settings?.company_name||'Attendance'} · ${subject}`,html,attachments});
      status='sent';message='Email sent.';
    }
  } catch {message='Email delivery or photo attachment failed. Check the stored photos and SMTP settings.';}
  try {
    const {error}=await s.from('notification_logs').insert({attendance_id:attendanceId||null,event_type:eventType,recipients,status,provider_message:message});
    if(error)console.error('Unable to record notification status:',error.code);
  } catch {console.error('Unable to record notification status.');}
  return {status,message};
}
