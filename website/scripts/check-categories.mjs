import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const moduleURL=code=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const {classify,ticketKind,flightNumber,parseItinerary}=await import(moduleURL(await readFile('app/import-parser.ts','utf8')));
const cases=[['CX 504 香港 → 大阪','交通','flight'],['飛往東京','交通','flight'],['乘新幹線去京都','交通','high-speed'],['G79 高鐵 西九龍','交通','high-speed'],['JR 特急 Haruka','交通','train'],['入住 Hotel Gracery','酒店',''],['一蘭拉麵 午餐','美食',''],['壽司郎晚餐','美食',''],['心齋橋購物','購物',''],['清水寺','景點',''],['Training center','景點','']];
for(const [title,kind,ticket] of cases){assert.equal(classify(title),kind,title);assert.equal(ticketKind(title),ticket,title)}
assert.equal(flightNumber('CX 504 香港 → 大阪'),'CX504');assert.equal(flightNumber('清水寺'),'');
const rows=parseItinerary('Day 1\n09:00 | JL 802 台北 → 東京\n13:00 | 一蘭拉麵\n15:00 | 淺草寺','t');
assert.deepEqual(rows.map(r=>[r.kind,r.ticket]),[['交通','flight'],['美食',''],['景點','']]);
console.log('PASS: flight/train/high-speed tickets, hotel, food, shopping and spot categories, flight numbers and imported rows.');
