// Diagnostic: observations are not release assertions. Synthetic data in a fresh profile only.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const p=await browser.newPage({serviceWorkers:'block'}),root=path.resolve(__dirname,'..');
 await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
 await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
 const obs=await p.evaluate(async()=>{
   const [a,b,c]=warehouses,it=catalog[0],obs={};
   const fence=totalStorageSummary().boom;state.stock[a]['앵커']=Number(state.stock[a]['앵커']||0)+3;obs.metresAddedByThreeAnchors=totalStorageSummary().boom-fence;
   state.equipment=[{id:"incoming",qty:1}];obs.incomingIssues=recordStockIssues({flow:"입고",equipmentItems:[{id:"incoming",qty:9}] ,items:[]});obs.negativeCsv=csvCell(-3);obs.setDecimal=mergeBundleRows([{name:'test',qty:.1},{name:'test',qty:.2}],'name')[0].qty;
   const gear={id:'qa',name:'장비',place:c,qty:3,maintenance:[],moves:[]};state.equipment=[gear];
   state.records=[{id:'using',flow:'출고',status:'done',warehouse:c,equipmentItems:[{id:'qa',qty:3}]}];
   selectedResources.clear();selectedResources.add('equipment:qa');askConfirm=async()=>true;createBulkSafetyPoint=()=>true;finishGuardedSafetyPoint=()=>{};const realSave=save;save=()=>false;
   const notes=[];showFeedback=(...args)=>notes.push(args);openBulkMove();document.querySelector('#bulkMoveFrom').value=a;document.querySelector('#bulkMoveTo').value=b;document.querySelector('#applyBulkMove').click();await new Promise(r=>setTimeout(r,30));
   obs.bulkMovedFromWrongPlace=gear.place===b;obs.outstandingAtMove=outstandingEquipmentRows('qa').length;obs.failedSaveDisplayed=notes.at(-1);obs.bulkTransferHistory=state.records.filter(r=>r.flow==='이송').length;
   selectedResources.clear();selectedResources.add('material:'+it.name);state.stock[a][it.name]=0;notes.length=0;openBulkMove();document.querySelector('#bulkMoveFrom').value=a;document.querySelector('#bulkMoveTo').value=b;document.querySelector('#applyBulkMove').click();await new Promise(r=>setTimeout(r,30));obs.emptyMove=notes.at(-1);
   const go=async(from,to)=>{openBulkMove();document.querySelector('#bulkMoveFrom').value=from;document.querySelector('#bulkMoveTo').value=to;document.querySelector('#applyBulkMove').click();await new Promise(r=>setTimeout(r,30));};
   selectedResources.clear();selectedResources.add('equipment:qa');await go(c,b);obs.inUseBlocked=state.equipment[0].place===c&&notes.at(-1)[0]==='error';
   state.records=[];selectedResources.add('material:'+it.name);state.stock[c][it.name]=5;
   const initial=JSON.stringify(state),disk=localStorage.getItem(KEY);await go(c,b);
   obs.rolledBack=JSON.stringify(state)===initial&&localStorage.getItem(KEY)===disk&&selectedResources.size===2&&notes.at(-1)[0]==='error';
   save=realSave;await go(c,b);obs.committed=state.equipment[0].place===b&&state.records.length===1&&state.records[0].flow==='이송'&&state.stock[c][it.name]===0&&JSON.parse(localStorage.getItem(KEY)).stock[b][it.name]===JSON.parse(initial).stock[b][it.name]+5;
   return obs;
 });const assert=require('node:assert/strict');assert.deepEqual(obs.incomingIssues,[]);assert.equal(obs.negativeCsv,'"-3"');assert.equal(obs.setDecimal,0.3);assert.equal(obs.metresAddedByThreeAnchors,0);assert.equal(obs.bulkMovedFromWrongPlace,false);assert.equal(obs.emptyMove[0],'error');for(const key of ['inUseBlocked','rolledBack','committed'])assert.ok(obs[key],key);console.log(obs);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
