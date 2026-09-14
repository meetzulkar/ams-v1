'use client';
import Link from 'next/link';
import CompanyBrand from '@/components/CompanyBrand';
import {usePathname} from 'next/navigation';
import {LayoutDashboard,Users,CalendarCheck,CalendarDays,Sun,ChartNoAxesCombined,Contact,Files,Settings,History,Mail,LogOut,ArrowUpRight,X} from 'lucide-react';
export const adminLinks=[['/admin','Overview',LayoutDashboard],['/admin/employees','Employees',Users],['/admin/attendance','Attendance',CalendarCheck],['/admin/week-offs','Week offs',Sun],['/admin/holidays','Holidays',CalendarDays],['/admin/reports','Reports',ChartNoAxesCombined],['/admin/id-cards','ID cards',Contact],['/admin/documents','Documents',Files],['/admin/settings','Settings & SMTP',Settings],['/admin/audit','Audit log',History],['/admin/notifications','Email notifications',Mail]] as const;
export default function AdminNav({onClose}:{onClose:()=>void}){
 const path=usePathname();
 async function logout(){const r=await fetch('/api/admin/verify-password',{method:'DELETE'});if(r.ok)window.location.assign('/admin/login')}
 return <aside className="adminNav" id="admin-navigation"><div className="navBrand"><CompanyBrand href="/admin"/><button className="iconButton navClose" onClick={onClose} aria-label="Close navigation"><X size={20}/></button></div><p className="navSection">WORKSPACE</p><nav>{adminLinks.map(([url,label,Icon])=><Link href={url} key={url} className={(path===url||(url!=='/admin'&&path.startsWith(url+'/')))?'active':''} aria-current={(path===url||(url!=='/admin'&&path.startsWith(url+'/')))?'page':undefined} onClick={onClose}><Icon size={19}/>{label}</Link>)}</nav><div className="navBottom"><Link href="/" className="navPublic"><ArrowUpRight size={18}/> Employee portal</Link><button className="logoutButton" onClick={logout}><LogOut size={18}/> Sign out</button><div className="navFoot"><span className="avatar">A</span><div><strong>Administrator</strong><small>Workspace access</small></div><span className="onlineDot"/></div></div></aside>;
}
