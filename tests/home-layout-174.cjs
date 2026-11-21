const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const p=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
 const root=path.resolve(__dirname,'..');await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort()});
 await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
 await p.evaluate(()=>{state.equipment=Array.from({length:19},(_,i)=>({id:'qa'+i,name:'가상장비'+i,qty:1}));renderHome();});
 const search=p.locator('#globalSearch'),rows=p.locator('[data-global-kind]');
 await search.fill('가상장비');assert.equal(await rows.count(),8);
 await p.click('#toggleGlobalSearchResults');assert.equal(await rows.count(),16);
 await p.click('#toggleGlobalSearchResults');assert.equal(await rows.count(),19);
 await search.fill('가상장비18');assert.equal(await rows.count(),1);
 await search.dispatchEvent('keydown',{key:'Enter',isComposing:true});assert.equal(await p.evaluate(()=>page),'home');
 await search.fill('');assert.equal(await p.locator('#globalSearchResults').innerText(),'');
 await p.locator('#homeToolsFold summary').click();await p.waitForFunction(()=>sessionStorage.getItem('victor.home.tools.open')==='1');
 await p.evaluate(()=>{setPage('history',{skipGuard:true});setPage('home',{skipGuard:true});});assert.equal(await p.locator('#homeToolsFold').evaluate(e=>e.open),true);
 for(const width of [320,390,820])for(const theme of ['light','dark']){
  await p.setViewportSize({width,height:820});await p.evaluate(theme=>{state.records=[];globalSearchQuery='';applyThemeMode(theme);setPage('home',{skipGuard:true});},theme);
  assert.equal(await p.locator('.home-attention').count(),0);assert.equal(await p.locator('.home-inventory #globalSearch').count(),1);
  const share=await p.locator('#homeShareResources').boundingBox();assert.ok(share.height>=44&&share.width>=width*.7);
  await p.locator('#homeActivityFold summary').click();await p.click('#homeActivityMemo');assert.equal(await p.locator('#homeActivityFold').evaluate(e=>e.open),true);
  await p.evaluate(()=>{state.records=[{id:'pending',title:'테스트',type:'사고',flow:'사고',status:'pending',date:todayISO(),items:[],equipmentItems:[]}];renderHome();});
  assert.equal(await p.locator('.home-attention #homePendingList').count(),1);await p.click('#homePendingList');assert.equal(await p.evaluate(()=>page),'history');console.log('PASS',width,theme);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
