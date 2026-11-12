import {csvText,spreadsheetCell} from './tabular-text';
import {docxStructuredText} from './docx-structure';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
/** Thrown when a reading module from an older version of the site is no longer on the server (the site was updated while this page stayed open). */
export class SiteUpdatedError extends Error{constructor(){super('網站啱啱更新咗，呢個舊版頁面搵唔到讀取檔案嘅程式。請撳「重新整理網頁」，再揀一次檔案。');this.name='SiteUpdatedError'}}
const missingModule=(e:unknown)=>e instanceof TypeError||/dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i.test(String((e as Error)?.message||e));
/** Loads a lazy chunk, retrying once; a chunk that is still missing means the page is older than the deployed site. */
export async function loadChunk<T>(load:()=>Promise<T>):Promise<T>{try{return await load()}catch(e){if(!missingModule(e))throw e;await new Promise(r=>setTimeout(r,600));try{return await load()}catch(again){if(missingModule(again))throw new SiteUpdatedError();throw again}}}
/** Tesseract puts spaces between Chinese characters and reads ¥ as #; tidy both so names come out as written. */
export function cleanOcr(text:string){const han='[\\u3400-\\u9fff\\uf900-\\ufaff（）：，、；。！？「」]';let t=text;for(let i=0;i<2;i++)t=t.replace(new RegExp(`(${han})[ \\t]+(?=${han})`,'g'),'$1');return t.replace(/(^|[\s（(，,:：])#(?=\d)/g,'$1¥')}
/** Phone screenshots have small text; drawing them about 2× larger roughly halves OCR mistakes on Chinese. */
async function upscale(file:File):Promise<File|HTMLCanvasElement>{try{const bmp=await createImageBitmap(file);const scale=Math.min(2.5,Math.max(1,2200/Math.max(bmp.width,bmp.height)));if(scale<1.2){bmp.close();return file}const c=document.createElement('canvas');c.width=Math.round(bmp.width*scale);c.height=Math.round(bmp.height*scale);const g=c.getContext('2d')!;g.imageSmoothingQuality='high';g.drawImage(bmp,0,0,c.width,c.height);bmp.close();ink(g,c.width,c.height);return c}catch{return file}}
/** Coloured text (blue times, green places) reads badly; turn the picture into dark ink on white, flipping dark-mode screenshots. */
function ink(g:CanvasRenderingContext2D,w:number,h:number){const img=g.getImageData(0,0,w,h),d=img.data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=d[i]*.299+d[i+1]*.587+d[i+2]*.114;const dark=sum/(d.length/4)<128;
 for(let i=0;i<d.length;i+=4){let l=d[i]*.299+d[i+1]*.587+d[i+2]*.114;if(dark)l=255-l;const sat=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]);if(sat>60&&!dark)l=Math.min(l,l-sat*.6);const v=Math.max(0,Math.min(255,(l-110)*255/(225-110)));d[i]=d[i+1]=d[i+2]=v}g.putImageData(img,0,0)}
/** OCR engine and Chinese/English models are served from this site, so photo reading does not depend on an outside CDN. */
const OCR_BASE=import.meta.env.BASE_URL.replace(/\/$/,'')+'/ocr';
export async function extractFile(file:File,progress:(s:string)=>void,signal:AbortSignal):Promise<string>{
 const ext=file.name.split('.').pop()?.toLowerCase();signal.throwIfAborted();
 if(ext==='txt'||ext==='csv'){const text=await file.text();if(text.includes('\u0000'))throw Error('文件唔係文字格式');return ext==='csv'?csvText(text):text;}
 if(ext==='docx'){const mammoth=await loadChunk(()=>import('mammoth'));const result=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});signal.throwIfAborted();return docxStructuredText(result.value);}
 if(ext==='xlsx'){const {default:read}=await loadChunk(()=>import('read-excel-file/browser'));const sheets=await read(file);signal.throwIfAborted();return sheets.map(s=>(/^(?:Day\s*\d+|第[一二三四五六七八九十\d]+[天日])$/i.test(s.sheet)?s.sheet+'\n':'')+s.data.map(row=>row.map(spreadsheetCell).join('\t')).join('\n')).join('\n');}
 let worker:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|null=null;
 async function ocr(input:File|HTMLCanvasElement){signal.throwIfAborted();if(!worker){progress('載入中英文 OCR 模型（首次約 6MB，需要網絡）…');const {createWorker}=await loadChunk(()=>import('tesseract.js'));worker=await createWorker(['eng','chi_tra','chi_sim'],1,{workerPath:OCR_BASE+'/worker.min.js',corePath:OCR_BASE+'/core',langPath:OCR_BASE+'/lang',logger:m=>{if(m.status==='recognizing text')progress(`辨識圖片文字 ${Math.round(m.progress*100)}%`)}})}signal.throwIfAborted();const result=await worker.recognize(input);return result.data.text;}
 const abort=()=>{void worker?.terminate()};signal.addEventListener('abort',abort);
 try{
 if(['png','jpg','jpeg','webp'].includes(ext||''))return cleanOcr(await ocr(await upscale(file)));
 if(ext==='pdf'){
 const pdfjs=await loadChunk(()=>import('pdfjs-dist'));pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});const pdf=await task.promise;
 try{if(pdf.numPages>30)throw Error('PDF 超過 30 頁，請分拆後再匯入，避免手機記憶體不足。');const parts:string[]=[];
 for(let n=1;n<=pdf.numPages;n++){signal.throwIfAborted();progress(`讀取 PDF 第 ${n} / ${pdf.numPages} 頁`);const page=await pdf.getPage(n);const content=await page.getTextContent();let lastY:number|null=null;let text='';for(const item of content.items){if(!('str' in item))continue;const y=item.transform[5];if(lastY!==null&&Math.abs(y-lastY)>3)text+='\n';text+=item.str+(item.hasEOL?'\n':' ');lastY=y;}
 if(text.trim().length<12){const base=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(2,2200/Math.max(base.width,base.height))});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,viewport}).promise;text=await ocr(canvas);canvas.width=0;canvas.height=0;text=cleanOcr(text)}parts.push(text);page.cleanup();}return parts.join('\n');
 }finally{await task.destroy();}}
 throw Error('請使用 PDF、DOCX、XLSX、TXT、CSV、PNG、JPG 或 WebP。舊版 DOC／XLS 請先另存新格式。');
 }finally{signal.removeEventListener('abort',abort);await (worker as Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|null)?.terminate();}
}
