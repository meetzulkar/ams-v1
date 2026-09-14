'use client';
import {useState} from 'react';
export default function AttendancePhoto({src,alt}:{src:string;alt:string}){const [failed,setFailed]=useState(false);return failed?<p role="status" className="flowMessage">Photo unavailable. Refresh the page to retry or check the stored file.</p>:<a href={src} target="_blank" rel="noopener noreferrer" title="Open full photo"><img className="recordPhoto" src={src} alt={alt} onError={()=>setFailed(true)}/><span className="photoOpenHint">Open full photo ↗</span></a>}
