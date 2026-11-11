// Friendly time zone names, so a trip is set to 「日本／東京 UTC+9」 rather than a raw IANA name.
const common:[string,string,RegExp][]=[
 ['Asia/Hong_Kong','香港',/香港|hong ?kong/i],
 ['Asia/Macau','澳門',/澳門|澳门|macau|macao/i],
 ['Asia/Shanghai','中國內地（北京、上海、長沙）',/中國|中国|內地|内地|北京|上海|廣州|广州|深圳|長沙|长沙|成都|重慶|重庆|西安|杭州|南京|武漢|武汉|桂林|廈門|厦门|張家界|张家界|新疆|烏魯木齊|乌鲁木齐|雲南|云南|昆明|大理|麗江|丽江|china|beijing|shanghai/i],
 ['Asia/Taipei','台灣／台北',/台灣|臺灣|台湾|台北|臺北|台中|台南|高雄|花蓮|taiwan|taipei/i],
 ['Asia/Tokyo','日本／東京',/日本|東京|东京|大阪|京都|北海道|札幌|沖繩|冲绳|福岡|福冈|名古屋|奈良|神戶|神户|橫濱|japan|tokyo|osaka|kyoto|okinawa/i],
 ['Asia/Seoul','韓國／首爾',/韓國|韩国|首爾|首尔|釜山|濟州|济州|korea|seoul|busan/i],
 ['Asia/Bangkok','泰國／曼谷',/泰國|泰国|曼谷|清邁|清迈|布吉|普吉|芭堤雅|thailand|bangkok|phuket/i],
 ['Asia/Ho_Chi_Minh','越南',/越南|河內|河内|胡志明|峴港|岘港|vietnam|hanoi|da nang/i],
 ['Asia/Singapore','新加坡',/新加坡|singapore/i],
 ['Asia/Kuala_Lumpur','馬來西亞／吉隆坡',/馬來西亞|马来西亚|吉隆坡|檳城|槟城|沙巴|亞庇|亚庇|malaysia|kuala lumpur|penang/i],
 ['Asia/Manila','菲律賓',/菲律賓|菲律宾|宿霧|宿务|長灘|长滩|philippines|manila|cebu|boracay/i],
 ['Asia/Makassar','印尼／峇里',/峇里|巴厘|bali/i],
 ['Asia/Jakarta','印尼／雅加達',/印尼|雅加達|雅加达|indonesia|jakarta/i],
 ['Asia/Kolkata','印度',/印度|india/i],
 ['Asia/Dubai','阿聯酋／杜拜',/杜拜|迪拜|阿聯酋|阿联酋|dubai/i],
 ['Europe/London','英國／倫敦',/英國|英国|倫敦|伦敦|\buk\b|london|england|scotland/i],
 ['Europe/Paris','法國／巴黎',/法國|法国|巴黎|france|paris/i],
 ['Europe/Berlin','德國／柏林',/德國|德国|柏林|慕尼黑|germany|berlin|munich/i],
 ['Europe/Rome','意大利／羅馬',/意大利|義大利|羅馬|罗马|米蘭|米兰|威尼斯|佛羅倫斯|italy|rome|milan/i],
 ['Europe/Madrid','西班牙',/西班牙|巴塞|馬德里|马德里|spain|barcelona|madrid/i],
 ['Europe/Zurich','瑞士',/瑞士|switzerland|zurich/i],
 ['Europe/Istanbul','土耳其',/土耳其|伊斯坦堡|turkey|istanbul/i],
 ['Atlantic/Reykjavik','冰島',/冰島|冰岛|iceland/i],
 ['America/New_York','美國東岸／紐約',/紐約|纽约|美東|美东|new york|boston/i],
 ['America/Los_Angeles','美國西岸／洛杉磯',/洛杉磯|洛杉矶|三藩市|舊金山|旧金山|美西|los angeles|san francisco|seattle/i],
 ['America/Vancouver','加拿大／溫哥華',/溫哥華|温哥华|vancouver/i],
 ['America/Toronto','加拿大／多倫多',/多倫多|多伦多|toronto/i],
 ['Australia/Sydney','澳洲／悉尼',/澳洲|悉尼|雪梨|墨爾本|墨尔本|australia|sydney|melbourne/i],
 ['Australia/Perth','澳洲／珀斯',/珀斯|perth/i],
 ['Pacific/Auckland','紐西蘭',/紐西蘭|纽西兰|新西蘭|新西兰|new zealand|auckland/i],
];
const names=new Map(common.map(([z,l])=>[z,l]));
/** "UTC+9" for the zone on the given day (daylight saving aware). */
export function utcOffset(zone:string,at=new Date()){try{const part=new Intl.DateTimeFormat('en',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(at).find(p=>p.type==='timeZoneName')?.value||'';return part.replace('GMT','UTC').replace(/^UTC$/,'UTC+0')}catch{return ''}}
export function zoneLabel(zone:string,at?:Date){return `${names.get(zone)||zone.replace(/_/g,' ')} ${utcOffset(zone,at)}`.trim()}
/** Suggest a zone from the destination text; the person still confirms it. */
export function suggestZone(destination:string):string{const hit=common.find(([z,,re])=>z!=='Asia/Hong_Kong'&&re.test(destination))||common.find(([,,re])=>re.test(destination));return hit?hit[0]:''}
export function ZoneSelect({value,onChange,name,date}:{value:string;onChange?:(z:string)=>void;name?:string;date?:string}){
 const at=date?new Date(date+'T12:00:00Z'):new Date();
 const all=(()=>{try{return Intl.supportedValuesOf('timeZone')}catch{return []}})().filter(z=>!names.has(z));
 return <select name={name} aria-label="旅程時區" value={value} onChange={e=>onChange?.(e.target.value)}>
  {!value&&<option value="">請選擇時區</option>}
  <optgroup label="常用旅遊地點">{common.map(([z])=><option key={z} value={z}>{zoneLabel(z,at)}</option>)}</optgroup>
  <optgroup label="所有時區（英文）">{(value&&!names.has(value)&&!all.includes(value)?[value,...all]:all).map(z=><option key={z} value={z}>{z} {utcOffset(z,at)}</option>)}</optgroup>
 </select>;
}
export const zoneDatalist=<datalist id="zone-list">{common.map(([z])=><option key={z} value={z}>{zoneLabel(z)}</option>)}</datalist>;
