const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const p=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
 const root=path.resolve(__dirname,'..');await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort()});
 await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
 const checks=await p.evaluate(async()=>{
  const checks={},gear={name:'fixture-pump',id:'fixture',qty:null,place:warehouses[0],cat:equipmentCategories[0]};
  state.equipment=[gear,{...gear,name:'fixture-zero',id:'z',qty:0},{...gear,name:'fixture-old',archived:true,id:'old',qty:0}];globalSearchQuery='fixture';
  const matches=globalSearchRows();checks.unknown=matches.find(x=>x.id==='fixture').sub.includes('미확인');checks.archived=!matches.some(x=>x.id==='old');
  const material=catalog[0];globalSearchQuery=material.name;state.stock[warehouses[0]][material.name]=1;checks.place=globalSearchRows().find(x=>x.id===material.name).sub.includes(placeLabel(warehouses[0]));
  historyFlowFilter='출고';checks.flow=historyFlowMatches({flow:'사고',pendingFlow:'출고'});checks.date=historyDateGroups([{date:''}])[0].date==='';
  const mixed=summarizeItems([{name:'A',qty:1},{name:'B',qty:1}],[{name:'장비C',qty:1}],'출고');checks.mixed=mixed.includes('A')&&mixed.includes('장비C')&&mixed.includes('외 1건');
  checks.time=compareRecordTime({date:'2026-01-01',time:'12:00',id:'a'},{date:'2026-01-01',time:'08:00',id:'z'})<0;
  equipmentSortMode='qty';openStorageView('equipment');checks.gearSort=[...document.querySelectorAll('[data-all-equipment]')].map(x=>x.dataset.allEquipment).join(',')==='z,fixture';
  const today=todayISO();state.records=[{id:'loan',items:[],status:'done',type:'작업',flow:'출고',title:'대여',date:today,equipmentItems:[{name:'장비C',qty:3,returnedQty:2,place:'반납창고'}]}];checks.handover=handoverText(today).includes('1대 · 반납창고');
  setPage('home',{skipGuard:true});await new Promise(resolve=>setTimeout(resolve,50));document.getElementById('handoverReport').click();const input=document.getElementById('shiftDate');input.value='';input.dispatchEvent(new Event('input'));checks.copy=document.getElementById('shiftCopy').disabled;
  closeEntryModal();catalog=[{name:'mass',unit:'kg',cat:cats[0]},{name:'metre',unit:'m',cat:cats[0]},{name:'more mass',unit:'kg',cat:cats[0]}];
  materialSortMode='qty';allResourceWarehouse=warehouses[0];Object.assign(state.stock[warehouses[0]],{mass:1,metre:50,'more mass':100});
  openStorageView('materials');checks.unitSort=[...document.querySelectorAll('[data-all-material]')].map(x=>x.dataset.allMaterial).join('|')==='more mass|mass|metre';
  window.readSafetyPoints=()=>[{id:'p',label:'test',createdAt:'2026-11-21T16:30:45Z',state:{records:[]}}];let filename;downloadBlob=(_,name)=>{filename=name};openSafetyPoints();document.querySelector('[data-safety-download]').click();checks.filename=filename==='victor_20261122_013045.json';
  return checks;
 });for(const [key,value] of Object.entries(checks))assert.ok(value,key);console.log('PASS',Object.keys(checks).join(', '));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
