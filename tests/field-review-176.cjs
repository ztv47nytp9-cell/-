const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const p=await browser.newPage({serviceWorkers:'block'}),root=path.resolve(__dirname,'..');
 await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
 await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
 const checks=await p.evaluate(async()=>{
  const [a,b]=warehouses,it=catalog[0],r={type:'사고',date:'2026-11-01',status:'done',appliedAt:'2026-11-02T16:00:00Z'};
  const historical=handoverPendingAt(r,'2026-11-02')&&!handoverPendingAt(r,'2026-11-03');
  state.stock[a][it.name]=50;state.stock[b][it.name]=2;
  setPage('register',{skipGuard:true});registerFlow='이송';renderRegister();document.getElementById('recWarehouse').value=a;syncTransferTarget();document.getElementById('recTargetWarehouse').value=b;
  draftItems=[3,7].map(q=>({...it,warehouse:a,qty:q}));renderItems();updateStockAfterPreview();
  const balances=document.querySelector('.transfer-balance')?.textContent.includes('50 → 40')&&document.querySelector('.transfer-balance')?.textContent.includes('2 → 12');
  const duplicate=warnDuplicateDraft()&&draftItems.length===2;
  const first=document.querySelector('[data-qty="0"]');first.focus();first.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));const next=document.activeElement.dataset.qty==='1';
  const remote=buildResourceSnapshot();remote.cloudRowId='old';remote.cloudRowVersion='old';const disk=localStorage.getItem(KEY),prior=JSON.stringify(state);
  askConfirm=async()=>true;cloudShareHead=async()=>({id:'other',updated_at:'new'});
  const guarded=await performApplySharedSnapshot(remote,'클라우드 공유자료')===false&&JSON.stringify(state)===prior&&localStorage.getItem(KEY)===disk;
  return {historical,balances,duplicate,next,guarded};
 });for(const [key,value] of Object.entries(checks)){assert.ok(value,key);console.log('PASS',key);}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
