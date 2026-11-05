(async()=>{
'use strict';
const g=window.game;
if(!g?.env?.content){alert('Game chưa sẵn sàng. Vào một kiếp rồi chạy lại.');return}
const C=g.env.content,out={at:new Date().toISOString(),errors:[]};
const safe=(k,fn)=>{try{out[k]=fn()}catch(e){out.errors.push(k+': '+(e.message||e))}};

/* 1. Dữ liệu sống (không cần mã nguồn) */
safe('contentKeys',()=>Object.keys(C));
safe('theChat',()=>C.theChat instanceof Map?[...C.theChat].map(([id,r])=>({id,...r})):null);
safe('linhCanSample',()=>JSON.parse(JSON.stringify(g.state.run.nhanVat.linhCan)));
safe('nhanVatKeys',()=>Object.keys(g.state.run.nhanVat));
safe('kinhMachKeys',()=>{const k=g.state.run.nhanVat.kinhMach;return{keys:Object.keys(k),mau:[...new Set(k.mau||[])],trangThai:[...new Set(k.trangThai||[])],loadouts:(k.loadouts||[]).length}});
safe('heDistinct',()=>{const s=new Set();for(const it of C.items.values())for(const h of (Array.isArray(it.he)?it.he:[]))s.add(h);return[...s]});
safe('itemsHeAm',()=>[...C.items].filter(([id,it])=>JSON.stringify(it.he||'').includes('am')).slice(0,12).map(([id,it])=>({id,ten:it.ten,he:it.he,loai:it.loai,tag:it.tag,canh_gioi:it.canh_gioi,hinh:it.hinh,dac_tinh:it.dac_tinh,noi_tai:it.noi_tai})));
safe('itemExample',()=>{const e=[...C.items].find(([id,it])=>it.loai==='cong_phap'&&it.hinh);return e?{id:e[0],...e[1]}:null});
safe('enemyExample',()=>{const e=[...C.enemies][0];return e?{id:e[0],...e[1]}:null});
safe('gameFns',()=>Object.keys(g).filter(k=>typeof g[k]==='function'));

/* 2. Mã nguồn bundle */
try{
  const tag=document.querySelector('script[type=module][src*="/assets/index-"]')||document.querySelector('script[type=module][src]');
  const url=tag?.src||(performance.getEntriesByType('resource').find(r=>/\/assets\/index-[^/]*\.js(\?|$)/.test(r.name))||{}).name;
  out.bundleUrl=url;
  const src=await (await fetch(url)).text();
  out.bundleLen=src.length;
  const ctx=(label,idx,before,after)=>({label,idx,text:src.slice(Math.max(0,idx-before),idx+after)});
  const lits=[
    'drugResistTran','.khuon.split(','Món này đã có trên kinh mạch','sinhKhac','noiTai','kinhLo',
    'dac_tinh','huyetThem','daLinhNgo','"vo_sac"','"phong"','"bang"','"loi"',
    'tieu_canh_gioi','theChat','linhCan','hinh_dang','khang_tam_ma','dot_pha','toc_do'
  ];
  out.literals=lits.map(l=>{const hits=[];let i=-1;while((i=src.indexOf(l,i+1))>=0&&hits.length<4)hits.push(i);return{lit:l,count:hits.length>=4?'4+':hits.length,first:hits.slice(0,2).map(i=>ctx(l,i,300,900))}});
  /* Mọi chỗ liệt kê hệ: chuỗi chứa kim+moc+thuy+hoa+tho gần nhau */
  const heRe=/["']kim["'][^\]\)\}]{0,80}["']moc["'][^\]\)\}]{0,80}["']thuy["'][^\]\)\}]{0,120}["']hoa["'][^\]\)\}]{0,80}["']tho["']/g;
  out.heLists=[];let m;while((m=heRe.exec(src))&&out.heLists.length<12)out.heLists.push(ctx('heList',m.index,200,500));
  /* Hàm cốt lõi: dựng kinh mạch, tính kinh mạch, mô phỏng trận */
  const fnAt=(re,label,before=200,after=3500)=>{const mm=re.exec(src);return mm?ctx(label,mm.index,before,after):{label,missing:true}};
  out.core=[
    fnAt(/\{ten:[\w$]+\.ten,drugResistTran:\{\},drugRetention:/,'Vr nhân vật khi đánh',1500,2500),
    fnAt(/huyetThem:\[\],manh:\[\]/,'dựng kinh mạch (kC)',900,1500),
    fnAt(/\.khuon\.split\(/,'khuôn kinh mạch (Tp)',600,1200),
    fnAt(/Món này đã có trên kinh mạch/,'kiểm tra chỗ đặt (Jh)',1200,1500),
    fnAt(/\.doDung\)!=null&&/,'mô phỏng trận (eJ)',1800,2500),
    fnAt(/muc\?\?"thuong",\w=\w\.canh_gioi/,'dựng quái (Ga)',900,1800),
    fnAt(/\.dac_tinh\?\?\{\}/,'tính kinh mạch (Rt)',900,3500)
  ];
}catch(e){out.errors.push('bundle: '+(e.message||e))}

const text=JSON.stringify(out,null,1);
try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download='vk-dump-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),20000)}catch{}
try{await navigator.clipboard.writeText(text)}catch{}
alert('Xong. File vk-dump-*.json đã tải về ('+Math.round(text.length/1024)+' KB). Gửi file đó cho mình.'+(out.errors.length?'\nCó '+out.errors.length+' lỗi nhỏ, vẫn nằm trong file.':''));
})();
