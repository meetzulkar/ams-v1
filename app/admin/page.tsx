import Link from 'next/link';
import {Users,CalendarCheck,Clock3,Sun,UserMinus,TriangleAlert,ArrowRight} from 'lucide-react';
import {requireAdmin} from '@/lib/auth';
import {redirect} from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { todayIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  if (!(await requireAdmin()).ok) redirect('/admin/login');
  const s = supabaseAdmin();
  const date = todayIST();

  const [employeesQ, recordsQ, lateQ, halfQ, absentQ, penaltyQ] = await Promise.all([
    s.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    s.from('attendance').select('*', { count: 'exact', head: true }).eq('attendance_date', date),
    s
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('attendance_date', date)
      .eq('status', 'late'),
    s
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('attendance_date', date)
      .eq('status', 'half_day'),
    s
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('attendance_date', date)
      .eq('status', 'absent'),
    s
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('attendance_date', date)
      .eq('penalty', true),
  ]);

  const cards: Array<[string, number]> = [
    ['Active Employees', employeesQ.count ?? 0],
    ['Attendance Records', recordsQ.count ?? 0],
    ['Late', lateQ.count ?? 0],
    ['Half Day', halfQ.count ?? 0],
    ['Absent', absentQ.count ?? 0],
    ['Penalty', penaltyQ.count ?? 0],
  ];

  return (
    <div className="container">
      <div className="pageHead"><div><p className="eyebrow">TEAM AT A GLANCE</p><h1>Your workspace, today.</h1><p className="muted">{date} · Here’s how your team’s day is shaping up.</p></div></div>
      <div className="dashboardIntro"><div><h2>A clearer view of every workday.</h2><p>Keep up with your team, review attendance and stay on top of the details.</p></div><Link className="btn primary" href="/admin/attendance">View attendance <ArrowRight size={16}/></Link></div>

      <div className="metricCards">
        {cards.map(([label,value],index)=>{const Icon=[Users,CalendarCheck,Clock3,Sun,UserMinus,TriangleAlert][index];return <div className="card" key={label}><div className="metricCardHead">{label}<Icon size={20}/></div><div className="metricCardValue">{value}</div><p className="metricCardFoot">{index===0?'Currently active in your team':'Recorded today'}</p></div>})}
      </div>
      <div className="dashboardLinks"><Link className="btn" href="/admin/employees">Manage employees <ArrowRight size={15}/></Link><Link className="btn" href="/admin/reports">Download reports <ArrowRight size={15}/></Link><Link className="btn" href="/admin/settings">Workspace settings <ArrowRight size={15}/></Link></div>
    </div>
  );
}
