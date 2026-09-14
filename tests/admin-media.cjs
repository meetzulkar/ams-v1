const test=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');
function route(auth,data){
 let downloaded;const exports={};
 const s={
  from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data}}}},
  storage:{from(bucket){return {async download(path){downloaded={bucket,path};return {data:new Blob(['image'],{type:'image/jpeg'})}}}}}
 };
 const mocks={'@/lib/auth':{requireAdmin:async()=>({ok:auth})},'@/lib/supabase':{supabaseAdmin:()=>s}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/admin/media/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>mocks[n]||require(n),URL});
 return {get:query=>exports.GET(new Request('http://localhost/api/admin/media?'+query)),downloaded:()=>downloaded};
}
const id='123e4567-e89b-42d3-a456-426614174000';
test('private media rejects unauthenticated requests',async()=>{assert.equal((await route(false,{}).get('kind=attendance&id='+id+'&phase=check_in')).status,401)});
test('photo paths come from stored attendance, not caller-supplied path',async()=>{const r=route(true,{check_in_photo_path:'stored-photo.jpg'});const response=await r.get('kind=attendance&id='+id+'&phase=check_in&path=other-private-file');assert.equal(response.status,200);assert.equal(r.downloaded().path,'stored-photo.jpg');assert.equal(response.headers.get('cache-control'),'private, no-store')});
test('missing checkout photos and out-of-range documents return 404',async()=>{assert.equal((await route(true,{}).get('kind=attendance&id='+id+'&phase=check_out')).status,404);assert.equal((await route(true,{documents:[]}).get('kind=document&id='+id+'&index=10')).status,404)});
