'use client';
import {useState} from 'react';
import {Share2,CalendarPlus,Copy} from 'lucide-react';
import type {Trip,Stop,Expense} from './model';
import {amount,dateAt,kinds} from './model';

// Frankfurter (ECB) reference currencies most useful for Hong Kong travellers.
export const currencies=['HKD','JPY','TWD','CNY','KRW','THB','SGD','MYR','PHP','IDR','INR','USD','CAD','AUD','NZD','EUR','GBP','CHF','SEK','NOK','DKK','CZK','HUF','PLN','TRY','ISK','MXN','BRL','ZAR'];

const hkd=(e:Expense)=>(e.status==='退款'?-1:1)*e.amount*e.rate;

function Bars({rows}:{rows:[string,number][]}){const max=Math.max(1,...rows.map(r=>Math.abs(r[1])));return <div className="bars">{rows.map(([label,v])=><div className="bar-row" key={label}><span>{label}</span><div className="bar-track"><i style={{width:Math.max(2,Math.abs(v)/max*100)+'%'}}/></div><b>HKD {amount(v)}</b></div>)}</div>}

export function ExpenseCharts({trip}:{trip:Trip}){
 const paid=trip.expenses.filter(e=>e.status!=='未付'&&!e.deletedAt);
 if(!paid.length)return null;
 const by=(key:(e:Expense)=>string)=>{const m=new Map<string,number>();for(const e of paid)m.set(key(e),(m.get(key(e))||0)+hkd(e));return [...m.entries()]};
 const categories=by(e=>(kinds[e.category]||'')+' '+e.category).sort((a,b)=>b[1]-a[1]);
 const daily=by(e=>e.date).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,v])=>[d.slice(5).replace('-','/'),v] as [string,number]);
 const total=paid.reduce((a,e)=>a+hkd(e),0),daysWithSpend=daily.length;
 return <section className="two-col expense-charts"><section className="panel"><div className="section-title"><h2>按分類</h2><span className="tag">已付淨額</span></div><Bars rows={categories}/></section><section className="panel"><div className="section-title"><h2>每日花費</h2><span className="tag">平均每日 HKD {amount(total/Math.max(1,daysWithSpend))}</span></div><Bars rows={daily}/></section></section>;
}

const ics=(s:string)=>s.replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n');
const stamp=(date:string,time:string)=>date.replace(/-/g,'')+'T'+time.replace(':','')+'00';
export function tripCalendar(trip:Trip){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//QMI x YUMI//Travel//ZH-HK','CALSCALE:GREGORIAN'];
 for(const s of trip.stops.filter(x=>!x.deletedAt&&x.status!=='取消')){const date=dateAt(trip,s.day);const end=s.end&&s.end>s.time?s.end:s.time;
  lines.push('BEGIN:VEVENT','UID:'+s.id+'@qmixyumi.github.io','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART:'+stamp(date,s.time),'DTEND:'+stamp(date,end===s.time?addHour(s.time):end),'SUMMARY:'+ics(s.title),...(s.place?['LOCATION:'+ics(s.place)]:[]),...(s.note||s.booking?['DESCRIPTION:'+ics([s.booking&&'預訂：'+s.booking,s.note].filter(Boolean).join('\n'))]:[]),'END:VEVENT');}
 lines.push('END:VCALENDAR');return lines.join('\r\n');
}
function addHour(t:string){const [h,m]=t.split(':').map(Number);return String(Math.min(23,h+1)).padStart(2,'0')+':'+String(h>=23?59:m).padStart(2,'0')}
export function dayText(trip:Trip,day:number,stops:Stop[]){return [`${trip.name} · DAY ${day} · ${dateAt(trip,day)}`,...stops.map(s=>`${s.time}${s.end?'–'+s.end:''}  ${kinds[s.kind]||''} ${s.title}${s.place?' @ '+s.place:''}`)].join('\n')}

function download(name:string,text:string,type:string){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

export function DayExport({trip,day,stops}:{trip:Trip;day:number;stops:Stop[]}){
 const [msg,setMsg]=useState('');
 const text=dayText(trip,day,stops);
 async function share(){try{if(navigator.share){await navigator.share({title:trip.name,text});return}await navigator.clipboard.writeText(text);setMsg('已複製當日行程文字')}catch{/* user cancelled */}}
 return <span className="day-export"><button className="secondary" onClick={share} title="分享或複製當日行程"><Share2 size={15}/> 分享當日</button><button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(text);setMsg('已複製當日行程文字')}catch{setMsg('未能複製，請手動選取')}}} title="複製當日行程文字"><Copy size={15}/></button><button className="secondary" onClick={()=>{download(trip.name.replace(/[\\/:*?"<>|]/g,'_')+'.ics',tripCalendar(trip),'text/calendar');setMsg('已下載 .ics，可匯入 Google／Apple 日曆')}} title="匯出全程到日曆"><CalendarPlus size={15}/> 日曆</button>{msg&&<small role="status">{msg}</small>}</span>;
}
