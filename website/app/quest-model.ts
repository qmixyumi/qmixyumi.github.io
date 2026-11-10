export type QuestKind='hotel'|'spot'|'food';
export type QuestMetric={id:string;name:string;color:string;reverse:boolean};
export type QuestFolder={id:string;name:string;kind:QuestKind};
export type QuestEntry={id:string;kind:QuestKind;folder:string;name:string;region:string;category:string;room:string;price:string;ticket:string;ride:string;duration:string;seasons:string[];spice:string;review:string;notes:string;photo:string;breakfast:boolean;scores:Record<string,number|null>;created:number};
export type QuestData={version:1;folders:QuestFolder[];entries:QuestEntry[];metrics:Record<QuestKind,QuestMetric[]>};
const metric=(id:string,name:string,color:string,reverse=false):QuestMetric=>({id,name,color,reverse});
export function emptyQuest():QuestData{return {version:1,folders:[],entries:[],metrics:{hotel:[metric('location','地理位置','#e0aa27'),metric('comfort','舒適度','#8b77d8'),metric('environment','環境','#45a3c9'),metric('quiet','靜音程度','#64b296'),metric('value','性價比','#dd9550'),metric('breakfast','早餐豐富程度','#e3c865')],spot:[metric('view','景觀震撼度','#e9ad27'),metric('crowd','人潮程度','#e67358',true),metric('photo','出片率','#51a5b8')],food:[metric('taste','味道','#da8400'),metric('appearance','外觀','#9364dd'),metric('value','性價比','#008ab5'),metric('portion','份量','#07956c')]}}}
export function questScore(entry:QuestEntry,metrics:QuestMetric[]):number|null{const active=metrics.filter(m=>!(entry.kind==='hotel'&&m.id==='breakfast'&&!entry.breakfast));if(!active.length||active.some(m=>typeof entry.scores[m.id]!=='number'))return null;return active.reduce((n,m)=>n+(m.reverse?10-entry.scores[m.id]!:entry.scores[m.id]!),0)/active.length}
export function questGrade(score:number|null){return score===null?'—':score>=9?'S':score>=8?'A':score>=6?'B':score>=4?'C':'D'}
export const gradeWords:Record<string,string>={S:'超級推薦',A:'推薦',B:'不錯',C:'普通',D:'有待改善','—':'待評分'};
export const questTitles:Record<QuestKind,string>={hotel:'酒店評分',spot:'景點評分',food:'美食評分'};
export function newQuestEntry(kind:QuestKind,folder=''):QuestEntry{return {id:crypto.randomUUID(),kind,folder,name:'',region:'',category:kind==='food'?'主食':'',room:'',price:'',ticket:'',ride:'',duration:'',seasons:[],spice:'',review:'',notes:'',photo:'',breakfast:false,scores:{},created:Date.now()}}
