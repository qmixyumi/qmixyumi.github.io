import {csvText,spreadsheetCell} from './tabular-text';
import {docxStructuredText} from './docx-structure';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
export async function extractFile(file:File,progress:(s:string)=>void,signal:AbortSignal):Promise<string>{
 const ext=file.name.split('.').pop()?.toLowerCase();signal.throwIfAborted();
 if(ext==='txt'||ext==='csv'){const text=await file.text();if(text.includes('\u0000'))throw Error('文件唔係文字格式');return ext==='csv'?csvText(text):text;}
 if(ext==='docx'){const mammoth=await import('mammoth');const result=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});signal.throwIfAborted();return docxStructuredText(result.value);}
 if(ext==='xlsx'){const {default:read}=await import('read-excel-file/browser');const sheets=await read(file);signal.throwIfAborted();return sheets.map(s=>(/^(?:Day\s*\d+|第[一二三四五六七八九十\d]+[天日])$/i.test(s.sheet)?s.sheet+'\n':'')+s.data.map(row=>row.map(spreadsheetCell).join('\t')).join('\n')).join('\n');}
 let worker:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|null=null;
 async function ocr(input:File|HTMLCanvasElement){signal.throwIfAborted();if(!worker){progress('載入中英文 OCR 模型（首次需要網絡）…');const {createWorker}=await import('tesseract.js');worker=await createWorker(['eng','chi_tra','chi_sim'],1,{logger:m=>{if(m.status==='recognizing text')progress(`辨識圖片文字 ${Math.round(m.progress*100)}%`)}})}signal.throwIfAborted();const result=await worker.recognize(input);return result.data.text;}
 const abort=()=>{void worker?.terminate()};signal.addEventListener('abort',abort);
 try{
 if(['png','jpg','jpeg','webp'].includes(ext||''))return await ocr(file);
 if(ext==='pdf'){
 const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});const pdf=await task.promise;
 try{if(pdf.numPages>30)throw Error('PDF 超過 30 頁，請分拆後再匯入，避免手機記憶體不足。');const parts:string[]=[];
 for(let n=1;n<=pdf.numPages;n++){signal.throwIfAborted();progress(`讀取 PDF 第 ${n} / ${pdf.numPages} 頁`);const page=await pdf.getPage(n);const content=await page.getTextContent();let lastY:number|null=null;let text='';for(const item of content.items){if(!('str' in item))continue;const y=item.transform[5];if(lastY!==null&&Math.abs(y-lastY)>3)text+='\n';text+=item.str+(item.hasEOL?'\n':' ');lastY=y;}
 if(text.trim().length<12){const base=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(2,2200/Math.max(base.width,base.height))});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,viewport}).promise;text=await ocr(canvas);canvas.width=0;canvas.height=0;}parts.push(text);page.cleanup();}return parts.join('\n');
 }finally{await task.destroy();}}
 throw Error('請使用 PDF、DOCX、XLSX、TXT、CSV、PNG、JPG 或 WebP。舊版 DOC／XLS 請先另存新格式。');
 }finally{signal.removeEventListener('abort',abort);await (worker as Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|null)?.terminate();}
}
