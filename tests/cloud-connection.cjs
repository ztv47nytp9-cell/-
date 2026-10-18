// Isolated transport tests: production functions, mocked fetch, no browser or network.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const errors=source.slice(source.indexOf('function cloudErrorMessage('),source.indexOf('function cloudShareConfig('));
const transport=source.slice(source.indexOf('async function supabaseRest('),source.indexOf('async function testCloudShareConnection('));
const readSnapshot=source.slice(source.indexOf('async function fetchLatestCloudShareSnapshot('),source.indexOf('function isCloudSnapshotNewer('));
const upload=source.slice(source.indexOf('async function performUploadCloudShareSnapshot('),source.indexOf('async function loadCloudShareSnapshot('));
const response=(status=200,body='[]',headers={})=>({status,ok:status>=200&&status<300,headers:{get:name=>headers[name]||null},text:async()=>body});
function fixture(fetch){
  const timers=new Set(),requests=[],navigator={onLine:true};
  const context=vm.createContext({navigator,AbortController,Date,Error,JSON,Number,String,Object,Math,RegExp,
    setTimeout:(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;},
    clearTimeout:id=>{timers.delete(id);clearTimeout(id);},
    cloudShareConfig:()=>({url:'https://mock.invalid',key:'test-only',siteId:'mock'}),
    cloudShareReady:config=>Boolean(config.url&&config.key&&config.siteId),
    fetch:async(url,options)=>{requests.push({url,options});return fetch(url,options,requests.length);}
  });
  vm.runInContext(errors+transport,context);
  return {context,requests,navigator,timers,request:options=>context.supabaseRest('resource_snapshots',options),message:error=>context.cloudErrorMessage(error)};
}
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}
async function fails(f,options){try{await f.request(options);assert.fail('must reject');}catch(error){assert.notEqual(error.code,'ERR_ASSERTION');return error;}finally{assert.equal(f.timers.size,0,'request timers must be cleaned');}}
function uploadFixture(mode){
  let version='2026-10-18T00:00:00.000Z',attempt=0;
  const feedback=[],saved=[];
  const f=fixture((url,options)=>{
    if(options.method==='GET'){
      attempt++;
      if(mode==='read-fail'||mode==='recover'&&attempt===1)return response(503);
      return response(200,JSON.stringify(mode==='insert'?[]:[{id:'row',site_id:'mock',title:'Mock',updated_at:version,snapshot:{kind:'victor-resource-share',materials:[],equipment:[]}}]));
    }
    if(mode==='write-fail')return response(503);
    return response(200,JSON.stringify(mode==='conflict'?[]:[{id:'row',updated_at:'2026-10-18T00:00:01.000Z'}]));
  });
  Object.assign(f.context,{console:{warn:()=>{}},state:{stock:{synthetic:20}},KEY:'test-only',localStorage:{getItem:()=>'{"stock":{"synthetic":20}}'},
    closeMenu:()=>{},cloudReadConfig:f.context.cloudShareConfig,currentCloudUploadPinHash:()=> 'synthetic-hash',
    buildResourceSnapshot:()=>({kind:'victor-resource-share'}),validateSharedSnapshot:()=>{},snapshotTotalQuantity:()=>20,
    victorDeviceLabel:()=> 'mock device',victorDeviceId:()=> 'mock-device',uploadWarningLines:()=>[],uploadPreviewText:()=> 'mock',
    askConfirm:async()=>true,requestUploadPin:async()=>{if(mode==='remote-change')version='2026-10-18T00:00:02.000Z';if(mode==='local-change')f.context.state.stock.synthetic=30;return '1234';},
    verifyCloudUploadPin:async()=>mode!=='bad-pin',showFeedback:(kind,message)=>feedback.push({kind,message}),dateMs:value=>Date.parse(value)||0,
    saveCloudShareMeta:meta=>saved.push(meta),snapshotSummary:()=>({}),page:'test',cloudShareNotice:null});
  vm.runInContext(readSnapshot+upload,f.context);
  return {...f,feedback,saved,run:()=>f.context.performUploadCloudShareSnapshot(),writes:()=>f.requests.filter(r=>r.options.method!=='GET')};
}
(async()=>{
  await test('normal JSON read and no retry',async()=>{const f=fixture(()=>response(200,'[{"updated_at":"test"}]'));assert.equal((await f.request())[0].updated_at,'test');assert.equal(f.requests.length,1);assert.equal(f.timers.size,0);});
  await test('empty collection is valid, not an error',async()=>{const f=fixture(()=>response());assert.equal((await f.request()).length,0);assert.equal(f.requests.length,1);});
  await test('fresh reads bypass browser HTTP cache',async()=>{const f=fixture(()=>response());await f.request({cache:'force-cache'});assert.equal(f.requests[0].options.cache,'no-store');});
  for(const status of [408,429,500,502,503,504,520,521,522,523,524])await test('GET recovers after '+status,async()=>{const f=fixture((u,o,n)=>n===1?response(status,'<html>gateway</html>'):response());await f.request();assert.equal(f.requests.length,2);assert.equal(f.requests[1].options.method,'GET');assert.equal(f.timers.size,0);});
  await test('GET retries only once even if failure persists',async()=>{const f=fixture(()=>response(503));const e=await fails(f);assert.equal(f.requests.length,2);assert.match(f.message(e),/공유 서버/);});
  await test('network failure recovers with one retry',async()=>{const f=fixture((u,o,n)=>{if(n===1)throw new TypeError('Failed to fetch');return response();});await f.request();assert.equal(f.requests.length,2);});
  await test('lowercase explicit get is still read-only',async()=>{const f=fixture((u,o,n)=>n===1?response(503):response());await f.request({method:'get'});assert.equal(f.requests.length,2);});
  for(const status of [400,401,403,404,409,422])await test('permanent HTTP '+status+' is not retried',async()=>{const f=fixture(()=>response(status,'{"message":"resource_snapshots denied","code":"TEST"}'));const e=await fails(f);assert.equal(f.requests.length,1);assert.equal(e.cloudStatus,status);if(status===403)assert.match(f.message(e),/권한/);if(status===401)assert.match(f.message(e),/인증/);if(status===404)assert.match(f.message(e),/테이블/);});
  for(const method of ['POST','PATCH','PUT','DELETE'])await test(method+' failure is never replayed',async()=>{const f=fixture(()=>response(503));const e=await fails(f,{method,body:'{}'});assert.equal(f.requests.length,1);assert.equal(e.cloudUncertain,true);assert.match(f.message(e),/전송 결과/);});
  await test('write network loss reports uncertain result without replay',async()=>{const f=fixture(()=>{throw new TypeError('fetch failed');});const e=await fails(f,{method:'PATCH'});assert.equal(f.requests.length,1);assert.equal(e.cloudUncertain,true);});
  await test('successful write is parsed once',async()=>{const f=fixture(()=>response(201,'[{"id":"mock"}]'));assert.equal((await f.request({method:'POST',body:'{}'}))[0].id,'mock');assert.equal(f.requests.length,1);});
  await test('offline read never contacts server',async()=>{const f=fixture(()=>assert.fail('offline fetch'));f.navigator.onLine=false;const e=await fails(f);assert.equal(e.cloudKind,'offline');assert.equal(f.requests.length,0);assert.match(f.message(e),/기기의 저장자료는 유지/);});
  await test('already cancelled request never contacts server',async()=>{const f=fixture(()=>assert.fail('cancelled fetch')),c=new AbortController();c.abort();const e=await fails(f,{signal:c.signal});assert.equal(e.cloudKind,'cancelled');assert.equal(f.requests.length,0);});
  await test('abort during backoff prevents second request',async()=>{const c=new AbortController(),f=fixture(()=>{setTimeout(()=>c.abort(),15);throw new TypeError('Failed to fetch');});const e=await fails(f,{signal:c.signal});assert.equal(e.cloudKind,'cancelled');assert.equal(f.requests.length,1);});
  for(const method of ['GET','POST'])await test(method+' timeout cleans timers and never repeats write',async()=>{const f=fixture((u,o)=>new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})));const start=Date.now(),e=await fails(f,{method,timeoutMs:25});assert.equal(e.cloudKind,'timeout');assert.equal(e.cloudUncertain,method==='POST');assert.equal(f.requests.length,1);assert.ok(Date.now()-start<400);});
  await test('external abort after write starts is uncertain',async()=>{const c=new AbortController(),f=fixture((u,o)=>new Promise((resolve,reject)=>{setTimeout(()=>c.abort(),15);o.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});}));const e=await fails(f,{method:'PATCH',signal:c.signal});assert.equal(e.cloudUncertain,true);});
  await test('shared deadline limits the second attempt too',async()=>{const f=fixture((u,o,n)=>n===1?response(503):new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})));const start=Date.now(),e=await fails(f,{timeoutMs:700});assert.equal(e.cloudKind,'timeout');assert.equal(f.requests.length,2);assert.ok(Date.now()-start<1100);});
  await test('Retry-After longer than remaining budget prevents retry',async()=>{const f=fixture(()=>response(429,'{}',{'Retry-After':'30'}));const e=await fails(f,{timeoutMs:1000});assert.equal(f.requests.length,1);assert.match(f.message(e),/요청이 많/);});
  await test('short Retry-After is respected',async()=>{const f=fixture((u,o,n)=>n===1?response(429,'{}',{'Retry-After':'1'}):response()),start=Date.now();await f.request({timeoutMs:2000});assert.equal(f.requests.length,2);assert.ok(Date.now()-start>=950);});
  for(const body of ['', '<html>unexpected</html>', '{'])await test('invalid or empty successful body is not mistaken for no data: '+JSON.stringify(body),async()=>{const f=fixture(()=>response(200,body));const e=await fails(f);assert.equal(e.cloudKind,'response');assert.equal(f.requests.length,1);assert.doesNotMatch(f.message(e),/html|JSON|unexpected/);});
  await test('204 stays compatible with no-content writes',async()=>{const f=fixture(()=>response(204,''));assert.equal(await f.request({method:'PATCH'}),null);assert.equal(f.requests.length,1);});
  await test('HTTP HTML never leaks into message or error',async()=>{const f=fixture(()=>response(521,'<html>private gateway text</html>'));const e=await fails(f);assert.equal(e.message,'Supabase 521');assert.doesNotMatch(f.message(e),/private|html/);assert.doesNotMatch(JSON.stringify(e),/private|html/);});
  await test('malformed write response requires verification instead of claiming success',async()=>{const f=fixture(()=>response(200,'not-json'));const e=await fails(f,{method:'POST'});assert.match(f.message(e),/전송 결과/);assert.equal(f.requests.length,1);});
  await test('interrupted body is an error, not empty success',async()=>{const f=fixture(()=>({status:200,ok:true,text:async()=>{throw new Error('body interrupted');}}));await fails(f);assert.equal(f.requests.length,1);});
  await test('network failure does not claim paused or wrong URL',async()=>{const f=fixture(()=>{throw new TypeError('Failed to fetch');});const e=await fails(f);assert.match(f.message(e),/프로젝트 상태/);assert.doesNotMatch(f.message(e),/일시중지되었습니다|키가 맞지|URL을 확인/);});
  await test('transport has no local storage or resource mutation',async()=>{assert.doesNotMatch(transport,/localStorage|\bstate\b|save\(|applySharedSnapshot/);});
  for(const mode of ['normal','recover','insert'])await test('upload workflow '+mode+' writes exactly once',async()=>{const f=uploadFixture(mode);await f.run();assert.equal(f.writes().length,1);assert.equal(f.saved.length,1);assert.equal(f.feedback.at(-1).kind,'success');assert.equal(f.context.state.stock.synthetic,20);if(mode!=='insert')assert.match(f.writes()[0].url,/updated_at=eq\./);assert.equal(f.timers.size,0);});
  for(const mode of ['read-fail','bad-pin','remote-change','local-change'])await test('upload workflow '+mode+' never writes',async()=>{const f=uploadFixture(mode);await f.run();assert.equal(f.writes().length,0);assert.equal(f.saved.length,0);assert.notEqual(f.feedback.at(-1).kind,'success');assert.equal(f.timers.size,0);});
  for(const mode of ['write-fail','conflict'])await test('upload workflow '+mode+' is neither retried nor marked successful',async()=>{const f=uploadFixture(mode);await f.run();assert.equal(f.writes().length,1);assert.equal(f.saved.length,0);assert.equal(f.feedback.at(-1).kind,'error');assert.equal(f.context.state.stock.synthetic,20);assert.equal(f.timers.size,0);});
  await test('release assets, version and stored data schema stay consistent',async()=>{
    const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),storage=read('storage.js'),html=read('index.html'),worker=read('sw.js');
    const build=storage.match(/const APP_BUILD = "(\d+)"/)[1],version=storage.match(/const VERSION = "([^"]+)"/)[1];
    assert.ok(worker.includes('cache-v'+build+'"'));assert.ok(html.includes(version));
    assert.match(storage,/const SCHEMA_VERSION = 1;/);assert.match(storage,/const KEY = "victor_state_alpha_0_19_0e";/);
    const assets=vm.runInNewContext(worker.match(/const CORE_ASSETS=(\[[^;]+\]);/)[1]);
    for(const asset of assets)assert.ok(fs.existsSync(path.join(root,asset.split('?')[0])),asset+' exists');
    for(const reference of [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(m=>m[1]))assert.ok(assets.includes(reference),'cached '+reference);
    assert.doesNotMatch(html,/02012m117/);assert.doesNotMatch(worker,/02012m117/);
  });
  console.log(`DONE ${passed} isolated cloud connection checks; zero external requests`);
})().catch(error=>{console.error(error);process.exitCode=1;});
