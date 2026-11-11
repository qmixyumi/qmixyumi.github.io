// Minimal ZIP writer/reader for full backups. Files are stored uncompressed (photos and PDFs are already compressed);
// reading also accepts deflated entries so a backup re-zipped by the phone or computer still restores.
const table=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
export function crc32(data:Uint8Array){let c=0xffffffff;for(let i=0;i<data.length;i++)c=table[(c^data[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0}
export type ZipEntry={name:string;data:Uint8Array};
export function makeZip(entries:ZipEntry[]):Blob{
 const enc=new TextEncoder();const parts:BlobPart[]=[];const central:Uint8Array[]=[];let offset=0;
 const now=new Date();const time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);const date=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
 for(const e of entries){
  const name=enc.encode(e.name);const crc=crc32(e.data);const size=e.data.length;
  const local=new DataView(new ArrayBuffer(30));
  local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(6,0x0800,true);local.setUint16(8,0,true);local.setUint16(10,time,true);local.setUint16(12,date,true);local.setUint32(14,crc,true);local.setUint32(18,size,true);local.setUint32(22,size,true);local.setUint16(26,name.length,true);local.setUint16(28,0,true);
  parts.push(local.buffer,name as BlobPart,e.data as BlobPart);
  const c=new DataView(new ArrayBuffer(46));
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,time,true);c.setUint16(14,date,true);c.setUint32(16,crc,true);c.setUint32(20,size,true);c.setUint32(24,size,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
  const row=new Uint8Array(46+name.length);row.set(new Uint8Array(c.buffer));row.set(name,46);central.push(row);
  offset+=30+name.length+size;
 }
 const centralSize=central.reduce((a,r)=>a+r.length,0);
 const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,entries.length,true);end.setUint16(10,entries.length,true);end.setUint32(12,centralSize,true);end.setUint32(16,offset,true);
 return new Blob([...parts,...central as BlobPart[],end.buffer],{type:'application/zip'});
}
async function inflate(data:Uint8Array){const stream=new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new Uint8Array(await new Response(stream).arrayBuffer())}
export async function readZip(buffer:ArrayBuffer):Promise<Map<string,Uint8Array>>{
 const view=new DataView(buffer);const bytes=new Uint8Array(buffer);const dec=new TextDecoder();
 let end=-1;for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0)throw Error('唔係有效嘅 ZIP 檔案');
 const count=view.getUint16(end+10,true);let p=view.getUint32(end+16,true);const out=new Map<string,Uint8Array>();
 for(let n=0;n<count;n++){
  if(view.getUint32(p,true)!==0x02014b50)throw Error('ZIP 目錄損壞');
  const method=view.getUint16(p+10,true),size=view.getUint32(p+20,true),nameLen=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true),local=view.getUint32(p+42,true);
  const name=dec.decode(bytes.subarray(p+46,p+46+nameLen));
  const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
  const raw=bytes.subarray(start,start+size);
  if(!name.endsWith('/'))out.set(name,method===0?raw.slice():method===8?await inflate(raw):(()=>{throw Error('ZIP 壓縮格式唔支援：'+name)})());
  p+=46+nameLen+extra+comment;
 }
 return out;
}
