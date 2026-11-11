import {QuestKind,QuestEntry,QuestMetric,questScore,questGrade,gradeWords} from './quest-model';
export type RankingOptions={kind:QuestKind;title:string;folder:string;entries:QuestEntry[];metrics:QuestMetric[];dark:boolean};
export const rankingPages=(entries:QuestEntry[])=>Array.from({length:Math.ceil(entries.length/20)},(_,i)=>entries.slice(i*20,i*20+20));
export async function exportQuestRanking(o:RankingOptions):Promise<{blob:Blob;name:string}[]>{
 if(!o.entries.length)throw Error('未有可匯出嘅記錄');await document.fonts.ready;
 const pages=rankingPages(o.entries),files:{blob:Blob;name:string}[]=[];
 for(let page=0;page<pages.length;page++){
 const entries=pages[page],canvas=document.createElement('canvas');canvas.width=1600;canvas.height=360+entries.length*145;const c=canvas.getContext('2d');if(!c)throw Error('瀏覽器未能建立圖片');
 const bg=o.dark?'#101d35':'#f6efda',card=o.dark?'#192b48':'#fff9e8',ink=o.dark?'#f4e8c3':'#38372c',muted=o.dark?'#b7bccc':'#8a8065',gold=o.dark?'#efc763':'#ac8315',line=o.dark?'#6a5c3c':'#cbbd8e';
 c.fillStyle=bg;c.fillRect(0,0,canvas.width,canvas.height);c.strokeStyle=o.dark?'#ffffff06':'#a9934420';c.lineWidth=1;for(let x=0;x<1600;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,canvas.height);c.stroke()}for(let y=0;y<canvas.height;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(1600,y);c.stroke()}
 const text=(v:string,x:number,y:number,size:number,color=ink,bold=false)=>{c.fillStyle=color;c.font=`${bold?'bold ':''}${size}px "Microsoft JhengHei", Arial, sans-serif`;c.fillText(v,x,y)};
 const fit=(v:string,width:number)=>{let t=v;if(c.measureText(t).width<=width)return t;while(t.length&&c.measureText(t+'…').width>width)t=t.slice(0,-1);return t+'…'};
 text('✦  '+o.title,65,100,48,gold,true);text(o.folder+' · 評分排行榜',68,157,26,muted);text(`${o.entries.length} 項記錄 · 第 ${page+1} / ${pages.length} 頁`,68,202,22,muted);
 c.strokeStyle=line;c.lineWidth=3;c.beginPath();c.moveTo(65,235);c.lineTo(1535,235);c.stroke();
 entries.forEach((e,i)=>{const y=270+i*145,total=questScore(e,o.metrics),grade=questGrade(total);const color=({S:'#edc14c',A:'#ed795d',B:'#6aa9e6',C:'#76b96a',D:'#9d94a7','—':'#aaa18b'} as Record<string,string>)[grade];c.fillStyle=o.dark?'#050c1b':'#cabb8c';c.fillRect(69,y+6,1466,120);c.fillStyle=card;c.fillRect(65,y,1466,120);c.strokeStyle=line;c.strokeRect(65,y,1466,120);c.fillStyle='#d7b548';c.fillRect(85,y+25,70,70);text(String(page*20+i+1),97,y+72,28,'#302a18',true);c.font='bold 30px "Microsoft JhengHei",Arial,sans-serif';const name=fit(e.name,990);text(name,180,y+48,30,ink,true);c.font='20px "Microsoft JhengHei",Arial,sans-serif';text(fit([e.category,e.region,e.room].filter(Boolean).join(' · '),1000),180,y+87,20,muted);text(total===null?'待評':total.toFixed(1),1245,y+68,31,gold,true);c.fillStyle=color;c.fillRect(1365,y+19,140,82);text(grade,1415,y+56,31,'#20262c',true);text(gradeWords[grade],1380,y+84,17,'#20262c')});
 text('QMI × YUMI  ·  評分圖鑑',65,canvas.height-25,20,muted);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('圖片匯出失敗')),'image/png'));files.push({blob,name:`${o.kind}-ranking-${page+1}.png`});
 }return files;
}
