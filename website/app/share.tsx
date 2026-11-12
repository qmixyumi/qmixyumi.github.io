'use client';
import {useEffect,useState} from 'react';
import {Copy,Share2,Navigation,X} from 'lucide-react';
import type {Trip} from './model';
import {kinds,dateAt,days} from './model';
import './share.css';
/** A read-only snapshot of one trip, packed into the link itself (after #, so it never reaches any server).
 * It holds the plan only: no spending, diary, photos, booking numbers or seats. */
type SharedStop={d:number;t:string;e:string;n:string;k:string;p:string;o:string;b:string;la?:number;ln?:number};
type SharedTicket={y:string;f:string;to:string;dep:string;arr:string;no:string};
export type SharedPlan={v:1;name:string;dest:string;start:string;end:string;zone:string;stops:SharedStop[];tickets:SharedTicket[];at:string};
const ticketLabel:Record<string,string>={flight:'✈ 飛機',train:'🚆 火車','high-speed':'🚄 高鐵'};
export function planOf(trip:Trip):SharedPlan{
 const stops=trip.stops.filter(s=>!s.deletedAt&&s.status!=='取消').sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time)).map(s=>({d:s.day,t:s.time,e:s.end||'',n:s.title,k:s.kind,p:s.place||'',o:s.note||'',b:s.planB||'',...(typeof s.lat==='number'&&typeof s.lng==='number'?{la:Math.round(s.lat*1e5)/1e5,ln:Math.round(s.lng*1e5)/1e5}:{})}));
 const tickets=(trip.tickets||[]).filter(t=>!t.deletedAt).map(t=>({y:t.type,f:t.from,to:t.to,dep:t.departure,arr:t.arrival,no:t.number}));
 return {v:1,name:trip.name,dest:trip.destination,start:trip.start,end:trip.end,zone:trip.timezone||'',stops,tickets,at:new Date().toISOString().slice(0,10)};
}
const b64url=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const fromB64url=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function pipe(bytes:Uint8Array,stream:CompressionStream|DecompressionStream){return new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer())}
export async function shareLink(trip:Trip,origin=location.origin){
 const json=new TextEncoder().encode(JSON.stringify(planOf(trip)));
 return origin+'/#share='+b64url(await pipe(json,new CompressionStream('deflate-raw')));
}
export async function readShared(hash:string):Promise<SharedPlan>{
 const raw=hash.replace(/^#share=/,'');if(!raw||raw.length>200000)throw Error('分享連結唔完整');
 const p=JSON.parse(new TextDecoder().decode(await pipe(fromB64url(raw),new DecompressionStream('deflate-raw')))) as SharedPlan;
 if(p?.v!==1||typeof p.name!=='string'||!Array.isArray(p.stops)||!/^\d{4}-\d{2}-\d{2}$/.test(p.start)||!/^\d{4}-\d{2}-\d{2}$/.test(p.end))throw Error('分享連結格式唔啱');
 return p;
}
export const isShareHash=(h:string)=>h.startsWith('#share=');
const mapUrl=(s:SharedStop)=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(typeof s.la==='number'?s.la+','+s.ln:(s.p||s.n));
/** The page friends see. Nothing here reads or writes this device's own trips. */
export function SharedView(){
 const [plan,setPlan]=useState<SharedPlan|null>(null),[error,setError]=useState('');
 useEffect(()=>{readShared(location.hash).then(setPlan).catch(e=>setError(e instanceof Error?e.message:'未能打開分享連結'))},[]);
 useEffect(()=>{if(plan)document.title=plan.name+' · 行程分享'},[plan]);
 if(error)return <main className="shared-page"><section className="shared-card"><h1>打唔開呢個分享連結</h1><p>{error}。請叫分享嘅人再傳一次完整連結。</p></section></main>;
 if(!plan)return <main className="shared-page"><p>載入緊行程…</p></main>;
 const n=days({start:plan.start,end:plan.end} as Trip);const trip={start:plan.start} as Trip;
 return <main className="shared-page">
  <header className="shared-head"><span className="eyebrow">QMI × YUMI · 行程分享（唯讀）</span><h1>{plan.name}</h1><p>{plan.dest}{plan.dest?' · ':''}{plan.start} → {plan.end} · {n} 日</p><small>呢個係 {plan.at} 嘅行程快照，之後嘅修改唔會自動更新。</small></header>
  {plan.tickets.length>0&&<section className="shared-card"><h2>交通</h2>{plan.tickets.map((t,i)=><p key={i} className="shared-ticket"><b>{ticketLabel[t.y]||'交通'} {t.no}</b><span>{t.f} → {t.to}</span><small>{t.dep.replace('T',' ')}{t.arr?' → '+t.arr.replace('T',' '):''}</small></p>)}</section>}
  {Array.from({length:n},(_,i)=>i+1).map(d=>{const list=plan.stops.filter(s=>s.d===d);return <section className="shared-card" key={d}><h2>DAY {String(d).padStart(2,'0')} <small>{dateAt(trip,d)}</small></h2>
   {list.length?list.map((s,i)=><div className="shared-stop" key={i}><span className="shared-time">{s.t}{s.e?'–'+s.e:''}</span><div><b>{kinds[s.k]||'📍'} {s.n}</b>{s.p&&<small>{s.p}</small>}{s.o&&<p>{s.o}</p>}{s.b&&<p>☂ 雨天備案：{s.b}</p>}<a href={mapUrl(s)} target="_blank" rel="noreferrer"><Navigation size={13}/> 地圖</a></div></div>):<p className="muted">當日未有安排</p>}
  </section>})}
  <footer className="shared-foot">QMI × YUMI 旅行冒險日誌 · 唯讀分享</footer>
 </main>;
}
/** Button + small panel used inside the app to make the link. */
export function ShareTrip({trip}:{trip:Trip}){
 const [open,setOpen]=useState(false),[link,setLink]=useState(''),[msg,setMsg]=useState('');
 async function make(){setOpen(true);setMsg('');try{const l=await shareLink(trip);setLink(l);if(l.length>12000)setMsg('行程好長，部分通訊程式可能會截短條連結；可以改用「複製連結」再貼上。')}catch{setMsg('呢個瀏覽器做唔到分享連結，請更新瀏覽器再試。')}}
 return <>
  <button className="secondary" onClick={make}><Share2 size={15}/> 分享行程</button>
  {open&&<div className="share-panel" role="dialog" aria-label="分享行程">
   <div className="section-title"><h3>俾朋友睇嘅唯讀連結</h3><button className="icon-btn" aria-label="關閉" onClick={()=>setOpen(false)}><X size={18}/></button></div>
   <p className="muted">朋友唔使登入都睇到每日行程、地點同交通班次。唔會包括旅費、日記、相片、預約編號同座位。連結係而家嘅快照，之後改咗行程要再分享一次。</p>
   {link&&<div className="actions">{typeof navigator.share==='function'&&<button className="primary" onClick={()=>navigator.share({title:trip.name,text:trip.name+' 行程',url:link}).catch(()=>{})}><Share2 size={15}/> 分享</button>}<button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(link);setMsg('已複製連結')}catch{setMsg('未能自動複製，請長按下面條連結複製')}}}><Copy size={15}/> 複製連結</button><a className="text-btn" href={link} target="_blank" rel="noreferrer">預覽</a></div>}
   {link&&<input className="share-url" readOnly value={link} onFocus={e=>e.currentTarget.select()} aria-label="分享連結"/>}
   {msg&&<p role="status">{msg}</p>}
  </div>}
 </>;
}
