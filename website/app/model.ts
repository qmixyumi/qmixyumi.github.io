import type {QuestData} from './quest-model';
import type {Attachment} from './attachments';
import type {Ticket} from './tickets';
export type Shot={id:string;kind:'shot'|'line';text:string;done:boolean};
export type Split={mode:'equal'|'amount'|'percent';shares:Record<string,number>};
export type Settlement={deletedAt?:string;id:string;title:string;from:string;to:string;amount:number;date:string};
export type Stop={shots?:Shot[];lat?:number;lng?:number;deletedAt?:string;id:string;day:number;time:string;end:string;title:string;kind:string;place:string;note:string;status:string;travel:string;minutes:number;rating:Record<string,number|null>;photo?:string;booking?:string;planB?:string;details?:Record<string,string>;metrics?:Record<string,number|null>};
export type Expense={split?:Split;deletedAt?:string;id:string;title:string;amount:number;currency:string;rate:number;payer:string;people:string[];status:string;category:string;date:string};
export type Trip={settlements?:Settlement[];deletedAt?:string;timezone?:string;id:string;name:string;destination:string;start:string;end:string;budget:number;attachments?:Attachment[];tickets?:Ticket[];stops:Stop[];expenses:Expense[];checks:{deletedAt?:string;id:string;title:string;done:boolean}[];notes:{deletedAt?:string;id:string;date:string;text:string;photo?:string;gallery?:{photo:string;deletedAt?:string}[]}[]};
export type Data={version:1;trips:Trip[];photos?:Attachment[];quest?:QuestData};
export const kinds:Record<string,string>={景點:'⛩',美食:'🍜',酒店:'🏯',交通:'🚃',購物:'🎁',活動:'🎟',日常:'🌿'};
export const statusList=['想去','已安排','已預訂','已到訪','取消'];
export const uid=()=>crypto.randomUUID();
export const days=(t:Trip)=>Math.round((Date.parse(t.end)-Date.parse(t.start))/86400000)+1;
export const dateAt=(t:Trip,d:number)=>new Date(Date.parse(t.start)+(d-1)*86400000).toISOString().slice(0,10);
export const amount=(v:number)=>new Intl.NumberFormat('en-HK',{maximumFractionDigits:2}).format(v);
/** A full sample trip so a first-time visitor can see every page with real-looking content. */
export function demo():Data {
 type Row=[number,string,string,string,string,string,string,string,string,number,number,number,string?,string?];
 const rows:Row[]=[
  [1,'09:00','10:00','抵達京都站','交通','京都站','從呢度開始，一齊慢慢探索。','已到訪','步行',15,34.9858,135.7588],
  [1,'10:30','12:00','清水寺 · 山上的風景','景點','清水寺 京都','沿住石板路，搵一個最鍾意嘅角度。','已安排','步行',20,34.9949,135.7850,'','落雨就改去三十三間堂'],
  [1,'12:30','13:30','二年坂 · 午餐時間','美食','二年坂 京都','留返少少胃口俾抹茶甜品。','已預訂','步行',10,34.9982,135.7808,'訂位 #KY2031'],
  [1,'14:00','15:30','祇園 · 漫步小巷','景點','祇園 京都','慢慢行，沿途收藏小店。','已安排','巴士',25,35.0037,135.7752],
  [1,'16:00','17:00','町家旅宿 · 放低行李','酒店','京都 河原町','入住時間及地址以訂單為準。','已預訂','步行',15,35.0037,135.7690,'Booking 4471-2290'],
  [2,'07:30','09:30','伏見稻荷大社 · 千本鳥居','景點','伏見稻荷大社','早啲去，人少啲好影相。','已安排','火車',30,34.9671,135.7727],
  [2,'12:00','13:00','錦市場 · 食好西','美食','錦市場 京都','玉子燒、豆乳甜甜圈。','想去','巴士',40,35.0050,135.7649],
  [2,'14:00','17:00','嵐山竹林 · 渡月橋','景點','嵐山 京都','黃昏去渡月橋睇日落。','已安排','火車',40,35.0170,135.6713,'','落雨改去京都水族館'],
  [3,'10:00','11:30','金閣寺','景點','金閣寺 京都','金色倒影，記得影水面。','已安排','巴士',30,35.0394,135.7292],
  [3,'15:00','17:00','四条河原町 · 購物','購物','四条河原町','手信：八橋、抹茶。','想去','步行',15,35.0038,135.7688],
 ];
 const stops:Stop[]=rows.map((x,i)=>({id:`demo-${i}`,day:x[0],time:x[1],end:x[2],title:x[3],kind:x[4],place:x[5],note:x[6],status:x[7],travel:x[8],minutes:x[9],lat:x[10],lng:x[11],rating:{QMI:null,YUMI:null},...(x[12]?{booking:x[12]}:{}),...(x[13]?{planB:x[13]}:{})}));
 const jpy=0.052;
 const expenses:Expense[]=[
  {id:'demo-x1',title:'機票（兩人）',amount:4680,currency:'HKD',rate:1,payer:'QMI',people:['QMI','YUMI'],status:'已付',category:'交通',date:'2026-11-20'},
  {id:'demo-x2',title:'町家旅宿 4 晚',amount:88000,currency:'JPY',rate:jpy,payer:'YUMI',people:['QMI','YUMI'],status:'已付',category:'酒店',date:'2026-11-20'},
  {id:'demo-x3',title:'二年坂午餐',amount:4200,currency:'JPY',rate:jpy,payer:'QMI',people:['QMI','YUMI'],status:'已付',category:'美食',date:'2026-11-20'},
  {id:'demo-x4',title:'清水寺門票',amount:800,currency:'JPY',rate:jpy,payer:'YUMI',people:['QMI','YUMI'],status:'已付',category:'景點',date:'2026-11-20'},
 ];
 const tickets:Ticket[]=[
  {id:'demo-t1',type:'flight',from:'香港 HKG',to:'大阪關西 KIX',departure:'2026-11-20T01:40',arrival:'2026-11-20T06:15',departureZone:'Asia/Hong_Kong',arrivalZone:'Asia/Tokyo',number:'UO 862',boarding:'01:05',seat:'23A／23B',cabin:'經濟',currency:'HKD',fare:null,note:'示範票券'},
  {id:'demo-t2',type:'flight',from:'大阪關西 KIX',to:'香港 HKG',departure:'2026-11-24T19:30',arrival:'2026-11-24T22:45',departureZone:'Asia/Tokyo',arrivalZone:'Asia/Hong_Kong',number:'UO 863',boarding:'18:55',seat:'',cabin:'經濟',currency:'HKD',fare:null,note:'示範票券'},
 ];
 const notes=[{id:'demo-n1',date:'2026-11-20',text:'第一日落雨後天晴，清水寺嘅紅葉好靚。二年坂嗰間抹茶甜品值得再去！',photo:''}];
 return {version:1,trips:[{id:'demo',name:'京都慢遊記',destination:'京都，日本',start:'2026-11-20',end:'2026-11-24',budget:16000,timezone:'Asia/Tokyo',stops,expenses,tickets,checks:['護照及證件','eSIM／網絡','預訂住宿','行李與充電器'].map((title,i)=>({id:`check-${i}`,title,done:i<2})),notes}]};
}
const photoValid=(v:unknown)=>typeof v==='string'&&(!v||/^photo:[a-f0-9]{64}$/.test(v)||/^data:image\/(png|jpeg|webp);base64,/.test(v));
const zoneValid=(v:unknown)=>{try{if(v===undefined)return true;if(typeof v!=='string')return false;new Intl.DateTimeFormat('en',{timeZone:v});return true}catch{return false}};
const string=(v:unknown)=>typeof v==='string';
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
const iso=(v:unknown)=>string(v)&&/^\d{4}-\d{2}-\d{2}$/.test(v as string)&&Number.isFinite(Date.parse(v as string))&&new Date(v as string).toISOString().slice(0,10)===v;
const scores=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(n=>n===null||(finite(n)&&Number(n)>=0&&Number(n)<=10));
const clock=(v:unknown)=>string(v)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v as string);
const stamp=(v:unknown)=>string(v)&&iso((v as string).slice(0,10))&&(v as string)[10]==='T'&&clock((v as string).slice(11));
const shotsValid=(v:Stop['shots'])=>v===undefined||(Array.isArray(v)&&v.length<=200&&new Set(v.map(x=>x.id)).size===v.length&&v.every(x=>string(x.id)&&string(x.text)&&typeof x.done==='boolean'&&['shot','line'].includes(x.kind)));
const splitValid=(v:Expense['split'])=>v===undefined||(!!v&&['equal','amount','percent'].includes(v.mode)&&!!v.shares&&typeof v.shares==='object'&&Object.entries(v.shares).every(([k,n])=>['QMI','YUMI'].includes(k)&&finite(n)&&n>=0));
const settlementsValid=(v:Trip['settlements'])=>v===undefined||(Array.isArray(v)&&new Set(v.map(x=>x.id)).size===v.length&&v.every(x=>string(x.id)&&string(x.title)&&['QMI','YUMI'].includes(x.from)&&['QMI','YUMI'].includes(x.to)&&x.from!==x.to&&finite(x.amount)&&x.amount>0&&iso(x.date)));
const peopleValid=(v:unknown)=>v===undefined||(!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v as object).every(([k,x])=>['QMI','YUMI'].includes(k)&&scores(x)));
const attachmentsValid=(v:Trip['attachments'])=>v===undefined||(Array.isArray(v)&&new Set(v.map(a=>a.id)).size===v.length&&v.every(a=>string(a.id)&&string(a.name)&&string(a.type)&&finite(a.size)&&a.size>=0&&(a.cloudPath===undefined||/^attachments\/[a-f0-9]{64}$/.test(a.cloudPath))));
const ticketsValid=(v:Trip['tickets'])=>v===undefined||(Array.isArray(v)&&new Set(v.map(t=>t.id)).size===v.length&&v.every(t=>['flight','train','high-speed'].includes(t.type)&&['id','from','to','number','departureZone','arrivalZone','seat','cabin','currency','note'].every(k=>string(t[k as keyof Ticket]))&&stamp(t.departure)&&(t.arrival===''||stamp(t.arrival))&&(t.boarding===''||clock(t.boarding))&&(t.fare===null||(finite(t.fare)&&t.fare>=0))));
function validQuest(q:Data['quest']):boolean{if(q===undefined)return true;try{if(!q||q.version!==1||!Array.isArray(q.folders)||!Array.isArray(q.entries)||!q.metrics)return false;const kinds=['hotel','spot','food'];const unique=(items:{id:string}[])=>items.every(x=>string(x.id)&&x.id.length>0)&&new Set(items.map(x=>x.id)).size===items.length;if(!unique(q.folders)||!unique(q.entries)||!q.folders.every(f=>kinds.includes(f.kind)&&string(f.name)))return false;for(const kind of kinds){const ms=q.metrics[kind as keyof typeof q.metrics];if(!Array.isArray(ms)||ms.length<1||ms.length>12||!unique(ms)||!ms.every(m=>string(m.name)&&/^#[a-f0-9]{6}$/i.test(m.color)&&typeof m.reverse==='boolean'))return false}return q.entries.every(e=>kinds.includes(e.kind)&&['name','folder','region','category','room','price','ticket','ride','duration','spice','review','notes','photo'].every(k=>string(e[k as keyof typeof e]))&&(!e.folder||q.folders.some(f=>f.id===e.folder&&f.kind===e.kind))&&Array.isArray(e.seasons)&&e.seasons.every(s=>['春','夏','秋','冬'].includes(s))&&typeof e.breakfast==='boolean'&&peopleValid((e as {people?:unknown}).people)&&[(e as {sweet?:unknown}).sweet].every(v=>v===undefined||string(v))&&[undefined,'spice','sweet'].includes((e as {level?:string}).level)&&finite(e.created)&&scores(e.scores)&&photoValid(e.photo))}catch{return false}}
function photoLinksValid(d:Data):boolean{const refs=new Set((d.photos||[]).map(x=>x.id));function walk(v:unknown):boolean{if(!v||typeof v!=='object')return true;if(Array.isArray(v))return v.every(walk);const o=v as Record<string,unknown>;if(typeof o.photo==='string'&&o.photo.startsWith('photo:')&&!refs.has(o.photo))return false;return Object.values(o).every(walk)}return walk(d)}
export function validData(x:unknown):x is Data {try{if(!x||typeof x!=='object')return false;const d=x as Data;return d.version===1&&photoLinksValid(d)&&attachmentsValid(d.photos)&&validQuest(d.quest)&&Array.isArray(d.trips)&&new Set(d.trips.map(t=>t.id)).size===d.trips.length&&d.trips.every(t=>zoneValid(t.timezone)&&string(t.id)&&string(t.name)&&string(t.destination)&&iso(t.start)&&iso(t.end)&&days(t)>0&&days(t)<=366&&finite(t.budget)&&t.budget>=0&&attachmentsValid(t.attachments)&&ticketsValid(t.tickets)&&settlementsValid(t.settlements)&&Array.isArray(t.stops)&&new Set(t.stops.map(s=>s.id)).size===t.stops.length&&t.stops.every(s=>string(s.title)&&string(s.id)&&Number.isInteger(s.day)&&s.day>=1&&s.day<=days(t)&&scores(s.rating)&&(s.lat===undefined||finite(s.lat)&&Math.abs(s.lat)<=90)&&(s.lng===undefined||finite(s.lng)&&Math.abs(s.lng)<=180)&&string(s.place)&&string(s.note)&&string(s.kind)&&string(s.status)&&string(s.travel)&&finite(s.minutes)&&s.minutes>=0&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)&&(s.end===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end))&&(s.photo===undefined||photoValid(s.photo))&&shotsValid(s.shots))&&Array.isArray(t.expenses)&&t.expenses.every(e=>string(e.id)&&string(e.title)&&finite(e.amount)&&e.amount>=0&&finite(e.rate)&&e.rate>0&&Array.isArray(e.people)&&e.people.length>0&&new Set(e.people).size===e.people.length&&e.people.every(p=>['QMI','YUMI'].includes(p))&&['QMI','YUMI'].includes(e.payer)&&['已付','未付','退款'].includes(e.status)&&string(e.currency)&&string(e.category)&&iso(e.date)&&splitValid(e.split))&&Array.isArray(t.checks)&&t.checks.every(c=>string(c.id)&&string(c.title)&&typeof c.done==='boolean')&&Array.isArray(t.notes)&&t.notes.every(n=>string(n.id)&&string(n.text)&&iso(n.date)&&(n.photo===undefined||photoValid(n.photo))&&(n.gallery===undefined||(Array.isArray(n.gallery)&&n.gallery.length<=8&&n.gallery.every(g=>!!g&&photoValid(g.photo)&&!!g.photo)))));}catch{return false}}
