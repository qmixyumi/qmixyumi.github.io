'use client';
import {useState} from 'react';
import {Clapperboard,Copy,Download} from 'lucide-react';
import type {Trip,Stop,Shot} from './model';
import {dateAt,uid} from './model';
const label={shot:'🎬 必拍鏡頭',line:'🎙 旁白重點'};
/** Per-stop must-get shots and voice-over points, ticked off on the day. */
export function ShotList({stop,onChange}:{stop:Stop;onChange:(shots:Shot[])=>void}){
 const [text,setText]=useState(''),[kind,setKind]=useState<Shot['kind']>('shot');const shots=stop.shots||[];
 return <div className="shot-list"><h3><Clapperboard size={16}/> 拍攝清單 <small>{shots.filter(s=>s.done).length} / {shots.length} 已拍</small></h3>
  {shots.map(s=><label key={s.id} className={'check-row shot-row'+(s.done?' done':'')}><input type="checkbox" checked={s.done} onChange={()=>onChange(shots.map(x=>x.id===s.id?{...x,done:!x.done}:x))}/><span><small>{label[s.kind]}</small>{s.text}</span><button type="button" className="text-btn danger" aria-label={'移除 '+s.text} onClick={e=>{e.preventDefault();onChange(shots.filter(x=>x.id!==s.id))}}>移除</button></label>)}
  <form className="inline-form shot-form" onSubmit={e=>{e.preventDefault();const v=text.trim();if(!v)return;onChange([...shots,{id:uid(),kind,text:v.slice(0,200),done:false}]);setText('')}}><select value={kind} aria-label="拍攝類型" onChange={e=>setKind(e.target.value as Shot['kind'])}><option value="shot">🎬 鏡頭</option><option value="line">🎙 旁白</option></select><input value={text} onChange={e=>setText(e.target.value)} placeholder={kind==='shot'?'例如：清水舞台全景、慢鏡行上坡':'例如：講返點解揀呢間'} maxLength={200}/><button className="secondary">加入</button></form>
 </div>;
}
export function shotText(trip:Trip){const lines=[`${trip.name} · 拍攝清單`];for(let d=1;d<=Math.round((Date.parse(trip.end)-Date.parse(trip.start))/86400000)+1;d++){const stops=trip.stops.filter(s=>s.day===d&&(s.shots||[]).length).sort((a,b)=>a.time.localeCompare(b.time));if(!stops.length)continue;lines.push('',`DAY ${d} · ${dateAt(trip,d)}`);for(const s of stops){lines.push(`${s.time} ${s.title}`);for(const x of s.shots!)lines.push(`  [${x.done?'✓':' '}] ${x.kind==='shot'?'鏡頭':'旁白'}：${x.text}`)}}return lines.join('\n')}
/** Trip-wide overview, so after the trip the footage can be sorted by day and stop. */
export function ShotOverview({trip,onToggle,onOpen,onAdd}:{trip:Trip;onToggle:(stopId:string,shotId:string)=>void;onOpen:(s:Stop)=>void;onAdd:(stopId:string,shot:Shot)=>void}){
 const [msg,setMsg]=useState(''),[pick,setPick]=useState(''),[kind,setKind]=useState<Shot['kind']>('shot'),[text,setText]=useState('');
 const choices=trip.stops.filter(s=>!s.deletedAt&&s.status!=='取消').sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time));const stops=trip.stops.filter(s=>(s.shots||[]).length).sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time));
 const all=stops.flatMap(s=>s.shots!),done=all.filter(s=>s.done).length;
 return <section className="panel shot-overview"><div className="section-title"><div><h2>🎬 拍攝清單</h2><p className="muted">揀一個行程，就可以喺度直接加必拍鏡頭同旁白重點。</p></div><span className="tag">已拍 {done} / {all.length}</span></div>
  {stops.map(s=><div key={s.id} className="shot-stop"><button className="text-btn" onClick={()=>onOpen(s)}>DAY {s.day} · {s.time} {s.title}</button>{s.shots!.map(x=><label key={x.id} className={'check-row shot-row'+(x.done?' done':'')}><input type="checkbox" checked={x.done} onChange={()=>onToggle(s.id,x.id)}/><span><small>{label[x.kind]}</small>{x.text}</span></label>)}</div>)}
  {choices.length>0&&<form className="inline-form shot-form shot-add" onSubmit={e=>{e.preventDefault();const v=text.trim();const sid=pick||choices[0].id;if(!v)return;onAdd(sid,{id:uid(),kind,text:v.slice(0,200),done:false});setText('');setMsg('已加入')}}><select aria-label="揀行程" value={pick||choices[0].id} onChange={e=>setPick(e.target.value)}>{choices.map(s=><option key={s.id} value={s.id}>DAY {s.day} · {s.time} {s.title.slice(0,24)}</option>)}</select><select value={kind} aria-label="拍攝類型" onChange={e=>setKind(e.target.value as Shot['kind'])}><option value="shot">🎬 鏡頭</option><option value="line">🎙 旁白</option></select><input value={text} onChange={e=>setText(e.target.value)} placeholder={kind==='shot'?'例如：清水舞台全景':'例如：講返點解揀呢度'} maxLength={200}/><button className="secondary">加入</button></form>}
  {!all.length&&<p className="empty-small">未有拍攝清單</p>}
  {all.length>0&&<div className="actions"><button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(shotText(trip));setMsg('已複製拍攝清單')}catch{setMsg('未能複製')}}}><Copy size={15}/> 複製清單</button><button className="secondary" onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([shotText(trip)],{type:'text/plain;charset=utf-8'}));a.download=trip.name+'-拍攝清單.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}}><Download size={15}/> 下載 .txt（剪片用）</button></div>}
  {msg&&<p role="status">{msg}</p>}
 </section>;
}
