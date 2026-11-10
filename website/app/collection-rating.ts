import type {Stop} from './model';
export function collectionMetrics(kind:string):string[]{return kind==='酒店'?['地理位置','舒適度','環境','靜音程度','性價比','早餐豐富']:kind==='美食'?['性價比','味道','外觀','份量']:['景觀震撼度','人潮舒適度','出片率']}
export function collectionRating(stop:Stop,person:string){const values=collectionMetrics(stop.kind).map(k=>stop.metrics?.[person+k]).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=10);const manual=stop.rating[person];const score=values.length?values.reduce((a,b)=>a+b,0)/values.length:typeof manual==='number'&&Number.isFinite(manual)?manual:null;return {score,automatic:values.length>0,count:values.length}}
export function collectionAverage(stop:Stop){const values=['QMI','YUMI'].map(p=>collectionRating(stop,p).score).filter((v):v is number=>v!==null);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
export function collectionGrade(score:number){return score>=9?'S':score>=8?'A':score>=6?'B':score>=4?'C':'D'}
export function collectionStars(score:number){return Math.round(score/2)}
