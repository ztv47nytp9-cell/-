const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');let release=105,failAsset=false,futureSchema=false;const requests=[];
const server=http.createServer((req,res)=>{
  requests.push(req.url);if(process.env.VICTOR_DEBUG)console.log('GET',req.url);
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(failAsset&&pathname==='/workflow.js'){res.writeHead(503).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    if(pathname==='/sw.js')data=Buffer.from(data.toString().replaceAll('cache-v105','cache-v'+release));
    if(pathname==='/index.html')data=Buffer.from(data.toString().replace('<title>Victor</title>','<title>Victor '+release+'</title>'));
    if(futureSchema&&pathname==='/storage.js')data=Buffer.from(data.toString().replace('const SCHEMA_VERSION = 1;','const SCHEMA_VERSION = 999;'));
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);
  });
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,channel:'chrome'});const context=await browser.newContext({serviceWorkers:'allow'});
  await context.addInitScript(()=>{const fetchOriginal=window.fetch;window.fetch=(input,options)=>new URL(typeof input==='string'?input:input.url,location.href).origin===location.origin?fetchOriginal(input,options):Promise.reject(new Error('isolated'));});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  context.on('serviceworker',worker=>{if(process.env.VICTOR_DEBUG)worker.on('console',msg=>console.log('WORKER',msg.text()));});
  try{
    await page.goto(url);await page.waitForFunction(()=>appStarted);
    try{await page.waitForFunction(()=>navigator.serviceWorker.controller);}catch(error){console.error('Worker status',await page.evaluate(async()=>({requests:performance.getEntriesByType('resource').map(e=>e.name),registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({active:r.active?.state,waiting:r.waiting?.state,installing:r.installing?.state})),caches:await caches.keys()})),requests);throw error;}
    await page.evaluate(()=>{state.memos.push({id:'pwa-data',date:todayISO(),title:'업데이트 보존',body:'유지'});save();});
    await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>appStarted);
    assert.equal(await page.evaluate(()=>state.memos.some(m=>m.id==='pwa-data')),true);assert.equal(await page.title(),'Victor 105');console.log('PASS offline cached release');
    await context.setOffline(false);release=106;
    await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
    assert.equal(await page.title(),'Victor 105');assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL.endsWith('/sw.js')),true);
    await page.evaluate(()=>{applyAppUpdate();});await page.click('#acceptConfirm');await page.waitForFunction(()=>document.title==='Victor 106');await page.waitForFunction(()=>appStarted);
    assert.equal(await page.evaluate(()=>state.memos.some(m=>m.id==='pwa-data')),true);
    assert.ok(await page.evaluate(()=>readSafetyPoints().some(p=>p.label==='앱 업데이트 전')));console.log('PASS staged update, snapshot and data preservation');
    await page.evaluate(()=>{rollbackAppVersion();});await page.click('#acceptConfirm');await page.waitForFunction(()=>document.title==='Victor 105');await page.waitForFunction(()=>appStarted);
    assert.equal(await page.evaluate(()=>state.memos.some(m=>m.id==='pwa-data')),true);console.log('PASS previous cached application rollback');
    release=107;failAsset=true;await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    await page.waitForTimeout(1200);assert.equal(await page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting)),false);
    assert.equal(await page.title(),'Victor 105');assert.ok(!(await page.evaluate(()=>caches.keys())).includes('victor-alpha-0-20-cache-v107'));console.log('PASS incomplete release rejected, existing release retained');
    release=108;failAsset=false;futureSchema=true;await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting)),false);assert.equal(await page.title(),'Victor 105');assert.ok(!(await page.evaluate(()=>caches.keys())).includes('victor-alpha-0-20-cache-v108'));console.log('PASS unsupported schema rejected before update');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
