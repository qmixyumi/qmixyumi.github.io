'use client';
import {useState} from 'react';
import {getCloudClient} from './cloud-client';
import {ATTACHMENT_BUCKET,fileDigest,storageProblem} from './attachment-sync';
export type Attachment={id:string;name:string;size:number;type:string;cloudPath?:string};
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('adventure-attachments',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function keepFiles(files:File[]):Promise<Attachment[]>{if(!files.length)return [];const conn=await db();const refs=files.map(f=>({id:crypto.randomUUID(),name:f.name,size:f.size,type:f.type}));try{await new Promise<void>((resolve,reject)=>{const tx=conn.transaction('files','readwrite');files.forEach((f,i)=>tx.objectStore('files').put(f,refs[i].id));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('附件儲存被取消'))});return refs;}finally{conn.close()}}
export async function readLocalFile(id:string):Promise<Blob|undefined>{const conn=await db();try{return await new Promise<Blob|undefined>((resolve,reject)=>{const r=conn.transaction('files').objectStore('files').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{conn.close()}}
export async function storeBlob(id:string,blob:Blob){const conn=await db();try{await new Promise<void>((resolve,reject)=>{const tx=conn.transaction('files','readwrite');tx.objectStore('files').put(blob,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{conn.close()}}
export default function Attachments({items=[]}:{items?:Attachment[]}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState('');
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
 return <section className="panel attachment-list"><h2>行程原始附件</h2><p className="muted">撳右上角帳戶開啟自動同步，就會連同原檔同步。其他裝置同步完成後可下載附件；JSON 備份只包含附件資料，唔包括原檔。</p>{items.map(a=><button className="compact-stop" key={a.id} disabled={!!busy} onClick={()=>download(a)}><span>📎</span><span><b>{a.name}</b><small>{(a.size/1024).toFixed(0)} KB · {busy===a.id?'讀取中…':a.cloudPath?'雲端附件 · 下載原檔':'本機附件 · 下載原檔（上傳後讀取雲端可確認）'}</small></span></button>)}{!items.length&&<p className="empty-small">未有附件</p>}{message&&<p role="status">{message}</p>}</section>
}
