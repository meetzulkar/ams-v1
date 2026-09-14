'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {Menu,ShieldCheck} from 'lucide-react';
import AdminNav,{adminLinks} from './AdminNav';
export default function AdminShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();const [open,setOpen]=useState(false);const shell=useRef<HTMLDivElement>(null);const menu=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';const first=shell.current?.querySelector<HTMLElement>('.adminNav a');first?.focus();function key(e:KeyboardEvent){if(e.key==='Escape'){setOpen(false);menu.current?.focus()}if(e.key==='Tab'){const items=shell.current?.querySelectorAll<HTMLElement>('.adminNav a, .adminNav button');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}document.addEventListener('keydown',key);return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',key)}},[open]);
 useEffect(()=>{const desktop=window.matchMedia('(min-width: 1024px)');const closeOnDesktop=()=>{if(desktop.matches)setOpen(false)};desktop.addEventListener('change',closeOnDesktop);return()=>desktop.removeEventListener('change',closeOnDesktop)},[]);
 if(pathname==='/admin/login')return <>{children}</>;
 const title=adminLinks.find(([url])=>url===pathname||(url!=='/admin'&&pathname.startsWith(url+'/')))?.[1]||'Workspace';
 return <div className={`adminShell ${open?'navOpen':''}`} ref={shell}>{open&&<button className="navBackdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}<AdminNav onClose={()=>setOpen(false)}/><div className="adminWorkspace" inert={open?true:undefined}><header className="adminTopbar"><div className="inline"><button className="iconButton menuToggle" ref={menu} aria-label="Open navigation" aria-expanded={open} aria-controls="admin-navigation" onClick={()=>setOpen(true)}><Menu size={22}/></button><span className="breadcrumb">Workspace <span>/</span> <strong>{title}</strong></span></div><div className="workspaceBadge"><ShieldCheck size={16}/> Admin <span className="avatar smallAvatar">A</span></div></header><main id="main-content">{children}</main><footer className="adminFooter">Attendance Pro <span>All attendance times in IST · Asia/Kolkata</span></footer></div></div>;
}
