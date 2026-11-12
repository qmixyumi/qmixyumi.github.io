import {newQuestEntry,type QuestEntry} from './quest-model';
/** Three sample ratings, added only when the atlas is still empty, so a first-time visitor sees what 評分圖鑑 looks like. */
export function demoQuestEntries():QuestEntry[]{
 const hotel={...newQuestEntry('hotel'),id:'demo-q-hotel',name:'町家旅宿（示範）',region:'京都 河原町',room:'和室雙人房',price:'JPY 22,000／晚',breakfast:true,review:'位置方便，晚上好靜。',scores:{location:9,comfort:8,environment:9,quiet:8,value:7,breakfast:7}};
 const spot={...newQuestEntry('spot'),id:'demo-q-spot',name:'清水寺（示範）',region:'京都',ticket:'JPY 400',duration:'1.5 小時',seasons:['秋'],review:'紅葉季節一定要去，早去人少。',scores:{view:10,crowd:7,photo:9}};
 const food={...newQuestEntry('food'),id:'demo-q-food',name:'二年坂抹茶甜品（示範）',region:'二年坂 京都',category:'甜品',price:'JPY 1,200',level:'sweet' as const,sweet:'微甜',review:'抹茶味好濃，唔會太甜。',scores:{taste:9,appearance:8,value:7,portion:6}};
 return [hotel,spot,food];
}
