import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=async p=>ts.transpileModule(await readFile(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const modelUrl=url(await source('app/quest-model.ts'));
const {emptyQuest,newQuestEntry,questScore,questGrade}=await import(modelUrl);
const {demo,validData}=await import(url(await source('app/model.ts')));
const {rankingPages}=await import(url((await source('app/quest-export.ts')).replace("'./quest-model'",JSON.stringify(modelUrl))));
const q=emptyQuest(),food=newQuestEntry('food');food.name='Test food';
assert.equal(questScore(food,q.metrics.food),null);
food.scores={taste:0,appearance:0,value:0,portion:0};assert.equal(questScore(food,q.metrics.food),0);
food.scores={taste:8,appearance:9,value:7,portion:8};assert.equal(questScore(food,q.metrics.food),8);
food.spice='爆辣';assert.equal(questScore(food,q.metrics.food),8);
const hotel=newQuestEntry('hotel');hotel.name='Hotel';hotel.scores=Object.fromEntries(q.metrics.hotel.map(m=>[m.id,8]));hotel.scores.breakfast=null;assert.equal(questScore(hotel,q.metrics.hotel),8);hotel.breakfast=true;assert.equal(questScore(hotel,q.metrics.hotel),null);hotel.scores.breakfast=2;assert.equal(questScore(hotel,q.metrics.hotel),7);
const spot=newQuestEntry('spot');spot.name='Spot';spot.scores={view:9,crowd:2,photo:7};assert.equal(questScore(spot,q.metrics.spot),8);
assert.deepEqual([null,0,4,6,8,9,10].map(questGrade),['—','D','C','B','A','S','S']);
const data=demo();assert.ok(validData(data));data.quest=q;q.entries.push(food,hotel,spot);assert.ok(validData(data));assert.deepEqual(JSON.parse(JSON.stringify(data)).quest,q);
for(const mutate of [d=>d.quest.entries[0].scores.taste=11,d=>d.quest.entries[0].folder='missing',d=>d.quest.metrics.food=[],d=>d.quest.entries[0].photo='https://external.invalid/photo',d=>d.quest.entries.push(d.quest.entries[0])]){const bad=structuredClone(data);mutate(bad);assert.equal(validData(bad),false)}
assert.deepEqual(rankingPages(Array.from({length:41},()=>food)).map(p=>p.length),[20,20,1]);
const {syncAttachments}=await import(url(await source('app/attachment-sync.ts')));
const cloud=await syncAttachments(data,{storage:{from:()=>({})}},async()=>undefined,()=>{});assert.deepEqual(cloud.quest,q);assert.notEqual(cloud.quest,q);
console.log('PASS: incomplete and zero ratings, spice exclusion, breakfast opt-in, reverse metrics, grade boundaries, old/new backup compatibility, invalid records, PNG pagination and cloud payload preservation.');

// Rides (機動遊戲) use their own five metrics; queue time and stamina count lower-is-better.
{const {RIDE_METRICS}=await import(modelUrl);const q2=emptyQuest();const r={...newQuestEntry('spot'),spotType:'ride',scores:{thrill:8,queue:2,gforce:6,stamina:4,experience:10}};
assert.equal(RIDE_METRICS.length,5);assert.equal(questScore(r,q2.metrics.spot),(8+8+6+6+10)/5);
const s2={...r,spotType:'spot'};assert.equal(questScore(s2,q2.metrics.spot),null);
console.log('PASS: spot vs ride metrics.')}
