(async()=>{
'use strict';
const OUT='vk-dump-kinhmach-full-'+Date.now()+'.json';
const save=(obj,name=OUT)=>{const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)};
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x,(k,v)=>v instanceof Map?{__type:'Map',entries:[...v]}:v instanceof Set?{__type:'Set',values:[...v]}:typeof v==='function'?`[Function ${v.name||'anonymous'}/${v.length}]`:v))}};
const resources=performance.getEntriesByType('resource').map(x=>x.name);
const scripts=[...document.scripts].map(x=>x.src).filter(Boolean);
const candidates=[...new Set([...scripts,...resources])].filter(x=>/\/assets\/index-[^/]+\.js(?:\?|$)/.test(x));
const bundleUrl=candidates.at(-1);
if(!bundleUrl){save({at:new Date().toISOString(),error:'Không tìm thấy bundle index-*.js',scripts,resources});return}
let src='';
try{src=await (await fetch(bundleUrl,{credentials:'same-origin',cache:'no-store'})).text()}catch(e){save({at:new Date().toISOString(),bundleUrl,error:String(e),scripts,resources});return}
const needles=['function Vp(','function Ta(','function UC(','function ug(','function yd(','function Rjt(','function jjt(','function Hrt(','function Jzt(','Món này đã có trên kinh mạch','kinhLoDuong','sinhKhac'];
const contexts={};
for(const q of needles){const i=src.indexOf(q);contexts[q]={idx:i,text:i<0?'':src.slice(Math.max(0,i-1500),Math.min(src.length,i+12000))}}
const g=window.game;
const run=g?.run;
const nv=run?.nhanVat;
const content=g?.content;
const mapDump=m=>m instanceof Map?[...m.entries()].map(([k,v])=>[k,clone(v)]):null;
const payload={
 at:new Date().toISOString(),href:location.href,userAgent:navigator.userAgent,
 bundleUrl,bundleLen:src.length,bundleText:src,
 game:{keys:g?Object.keys(g):[],runKeys:run?Object.keys(run):[],contentKeys:content?Object.keys(content):[]},
 nhanVat:clone(nv),
 kinhMach:clone(nv?.kinhMach),
 currentTheChat:nv?.theChat,
 theChat:mapDump(content?.theChat),
 items:mapDump(content?.items),
 enemies:mapDump(content?.enemies),
 contexts
};
save(payload);
console.log('[VK dump] Đã xuất',OUT,'bundle',src.length,'bytes');
})().catch(e=>{console.error('[VK dump]',e);alert('Dump lỗi: '+(e?.stack||e))});
