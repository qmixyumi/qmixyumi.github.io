'use client';
import {useEffect,useRef} from 'react';
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

/** Up to three candidates, so a place with the same name in another city can be spotted before saving. */
export async function geocodeOptions(query:string):Promise<{lat:number;lng:number;label:string}[]>{
 const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&accept-language=zh-HK,zh,en&q='+encodeURIComponent(query),{signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('地點搜尋服務暫時未能使用');
 const x=await r.json() as {lat:string;lon:string;display_name:string}[];
 return x.map(h=>({lat:Number(h.lat),lng:Number(h.lon),label:h.display_name})).filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng));
}
export default function RealMap({stops,selected,onSelect,onReview}:{stops:Stop[];selected?:string;onSelect:(id:string)=>void;onReview:()=>void}){
 const box=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layer=useRef<L.LayerGroup|null>(null);
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
 return <div className="real-map">
  <div ref={box} className="real-map-canvas" role="region" aria-label="真實地圖"/>
  <div className="real-map-bar"><span>{placed.length} / {stops.length} 個地點已定位</span>
   {missing.length>0&&<button className="secondary" onClick={onReview}>定位並核對未定位地點</button>}
   <small>地點名稱會傳送到 OpenStreetMap 搜尋座標；結果會儲存喺行程入面。</small>
  </div>
 </div>;
}
