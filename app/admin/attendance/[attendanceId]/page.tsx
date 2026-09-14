import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {ArrowLeft,Camera,Clock3,UserRound} from 'lucide-react';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase';
import {istDateTime,hoursLabel} from '@/lib/time';
import AttendancePhoto from '@/components/AttendancePhoto';
export default async function AttendanceDetail({params}:{params:Promise<{attendanceId:string}>}){
 if(!(await requireAdmin()).ok)redirect('/admin/login');const {attendanceId}=await params;
 if(!z.string().uuid().safeParse(attendanceId).success)notFound();
 const s=supabaseAdmin();const {data:row,error}=await s.from('attendance').select('*').eq('id',attendanceId).maybeSingle();
 if(error)throw new Error('Unable to load attendance details.');if(!row)notFound();
 const {data:employee,error:employeeError}=await s.from('employees').select('id,employee_id,full_name,mobile,department,designation,shift_start,shift_end').eq('id',row.employee_id).maybeSingle();
 if(employeeError)throw new Error('Unable to load employee details.');
 return <div className="container"><Link className="backLink" href="/admin/attendance"><ArrowLeft size={16}/> All attendance</Link><div className="detailHero"><span className="featureIcon"><Clock3 size={28}/></span><div><p className="eyebrow">ATTENDANCE RECORD · {row.attendance_date}</p><h1>{employee?.full_name||'Employee attendance'}</h1><p className="muted">{employee?.employee_id} · {employee?.department||'Employee'} · All times in IST</p></div><span className={`statusPill ${row.penalty?'pending':'ready'}`}>{row.status.replaceAll('_',' ')}</span></div><section className="card attendanceSummary"><div><small>Employee</small><strong>{employee?.full_name}</strong><span>{employee?.designation||'—'} · {employee?.mobile||'—'}</span></div><div><small>Worked time</small><strong>{hoursLabel(row.worked_minutes)}</strong><span>Shift {employee?.shift_start?.slice(0,5)||'—'} – {employee?.shift_end?.slice(0,5)||'—'}</span></div><div><small>Penalty</small><strong>{row.penalty?'Applied':'None'}</strong><span>{row.penalty_reason||'No penalty recorded'}</span></div><Link className="btn" href={'/admin/employees/'+row.employee_id}><UserRound size={16}/> Employee profile</Link></section><div className="grid grid2" style={{marginTop:24}}>{(['check_in','check_out'] as const).map(phase=><section className="card photoDetail" key={phase}><div className="sectionHeading"><h2><Camera size={20}/> {phase==='check_in'?'Check-in':'Check-out'} photo</h2><span className="statusPill ready">{row[phase]?'Recorded':'Pending'}</span></div><div className="photoTimestamp"><Clock3 size={16}/>{row[phase]?`${istDateTime(row[phase])} IST`:'Not recorded yet'}</div>{row[`${phase}_photo_path`]?<AttendancePhoto src={`/api/admin/media?kind=attendance&id=${row.id}&phase=${phase}`} alt={`${phase==='check_in'?'Check-in':'Check-out'} photo of ${employee?.full_name||'employee'}`}/>:<div className="emptyState photoEmpty"><Camera size={38}/><p>{row[phase]?'No photo was captured for this record.':'A photo will appear when attendance is captured.'}</p></div>}</section>)}</div>{row.notes&&<section className="card" style={{marginTop:24}}><h2>Attendance notes</h2><p>{row.notes}</p></section>}</div>;
}
