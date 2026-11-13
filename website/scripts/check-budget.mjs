import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
// Loads a module on its own: local imports are removed and the few helpers they provided are prepended.
const load=async(path,prefix='')=>{let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;code=prefix+code.replace(/^import .*$/gm,'').replace(/^export \{[^}]*\} from .*$/gm,'');return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))};
const model=await load('app/model.ts');
const {demo,validData,tripPeople}=model;
const amountFn='const amount=v=>new Intl.NumberFormat("en-HK",{maximumFractionDigits:2}).format(v);';
const {balances,perPerson,transfers}=await load('app/split.ts',amountFn);
const helpers=amountFn+'const kinds='+JSON.stringify(model.kinds)+';const dateAt=(t,d)=>new Date(Date.parse(t.start)+(d-1)*86400000).toISOString().slice(0,10);const tripPeople=t=>t.people&&t.people.length?t.people:["QMI","YUMI"];const currencies=["HKD","CNY"];const colorOf=()=>"#000";const travelIcon=()=>"";const _jsx=()=>null,_jsxs=()=>null,_Fragment=null;const useState=v=>[v,()=>{}],useEffect=()=>{},useRef=v=>({current:v});';
const {syncAuto,syncAll,missingRates,autoSources,tripCurrency,zoneCurrency,usualCurrency}=await load('app/budget.tsx',helpers);

const d=demo(),t=d.trips[0];
t.expenses=[];t.tickets=[];
const [a,b]=t.stops.filter(s=>s.day===1).sort((x,y)=>x.time.localeCompare(y.time));
// A taxi fare on a leg becomes one transport expense, paid by the first traveller and shared by everyone.
a.travel='的士';a.fare={amount:80,currency:'HKD'};
assert.equal(syncAuto(t),true);
let e=t.expenses.find(x=>x.source==='leg:'+a.id);
assert.ok(e&&e.amount===80&&e.category==='交通'&&e.rate===1&&e.payer==='QMI'&&e.people.join()==='QMI,YUMI');
assert.match(e.title,/的士：.* → /);
assert.equal(syncAuto(t),false,'running again changes nothing');
assert.ok(validData(d));
// Edits made in the ledger (payer, status) survive a price change; the amount follows the source.
e.payer='YUMI';e.status='未付';a.fare.amount=95;syncAuto(t);
e=t.expenses.find(x=>x.source==='leg:'+a.id);assert.equal(e.amount,95);assert.equal(e.payer,'YUMI');assert.equal(e.status,'未付');
// Clearing the price removes the row, deleting the stop removes it too.
delete a.fare;syncAuto(t);assert.equal(t.expenses.filter(x=>x.source).length,0);
b.cost={amount:1200,currency:'HKD'};syncAuto(t);assert.equal(t.expenses.find(x=>x.source==='stop:'+b.id).category,b.kind);
b.deletedAt='2026-11-12T00:00:00Z';syncAuto(t);assert.equal(t.expenses.length,0);delete b.deletedAt;
// A ticket fare in a foreign currency waits for a rate, then is counted.
t.tickets=[{id:'k',type:'high-speed',from:'深圳北',to:'長沙南',departure:t.start+'T10:39',arrival:'',departureZone:'',arrivalZone:'',number:'G1152',boarding:'',seat:'',cabin:'',currency:'CNY',fare:431,note:''}];
syncAuto(t);assert.equal(t.expenses.some(x=>x.source==='ticket:k'),false);assert.deepEqual(missingRates(t),['CNY']);
t.rates={CNY:1.09};syncAuto(t);e=t.expenses.find(x=>x.source==='ticket:k');assert.ok(e&&e.rate===1.09&&e.title.startsWith('G1152'));
assert.deepEqual(missingRates(t),[]);assert.equal(tripCurrency(t),'CNY');
assert.ok(validData(d));
// A manual expense is never touched; a ticket that is deleted takes its row away.
t.expenses.push({id:'m',title:'晚餐',amount:300,currency:'HKD',rate:1,payer:'QMI',people:['QMI','YUMI'],status:'已付',category:'美食',date:t.start});
t.tickets[0].deletedAt='x';syncAuto(t);assert.deepEqual(t.expenses.map(x=>x.id),['auto-stop-'+b.id,'m']);

// More travellers: validation, average per head and the fewest repayments.
const g=demo(),u=g.trips[0];
assert.deepEqual(tripPeople(u),['QMI','YUMI'],'old trips mean QMI and YUMI');
u.people=['QMI','YUMI','阿明'];
u.expenses=[{id:'1',title:'酒店',amount:900,currency:'HKD',rate:1,payer:'QMI',people:['QMI','YUMI','阿明'],status:'已付',category:'酒店',date:u.start},{id:'2',title:'晚餐',amount:300,currency:'HKD',rate:1,payer:'阿明',people:['QMI','YUMI','阿明'],status:'已付',category:'美食',date:u.start}];
assert.ok(validData(g));
const p=perPerson(u);assert.equal(p.total,1200);assert.equal(p.average,400);assert.equal(p.paid.QMI,900);assert.equal(p.share.YUMI,400);
const bal=balances(u);assert.equal(Math.round(bal.QMI),500);assert.equal(Math.round(bal.YUMI),-400);assert.equal(Math.round(bal['阿明']),-100);
assert.deepEqual(transfers(bal),[{from:'YUMI',to:'QMI',amount:400},{from:'阿明',to:'QMI',amount:100}]);
u.settlements=[{id:'s1',title:'x',from:'YUMI',to:'QMI',amount:400,date:u.start},{id:'s2',title:'y',from:'阿明',to:'QMI',amount:100,date:u.start}];
assert.ok(validData(g));assert.deepEqual(transfers(balances(u)),[]);
const bad=structuredClone(g);bad.trips[0].expenses[0].payer='陌生人';assert.equal(validData(bad),false,'payer must be a traveller');
const bad2=structuredClone(g);bad2.trips[0].people=['QMI','QMI'];assert.equal(validData(bad2),false,'no duplicate travellers');
const bad3=structuredClone(g);bad3.trips[0].stops[0].fare={amount:-1,currency:'HKD'};assert.equal(validData(bad3),false,'no negative fares');
const bad4=structuredClone(g);bad4.trips[0].budgets={美食:-5};assert.equal(validData(bad4),false,'no negative category budget');
assert.equal(syncAll(g),false,'a trip without prices gets no automatic rows');
// A new expense starts in the trip's usual currency: a Kyoto trip with no prices yet still starts in JPY.
assert.equal(zoneCurrency('Asia/Tokyo'),'JPY');assert.equal(zoneCurrency('Europe/Paris'),'EUR');assert.equal(zoneCurrency('Asia/Hong_Kong'),'');
{const k={...structuredClone(g.trips[0]),id:'kyoto-test',timezone:'Asia/Tokyo',expenses:[],tickets:[],stops:[],rates:{JPY:0.05}};const u=usualCurrency(k);assert.equal(u.currency,'JPY');assert.equal(u.rate,0.05);
assert.equal(usualCurrency({...k,timezone:'Asia/Hong_Kong'}).currency,'HKD');}
console.log('PASS: leg fares, stop costs and ticket fares counted automatically (kept in step, rates, removal), category budgets and travellers validation, per-head average, fewest repayments and the usual trip currency.');
