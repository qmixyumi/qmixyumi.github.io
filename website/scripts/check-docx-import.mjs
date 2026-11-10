import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import mammoth from 'mammoth';
import ts from 'typescript';
async function load(path){const code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}
const {docxStructuredText}=await load('app/docx-structure.ts');
const {parseItinerary,itineraryMetadata,resolveDay}=await load('app/import-parser.ts');
const synthetic='<h1>Trip</h1><p>第一天</p><table><tr><td><p>時間</p></td><td><p>安排</p></td></tr><tr><td>09:00–10:00</td><td>景點（營業 08:00–23:00）</td></tr></table>';
const rows=parseItinerary(docxStructuredText(synthetic),'test');assert.equal(rows.length,1);assert.equal(rows[0].day,'1');assert.equal(rows[0].time,'09:00');assert.equal(rows[0].end,'10:00');
assert.equal(parseItinerary('第二天\n09:00 景點','plain')[0].day,'2');
assert.equal(itineraryMetadata('來源：2026-10-31').choices.length,0);
assert.equal(docxStructuredText('<p>A &amp; B &#x4e00;</p>'),'A & B 一');

const {csvText,spreadsheetCell}=await load('app/tabular-text.ts');
const csv=csvText('Day,時間,安排,地點\r\n1,09:00,"早餐,咖啡","餐廳 A"\r\n2,14:00,公園,公園北門');
const csvRows=parseItinerary(csv,'csv');assert.equal(csvRows.length,2);assert.equal(csvRows[0].title,'早餐,咖啡');assert.equal(csvRows[1].day,'2');assert.equal(csvRows[0].place,'餐廳 A');
assert.throws(()=>csvText('"unclosed'),/引號/);
assert.equal(spreadsheetCell(new Date('1899-12-30T09:15:00Z')),'09:15');
assert.equal(spreadsheetCell(new Date('2026-11-20T00:00:00Z')),'2026-11-20');
const reordered=parseItinerary('地點\t安排\t結束時間\t開始時間\t日期\n京都\t散步\t11:30\t10:30\t2026-12-01','xlsx');assert.equal(reordered.length,1);assert.equal(reordered[0].date,'2026-12-01');assert.equal(reordered[0].end,'11:30');
const plain=parseItinerary('旅遊攻略\n來源：2026-10-31\n第一天：輕鬆遊\n09:00 景點（營業 08:00–22:00）\n下午 街市\n第二天\n10:00 酒店','plain');assert.equal(plain.filter(r=>r.include).length,3);assert.ok(plain.every(r=>!r.date));assert.equal(plain.find(r=>r.time==='09:00').end,'');assert.equal(plain[0].include,false);
const unsupported=docxStructuredText('<table><tr><td>酒店</td><td>價格</td></tr><tr><td>A</td><td>2026-10-31</td></tr></table>');assert.equal(parseItinerary(unsupported,'comparison').length,0);
const escaped=docxStructuredText('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');assert.equal(escaped,'<script>alert(1)</script>');

assert.equal(parseItinerary(docxStructuredText('<p>Day 1</p><ul><li>09:00 Breakfast</li><li>10:00 Park</li></ul>'),'list').filter(r=>r.include).length,2);
const {default:readExcel}=await import('read-excel-file/node');const sheets=await readExcel('tests/fixtures/itinerary.xlsx');
const excelText=sheets.map(s=>s.data.map(r=>r.map(spreadsheetCell).join('\t')).join('\n')).join('\n');const excelRows=parseItinerary(excelText,'fixture');assert.equal(excelRows.length,2);assert.ok(excelRows.every(r=>r.day==='1'&&r.include));
assert.equal(parseItinerary('Day 2\t\t\n時間\t安排\n10:00\tPark','sheet')[0].day,'2');
if(process.argv[2]){
 const {value}=await mammoth.convertToHtml({buffer:await readFile(process.argv[2])});
 const text=docxStructuredText(value);const result=parseItinerary(text,'docx');const meta=itineraryMetadata(text);
 assert.equal(result.length,16);assert.deepEqual(['1','2','3'].map(d=>result.filter(r=>r.day===d).length),[5,5,6]);
 assert.equal(meta.destination,'湖南長沙');assert.deepEqual(meta.choices,[{start:'2026-11-20',end:'2026-11-22'},{start:'2026-11-27',end:'2026-11-29'}]);
 assert.equal(result.filter(r=>!r.time).length,3);assert.deepEqual(result[0].timeOptions,['09:02','09:18']);
 assert.ok(result.every(r=>!r.date&&resolveDay(r,'2026-11-20')>=1&&resolveDay(r,'2026-11-20')<=3));
 const park=result.find(r=>r.title.includes('長沙世界之窗'));assert.equal(park.time,'09:30');assert.equal(park.end,'15:30');
 const checkout=result.find(r=>r.title.includes('退房'));assert.equal(checkout.time,'08:30');assert.equal(checkout.end,'');
 console.log(JSON.stringify({rows:result.length,dayCounts:[5,5,6],...meta,needsTime:result.filter(r=>!r.time).map(r=>({day:r.day,hint:r.hint})),park:{time:park.time,end:park.end}},null,2));
}
console.log('PASS: DOCX table structure, Chinese days, date alternatives, metadata exclusion and schedule-only times');
