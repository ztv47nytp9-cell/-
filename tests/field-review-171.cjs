const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const p=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
 const root=path.resolve(__dirname,'..');await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort()});
 await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
 const checks=await p.evaluate(async()=>{
  const checks={},date=todayISO(),place=warehouses[0],alt=warehouses[1],mat=catalog[0];
  state.assetOps[place]={logs:[{id:'op',date,purpose:'순찰',memo:'needle'}],fuelLogs:[{date:'2026-10-02',memo:'new',amount:2},{date:'2026-10-01',memo:'old',amount:1}]};
  openOperationCorrectionPicker(place);const input=document.querySelector('#operationCorrectionSearch');input.value='needle';input.dispatchEvent(new Event('input'));const row=document.querySelector('[data-correct-operation]');checks.memo=!row.hidden;checks.mileage=row.textContent.includes('미기록');closeEntryModal();
  checks.fuel=vesselFuelRows(place).indexOf('new')<vesselFuelRows(place).indexOf('old');
  const rec={id:'a',date,title:'테스트',warehouse:place,flow:'이송',items:[],equipmentItems:[{id:'g',name:'펌프',qty:2,fromPlace:'실제출발',toPlace:'실제도착'}]};
  state.records=[rec];checks.legacy=recordRow(rec).includes('유형 미기록');const gear=csvRows('records')[1];checks.route=gear[7]==='실제출발'&&gear[8]==='실제도착';
  checks.header=csvRows('equipmentHistory')[0].includes('현재 보관장소');checks.vessel=!csvRows('vessel')[0].some(x=>x.includes('km'));
  state.stock[place][mat.name]=12;checks.stock=csvRows('inventory',{positiveOnly:true}).slice(1).every(r=>r[5]>0);
  historySearchQuery='no-match';checks.filtered=csvRows('records',{filtered:true}).length===1;
  globalSearchQuery=place+' '+mat.name;checks.search=globalSearchRows().some(x=>x.id===mat.name&&x.sub.includes('12'));
  const h={...rec,equipmentItems:[],status:'pending',flow:'사고',type:'사고'};
  state.records=[{...h,time:'08:00'},{...h,id:'b',stockReview:true,time:'10:00'},{...h,id:'c',date:''}];const report=handoverText(date);checks.undated=report.includes('날짜 확인 필요');checks.priority=report.indexOf('재고 확인 필요')<report.indexOf('진행 중 ·');checks.duplicates=report.includes('08:00')&&report.includes('10:00');
  checks.copy=recordReportText(h).includes('없음')&&!recordReportText(h,true).includes('없음');checks.sortLabel=groupToolbar('qty','materials').includes('단위별 수량순');
  setPage('history',{skipGuard:true});checks.pressed=!!document.querySelector('[data-hfilter][aria-pressed="true"]');
  state.equipment=[{id:'g',name:'중복장비',managementNo:'EQ-01',qty:2,place},{id:'other',name:'중복장비',managementNo:'EQ-02',qty:1,place}];globalSearchQuery='중복장비';checks.serial=globalSearchRows().filter(r=>r.kind==='equipment').every(r=>r.sub.includes('EQ-'));
  state.records=[{...rec,type:'작업',time:'08:00',id:'z'},{...rec,type:'작업',time:'10:00',id:'a'}];openEquipment('g',{push:false});checks.gearOrder=document.querySelector('[data-usage-record]').dataset.usageRecord==='a';
  state.records[0].equipmentItems=[...rec.equipmentItems,{...rec.equipmentItems[0]}];let message='';showFeedback=(_,m)=>message=m;downloadBlob=()=>{};openCsvExport();document.querySelector('#csvKind').value='records';document.querySelector('#exportCsv').click();checks.csvCount=message.includes('기록 2건 · 3행');closeEntryModal();
  const snapshot=JSON.parse(JSON.stringify(state));snapshot.records=[];readSafetyPoints=()=>[{id:'mock',state:snapshot,createdAt:new Date().toISOString(),label:'가상 복구'}];askConfirm=async(_,m)=>{message=m;return false};openSafetyPoints();document.querySelector('[data-safety-restore]').click();checks.restore=message.includes('현재 이력 2건 → 복구 후 0건');
  return checks;
 });for(const [key,value] of Object.entries(checks))assert.ok(value,key);console.log('PASS',Object.keys(checks).join(', '));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
