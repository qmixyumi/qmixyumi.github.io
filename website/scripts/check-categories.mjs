import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const moduleURL=code=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const {classify,ticketKind,flightNumber,parseItinerary,ticketDetails,bookingNote,transportTotal}=await import(moduleURL(await readFile('app/import-parser.ts','utf8')));
const cases=[['CX 504 香港 → 大阪','交通','flight'],['飛往東京','交通','flight'],['乘新幹線去京都','交通','high-speed'],['G79 高鐵 西九龍','交通','high-speed'],['JR 特急 Haruka','交通','train'],['入住 Hotel Gracery','酒店',''],['一蘭拉麵 午餐','美食',''],['壽司郎晚餐','美食',''],['心齋橋購物','購物',''],['清水寺','景點',''],['Training center','景點','']];
for(const [title,kind,ticket] of cases){assert.equal(classify(title),kind,title);assert.equal(ticketKind(title),ticket,title)}
assert.equal(flightNumber('CX 504 香港 → 大阪'),'CX504');assert.equal(flightNumber('清水寺'),'');
const rows=parseItinerary('Day 1\n09:00 | JL 802 台北 → 東京\n13:00 | 一蘭拉麵\n15:00 | 淺草寺','t');
assert.deepEqual(rows.map(r=>[r.kind,r.ticket]),[['交通','flight'],['美食',''],['景點','']]);
// A Word itinerary: high-speed rail rows must yield number, endpoints, arrival, seat and fare without manual typing.
const out=ticketDetails('深圳北乘 G1152 往長沙南（3 小時 21 分；檢票口 14A，二等座 08 車 12D／12F）','high-speed');
assert.deepEqual([out.from,out.to,out.number,out.minutes,out.seat,out.cabin,out.gate],['深圳北','長沙南','G1152',201,'08車 12D／12F','二等座','14A']);
const back=ticketDetails('乘 G1311 往深圳北（3 小時 15 分），19:04 到；再轉深圳地鐵至羅湖／落馬洲過關返港（約 20:30–21:00 到家）','high-speed');
assert.deepEqual([back.from,back.to,back.number,back.arrival],['','深圳北','G1311','19:04']);
assert.deepEqual(bookingNote('G1311','回程已訂 G1311（二等座 06 車 01D，檢票口 11A）'),{seat:'06車 01D',cabin:'二等座',gate:'11A'});
assert.deepEqual(transportTotal('全程時間\t約 6 小時\n來回 2 人總計\t約 HK$2,000（較直達方案省約 HK$700）'),{total:2000,currency:'HKD',label:'來回 2 人總計 約 HK$2000'.replace('2000','2,000')});
assert.equal(transportTotal('晚餐人均 ¥60'),null);
const priced=ticketDetails('G79 高鐵 西九龍 → 北京西 二等座 ¥1,077','high-speed');assert.deepEqual([priced.from,priced.to,priced.fare,priced.currency],['西九龍','北京西',1077,'CNY']);
const flight=ticketDetails('CX 504 香港 → 大阪','flight');assert.deepEqual([flight.from,flight.to,flight.number],['香港','大阪','CX504']);
for(const [title,kind] of [['返回酒店區休息','日常'],['起床、早餐後退房（12:00 前），行李寄存前台','酒店'],['晚餐火宮殿坡子街總店（人均 ¥55–63，07:00–24:00，免訂位）','美食'],['晚餐：壹盞燈（人均 ¥65–80）','美食'],['黃興路、太平街再逛，或提早休息','購物'],['的士往長沙生態動物園（約 40–50 分鐘，¥45–60，無地鐵直達）','交通'],['長沙世界之窗（09:00–23:00，全天票 ¥200 起）','景點']])assert.equal(classify(title),kind,title);
const evening=parseItinerary('時間\t安排\n夜晚\t黃興路再逛\n14:00 後\t抵長沙南站','t');assert.equal(evening[0].time,'20:00');assert.match(evening[0].hint,/暫定 20:00/);assert.equal(evening[1].time,'14:00');
console.log('PASS: flight/train/high-speed tickets, hotel, food, shopping and spot categories, flight numbers and imported rows.');
