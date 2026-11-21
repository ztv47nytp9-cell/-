const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const p=await browser.newPage({serviceWorkers:'block'}),root=path.resolve(__dirname,'..');
 await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
 await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
 const auto=await p.evaluate(()=>{
  const [a,b]=warehouses,it=catalog[0];state.records=[];for(const w of warehouses)state.stock[w][it.name]=0;
  state.stock[b][it.name]=2;registerMode='normal';registerFlow='출고';setPage('register',{skipGuard:true});
  const single=chooseIssueWarehouse({...it,warehouse:a}).warehouse===b;
  state.stock[a][it.name]=1;const multi=chooseIssueWarehouse({...it,warehouse:a}).needsPlace;
  const manual=chooseIssueWarehouse({...it,manualPlace:true,warehouse:a}).warehouse===a;
  state.records=[{id:'review',type:'작업',status:'pending',stockReview:true,flow:'출고',warehouse:a,items:[{...it,warehouse:a,qty:4}],equipmentItems:[]}];
  const wait=homeStockReviewHtml().includes('재고 확인 필요 1건');state.stock[a][it.name]=4;
  const ready=homeStockReviewHtml().includes('반영 가능 1건')&&state.records[0].status==='pending'&&state.stock[a][it.name]===4;
  state.records=[];state.stock[a][it.name]=0;state.stock[b][it.name]=0;save();return {single,multi,manual,wait,ready};
 });for(const [key,value] of Object.entries(auto))assert.ok(value,key);
 const read=()=>p.evaluate(()=>{const [a,b]=warehouses,n=catalog[0].name,s=JSON.parse(localStorage.getItem(KEY));return [s.stock[a][n],s.stock[b][n],s.records.length];});
 for(const [flow,qty,expected] of [['입고',10,[10,0,1]],['이송',4,[6,4,2]],['출고',2,[6,2,3]]]){
  await p.evaluate(({flow,qty})=>{const [a,b]=warehouses;registerMode='normal';registerFlow=flow;setPage('register',{skipGuard:true});const wh=flow==='출고'?b:a;
   document.querySelector('#recWarehouse').value=wh;if(flow==='이송'){syncTransferTarget();document.querySelector('#recTargetWarehouse').value=b;}else document.querySelector('#recType').value='작업';
   document.querySelector('#recTitle').value='QA '+flow;draftItems=[{...catalog[0],qty,warehouse:wh}];draftEquipmentItems=[];renderItems();
  },{flow,qty});await p.click('#saveRecord');await p.waitForFunction(n=>state.records.length===n,expected[2]);assert.deepEqual(await read(),expected);
 }
 await p.click('#undoSnack');await p.waitForFunction(()=>state.records.length===2);assert.deepEqual(await read(),[6,4,2]);console.log('PASS 보류 자동 재평가·창고 선택·입고 → 이송 → 출고 → 취소');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
