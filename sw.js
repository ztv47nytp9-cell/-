/* App files move together; LocalStorage is never cleared by this worker. */
const CACHE_NAME="victor-alpha-0-20-cache-v106";
const SETTINGS_CACHE="victor-runtime-settings";
const CORE_ASSETS=["./index.html","./style.css?v=0201m106","./storage.js?v=0201m106","./workflow.js?v=0201m106","./app.js?v=0201m106","./manifest.json","./icons/icon-180.png","./icons/icon-192.png","./icons/icon-512.png"];
const isAppCache=name=>name.startsWith("victor-")&&name.includes("-cache-v");
let selectedCache=CACHE_NAME;
const settingUrl=new URL("./__victor_cache_selection",self.location.href).href;
async function readSelection(){const response=await(await caches.open(SETTINGS_CACHE)).match(settingUrl);const selection=response?await response.text():CACHE_NAME;const names=await caches.keys();selectedCache=names.includes(selection)?selection:CACHE_NAME;}
const selectionReady=readSelection();
async function previousIsCompatible(name){
  if(!name)return false;const cache=await caches.open(name),keys=await cache.keys();
  const stored=filename=>keys.find(key=>new URL(key.url).pathname.endsWith('/'+filename));
  if(!stored('index.html')||!stored('app.js')||!stored('storage.js')||!stored('workflow.js'))return false;
  const response=await cache.match(stored('storage.js')),source=await response.text();
  const schema=source.match(/const SCHEMA_VERSION\s*=\s*(\d+)/);return Boolean(schema&&Number(schema[1])<=1&&source.includes('APP_BUILD'));
}
self.addEventListener("install",event=>event.waitUntil((async()=>{
  const responses=await Promise.all(CORE_ASSETS.map(async asset=>{const response=await fetch(new Request(asset,{cache:"reload"}));if(!response.ok)throw new Error("필수 파일 로드 실패: "+asset);const body=await response.arrayBuffer();return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});}));
  const html=await responses[0].clone().text(),storage=await responses[2].clone().text();
  const schema=storage.match(/const SCHEMA_VERSION\s*=\s*(\d+)/);
  if(!schema||Number(schema[1])>1)throw new Error("지원하지 않는 저장형식 · 기존 앱 유지");
  const references=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(match=>match[1]);
  if(!references.length||references.some(reference=>!CORE_ASSETS.some(asset=>new URL(asset,self.location.href).href===new URL(reference,self.location.href).href)))throw new Error("앱 실행파일 버전 불일치");
  const cache=await caches.open(CACHE_NAME);
  try{await Promise.all(CORE_ASSETS.map((asset,index)=>cache.put(asset,responses[index])));}catch(error){await caches.delete(CACHE_NAME);throw error;}
})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
  await selectionReady;selectedCache=CACHE_NAME;
  await(await caches.open(SETTINGS_CACHE)).put(settingUrl,new Response(CACHE_NAME));
  const older=(await caches.keys()).filter(name=>isAppCache(name)&&name!==CACHE_NAME);
  const previous=older[older.length-1];
  await Promise.all(older.filter(name=>name!==previous).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING"){self.skipWaiting();return;}
  event.waitUntil((async()=>{
    await selectionReady;
    const names=await caches.keys(),previous=names.filter(name=>isAppCache(name)&&name!==CACHE_NAME).pop();
    if(event.data?.type==="CACHE_INFO")event.ports[0]?.postMessage({current:selectedCache,previous:previous||null,previousUsable:await previousIsCompatible(previous)});
    if(event.data?.type==="USE_PREVIOUS_CACHE"){
      const cache=previous?await caches.open(previous):null;
      if(!cache||!await previousIsCompatible(previous)){event.ports[0]?.postMessage({ok:false});return;}
      selectedCache=previous;await(await caches.open(SETTINGS_CACHE)).put(settingUrl,new Response(previous));event.ports[0]?.postMessage({ok:true});
    }
  })());
});
async function appResponse(request){
  await selectionReady;
  const cache=await caches.open(selectedCache),url=new URL(request.url);
  if(request.mode==="navigate")return await cache.match("./index.html")||fetch(request);
  const exact=await cache.match(request);if(exact)return exact;
  const core=CORE_ASSETS.some(asset=>new URL(asset,self.location.href).pathname===url.pathname);
  if(core){const compatible=await cache.match(request,{ignoreSearch:true});if(compatible)return compatible;}
  return fetch(request);
}
self.addEventListener("fetch",event=>{if(event.request.method!=="GET"||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(appResponse(event.request));});
