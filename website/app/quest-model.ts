export type QuestKind='hotel'|'spot'|'food';
export type QuestMetric={id:string;name:string;color:string;reverse:boolean};
export type QuestFolder={id:string;name:string;kind:QuestKind};
export type QuestEntry={id:string;kind:QuestKind;folder:string;name:string;region:string;category:string;room:string;price:string;ticket:string;ride:string;duration:string;seasons:string[];spice:string;review:string;notes:string;photo:string;breakfast:boolean;scores:Record<string,number|null>;created:number;people?:Record<string,Record<string,number|null>>};
export type QuestData={version:1;folders:QuestFolder[];entries:QuestEntry[];metrics:Record<QuestKind,QuestMetric[]>};
const metric=(id:string,name:string,color:string,reverse=false):QuestMetric=>({id,name,color,reverse});
export function emptyQuest():QuestData{return {version:1,folders:[],entries:[],metrics:{hotel:[metric('location','地理位置','#e0aa27'),metric('comfort','舒適度','#8b77d8'),metric('environment','環境','#45a3c9'),metric('quiet','靜音程度','#64b296'),metric('value','性價比','#dd9550'),metric('breakfast','早餐豐富程度','#e3c865')],spot:[metric('view','景觀震撼度','#e9ad27'),metric('crowd','人潮程度','#e67358',true),metric('photo','出片率','#51a5b8')],food:[metric('taste','味道','#da8400'),metric('appearance','外觀','#9364dd'),metric('value','性價比','#008ab5'),metric('portion','份量','#07956c')]}}}
export function questScore(entry:QuestEntry,metrics:QuestMetric[]):number|null{const active=metrics.filter(m=>!(entry.kind==='hotel'&&m.id==='breakfast'&&!entry.breakfast));if(!active.length||active.some(m=>typeof entry.scores[m.id]!=='number'))return null;return active.reduce((n,m)=>n+(m.reverse?10-entry.scores[m.id]!:entry.scores[m.id]!),0)/active.length}
export function questGrade(score:number|null){return score===null?'—':score>=9?'S':score>=8?'A':score>=6?'B':score>=4?'C':'D'}
export const gradeWords:Record<string,string>={S:'超級推薦',A:'推薦',B:'不錯',C:'普通',D:'有待改善','—':'待評分'};
export const questTitles:Record<QuestKind,string>={hotel:'酒店評分',spot:'景點評分',food:'美食評分'};
export function newQuestEntry(kind:QuestKind,folder=''):QuestEntry{return {id:crypto.randomUUID(),kind,folder,name:'',region:'',category:kind==='food'?'主食':'',room:'',price:'',ticket:'',ride:'',duration:'',seasons:[],spice:'',review:'',notes:'',photo:'',breakfast:false,scores:{},created:Date.now()}}

/** QMI and YUMI rate separately; `scores` keeps the average so ranking and export stay unchanged. */
export const RATERS=['QMI','YUMI'];
export function personScores(e:QuestEntry,person:string):Record<string,number|null>{return e.people?(e.people[person]||{}):e.scores}
function averageInto(e:QuestEntry){const ids=new Set(RATERS.flatMap(p=>Object.keys(e.people?.[p]||{})));for(const id of ids){const v=RATERS.map(p=>e.people?.[p]?.[id]).filter((n):n is number=>typeof n==='number');e.scores[id]=v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*100)/100:null}}
/** Returns a copy with one person's score changed. Old shared scores become both people's starting point. */
export function withPersonScore(e:QuestEntry,person:string,id:string,v:number|null):QuestEntry{const next=structuredClone(e);if(!next.people)next.people=Object.fromEntries(RATERS.map(p=>[p,{...e.scores}]));next.people[person]={...(next.people[person]||{}),[id]:v};next.scores={...next.scores};averageInto(next);return next}
export function withPersonReset(e:QuestEntry,person:string):QuestEntry{const next=structuredClone(e);if(!next.people)next.people=Object.fromEntries(RATERS.map(p=>[p,{...e.scores}]));next.people[person]={};next.scores={};averageInto(next);return next}
export function personTotal(e:QuestEntry,metrics:QuestMetric[],person:string){return questScore({...e,scores:personScores(e,person)},metrics)}
export function biggestGap(e:QuestEntry,metrics:QuestMetric[]){if(!e.people)return null;let best:{name:string;a:number;b:number}|null=null;for(const m of metrics){if(e.kind==='hotel'&&m.id==='breakfast'&&!e.breakfast)continue;const a=e.people[RATERS[0]]?.[m.id],b=e.people[RATERS[1]]?.[m.id];if(typeof a!=='number'||typeof b!=='number')continue;if(Math.abs(a-b)>=2&&(!best||Math.abs(a-b)>Math.abs(best.a-best.b)))best={name:m.name,a,b}}return best}
