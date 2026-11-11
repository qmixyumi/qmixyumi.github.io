import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.standalone.config.ts'],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
const html=await readFile('standalone-dist/index.html','utf8');const manifest=JSON.parse(await readFile('standalone-dist/.vite/manifest.json','utf8'));
const files=[...new Set(Object.values(manifest).flatMap(m=>[m.file,...(m.css||[]),...(m.assets||[])]))];
const shell=[...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(x=>x[1]);
const version=createHash('sha256').update(html).digest('hex').slice(0,12);
const publicFiles=['manifest.webmanifest','favicon.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-180.png'];
const worker=`const CACHE='adventure-${version}';const SHELL=${JSON.stringify(['/',...shell,...publicFiles.map(f=>'/'+f)])};const FILES=new Set(${JSON.stringify(files.map(f=>'/'+f))});
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=(await caches.keys()).filter(k=>k.startsWith('adventure-'));const previous=keys.filter(k=>k!==CACHE).slice(-1)[0];await Promise.all(keys.filter(k=>k!==CACHE&&k!==previous).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/auth')||u.pathname.startsWith('/api'))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{signal:AbortSignal.timeout(5000)}).catch(async()=>await (await caches.open(CACHE)).match('/')||Response.error()));return}
if(FILES.has(u.pathname)||SHELL.includes(u.pathname)){e.respondWith((async()=>{const c=await caches.open(CACHE);const hit=await c.match(e.request,{ignoreVary:true});if(hit)return hit;const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r})())}});`;
await writeFile('standalone-dist/sw.js',worker);
// Fresh artifact directory on every build: existing local assets remain untouched.
const out='pages-output/'+version+'-'+Date.now();await mkdir(out,{recursive:true});
for(const f of [...files,...publicFiles,'index.html','sw.js']){await mkdir(path.dirname(path.join(out,f)),{recursive:true});await copyFile(path.join('standalone-dist',f),path.join(out,f))}
await writeFile('standalone-dist/build-info.json',JSON.stringify({out,version,files:[...files,...publicFiles,'index.html','sw.js']},null,2));
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'path='+out+'\n');
console.log('Clean deployment artifact: '+out+' (previous assets retained on disk).');
