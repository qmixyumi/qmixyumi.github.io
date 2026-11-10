export type TicketKind='flight'|'train'|'high-speed';
export type ImportRow={ticket?:TicketKind|'';id:string;day:string;date:string;time:string;end:string;title:string;place:string;kind:string;source:string;include:boolean;timeOptions?:string[];hint?:string};
function parsePlainItinerary(text:string,source:string):ImportRow[]{
 const rows:ImportRow[]=[];let day='',date='';
 for(const raw of text.replace(/\r/g,'').split('\n')){let line=raw.replace(/：/g,':').trim();if(!line||/^(?:[（(]?來源|資料查證|资料查证|參考|参考|表\s*\d|查證日期|查证日期)/.test(line))continue;
 const d=line.match(/^(?:day\s*(\d{1,3})|第\s*([0-9一二三四五六七八九十兩]{1,3})\s*[日天])/i);
 if(d){day=String(dayNumber(d[1]||d[2]));date='';line=line.slice(d[0].length).replace(/^[\s:|]+/,'');if(!/^\d{1,2}[:時]/.test(line))continue}
 const dt=line.match(/^(20\d{2})\s*[-/年]\s*(\d{1,2})\s*[-/月]\s*(\d{1,2})日?/);
 if(dt&&!/來源|查證|查证/.test(line)){const candidate=dateValue(dt[1],dt[2],dt[3]);if(candidate){date=candidate;day='';line=line.slice(dt[0].length).replace(/^[\s|,\t:]+/,'');if(!line||/^[（(]?(星期|週|周)/.test(line))continue}}
 const prefix=line.match(/^((?:[01]?\d|2[0-3])[:時][0-5]\d(?:分)?(?:\s*[–—~～→\/／或-]\s*(?:[01]?\d|2[0-3])[:時][0-5]\d(?:分)?)?(?:\s*[前後后])?)/);
 const period=line.match(/^(上午|下午|中午|晚上|夜晚)\s*/);
 const timeCell=prefix?.[0]||period?.[0]||'';
 const timing=parseTime(timeCell);
 const titleText=line.slice(timeCell.length).replace(/^[\s|,\t:→~–—-]+|[\s|,\t:→~–—-]+$/g,'').trim();if(!titleText)continue;
 const cols=titleText.split(/\t|\|/).map(s=>s.trim()).filter(Boolean);const title=cols[0]||titleText;
 const include=!!timeCell;
 rows.push({id:`${source}-${rows.length}`,day,date,...timing,title,place:cols[1]||'',kind:classify(title),ticket:ticketKind(title),source:raw,include,hint:include?timing.hint:'未能確認呢行係活動，預設唔匯入；如有需要請勾選同補資料。'});
 }return rows;
}
export function resolveDay(row:ImportRow,start:string){if(row.date&&(!Number.isFinite(Date.parse(row.date))||new Date(row.date).toISOString().slice(0,10)!==row.date))return NaN;return row.date?Math.round((Date.parse(row.date)-Date.parse(start))/86400000)+1:Number(row.day)||0;}

export type DateChoice={start:string;end:string};
function dayNumber(s:string):number{if(/^\d+$/.test(s))return Number(s);const digits='零一二三四五六七八九';s=s.replace('兩','二');if(s.includes('十')){const [a,b]=s.split('十');return (a?digits.indexOf(a):1)*10+(b?digits.indexOf(b):0)}return digits.indexOf(s)}
function dateValue(y:string,m:string,d:string){const value=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;return Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:''}
export function itineraryMetadata(text:string):{destination:string;choices:DateChoice[]}{
 const lines=text.split('\n');const destination=lines.find(l=>/^目的地\t/.test(l))?.split('\t')[1]||'';
 const choices:DateChoice[]=[];
 // Only explicit departure rows and introductory date alternatives qualify, never source dates.
 for(const line of lines){if(/來源|查證|查证|開業|开业|購票|购票|放票/.test(line)&&!line.includes('｜'))continue;
  if(!/^出發日期\t/.test(line)&&!(/兩個周末|两个周末|出發日期|出发日期/.test(line)))continue;
  const prefix=line.split('｜')[0];const year=prefix.match(/(20\d{2})\s*年/)?.[1]||lines.slice(0,3).join(' ').match(/(20\d{2})\s*年/)?.[1];if(!year)continue;
  for(const m of prefix.matchAll(/(\d{1,2})\s*月\s*(\d{1,2})\s*[–—~～-]\s*(\d{1,2})\s*日/g)){const start=dateValue(year,m[1],m[2]),end=dateValue(year,m[1],m[3]);if(start&&end&&start<=end&&!choices.some(c=>c.start===start&&c.end===end))choices.push({start,end})}
 }
 return {destination,choices};
}
export function ticketKind(title:string):TicketKind|''{if(/航班|機場|机场|飛機|飞机|飛往|飞往|起飛|起飞|登機|登机|航空|flight|airport|airlines?|\b(?:CX|UO|HX|JL|NH|MM|TR|KE|OZ|CI|BR|SQ|TG|AK|FD|VJ|MU|CA|CZ|HO|9C|ZH|7C|LJ|TW|IT|GK|BX)\s?\d{2,4}\b/i.test(title))return 'flight';if(/高鐵|高铁|新幹線|新干线|shinkansen|HSR|KTX|動車|动车|G\d{2,4}\b/i.test(title))return 'high-speed';if(/火車|火车|列車|列车|鐵路|铁路|\bJR\b|\btrain\b|\brail(?:way)?\b|特急|急行|Express/i.test(title))return 'train';return ''}
export function flightNumber(title:string){return title.match(/\b([A-Z][A-Z0-9]|[0-9][A-Z])\s?(\d{2,4})\b/)?.slice(1).join('')||''}
export function classify(title:string){if(ticketKind(title))return '交通';return /高鐵|高铁|出發|出发|的士|地鐵|地铁|車站|南站|西九龍|西九龙|航班|機場|机场|列車|列车|火車|火车|flight|\btrain\b|station|京都站|新幹線|交通/i.test(title)?'交通':/退房|酒店|住宿|飯店|旅宿|hotel|check.?in/i.test(title)?'酒店':/餐|宵夜|小食|拉麵|拉面|壽司|寿司|燒肉|烧肉|居酒屋|咖啡|café|cafe|甜品|茶室|食堂|restaurant|lunch|dinner|breakfast|brunch|ramen|sushi|bar\b/i.test(title)?'美食':/步行街|逛|夜市|購物|购物|shopping/i.test(title)?'購物':/演唱會|演出|表演|音樂會|展覽|体验|體驗|工作坊|tour|show|concert/i.test(title)?'活動':'景點'}
function parseTime(value:string){
 const timeCell=value.replace(/：|時/g,':');const times=[...timeCell.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)/g)].map(t=>`${t[1].padStart(2,'0')}:${t[2]}`);
 const alternative=times.length>1&&/[／/或]/.test(timeCell);const range=times.length===2&&/[–—~～→-]/.test(timeCell);
 return {time:alternative?'':times[0]||'',end:range?times[1]:'',timeOptions:alternative?times:undefined,hint:alternative?'有多個時間選項，請揀一個。':!times.length?`原文寫「${value||'未提供時間'}」，請補一個開始時間。`:/前|後|后/.test(timeCell)?`原文寫「${value}」，請核對呢個時間限制。`:''};
}
function columns(cells:string[]){
 const find=(pattern:RegExp)=>cells.findIndex(c=>pattern.test(c.trim()));
 const cols={time:find(/^(時間|时间|開始時間|开始时间|time|start(?: time)?)$/i),end:find(/^(結束時間|结束时间|end(?: time)?)$/i),title:find(/^(安排|行程|活動|活动|名稱|名称|activity|title|event|description)$/i),day:find(/^(day|天數|天数|第幾天)$/i),date:find(/^(日期|date)$/i),place:find(/^(地點|地点|位置|place|location)$/i)};
 return cols.title>=0&&(cols.time>=0||cols.day>=0||cols.date>=0)?cols:null;
}
export function parseItinerary(text:string,source:string):ImportRow[]{
 if(!text.includes('[[TABLE]]')){
  if(text.split('\n').some(l=>columns(l.split('\t'))))text='[[TABLE]]\n'+text+'\n[[/TABLE]]';
  else return parsePlainItinerary(text,source);
 }
 const rows:ImportRow[]=[];let day='',inTable=false,cols:ReturnType<typeof columns>=null;
 for(const raw of text.split('\n')){const line=raw.trim();
  if(line==='[[TABLE]]'){inTable=true;cols=null;continue}
  if(line==='[[/TABLE]]'){inTable=false;cols=null;continue}
  const d=line.match(/^(?:第\s*([0-9一二三四五六七八九十兩]+)\s*[天日]|Day\s*(\d+))(?:\s|[（(:：]|$)/i);
  if(d&&raw.split('\t').slice(1).every(c=>!c.trim())){day=String(dayNumber(d[1]||d[2]));continue}
  if(!inTable)continue;
  const cells=raw.split('\t').map(c=>c.trim());const header=columns(cells);if(header){cols=header;continue}
  if(!cols||!cells[cols.title]||cells.length<2)continue;
  const value=(index:number)=>index<0?'':cells[index]||'';
  const title=value(cols.title);const timing=parseTime(value(cols.time));
  if(cols.end>=0)timing.end=parseTime(value(cols.end)).time;
  const explicitDay=value(cols.day).replace(/^(?:Day\s*|第\s*)/i,'').replace(/[日天]$/,'');const rowDay=explicitDay?String(dayNumber(explicitDay)):day;
  const rawDate=value(cols.date);const dm=rawDate.match(/^(20\d{2})\s*[-/年]\s*(\d{1,2})\s*[-/月]\s*(\d{1,2})日?$/);const date=dm?dateValue(dm[1],dm[2],dm[3]):'';
  const inferredPlace=title.replace(/（[\s\S]*|\([\s\S]*/,'').replace(/^(?:晚餐|午餐|早餐)[：:]?/,'').trim();
  rows.push({id:`${source}-${rows.length}`,day:date?'':rowDay,date,...timing,title,place:cols.place>=0?value(cols.place):/交通|酒店/.test(classify(title))?'':inferredPlace,kind:classify(title),ticket:ticketKind(title),source:raw,include:true,hint:[timing.hint,rawDate&&!date?'日期格式未能確認，請自行填寫日期。':''].filter(Boolean).join(' ')});
 }
 if(!rows.length){const outside=text.replace(/\[\[TABLE\]\][\s\S]*?\[\[\/TABLE\]\]/g,'');return parsePlainItinerary(outside,source)}
 return rows;
}
