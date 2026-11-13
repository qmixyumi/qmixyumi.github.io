import type {Data,Trip} from './model';
export const alive=<T extends {deletedAt?:string}>(items:T[])=>items.filter(x=>!x.deletedAt);
/** Calendar cells and day details share the same recoverable-deletion filter. */
export const tripsOnDate=(trips:Trip[],date:string)=>alive(trips).filter(t=>t.start<=date&&t.end>=date);
export function visibleTrip(t:Trip):Trip{return {...t,settlements:alive(t.settlements||[]),stops:alive(t.stops),expenses:alive(t.expenses),checks:alive(t.checks),notes:alive(t.notes),tickets:alive(t.tickets||[])}}
export type BinKind='trips'|'stops'|'expenses'|'tickets'|'notes'|'checks'|'settlements';
export type BinRow={kind:BinKind;id:string;tripId:string;title:string;at:string};
export function trashRows(d:Data):BinRow[]{const rows:BinRow[]=[];for(const t of d.trips){if(t.deletedAt){rows.push({kind:'trips',id:t.id,tripId:t.id,title:t.name,at:t.deletedAt});continue}for(const kind of ['stops','expenses','tickets','notes','checks','settlements'] as const)for(const x of t[kind]||[]){if(x.deletedAt)rows.push({kind,id:x.id,tripId:t.id,title:('title' in x?x.title:'text' in x?x.text:x.from+' → '+x.to).slice(0,100),at:x.deletedAt})}}return rows}
export function markDeleted(d:Data,kind:BinKind,tripId:string,id:string,deleted:boolean){const t=d.trips.find(x=>x.id===tripId);if(!t)return;const item=kind==='trips'?t:t[kind]?.find(x=>x.id===id);if(item)item.deletedAt=deleted?new Date().toISOString():undefined;}
export function localDate(zone:string,now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function todayDay(t:Trip,today:string){const n=Math.floor((Date.parse(today)-Date.parse(t.start))/86400000)+1;return Math.max(1,Math.min(Math.floor((Date.parse(t.end)-Date.parse(t.start))/86400000)+1,n))}
