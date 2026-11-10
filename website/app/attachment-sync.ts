import type {SupabaseClient} from '@supabase/supabase-js';
import type {Data} from './model';
export const ATTACHMENT_BUCKET='adventure-attachments';
export const MAX_ATTACHMENT_BYTES=20*1024*1024;
export function storageProblem(error:{message:string}){return new Error('附件雲端未能完成：'+error.message+'。請確認已執行附件 Storage SQL、帳戶獲授權，同埋網絡正常，再重試。')}
export async function fileDigest(blob:Blob){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('')}
export async function syncAttachments(data:Data,client:SupabaseClient,readLocal:(id:string)=>Promise<Blob|undefined>,progress:(s:string)=>void):Promise<Data>{
 const snapshot=structuredClone(data);
 const bucket=client.storage.from(ATTACHMENT_BUCKET);
 const items=[...snapshot.trips.flatMap(t=>t.attachments||[]),...(snapshot.photos||[])];
 const verified=new Set<string>();
 async function exists(path:string){
  if(!/^attachments\/[a-f0-9]{64}$/.test(path))throw Error('附件雲端路徑格式無效');
  if(verified.has(path))return true;
  const name=path.slice('attachments/'.length);
  const {data:rows,error}=await bucket.list('attachments',{search:name,limit:100});
  if(error)throw storageProblem(error);
  const found=rows?.some(row=>row.name===name)??false;
  if(found)verified.add(path);
  return found;
 }
 for(let i=0;i<items.length;i++){
  const item=items[i];progress(`附件 ${i+1}/${items.length}：檢查 ${item.name}…`);
  if(item.cloudPath&&await exists(item.cloudPath))continue;
  const blob=await readLocal(item.id);
  if(!blob)throw Error(`「${item.name}」原檔唔喺呢部裝置，亦未能喺雲端找到。請用原本儲存附件嘅裝置上傳；今次未有儲存旅程到雲端。`);
  if(blob.size>MAX_ATTACHMENT_BYTES)throw Error(`「${item.name}」超過附件上限 20MB。`);
  if(blob.size!==item.size)throw Error(`「${item.name}」原檔大小同記錄唔一致，未有上傳。`);
  const path='attachments/'+await fileDigest(blob);
  if(item.cloudPath&&item.cloudPath!==path)throw Error(`「${item.name}」原檔同雲端記錄唔一致，未有上傳。`);
  if(!await exists(path)){
   progress(`附件 ${i+1}/${items.length}：上傳 ${item.name}…`);
   const {error}=await bucket.upload(path,blob,{upsert:false,contentType:'application/octet-stream'});
   // Another member may have uploaded the same immutable bytes while we were checking.
   if(error&&!await exists(path))throw storageProblem(error);
   verified.add(path);
  }
  item.cloudPath=path;
 }
 progress(`附件已完成（${items.length} 個），正在儲存旅程…`);
 return snapshot;
}
