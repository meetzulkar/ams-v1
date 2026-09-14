'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
export default function CompanyBrand({href='/'}:{href?:string}){
 const [company,setCompany]=useState<{companyName:string;logoUrl:string|null}>({companyName:'Tumkur Concrete Spun Pipes',logoUrl:'/tumkur-concrete-logo-transparent.png'});const [failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;async function load(){try{const r=await fetch('/api/company');if(!r.ok)return;const data=await r.json();if(active){setCompany(data);setFailed(false)}}catch{}}void load();window.addEventListener('company-brand-updated',load);return()=>{active=false;window.removeEventListener('company-brand-updated',load)}},[]);
 return <Link className="brand companyBrand" href={href} title={company.companyName}>{company.logoUrl&&!failed?<img className="companyLogo" src={company.logoUrl} alt="Company logo" onError={()=>setFailed(true)}/>:<span className="brandIcon">a.</span>}<span className="companyBrandName">{company.companyName}</span></Link>;
}
