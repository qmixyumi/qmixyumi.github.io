'use client';
import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {Stop} from './model';
import {kinds} from './model';

export type Located={id:string;lat:number;lng:number};

// OpenStreetMap Nominatim allows light, non-bulk use: one request per second, results cached on the stop.
export async function geocode(query:string,signal?:AbortSignal):Promise<{lat:number;lng:number}|null>{
 const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-HK,zh,en&q='+encodeURIComponent(query),{signal:signal||AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('地點搜尋服務暫時未能使用');
 const x=await r.json() as {lat:string;lon:string}[];
 if(!x.length)return null;
 const lat=Number(x[0].lat),lng=Number(x[0].lon);
 return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
}

export default function RealMap({stops,destination,selected,onSelect,onLocated}:{stops:Stop[];destination:string;selected?:string;onSelect:(id:string)=>void;onLocated:(found:Located[])=>void}){
 const box=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layer=useRef<L.LayerGroup|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const placed=stops.filter(s=>typeof s.lat==='number'&&typeof s.lng==='number');
 const missing=stops.filter(s=>!(typeof s.lat==='number'&&typeof s.lng==='number'));
 useEffect(()=>{if(!box.current||map.current)return;
  map.current=L.map(box.current,{scrollWheelZoom:false}).setView([22.3,114.17],3);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map.current);
  layer.current=L.layerGroup().addTo(map.current);
  return()=>{map.current?.remove();map.current=null}},[]);
 useEffect(()=>{const m=map.current,g=layer.current;if(!m||!g)return;g.clearLayers();
  const points=placed.map(s=>[s.lat!,s.lng!] as [number,number]);
  placed.forEach((s,i)=>{const icon=L.divIcon({className:'real-pin'+(s.id===selected?' selected':'')+(s.status==='已到訪'?' done':''),html:`<span>${kinds[s.kind]||'📍'}</span><i>${stops.indexOf(s)+1}</i>`,iconSize:[38,38],iconAnchor:[19,19]});
   L.marker(points[i],{icon,title:`${s.time} ${s.title}`}).on('click',()=>onSelect(s.id)).bindTooltip(`${s.time} ${s.title}`).addTo(g)});
  if(points.length>1)L.polyline(points,{color:'#a37b43',weight:3,dashArray:'6 6'}).addTo(g);
  if(points.length)m.fitBounds(L.latLngBounds(points).pad(.25),{maxZoom:15});
  setTimeout(()=>m.invalidateSize(),50);
 },[stops,selected]);
 async function locate(){setBusy(true);const found:Located[]=[];
  try{for(const [i,s] of missing.entries()){setMessage(`搜尋地點 ${i+1}/${missing.length}：${s.place||s.title}`);
    let hit=await geocode([s.place||s.title,destination].filter(Boolean).join(' '));
    if(!hit&&s.place)hit=await geocode(s.place);
    if(hit)found.push({id:s.id,...hit});
    await new Promise(r=>setTimeout(r,1100));}
   onLocated(found);
   const failed=missing.length-found.length;
   setMessage(`已定位 ${found.length} 個地點`+(failed?`；${failed} 個搵唔到，可以喺編輯任務填更完整地址或座標。`:'。'));
  }catch(e){if(found.length)onLocated(found);setMessage(e instanceof Error?e.message:'未能定位地點')}finally{setBusy(false)}}
 return <div className="real-map">
  <div ref={box} className="real-map-canvas" role="region" aria-label="真實地圖"/>
  <div className="real-map-bar"><span>{placed.length} / {stops.length} 個地點已定位</span>
   {missing.length>0&&<button className="secondary" disabled={busy} onClick={locate}>{busy?'定位中…':`自動定位 ${missing.length} 個地點`}</button>}
   <small>地點名稱會傳送到 OpenStreetMap 搜尋座標；結果會儲存喺行程入面。</small>
  </div>
  {message&&<p role="status" className="muted">{message}</p>}
 </div>;
}
