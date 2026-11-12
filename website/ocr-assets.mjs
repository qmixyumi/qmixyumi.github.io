// Copies the OCR engine (tesseract.js worker + LSTM cores) and the eng / chi_tra / chi_sim models into the site under /ocr,
// so photo reading works without jsDelivr (often slow or blocked on the road) and can be cached for offline use.
import {createReadStream} from 'node:fs';
import {mkdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
const nm='node_modules';
export const OCR_FILES={
 'ocr/worker.min.js':`${nm}/tesseract.js/dist/worker.min.js`,
 ...Object.fromEntries(['','-simd','-relaxedsimd'].map(v=>[`ocr/core/tesseract-core${v}-lstm.wasm.js`,`${nm}/tesseract.js-core/tesseract-core${v}-lstm.wasm.js`])),
 ...Object.fromEntries(['eng','chi_tra','chi_sim'].map(l=>[`ocr/lang/${l}.traineddata.gz`,`${nm}/@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`])),
};
export function ocrAssets(){let outDir='dist';return{name:'ocr-assets',
 configResolved(c){outDir=c.build.outDir},
 configureServer(server){server.middlewares.use(async(req,res,next)=>{const key=decodeURIComponent((req.url||'').split('?')[0]).replace(/^\//,'');const src=OCR_FILES[key];if(!src)return next();try{const s=await stat(src);res.setHeader('Content-Length',s.size);res.setHeader('Content-Type',key.endsWith('.js')?'text/javascript':'application/octet-stream');createReadStream(src).pipe(res)}catch{next()}})},
 async closeBundle(){for(const [to,from] of Object.entries(OCR_FILES)){const dest=path.join(outDir,to);await mkdir(path.dirname(dest),{recursive:true});await copyFile(from,dest)}}}}
