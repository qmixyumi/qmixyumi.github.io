import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile,appendFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {OCR_FILES} from '../ocr-assets.mjs';
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.standalone.config.ts'],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
const html=await readFile('standalone-dist/index.html','utf8');const manifest=JSON.parse(await readFile('standalone-dist/.vite/manifest.json','utf8'));
const files=[...new Set(Object.values(manifest).flatMap(m=>[m.file,...(m.css||[]),...(m.assets||[])]))];
// Lazy chunks (Word/Excel/PDF/OCR readers) are precached with each version, so an open page or the offline copy always has the readers that match it.
const lazy=[];for(const f of files){if(f.endsWith('.js')&&!f.includes('pdf.worker')&&(await stat(path.join('standalone-dist',f))).size<700000&&!html.includes('/'+f))lazy.push('/'+f)}
const ocrFiles=Object.keys(OCR_FILES);
const shell=[...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(x=>x[1]);
const version=createHash('sha256').update(html).digest('hex').slice(0,12);
const publicFiles=['manifest.webmanifest','favicon.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-180.png'];
const worker=`const CACHE='adventure-${version}';const OCR='ocr-tesseract-7';const SHELL=${JSON.stringify(['/',...shell,...publicFiles.map(f=>'/'+f)])};const LAZY=${JSON.stringify(lazy)};const FILES=new Set(${JSON.stringify(files.map(f=>'/'+f))});
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(async c=>{await c.addAll(SHELL);await Promise.allSettled(LAZY.map(u=>c.add(u)))})));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=(await caches.keys()).filter(k=>k.startsWith('adventure-'));const previous=keys.filter(k=>k!==CACHE).slice(-1)[0];await Promise.all(keys.filter(k=>k!==CACHE&&k!==previous).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/auth')||u.pathname.startsWith('/api'))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{signal:AbortSignal.timeout(5000)}).catch(async()=>await (await caches.open(CACHE)).match('/')||Response.error()));return}
if(u.pathname.startsWith('/ocr/')){e.respondWith((async()=>{const c=await caches.open(OCR);const hit=await c.match(e.request,{ignoreVary:true});if(hit)return hit;const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r})());return}
if(FILES.has(u.pathname)||SHELL.includes(u.pathname)){e.respondWith((async()=>{const c=await caches.open(CACHE);const hit=await c.match(e.request,{ignoreVary:true});if(hit)return hit;const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r})())}});`;
await writeFile('standalone-dist/sw.js',worker);
// Fresh artifact directory on every build: existing local assets remain untouched.
const out='pages-output/'+version+'-'+Date.now();await mkdir(out,{recursive:true});
for(const f of [...files,...publicFiles,...ocrFiles,'index.html','sw.js']){await mkdir(path.dirname(path.join(out,f)),{recursive:true});await copyFile(path.join('standalone-dist',f),path.join(out,f))}
// GitHub Pages replaces the whole site on every deploy. A page that was opened before the deploy (or an older offline copy)
// still asks for its own hashed chunks, e.g. the Word reader, so keep the assets of the last few deploys alongside the new ones.
const history=[{version,files:files.map(f=>'/'+f)}];
const site=process.env.PREVIOUS_SITE?.replace(/\/$/,'');
if(site){try{let previous=[];const h=await fetch(site+'/asset-history.json',{signal:AbortSignal.timeout(15000)});
 if(h.ok)previous=(await h.json()).builds||[];
 else{const sw=await fetch(site+'/sw.js',{signal:AbortSignal.timeout(15000)});const m=sw.ok&&(await sw.text()).match(/const FILES=new Set\((\[[^\]]*\])\)/);if(m)previous=[{version:'live',files:JSON.parse(m[1])}]}
 const have=new Set(files.map(f=>'/'+f));let kept=0,missing=0;
 for(const b of previous.filter(b=>b.version!==version).slice(0,5)){const keep=[];for(const f of b.files){if(!/^\/assets\/[\w.-]+$/.test(f))continue;if(have.has(f)){keep.push(f);continue}
  try{const r=await fetch(site+f,{signal:AbortSignal.timeout(30000)});if(!r.ok){missing++;continue}const dest=path.join(out,f);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,Buffer.from(await r.arrayBuffer()));have.add(f);keep.push(f);kept++}catch{missing++}}
  if(keep.length)history.push({version:b.version,files:keep})}
 console.log(`Kept ${kept} asset(s) from ${history.length-1} earlier deploy(s) for pages that are still open`+(missing?`; ${missing} could not be fetched.`:'.'));
}catch(e){console.warn('Could not keep earlier assets: '+(e instanceof Error?e.message:e))}}
await writeFile(path.join(out,'asset-history.json'),JSON.stringify({builds:history}));
await writeFile('standalone-dist/build-info.json',JSON.stringify({out,version,files:[...files,...publicFiles,'index.html','sw.js']},null,2));
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'path='+out+'\n');
console.log('Clean deployment artifact: '+out+' (previous assets retained on disk).');
