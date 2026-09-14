'use client';
import {useEffect,useState} from 'react';
type Log={id:string;created_at:string;event_type:string;recipients:string[];status:string;provider_message:string};
export default function Notifications(){
 const [rows,setRows]=useState<Log[]>([]);const [message,setMessage]=useState('');
 async function load(){try{const r=await fetch('/api/notifications');const j=await r.json();if(!r.ok)throw new Error(j.message||'Unable to load notifications.');setRows(j.data||[]);setMessage('')}catch(e){setMessage(e instanceof Error?e.message:'Unable to load notifications.')}}
 useEffect(()=>{void load()},[]);
 return <div className="container"><div className="pageHead"><h1>Email notifications</h1><button className="btn" onClick={load}>Refresh</button></div><p className="muted">Latest 100 email attempts. Update recipients and SMTP credentials in Settings &amp; SMTP.</p>{message&&<p role="alert">{message}</p>}<div className="card tableWrap"><table><thead><tr><th>Time (IST)</th><th>Event</th><th>Recipients</th><th>Status</th><th>Message</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td><td>{r.event_type}</td><td>{r.recipients.join(', ')||'None configured'}</td><td>{r.status}</td><td>{r.provider_message}</td></tr>)}</tbody></table>{!rows.length&&<p>No notifications yet.</p>}</div></div>
}
