import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
// Loads a module on its own: local imports are removed and the few helpers they provided are prepended.
const load=async(path,prefix='')=>{let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;code=prefix+code.replace(/^import .*$/gm,'').replace(/^export \{[^}]*\} from .*$/gm,'');return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))};
const {demo,validData}=await load('app/model.ts');
const amountFn='const amount=v=>new Intl.NumberFormat("en-HK",{maximumFractionDigits:2}).format(v);';
const {shareOf,balances,readSplit}=await load('app/split.ts',amountFn);
const {tripWarnings}=await load('app/trip-check.ts');
const {makeZip,readZip,crc32}=await load('app/zip.ts');
const {suggestZone,zoneLabel}=await load('app/zones.tsx','const _jsx=()=>null,_jsxs=()=>null;');
const quest=await load('app/quest-model.ts');

// Time zones: friendly names and suggestions from the destination.
assert.equal(suggestZone('京都，日本'),'Asia/Tokyo');assert.equal(suggestZone('長沙 3 日'),'Asia/Shanghai');assert.equal(suggestZone('首爾'),'Asia/Seoul');assert.equal(suggestZone('火星'),'');
assert.match(zoneLabel('Asia/Tokyo'),/日本／東京 UTC\+9/);

// Split bills: fixed amounts, percentages and repayments.
const d=demo(),t=d.trips[0];
t.expenses=[{id:'a',title:'Hotel',amount:1000,currency:'HKD',rate:1,payer:'QMI',people:['QMI','YUMI'],status:'已付',category:'酒店',date:'2026-11-20',split:{mode:'amount',shares:{QMI:700,YUMI:300}}},{id:'b',title:'Dinner',amount:10000,currency:'JPY',rate:0.05,payer:'YUMI',people:['QMI','YUMI'],status:'已付',category:'美食',date:'2026-11-20',split:{mode:'percent',shares:{QMI:60,YUMI:40}}},{id:'c',title:'Snack',amount:100,currency:'HKD',rate:1,payer:'QMI',people:['QMI','YUMI'],status:'已付',category:'美食',date:'2026-11-21'}];
assert.equal(shareOf(t.expenses[0],'YUMI'),0.3);assert.equal(shareOf(t.expenses[1],'QMI'),0.6);assert.equal(shareOf(t.expenses[2],'QMI'),0.5);
let b=balances(t);assert.ok(Math.abs(b.QMI-(300-300+50))<1e-9,'QMI gets 300 for the hotel, owes 300 for dinner, gets 50 for snacks');assert.ok(Math.abs(b.QMI+b.YUMI)<1e-9);
t.settlements=[{id:'s',title:'YUMI 還 QMI HKD 50',from:'YUMI',to:'QMI',amount:50,date:'2026-11-22'}];b=balances(t);assert.ok(Math.abs(b.QMI)<1e-9&&Math.abs(b.YUMI)<1e-9,'repayment clears the debt');
assert.ok(validData(d));
t.settlements[0].deletedAt='2026-11-23T00:00:00Z';assert.ok(Math.abs(balances(t).QMI-50)<1e-9,'a deleted repayment no longer counts');
const form=(o)=>({get:k=>o[k]??null});
assert.match(readSplit(form({'split-mode':'amount','share-QMI':'500','share-YUMI':'400'}),['QMI','YUMI'],1000),/要等於全單總額/);
assert.match(readSplit(form({'split-mode':'percent','share-QMI':'50','share-YUMI':'40'}),['QMI','YUMI'],1000),/100%/);
assert.deepEqual(readSplit(form({'split-mode':'percent','share-QMI':'50','share-YUMI':'50'}),['QMI','YUMI'],1000),{mode:'percent',shares:{QMI:50,YUMI:50}});
assert.equal(readSplit(form({}),['QMI','YUMI'],10),undefined);
const bad=structuredClone(d);bad.trips[0].settlements=[{id:'x',title:'x',from:'QMI',to:'QMI',amount:5,date:'2026-11-22'}];assert.equal(validData(bad),false,'cannot repay yourself');
const bad2=structuredClone(d);bad2.trips[0].expenses[0].split={mode:'weird',shares:{}};assert.equal(validData(bad2),false);

// Shot lists live on stops and are validated.
d.trips[0].stops[1].shots=[{id:'x1',kind:'shot',text:'清水舞台全景',done:false},{id:'x2',kind:'line',text:'講點解揀呢度',done:true}];assert.ok(validData(d));
const bad3=structuredClone(d);bad3.trips[0].stops[1].shots[0].kind='video';assert.equal(validData(bad3),false);

// Time warnings: overlaps, travel time, past-midnight and tickets outside the trip.
const w=demo().trips[0];w.stops[1].time='09:30';w.stops[1].end='11:00';w.stops[3].end='13:00';w.stops[3].time='14:00';
w.stops.push({...w.stops[0],id:'late',day:2,time:'02:00',end:'01:00',title:'夜景'});
w.tickets=[{id:'tk',type:'flight',from:'HKG',to:'KIX',departure:'2026-12-01T10:00',arrival:'2026-12-01T14:00',departureZone:'',arrivalZone:'',number:'CX1',boarding:'',seat:'',cabin:'',currency:'HKD',fare:null,note:''},{id:'tk2',type:'flight',from:'KIX',to:'HKG',departure:'2026-11-24T23:30',arrival:'2026-11-25T02:30',departureZone:'Asia/Tokyo',arrivalZone:'Asia/Hong_Kong',number:'CX2',boarding:'',seat:'',cabin:'',currency:'HKD',fare:null,note:''}];
const warn=tripWarnings(w).map(x=>x.text).join('\n');
assert.match(warn,/抵達京都站.*清水寺.*時間重疊/);assert.match(warn,/結束 01:00 早過開始 02:00/);assert.match(warn,/CX1.*唔喺旅程日期/);assert.match(warn,/CX2.*跨午夜抵達/);
assert.equal(tripWarnings(demo().trips[0]).length,0,'demo trip has no false alarms');

// ZIP: round trip with Unicode names and binary data.
const bytes=new Uint8Array([0,1,2,255,254]);const zip=makeZip([{name:'backup.json',data:new TextEncoder().encode('{"a":1}')},{name:'attachments/001-長沙行程.docx',data:bytes}]);
const files=await readZip(await zip.arrayBuffer());assert.equal(new TextDecoder().decode(files.get('backup.json')),'{"a":1}');assert.deepEqual([...files.get('attachments/001-長沙行程.docx')],[...bytes]);assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);

// Quest: QMI and YUMI score separately; the shared score is their average and old shared scores are the starting point.
const metrics=quest.emptyQuest().metrics.food;let e={...quest.newQuestEntry('food'),name:'拉麵',scores:{taste:8,appearance:6,value:6,portion:6}};
e=quest.withPersonScore(e,'QMI','taste',10);assert.equal(e.people.QMI.taste,10);assert.equal(e.people.YUMI.taste,8);assert.equal(e.scores.taste,9);
e=quest.withPersonScore(e,'YUMI','value',2);assert.equal(e.scores.value,4);
const gap=quest.biggestGap(e,metrics);assert.equal(gap.name,'性價比');assert.equal(quest.personTotal(e,metrics,'QMI'),(10+6+6+6)/4);
e=quest.withPersonScore(quest.withPersonScore(e,'QMI','portion',null),'YUMI','portion',null);assert.equal(e.scores.portion,null);
const q=quest.emptyQuest();q.entries.push(e);const qd=demo();qd.quest=q;assert.ok(validData(qd));q.entries[0].people.QMI.taste=11;assert.equal(validData(qd),false);
console.log('PASS: time zone suggestions, split by amount/percent, repayments, shot lists, time clash and overnight warnings, ZIP round trip and per-person quest scores.');
