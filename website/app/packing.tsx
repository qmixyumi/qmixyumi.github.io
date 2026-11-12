'use client';
import {useState} from 'react';
/** Ready-made packing lists. Adding one only appends items that are not on the list yet. */
export const PACK_TEMPLATES:{id:string;name:string;items:string[]}[]=[
 {id:'basic',name:'🧾 基本必備',items:['護照及證件','身份證','機票／登機證','酒店訂單','eSIM／漫遊','當地貨幣','信用卡','旅遊保險','電話充電器','尿袋','萬能插頭','常用藥物']},
 {id:'japan-winter',name:'❄️ 日本冬天',items:['羽絨','頸巾','手套','冷帽','發熱衣','暖包','潤唇膏','保濕霜','防滑鞋','Suica／ICOCA 卡','零錢包（日元硬幣）','摺袋（購物用）']},
 {id:'island',name:'🏝 海島度假',items:['泳衣','太陽油','太陽眼鏡','帽','拖鞋','防水電話套','沙灘巾','驅蚊水','曬後護理','浮潛用品']},
 {id:'city',name:'🏙 城市短途',items:['好行嘅鞋','輕便外套','摺遮','充電寶','環保袋','水樽']},
 {id:'film',name:'🎬 拍片器材',items:['相機','後備電池','記憶卡','腳架','收音咪','穩定器','ND 濾鏡','鏡頭布','讀卡器','充電座']},
];
export function PackTemplates({existing,onAdd}:{existing:string[];onAdd:(items:string[],name:string)=>void}){
 const [open,setOpen]=useState(false);const have=new Set(existing.map(x=>x.trim()));
 return <div className="pack-templates"><button type="button" className="text-btn" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'收起範本 ▴':'用範本快速加入 ▾'}</button>
  {open&&<div className="pack-template-list">{PACK_TEMPLATES.map(t=>{const add=t.items.filter(x=>!have.has(x));return <button type="button" key={t.id} className="secondary" disabled={!add.length} onClick={()=>onAdd(add,t.name)}><b>{t.name}</b><small>{add.length?`加 ${add.length} 項`:'已經加晒'}</small></button>})}</div>}
 </div>;
}
