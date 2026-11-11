'use client';
import {useState,useMemo} from 'react';
import {Search} from 'lucide-react';
import type {Data} from './model';
import {kinds,dateAt} from './model';
import {alive} from './travel-tools';
import {questTitles} from './quest-model';
export type SearchHit={group:string;title:string;sub:string;tab:string;tripId?:string;day?:number;id?:string};
const groupOf:Record<string,string>={酒店:'酒店',美食:'餐廳／美食',景點:'景點',交通:'交通',購物:'購物',活動:'活動',日常:'行程'};
const order=['旅程','行程','景點','酒店','餐廳／美食','交通','購物','活動','票券','日記','評鑑','旅費','拍攝清單','準備事項'];
/** One search across trips, hotels, restaurants, tickets, journal and ratings. */
export function searchAll(data:Data,query:string):SearchHit[]{
 const q=query.trim().toLowerCase();if(!q)return [];
 const has=(...v:(string|undefined)[])=>v.some(x=>x?.toLowerCase().includes(q));const hits:SearchHit[]=[];
 for(const t of alive(data.trips)){
  if(has(t.name,t.destination))hits.push({group:'旅程',title:t.name,sub:`${t.destination} · ${t.start} → ${t.end}`,tab:'大廳',tripId:t.id});
  for(const s of alive(t.stops)){const shot=(s.shots||[]).find(x=>has(x.text));
   if(has(s.title,s.place,s.note,s.booking,s.planB,...Object.values(s.details||{})))hits.push({group:groupOf[s.kind]||'行程',title:`${kinds[s.kind]||'📍'} ${s.title}`,sub:`${t.name} · DAY ${s.day} ${dateAt(t,s.day)} ${s.time}${s.place?' · '+s.place:''}`,tab:'行程地圖',tripId:t.id,day:s.day,id:s.id});
   else if(shot)hits.push({group:'拍攝清單',title:`${shot.kind==='shot'?'🎬':'🎙'} ${shot.text}`,sub:`${s.title} · ${t.name} DAY ${s.day}`,tab:'行程地圖',tripId:t.id,day:s.day,id:s.id})}
  for(const k of alive(t.tickets||[]))if(has(k.number,k.from,k.to,k.seat,k.note))hits.push({group:'票券',title:`${k.number} ${k.from} → ${k.to}`,sub:`${t.name} · ${k.departure.replace('T',' ')}`,tab:'交通票券',tripId:t.id,id:k.id});
  for(const n of alive(t.notes))if(has(n.text))hits.push({group:'日記',title:n.text.slice(0,60),sub:`${t.name} · ${n.date}`,tab:'回憶成就',tripId:t.id,id:n.id});
  for(const e of alive(t.expenses))if(has(e.title,e.category))hits.push({group:'旅費',title:e.title,sub:`${t.name} · ${e.date} · ${e.currency} ${e.amount}`,tab:'旅費帳簿',tripId:t.id,id:e.id});
  for(const c of alive(t.checks))if(has(c.title))hits.push({group:'準備事項',title:c.title,sub:`${t.name} · ${c.done?'已完成':'未完成'}`,tab:'旅行背包',tripId:t.id,id:c.id});
 }
 for(const e of data.quest?.entries||[])if(has(e.name,e.region,e.review,e.notes,e.category))hits.push({group:'評鑑',title:e.name,sub:`${questTitles[e.kind]}${e.region?' · '+e.region:''}`,tab:'冒險評鑑',id:e.id});
 return hits.sort((a,b)=>order.indexOf(a.group)-order.indexOf(b.group)).slice(0,80);
}
export default function SearchPanel({data,onPick}:{data:Data;onPick:(h:SearchHit)=>void}){
 const [q,setQ]=useState('');const hits=useMemo(()=>searchAll(data,q),[data,q]);
 const groups=[...new Set(hits.map(h=>h.group))];
 return <section className="site-search"><h2>全站搜尋</h2>
  <label className="search-box"><Search size={18}/><input autoFocus type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋景點、票券、日記、餐廳、酒店…" aria-label="全站搜尋"/></label>
  {q.trim()&&!hits.length&&<p className="empty-small">搵唔到「{q}」</p>}
  {groups.map(g=><div key={g} className="search-group"><h3>{g}<small>{hits.filter(h=>h.group===g).length}</small></h3>{hits.filter(h=>h.group===g).map((h,i)=><button key={g+i} className="compact-stop" onClick={()=>onPick(h)}><span><b>{h.title}</b><small>{h.sub}</small></span></button>)}</div>)}
  {!q.trim()&&<p className="muted">可以打地方名、班次號碼、餐廳名、日記入面嘅字。快捷鍵：Ctrl／⌘ + K</p>}
 </section>;
}
