const test=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
function load(file,imports){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>imports[n]||require(n),Buffer,crypto:require('node:crypto').webcrypto,console,process});return exports;}
const employeeId='123e4567-e89b-42d3-a456-426614174000';
function setup(existing,options={}){
 const writes=[];const emails=[];const removals=[];
 const s={storage:{from:()=>({upload:async()=>({error:null}),remove:async paths=>{removals.push(paths);return {error:null}}})},from(table){let op='read',payload;const chain={select(){return chain},eq(){return chain},is(){return chain},limit(){return chain},update(p){op='update';payload=p;return chain},insert(p){op='insert';payload=p;return chain},async maybeSingle(){return resolve()},async single(){return resolve()}};function resolve(){if(table==='employees')return {data:{id:employeeId,employee_id:'EMP01',full_name:'Test <Employee>'}};if(table==='company_settings')return {data:{late_after:'23:59',half_day_hours:9}};if(op==='read')return {data:existing};writes.push(payload);return options.race?{data:null,error:{code:'23505'}}:{data:{id:'attendance-1'}}}return chain}};
 const {recordAttendance}=load('lib/attendance.ts',{'./supabase':{supabaseAdmin:()=>s},'./time':load('lib/time.ts',{}),'./email':{sendAttendanceEmail:async(...args)=>{emails.push(args);return {status:options.emailStatus||'sent'}}}});
 const request=body=>new Request('http://localhost/api/attendance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 return {run:(mode,body={employeeId})=>recordAttendance(request(body),mode),writes,emails,removals};
}
const photo='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(200)]).toString('base64');
test('checkout requires same-day check-in',async()=>{const s=setup(null);assert.equal((await s.run('checkout')).status,400);assert.equal(s.writes.length,0)});
test('checkout saves without photo and leaves generated worked_minutes to database',async()=>{const s=setup({id:'a',check_in:new Date(Date.now()-3600000).toISOString(),status:'present'});const r=await s.run('checkout');assert.equal(r.status,200);assert.equal(s.writes[0].status,'half_day');assert.equal('worked_minutes' in s.writes[0],false);assert.equal(s.emails.length,1)});
test('duplicate checkout never writes or sends email',async()=>{const s=setup({check_in:'2026-01-01',check_out:'2026-01-01'});assert.equal((await s.run('checkout')).status,409);assert.equal(s.emails.length,0)});
test('checkin requires JPEG capture',async()=>{const s=setup(null);assert.equal((await s.run('checkin')).status,400);assert.equal((await s.run('checkin',{employeeId,photo:'data:image/jpeg;base64,YWJj'})).status,400)});
test('checkin stores photo and records attendance even when email fails',async()=>{const s=setup(null,{emailStatus:'failed'});const r=await s.run('checkin',{employeeId,photo});assert.equal(r.status,200);assert.equal((await r.json()).email.status,'failed');assert.ok(s.writes[0].check_in_photo_path);assert.equal(s.writes[0].status,'present');assert.match(s.emails[0][1],/&lt;Employee&gt;/)});
test('concurrent checkin cleans unused photo and does not send duplicate email',async()=>{const s=setup(null,{race:true});assert.equal((await s.run('checkin',{employeeId,photo})).status,409);assert.equal(s.removals.length,1);assert.equal(s.emails.length,0)});
test('checkout stores its own photo with its timestamp',async()=>{const s=setup({id:'a',check_in:new Date(Date.now()-3600000).toISOString(),status:'present'});const r=await s.run('checkout',{employeeId,photo});assert.equal(r.status,200);assert.match(s.writes[0].check_out_photo_path,/check-out-/);assert.ok(s.writes[0].check_out);assert.equal(s.emails.length,1)});
