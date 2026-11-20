// Local app assets and synthetic data only.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const p=await browser.newPage({serviceWorkers:'block'});
  await p.route('**/*',r=>{const u=new URL(r.request().url()),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&file.startsWith(root+path.sep)&&fs.existsSync(file)?r.fulfill({path:file}):r.abort();});
  await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
  for(const width of [320,390,768])for(const theme of ['light','dark']){
   await p.setViewportSize({width,height:844});
   const result=await p.evaluate(theme=>{
    applyThemeMode(theme);const snapshot=buildResourceSnapshot(),resource=snapshot.resourceState;
    Object.assign(snapshot,{cloudScope:'mock',cloudRowId:'1',cloudRowVersion:'1'});
    const base=shareBaseline(snapshot,resource);saveCloudShareMeta({shareBase:base});
    const same=cloudStatusLabel(snapshot);renderCloudDashboard(snapshot,{checkedAt:new Date().toISOString()});
    if(document.querySelector('#cloudApplyNow').getClientRects().length||!document.querySelector('.share-time-note').textContent.includes('마지막 확인'))throw Error('최신 상태 레이아웃');
    resource.catalog[0].memo='remote change';resource.stock[resource.warehouses[0]][resource.catalog[0].name]=12345;
    snapshot.cloudRowVersion='2';const remote=cloudStatusLabel(snapshot);
    const old=state.catalog[0].memo;state.catalog[0].memo='local change';
    const both=cloudStatusLabel(snapshot);renderCloudDashboard(snapshot);
    state.catalog[0].memo=old;
    const form=document.querySelector('.cloud-share-form'),button=document.querySelector('#cloudCompareNow');
    const visible=!!button&&form.scrollWidth<=form.clientWidth+1;
    return {same,remote,both,visible};
   },theme);
   assert.deepEqual(result,{same:'이미 최신',remote:'클라우드 자료가 최신',both:'양쪽 자료 변경',visible:true});
   await p.click('#cloudCompareNow');assert.equal(await p.locator('#cancelConfirm').count(),0);assert.match(await p.locator('.confirm-message').innerText(),/현재 기기 → 공유본[\s\S]*자재 정보 변경/);assert.equal(await p.locator('#acceptConfirm').innerText(),'자원연계로 돌아가기');await p.click('#acceptConfirm');assert.ok(await p.locator('#cloudApplyNow').isVisible());
   await p.click('#cloudCompareNow');assert.match(await p.locator('.share-diff-value strong').first().innerText(),/12345/);assert.equal(await p.locator('.share-diff-row').first().evaluate(el=>getComputedStyle(el).flexDirection),width<=380?'column':'row');await p.click('#acceptConfirm');
   console.log('PASS',width,theme);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
