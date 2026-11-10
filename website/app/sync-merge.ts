import type {Data} from './model';
export type Conflict={path:string;label:string;local:unknown;remote:unknown};
export type Choices=Record<string,'local'|'remote'>;
export const same=(a:unknown,b:unknown):boolean=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
function normalize(v:unknown):unknown{if(Array.isArray(v))return v.map(normalize);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).filter(([,x])=>x!==undefined).map(([k,x])=>[k,normalize(x)]));return v}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keyed=(v:unknown[]):boolean=>v.every(x=>object(x)&&typeof x.id==='string')&&new Set(v.map(x=>(x as {id:string}).id)).size===v.length;
export function mergeData(base:Data,local:Data,remote:Data,choices:Choices={}){const conflicts:Conflict[]=[];
 function visit(b:unknown,l:unknown,r:unknown,path:string,label:string):unknown{
  if(same(l,r))return structuredClone(l);if(same(l,b))return structuredClone(r);if(same(r,b))return structuredClone(l);
  if(Array.isArray(l)&&Array.isArray(r)&&(b===undefined||Array.isArray(b))&&keyed(l)&&keyed(r)&&keyed((b||[]) as unknown[])){
   const ba=(b||[]) as {id:string}[],la=l as {id:string}[],ra=r as {id:string}[];const ids=[...new Set([...ra,...la,...ba].map(x=>x.id))];
   return ids.flatMap(id=>{const bv=ba.find(x=>x.id===id),lv=la.find(x=>x.id===id),rv=ra.find(x=>x.id===id);const item=(lv||rv||bv) as Record<string,unknown>;const name=String(item.name||item.title||item.text||id);const result=visit(bv,lv,rv,path+'/'+encodeURIComponent(id),label+' / '+name);return result===undefined?[]:[result]});
  }
  if(object(l)&&object(r)&&(b===undefined||object(b))){const result:Record<string,unknown>={};const bo=object(b)?b:{};for(const key of new Set([...Object.keys(bo),...Object.keys(l),...Object.keys(r)])){if(['__proto__','constructor','prototype'].includes(key))continue;const value=visit(bo[key],l[key],r[key],path+'/'+encodeURIComponent(key),label+' / '+key);if(value!==undefined)result[key]=value}return result}
  if(choices[path])return structuredClone(choices[path]==='local'?l:r);
  conflicts.push({path,label,local:l,remote:r});return structuredClone(l);
 }
 return {data:visit(base,local,remote,'','旅行資料') as Data,conflicts};
}
export const emptyData=():Data=>({version:1,trips:[]});
