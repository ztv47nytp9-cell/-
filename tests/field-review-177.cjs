// Current production app, synthetic state and local assets only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const p=await browser.newPage({serviceWorkers:'block'}),root=path.resolve(__dirname,'..');
 await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
 await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
 const results=await p.evaluate(()=>{
  const out=[],check=(s,v)=>out.push([s,!!v]),[a,b]=warehouses,it=catalog[0],saved=JSON.stringify(state.stock);
  setPage('register',{skipGuard:true});registerFlow='출고';draftItems=[{...it,qty:'',warehouse:a}];renderRegister();renderItems();
  const q=document.querySelector('[data-qty]'),type=v=>{q.value=v;q.dispatchEvent(new Event('input',{bubbles:true}));};
  for(const v of ['-2','-0.5','1e2','1E2','5e-2']){type(v);check('reject '+v,q.validity.customError&&draftItems[0].qty==='');}
  for(const v of ['0','1','2','0.01','0.25','12','123.75','0.001','999','']){type(v);check('preserve '+v,!q.validity.customError&&draftItems[0].qty===(v===''?'':Number(v)));}
  for(const v of [0,.01,.001,.00001,.123456,12.25,1024.375])check('display '+v,Number(qtyText(v,'kg').split(' ')[0].replaceAll(',',''))===v);
  for(const sep of ['|','|||',' · ','/',':']){
    draftItems=[{name:'A'+sep+'B',warehouse:'C',qty:2},{name:'A',warehouse:'B'+sep+'C',qty:5}];
    check('draft keys '+sep,mergeDuplicateDraftItems({preview:true}).length===2);
    const w='A'+sep+'B',n='B'+sep+'C',m=materialQtyMap({warehouses:['A',w],catalog:[{name:n},{name:'C'}],stock:{A:{[n]:5},[w]:{C:2}}});
    check('share keys '+sep,m.size===4);
  }
  draftItems=[{name:'A',warehouse:a,qty:.1},{name:'A',warehouse:a,qty:.2}];
  check('merge decimal',mergeDuplicateDraftItems({preview:true})[0].qty===.3);check('preserve rows',draftItems.length===2);
  check('detect old ambiguous survey',ambiguousSurvey([{warehouse:'A|B',name:'C'},{warehouse:'A',name:'B|C'}]));
  check('normal survey',!ambiguousSurvey([{warehouse:a,name:it.name},{warehouse:b,name:it.name}]));
  const noFuel=assetPeriodSummary([{kind:'운항',log:{}}]);check('unknown fuel',noFuel.includes('소모 미기록'));check('unknown distance',noFuel.includes('운항 미기록'));
  check('explicit zero',assetPeriodSummary([{kind:'운항',log:{fuel:0}}]).includes('소모 0L'));
  check('partial fuel',assetPeriodSummary([{kind:'운항',log:{fuel:2}},{kind:'운항',log:{}}]).includes('2L (일부 미기록)'));
  check('stock untouched',saved===JSON.stringify(state.stock));return out;});
 for(const [s,ok] of results)assert.ok(ok,s);console.log('PASS',results.length,'boundary checks');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
