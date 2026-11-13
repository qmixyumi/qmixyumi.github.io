'use client';
import {useRef,useState} from 'react';
import {getCloudClient} from './cloud-client';
import {ATTACHMENT_BUCKET,fileDigest,storageProblem} from './attachment-sync';
export type Attachment={id:string;name:string;size:number;type:string;cloudPath?:string};
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('adventure-attachments',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function keepFiles(files:File[]):Promise<Attachment[]>{if(!files.length)return [];const conn=await db();const refs=files.map(f=>({id:crypto.randomUUID(),name:f.name,size:f.size,type:f.type}));try{await new Promise<void>((resolve,reject)=>{const tx=conn.transaction('files','readwrite');files.forEach((f,i)=>tx.objectStore('files').put(f,refs[i].id));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('附件儲存被取消'))});return refs;}finally{conn.close()}}
export async function readLocalFile(id:string):Promise<Blob|undefined>{const conn=await db();try{return await new Promise<Blob|undefined>((resolve,reject)=>{const r=conn.transaction('files').objectStore('files').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{conn.close()}}
export async function storeBlob(id:string,blob:Blob){const conn=await db();try{await new Promise<void>((resolve,reject)=>{const tx=conn.transaction('files','readwrite');tx.objectStore('files').put(blob,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{conn.close()}}
const PLAN_TYPES=['pdf','docx','xlsx','txt','csv','png','jpg','jpeg','webp'];
export default function Attachments({items=[],onKeep,onPlan}:{items?:Attachment[];onKeep?:(refs:Attachment[])=>void;onPlan?:(files:File[])=>void}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(''),[picked,setPicked]=useState<File[]>([]);const input=useRef<HTMLInputElement>(null);
 const canPlan=picked.length>0&&picked.length<=6&&picked.every(f=>PLAN_TYPES.includes(f.name.split('.').pop()?.toLowerCase()||''));
 function choose(list:File[]){setMessage('');if(!list.length)return;if(list.some(f=>f.size>20*1024*1024))return setMessage('每個檔案上限 20MB。');setPicked(list)}
 async function keepOnly(){setBusy('keep');try{const refs=await keepFiles(picked);onKeep?.(refs);setPicked([])}catch(e){setMessage(e instanceof Error?e.message:'未能保存附件')}finally{setBusy('')}}
 async function download(item:Attachment){setBusy(item.id);setMessage('讀取 '+item.name+'…');try{
  let blob:Blob|undefined;
  try{blob=await readLocalFile(item.id)}catch{/* Cloud download is still available without IndexedDB. */}
  if(!blob){
   if(!item.cloudPath)throw Error('呢部裝置冇原始附件。請喺原本裝置上傳本機修改，再喺呢部裝置讀取最新雲端版本。');
   if(!/^attachments\/[a-f0-9]{64}$/.test(item.cloudPath))throw Error('附件路徑無效');
   const client=getCloudClient();const {data:session,error:authError}=await client.auth.getSession();
   if(authError||!session.session)throw Error('請撳右上角帳戶，用獲授權嘅 Google 帳戶開啟自動同步。');
   setMessage('正在從私人雲端下載 '+item.name+'…');
   const {data,error}=await client.storage.from(ATTACHMENT_BUCKET).download(item.cloudPath);
   if(error)throw storageProblem(error);
   blob=data;
  }
  if(blob.size!==item.size||(item.cloudPath&&'attachments/'+await fileDigest(blob)!==item.cloudPath))throw Error('附件內容核對失敗，請重新下載或用原本裝置檢查原檔。');
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=item.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('已開始下載 '+item.name);
 }catch(e){setMessage(e instanceof Error?e.message:'未能讀取附件')}finally{setBusy('')}}
 return <section className="panel attachment-list"><div className="section-title"><h2>行程附件</h2>{onKeep&&<button className="primary" disabled={!!busy} onClick={()=>input.current?.click()}>＋ 新增附件</button>}</div><input ref={input} type="file" multiple hidden onChange={e=>{choose(Array.from(e.target.files||[]));e.target.value=''}}/>{picked.length>0&&<div className="attach-choice" role="group" aria-label="點樣處理新附件"><p><b>已揀 {picked.length} 個檔案：</b>{picked.map(f=>f.name).join('、')}</p><p className="attach-choice-q">要點處理？</p><div className="actions"><button className="secondary" disabled={!!busy} onClick={keepOnly}>📎 只保存文件</button>{onPlan&&<button className="primary" disabled={!!busy||!canPlan} title={canPlan?'':'只支援 PDF、Word、Excel、文字同相片'} onClick={()=>{const f=picked;setPicked([]);onPlan(f)}}>🗺 整理成行程</button>}<button className="text-btn" disabled={!!busy} onClick={()=>setPicked([])}>取消</button></div>{!canPlan&&onPlan&&<p className="muted">呢種檔案只可以保存；整理成行程支援 PDF、Word、Excel、文字同相片。</p>}</div>}{items.map(a=><button className="compact-stop" key={a.id} disabled={!!busy} onClick={()=>download(a)}><span>📎</span><span><b>{a.name}</b><small>{(a.size/1024).toFixed(0)} KB · {busy===a.id?'讀取中…':a.cloudPath?'雲端附件 · 撳嚟下載':'本機附件 · 撳嚟下載'}</small></span></button>)}{!items.length&&!picked.length&&<p className="empty-small">未有附件。酒店確認信、機票 PDF 都可以放喺度。</p>}<p className="muted attach-note">開咗自動同步就會連原檔一齊同步。</p>{message&&<p role="status">{message}</p>}</section>
}
