// Mammoth-generated HTML is read as text only; never inserted into the page.
export function docxStructuredText(html:string):string{
 const plain=(s:string)=>s.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 const blocks:string[]=[];
 for(const m of html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>|<(p|h[1-6]|li)\b[^>]*>[\s\S]*?<\/\1>/gi)){
  if(/^<table/i.test(m[0])){blocks.push('[[TABLE]]');for(const row of m[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){blocks.push([...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>plain(c[1].replace(/<\/p>/gi,' '))).join('\t'))}blocks.push('[[/TABLE]]')}
  else blocks.push(plain(m[0]));
 }
 return blocks.join('\n');
}
