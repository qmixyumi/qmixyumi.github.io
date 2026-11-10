import type {Data} from './model';
import {mergeData,same,emptyData,type Conflict,type Choices} from './sync-merge';
export type Base={data:Data;version:number};
export type SyncState={phase:'idle'|'busy'|'conflict'|'error'|'synced';message:string;conflicts:Conflict[];last?:string};
export type SyncIO={get:()=>Data;apply:(d:Data)=>void;read:()=>Promise<Base>;write:(version:number,data:Data)=>Promise<number>;attachments:(d:Data)=>Promise<Data>;persist:(b:Base)=>Promise<void>;checkpoint:(d:Data,reason:string)=>Promise<void>;valid:(v:unknown)=>v is Data;notify:(s:SyncState)=>void};
export class SyncEngine{
 base:Base|undefined;busy=false;stopped=false;pending:{base:Data;local:Data;remote:Base}|undefined;
 constructor(private io:SyncIO,base?:Base){this.base=base}
 stop(){this.stopped=true}
 private tell(phase:SyncState['phase'],message:string,conflicts:Conflict[]=[]){if(!this.stopped)this.io.notify({phase,message,conflicts,...(phase==='synced'?{last:new Date().toISOString()}: {})})}
 private async conflict(base:Data,local:Data,remote:Base,conflicts:Conflict[]){await this.io.checkpoint(local,'修改衝突前本機備份');if(this.stopped)return;this.pending={base,local,remote};this.tell('conflict','有同一欄位被兩邊修改，請選擇保留版本。其他修改仍留喺本機。',conflicts)}
 async run(){if(this.busy||this.stopped||this.pending)return;this.busy=true;this.tell('busy','正在核對雲端修改…');try{
  const remote=await this.io.read();if(this.stopped)return;if(!this.io.valid(remote.data))throw Error('雲端格式不相容，已停止同步並保留本機資料。');
  const local=structuredClone(this.io.get()),base=this.base?.data||emptyData();const merged=mergeData(base,local,remote.data);
  if(merged.conflicts.length){await this.conflict(base,local,remote,merged.conflicts);return}
  if(!this.io.valid(merged.data))throw Error('合併後資料需要核對，請先匯出備份，未有寫入雲端。');
  if(!same(local,merged.data))await this.io.checkpoint(local,'自動合併前本機備份');if(this.stopped)return;
  let saved=remote;
  if(!same(merged.data,remote.data)){const uploaded=await this.io.attachments(merged.data);if(this.stopped)return;const version=await this.io.write(remote.version,uploaded);saved={data:uploaded,version}}
  if(this.stopped)return;
  // Rebase edits made while the request was in flight; never replace a newer local draft.
  const current=structuredClone(this.io.get());const rebased=mergeData(local,current,saved.data);
  if(rebased.conflicts.length){await this.conflict(local,current,saved,rebased.conflicts);return}
  if(!this.io.valid(rebased.data))throw Error('新修改需要核對，已保留本機內容。');
  // Update the local draft synchronously BEFORE persisting the new baseline.
  // A failed baseline write is safe: subsequent merges conservatively retain/conflict.
  this.io.apply(rebased.data);await this.io.persist(saved);if(this.stopped)return;this.base=saved;
  this.tell(same(rebased.data,saved.data)?'synced':'idle',same(rebased.data,saved.data)?'已同步至雲端':'新修改已保留，等待下一次同步');
 }catch(e){this.tell('error',e instanceof Error?e.message:'同步失敗，修改仍保留喺本機，稍後自動重試。')}finally{this.busy=false}}
 async resolve(choices:Choices){if(!this.pending||this.busy||this.stopped)return;this.busy=true;try{const p=this.pending;if(!same(p.local,this.io.get())){this.pending=undefined;this.tell('idle','本機內容已改動，會重新核對衝突。');return}const merged=mergeData(p.base,p.local,p.remote.data,choices);if(merged.conflicts.length)throw Error('請為每項衝突選擇保留版本。');if(!this.io.valid(merged.data))throw Error('所選組合不完整，請重新選擇。');await this.io.checkpoint(p.local,'確認衝突選擇前備份');if(this.stopped)return;if(!same(p.local,this.io.get())){this.pending=undefined;this.tell('idle','本機內容已改動，會重新核對。');return}this.io.apply(merged.data);await this.io.persist(p.remote);if(this.stopped)return;this.base=p.remote;this.pending=undefined;this.tell('idle','已保留選擇，正在重新核對最新雲端版本。')}catch(e){this.tell('conflict',e instanceof Error?e.message:'未能保留選擇',this.pending?mergeData(this.pending.base,this.pending.local,this.pending.remote.data).conflicts:[])}finally{this.busy=false}}
}
