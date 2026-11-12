'use client';
import {useEffect,useState} from 'react';
import {Download,Upload,CheckCircle,AlertTriangle,PackageCheck} from 'lucide-react';
import type {Data,Trip} from './model';
import type {Attachment} from './attachments';
import {readLocalFile,storeBlob} from './attachments';
import {ATTACHMENT_BUCKET,fileDigest} from './attachment-sync';
import {getCloudClient} from './cloud-client';
import {makeZip,readZip,type ZipEntry} from './zip';
import {validData} from './model';
import {alive} from './travel-tools';

type Item={ref:Attachment;group:'附件'|'相片';owner:string};
type Failure={item:Item;reason:string};
const safe=(s:string)=>s.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,120)||'file';

/** Every original file a backup or offline trip needs: trip attachments plus photos used in those trips. */
export function fileItems(data:Data,trips:Trip[]=alive(data.trips)):Item[]{
 const photos=new Map((data.photos||[]).map(p=>[p.id,p]));const items:Item[]=[];const seen=new Set<string>();
 const add=(ref:Attachment|undefined,group:Item['group'],owner:string)=>{if(ref&&!seen.has(ref.id)){seen.add(ref.id);items.push({ref,group,owner})}};
 for(const t of trips){for(const a of t.attachments||[])add(a,'附件',t.name);
  for(const x of [...t.stops,...t.notes,...t.notes.filter(n=>!n.deletedAt).flatMap(n=>n.gallery||[])])if(!x.deletedAt&&x.photo?.startsWith('photo:'))add(photos.get(x.photo),'相片',t.name)}
 if(trips.length===alive(data.trips).length){for(const e of data.quest?.entries||[])if(e.photo.startsWith('photo:'))add(photos.get(e.photo),'相片','評分圖鑑');for(const p of data.photos||[])add(p,'相片','其他')}
 return items;
}
async function localBlob(id:string){try{return await readLocalFile(id)}catch{return undefined}}
/** Reads the original from this device, or downloads it from the private cloud and keeps a copy here. */
async function fetchOriginal(item:Item,keep:boolean):Promise<Blob>{
 let blob=await localBlob(item.ref.id);
 if(!blob){
  if(!item.ref.cloudPath)throw Error('只喺另一部裝置，未上傳雲端');
  if(!navigator.onLine)throw Error('離線中，未能下載');
  const client=getCloudClient();const {data:s}=await client.auth.getSession();if(!s.session)throw Error('未登入，未能讀取雲端原檔');
  const {data,error}=await client.storage.from(ATTACHMENT_BUCKET).download(item.ref.cloudPath);if(error||!data)throw Error('雲端下載失敗'+(error?'：'+error.message:''));
  blob=data;
  if('attachments/'+await fileDigest(blob)!==item.ref.cloudPath)throw Error('檔案核對失敗');
  if(keep)await storeBlob(item.ref.id,blob);
 }
 if(blob.size!==item.ref.size)throw Error('檔案大小同記錄唔一致');
 return blob;
}
function save(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}

async function buildZip(data:Data,items:Item[],progress:(s:string)=>void){
 const enc=new TextEncoder();const entries:ZipEntry[]=[];const failed:Failure[]=[];const manifest:{id:string;path:string;name:string;type:string;size:number}[]=[];
 for(const [i,item] of items.entries()){progress(`準備原檔 ${i+1}/${items.length}：${item.ref.name}`);
  try{const blob=await fetchOriginal(item,false);const ext=item.group==='相片'?'.'+((item.ref.type.split('/')[1]||'jpg').replace('jpeg','jpg')):'';
   const path=(item.group==='相片'?'photos/':'attachments/')+String(i+1).padStart(3,'0')+'-'+safe(item.group==='相片'?item.owner+ext:item.ref.name);
   entries.push({name:path,data:new Uint8Array(await blob.arrayBuffer())});manifest.push({id:item.ref.id,path,name:item.ref.name,type:item.ref.type,size:item.ref.size});
  }catch(e){failed.push({item,reason:e instanceof Error?e.message:'未能讀取'})}}
 const report=failed.length?failed.map(f=>`✗ ${f.item.group}「${f.item.ref.name}」（${f.item.owner}）：${f.reason}`).join('\n'):'全部原檔已包括。';
 entries.unshift({name:'backup.json',data:enc.encode(JSON.stringify(data,null,2))},{name:'files.json',data:enc.encode(JSON.stringify(manifest,null,2))},{name:'讀我.txt',data:enc.encode(`QMI × YUMI 完整備份 ${new Date().toLocaleString('zh-HK')}\n\nbackup.json：旅程、評鑑、旅費等全部資料\nattachments/：行程原始附件\nphotos/：相片原檔\n\n還原：網站「資料管理 → 從完整 ZIP 備份還原」。\n\n下載狀況：\n${report}\n`)});
 return {zip:makeZip(entries),failed,count:manifest.length};
}

export function FullBackup({data,onRestore,onMessage}:{data:Data;onRestore:(d:Data,files:number)=>void;onMessage:(s:string)=>void}){
 const [busy,setBusy]=useState(''),[failed,setFailed]=useState<Failure[]>([]);
 async function exportZip(){setBusy('正在準備…');setFailed([]);try{const items=fileItems(data);const r=await buildZip(data,items,setBusy);save(r.zip,'qmi-yumi-完整備份-'+new Date().toISOString().slice(0,10)+'.zip');setFailed(r.failed);onMessage(r.failed.length?`ZIP 已下載，${r.count} 個原檔已包括；${r.failed.length} 個未能下載，見下面清單`:`ZIP 已下載，包括資料同 ${r.count} 個原檔`)}catch(e){onMessage(e instanceof Error?e.message:'ZIP 備份失敗')}finally{setBusy('')}}
 async function restoreJson(file:File){if(file.size>12000000)return onMessage('備份上限 12MB');try{const d=JSON.parse(await file.text());if(!validData(d))throw Error();onRestore(d,0)}catch{onMessage('備份格式無效，現有資料未有改動')}}
 async function restoreZip(file:File){setBusy('讀取 ZIP…');try{const files=await readZip(await file.arrayBuffer());const json=files.get('backup.json');if(!json)throw Error('ZIP 入面搵唔到 backup.json');const d=JSON.parse(new TextDecoder().decode(json));if(!validData(d))throw Error('備份資料格式無效，現有資料未有改動');
  const manifest=JSON.parse(new TextDecoder().decode(files.get('files.json')||new TextEncoder().encode('[]'))) as {id:string;path:string;type:string;size:number}[];let stored=0;
  for(const m of manifest){const bytes=files.get(m.path);if(!bytes||bytes.length!==m.size)continue;setBusy(`還原原檔 ${stored+1}/${manifest.length}`);await storeBlob(m.id,new Blob([bytes as BlobPart],{type:m.type}));stored++}
  onRestore(d,stored)}catch(e){onMessage(e instanceof Error?e.message:'ZIP 還原失敗')}finally{setBusy('')}}
 return <div className="full-backup">
  <button className="primary" disabled={!!busy} onClick={exportZip}><PackageCheck size={17}/> 完整備份（包括相片及附件）</button>
  <label className="secondary file-button"><Upload size={17}/> 還原備份<input hidden type="file" accept=".zip,application/zip,.json,application/json" disabled={!!busy} onChange={e=>{const f=e.target.files?.[0];if(f)void(/\.json$/i.test(f.name)?restoreJson(f):restoreZip(f));e.target.value=''}}/></label>
  {busy&&<p role="status">{busy}</p>}
  {failed.length>0&&<div className="failed-list"><b><AlertTriangle size={15}/> 以下原檔未能放入 ZIP</b>{failed.map(f=><p key={f.item.ref.id}>{f.item.group}「{f.item.ref.name}」· {f.item.owner}：{f.reason}</p>)}<small>通常係檔案只喺另一部裝置。喺嗰部裝置撳右上角帳戶開啟自動同步，再做一次完整備份就會齊。</small></div>}
 </div>;
}

type Prep={item:Item;state:'checking'|'ready'|'missing'|'busy'|'failed';reason?:string};
export function OfflinePrep({data,trip,signedIn,located,total}:{data:Data;trip:Trip;signedIn:boolean;located:number;total:number}){
 const [rows,setRows]=useState<Prep[]>([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[zipBusy,setZipBusy]=useState('');
 const installed=typeof window!=='undefined'&&(window.matchMedia('(display-mode: standalone)').matches||!!navigator.serviceWorker?.controller);
 const key=trip.id+'|'+(trip.attachments||[]).length+'|'+(data.photos||[]).length;
 useEffect(()=>{let live=true;const items=fileItems(data,[trip]);setRows(items.map(item=>({item,state:'checking'})));
  void Promise.all(items.map(async item=>({item,state:(await localBlob(item.ref.id))?'ready':'missing'} as Prep))).then(r=>{if(live)setRows(r)});return()=>{live=false}},[key]);
 async function prepare(){setBusy(true);setMsg('');let ok=0,bad=0;for(const r of rows){if(r.state==='ready'){ok++;continue}setRows(rs=>rs.map(x=>x.item.ref.id===r.item.ref.id?{...x,state:'busy'}:x));
   try{await fetchOriginal(r.item,true);ok++;setRows(rs=>rs.map(x=>x.item.ref.id===r.item.ref.id?{...x,state:'ready',reason:undefined}:x))}catch(e){bad++;setRows(rs=>rs.map(x=>x.item.ref.id===r.item.ref.id?{...x,state:'failed',reason:e instanceof Error?e.message:'未能下載'}:x))}}
  setBusy(false);setMsg(bad?`${ok} 個已準備，${bad} 個未完成，見下面原因`:`全部 ${ok} 個原檔已存喺呢部裝置，冇網都睇到`)}
 async function zipTrip(){setZipBusy('準備中…');try{const one={...data,trips:[trip]};const r=await buildZip(one,fileItems(data,[trip]),setZipBusy);save(r.zip,safe(trip.name)+'-離線包.zip');setMsg(r.failed.length?`離線包已下載，${r.failed.length} 個原檔未能包括`:'離線包已下載，可以存喺手機「檔案」')}finally{setZipBusy('')}}
 const ready=rows.filter(r=>r.state==='ready').length;
 const checks:[boolean,string,string][]=[
  [installed,'網站已可離線開啟',installed?'已安裝或已載入離線版本':'用瀏覽器開一次網站，或者「加入主畫面」'],
  [signedIn,'已登入同步',signedIn?'最新資料已同步落呢部裝置':'未登入：只有呢部裝置嘅資料'],
  [!!rows.length&&ready===rows.length||!rows.length,'相片同附件原檔',rows.length?`${ready} / ${rows.length} 個已存喺呢部裝置`:'今次旅程未有附件'],
  [located===total,'地點已定位',`${located} / ${total} 個有座標；真實地圖底圖要網絡，離線可用示意圖`],
  [(trip.tickets||[]).length>0,'交通票券',`${(trip.tickets||[]).length} 張，儲存喺旅程資料，離線都睇到`],
 ];
 return <section className="panel offline-prep"><div className="section-title"><div><h2>出發前離線準備</h2><p className="muted">一鍵將「{trip.name}」嘅相片同附件下載到呢部裝置，避免到現場先發現冇網讀唔到。</p></div><span className="tag">{checks.filter(c=>c[0]).length} / {checks.length} 已準備</span></div>
  <ul className="prep-list">{checks.map(([ok,title,sub])=><li key={title} className={ok?'ok':'todo'}>{ok?<CheckCircle size={17}/>:<AlertTriangle size={17}/>}<span><b>{title}</b><small>{sub}</small></span></li>)}</ul>
  <div className="actions"><button className="primary" disabled={busy||!rows.length||ready===rows.length} onClick={prepare}><Download size={16}/>{busy?'下載中…':ready===rows.length&&rows.length?'全部已準備':`一鍵下載 ${rows.length-ready} 個原檔`}</button><button className="secondary" disabled={!!zipBusy} onClick={zipTrip}>{zipBusy||'下載今次旅程離線包 ZIP'}</button></div>
  {msg&&<p role="status">{msg}</p>}
  {rows.some(r=>r.state!=='ready')&&<details open={rows.some(r=>r.state==='failed')}><summary>未完成項目（{rows.filter(r=>r.state!=='ready').length}）</summary>{rows.filter(r=>r.state!=='ready').map(r=><p key={r.item.ref.id} className="prep-row">{r.item.group}「{r.item.ref.name}」：{r.state==='checking'?'檢查中…':r.state==='busy'?'下載中…':r.reason||'未下載到呢部裝置'}</p>)}</details>}
  <small>天氣、匯率、Google 導航同真實地圖要網絡；出發前可先查好，或者截圖留底。</small>
 </section>;
}
