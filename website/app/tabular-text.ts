// Preserve quoted CSV cells so a comma in a title does not become another activity.
export function csvText(text:string):string{
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}
 if(quoted)throw Error('CSV 引號未配對，請另存 CSV 後再試。');if(cell||row.length){row.push(cell);rows.push(row)}
 return rows.map(r=>r.map(c=>c.replace(/[\r\n\t]+/g,' ').trim()).join('\t')).join('\n');
}
export function spreadsheetCell(value:unknown):string{if(value instanceof Date)return value.getUTCFullYear()<1901?value.toISOString().slice(11,16):value.toISOString().slice(0,10);return String(value??'').replace(/[\r\n\t]+/g,' ')}
