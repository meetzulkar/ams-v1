import Link from 'next/link';
import CompanyBrand from '@/components/CompanyBrand';
import {ArrowUpRight,Clock3} from 'lucide-react';
export default function PublicShell({children}:{children:React.ReactNode}){
 return <div className="publicShell"><header className="publicHeader"><div className="publicHeaderInner"><CompanyBrand/><nav className="publicNav" aria-label="Main navigation"><Link href="/" className="publicHome">Home</Link><Link href="/admin/login" className="btn secondary small">Admin login <ArrowUpRight size={16}/></Link></nav></div></header><main className="container" id="main-content">{children}</main><footer className="publicFooter"><span>Attendance Pro <span className="muted">· A clearer workday.</span></span><span><Clock3 size={14}/> India Standard Time (IST)</span></footer></div>;
}
