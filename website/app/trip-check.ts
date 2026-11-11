import type {Trip,Stop} from './model';
export type TripWarning={day:number;ids:string[];text:string};
const mins=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
const name=(s:Stop)=>`「${s.title.slice(0,30)}」`;
const days=(t:Trip)=>Math.round((Date.parse(t.end)-Date.parse(t.start))/86400000)+1;
/** Time clashes, not enough travel time and doubtful overnight dates, so they show before the trip, not on the day. */
export function tripWarnings(trip:Trip):TripWarning[]{
 const out:TripWarning[]=[];
 const live=trip.stops.filter(s=>!s.deletedAt&&s.status!=='取消');
 for(let d=1;d<=days(trip);d++){
  const list=live.filter(s=>s.day===d).sort((a,b)=>a.time.localeCompare(b.time));
  list.forEach((a,i)=>{
   if(a.end&&a.end<a.time)out.push({day:d,ids:[a.id],text:`${name(a)} 結束 ${a.end} 早過開始 ${a.time}：如果跨午夜，請將過咗 00:00 嘅部分放去 DAY ${d+1}`});
   else if(a.time<'05:00'&&d>1)out.push({day:d,ids:[a.id],text:`${name(a)} 喺凌晨 ${a.time}：請確認係 DAY ${d} 嘅凌晨，定係前一晚嘅安排`});
   const aEnd=a.end&&a.end>=a.time?a.end:a.time;
   for(const b of list.slice(i+1)){if(b.time<aEnd||b.time===a.time)out.push({day:d,ids:[a.id,b.id],text:`${name(a)}（${a.time}–${a.end||'?'}）同 ${name(b)}（${b.time}–${b.end||'?'}）時間重疊`});}
   const next=list[i+1];
   if(next&&a.end&&a.end>=a.time&&next.time>=aEnd){const gap=mins(next.time)-mins(a.end);if(a.minutes>gap)out.push({day:d,ids:[a.id,next.id],text:`由 ${name(a)} 去 ${name(next)} 預留 ${a.minutes} 分鐘交通，但只有 ${gap} 分鐘`})}
  });
 }
 for(const t of (trip.tickets||[]).filter(x=>!x.deletedAt)){
  const dep=t.departure.slice(0,10),arr=t.arrival.slice(0,10),label=`${t.number||'票券'} ${t.from}→${t.to}`;
  const day=Math.round((Date.parse(dep)-Date.parse(trip.start))/86400000)+1;
  if(dep<trip.start||dep>trip.end)out.push({day:0,ids:[t.id],text:`${label} 出發日期 ${dep} 唔喺旅程日期（${trip.start} → ${trip.end}）入面`});
  if(t.arrival&&t.arrival<t.departure&&(!t.departureZone||t.departureZone===t.arrivalZone))out.push({day,ids:[t.id],text:`${label} 抵達 ${t.arrival.replace('T',' ')} 早過出發，日期可能填錯`});
  else if(arr&&arr>dep)out.push({day,ids:[t.id],text:`${label} 跨午夜抵達（${arr} ${t.arrival.slice(11,16)}）：請確認當晚住宿同下一日行程日期`});
 }
 return out;
}
