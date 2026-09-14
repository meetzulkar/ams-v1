const test=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');
function setup(auth=true){
 const exports={};let stored;let update;
 const storage={
  async getBucket(){return {data:{public:true}}},
  from(){return {
   async upload(path,bytes,options){stored={path,bytes,options};return {error:null}},
   getPublicUrl(path){return {data:{publicUrl:'https://example.com/company-assets/'+path}}},
   async remove(){return {error:null}}
  }}
 };
 const s={storage,from(){return {
  select(){return this},limit(){return this},
  async maybeSingle(){return {data:{id:'company'}}},
  update(value){update=value;return this},
  async eq(){return {error:null}}
 }}};
 const mocks={'@/lib/auth':{requireAdmin:async()=>({ok:auth})},'@/lib/supabase':{supabaseAdmin:()=>s}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/company/logo/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>mocks[n]||require(n),Buffer,File,crypto:require('node:crypto').webcrypto});
 return {
  async upload(bytes,type='image/png'){const form=new FormData();form.append('file',new Blob([bytes],{type}),'logo.png');return exports.POST(new Request('http://localhost/api/company/logo',{method:'POST',body:form}))},
  stored:()=>stored,update:()=>update
 };
}
test('logo upload requires administrator access',async()=>{assert.equal((await setup(false).upload('image')).status,401)});
test('invalid logo bytes are rejected before storage',async()=>{const s=setup();assert.equal((await s.upload('not a real PNG')).status,400);assert.equal(s.stored(),undefined)});
test('valid logo is saved separately and company settings reference its URL',async()=>{const s=setup();const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');const r=await s.upload(png);assert.equal(r.status,200);assert.equal(s.stored().options.contentType,'image/png');assert.match(s.update().logo_url,/company-assets\/logos\//);assert.equal((await r.json()).logoUrl,s.update().logo_url)});
