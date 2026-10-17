/* Isolated layout and delayed-response regression tests. No live cloud writes. */
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../outputs/victor-ui-fixed');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync(out,{recursive:true});
 const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];let checks=0;
 try{
 for(const [width,height] of [[320,568],[360,780],[390,844],[430,932],[768,1024],[1280,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<600,isMobile:width<600,serviceWorkers:'block'});
  await context.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);await page.waitForFunction(()=>getComputedStyle(document.getElementById('splash')).opacity==='0');
  const reachable=async(selector)=>{
   const result=await page.locator(selector).evaluate(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,width:innerWidth,height:innerHeight,hit:hit===e||e.contains(hit),hitName:hit?.id||hit?.className};});
   assert.ok(result.top>=-1&&result.bottom<=height+1&&result.left>=-1&&result.right<=width+1&&result.hit,`${width} ${selector}: ${JSON.stringify(result)}`);checks++;
  };
  const screenshot=async(name)=>{if(width===390||width===320&&name.includes('share'))await page.screenshot({path:path.join(out,`${width}-${name}.png`)});};
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>{clearRegisterDraft();registerFormDraft=null;pendingFormBaseline='';pendingFormRecordId='';draftItems=[];draftEquipmentItems=[];setPage('home',{skipGuard:true});applyThemeMode(theme);},theme);
   await reachable('#homeQuickOut');await reachable('#homeQuickIn');await screenshot('home-'+theme);
   await page.evaluate(()=>setPage('warehouse',{skipGuard:true}));
   const tabs=await page.locator('.storage-view-switch').evaluate(e=>({columns:getComputedStyle(e).gridTemplateColumns.split(' ').length,buttons:e.querySelectorAll('button').length}));assert.equal(tabs.columns,3);assert.equal(tabs.buttons,3);checks++;
   await screenshot('warehouse-'+theme);
   if(width>=720){const nav=await page.locator('.bottom').boundingBox(),content=await page.locator('#view').boundingBox();assert.ok(Math.abs(nav.width-content.width)<=1&&Math.abs(nav.x-content.x)<=1,JSON.stringify({nav,content}));checks++;}
   await page.evaluate(()=>{registerMode='normal';registerFlow='입고';setPage('register',{skipGuard:true});document.getElementById('recType').value='작업';document.getElementById('recType').dispatchEvent(new Event('change'));draftItems=[{...catalog[0],qty:1,warehouse:warehouses[0]}];renderItems();});
   const flows=await page.locator('.flow-btn').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert.equal(new Set(flows).size,1);checks++;
   await screenshot('register-'+theme);
   for(const offset of [0,80,250]){
    await page.evaluate(offset=>scrollTo(0,document.documentElement.scrollHeight-innerHeight-offset),offset);await page.waitForTimeout(80);
    await reachable('#saveRecord');const save=await page.locator('#saveRecord').boundingBox(),nav=await page.locator('.bottom').boundingBox();assert.ok(save.y+save.height<=nav.y-4,JSON.stringify({width,offset,save,nav}));checks++;
    assert.equal(await page.locator('.top').evaluate(e=>getComputedStyle(e).position),'relative');assert.ok((await page.locator('.top').boundingBox()).y<=1);checks++;
   }
   await screenshot('save-'+theme);
   await page.evaluate(()=>{clearRegisterDraft();registerFormDraft=null;draftItems=[];draftEquipmentItems=[];historyFiltersOpen=false;setPage('history',{skipGuard:true});});
   assert.equal(await page.locator('#historyFilters').evaluate(e=>e.open),false);await reachable('#histSearch');await screenshot('history-'+theme);checks++;
   await page.click('#historyFilters > summary');await page.selectOption('#historyPlaceFilter',await page.evaluate(()=>warehouses[0]));assert.equal(await page.locator('#historyFilters').evaluate(e=>e.open),true);checks++;
   await page.evaluate(()=>{
    state.catalog[0].updatedAt='2026-10-07T09:00:00Z';window.uiSnapshot=buildResourceSnapshot();window.uiSnapshot.cloudUpdatedAt='2026-10-07T10:00:00Z';
    localStorage.setItem(CLOUD_SHARE_META_KEY,JSON.stringify({lastAppliedAt:'2026-09-01T10:00:00Z'}));createCloudApplySafetyPoint(window.uiSnapshot);
    openEntryModal(cloudDashboardHtml(window.uiSnapshot));bindCloudDashboard();
   });
   await reachable('#cloudApplyNow');await reachable('#cloudUploadNow');await screenshot('share-'+theme);
   assert.equal(await page.locator('#cloudPinNow').isVisible(),false);assert.match(await page.locator('.share-time-note').textContent(),/마지막 가져옴/);checks++;
   await page.click('.cloud-detail-fold > summary');await page.evaluate(()=>{const d=document.getElementById('entryDialog');d.scrollTop=d.scrollHeight;});
   await reachable('#closeEntryModal');await reachable('#cloudSettingsNow');await screenshot('share-detail-'+theme);
   await page.click('#cloudSettingsNow');assert.ok((await page.locator('#cloudShareUrl').inputValue()).startsWith('https://'));await page.evaluate(()=>{const d=document.getElementById('entryDialog');d.scrollTop=d.scrollHeight;});await reachable('#closeEntryModal');await reachable('#saveCloudShareSettings');checks++;
   await page.evaluate(()=>closeEntryModal());
  }
  // Deferred fetch never contacts Supabase: exercise close, input and request-order guards.
  await page.evaluate(()=>{window.realCloudFetch=fetchLatestCloudShareSnapshot;window.cloudQueue=[];fetchLatestCloudShareSnapshot=()=>new Promise((resolve,reject)=>window.cloudQueue.push({resolve,reject}));openCloudShareActions();});
  assert.equal(await page.locator('#cloudApplyNow').isDisabled(),true);assert.equal(await page.locator('#cloudUploadNow').isDisabled(),true);checks++;
  await page.evaluate(()=>openUploadPinSettings());await page.fill('#newUploadPin','1234');await page.evaluate(()=>window.cloudQueue.shift().resolve(window.uiSnapshot));await page.waitForTimeout(80);assert.equal(await page.locator('#newUploadPin').inputValue(),'1234');checks++;
  await page.click('#cloudSettingsBack');await page.click('#cancelConfirm');assert.equal(await page.locator('#newUploadPin').inputValue(),'1234');checks++;
  await page.click('#cloudSettingsBack');await page.click('#acceptConfirm');await page.evaluate(()=>window.cloudQueue.shift().resolve(window.uiSnapshot));await page.waitForTimeout(80);assert.equal(await page.locator('#cloudApplyNow').count(),1);checks++;
  await page.evaluate(()=>{openCloudShareActions();closeEntryModal();window.cloudQueue.shift().resolve(window.uiSnapshot);});await page.waitForTimeout(80);assert.equal(await page.locator('#entryModal').evaluate(e=>e.classList.contains('show')),false);checks++;
  await page.evaluate(()=>{openCloudShareActions();openCloudShareSettings();document.getElementById('cloudShareTitle').value='입력 유지';window.cloudQueue.shift().reject(new Error('Network failed'));});await page.waitForTimeout(80);assert.equal(await page.locator('#cloudShareTitle').inputValue(),'입력 유지');checks++;
  await page.evaluate(()=>{closeEntryModal();openCloudShareActions();openCloudShareActions();const next={...window.uiSnapshot,title:'새 요청 자료',cloudUpdatedAt:'2026-10-07T11:00:00Z'};window.cloudQueue[1].resolve(next);});await page.waitForTimeout(80);
  await page.evaluate(()=>window.cloudQueue[0].resolve({...window.uiSnapshot,title:'이전 요청 자료'}));await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>cloudShareNotice.snapshot.title),'새 요청 자료');checks++;
  await page.evaluate(()=>{window.cloudQueue=[];document.querySelector('.cloud-detail-fold').open=true;document.getElementById('entryDialog').scrollTop=150;refreshCloudShareWithPopup();});assert.equal(await page.locator('.cloud-detail-fold').evaluate(e=>e.open),true);
  await page.evaluate(()=>window.cloudQueue.shift().resolve(window.uiSnapshot));await page.waitForTimeout(100);assert.equal(await page.locator('.cloud-detail-fold').evaluate(e=>e.open),true);checks++;
  await page.evaluate(()=>{closeEntryModal();openEntryModal(cloudDashboardHtml(null,{error:'네트워크 확인 실패'}));});assert.match(await page.locator('.share-mini-summary').textContent(),/미확인/);assert.doesNotMatch(await page.locator('.share-mini-summary').textContent(),/공유자료 없음/);assert.equal(await page.locator('#cloudApplyNow').isDisabled(),true);checks++;
  await page.evaluate(()=>{closeEntryModal();fetchLatestCloudShareSnapshot=window.realCloudFetch;});
  console.log(`PASS layout + share response guards ${width}x${height}`);await context.close();
 }
 assert.deepEqual(errors,[]);console.log(`PASS ${checks} layout/interaction assertions, no runtime errors`);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
