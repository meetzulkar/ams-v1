'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';

type Form={employee_id:string;full_name:string;mobile:string;emergency_phone:string;email:string;gender:string;date_of_birth:string;department:string;designation:string;date_of_joining:string;shift_start:string;shift_end:string;standard_hours:string};
type Employee=Omit<Form,'standard_hours'> & {id:string;standard_hours:number;status:string};
const blank:Form={employee_id:'',full_name:'',mobile:'',emergency_phone:'',email:'',gender:'',date_of_birth:'',department:'',designation:'',date_of_joining:'',shift_start:'09:00',shift_end:'18:00',standard_hours:'9'};
const fields: Array<{key:keyof Form;label:string;type:string}>=[
 {key:'employee_id',label:'Employee ID',type:'text'},
 {key:'full_name',label:'Full name',type:'text'},
 {key:'mobile',label:'Mobile number',type:'tel'},
 {key:'emergency_phone',label:'Emergency number',type:'tel'},
 {key:'email',label:'Email (optional)',type:'email'},
 {key:'gender',label:'Gender',type:'text'},
 {key:'date_of_birth',label:'Date of birth',type:'date'},
 {key:'department',label:'Department',type:'text'},
 {key:'designation',label:'Designation',type:'text'},
 {key:'date_of_joining',label:'Date of joining',type:'date'},
 {key:'shift_start',label:'Shift start',type:'time'},
 {key:'shift_end',label:'Shift end',type:'time'},
 {key:'standard_hours',label:'Total hours',type:'number'},
];
export default function Employees(){
 const [rows,setRows]=useState<Employee[]>([]),[form,setForm]=useState<Form>(blank),[editId,setEditId]=useState<string|null>(null),[query,setQuery]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const formRef=useRef<HTMLFormElement>(null);
 async function load(){try{const r=await fetch('/api/employees/admin');const data=await r.json();if(!r.ok)throw new Error(data.message||data.error?.message||'Unable to load employees.');setRows(data.data||[])}catch(e){setMessage(e instanceof Error?e.message:'Unable to load employees.')}}
 useEffect(()=>{void load()},[]);
 function reset(){setForm({...blank});setEditId(null);setMessage('');formRef.current?.scrollIntoView({block:'start'});formRef.current?.querySelector('input')?.focus({preventScroll:true})}
 function edit(employee:Employee){const next={...blank};for(const key of Object.keys(blank) as (keyof Form)[])next[key]=String(employee[key]??'');next.shift_start=next.shift_start.slice(0,5);next.shift_end=next.shift_end.slice(0,5);setForm(next);setEditId(employee.id);setMessage('');formRef.current?.scrollIntoView({block:'start'});formRef.current?.querySelector('input')?.focus({preventScroll:true})}
 async function save(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{const r=await fetch('/api/employees/admin',{method:editId?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,standard_hours:Number(form.standard_hours),...(editId?{id:editId}:{})})});const data=await r.json();if(!r.ok)throw new Error(data.message||data.error?.message||'Unable to save employee.');setForm({...blank});setEditId(null);setMessage('Employee saved.');await load()}catch(e){setMessage(e instanceof Error?e.message:'Unable to save employee.')}finally{setBusy(false)}}
 async function remove(id:string){if(!confirm('Delete this employee?'))return;try{const r=await fetch('/api/employees/admin?id='+encodeURIComponent(id),{method:'DELETE'});const data=await r.json();if(!r.ok)throw new Error(data.error?.message||'Unable to delete employee.');await load()}catch(e){setMessage(e instanceof Error?e.message:'Unable to delete employee.')}}
 const filtered=rows.filter(x=>[x.full_name,x.employee_id,x.mobile,x.department].join(' ').toLowerCase().includes(query.toLowerCase()));
 return <div className="container"><div className="pageHead"><div><h1>Employees</h1><p className="muted">Manage employee details, contact numbers and shift timings.</p></div><button className="btn primary" disabled={busy} onClick={reset}>+ New employee</button></div><div className="card"><input className="input" aria-label="Search employees" placeholder="Search name, ID, mobile or department" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="grid grid2" style={{marginTop:20}}><form ref={formRef} className="card formGrid" style={{scrollMarginTop:90}} onSubmit={save}><h2>{editId?'Edit employee':'Add employee'}</h2><p className="muted" style={{margin:0}}>All fields are required except email.</p>{fields.map(({key,label,type})=><label key={key}>{label}{key!=='email'&&<span aria-hidden="true"> *</span>}{key==='gender'?<select className="input" name={key} required value={form.gender} onChange={e=>setForm(prev=>({...prev,gender:e.target.value}))}><option value="" disabled>Select gender</option>{['Male','Female','Others'].map(value=><option key={value}>{value}</option>)}{form.gender&&!['Male','Female','Others'].includes(form.gender)&&<option>{form.gender}</option>}</select>:<input className="input" list={key==='department'||key==='designation'?key+'-options':undefined} name={key} type={type} required={key!=='email'} value={form[key]} min={type==='number'?'0.01':undefined} max={type==='number'?'24':undefined} step={type==='number'?'0.01':undefined} onChange={e=>setForm(prev=>({...prev,[key]:e.target.value}))}/>}</label>)}{(['department','designation'] as const).map(key=><datalist id={key+'-options'} key={key}>{Array.from(new Set(rows.map(row=>row[key]).filter(Boolean))).sort().map(value=><option value={value} key={value}/>)}</datalist>)}<button className="btn primary" type="submit" disabled={busy}>{busy?'Saving…':editId?'Update employee':'Create employee'}</button>{message&&<p role="status">{message}</p>}</form><div className="card"><div className="sectionHeading"><h2>Employee directory</h2><span className="countBadge">{filtered.length} employees</span></div><div className="tableWrap"><table><thead><tr><th>Name</th><th>ID</th><th>Mobile</th><th>Department</th><th>Joining</th><th>Actions</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id}><td>{x.full_name}</td><td>{x.employee_id}</td><td>{x.mobile}</td><td>{x.department||'—'}</td><td>{x.date_of_joining||'—'}</td><td><Link className="btn small" href={'/admin/employees/'+x.id}>View</Link> <button className="btn small" disabled={busy} onClick={()=>edit(x)}>Edit</button> <button className="btn small danger" disabled={busy} onClick={()=>remove(x.id)}>Delete</button></td></tr>)}</tbody></table>{!filtered.length&&<p>No matching employees.</p>}</div></div></div></div>;
}
