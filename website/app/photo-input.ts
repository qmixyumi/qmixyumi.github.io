/** Phone photos are often 3-8MB. Shrink them on this device before saving so they are never refused for size. */
export const MAX_PHOTO_INPUT=40*1024*1024;
export async function compressImage(file:File,maxEdge=1600):Promise<string>{
 if(!file.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))throw Error('請揀相片檔（JPG、PNG、WebP 或 iPhone 相片）');
 if(file.size>MAX_PHOTO_INPUT)throw Error('相片太大（上限 40MB）');
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file)}catch{throw Error('呢部裝置讀唔到呢個相片格式；iPhone 可以喺相簿「分享 → 儲存為 JPEG」再揀')}
 const canvas=document.createElement('canvas');
 const scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 let out=canvas.toDataURL('image/jpeg',.82);
 for(const q of [.7,.58,.45])if(out.length>1100000)out=canvas.toDataURL('image/jpeg',q);
 if(out.length>1600000)throw Error('相片壓縮後仍然太大，請揀另一張');
 return out;
}
