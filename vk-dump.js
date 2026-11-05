(async()=>{
'use strict';
/* VK full source dumper: tải một lần, đóng gói toàn bộ source/assets cùng origin vào ZIP, không cần thư viện ngoài. */
const VERSION='20261105-fullzip-v1';
const enc=new TextEncoder();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const origin=location.origin;
const started=new Date().toISOString();
const errors=[];
const files=new Map();
const seen=new Set();
const queue=[];
const MAX_FILES=1200;
const MAX_TOTAL=350*1024*1024;
let total=0;

function abs(raw,base=location.href){
  try{
    if(!raw||/^(data:|blob:|javascript:|mailto:|tel:)/i.test(raw))return null;
    const u=new URL(raw,base);
    u.hash='';
    if(u.origin!==origin)return null;
    return u.href;
  }catch{return null}
}
function enqueue(raw,base){const u=abs(raw,base);if(u&&!seen.has(u)){seen.add(u);queue.push(u)}}
function safePath(url){
  const u=new URL(url), q=u.search?('__q_'+btoa(unescape(encodeURIComponent(u.search))).replace(/[^\w.-]/g,'_').slice(0,80)):'',
  p=decodeURIComponent(u.pathname).replace(/^\/+/, '').replace(/[^\w.@()+,=\-\/]/g,'_')||'index.html';
  return ('source/'+p+q).replace(/\/{2,}/g,'/');
}
function add(name,data){
  if(typeof data==='string')data=enc.encode(data);
  if(!(data instanceof Uint8Array))data=new Uint8Array(data);
  if(!files.has(name)){files.set(name,data);total+=data.length}
}
function isText(type,url){return /(?:javascript|json|text|css|html|xml|svg|manifest)/i.test(type)||/\.(?:m?js|cjs|css|html?|json|map|txt|xml|svg|webmanifest)(?:\?|$)/i.test(url)}
function discover(text,base,type){
  const found=new Set();
  const push=x=>{const u=abs(x,base);if(u)found.add(u)};
  if(/html/i.test(type)||/<(?:script|link|img|source)\b/i.test(text)){
    try{const doc=new DOMParser().parseFromString(text,'text/html');doc.querySelectorAll('[src]').forEach(x=>push(x.getAttribute('src')));doc.querySelectorAll('link[href]').forEach(x=>push(x.getAttribute('href')))}catch{}
  }
  const patterns=[
    /(?:import\s*(?:[^'"()]*?from\s*)?|export\s*[^'"()]*?from\s*|import\s*\()\s*["']([^"']+)["']/g,
    /(?:src|href)\s*=\s*["']([^"']+)["']/g,
    /url\(\s*["']?([^"')]+)["']?\s*\)/g,
    /["']((?:\.\.?\/|\/assets\/)[^"'\\\s]+\.(?:m?js|css|json|map|wasm|svg|png|jpe?g|webp|gif|woff2?|ttf|otf|mp3|ogg|wav))(?:\?[^"']*)?["']/g
  ];
  for(const re of patterns){let m;while((m=re.exec(text)))push(m[1])}
  for(const u of found)enqueue(u,base);
}

// Điểm vào: trang, script/link DOM, tài nguyên đã tải và bundle index hiện hành.
enqueue(location.href);
document.querySelectorAll('script[src],link[href],img[src],source[src]').forEach(x=>enqueue(x.src||x.href));
performance.getEntriesByType('resource').forEach(x=>enqueue(x.name));

let done=0;
while(queue.length&&done<MAX_FILES&&total<MAX_TOTAL){
  const url=queue.shift(); done++;
  try{
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const type=r.headers.get('content-type')||'';
    const buf=new Uint8Array(await r.arrayBuffer());
    add(safePath(url),buf);
    if(isText(type,url)){
      const text=new TextDecoder().decode(buf);
      discover(text,url,type);
      if(/\.(?:m?js|css)(?:\?|$)/i.test(url))enqueue(url.split('?')[0]+'.map');
    }
    if(done%10===0){console.log(`[VK dump] ${done} file, ${(total/1048576).toFixed(1)} MB, còn ${queue.length}`);await sleep(0)}
  }catch(e){errors.push({url,error:e?.message||String(e)})}
}

// Snapshot nhẹ để biết chính xác bản game và cấu trúc runtime, không xuất save/người chơi.
const game=window.game;
const manifest={
  version:VERSION,started,finished:new Date().toISOString(),page:location.href,origin,
  userAgent:navigator.userAgent,fileCount:files.size,totalBytes:total,
  stopped:{maxFiles:done>=MAX_FILES,maxBytes:total>=MAX_TOTAL,remaining:queue.length},
  gameKeys:game?Object.keys(game):[],envKeys:game?.env?Object.keys(game.env):[],contentKeys:game?.content?Object.keys(game.content):[],
  errors
};
add('manifest.json',JSON.stringify(manifest,null,2));
add('page/document.html','<!doctype html>\n'+document.documentElement.outerHTML);

// ZIP STORE writer, tự chứa, không phụ thuộc JSZip/CDN.
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0};
const u16=(a,o,v)=>{a[o]=v&255;a[o+1]=(v>>>8)&255};
const u32=(a,o,v)=>{a[o]=v&255;a[o+1]=(v>>>8)&255;a[o+2]=(v>>>16)&255;a[o+3]=(v>>>24)&255};
function dosDate(d=new Date()){let year=Math.max(1980,d.getFullYear());return{time:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),date:((year-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()}}
function makeZip(entries){
  const chunks=[],central=[];let offset=0;const dt=dosDate();
  for(const [name,data] of entries){
    const n=enc.encode(name),crc=crc32(data),h=new Uint8Array(30+n.length);
    u32(h,0,0x04034b50);u16(h,4,20);u16(h,6,0x800);u16(h,8,0);u16(h,10,dt.time);u16(h,12,dt.date);u32(h,14,crc);u32(h,18,data.length);u32(h,22,data.length);u16(h,26,n.length);h.set(n,30);
    chunks.push(h,data);
    const c=new Uint8Array(46+n.length);u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);u16(c,8,0x800);u16(c,10,0);u16(c,12,dt.time);u16(c,14,dt.date);u32(c,16,crc);u32(c,20,data.length);u32(c,24,data.length);u16(c,28,n.length);u32(c,42,offset);c.set(n,46);central.push(c);offset+=h.length+data.length;
  }
  const csize=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22);u32(end,0,0x06054b50);u16(end,8,entries.length);u16(end,10,entries.length);u32(end,12,csize);u32(end,16,offset);
  return new Blob([...chunks,...central,end],{type:'application/zip'});
}
const zip=makeZip([...files]);
const stamp=new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
const name=`vk-game-source-${stamp}.zip`,a=document.createElement('a');a.href=URL.createObjectURL(zip);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
console.log('[VK dump] Hoàn tất',name,manifest);
alert(`Đã đóng gói ${files.size} file (${(total/1048576).toFixed(1)} MB) thành ${name}.\nLỗi tải: ${errors.length}. Chi tiết nằm trong manifest.json.`);
})().catch(e=>{console.error('[VK dump]',e);alert('VK dump lỗi: '+(e?.stack||e))});
