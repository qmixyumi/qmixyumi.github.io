'use client';
import Photo from './photos';
import {useState,useRef,useEffect,CSSProperties,ReactNode} from 'react';
import {MapPin,Sofa,Leaf,Moon,BadgeDollarSign,Coffee,Star,Eye,Tag,Soup,Flame,Candy,Folder,Pencil,Trash2,Clock,Ticket,LayoutGrid,Trophy,SlidersHorizontal,Plus,Shield,Gem,X,Download,BedDouble,Mountain,UtensilsCrossed,Zap,Orbit,BatteryLow,Users,Camera,Wallet} from 'lucide-react';
import {QuestData,QuestKind,QuestEntry,QuestMetric,emptyQuest,newQuestEntry,questScore,questGrade,questTitles,RATERS,withPersonScore,withPersonReset,tierWords,hotelWords,gradeColors,SPICE,SWEET,metricColor,isRide,metricsFor} from './quest-model';
import {saveValue,readValue,ago} from './drafts';
import './quest.css';
import './quest-navy.css';
import type {Stop,Trip,Data} from './model';
import {amount} from './model';
import {questLink,questCharges,hotelNights,questCurrency} from './budget';
import {currencies} from './extras';

const stopKind:Record<string,QuestKind>={酒店:'hotel',美食:'food',景點:'spot'};
// Old per-stop detailed ratings (收藏圖鑑) mapped onto atlas metrics; QMI/YUMI scores are averaged.
const legacyMetric:Record<QuestKind,[string,string,boolean?][]>={hotel:[['地理位置','location'],['舒適度','comfort'],['環境','environment'],['靜音程度','quiet'],['性價比','value'],['早餐豐富','breakfast']],food:[['味道','taste'],['外觀','appearance'],['性價比','value'],['份量','portion']],spot:[['景觀震撼度','view'],['人潮舒適度','crowd',true],['出片率','photo']]};
export function stopToEntry(s:Stop,kind:QuestKind,trip:string):QuestEntry{const scores:Record<string,number|null>={};const people:Record<string,Record<string,number|null>>={QMI:{},YUMI:{}};let personal=false;for(const [old,id,flip] of legacyMetric[kind]){for(const p of ['QMI','YUMI']){const n=s.metrics?.[p+old];if(typeof n==='number'&&Number.isFinite(n)){people[p][id]=flip?10-n:n;personal=true}}const v=['QMI','YUMI'].map(p=>s.metrics?.[p+old]).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n));if(v.length){const avg=Math.round(v.reduce((a,b)=>a+b,0)/v.length);scores[id]=flip?10-avg:avg}}return {...newQuestEntry(kind),...(personal?{people}:{}),name:s.title.slice(0,100),region:s.place.slice(0,150),notes:[s.note,trip&&'來自旅程：'+trip].filter(Boolean).join('\n').slice(0,3000),photo:s.photo||'',scores}}

export const toStars=(v:number|null|undefined)=>typeof v==='number'?Math.round(v/2):0;
const num=(v:number|null|undefined,digits=1)=>typeof v==='number'?(Number.isInteger(v)?String(v):v.toFixed(digits)):'–';
const themes={hotel:{title:'HOTEL QUEST',sub:'酒店評分冒險',noun:'酒店'},spot:{title:'TRAVEL QUEST',sub:'景點探索冊 · 推薦指數任務本',noun:'景點'},food:{title:'FOOD QUEST',sub:'美食冒險家 · 評分圖鑑',noun:'美食'}};
const FOOD_TYPES=['小食','主食','甜品','飲品','其他'];
const SEASON_CLASS:Record<string,string>={春:'spring',夏:'summer',秋:'autumn',冬:'winter'};
const hotelIcons:Record<string,ReactNode>={location:<MapPin/>,comfort:<Sofa/>,environment:<Leaf/>,quiet:<Moon/>,value:<BadgeDollarSign/>,breakfast:<Coffee/>};
const foodIcons:Record<string,ReactNode>={taste:<Star/>,appearance:<Eye/>,value:<Tag/>,portion:<Soup/>};
const spotIcons:Record<string,ReactNode>={view:<Mountain/>,crowd:<Users/>,photo:<Camera/>,thrill:<Zap/>,queue:<Clock/>,gforce:<Orbit/>,stamina:<BatteryLow/>,experience:<Star/>};
const DRAFT='quest';

/** Read-only row of five stars derived from a 0–10 score. */
function Stars({value}:{value:number|null|undefined}){const n=toStars(value);return <span className="q-stars" aria-label={typeof value==='number'?`${n} 星`:'未評分'}>{[1,2,3,4,5].map(i=><i key={i} className={i<=n?'on':''}>★</i>)}</span>}
/** 0–10 slider that only saves when the finger or mouse is released. */
function Slider({value,color,label,onChange,rest,disabled,min=0}:{value:number|null|undefined;color:string;label:string;onChange:(v:number)=>void;rest?:string;disabled?:boolean;min?:number}){
 const [local,setLocal]=useState<number|null>(null);const shown=local??(typeof value==='number'?value:null);
 function done(){if(local!==null&&local!==value)onChange(local);setLocal(null)}
 // With min above 0, a tap on an unset bar at its lowest point still records that score.
 function tap(){if(local===null&&typeof value!=='number'&&min>0&&!disabled)onChange(min);done()}
 return <input type="range" disabled={disabled} className={'q-slider'+(shown===null?' q-unset':'')} min={min} max={10} step={1} aria-label={label} value={shown??min} style={{'--c':color,'--p':(Math.max(0,(shown??min)-min)/(10-min)*100)+'%',...(rest?{'--rest':rest}:{})} as CSSProperties} onChange={e=>setLocal(Number(e.target.value))} onPointerUp={tap} onKeyUp={done} onBlur={done} onTouchEnd={done}/>
}
/** Ten clickable cells; tapping the current top cell steps one down so 0 is reachable. */
function Segments({value,color,label,onChange}:{value:number|null|undefined;color:string;label:string;onChange?:(v:number)=>void}){const v=typeof value==='number'?Math.round(value):0;return <span className="q-segments" role={onChange?'radiogroup':undefined} aria-label={label} style={{'--c':color} as CSSProperties}>{Array.from({length:10},(_,i)=>i+1).map(n=>onChange?<button type="button" key={n} role="radio" aria-checked={v===n} aria-label={`${label} ${n} 分`} className={n<=v?'on':''} onClick={()=>onChange(v===n?n-1:n)}/>:<i key={n} className={n<=v?'on':''}/>)}</span>}
/** Text box that keeps typing local and saves after a short pause or on leaving the box. */
function LazyText({value,onSave,multiline,...rest}:{value:string;onSave:(v:string)=>void;multiline?:boolean;placeholder?:string;maxLength?:number;className?:string;'aria-label'?:string}){
 const [text,setText]=useState(value);const timer=useRef(0);const latest=useRef(value);
 useEffect(()=>{if(document.activeElement?.getAttribute('data-lazy')!=='1')setText(value);latest.current=value},[value]);
 useEffect(()=>()=>window.clearTimeout(timer.current),[]);
 const change=(v:string)=>{setText(v);window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>{if(v!==latest.current)onSave(v)},700)};
 const blur=()=>{window.clearTimeout(timer.current);if(text!==latest.current)onSave(text)};
 return multiline?<textarea data-lazy="1" {...rest} value={text} onChange={e=>change(e.target.value)} onBlur={blur}/>:<input data-lazy="1" {...rest} value={text} onChange={e=>change(e.target.value)} onBlur={blur}/>
}
function Badge({grade,word,small}:{grade:string;word?:string;small?:boolean}){return <span className={'q-badge'+(small?' small':'')} style={{'--g':gradeColors[grade]} as CSSProperties}><b>{grade==='—'?'?':grade}</b>{word&&<small>{word}</small>}</span>}

async function compressPhoto(file:File){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('請用 10MB 以內嘅 JPG、PNG 或 WebP。');const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,800/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();let image=canvas.toDataURL('image/jpeg',.75);if(image.length>250000)image=canvas.toDataURL('image/jpeg',.45);if(image.length>250000)throw Error('圖片壓縮後仍太大，請選較細嘅照片。');return image}

/** Currency next to an atlas price; shows the guessed one until the user picks. */
function CurrencyPick({entry,data,onChange}:{entry:QuestEntry;data?:Data;onChange:(p:Partial<QuestEntry>)=>void}){const cur=questCurrency(entry,data);return <select className="q-cur" aria-label="貨幣" value={cur} onChange={e=>onChange({currency:e.target.value})} onClick={e=>e.stopPropagation()}>{[...new Set([cur,...currencies])].map(c=><option key={c}>{c}</option>)}</select>}
/** Shows which trip's budget an atlas price goes into, and lets the user pick another trip or leave it out. */
function BudgetLine({entry,data,trips,onChange}:{entry:QuestEntry;data?:Data;trips:Trip[];onChange:(p:Partial<QuestEntry>)=>void}){
 if(!data)return null;
 const link=questLink(entry,data),charges=questCharges(entry,data),t=link.trip;
 const hasPrice=entry.kind==='spot'?!!(entry.ticket||entry.ride):!!entry.price;
 const text=link.how==='none'?'唔計入任何旅程嘅旅費。'
  :link.how==='many'?'有幾個旅程都有同名行程，揀返邊個旅程先會計入旅費。'
  :link.how==='unmatched'?'未配對到旅程，揀一個旅程先會計入旅費。'
  :!charges.length?(hasPrice?'睇唔到價錢入面嘅數字，例如寫「HK$220」或「792.75」。':`填咗價錢就會自動記入「${t!.name}」旅費。`)
  :charges[0].skip?`行程「${charges[0].skip.title}」已經填咗費用，旅費用嗰個，呢度唔會重覆計。`
  :`已自動記入「${t!.name}」旅費：${charges.map(c=>`${c.money.currency} ${amount(c.money.amount)}${c.note?`（${c.note}）`:''}`).join('、')}`;
 const ok=charges.length>0&&!charges[0].skip;
 return <div className={'q-budget-line'+(ok?' on':'')}>
  <label><span>記入旅費</span><select value={entry.trip||''} onChange={e=>onChange({trip:e.target.value||undefined,stop:undefined})}><option value="">自動（同名行程）</option>{trips.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}<option value="none">唔計入旅費</option></select></label>
  {entry.kind==='hotel'&&t&&<label><span>晚數</span><input key={entry.id+':'+(entry.nights||0)} type="number" min={1} max={365} inputMode="numeric" defaultValue={entry.nights||''} placeholder={String(hotelNights({...entry,nights:0},t,link.stops))} onBlur={e=>{const n=Math.round(Number(e.target.value));const v=n>0?Math.min(365,n):undefined;if(v!==entry.nights)onChange({nights:v})}}/></label>}
  <small>{text}</small>
 </div>
}
/** Budget link tucked into a closed section so the rating looks clean in screenshots. */
function BudgetMore(p:{entry:QuestEntry;data?:Data;trips:Trip[];onChange:(p:Partial<QuestEntry>)=>void}){if(!p.data)return null;return <details className="q-budget-more"><summary><Wallet/> 記入旅費設定<small>{p.entry.trip==='none'?'唔計入':p.entry.trip?p.trips.find(t=>t.id===p.entry.trip)?.name||'自動':'自動'}</small></summary><BudgetLine {...p}/></details>}

export default function Quest({value,onChange,stops=[],tripName='',focus='',trips=[],tripId='',budgetData}:{value?:QuestData;onChange:(q:QuestData)=>void;stops?:Stop[];tripName?:string;trips?:Trip[];tripId?:string;budgetData?:Data;person?:string;onPerson?:(p:string)=>void;focus?:string}){
 const q=value||emptyQuest();
 // 米白 (default) or 藍色 look, remembered on this device.
 const [look,setLook]=useState<'cream'|'navy'>(()=>{try{return localStorage.getItem('quest-look')==='navy'?'navy':'cream'}catch{return 'cream'}});const navy=look==='navy';
 function toggleLook(){const next=navy?'cream':'navy';setLook(next);try{localStorage.setItem('quest-look',next)}catch{}}
 const [kind,setKind]=useState<QuestKind>('hotel'),[view,setView]=useState('cards'),[folder,setFolder]=useState('all'),[sort,setSort]=useState('new'),[draft,setDraft]=useState<QuestEntry|null>(null),[metrics,setMetrics]=useState<QuestMetric[]|null>(null),[folderForm,setFolderForm]=useState<{id:string;name:string}|null>(null),[notice,setNotice]=useState(''),[exporting,setExporting]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[exports,setExports]=useState<{url:string;name:string}[]>([]),[hotelId,setHotelId]=useState(''),[newHotel,setNewHotel]=useState('');
 useEffect(()=>()=>exports.forEach(f=>URL.revokeObjectURL(f.url)),[exports]);
 // A half-written review is kept on this device until it is saved or deliberately discarded.
 const [saved,setSaved]=useState(()=>readValue<QuestEntry>(DRAFT));const edited=useRef(false);
 useEffect(()=>{if(draft&&edited.current)saveValue(DRAFT,draft)},[draft]);
 useEffect(()=>{if(!focus)return;const id=focus.split('|')[0];const e=q.entries.find(x=>x.id===id);if(!e)return;setKind(e.kind);setFolder('all');setView('cards');if(e.kind==='hotel')setHotelId(e.id);setTimeout(()=>{const el=document.getElementById('quest-'+id);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.classList.add('flash');setTimeout(()=>el?.classList.remove('flash'),2200)},80)},[focus]);
 const dialog=useRef<HTMLDialogElement>(null);const photoRequest=useRef(0);const hotelPhoto=useRef<HTMLInputElement>(null);const theme=themes[kind];const open=!!draft||!!metrics||!!folderForm;
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open]);
 function close(discard=false){photoRequest.current++;setPhotoBusy(false);if(draft&&edited.current&&!discard){setSaved(readValue<QuestEntry>(DRAFT));setNotice('未儲存嘅評鑑已暫存做草稿，可以喺上面繼續編輯。')}else if(discard)saveValue(DRAFT,null);edited.current=false;setDraft(null);setMetrics(null);setFolderForm(null)}
 function cancel(){if(draft&&edited.current&&!window.confirm('放棄未儲存嘅修改？'))return;close(true)}
 function openDraft(e:QuestEntry){edited.current=false;setDraft(e)}
 function commit(fn:(next:QuestData)=>void){const next=structuredClone(q);fn(next);onChange(next)}
 function patch(id:string,fn:(e:QuestEntry)=>QuestEntry|void){commit(n=>{const i=n.entries.findIndex(x=>x.id===id);if(i<0)return;const r=fn(n.entries[i]);if(r)n.entries[i]=r})}
 function switchKind(next:QuestKind){setKind(next);setFolder('all');setView('cards');setNotice('')}
 const folders=q.folders.filter(f=>f.kind===kind),all=q.entries.filter(e=>e.kind===kind),items=all.filter(e=>folder==='all'||e.folder===(folder==='none'?'':folder));
 const kindMetrics=q.metrics[kind];
 const score=(e:QuestEntry)=>questScore(e,kindMetrics);const ranked=[...items].sort((a,b)=>(score(b)??-1)-(score(a)??-1)||b.created-a.created);const cards=sort==='score'?ranked:[...items].sort((a,b)=>b.created-a.created);
 const rated=items.map(score).filter((n):n is number=>n!==null),average=rated.length?rated.reduce((a,b)=>a+b,0)/rated.length:null;
 const activeMetrics=(e:QuestEntry)=>kindMetrics.filter(m=>!(e.kind==='hotel'&&m.id==='breakfast'&&!e.breakfast));
 // Per-person rating is hidden for now: everyone edits one shared score, written to both raters so averages stay equal.
 const mine=(e:QuestEntry)=>e.scores;
 const shared=(e:QuestEntry,id:string,v:number|null)=>e.people?RATERS.reduce((x,p)=>withPersonScore(x,p,id,v),e):{...e,scores:{...e.scores,[id]:v}};
 const setScore=(e:QuestEntry,id:string,v:number|null)=>patch(e.id,x=>shared(x,id,v));
 function erase(e:QuestEntry){if(window.confirm(`刪除「${e.name}」？可用頁面「撤銷」復原。`))commit(n=>{n.entries=n.entries.filter(x=>x.id!==e.id)})}
 function removeFolder(id:string){const selected=folders.find(f=>f.id===id);if(selected&&window.confirm(`刪除分類「${selected.name}」？入面嘅記錄會保留，移去「未分類」。`)){commit(n=>{n.folders=n.folders.filter(f=>f.id!==id);n.entries.forEach(e=>{if(e.folder===id)e.folder=''})});if(folder===id)setFolder('all')}}
 const importable=stops.filter(s=>!s.deletedAt&&s.status!=='取消'&&stopKind[s.kind]===kind&&!q.entries.some(e=>e.kind===kind&&(e.name===s.title.slice(0,100)||s.title.includes(e.name))));
 const targetFolder=folder==='all'||folder==='none'?'':folder;const homeTrip=tripId&&tripId!=='demo'&&tripId!=='empty'?tripId:undefined;
 function importStops(){if(!importable.length)return;commit(n=>{for(const s of importable)n.entries.push({...stopToEntry(s,kind,tripName),folder:targetFolder,...(tripId&&tripId!=='empty'?{trip:tripId,stop:s.id}:{})})});setNotice(`已由「${tripName}」加入 ${importable.length} 項；原本喺收藏圖鑑嘅詳細評分已一併轉換。`)}
 async function photo(file:File){if(!draft)return;const request=++photoRequest.current;const entryId=draft.id;setPhotoBusy(true);try{const image=await compressPhoto(file);if(request===photoRequest.current){edited.current=true;setDraft(d=>d?.id===entryId?{...d,photo:image}:d)}}catch(e){if(request===photoRequest.current)setNotice(e instanceof Error?e.message:'未能讀取照片')}finally{if(request===photoRequest.current)setPhotoBusy(false)}}
 async function hotelPhotoChange(file:File,id:string){setPhotoBusy(true);try{const image=await compressPhoto(file);patch(id,e=>{e.photo=image})}catch(e){setNotice(e instanceof Error?e.message:'未能讀取照片')}finally{setPhotoBusy(false)}}
 async function exportRanking(){setExporting(true);setNotice('');try{const {exportQuestRanking}=await import('./quest-export');const files=await exportQuestRanking({kind,title:theme.title,folder:folder==='all'?'全部':folder==='none'?'未分類':folders.find(f=>f.id===folder)?.name||'',entries:ranked,metrics:kindMetrics,dark:navy});setExports(files.map(f=>({url:URL.createObjectURL(f.blob),name:f.name})));setNotice('排行榜 PNG 已準備好，按下面連結下載；每頁最多 20 項。')}catch(e){setNotice(e instanceof Error?e.message:'圖片匯出失敗')}finally{setExporting(false)}}
 const folderName=(id:string)=>folders.find(f=>f.id===id)?.name||'未分類';

 // ---------- Shared header ----------
 const logo=kind==='hotel'?<Gem/>:<Shield/>;
 const header=<header className="q-head">
  <div className="q-brand"><span className="q-logo">{logo}{kind!=='hotel'&&<Star className="q-logo-star"/>}</span><div><h2 className="q-pixel-title">{theme.title}</h2><p>{theme.sub}</p></div></div>
  {kind==='hotel'?<div className="q-head-side"><span className="q-chip-stat">已登記酒店 <b>{all.length}</b> 間 · <b>{folders.length}</b> 個分類</span></div>
  :kind==='food'?<><div className="q-head-stats"><span>圖鑑 <b>{items.length}</b></span><span>平均 <b>{average===null?'—':num(average)}</b></span><span>最高 <b>{rated.length?num(Math.max(...rated)):'—'}</b></span></div><button className="q-btn q-green" onClick={()=>openDraft({...newQuestEntry('food',targetFolder),trip:homeTrip})}><Plus/> 新增美食</button></>
  :<div className="q-head-side"><button className="q-btn" onClick={()=>setMetrics(structuredClone(kindMetrics))}><SlidersHorizontal/> 指標設定</button><button className="q-btn q-green" onClick={()=>openDraft({...newQuestEntry('spot',targetFolder),trip:homeTrip})}><Plus/> 添加景點</button></div>}
 </header>;
 const tabs=<div className="q-tabs-row">
  <div className="q-tabs"><button className={'q-btn'+(view==='cards'?' q-green':'')} onClick={()=>setView('cards')}>{kind==='spot'&&<LayoutGrid/>}{kind==='hotel'?'評分冒險':kind==='spot'?'景點列表':'評分圖鑑'}</button><button className={'q-btn'+(view==='rank'?' q-green':'')} onClick={()=>setView('rank')}>{kind==='spot'&&<Trophy/>}{kind==='hotel'?'排名榜':'排行榜'}</button></div>
  <div className="q-tabs">{stops.length>0&&<button className="q-btn" disabled={!importable.length} onClick={importStops} title="將目前旅程嘅項目加入圖鑑">⇣ 由行程匯入（{importable.length}）</button>}{kind==='food'&&<button className="q-btn" onClick={()=>setMetrics(structuredClone(kindMetrics))}><SlidersHorizontal/> 評分指標</button>}</div>
 </div>;

 // ---------- Ranking ----------
 const ranking=<div className="q-ranking">{!items.length?<p className="q-muted">未有記錄。</p>:<>{ranked.map((e,i)=>{const t=score(e),g=questGrade(t);return <button className="q-rank-row" key={e.id} style={{'--g':gradeColors[g]} as CSSProperties} onClick={()=>{if(kind==='hotel'){setHotelId(e.id);setView('cards')}else openDraft(structuredClone(e))}}><b className="q-rank-no">{i+1}</b><Badge grade={g} small/><strong>{e.name}<small>{[folderName(e.folder),kind==='hotel'?e.room:kind==='spot'?e.region:e.category].filter(Boolean).join(' · ')}</small></strong>{kind==='hotel'&&<Stars value={t}/>}<b className="q-num">{num(t)}</b><small className="q-tier">{(kind==='hotel'?hotelWords:tierWords)[g]}</small></button>})}<button className="q-btn q-green q-export" disabled={exporting} onClick={exportRanking}><Download/> {exporting?'正在匯出…':'匯出排行榜 PNG'}</button></>}</div>;

 // ---------- Folder chips (food) ----------
 const folderChips=<div className="q-folders">
  <button className={'q-fchip'+(folder==='all'?' on':'')} onClick={()=>setFolder('all')}>全部 <small>{all.length}</small></button>
  <button className={'q-fchip dashed'+(folder==='none'?' on':'')} onClick={()=>setFolder('none')}>未分類 <small>{all.filter(e=>!e.folder).length}</small></button>
  {folders.map(f=><span key={f.id} className={'q-fchip'+(folder===f.id?' on':'')}><button onClick={()=>setFolder(f.id)}>{f.name} <small>{all.filter(e=>e.folder===f.id).length}</small></button><button aria-label={'改名 '+f.name} onClick={()=>setFolderForm({id:f.id,name:f.name})}><Pencil/></button><button aria-label={'刪除 '+f.name} onClick={()=>removeFolder(f.id)}><Trash2/></button></span>)}
  <button className="q-newfolder" onClick={()=>setFolderForm({id:'',name:''})}><Plus/> 新增分類</button>
 </div>;

 // ---------- Food ----------
 function foodCard(e:QuestEntry){const t=score(e),g=questGrade(t),level=e.level||'spice',lv=level==='sweet'?e.sweet||'':e.spice;return <article className="q-food-card" id={'quest-'+e.id} key={e.id} style={{'--g':gradeColors[g]} as CSSProperties}>
  <header><div><h3>{e.name}</h3>{e.category&&<span className="q-tag">{e.category}</span>}{(e.region||e.price)&&<p className="q-muted">{[e.region,e.price].filter(Boolean).join(' · ')}</p>}</div><Badge grade={g} word={tierWords[g]}/></header>
  {e.photo&&<Photo className="q-thumb" src={e.photo} alt={e.name+' 照片'}/>}
  {kindMetrics.map(m=><div className="q-metric-row" key={m.id} style={{'--c':metricColor(m)} as CSSProperties}><span className="q-micon">{foodIcons[m.id]||<Star/>}</span><span className="q-mname">{m.name}</span><Slider label={`${e.name} ${m.name}`} color={metricColor(m)} value={mine(e)[m.id]} onChange={v=>setScore(e,m.id,v)}/><b className="q-num">{num(mine(e)[m.id],0)}</b></div>)}
  {lv&&<div className="q-level-row"><span className="q-micon">{level==='sweet'?<Candy/>:<Flame/>}</span><span className="q-mname">{level==='sweet'?'甜度':'辣度'}</span><span className="q-mini-tag">級別</span><span className="q-level-chips">{(level==='sweet'?SWEET:SPICE).map(s=><button key={s} className={lv===s?'on':''} onClick={()=>patch(e.id,x=>{if(level==='sweet')x.sweet=lv===s?'':s;else x.spice=lv===s?'':s})}>{s}</button>)}</span></div>}
  <div className="q-total-row"><b>綜合</b><span className="q-gold-bar"><i style={{width:((t??0)*10)+'%'}}/></span><b className="q-num">{num(t===null?null:Math.round(t),0)}</b></div>
  {lv&&<p className="q-caption">綜合評分不含：{level==='sweet'?'甜度':'辣度'}</p>}

  {(e.notes||e.review)&&<p className="q-note">{[e.notes,e.review].filter(Boolean).join('\n')}</p>}
  <footer><button className="q-btn q-blue" onClick={()=>openDraft(structuredClone(e))}><Pencil/> 編輯</button><button className="q-btn q-red" onClick={()=>erase(e)}><Trash2/> 刪除</button></footer>
 </article>}
 const foodView=<>{folderChips}<div className="q-sort"><button className={sort==='new'?'on':''} onClick={()=>setSort('new')}>最新</button><button className={sort==='score'?'on':''} onClick={()=>setSort('score')}>最高分</button></div>
  {!items.length?empty():<div className="q-grid">{cards.map(foodCard)}</div>}</>;

 // ---------- Spot ----------
 function spotCard(e:QuestEntry){const t=score(e),g=questGrade(t),ms=metricsFor(e,kindMetrics);return <article className={'q-spot-card'+(isRide(e)?' ride':'')} id={'quest-'+e.id} key={e.id}>
  <header><Badge grade={g}/><h3>{e.name}{isRide(e)&&<span className="q-type-tag">機動遊戲</span>}</h3><span className="q-icon-btns"><button className="blue" aria-label={'編輯 '+e.name} onClick={()=>openDraft(structuredClone(e))}><Pencil/></button><button className="red" aria-label={'刪除 '+e.name} onClick={()=>erase(e)}><Trash2/></button></span></header>
  {e.region&&<p className="q-line"><MapPin/> {e.region}</p>}
  {e.seasons.length>0&&<p className="q-seasons">{e.seasons.map(s=><span key={s} className={SEASON_CLASS[s]}>{s}</span>)}</p>}
  {e.ticket&&<p className="q-line"><Ticket/><span className="q-mini-label">門票</span>{e.ticket}</p>}
  {e.ride&&<p className="q-line"><Ticket/><span className="q-mini-label">項目</span>{e.ride}</p>}
  {e.duration&&<p className="q-line"><Clock/><span className="q-mini-label">時長</span>{e.duration}</p>}
  {e.photo&&<Photo className="q-thumb" src={e.photo} alt={e.name+' 照片'}/>}
  <div className="q-seg-list">{ms.map(m=><div className="q-seg-metric" key={m.id}><div><span>{m.name}{m.reverse&&<em className="q-low">低分更好</em>}</span><b className="q-num">{num(mine(e)[m.id],0)}/10</b></div><Segments label={`${e.name} ${m.name}`} color={metricColor(m)} value={mine(e)[m.id]} onChange={v=>setScore(e,m.id,v)}/></div>)}</div>

  {(e.notes||e.review)&&<details className="q-more"><summary>備註</summary><p>{[e.review,e.notes].filter(Boolean).join('\n')}</p></details>}
 </article>}
 const spotGroups=[...folders.map(f=>({id:f.id,name:f.name,list:all.filter(e=>e.folder===f.id)})),{id:'',name:'未分類',list:all.filter(e=>!e.folder)}].filter(g=>g.id||g.list.length);
 const spotView=<>
  <button className="q-newfolder" onClick={()=>setFolderForm({id:'',name:''})}><Folder/> 新增分類</button>
  {!all.length?empty():spotGroups.map(gp=><section className="q-spot-group" key={gp.id||'none'}>
   <div className="q-group-bar"><Folder/><b>{gp.name}</b><span className="q-count">{gp.list.length} 個</span>{gp.id&&<span className="q-icon-btns"><button className="blue" aria-label={'改名 '+gp.name} onClick={()=>setFolderForm({id:gp.id,name:gp.name})}><Pencil/></button><button className="red" aria-label={'刪除 '+gp.name} onClick={()=>removeFolder(gp.id)}><Trash2/></button></span>}</div>
   {gp.list.length?<div className="q-grid">{[...gp.list].sort((a,b)=>b.created-a.created).map(spotCard)}</div>:<p className="q-muted q-pad">呢個分類未有景點。</p>}
  </section>)}
 </>;

 // ---------- Hotel ----------
 const hotelList=items.length?cards:[];
 const hotel=all.find(e=>e.id===hotelId)||hotelList[0]||null;
 function createHotel(){const name=newHotel.trim();if(!name)return;const e={...newQuestEntry('hotel',targetFolder),trip:homeTrip,name:name.slice(0,100)};commit(n=>{n.entries.push(e)});setHotelId(e.id);setNewHotel('')}
 function hotelView(){const t=hotel?score(hotel):null,g=questGrade(t);const counted=hotel?activeMetrics(hotel).filter(m=>typeof hotel.scores[m.id]==='number').length:0;
  return <div className="q-hotel">
  <section className="q-panel q-hotel-list">
   <h3 className="q-panel-title">冒險地圖 <span>HOTEL LIST</span></h3>
   <form className="q-create q-create-top" onSubmit={ev=>{ev.preventDefault();createHotel()}}><input id="q-new-hotel" value={newHotel} maxLength={100} onChange={e=>setNewHotel(e.target.value)} placeholder="酒店名稱，例如 京都町家旅宿" aria-label="新酒店名稱"/><button className="q-btn q-gold"><Plus/> 新增酒店</button></form>
   <p className="q-muted">{all.length?'揀一間酒店開始評分':'未有酒店：喺上面輸入第一間酒店名稱就可以開始評分。'}</p>
   {folders.length>0&&<div className="q-folder-box"><div className="q-folder-tabs"><button className={folder==='all'?'on':''} onClick={()=>setFolder('all')}>全部</button>{folders.map(f=><button key={f.id} className={folder===f.id?'on':''} onClick={()=>setFolder(f.id)}>{f.name}</button>)}{all.some(e=>!e.folder)&&folders.length>0&&<button className={folder==='none'?'on':''} onClick={()=>setFolder('none')}>未分類</button>}</div>
    </div>}
   <div className="q-hotel-items">{hotelList.map(e=>{const s=score(e),gr=questGrade(s);return <div key={e.id} id={'quest-'+e.id} className={'q-hotel-item'+(hotel?.id===e.id?' on':'')}><button className="q-hotel-pick" onClick={()=>setHotelId(e.id)}><strong>{e.name}</strong><span className="q-hotel-meta"><Stars value={s}/><span className="q-grade-chip"><b>{gr==='—'?'?':gr}</b>級</span><span>{s===null?'待評':num(s)+' 分'}</span></span><small>{e.room&&`房型「${e.room}」`}{e.room&&e.price&&' · '}{e.price&&<><b className="q-num">{e.price}</b>／晚</>}</small></button><button className="q-x" aria-label={'刪除 '+e.name} onClick={()=>erase(e)}><X/></button></div>})}{!hotelList.length&&<p className="q-muted q-pad">{all.length?'呢個分類未有酒店。':''}</p>}</div>
   <details className="q-hotel-settings"><summary>分類同評分指標（可唔使理）</summary><p className="q-muted">分類用嚟將酒店分組，例如「東京酒店」「北疆酒店」。</p><div className="q-folder-actions"><button className="q-btn" onClick={()=>setFolderForm({id:'',name:''})}><Plus/> 新增分類</button><button className="q-btn" disabled={!folders.some(f=>f.id===folder)} onClick={()=>setFolderForm({id:folder,name:folderName(folder)})}>分類改名</button><button className="q-btn" disabled={!folders.some(f=>f.id===folder)} onClick={()=>removeFolder(folder)}>刪除分類</button><button className="q-btn" onClick={()=>setMetrics(structuredClone(kindMetrics))}><SlidersHorizontal/> 評分指標</button></div></details>
  </section>
  {hotel?<>
  <section className="q-panel q-hotel-stats">
   <h3 className="q-panel-title">能力值評分 <span>STAT SCORES</span></h3><p className="q-muted">{kindMetrics.filter(m=>m.id!=='breakfast').length} 項必評；早餐選填，關閉後不計入綜合分</p>
   <div className="q-hotel-name"><h3>{hotel.name}</h3><button className="q-rename" aria-label="編輯酒店名稱同記入旅費" title="改名、記入旅費" onClick={()=>openDraft(structuredClone(hotel))}><Pencil/></button><Stars value={t}/><span className="q-letter" style={{'--g':gradeColors[g]} as CSSProperties}>{g==='—'?'?':g}</span></div>
   <button className="q-btn" onClick={()=>{if(window.confirm(`重置「${hotel.name}」嘅評分？`))patch(hotel.id,e=>{const r=e.people?RATERS.reduce((x,p)=>withPersonReset(x,p),e):e;r.scores={};return r})}}>重置分數</button>
   <div className="q-hotel-fields"><label><BedDouble/><LazyText aria-label="房型" placeholder="房型" maxLength={150} value={hotel.room} onSave={v=>patch(hotel.id,e=>{e.room=v})}/></label><label><BadgeDollarSign/><CurrencyPick entry={hotel} data={budgetData} onChange={p=>patch(hotel.id,e=>({...e,...p}))}/><LazyText className="q-num-input" aria-label="每晚價格" placeholder="價格" maxLength={150} value={hotel.price} onSave={v=>patch(hotel.id,e=>{e.price=v})}/><small>／晚</small></label></div>
   {kindMetrics.map(m=>{const off=m.id==='breakfast'&&!hotel.breakfast;const v=mine(hotel)[m.id];return <div key={m.id} className={'q-stat-card'+(off?' off':'')}><div className="q-stat-top"><span className="q-micon">{hotelIcons[m.id]||<Star/>}</span><b>{m.name}</b>{m.id==='breakfast'?<><button className={'q-use'+(hotel.breakfast?' on':'')} onClick={()=>patch(hotel.id,e=>{e.breakfast=!e.breakfast})}><i/>{hotel.breakfast?'使用中':'未使用'}</button><small>{hotel.breakfast?'計分':'不計分'}</small>{hotel.breakfast&&<><Stars value={v}/><b className="q-num">{num(v,0)}</b></>}</>:<><Stars value={v}/><b className="q-num">{num(v,0)}</b></>}</div><Slider disabled={off} label={`${m.name}`} color={off?(navy?'#4a5680':'#e8d6a0'):'#3cb85c'} rest={off?(navy?'#26335f':'#f6ecd0'):'#93dba1'} value={v} onChange={nv=>setScore(hotel,m.id,nv)}/></div>})}
   <p className="q-caption">綜合 <b className="q-green-text">{num(t)}</b> 分 · {hotelWords[g]} · 已計 {counted} 項 · 早餐{hotel.breakfast?'計入':'未計'}</p>
 
  </section>
  <section className="q-panel q-hotel-side">
   <div className="q-panel-head"><h3 className="q-panel-title">酒店早餐 <span>BREAKFAST</span></h3><button className="q-dash-tag" onClick={()=>patch(hotel.id,e=>{e.breakfast=!e.breakfast})}>{hotel.breakfast?'使用中 · 計分':'未使用 · 不計分'}</button></div>
   <p className="q-muted">早餐選項，未使用可關閉評分；可上傳專屬照片</p>
   <div className="q-breakfast">{hotel.photo?<Photo className="q-breakfast-img" src={hotel.photo} alt={hotel.name+' 早餐照片'}/>:<button className="q-photo-empty" onClick={()=>hotelPhoto.current?.click()}><Coffee/>上傳早餐照片</button>}
    <div className="q-photo-bar"><span className="q-photo-label">{hotel.name}<span className="q-grade-chip"><b>{g==='—'?'?':g}</b>級</span><b className="q-num">{num(t)}</b><small>分</small></span>{hotel.photo&&<button className="q-btn" disabled={photoBusy} onClick={()=>hotelPhoto.current?.click()}>{photoBusy?'處理中…':'更換照片'}</button>}</div>
    <input ref={hotelPhoto} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)void hotelPhotoChange(f,hotel.id);e.target.value=''}}/></div>
   <div className="q-review"><h4 className="q-sub-title">住後感 <span>STAY REVIEW</span></h4><LazyText multiline aria-label="住後感" maxLength={3000} placeholder="— 住後感，每行一點" value={hotel.review} onSave={v=>patch(hotel.id,e=>{e.review=v})}/><p className="q-caption"><span>{hotel.breakfast?'早餐計分中':'早餐未使用'} · 住後感可補位記錄整體評價</span><span>{hotel.review.length} 字</span></p></div>
   <h4 className="q-panel-title small">屬性 / 技能備註 <span>SKILL NOTES</span></h4><LazyText multiline aria-label="屬性／技能備註" maxLength={3000} placeholder="— 設施、交通、附近好去處" value={hotel.notes} onSave={v=>patch(hotel.id,e=>{e.notes=v})}/><p className="q-caption"><span>備註會自動存檔</span><span>{hotel.notes.length} 字</span></p>
   <label className="q-move">所屬分類<select value={hotel.folder} onChange={e=>{const v=e.target.value;patch(hotel.id,x=>{x.folder=v})}}><option value="">未分類</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
  </section></>:<section className="q-panel q-hotel-empty"><BedDouble/><p>喺左邊建立或者揀一間酒店，就可以開始評分。</p></section>}
 </div>}

 function empty(){const Icon=kind==='spot'?Mountain:kind==='food'?UtensilsCrossed:BedDouble;return <div className="q-empty"><Icon/><h3>圖鑑仲係空白</h3><p>收錄第一個冒險回憶，開始評分。</p><button className="q-btn q-green" onClick={()=>openDraft(newQuestEntry(kind,targetFolder))}><Plus/> 新增{theme.noun}</button></div>}

 // ---------- Dialog forms ----------
 const isNew=!!draft&&!q.entries.some(e=>e.id===draft.id);
 function save(e:React.FormEvent){e.preventDefault();if(!draft||photoBusy)return;const entry={...draft,name:draft.name.trim()};if(!entry.name)return;commit(n=>{const i=n.entries.findIndex(x=>x.id===entry.id);if(i<0)n.entries.push(entry);else n.entries[i]=entry});close(true)}
 const set=(p:Partial<QuestEntry>)=>{edited.current=true;setDraft(d=>d?{...d,...p}:d)};
 const setDraftScore=(id:string,v:number|null)=>{edited.current=true;setDraft(d=>d?shared(d,id,v):d)};
 function foodForm(d:QuestEntry){const level=d.level||'spice';return <form onSubmit={save} className="q-form">
  <h2 className="q-form-title">{isNew?'新增美食':'編輯美食'}</h2>
  <label>名稱<input required maxLength={100} value={d.name} onChange={e=>set({name:e.target.value})} placeholder="例：炒粿條"/></label>
  <label>分類<select value={d.category} onChange={e=>set({category:e.target.value})}>{[...new Set([...FOOD_TYPES,d.category].filter(Boolean))].map(c=><option key={c}>{c}</option>)}</select></label>
  <label>分類<select value={d.folder} onChange={e=>set({folder:e.target.value})}><option value="">未分類</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
  <label>價錢（全單，可選填）<span className="q-money"><CurrencyPick entry={d} data={budgetData} onChange={set}/><input maxLength={150} value={d.price} onChange={e=>set({price:e.target.value})} placeholder="例：68"/></span></label>
  <BudgetMore entry={d} data={budgetData} trips={trips} onChange={set}/>
  <div className="q-field"><span>圖片（可選）</span><div className="q-row"><label className="q-btn q-file">上傳圖片<input type="file" hidden accept="image/png,image/jpeg,image/webp" disabled={photoBusy} onChange={e=>{const f=e.target.files?.[0];if(f)void photo(f);e.target.value=''}}/></label><button type="button" className="q-btn" disabled={!d.photo} onClick={()=>set({photo:''})}>移除圖片</button>{photoBusy&&<small>處理中…</small>}</div>{d.photo&&<Photo className="q-thumb" src={d.photo} alt="圖片預覽"/>}</div>
  <div className="q-field"><span>評分（0 – 10）</span>
   {kindMetrics.map(m=><div className="q-metric-row" key={m.id} style={{'--c':metricColor(m)} as CSSProperties}><span className="q-micon">{foodIcons[m.id]||<Star/>}</span><span className="q-mname">{m.name}</span><Slider label={m.name} color={metricColor(m)} value={mine(d)[m.id]} onChange={v=>setDraftScore(m.id,v)}/><b className="q-num">{num(mine(d)[m.id],0)}</b></div>)}
   <div className="q-level-row"><span className="q-micon q-purple"><Star/></span><span className="q-mname">級別</span><span className="q-mini-tag">級別</span><span className="q-seg-toggle"><button type="button" className={level==='spice'?'on':''} onClick={()=>set({level:'spice'})}>辣度</button><button type="button" className={level==='sweet'?'on':''} onClick={()=>set({level:'sweet'})}>甜度</button></span></div>
   <div className="q-level-row"><span className="q-micon q-pink">{level==='sweet'?<Candy/>:<Flame/>}</span><span className="q-mname">{level==='sweet'?'甜度':'辣度'}</span><span className="q-mini-tag">級別</span><span className="q-level-chips">{(level==='sweet'?SWEET:SPICE).map(s=>{const cur=level==='sweet'?d.sweet||'':d.spice;return <button type="button" key={s} className={cur===s?'on':''} onClick={()=>set(level==='sweet'?{sweet:cur===s?'':s}:{spice:cur===s?'':s})}>{s}</button>})}</span></div>
  </div>
  <label>備註（食物特點及屬性）<textarea maxLength={3000} value={d.notes} onChange={e=>set({notes:e.target.value})} placeholder="口感、食材、環境、價格……"/></label>
  {d.review&&<label>感想<textarea maxLength={3000} value={d.review} onChange={e=>set({review:e.target.value})}/></label>}
  <div className="q-form-actions"><button type="button" className="q-btn q-blue" onClick={cancel}>取消</button><button className="q-btn q-green" disabled={photoBusy}>{isNew?'新增美食':'保存修改'}</button></div>
 </form>}
 function spotForm(d:QuestEntry){const ride=isRide(d),ms=metricsFor(d,kindMetrics);return <form onSubmit={save} className="q-form q-spot-form">
  <h2 className="q-form-title">{isNew?'添加景點':'編輯景點'}</h2>
  <p className="q-muted">帶 * 為必填。點擊或拖動評分條設定 1-10 分（10 分最好）。景點與機動遊戲各有自己的評分指標。</p>
  <label>名稱 *<input required maxLength={100} value={d.name} onChange={e=>set({name:e.target.value})} placeholder={ride?'例：世界最大翻斗水桶':'例：維多利亞港'}/></label>
  <div className="q-field"><span>類型</span><div className="q-pick q-type-pick">{([['spot','景點'],['ride','機動遊戲']] as const).map(([v,l])=><button type="button" key={v} className={((d.spotType||'spot')===v?'on ':'')+v} onClick={()=>set({spotType:v})}>{l}</button>)}</div></div>
  <div className="q-field"><span>所屬檔案</span><div className="q-pick q-folder-pick">{[{id:'',name:'未分類'},...folders].map(f=><button type="button" key={f.id||'none'} className={d.folder===f.id?'on':''} onClick={()=>set({folder:f.id})}>{f.name}</button>)}</div></div>
  <label>區域地點<input maxLength={150} value={d.region} onChange={e=>set({region:e.target.value})} placeholder="例：香港・九龍"/></label>
  <div className="q-field"><span>適配季節（可多選）</span><div className="q-pick seasons">{['春','夏','秋','冬'].map(s=><button type="button" key={s} className={(d.seasons.includes(s)?'on ':'')+SEASON_CLASS[s]} onClick={()=>set({seasons:d.seasons.includes(s)?d.seasons.filter(x=>x!==s):['春','夏','秋','冬'].filter(x=>x===s||d.seasons.includes(x))})}>{s}</button>)}</div></div>
  <label>門票（景區／樂園）<span className="q-money"><CurrencyPick entry={d} data={budgetData} onChange={set}/><input maxLength={150} value={d.ticket} onChange={e=>set({ticket:e.target.value})} placeholder="例：220 或 免費"/></span></label>
  <label>項目／設施收費（可選填）<input maxLength={150} value={d.ride} onChange={e=>set({ride:e.target.value})} placeholder="例：150（纜車、單項設施等，貨幣同上）"/></label>
  <label>建議遊玩時間（可選填）<input maxLength={150} value={d.duration} onChange={e=>set({duration:e.target.value})} placeholder="例：約 2-3 小時"/></label>
  <hr className="q-dash"/>
  <div className="q-slider-list">{ms.map(m=>{const v=mine(d)[m.id];return <div className="q-slide-row" key={m.id} style={{'--c':metricColor(m)} as CSSProperties}><span className="q-micon">{spotIcons[m.id]||<Star/>}</span><span className="q-mname">{m.name}{m.reverse&&<em className="q-down" title="低分更好">↓</em>}</span><Slider min={1} label={m.name+(m.reverse?'（低分更好）':'')} color={metricColor(m)} value={v} onChange={nv=>setDraftScore(m.id,nv)}/><b className="q-num">{typeof v==='number'?num(v,0):'–'}/10</b></div>})}</div>
  <label>備註（可選填）<textarea maxLength={3000} value={d.notes} onChange={e=>set({notes:e.target.value})} placeholder="交通、注意事項、拍攝位……"/></label>
  {d.review&&<label>感想<textarea maxLength={3000} value={d.review} onChange={e=>set({review:e.target.value})}/></label>}
  <BudgetMore entry={d} data={budgetData} trips={trips} onChange={set}/>
  <div className="q-form-actions"><button type="button" className="q-btn" onClick={cancel}>取消</button><button className="q-btn q-green" disabled={photoBusy}>儲存</button></div>
 </form>}
 function hotelForm(d:QuestEntry){return <form onSubmit={save} className="q-form"><h2 className="q-form-title">{isNew?'新增酒店':'編輯酒店'}</h2><label>酒店名稱<input required maxLength={100} value={d.name} onChange={e=>set({name:e.target.value})}/></label><div className="q-field"><span>記入旅費</span><p className="q-muted">呢度設定只喺編輯時見到，評分頁面唔會顯示，方便截圖。</p><BudgetLine entry={d} data={budgetData} trips={trips} onChange={set}/></div><div className="q-form-actions"><button type="button" className="q-btn" onClick={cancel}>取消</button><button className="q-btn q-green">儲存</button></div></form>}

 return <section className={`quest qk-${kind}${navy?' q-navy':''}`}>
  <nav className="q-kinds" aria-label="評鑑類別">{(['hotel','spot','food'] as QuestKind[]).map(k=><button key={k} className={k===kind?'on':''} onClick={()=>switchKind(k)}>{k==='hotel'?<BedDouble/>:k==='spot'?<Mountain/>:<UtensilsCrossed/>}{questTitles[k]}</button>)}<small>跨旅程共用圖鑑</small><button className="q-look" aria-pressed={navy} onClick={toggleLook}>{navy?'切換：米白模式':'切換：藍色模式'}</button></nav>
  {header}
  {kind==='hotel'&&<div className="q-stripe" aria-hidden="true"/>}
  {tabs}
  {saved&&!draft&&<div className="q-notice q-draft-offer"><span>有一份 {ago(saved.at)} 未儲存嘅評鑑草稿「{saved.value.name||'未命名'}」</span><button className="q-btn q-green" onClick={()=>{const d=saved.value;setKind(d.kind);edited.current=true;setDraft(d);setSaved(null)}}>繼續編輯</button><button className="q-btn" onClick={()=>{saveValue(DRAFT,null);setSaved(null)}}>捨棄</button></div>}
  {view==='rank'?<>{kind!=='spot'&&kind!=='hotel'&&folderChips}{ranking}</>:kind==='hotel'?hotelView():kind==='food'?foodView:spotView}
  {notice&&<p role="status" className="q-notice">{notice}</p>}
  {exports.length>0&&<div className="q-downloads">{exports.map((f,i)=><a key={f.url} href={f.url} download={f.name}>↓ 下載排行榜 PNG · 第 {i+1} 頁</a>)}</div>}
  <p className="q-sync">評分自動儲存喺本機 · 登入後自動同步共用圖鑑</p>
  <dialog ref={dialog} className={`q-modal quest qk-${kind}${navy?' q-navy':''}`} onInput={()=>{edited.current=true}} onCancel={e=>{if(e.target!==e.currentTarget)return;e.preventDefault();if(draft)cancel();else close()}}>
   {(draft||folderForm||metrics)&&<button type="button" className="q-close" aria-label="關閉" onClick={()=>draft?cancel():close()}><X/></button>}
   {draft&&(draft.kind==='food'?foodForm(draft):draft.kind==='spot'?spotForm(draft):hotelForm(draft))}
   {folderForm&&<form className="q-form" onSubmit={e=>{e.preventDefault();const name=folderForm.name.trim();if(!name)return;commit(n=>{if(folderForm.id)n.folders.find(f=>f.id===folderForm.id)!.name=name;else n.folders.push({id:crypto.randomUUID(),name,kind})});close()}}><h2 className="q-form-title">{folderForm.id?'分類改名':'新增分類'}</h2><label>分類名稱<input required maxLength={60} value={folderForm.name} onChange={e=>setFolderForm({...folderForm,name:e.target.value})} placeholder="例如 北疆美食／東京酒店"/></label><div className="q-form-actions"><button type="button" className="q-btn" onClick={()=>close()}>取消</button><button className="q-btn q-green">儲存</button></div></form>}
   {metrics&&<form className="q-form" onSubmit={e=>{e.preventDefault();if(!metrics.length||metrics.some(m=>!m.name.trim()))return;commit(n=>{n.metrics[kind]=metrics.map(m=>({...m,name:m.name.trim()}))});close()}}><h2 className="q-form-title">評分指標</h2><p className="q-muted">改動會套用到呢個類別全部記錄。「低分更好」會用「10 − 原分」計綜合分；新增指標會令未評齊項目顯示待評。</p>{metrics.map((m,i)=><div className="q-metric-editor" key={m.id}><input aria-label="指標顏色" type="color" value={metricColor(m)} onChange={e=>setMetrics(metrics.map((x,j)=>j===i?{...x,color:e.target.value}:x))}/><input aria-label="指標名稱" required maxLength={35} value={m.name} onChange={e=>setMetrics(metrics.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/><button type="button" className="q-btn" onClick={()=>setMetrics(metrics.map((x,j)=>j===i?{...x,reverse:!x.reverse}:x))}>{m.reverse?'低分更好':'高分更好'}</button><button type="button" className="q-btn" disabled={metrics.length<=1||kind==='hotel'&&m.id==='breakfast'} onClick={()=>{if(window.confirm('停用呢個評分指標？原有分數仍保留喺備份。'))setMetrics(metrics.filter((_,j)=>j!==i))}}>移除</button></div>)}<div className="q-form-actions"><button type="button" className="q-btn" disabled={metrics.length>=12} onClick={()=>setMetrics([...metrics,{id:crypto.randomUUID(),name:'新指標',color:'#8b77d8',reverse:false}])}><Plus/> 新增指標</button><button className="q-btn q-green">儲存指標</button></div></form>}
  </dialog>
 </section>
}
