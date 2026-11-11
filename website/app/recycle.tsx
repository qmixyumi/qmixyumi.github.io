'use client';
import {useState} from 'react';
import type {Data} from './model';
import {dateAt,amount,kinds} from './model';
import {splitText} from './split';
import {trashRows,type BinKind,type BinRow} from './travel-tools';
const kindName:Record<BinKind,string>={trips:'旅程',stops:'行程',expenses:'旅費',tickets:'票券',notes:'日記',checks:'準備事項',settlements:'還款'};
type Row=BinRow&{trip:string;when:string;lines:string[]};
/** Adds the trip name, the item's own date and a preview so same-named items from different trips can be told apart. */
export function describeTrash(data:Data):Row[]{
 return trashRows(data).map(r=>{const t=data.trips.find(x=>x.id===r.tripId)!;let when='',lines:string[]=[];
  if(r.kind==='trips'){when=`${t.start} → ${t.end}`;lines=[`目的地：${t.destination||'未填'}`,`${t.stops.filter(s=>!s.deletedAt).length} 個行程 · ${t.expenses.filter(e=>!e.deletedAt).length} 筆旅費 · ${(t.tickets||[]).filter(x=>!x.deletedAt).length} 張票券 · ${t.notes.filter(n=>!n.deletedAt).length} 篇日記`]}
  else if(r.kind==='stops'){const s=t.stops.find(x=>x.id===r.id)!;when=`DAY ${s.day} · ${dateAt(t,s.day)} ${s.time}${s.end?'–'+s.end:''}`;lines=[`${kinds[s.kind]||''} ${s.kind} · ${s.status}`,s.place&&'地點：'+s.place,s.booking&&'預約：'+s.booking,s.note&&'備註：'+s.note].filter(Boolean) as string[]}
  else if(r.kind==='expenses'){const e=t.expenses.find(x=>x.id===r.id)!;when=e.date;lines=[`${e.currency} ${amount(e.amount)} ≈ HKD ${amount(e.amount*e.rate)}`,`${e.payer} 付 · 分攤：${splitText(e)} · ${e.status}`,`分類：${e.category}`]}
  else if(r.kind==='tickets'){const k=(t.tickets||[]).find(x=>x.id===r.id)!;when=k.departure.replace('T',' ');lines=[`${k.number} · ${k.from} → ${k.to}`,k.seat&&'座位：'+k.seat,k.note].filter(Boolean) as string[]}
  else if(r.kind==='notes'){const n=t.notes.find(x=>x.id===r.id)!;when=n.date;lines=[n.text]}
  else if(r.kind==='checks'){const c=t.checks.find(x=>x.id===r.id)!;lines=[c.done?'已完成':'未完成']}
  else {const s=(t.settlements||[]).find(x=>x.id===r.id)!;when=s.date;lines=[`${s.from} 還 ${s.to} HKD ${amount(s.amount)}`]}
  return {...r,trip:t.name,when,lines}}).sort((a,b)=>b.at.localeCompare(a.at));
}
export default function RecycleBin({data,onRestore}:{data:Data;onRestore:(r:BinRow)=>void}){
 const [q,setQ]=useState(''),[kind,setKind]=useState(''),[trip,setTrip]=useState(''),[open,setOpen]=useState('');
 const all=describeTrash(data);const text=q.trim().toLowerCase();
 const rows=all.filter(r=>(!kind||r.kind===kind)&&(!trip||r.tripId===trip)&&(!text||[r.title,r.trip,r.when,...r.lines].some(x=>x.toLowerCase().includes(text))));
 const trips=[...new Map(all.map(r=>[r.tripId,r.trip])).entries()];
 return <section className="panel recycle"><h2>回收區</h2><p>記錄只會隱藏，唔會永久清除；旅費移入後唔再計入結算。還原整個旅程會保留原有項目狀態。</p>
  {all.length>0&&<div className="recycle-filters"><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋名稱、旅程、日期…" aria-label="搜尋回收區"/><select value={kind} onChange={e=>setKind(e.target.value)} aria-label="類型"><option value="">全部類型</option>{(Object.keys(kindName) as BinKind[]).filter(k=>all.some(r=>r.kind===k)).map(k=><option key={k} value={k}>{kindName[k]}</option>)}</select><select value={trip} onChange={e=>setTrip(e.target.value)} aria-label="旅程"><option value="">全部旅程</option>{trips.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></div>}
  {rows.map(r=><div className="bin-row" key={r.kind+r.id}><span><b>{r.title}</b><small>{kindName[r.kind]} · {r.trip}{r.when&&' · '+r.when}</small><small>刪除於 {new Date(r.at).toLocaleString('zh-HK')}</small>{open===r.kind+r.id&&<span className="bin-preview">{r.lines.map((l,i)=><span key={i}>{l}</span>)}</span>}</span><span className="bin-actions"><button className="text-btn" onClick={()=>setOpen(open===r.kind+r.id?'':r.kind+r.id)}>{open===r.kind+r.id?'收起':'預覽'}</button><button className="secondary" onClick={()=>onRestore(r)}>還原</button></span></div>)}
  {!all.length?<p>回收區暫時冇記錄</p>:!rows.length&&<p>冇符合篩選嘅記錄</p>}
 </section>;
}
