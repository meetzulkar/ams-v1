'use client';
import {useEffect,useState} from 'react';
import {Building2} from 'lucide-react';
import {TZ} from '@/lib/time';
const clockFormat=new Intl.DateTimeFormat('en-IN',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
const dateFormat=new Intl.DateTimeFormat('en-IN',{timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric'});
export default function HomeIdentity(){
 const [company,setCompany]=useState({companyName:'Tumkur Concrete Spun Pipes',logoUrl:'/tumkur-concrete-logo-transparent.png' as string|null});
 const [failed,setFailed]=useState(false);
 const [now,setNow]=useState<Date|null>(null);
 useEffect(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{const controller=new AbortController();async function load(){try{const r=await fetch('/api/company',{signal:controller.signal});if(!r.ok)return;const data=await r.json();if(!controller.signal.aborted){setCompany(data);setFailed(false)}}catch{}}void load();window.addEventListener('company-brand-updated',load);return()=>{controller.abort();window.removeEventListener('company-brand-updated',load)}},[]);
 return <div className="homeIdentity"><div className="homeLogoFrame">{company.logoUrl&&!failed?<img className="homeCompanyLogo" src={company.logoUrl} alt={`${company.companyName} logo`} onError={()=>setFailed(true)}/>:<Building2 className="homeLogoFallback" aria-hidden="true"/>}</div><div className="homeLiveClock"><span className="eyebrow"><span className="onlineDot"/> LIVE · INDIA STANDARD TIME</span><time dateTime={now?.toISOString()} className="homeClockTime">{now?clockFormat.format(now):'--:--:--'}</time><p className="homeClockDate">{now?dateFormat.format(now):'Loading today’s date…'}</p></div></div>;
}
