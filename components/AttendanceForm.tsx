'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {istDateTime,hoursLabel} from '@/lib/time';

type Employee = {id:string;employee_id:string;full_name:string;department?:string;designation?:string};
type Today = {check_in?:string;check_out?:string;worked_minutes?:number};
export default function AttendanceForm({mode,employeeId,stage='search'}:{mode:'checkin'|'checkout';employeeId?:string;stage?:'search'|'details'|'capture'}) {
  const router=useRouter();
  const [query,setQuery]=useState('');
  const [matches,setMatches]=useState<Employee[]>([]);
  const [employee,setEmployee]=useState<Employee|null>(null);
  const [today,setToday]=useState<Today|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [searching,setSearching]=useState(false);
  const [photo,setPhoto]=useState('');
  const [ready,setReady]=useState(false);
  const [cameraAttempt,setCameraAttempt]=useState(0);
  const [result,setResult]=useState<{message:string;email?:{status:string}}|null>(null);
  const video=useRef<HTMLVideoElement>(null);
  const submitting=useRef(false);
  const label=mode==='checkin'?'Check In':'Check Out';
  useEffect(()=>{
    if(stage!=='search') return;
    const controller=new AbortController();
    setMatches([]);setMessage('');setSearching(query.trim().length>=2);
    if(query.trim().length<2) return;
    const timer=setTimeout(async()=>{
      try {
        const r=await fetch('/api/employees?query='+encodeURIComponent(query.trim()),{signal:controller.signal});
        const data=await r.json();
        if(!r.ok) throw new Error(data.message);
        setMatches(data.employees);if(!data.employees.length)setMessage('No matching employee. Check the ID or mobile number.');
      } catch(e) {if(!controller.signal.aborted)setMessage(e instanceof Error?e.message:'Search failed.');}
      finally {if(!controller.signal.aborted)setSearching(false);}
    },300);
    return ()=>{clearTimeout(timer);controller.abort()};
  },[query,stage]);
  useEffect(()=>{
    if(!employeeId)return;
    const controller=new AbortController();
    setBusy(true);
    fetch('/api/employees?id='+encodeURIComponent(employeeId),{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.message);setEmployee(data.employee);setToday(data.today)}).catch(e=>{if(!controller.signal.aborted)setMessage(e.message)}).finally(()=>{if(!controller.signal.aborted)setBusy(false)});
    return ()=>controller.abort();
  },[employeeId]);
  const blocked=!!today?.check_out || (mode==='checkin'?!!today?.check_in:!today?.check_in);
  useEffect(()=>{
    if(stage!=='capture'||!employee||blocked||photo||result)return;
    let cancelled=false;let stream:MediaStream|undefined;
    setReady(false);
    if(!navigator.mediaDevices?.getUserMedia){setMessage('Open this page over HTTPS (or localhost) to use your camera.');return;}
    navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280}},audio:false}).then(s=>{if(cancelled){s.getTracks().forEach(t=>t.stop());return}stream=s;if(video.current)video.current.srcObject=s}).catch(()=>{if(!cancelled)setMessage('Camera unavailable. Allow camera permission and tap Retry camera.');});
    return ()=>{cancelled=true;stream?.getTracks().forEach(t=>t.stop())};
  },[stage,employee,blocked,photo,result,cameraAttempt]);
  function capture(){
    if(!video.current||!ready)return;
    const canvas=document.createElement('canvas');
    canvas.width=video.current.videoWidth;canvas.height=video.current.videoHeight;
    const context=canvas.getContext('2d');if(!context||!canvas.width)return;
    context.drawImage(video.current,0,0);setPhoto(canvas.toDataURL('image/jpeg',0.85));setMessage('');
  }
  async function submit(){
    if(submitting.current||!employee||blocked||!photo)return;
    submitting.current=true;setBusy(true);setMessage('');
    try {const r=await fetch('/api/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:employee.id,...(photo?{photo}:{})})});const data=await r.json();if(!r.ok)throw new Error(data.message);setResult(data);}
    catch(e){setMessage(e instanceof Error?e.message:'Unable to save attendance. Please try again.');}
    finally{submitting.current=false;setBusy(false)}
  }
  if(result)return <section className="card attendanceFlow"><span className="statusPill ready">Attendance saved</span><h1 style={{marginTop:24}}>{label} complete</h1><p>{employee?.full_name} · {employee?.employee_id}</p><p>{result.message}</p><p className="muted">{result.email?.status==='sent'?'Email notification sent.':'Attendance is saved. Email was not sent; the administrator can check notification logs and SMTP settings.'}</p><Link className="btn primary" href="/">Back to home</Link></section>;
  return <section className="card attendanceFlow"><p className="muted">{label} · Step {stage==='search'?1:stage==='details'?2:3} of 3</p><h1>{stage==='search'?'Find your profile':stage==='details'?'Confirm your details':'Take a live photo'}</h1>
    {stage==='search'?<><p className="muted">Enter the first 2 or more characters of your employee ID or mobile number, then select your profile.</p><label htmlFor="employee-search">Employee ID or mobile number</label><input autoFocus id="employee-search" className="input" autoComplete="off" value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. EMP01 or 98" maxLength={64}/>{searching&&<p role="status">Searching…</p>}<div className="employeeMatches">{matches.map(e=><button className="employeeMatch" key={e.id} onClick={()=>{setQuery(e.employee_id);router.push('/'+mode+'/'+e.id)}}><strong>{e.full_name}</strong><span>{e.employee_id} · {e.department||'Employee'} →</span></button>)}</div><Link href="/">Back to home</Link></>:<>
    {busy&&!employee&&<p>Loading employee…</p>}
    {employee&&<><div className="employeeDetails"><h2>{employee.full_name}</h2><dl><dt>Employee ID</dt><dd>{employee.employee_id}</dd><dt>Department</dt><dd>{employee.department||'—'}</dd><dt>Designation</dt><dd>{employee.designation||'—'}</dd><dt>Today’s check-in</dt><dd>{today?.check_in?istDateTime(today.check_in):'Not checked in'}</dd>{today?.check_out&&<><dt>Check-out</dt><dd>{istDateTime(today.check_out)} · {hoursLabel(today.worked_minutes)}</dd></>}</dl></div>
    {blocked?<p role="status">{today?.check_out?'You have already checked out today.':mode==='checkin'?'You are already checked in today.':'Check in first before recording a checkout.'}</p>:stage==='details'?<button className="btn primary" disabled={busy} onClick={()=>router.push('/'+mode+'/'+employee.id+'/capture')}>{busy?'Saving…':'Confirm details →'}</button>:<><p className="muted">Keep your face in the frame. Your photo will be saved with your attendance.</p>{photo?<img className="attendanceCamera" src={photo} alt="Your captured attendance photo"/>:<video className="attendanceCamera" ref={video} autoPlay muted playsInline onLoadedData={()=>setReady(true)}/>}<div className="inline" style={{marginTop:20}}>{photo?<><button className="btn" disabled={busy} onClick={()=>{setPhoto('');setMessage('')}}>Retake photo</button><button className="btn primary" disabled={busy} onClick={submit}>{busy?'Saving attendance…':label}</button></>:<><button className="btn primary" disabled={!ready} onClick={capture}>Capture photo</button><button className="btn" onClick={()=>{setMessage('');setCameraAttempt(x=>x+1)}}>Retry camera</button></>}</div></>}
    </>}
    {!busy&&<p><Link href={'/'+mode}>Choose another employee</Link></p>}</>}
    {message&&<p role="alert" className="flowMessage">{message}</p>}
  </section>;
}
