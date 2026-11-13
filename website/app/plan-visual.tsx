import {kinds,dateAt,type Trip,type Stop} from './model';
import {Sticker,stickerFor} from './quest-map';
import './plan-visual.css';
// Picture-style itinerary: one colour per kind of stop, a time ribbon for the day and a whole-trip board.
export const kindColor:Record<string,string>={交通:'#2f6fed',景點:'#1f9d55',美食:'#e8590c',購物:'#9333ea',酒店:'#b7791f',活動:'#db2777',日常:'#64748b'};
export const colorOf=(kind:string)=>kindColor[kind]||'#64748b';
const kindLabel:Record<string,string>={美食:'餐飲',購物:'逛街購物',酒店:'住宿'};
export const travelIcon=(t:string)=>/步行|行路|散步/.test(t)?'🚶':/高鐵|新幹線/.test(t)?'🚄':/地鐵|電車|火車|鐵路|JR|捷運/i.test(t)?'🚇':/巴士|公車|大巴/.test(t)?'🚌':/的士|打的|計程車|網約車|Uber|滴滴/i.test(t)?'🚕':/飛機|航班/.test(t)?'✈️':/船|渡輪/.test(t)?'⛴':/單車|踩車/.test(t)?'🚲':/自駕|揸車|租車/.test(t)?'🚗':'➜';
const mins=(t:string)=>{const m=/^(\d{1,2}):(\d{2})/.exec(t||'');return m?Number(m[1])*60+Number(m[2]):NaN};
const sorted=(stops:Stop[])=>[...stops].sort((a,b)=>a.time.localeCompare(b.time));
export function KindLegend({stops}:{stops:Stop[]}){const used=Object.keys(kinds).filter(k=>stops.some(s=>s.kind===k));if(!used.length)return null;return <div className="kind-legend" aria-label="顏色分類">{used.map(k=><span key={k}><i style={{background:colorOf(k)}}/>{kinds[k]} {kindLabel[k]||k}</span>)}</div>}
/** A bar for the day: every stop is a coloured block placed by its time, so gaps and busy hours show at a glance. */
export function DayRibbon({stops,selected,onSelect}:{stops:Stop[];selected?:string;onSelect:(id:string)=>void}){
const timed=stops.filter(s=>!Number.isNaN(mins(s.time)));if(!timed.length)return null;
const spans=timed.map(s=>{const a=mins(s.time),e=mins(s.end);return {s,a,b:!Number.isNaN(e)&&e>a?e:a+45}});
const from=Math.min(8,Math.floor(Math.min(...spans.map(x=>x.a))/60))*60,to=Math.max(21,Math.ceil(Math.max(...spans.map(x=>x.b))/60))*60,len=to-from;
const step=len>14*60?3:2,ticks:number[]=[];for(let h=from/60;h<=to/60;h+=step)ticks.push(h);
return <div className="day-ribbon" aria-label="當日時間分佈"><div className="ribbon-track">{spans.map(({s,a,b})=><button key={s.id} type="button" className={'ribbon-block '+(selected===s.id?'on ':'')+(s.status==='已到訪'?'done':'')} style={{left:(a-from)/len*100+'%',width:Math.max(3.2,(b-a)/len*100)+'%',background:colorOf(s.kind)}} title={`${s.time}${s.end?'–'+s.end:''} ${s.title}`} aria-label={`${s.time} ${s.title}`} onClick={()=>onSelect(s.id)}><span>{kinds[s.kind]||'📍'}</span></button>)}</div><div className="ribbon-ticks" aria-hidden="true">{ticks.map(h=><span key={h} style={{left:(h*60-from)/len*100+'%'}}>{String(h%24).padStart(2,'0')}</span>)}</div></div>}
/** How much of the day is done, shown as treasure collected. */
export function DayLoot({stops}:{stops:Stop[]}){if(!stops.length)return null;const got=stops.filter(s=>s.status==='已到訪').length,all=got===stops.length;return <div className={'day-loot '+(all?'complete':'')} role="img" aria-label={`已到訪 ${got} / ${stops.length}`}><span className="loot-chest">{all?'🏆':'🧰'}</span><div><b>{all?'今日全部完成！':`寶藏 ${got} / ${stops.length}`}</b><span className="loot-cells">{stops.map((s,i)=><i key={s.id} className={i<got?'got':''}/>)}</span></div></div>}
/** Every day side by side: time, icon and name in the colour of its kind. Tap one to open that day. */
export function TripBoard({trip,count,today,onPick}:{trip:Trip;count:number;today:number;onPick:(day:number,id?:string)=>void}){
const live=trip.stops.filter(s=>!s.deletedAt&&s.status!=='取消');
return <section className="trip-board" aria-label="全程一覽"><KindLegend stops={live}/><div className="board-grid">{Array.from({length:count},(_,i)=>{const d=i+1,list=sorted(live.filter(s=>s.day===d)),done=list.length>0&&list.every(s=>s.status==='已到訪');return <article key={d} className={'board-day '+(today===d?'today ':'')+(done?'cleared':'')}><button type="button" className="board-head" onClick={()=>onPick(d)}><small>DAY {String(d).padStart(2,'0')}{today===d?' · 今日':''}</small><strong>{dateAt(trip,d).slice(5).replace('-',' / ')}</strong><span>{done?'⭐ 完成':list.length?list.length+' 個行程':'未有行程'}</span></button><div className="board-list">{list.length?list.map(s=><button key={s.id} type="button" className={'board-stop '+(s.status==='已到訪'?'done':'')} style={{'--kc':colorOf(s.kind)} as React.CSSProperties} onClick={()=>onPick(d,s.id)}><time>{s.time}</time><span className="board-icon"><Sticker name={stickerFor(s)}/></span><b>{s.title}</b></button>):<button type="button" className="board-empty" onClick={()=>onPick(d)}>＋ 自由活動</button>}</div></article>})}</div></section>}
