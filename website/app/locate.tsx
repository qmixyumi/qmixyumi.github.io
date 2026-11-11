'use client';
import {useState,useRef,useEffect} from 'react';
import {MapPin} from 'lucide-react';
import type {Trip,Stop} from './model';
import {kinds} from './model';
import {geocodeOptions,type Located} from './real-map';
type Found={stop:Stop;options:{lat:number;lng:number;label:string}[];pick:number;error?:string};
export const unlocated=(t:Trip)=>t.stops.filter(s=>!s.deletedAt&&s.status!=='取消'&&!(typeof s.lat==='number'&&typeof s.lng==='number'));
/** Locate every unplaced stop of the trip in one go, then let the person check same-named places before saving. */
export default function LocateReview({trip,onSave,onLater}:{trip:Trip;onSave:(found:Located[])=>void;onLater:()=>void}){
 const missing=unlocated(trip);const [rows,setRows]=useState<Found[]>([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');const stop=useRef(false);
 useEffect(()=>()=>{stop.current=true},[]);
 async function run(){setBusy(true);stop.current=false;const out:Found[]=[];
  for(const [i,s] of missing.entries()){if(stop.current)break;setMsg(`搜尋 ${i+1}/${missing.length}：${s.place||s.title}`);
   try{let options=await geocodeOptions([s.place||s.title,trip.destination].filter(Boolean).join(' '));if(!options.length&&s.place){await new Promise(r=>setTimeout(r,1100));options=await geocodeOptions(s.place)}out.push({stop:s,options,pick:options.length?0:-1})}
   catch(e){out.push({stop:s,options:[],pick:-1,error:e instanceof Error?e.message:'搜尋失敗'})}
   setRows([...out]);await new Promise(r=>setTimeout(r,1100))}
  setBusy(false);setMsg(`搵到 ${out.filter(r=>r.options.length).length} / ${missing.length} 個；請核對城市，揀錯可以改其他結果或略過。`)}
 const chosen=rows.filter(r=>r.pick>=0);
 return <section className="locate-review"><h2><MapPin size={20}/> 定位並核對地點</h2>
  <p>「{trip.name}」有 {missing.length} 個地點未定位。一次過搜尋，你核對同名地點後先儲存，避免揀錯城市。地點名稱會傳送到 OpenStreetMap 搜尋。</p>
  {!rows.length&&!busy&&<div className="modal-actions"><button type="button" className="secondary" onClick={onLater}>稍後再做</button><button type="button" className="primary" disabled={!missing.length} onClick={run}>開始搜尋 {missing.length} 個地點</button></div>}
  {msg&&<p role="status">{msg}</p>}
  <div className="locate-list">{rows.map((r,i)=><fieldset key={r.stop.id}><legend>{kinds[r.stop.kind]||'📍'} DAY {r.stop.day} · {r.stop.title}</legend>{r.options.map((o,j)=><label className="check-row" key={j}><input type="radio" name={'loc-'+r.stop.id} checked={r.pick===j} onChange={()=>setRows(rows.map((x,k)=>k===i?{...x,pick:j}:x))}/><span>{o.label}</span></label>)}{(r.options.length>0)&&<label className="check-row"><input type="radio" name={'loc-'+r.stop.id} checked={r.pick===-1} onChange={()=>setRows(rows.map((x,k)=>k===i?{...x,pick:-1}:x))}/><span>略過，之後喺編輯任務填更完整地址</span></label>}{!r.options.length&&<p className="muted">{r.error||'搵唔到，可以喺編輯任務填更完整地址'}</p>}</fieldset>)}</div>
  {rows.length>0&&<div className="modal-actions"><button type="button" className="secondary" onClick={()=>{stop.current=true;onLater()}}>取消</button><button type="button" className="primary" disabled={busy||!chosen.length} onClick={()=>onSave(chosen.map(r=>({id:r.stop.id,lat:r.options[r.pick].lat,lng:r.options[r.pick].lng})))}>{busy?'搜尋中…':`儲存 ${chosen.length} 個定位`}</button></div>}
 </section>;
}
