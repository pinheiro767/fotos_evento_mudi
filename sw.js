const VERSION='mudi-mostra-2026-v2-sem-cortes';
const BASE=new URL('./',self.registration.scope).href;
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./assets/01-whey-protein.png','./assets/02-segundo-cerebro.png','./assets/03-plantas-medicinais.png','./assets/04-tabagismo.png','./assets/05-cerebro-bem-estar.png','./assets/06-cerebro-intestino.png','./assets/07-video-cerebro-poster.jpg','./assets/08-video-tabagismo-poster.jpg','./assets/09-video-plantas-poster.jpg'];
const VIDEOS=['./assets/07-video-cerebro.mp4','./assets/08-video-tabagismo.mp4','./assets/09-video-plantas.mp4'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(VERSION);await cache.addAll(CORE.map(path=>new URL(path,BASE).href));try{for(const file of VIDEOS){await cache.add(new URL(file,BASE).href);}}catch(err){console.warn('Vídeos podem requerer conexão:',err);}await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith('mudi-mostra-')&&key!==VERSION)await caches.delete(key);}await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const u=new URL(request.url);if(u.origin!==self.location.origin||!u.href.startsWith(BASE))return;
 const isVideo=u.pathname.endsWith('.mp4');
 if(isVideo){event.respondWith((async()=>{const cache=await caches.open(VERSION);const cached=await cache.match(u.href);
  if(cached){const range=request.headers.get('range');if(range)return rangedResponse(cached,range);return cached;}
  return fetch(request);
 })());return;}
 if(request.mode==='navigate'){
 event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok){const cache=await caches.open(VERSION);cache.put(new URL('./index.html',BASE).href,response.clone());}return response;}catch(err){const cache=await caches.open(VERSION);return await cache.match(new URL('./index.html',BASE).href)||Response.error();}})());return;
 }
 event.respondWith((async()=>{const cache=await caches.open(VERSION);const cached=await cache.match(request);if(cached)return cached;try{const response=await fetch(request);if(response.ok)cache.put(request,response.clone());return response;}catch(err){return Response.error();}})());
});
async function rangedResponse(full,range){const blob=await full.blob();const size=blob.size;const match=/bytes=(\d*)-(\d*)/.exec(range);
 if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 let start=match[1]===''?Math.max(0,size-Number(match[2])):Number(match[1]);let end=match[2]===''?size-1:Number(match[2]);end=Math.min(end,size-1);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 const body=blob.slice(start,end+1);return new Response(body,{status:206,headers:{'Content-Type':full.headers.get('Content-Type')||'video/mp4','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(body.size),'Cache-Control':'public, max-age=31536000'}});
}
