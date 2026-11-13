import {useRef,useState} from 'react';
import {keepFiles,type Attachment} from './attachments';

export default function AttachmentAdd({onSave,onImport}:{onSave:(items:Attachment[])=>void;onImport:()=>void}){
 const input=useRef<HTMLInputElement>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <section className="panel"><button className="primary" disabled={busy} onClick={()=>setOpen(!open)}>＋ 新增附件</button>{open&&<div className="actions"><button className="secondary" disabled={busy} onClick={()=>input.current?.click()}>只保存文件</button><button className="secondary" disabled={busy} onClick={onImport}>整理成行程</button><p>保存酒店確認信、車票或圖片；想將文件內容加入每日行程，就揀「整理成行程」。每次最多 6 個，共 20MB。</p></div>}<input ref={input} hidden type="file" multiple accept=".pdf,.docx,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp" onChange={async e=>{const files=Array.from(e.currentTarget.files||[]);e.currentTarget.value='';if(!files.length)return;if(files.length>6||files.reduce((n,f)=>n+f.size,0)>20*1024*1024){setMessage('每次最多 6 個檔案，合共 20MB。');return}setBusy(true);try{const refs=await keepFiles(files);onSave(refs);setMessage(`已保存 ${refs.length} 個附件到呢部裝置；啟用同步後會上傳。`);setOpen(false)}catch{setMessage('未能保存附件，請檢查裝置空間再試。')}finally{setBusy(false)}}}/>{busy&&<p role="status">正在保存附件…</p>}{message&&<p role="status">{message}</p>}</section>
}
