import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function load(path){const code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}
const {parseItinerary,resolveDay}=await load('app/import-parser.ts');
const r=parseItinerary('2026-12-01\n09:00 - 10:00 京都站 | 京都\nDay 2\n12:00 Lunch\n未有時間的項目','test');
assert.equal(r.length,3);assert.equal(r[0].kind,'交通');assert.equal(r[0].place,'京都');assert.equal(resolveDay(r[0],'2026-12-01'),1);assert.equal(resolveDay(r[1],'2026-12-01'),2);assert.equal(r[2].time,'');assert.ok(Number.isNaN(resolveDay({...r[0],date:'2026-02-30'},'2026-02-01')));
const {demo,validData}=await load('app/model.ts');const d=demo();d.trips[0].tickets=[{id:'test',type:'flight',from:'HKG',to:'NRT',departure:'2026-11-20T09:00',arrival:'',departureZone:'',arrivalZone:'',number:'CX500',boarding:'',seat:'',cabin:'',currency:'HKD',fare:null,note:''}];d.trips[0].attachments=[{id:'test',name:'trip.pdf',size:123,type:'application/pdf'}];assert.ok(validData(d));d.trips[0].tickets[0].fare=-1;assert.ok(!validData(d));d.trips[0].tickets[0].fare=0;d.trips[0].attachments[0].size=-1;assert.ok(!validData(d));console.log('PASS: imported dates, missing times, categories, ticket and attachment backup validation');
