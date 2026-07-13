const CACHE_NAME = "victor-alpha-0-19-0m-cache-v41";
const CORE_ASSETS = [
  "./index.html",
  "./style.css?v=0190m41",
  "./storage.js?v=0190m41",
  "./app.js?v=0190m41",
  "./manifest.json",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

async function cacheCoreAssets(){
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(CORE_ASSETS.map(async asset => {
    const response = await fetch(new Request(asset, {cache:"reload"}));
    if(!response.ok) throw new Error(`필수 파일 로드 실패: ${asset}`);
    await cache.put(asset, response);
  }));
}

self.addEventListener("install", event => {
  event.waitUntil(cacheCoreAssets().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("victor-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallback){
  const cache = await caches.open(CACHE_NAME);
  try{
    const response = await fetch(request);
    if(response.ok) await cache.put(request, response.clone());
    return response;
  }catch(error){
    const cached = await caches.match(request);
    if(cached) return cached;
    if(fallback){
      const fallbackResponse = await caches.match(fallback);
      if(fallbackResponse) return fallbackResponse;
    }
    throw error;
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;
  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;

  if(request.mode === "navigate"){
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  event.respondWith(networkFirst(request));
});
