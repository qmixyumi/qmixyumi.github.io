import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const load=async(path,prefix='')=>{let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;code=prefix+code.replace(/^import .*$/gm,'').replace(/^export \{[^}]*\} from .*$/gm,'');return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))};
const {demo,validData}=await load('app/model.ts');
const {tripWarnings}=await load('app/trip-check.ts');
const {planOf,shareLink,readShared}=await load('app/share.tsx');
const {PACK_TEMPLATES}=await load('app/packing.tsx');
// Full sample trip: valid, several days, spending, tickets, a diary page, coordinates and a time zone, and no false alarms.
const d=demo(),t=d.trips[0];
assert.ok(validData(d));assert.equal(t.timezone,'Asia/Tokyo');
assert.ok(new Set(t.stops.map(s=>s.day)).size>=3);assert.ok(t.expenses.length>=3);assert.ok(t.tickets.length>=1);assert.ok(t.notes.length>=1);
assert.ok(t.stops.every(s=>typeof s.lat==='number'&&typeof s.lng==='number'));
assert.equal(tripWarnings(t).length,0);
// Diary pages may hold several photos.
const g=demo();g.photos=[{id:'photo:'+'a'.repeat(64),name:'a.jpg',type:'image/jpeg',size:3}];g.trips[0].notes[0].gallery=[{photo:'data:image/jpeg;base64,aGk='},{photo:'photo:'+'a'.repeat(64)}];assert.ok(validData(g));
g.trips[0].notes[0].gallery=[{photo:'https://example.com/x.jpg'}];assert.equal(validData(g),false);
g.trips[0].notes[0].gallery=Array.from({length:9},()=>({photo:'photo:'+'b'.repeat(64)}));assert.equal(validData(g),false);
// Read-only share link: round trip, and private details stay out.
const plan=planOf(t);
assert.equal(plan.stops.length,t.stops.length);
const text=JSON.stringify(plan);
for(const secret of ['KY2031','4471-2290','23A','88000','第一日落雨'])assert.ok(!text.includes(secret),'share must not include '+secret);
const link=await shareLink(t,'https://example.test');
assert.ok(link.startsWith('https://example.test/#share='));assert.ok(link.length<6000,'link stays short: '+link.length);
const back=await readShared(link.slice(link.indexOf('#')));
assert.deepEqual(back,plan);
await assert.rejects(readShared('#share=broken'));
// Packing templates have no duplicates inside a template.
for(const p of PACK_TEMPLATES)assert.equal(new Set(p.items).size,p.items.length,p.name);
console.log('PASS: full demo trip, multi-photo diary validation, private-safe share link round trip and packing templates.');

// Shortened trips retain recycled DAY values, but restoring requires a valid new day.
{
 const {restoreStopDay}=await load('app/travel-tools.ts');
 const d=demo(),t=d.trips[0];t.stops.forEach(s=>s.deletedAt='2026-11-13T00:00:00Z');
 t.stops[0].day=5;t.end=t.start;
 assert.ok(validData(d),'recycled later days do not invalidate shortened trips or backups');
 const id=t.stops[0].id;
 assert.equal(restoreStopDay(t,id,5),false);assert.ok(t.stops[0].deletedAt);
 assert.equal(restoreStopDay(t,id,1.5),false);
 assert.equal(restoreStopDay(t,id,1),true);assert.equal(t.stops[0].deletedAt,undefined);
 assert.equal(t.stops[0].day,1);assert.ok(validData(d));
 t.stops[0].day=2;assert.equal(validData(d),false,'live stops must still fit dates');
}
console.log('PASS: shortened trip backups preserve recycled stops; restore validates replacement day.');
