// Unsaved form drafts kept on this device, so a long journal entry or an expense survives an accidental close or reload.
const PREFIX='adventure-draft:';
export type Draft={at:string;values:[string,string|boolean][]};
type Field=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
const fields=(form:HTMLFormElement)=>Array.from(form.elements).filter((el):el is Field=>(el instanceof HTMLInputElement||el instanceof HTMLSelectElement||el instanceof HTMLTextAreaElement)&&!!el.name&&!(el instanceof HTMLInputElement&&['file','hidden','submit','button'].includes(el.type)));
const keyOf=(el:Field)=>el instanceof HTMLInputElement&&['checkbox','radio'].includes(el.type)?el.name+'='+el.value:el.name;
export function saveDraft(key:string,form:HTMLFormElement){try{const values=fields(form).map(el=>[keyOf(el),el instanceof HTMLInputElement&&['checkbox','radio'].includes(el.type)?el.checked:el.value] as [string,string|boolean]);localStorage.setItem(PREFIX+key,JSON.stringify({at:new Date().toISOString(),values}))}catch{/* storage full or private mode */}}
export function readDraft(key:string):Draft|null{try{const raw=localStorage.getItem(PREFIX+key);if(!raw)return null;const d=JSON.parse(raw) as Draft;return Array.isArray(d.values)?d:null}catch{return null}}
export function clearDraft(key:string){try{localStorage.removeItem(PREFIX+key)}catch{}}
export function saveValue(key:string,value:unknown){try{if(value===null)localStorage.removeItem(PREFIX+key);else localStorage.setItem(PREFIX+key,JSON.stringify({at:new Date().toISOString(),value}))}catch{}}
export function readValue<T>(key:string):{at:string;value:T}|null{try{const raw=localStorage.getItem(PREFIX+key);return raw?JSON.parse(raw):null}catch{return null}}
/** Puts the values back one field at a time through the native setters, so React-controlled fields update too
 * (a currency change may clear the rate, so later fields must be set after earlier ones have re-rendered). */
export async function applyDraft(form:HTMLFormElement,d:Draft){const done=new Set<string>();const tick=()=>new Promise(r=>setTimeout(r,0));
 for(let round=0;round<3;round++){await tick();for(const el of fields(form)){const k=keyOf(el);if(done.has(k))continue;const hit=d.values.find(v=>v[0]===k);if(!hit)continue;done.add(k);const v=hit[1];
  if(el instanceof HTMLInputElement&&['checkbox','radio'].includes(el.type)){if(el.checked!==v)el.click()}
  else{const proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value')?.set?.call(el,String(v));el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}))}
  await tick()}}}
export const ago=(iso:string)=>{const m=Math.round((Date.now()-Date.parse(iso))/60000);return m<1?'啱啱':m<60?m+' 分鐘前':m<1440?Math.round(m/60)+' 小時前':Math.round(m/1440)+' 日前'};
