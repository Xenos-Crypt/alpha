// Installed only after every core game file has been cached successfully.
const CACHE='another-world-offline-d8c791ccf3f8ef2d';
const CORE=['./','./index.html','./responsive-ui.css','./offline.js','./dist/bundle.js','./dist/wasm_physics_bg.wasm'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(CORE);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('another-world-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='OFFLINE_READY')event.ports[0]?.postMessage({ready:true});});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/'))return;
 const core=CORE.some(path=>new URL(path,self.registration.scope).pathname===url.pathname);if(!core&&request.mode!=='navigate')return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(request.mode==='navigate')return await cache.match('./index.html')||fetch(request);return await cache.match(request,{ignoreSearch:true})||fetch(request);})());
});
