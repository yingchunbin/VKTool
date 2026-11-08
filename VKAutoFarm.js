(()=>{
'use strict';
/* ========================================================================
 * AUTO FARM — bookmarklet độc lập (tách riêng từ ToolVKGrok.js / "Vạn Kiếp Trợ Thủ")
 * Chỉ còn: engine Auto Farm (AutoFarm) + khung Auto Farm (VIEWS.auto), không còn
 * các tab khác (map/realm/bounty/people/sect/breakthrough/build/items/check).
 * Giao diện dùng đúng biến CSS của HUD game (--giay/--muc/--chu-do/--vang-kim/…
 * theo tai-lieu-api.md) kèm fallback, để tự đồng bộ theo theme/kiểu chữ người chơi
 * đang chọn trong game.
 * ====================================================================== */
const BUILD='20261107-autofarm-standalone-v1',ID='vkaf',g=window.game;
if(!g?.state?.run||!g?.env?.content?.encounters||!g?.env?.world){alert('Game chưa sẵn sàng. Hãy vào một kiếp rồi chạy lại.');return}
try{window.__VKAF__?.destroy?.()}catch{}
document.getElementById(ID)?.remove();document.getElementById(ID+'-style')?.remove();document.getElementById(ID+'-fab')?.remove();document.getElementById(ID+'-toasts')?.remove();document.getElementById(ID+'-afbar')?.remove();document.getElementById(ID+'-afstats')?.remove();

/* ───────── tiện ích chung (giữ nguyên từ ToolVKGrok.js, không đổi logic) ───────── */
const C=g.env.content,W=g.env.world;
const A=v=>Array.isArray(v)?v:[];
const N=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v));
const T=s=>String(s??'').replace(/[-]/g,'').replace(/\s+/g,' ').trim();
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:2});
const $=(r,s)=>r.querySelector(s),$$=(r,s)=>[...r.querySelectorAll(s)];
// Lưu ý: tiền tố key localStorage vẫn để nguyên 'vkt2.' (gốc) để tùy chọn farm
// (né quái, ngưỡng thọ, xử tù binh…) dùng chung được với bản ToolVKGrok.js đầy đủ.
const store={get(k,d){try{const v=localStorage.getItem('vkt2.'+k);return v==null?d:JSON.parse(v)}catch{return d}},set(k,v){try{localStorage.setItem('vkt2.'+k,JSON.stringify(v))}catch{}}};
const run=()=>g.state.run||{};
const me=()=>run().nhanVat||{};
const nowYear=()=>+run().nam||0;
const hasSlot=id=>{if(id==null||id==='')return false;try{return typeof W.hasSlot==='function'?Boolean(W.hasSlot(id)):Boolean(W.slot?.(id))}catch{return false}};
const info=slot=>{try{return W.info(slot)}catch{return null}};
const num=(fn,slot)=>{try{const v=typeof g[fn]==='function'?+g[fn](slot):NaN;return Number.isFinite(v)?v:NaN}catch{return NaN}};
const travelTo=slot=>num('travelYears',slot),milesTo=slot=>num('distanceLi',slot);
const fmtTime=t=>{if(!N(t))return'—';const y=Number(t),d=Math.round(y*360);if(d<30)return`${Math.max(1,d)} ngày`;const m=Math.round(y*12);if(m<12)return`${m} tháng`;return`${F(Math.round(y*10)/10)} năm`};
const fmtMiles=d=>N(d)?`${F(Math.round(d))} dặm`:'—';
const explored=slot=>A(run().daKhamPha).includes(slot);
let noiByLoaiCache=null;
const noiByLoai=()=>noiByLoaiCache||(noiByLoaiCache=(()=>{const m=new Map();for(const d of C.noiChon?.values?.()||[])for(const l of A(d.loai))m.set(l,d);return m})());
function placeDef(slot,r=run()){const ch=r?.noiChon?.[slot];if(ch?.chuNhan)return C.noiChon?.get?.('noi.dong_phu')||null;const i=info(slot);if(!i?.slot?.co_dinh||!i.diaDanh)return null;const d=noiByLoai().get(i.diaDanh.loai)||null;return d&&ch?.biDiet!==undefined?(C.noiChon?.get?.('noi.phe_tich')||d):d}
function danger(slot){const i=info(slot);if(!i)return{rank:1,label:'Chưa rõ'};const self=Number(me().canhGioi??0),base=Number(i.capNen??i.canhGioi??self),d=base-self;if(d>=2)return{rank:3,label:'Tử địa'};if(d>=1)return{rank:2,label:'Nguy hiểm'};if(d<=-1)return{rank:0,label:'An toàn'};return{rank:1,label:'Ngang sức'}}
const slotLabel=slot=>{const i=info(slot);return T(i?.ten||i?.diaDanh?.ten||slot)};
const uniq=a=>[...new Set(a)];
const inBag=id=>Number(me().tuiDo?.[id]||0),waiting=id=>Number(me().choCat?.[id]||0);
const strip=s=>T(String(s??'').replace(/[-]/g,''));

/* ───────── Giao diện: 1 khung Auto Farm duy nhất, đồng bộ biến CSS của HUD game ─────────
 * Theo tai-lieu-api.md (gói mod mẫu): --giay (nền giấy), --nen-hud (nền khung, giấy hơi
 * trong), --muc/--muc-nhat (chữ chính/phụ), --chu-do (son đỏ, nhấn/nút chính),
 * --vien-hud/--vien-muc/--vien-trong (viền nhạt/đậm/vạch kẻ), --vang-kim/--ngoc-luc/
 * --cam-do/--hong-dao/--xam-nhat (màu phụ: kim/ngọc/cam/hồng/xám), --co-chu (cỡ chữ
 * người chơi chọn). Bookmarklet không chạy trong sandbox mod nên không dùng được
 * `ui.kit`, nhưng các biến --… này là CSS custom property đặt ở gốc trang nên khung
 * của bookmarklet vẫn kế thừa được — tự đổi theo theme/cỡ chữ người chơi đang chọn.
 * Có kèm giá trị dự phòng (fallback) đề phòng chưa đọc được biến. */
const CSS=`
#${ID},#${ID}-fab,#${ID}-toasts,#${ID}-afbar,#${ID}-afstats{
  --gold:var(--vang-kim,#b8872e);--red:var(--chu-do,#ac3327);--jade:var(--ngoc-luc,#2f7d5e);
  --amber:var(--cam-do,#b85a1f);--pink:var(--hong-dao,#c97b86);
  --ink:var(--muc,#231c12);--ink2:var(--muc-nhat,#6b6152);--mute:var(--xam-nhat,#8c8272);
  --paper:var(--giay,#f1e7d0);--hud:var(--nen-hud,rgba(241,231,208,.97));
  --line:var(--vien-hud,rgba(35,28,18,.16));--line2:var(--vien-muc,rgba(35,28,18,.4));--line3:var(--vien-trong,rgba(35,28,18,.12));
  --scale:var(--co-chu,1);
  font-family:"Noto Serif","Songti SC","Source Han Serif SC",Georgia,"Times New Roman",serif;
  box-sizing:border-box;-webkit-tap-highlight-color:transparent;font-size:calc(14px*var(--scale))
}
#${ID} *,#${ID}-fab *,#${ID}-afbar *,#${ID}-afstats *{box-sizing:border-box;font-family:inherit}
#${ID}-fab{position:fixed;left:10px;bottom:88px;z-index:2147483000;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 30% 25%,var(--paper),var(--hud) 70%);border:1.5px solid var(--red);color:var(--red);font-size:24px;line-height:49px;text-align:center;cursor:pointer;box-shadow:0 0 0 3px rgba(172,51,39,.15),0 6px 18px rgba(0,0,0,.35);user-select:none;touch-action:none}
#${ID}-fab.running{animation:${ID}p 1.4s ease-in-out infinite}
@keyframes ${ID}p{0%,100%{box-shadow:0 0 0 3px rgba(47,125,94,.35),0 0 0 0 rgba(47,125,94,.6)}50%{box-shadow:0 0 0 3px rgba(47,125,94,.6),0 0 0 14px rgba(47,125,94,0)}}
#${ID}-toasts{position:fixed;left:10px;right:10px;top:10px;z-index:2147483200;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;max-height:40vh;overflow:hidden}
#${ID}-toasts div{pointer-events:auto;max-width:min(420px,calc(100vw - 28px));width:auto;background:var(--hud);border:1px solid var(--red);border-left:4px solid var(--red);color:var(--ink);padding:9px 12px;border-radius:8px;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.25);animation:${ID}in .3s;cursor:pointer}
#${ID}-toasts div.ok{border-color:var(--jade);border-left-color:var(--jade)}
@keyframes ${ID}in{from{transform:translateY(-14px);opacity:0}}
#${ID}{position:fixed;left:8px;bottom:8px;z-index:2147483100;width:min(460px,calc(100vw - 16px));height:min(640px,calc(100dvh - 16px));display:none;flex-direction:column;background:var(--hud);color:var(--ink);border:1px solid var(--line2);border-radius:12px;box-shadow:0 0 0 1px rgba(0,0,0,.15),0 16px 48px rgba(0,0,0,.3);overflow:hidden;font-size:14px}
#${ID}.open{display:flex}
#${ID} header{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--line);background:linear-gradient(90deg,rgba(184,135,46,.12),transparent)}
#${ID} header .seal{width:30px;height:30px;border-radius:6px;background:var(--red);color:var(--paper);display:grid;place-items:center;font-size:18px;transform:rotate(-4deg);box-shadow:0 0 0 1px rgba(0,0,0,.15) inset}
#${ID} header h1{margin:0;font-size:15px;color:var(--gold);letter-spacing:.5px;line-height:1.2}
#${ID} header small{display:block;color:var(--ink2);font-size:11.5px}
#${ID} header button{margin-left:auto;border:1px solid var(--line2);background:transparent;color:var(--gold);border-radius:6px;width:32px;height:32px;font-size:16px;cursor:pointer}
#${ID} .body{flex:1;overflow:auto;padding:8px 10px 12px;-webkit-overflow-scrolling:touch}
#${ID} .bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
#${ID} input,#${ID} select{background:rgba(255,255,255,.35);color:var(--ink);border:1px solid var(--line2);border-radius:7px;padding:7px 8px;font-size:14px;min-width:0}
#${ID} input[type=search],#${ID} .grow{flex:1 1 140px}
#${ID} .sum{color:var(--ink2);font-size:12px;margin:2px 0 8px}
#${ID} .card{position:relative;display:grid;grid-template-columns:34px 1fr auto;gap:4px 10px;background:rgba(255,255,255,.3);border:1px solid var(--line);border-left:3px solid var(--jade);border-radius:9px;padding:9px 10px;margin-bottom:8px}
#${ID} .card.d2{border-left-color:var(--amber)}#${ID} .card.d3{border-left-color:var(--red)}
#${ID} .ico{grid-row:1/3;width:34px;height:34px;border-radius:8px;border:1px solid var(--line2);color:var(--gold);display:grid;place-items:center;font-size:18px;background:rgba(0,0,0,.05)}
#${ID} .card b{font-size:14.5px;color:var(--ink);line-height:1.3}
#${ID} .card small,#${ID} .sub{color:var(--ink2);font-size:12px;line-height:1.4}
#${ID} .side{text-align:right;font-size:13px;color:var(--ink2);white-space:nowrap}
#${ID} .side small{display:block}
#${ID} .tags{grid-column:2/4;display:flex;flex-wrap:wrap;gap:4px}
#${ID} .tag{font-size:11.5px;border:1px solid var(--line2);color:var(--ink);border-radius:4px;padding:1px 6px}
#${ID} .tag.g{border-color:var(--jade);color:var(--jade)}#${ID} .tag.r{border-color:var(--red);color:var(--red)}#${ID} .tag.o{border-color:var(--amber);color:var(--amber)}
#${ID} .r{color:var(--red)}#${ID} .g{color:var(--jade)}
#${ID} button.btn{flex:1;border:1px solid var(--line2);background:rgba(184,135,46,.08);color:var(--gold);border-radius:7px;padding:8px 6px;font-size:13px;cursor:pointer;min-height:36px}
#${ID} button.btn:active{background:rgba(184,135,46,.22)}
#${ID} button.btn.pri{background:var(--red);border-color:var(--red);color:var(--paper)}
#${ID} button.btn:disabled{opacity:.45}
#${ID} .empty{text-align:center;color:var(--ink2);padding:26px 10px}
#${ID} .panel{background:rgba(255,255,255,.25);border:1px solid var(--line);border-radius:9px;padding:10px;margin-bottom:8px}
@media (min-width:700px){#${ID}{left:70px;bottom:20px}}
/* Thanh điều khiển nhỏ + bảng thống kê nổi — do AutoFarm tự tạo khi đang chạy */
#${ID}-afbar{position:fixed;z-index:2147483001;display:flex;flex-direction:column-reverse;align-items:center;gap:6px;pointer-events:auto}
#${ID}-afbar button{width:40px;height:40px;border:1.5px solid var(--line2);background:radial-gradient(circle at 30% 25%,var(--paper),var(--hud) 70%);color:var(--gold);border-radius:50%;padding:0;display:grid;place-items:center;box-shadow:0 3px 12px rgba(0,0,0,.25);cursor:pointer;line-height:0}
#${ID}-afbar button svg{width:18px;height:18px;display:block;fill:currentColor}
#${ID}-afbar[data-paused="1"] button[data-a="pause"]{border-color:var(--jade);color:var(--jade)}
#${ID}-afstats{position:fixed;z-index:2147483646;left:12px;bottom:12px;width:min(380px,calc(100vw - 24px));max-height:min(70vh,520px);overflow:auto;background:var(--hud);border:1px solid var(--line2);border-radius:12px;padding:0 0 10px;color:var(--ink);font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.25);pointer-events:auto}
#${ID}-afstats .af-drag{cursor:move;padding:10px 14px 6px;user-select:none;touch-action:none;display:flex;align-items:center;gap:8px}
#${ID}-afstats .af-h{color:var(--gold);font-weight:700;font-size:14px;letter-spacing:.02em;flex:1}
#${ID}-afstats .af-toggle{flex:none;width:24px;height:24px;line-height:22px;padding:0;border:1px solid var(--line2);border-radius:6px;background:transparent;color:var(--gold);font-size:12px;cursor:pointer}
#${ID}-afstats.collapsed{padding-bottom:0}
#${ID}-afstats.collapsed .af-drag{padding-bottom:10px}
#${ID}-afstats.collapsed .af-body{display:none}
#${ID}-afstats .af-body{padding:0 14px}
#${ID}-afstats .af-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid var(--line3)}
#${ID}-afstats .af-row3{display:grid;grid-template-columns:minmax(5.5em,1fr) minmax(4.5em,auto) minmax(4.5em,auto) minmax(5em,auto);gap:10px 12px;padding:4px 0;border-bottom:1px solid var(--line3);align-items:center}
#${ID}-afstats .af-row3.head{opacity:.65;font-size:11px;border-bottom:1px solid var(--line2)}
#${ID}-afstats .af-row3 .pos{color:var(--jade);text-align:right;font-variant-numeric:tabular-nums}
#${ID}-afstats .af-row3 .neg{color:var(--red);text-align:right;font-variant-numeric:tabular-nums}
#${ID}-afstats .af-row3 .net,#${ID}-afstats .af-row .net{color:var(--gold);text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
#${ID}-afstats .af-k{opacity:.9}
#${ID}-afstats .af-sec{margin-top:8px;padding-top:6px;border-top:1px solid var(--line2);color:var(--gold);font-size:12px;font-weight:600}
#${ID}-afstats .af-sub{opacity:.7;font-size:11px;margin-top:8px;line-height:1.35}
`;
const styleEl=document.createElement('style');styleEl.id=ID+'-style';styleEl.textContent=CSS;document.head.appendChild(styleEl);

const panel=document.createElement('div');panel.id=ID;panel.setAttribute('role','dialog');
panel.innerHTML=`<header><div class="seal">自</div><div><h1>Auto Farm</h1><small id="${ID}-sub"></small></div><button id="${ID}-x" aria-label="Thu gọn">✕</button></header><div class="body" id="${ID}-body"></div>`;
const fab=document.createElement('div');fab.id=ID+'-fab';fab.innerHTML='自';fab.title='Auto Farm';
const toasts=document.createElement('div');toasts.id=ID+'-toasts';
document.body.append(panel,fab,toasts);
const body=$(panel,'.body');
const ui={isOpen:false,tab:'auto'};
const VIEWS={};

function placeToasts(){try{const r=fab.getBoundingClientRect(),top=r.top+r.height/2<innerHeight/2;toasts.style.top=top?'auto':'10px';toasts.style.bottom=top?'10px':'auto'}catch{}}
function toast(msg,kind='',ms=4200){
  placeToasts();
  while(toasts.childElementCount>=4)toasts.firstElementChild?.remove();
  const d=document.createElement('div');if(kind)d.className=kind;
  d.textContent=msg;toasts.appendChild(d);
  const t=setTimeout(()=>d.remove(),ms);
  d.onclick=()=>{clearTimeout(t);d.remove()};
}

/* kéo biểu tượng tới chỗ khác; bấm (không kéo) để mở/đóng khung */
const hdrSub=()=>{const r=run(),i=info(r.viTri);return`Năm ${F(Math.floor(r.nam))} · ${T(i?.ten||'')}`};
function openPanel(){ui.isOpen=true;panel.classList.add('open');$(panel,'#'+ID+'-sub').textContent=hdrSub();VIEWS.auto()}
function closePanel(){ui.isOpen=false;panel.classList.remove('open')}
(()=>{
  const pos=store.get('afFabPos',null);
  if(pos){fab.style.left=Math.min(pos[0],innerWidth-56)+'px';fab.style.top=Math.min(pos[1],innerHeight-56)+'px';fab.style.bottom='auto'}
  let d=null;
  fab.addEventListener('pointerdown',e=>{d={x:e.clientX,y:e.clientY,l:fab.offsetLeft,t:fab.offsetTop,m:false};fab.setPointerCapture(e.pointerId)});
  fab.addEventListener('pointermove',e=>{
    if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>6)d.m=true;
    if(d.m){const l=Math.max(4,Math.min(innerWidth-56,d.l+dx)),t=Math.max(4,Math.min(innerHeight-56,d.t+dy));fab.style.left=l+'px';fab.style.top=t+'px';fab.style.bottom='auto';try{AutoFarm.running&&AutoFarm.syncFab()}catch{}}
  });
  fab.addEventListener('pointerup',()=>{if(!d)return;const moved=d.m;d=null;if(moved)store.set('afFabPos',[fab.offsetLeft,fab.offsetTop]);else ui.isOpen?closePanel():openPanel()});
})();
$(panel,'#'+ID+'-x').onclick=closePanel;

/* ───────── AutoFarm: engine auto farm — GIỮ NGUYÊN 100% logic gốc từ ToolVKGrok.js ───────── */
const AutoFarm={
  running:false,timer:null,stepN:0,paused:false,emptyScans:0,needInteractHere:false,
  opts:{
    onlySanYeu:false,
    includeWildSan:true,
    includeMapNodes:true,
    includePlaceActs:true,
    includeNearPlaces:true,
    includeHaiThuoc:false,
    preferNear:true,
    tocChien:true,
    skipTuDia:true,
    autoChoose:true,
    autoHeal:true,
    healMinLevel:1,
    pauseIfNoHeal:true,
    pursuit:'release',
    apex:'fallback',
    minLifeYears:3,
    avoidBeasts:'Bạch Hạc Linh',
    xuTri:'tha',
    radiusWorld:55,
    radiusYears:0.25,
    delayMs:800
  },
  stats:{ok:0,skip:0,err:0,heal:0},
  log:[],
  slotBan:null,
  recentSlots:null,
  /* ── Ghi hành động tay (để học pattern farm) ── */
  rec:{on:false,events:[],hooks:null,unsub:null,lastSnap:null},
  push(msg,kind='',extra){
    const line={
      t:new Date().toISOString(),
      tShow:new Date().toLocaleTimeString('vi-VN',{hour12:false}),
      msg:String(msg),
      kind:kind||'',
      nam:nowYear(),
      viTri:run().viTri||null,
      active:run().active?.id||null,
      waiting:run().active?.waiting?.kind||null,
      thuongThe:Number(me().thuongThe||0),
      extra:extra||null
    };
    // Khi auto chạy: gắn snap đầy đủ (noiActs/choices/risk…) giống ghi tay để xuất log inspect
    if(this.running||kind==='ok'||kind==='err'){
      try{line.snap=this.richSnap?.()||null}catch{line.snap=null}
    }
    this.log.push(line);
    if(this.log.length>400)this.log.shift();
    try{console.log('[AutoFarm]',line.kind||'info',line.msg,line)}catch{}
    this.refreshLogOnly();
    if(this.running){
      try{this.trackGains();this.syncGainsBar()}catch(e){try{console.warn('[AutoFarm] gains',e)}catch{}}
    }
  },

  /* ── Snapshot lợi ích khi auto (tu vi / linh thạch / túi theo phẩm) ── */
  PHAM_TEN:['','Phàm phẩm','Hoàng phẩm','Huyền phẩm','Địa phẩm','Thiên phẩm','Tiên phẩm','Thần phẩm','Nghịch Thiên'],
  itemPham(id){
    try{
      const it=C.items?.get?.(id)||C.items?.get?.(String(id).replace(/\.\d+$/,''));
      const p=Number(it?.pham_cap??it?.phamCap??0);
      return Number.isFinite(p)&&p>0?Math.min(8,Math.floor(p)):0;
    }catch{return 0}
  },
  bagByPham(){
    const r=run(), bag=r.nhanVat?.tuiDo||r.nhanVat?.tui||{};
    const by={};
    let total=0;
    for(const [id,qty] of Object.entries(bag||{})){
      const n=Number(qty)||0; if(n<=0)continue;
      const p=this.itemPham(id)||1;
      by[p]=(by[p]||0)+n;
      total+=n;
    }
    return{by,total};
  },
  STAT_KEYS:['than_thuc','ngo_tinh','khi_van','than_phap','can_cot','dao_tam','tam_ma'],
  STAT_LABELS:{than_thuc:'Thần thức',ngo_tinh:'Ngộ tính',khi_van:'Khí vận',than_phap:'Thân pháp',can_cot:'Căn cốt',dao_tam:'Đạo tâm',tam_ma:'Tâm ma'},
  /* Tu vi TÍCH LŨY: lên tiểu cảnh giới thì nv.tuVi về 0 nên không thể trừ trực tiếp.
     Cộng thêm tuViCan của mọi tiểu cảnh giới đã qua (hàm của game) để số đo liên tục. */
  tuViCum(nv){
    const raw=Number(nv.tuVi||0);
    try{
      const core=window.tuTien?.core||{};
      const rl=core['kernel/realms']||core['index']||{};
      const fn=rl.tuViCan;
      if(typeof fn!=='function')return raw;
      const cg=Number(nv.canhGioi||0),tc=Number(nv.tieuCanhGioi||0);
      const tmax=Number(rl.TIEU_MAX);
      const top=Number.isFinite(tmax)&&tmax>0?tmax:3;
      let sum=0;
      for(let c=0;c<=cg;c++){
        const lim=c<cg?top:tc-1;
        for(let t=0;t<=lim;t++){let v=0;try{v=Number(fn(c,t))}catch{}if(Number.isFinite(v)&&v>0)sum+=v}
      }
      return sum+raw;
    }catch{return raw}
  },
  charSnapshot(){
    const nv=me()||{};
    const bag=this.bagByPham();
    const chi={};
    const srcChi=nv.chiSo||{};
    for(const k of this.STAT_KEYS)chi[k]=Number(srcChi[k]||0);
    return{
      nam:nowYear(),
      linhThach:Number(nv.linhThach||0),
      tuVi:this.tuViCum(nv),
      tuViRaw:Number(nv.tuVi||0),
      tieu:Number(nv.tieuCanhGioi||0),
      canhGioi:Number(nv.canhGioi||0),
      thuongThe:Number(nv.thuongThe||0),
      chiSo:chi,
      bagTotal:bag.total,
      bagByPham:bag.by
    };
  },
  gainsDelta(){
    const base=this.gainsBase; if(!base)return null;
    const now=this.charSnapshot();
    const dPham={};
    const keys=new Set([...Object.keys(base.bagByPham||{}),...Object.keys(now.bagByPham||{})]);
    for(const k of keys){
      const d=(now.bagByPham[k]||0)-(base.bagByPham[k]||0);
      if(d)dPham[k]=d;
    }
    const acc=this.gainsAcc||{};
    const pair=(key, net)=>{
      const a=acc[key]||{};
      return{net, plus:a.plus??Math.max(0,net), minus:a.minus??Math.max(0,-net)};
    };
    const chi={};
    for(const k of this.STAT_KEYS){
      const b=Number(base.chiSo?.[k]||0), n=Number(now.chiSo?.[k]||0);
      const a=acc.chiSo?.[k]||{};
      const net=n-b;
      chi[k]={net, plus:a.plus??Math.max(0,net), minus:a.minus??Math.max(0,-net)};
    }
    return{
      linhThach:pair('linhThach', now.linhThach-base.linhThach),
      tuVi:pair('tuVi', now.tuVi-base.tuVi),
      canhGioi:pair('canhGioi', now.canhGioi-base.canhGioi),
      bagTotal:now.bagTotal-base.bagTotal,
      bagByPham:dPham,
      chiSo:chi,
      now,base
    };
  },
  trackGains(){
    if(!this.gainsBase){
      try{this.gainsBase=this.charSnapshot();this.gainsPrev=this.gainsBase}catch{return}
    }
    const keys=this.STAT_KEYS||['than_thuc','ngo_tinh','khi_van','than_phap','can_cot','dao_tam','tam_ma'];
    const now=this.charSnapshot();
    const prev=this.gainsPrev||this.gainsBase;
    if(!this.gainsAcc){
      this.gainsAcc={
        linhThach:{plus:0,minus:0},tuVi:{plus:0,minus:0},canhGioi:{plus:0,minus:0},
        chiSo:Object.fromEntries(keys.map(k=>[k,{plus:0,minus:0}]))
      };
    }
    const acc=this.gainsAcc;
    if(!acc.chiSo)acc.chiSo={};
    const bump=(bucket, before, after)=>{
      if(!bucket)return;
      const d=Number(after||0)-Number(before||0);
      if(d>0)bucket.plus+=d;
      else if(d<0)bucket.minus+=-d;
    };
    bump(acc.linhThach, prev.linhThach, now.linhThach);
    bump(acc.tuVi, prev.tuVi, now.tuVi);
    bump(acc.canhGioi, prev.canhGioi, now.canhGioi);
    for(const k of keys){
      if(!acc.chiSo[k])acc.chiSo[k]={plus:0,minus:0};
      bump(acc.chiSo[k], Number(prev.chiSo?.[k]||0), Number(now.chiSo?.[k]||0));
    }
    this.gainsPrev=now;
  },
  gainsHtml(){
    const d=this.gainsDelta();
    if(!d)return '<div class="sub">Chưa chạy auto — chưa có thống kê nhận.</div>';
    const cell=(n)=>{const x=Number(n)||0;return (x>0?'+':'')+F(x)};
    const pair=p=>{
      if(p&&typeof p==='object')return p;
      const n=Number(p)||0;return{plus:Math.max(0,n),minus:Math.max(0,-n),net:n};
    };
    const row3=(label,p)=>{
      const x=pair(p);
      return `<div class="af-row3"><span>${E(label)}</span><span class="pos">${cell(x.plus)}</span><span class="neg">${x.minus?('-'+F(x.minus)):'0'}</span><span class="net">${cell(x.net)}</span></div>`;
    };
    const pham=Object.keys(d.bagByPham||{}).sort((a,b)=>Number(a)-Number(b)).map(p=>{
      const ten=this.PHAM_TEN[Number(p)]||('Phẩm '+p);
      const v=d.bagByPham[p];
      return `<div class="af-row"><span>${E(ten)}</span><span class="net">${cell(v)}</span></div>`;
    }).join('')||'<div class="sub">Không đổi</div>';
    return `<div class="af-sec">Tài nguyên</div>
      <div class="af-row3 head"><span></span><span>+</span><span>−</span><span>Thực</span></div>
      ${row3('Tu vi', d.tuVi)}
      ${row3('Linh thạch', d.linhThach)}
      <div class="af-sec">Chỉ số</div>
      <div class="af-row3 head"><span></span><span>+</span><span>−</span><span>Thực</span></div>
      ${this.STAT_KEYS.map(k=>row3(this.STAT_LABELS[k]||k, d.chiSo?.[k])).join('')}
      <div class="af-sec">Vật phẩm (theo phẩm)</div>
      ${pham}
      <div class="sub" style="margin-top:6px">Năm ${F(d.base.nam)} → ${F(d.now.nam)}</div>`;
  },

  richSnap(){
    const r=run(),a=r.active;
    let view=null,noi=null,block=null;
    try{view=typeof g.encounterView==='function'?g.encounterView():null}catch{}
    try{noi=typeof g.noiView==='function'?g.noiView():null}catch{}
    try{block=typeof g.targetHuntBlock==='function'?g.targetHuntBlock():null}catch{}
    const defInfo=id=>{try{const d=this.encDef(id);if(!d)return null;const tg=d.tags||{};return{kind:d.kind||null,nhom:d.nhom||null,tc:tg.tinh_chat||null,ten:T(d.ten||''),lamMoi:d.lam_moi||null,hoiChieu:d.limits?.hoi_chieu_nam??null}}catch{return null}};
    const acts=A(noi?.hoatDong).map(x=>{
      let farm=null,nonFarm=null;
      try{farm=this.isFarmPlaceAct(x);nonFarm=this.isNonFarmEnc(x.id)}catch{}
      return{id:x.id,loai:x.loai,ten:T(x.ten||''),locked:x.lockedReason||null,an:!!x.an,theCuc:x.theCuc||x.tenTheCuc||null,group:x.group||null,note:x.note||null,farm,nonFarm,def:defInfo(x.id)};
    }).slice(0,30);
    const choices=A(view?.choices).map(c=>{
      let sp=null;try{const q=this.choiceSpendsResource(c);sp=q.spends?{lt:q.linhThach,ch:q.congHien,tho:q.thoNguyen||0,txt:q.textHint}:null}catch{}
      return{
        index:c.index,text:this.stripText(c.text).slice(0,120),
        risk:c.risk?.level||null,riskRaw:c.risk&&typeof c.risk==='object'?c.risk:null,chance:c.chance,thoat:!!c.thoat,available:c.available!==false,
        phucHet:!!c.phucHet,vat:A(c.vat).slice(0,4),lock:c.lockedReason||c.khoa||null,spends:sp
      };
    }).slice(0,20);
    let life=null;try{life=this.lifeLeft()}catch{}
    return{
      nam:r.nam,viTri:r.viTri,oNoi:r.oNoi||null,
      thuongThe:Number(r.nhanVat?.thuongThe||0),
      canhGioi:Number(r.nhanVat?.canhGioi||0),
      linhThach:Number(r.nhanVat?.linhThach||0),
      tuVi:Number(r.nhanVat?.tuVi||0),tieu:Number(r.nhanVat?.tieuCanhGioi||0),tuViCum:this.tuViCum(r.nhanVat||{}),
      active:a?{id:a.id,slot:a.slot,done:!!a.done,waiting:a.waiting?.kind||null}:null,
      encKind:view?.kind||(this.encDef?this.encDef(a?.id)?.kind:null)||null,
      huntBlock:block?String(block):null,
      sanYeuLeft:this.sanYeuLeft?this.sanYeuLeft(r.viTri):null,
      noiActs:acts,
      noiMeta:noi?{ten:T(noi.ten||''),loai:noi.loai||null,trangThai:A(noi.trangThai).map(x=>this.stripText(x)).slice(0,6),suKienConNam:noi.suKienConNam??null,theCuc:A(noi.theCuc).slice(0,4)}:null,
      activeDef:a?defInfo(a.id):null,
      lifeLeft:life,tuoi:r.nhanVat?.tuoi??null,
      choices,
      gains:this.gainsDelta()
    };
  },
  dumpState(tag){
    const r=run(),a=r.active;
    let view=null,viewErr=null;
    try{view=typeof g.encounterView==='function'?g.encounterView():null}catch(e){viewErr=String(e.message||e)}
    const st={
      tag,nam:r.nam,viTri:r.viTri,ketThuc:!!r.ketThuc,
      thuongThe:Number(r.nhanVat?.thuongThe||0),
      active:a?{id:a.id,slot:a.slot,done:!!a.done,waiting:a.waiting?.kind||null,scene:a.scene||null}:null,
      truyDuoi:r.truyDuoi?{ten:r.truyDuoi.ten,den:r.truyDuoi.den}:null,
      viewErr,viewChoices:A(view?.choices).map(c=>({index:c.index,available:c.available,chance:c.chance,text:String(c.text||'').slice(0,60),thoat:!!c.thoat,risk:c.risk?.level||null})),
      targets:this.targets().slice(0,12).map(t=>({slot:t.slot,enc:t.enc,travel:t.travel,left:t.left,mode:t.mode})),
      nodeSample:this.nodeEncounterSample(20),
      healPick:this.pickHealItem(),
      opts:{...this.opts},stats:{...this.stats},stepN:this.stepN,running:this.running,paused:this.paused,
      gains:this.gainsDelta(),gainsBase:this.gainsBase||null
    };
    this.push('STATE '+tag,'dbg',st);
    return st;
  },
  recSnap(){
    const r=run(),a=r.active;
    let view=null,noi=null,hunts=null,block=null,pursuit=null,xutri=null,placeInfo=null;
    try{view=typeof g.encounterView==='function'?g.encounterView():null}catch{}
    try{noi=typeof g.noiView==='function'?g.noiView():null}catch{}
    try{hunts=typeof g.huntTargets==='function'?g.huntTargets():null}catch{}
    try{block=typeof g.targetHuntBlock==='function'?g.targetHuntBlock():null}catch{}
    try{pursuit=typeof g.pursuitOptions==='function'?g.pursuitOptions():null}catch{}
    try{xutri=typeof g.cachXuTri==='function'?g.cachXuTri():null}catch{}
    try{placeInfo=typeof g.placeInfo==='function'?g.placeInfo():null}catch{}
    const node=r.nodes?.[r.viTri];
    const bag=A(r.nhanVat?.tui||r.tui);
    const healIds=['item.hoi_xuan_dan','item.kim_sang_duoc','item.sinh_co_dan','item.tai_tao_dan','item.bat_tu_dan'];
    const healBag=bag.filter(it=>{
      const id=String(it?.id||it||'');
      return healIds.some(h=>id.startsWith(h))||/hoi_xuan|kim_sang|sinh_co|tai_tao|bat_tu|tri_thuong|hoi_mau/i.test(id);
    }).map(it=>({id:it.id||it,so:it.so||it.qty||1})).slice(0,12);
    // Node gần (map encounters) — chỉ id
    const nearNodes=[];
    try{
      const nodes=r.nodes||{};
      for(const [slot,n] of Object.entries(nodes)){
        if(!n||!n.encounter)continue;
        const m=milesTo(slot);
        if(N(m)&&m<=30)nearNodes.push({slot,enc:n.encounter,miles:m});
      }
      nearNodes.sort((a,b)=>(a.miles||9)-(b.miles||9));
    }catch{}
    return {
      nam:r.nam,
      viTri:r.viTri,
      oNoi:r.oNoi||null,
      thuongThe:Number(r.nhanVat?.thuongThe||0),
      canhGioi:r.nhanVat?.canhGioi??null,
      active:a?{
        id:a.id,slot:a.slot,done:!!a.done,
        waiting:a.waiting?.kind||null,
        waitingData:a.waiting?.data?JSON.parse(JSON.stringify(a.waiting.data,(k,v)=>typeof v==='function'?undefined:v)):null
      }:null,
      tran:r.tran?{
        ketThuc:!!r.tran.ketThuc,
        ketQua:typeof r.tran.ketThuc==='string'?r.tran.ketThuc:null,
        phe:r.tran.phe||null,
        luot:r.tran.luot??null,
        daGiaoChien:r.tran.daGiaoChien??null,
        hiep:r.tran.hiep??null,
        ta:r.tran.ta?{kh:Math.round(r.tran.ta.khiHuyet||0),khMax:Math.round(r.tran.ta.khiHuyetToiDa||0),ll:r.tran.ta.linhLuc??null,llTurn:r.tran.ta.linhLucMoiLuot??null,ddt:!!r.tran.ta.daDanhThuong,hoi:r.tran.ta.hoi||null,
          chieu:A(r.tran.ta.chieu).map(c=>({id:c.id,ten:c.ten,dang:c.dang,phi:c.phi,hoi:c.hoi,uy:c.uy}))}:null,
        dich:A(r.tran.dich).slice(0,4).map(d=>({id:d.id,ten:d.ten,kh:Math.round(d.khiHuyet||0),khMax:Math.round(d.khiHuyetToiDa||0),muc:d.muc||null}))
      }:null,
      bienCo:r.bienCo?{encounter:r.bienCo.encounter||r.bienCo.id||true,slot:r.bienCo.slot||null}:null,
      thongBao:r.thongBao?{text:String(r.thongBao.text||r.thongBao||'').slice(0,120)}:null,
      thongBaoDai:!!r.thongBaoDai,
      nodeEnc:node?.encounter||null,
      sanYeuLeft:this.sanYeuLeft(r.viTri),
      sanYeuRaw:r.sanYeu?.[r.viTri]??null,
      huntBlock:block?String(block):null,
      huntTargets:A(hunts).slice(0,15).map(h=>({
        id:h.id||h.enemyId||h.beastId||null,
        ten:T(h.ten||h.name||''),
        risk:h.risk?.level||h.nguyHiem||null
      })),
      noiActs:A(noi?.hoatDong).map(x=>({
        id:x.id,loai:x.loai,ten:T(x.ten||''),locked:x.lockedReason||null
      })).slice(0,40),
      placeTabs:A(noi?.tabs||noi?.tab).slice(0,10),
      placeBeasts:A(placeInfo?.beasts||placeInfo?.yeuThu).slice(0,10).map(b=>({id:b.id||b,ten:T(b.ten||'')})),
      choices:A(view?.choices).map(c=>({
        index:c.index,
        text:String(c.text||'').slice(0,100),
        chance:c.chance,
        risk:c.risk?.level||null,
        thoat:!!c.thoat,
        available:c.available!==false,
        effect:c.effect||null
      })).slice(0,25),
      pursuit:A(pursuit).map(p=>({id:p.id||p.value||p,text:T(p.ten||p.text||p)})).slice(0,8),
      xuTriOpts:A(xutri).map(x=>({id:x.id||x.value||x,text:T(x.ten||x.text||x)})).slice(0,8),
      healBag:healBag,
      nearNodes:nearNodes.slice(0,12)
    };
  },
  recSerialize(args){
    try{
      return JSON.parse(JSON.stringify(args,(k,v)=>{
        if(typeof v==='function')return undefined;
        if(typeof v==='bigint')return Number(v);
        if(v&&typeof v==='object'){
          // cắt object quá sâu
        }
        return v;
      }));
    }catch{
      try{return args.map(a=>{try{return typeof a==='object'?JSON.stringify(a).slice(0,200):a}catch{return String(a)}})}catch{return [String(args)]}
    }
  },
  recPush(kind,detail,extra){
    if(!this.rec.on)return;
    const ev={
      t:new Date().toISOString(),
      tShow:new Date().toLocaleTimeString('vi-VN',{hour12:false}),
      kind,
      detail:detail===undefined?null:detail,
      extra:extra||null,
      snap:this.recSnap()
    };
    this.rec.events.push(ev);
    if(this.rec.events.length>2000)this.rec.events.splice(0,this.rec.events.length-2000);
    try{console.log('[AF-REC]',kind,detail)}catch{}
    this.refreshRecOnly();
  },
  refreshRecOnly(){
    if(!ui.isOpen||ui.tab!=='auto')return;
    const el=$(body,'#af-rec-log');if(!el)return;
    const n=this.rec.events.length;
    el.innerHTML=(this.rec.on?`<div class="sub g">Đang ghi · ${n} sự kiện</div>`:`<div class="sub">Đã ghi ${n} sự kiện</div>`)+
      this.rec.events.slice().reverse().slice(0,50).map(x=>{
        let d='';
        try{d=typeof x.detail==='string'?x.detail:JSON.stringify(x.detail??'').slice(0,140)}catch{d=''}
        return `<div class="sub">[${E(x.tShow)}] <b>${E(x.kind)}</b> ${E(d)}</div>`;
      }).join('');
  },
  startRecord(){
    if(this.rec.on)return;
    this.rec.on=true;
    this.rec.events=[];
    this.rec.lastSnap=this.recSnap();
    this.recPush('record_start','Bắt đầu ghi — thao tác trên game như bình thường; mọi API + đổi state sẽ được lưu');
    // Hook rộng các API game (act + đọc liên quan farm)
    const names=[
      'travelTo','enterNode','chooseActivity','leavePlace','reopenPlace','doAction','choose',
      'xuTri','choosePursuit','closeEncounter','resume','tocChienTran','hanhDongTran','xongTran',
      'useItem','targetedHunt','turnOnPursuer','dongThongBao','closeLongNotice','ngoiDoi','beQuan',
      'luyenChe','dotPha','nhapDinh','xungKich'
    ];
    this.rec.hooks=this.rec.hooks||{};
    for(const name of names){
      if(typeof g[name]!=='function')continue;
      if(this.rec.hooks[name])continue;
      const orig=g[name].bind(g);
      this.rec.hooks[name]=orig;
      g[name]=(...args)=>{
        let ret,err;
        const ser=this.recSerialize(args);
        try{ret=orig(...args)}catch(e){err=String(e&&e.message||e);try{this.recPush('api:'+name+':err',{args:ser,error:err})}catch{}throw e}
        try{this.recPush('api:'+name,{args:ser,ret:ret===undefined?null:(typeof ret==='object'?this.recSerialize(ret):ret)})}catch{}
        return ret;
      };
    }
    // Hook g.act nếu có — bắt mọi action nội bộ
    if(typeof g.act==='function'&&!this.rec.hooks.act){
      const origAct=g.act.bind(g);
      this.rec.hooks.act=origAct;
      g.act=(fn,label)=>{
        try{this.recPush('api:act',{label:label||null,fn:String(fn).slice(0,80)})}catch{}
        return origAct(fn,label);
      };
    }
    // Subscribe state — diff đầy đủ hơn
    try{
      this.rec.unsub=g.store?.subscribe?.(()=>{
        if(!this.rec.on)return;
        const cur=this.recSnap();
        const prev=this.rec.lastSnap||{};
        const diffs=[];
        const keys=['viTri','oNoi','thuongThe','nodeEnc','sanYeuLeft','huntBlock','thongBaoDai'];
        for(const k of keys){
          const a=prev[k],b=cur[k];
          if(JSON.stringify(a)!==JSON.stringify(b))diffs.push([k,a,b]);
        }
        if((prev.active?.id||null)!==(cur.active?.id||null)||(prev.active?.waiting||null)!==(cur.active?.waiting||null)||(prev.active?.done||null)!==(cur.active?.done||null))
          diffs.push(['active',prev.active||null,cur.active||null]);
        if(JSON.stringify(prev.tran)!==JSON.stringify(cur.tran))diffs.push(['tran',prev.tran||null,cur.tran||null]);
        if(JSON.stringify(prev.bienCo)!==JSON.stringify(cur.bienCo))diffs.push(['bienCo',prev.bienCo||null,cur.bienCo||null]);
        if(JSON.stringify(prev.thongBao)!==JSON.stringify(cur.thongBao))diffs.push(['thongBao',prev.thongBao||null,cur.thongBao||null]);
        // noiActs id list đổi
        const pa=A(prev.noiActs).map(x=>x.id).join(','),ca=A(cur.noiActs).map(x=>x.id).join(',');
        if(pa!==ca)diffs.push(['noiActs',A(prev.noiActs).map(x=>x.id),A(cur.noiActs).map(x=>x.id)]);
        // choices text
        const pc=A(prev.choices).map(c=>c.index+':'+c.text).join('|'),cc=A(cur.choices).map(c=>c.index+':'+c.text).join('|');
        if(pc!==cc)diffs.push(['choices',A(prev.choices),A(cur.choices)]);
        if(diffs.length)this.recPush('state',diffs);
        this.rec.lastSnap=cur;
      });
    }catch(e){this.recPush('warn','subscribe: '+(e.message||e))}
    toast('Đang ghi đầy đủ thao tác game — xong bấm Dừng ghi + Xuất ghi','ok',4500);
    this.push('Ghi hành động: BẬT (full)','ok');
    if(ui.isOpen&&ui.tab==='auto')VIEWS.auto();
  },
  stopRecord(){
    if(!this.rec.on&&!this.rec.hooks)return;
    const n=this.rec.events.length;
    this.rec.events.push({
      t:new Date().toISOString(),
      tShow:new Date().toLocaleTimeString('vi-VN',{hour12:false}),
      kind:'record_stop',detail:'Dừng ghi · '+n+' sự kiện',snap:this.recSnap(),extra:null
    });
    this.rec.on=false;
    if(this.rec.hooks){
      for(const [name,orig] of Object.entries(this.rec.hooks)){
        try{g[name]=orig}catch{}
      }
      this.rec.hooks=null;
    }
    try{this.rec.unsub?.()}catch{}
    this.rec.unsub=null;
    toast('Đã dừng ghi ('+this.rec.events.length+' sự kiện). Bấm Xuất ghi để tải file.','ok',4000);
    this.push('Ghi hành động: TẮT · '+this.rec.events.length+' events','ok');
    if(ui.isOpen&&ui.tab==='auto')VIEWS.auto();
  },
  exportRecord(){
    // Tóm tắt để inspect nhanh
    const apis={},acts={},slots={},choices=[];
    for(const e of this.rec.events){
      if(String(e.kind).startsWith('api:')){
        const k=e.kind;
        apis[k]=(apis[k]||0)+1;
        const args=e.detail?.args;
        if(k==='api:chooseActivity'&&args?.[0])acts[args[0]]=(acts[args[0]]||0)+1;
        if(k==='api:enterNode'&&args?.[0])slots[args[0]]=(slots[args[0]]||0)+1;
        if(k==='api:choose'){
          const idx=args?.[0];
          const ch=A(e.snap?.choices).find(c=>c.index===idx);
          choices.push({idx,text:ch?.text||null,risk:ch?.risk||null,active:e.snap?.active?.id||null,viTri:e.snap?.viTri});
        }
      }
    }
    const payload={
      build:BUILD,
      at:new Date().toISOString(),
      kind:'autofarm-action-record',
      note:'Full record: mọi API game + diff state (noiActs, choices, combat, bag thuốc…)',
      count:this.rec.events.length,
      summary:{
        apiCounts:apis,
        chooseActivityCounts:acts,
        enterNodeCounts:slots,
        chooses:choices.slice(0,80)
      },
      endSnap:this.recSnap(),
      events:this.rec.events
    };
    const text=JSON.stringify(payload,null,2);
    try{
      const blob=new Blob([text],{type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`autofarm-record-${Date.now()}.json`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),20_000);
    }catch{}
    try{navigator.clipboard?.writeText?.(text)}catch{}
    toast('Đã tải + copy bản ghi ('+this.rec.events.length+' sự kiện)','ok',3500);
    this.push('Xuất bản ghi hành động ('+this.rec.events.length+')','ok');
  },
  exportLog(){
    const payload={
      build:BUILD,
      at:new Date().toISOString(),
      note:'Log auto đầy đủ: mỗi dòng có snap (noiActs, choices+risk, active, sanYeuLeft, gains) giống hướng ghi tay',
      state:this.dumpState('export'),
      gains:this.gainsDelta(),
      gainsBase:this.gainsBase||null,
      log:this.log,
      record:this.rec.events.slice(-200)
    };
    const text=JSON.stringify(payload,null,2);
    try{
      const blob=new Blob([text],{type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`autofarm-log-${Date.now()}.json`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),20_000);
    }catch{}
    try{navigator.clipboard?.writeText?.(text)}catch{}
    toast('Đã tải + copy log AutoFarm','ok',3200);
    this.push('Đã export log ('+this.log.length+' dòng)');
  },
  refreshLogOnly(){
    if(!ui.isOpen||ui.tab!=='auto')return;
    const el=$(body,'#af-log');if(!el)return;
    el.innerHTML=this.log.slice().reverse().map(x=>{
      const k=x.kind||'';
      const cls=k==='err'?' r':k==='ok'?' g':k==='dbg'?'':'';
      const t=x.tShow||x.t||'';
      return `<div class="sub${cls}">[${E(t)}]${k?` <b>${E(k)}</b>`:''} ${E(x.msg)}</div>`;
    }).join('')||'<div class="sub">Chưa có nhật ký.</div>';
    const st=$(body,'#af-stats');
    if(st)st.textContent=`OK ${this.stats.ok} · bỏ ${this.stats.skip} · lỗi ${this.stats.err} · chữa ${this.stats.heal||0}${this.running?(this.paused?' · TẠM DỪNG':' · ĐANG CHẠY'):''}`;
    this.syncGainsBar?.();
  },

  /* ── Thương thế & chữa trị ── */
  /* ── Ngân sách thọ nguyên: mỗi bước đi tốn năm; cạn thọ = hết kiếp ── */
  lifeLeft(){
    try{
      const nv=me();
      const k=window.tuTien?.core?.['character/character'];
      let life=null;
      if(k&&typeof k.thoNguyenToiDa==='function')life=k.thoNguyenToiDa(nv);
      else if(N(nv.thoNguyenToiDa))life=+nv.thoNguyenToiDa;
      if(!N(life)||!N(nv.tuoi))return null;
      return life-nv.tuoi;
    }catch{return null}
  },
  avoidList(){
    return String(this.opts.avoidBeasts||'').split(/[,;\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
  },
  minLife(){return Math.max(0,Number(this.opts.minLifeYears)||0)},
  /* Đi quãng travel (năm) có còn đủ thọ dự phòng không */
  affordable(travel){
    const lf=this.lifeLeft();
    if(lf==null)return true;
    return lf-(N(travel)?+travel:0)>this.minLife();
  },
  /* Có thể săn yêu thật tại ô này không (thành/thôn mặc định báo 3 lượt nhưng KHÔNG có act săn) */
  canHuntHere(slot){
    slot=slot||run().viTri;
    if(this.sanYeuLeft(slot)<=0)return false;
    const b=slot===run().viTri?this.huntBlockedHere():null;
    if(b&&/săn cạn|hoang dã|lần theo dấu/i.test(String(b)))return false;
    if(this.isNoiChon(slot)||placeDef(slot)){
      return slot===run().viTri&&this.inPlace()&&!!this.placeActs().find(a=>a&&a.id==='ev.san_yeu'&&!a.lockedReason);
    }
    return true;
  },
  /* Ở lại săn nốt, có giới hạn thử để không đứng yên vô hạn */
  tryStayHunt(here,left){
    const key=here+'|'+left+'|'+nowYear().toFixed(3);
    if(this._stayKey===key){
      if(++this._stayN>=4){
        this._stayKey=null;this._stayN=0;
        this.push('Săn tại chỗ không tiến triển → bỏ ô '+here,'dbg');
        this.banSlot(here,this.huntRecoveryYears());
        return false;
      }
    }else{this._stayKey=key;this._stayN=0}
    try{g.reopenPlace?.()}catch{}
    try{
      if(!run().active){g.chooseActivity?.('ev.san_yeu');this._lastEncAtPlace='ev.san_yeu';this._doneHere=true;this._pendingNode={slot:here,enc:'ev.san_yeu',at:Date.now()}}
    }catch(e){this.push('stay hunt: '+(e.message||e),'dbg')}
    this.push('Ở lại săn nốt · còn '+left,'dbg');
    return true;
  },
  injuryLevel(){return Math.max(0,Math.min(3,Number(me().thuongThe||0)))},
  injuryName(lv){return ['Lành lặn','Thương nhẹ','Thương nặng','Trọng thương'][Math.max(0,Math.min(3,lv|0))]||'?'},
  itemHealPower(it){
    if(!it)return 0;
    let t=0;
    for(const e of A(it.dung)){
      if(typeof e?.thuong_the==='number')return 0;
      if(typeof e?.heal==='number')t+=e.heal;
    }
    return t;
  },
  healTooWeakSafe(nv,it){
    if(!it)return true;
    try{
      const core=window.tuTien?.core||{};
      const fn=core['kernel/effects']?.healTooWeak||core['index']?.healTooWeak;
      if(typeof fn==='function')return !!fn(nv,it);
    }catch{}
    const slack=Number(it.canh_gioi);
    return Number.isFinite(slack)&&nv.canhGioi>slack+1;
  },
  pickHealItem(){
    const nv=me(),need=this.injuryLevel();
    if(need<=0)return null;
    /* Ưu tiên hàm chọn đan của chính game (core/character/heal_item): đã tính sẵn cảnh giới đan, đan vô dụng, rẻ nhất đủ chữa */
    try{
      const hi=window.tuTien?.core?.['character/heal_item'];
      if(hi&&typeof hi.pickHealItem==='function'){
        const p=hi.pickHealItem(nv,C.items,'cheapest',run().flags||nv.flags||{});
        if(p&&p.id&&(nv.tuiDo?.[p.id]||0)>0&&!this.healTooWeakSafe(nv,C.items?.get?.(p.id))){
          const it=C.items?.get?.(p.id);
          return{id:p.id,heal:Number(p.heal)||1,gia:Number(it?.gia||0),ten:T(it?.ten||p.id)};
        }
      }
    }catch{}
    const bag=nv.tuiDo||{};
    const cand=[];
    for(const [id,qty] of Object.entries(bag)){
      if(!(qty>0))continue;
      const it=C.items?.get?.(id);
      const heal=this.itemHealPower(it);
      if(heal<=0)continue;
      // Đan yếu hơn cảnh giới (kể cả luật đạo lộ, vd. Nghịch Thiên cần đan cao hơn một bậc) — dùng đúng hàm của game
      if(this.healTooWeakSafe(nv,it))continue;
      cand.push({id,heal,gia:Number(it.gia||0),ten:it.ten||id});
    }
    if(!cand.length)return null;
    // Ưu tiên đủ chữa hết, rẻ nhất; không đủ thì heal cao nhất
    const full=cand.filter(x=>x.heal>=need).sort((a,b)=>a.gia-b.gia||a.id.localeCompare(b.id));
    if(full.length)return full[0];
    return cand.sort((a,b)=>b.heal-a.heal||a.gia-b.gia)[0];
  },
  tryHeal(reason){
    if(!this.opts.autoHeal)return 'off';
    const lv=this.injuryLevel();
    const min=Math.max(1,Number(this.opts.healMinLevel||1));
    if(lv<min)return 'ok';
    if(run().active||run().tran||run().bienCo)return 'busy';
    const pick=this.pickHealItem();
    if(!pick){
      if(!this._noHealAt||Date.now()-this._noHealAt>15000){this._noHealAt=Date.now();this.push(`Thương thế: ${this.injuryName(lv)} — túi không có đan chữa dùng được`,'err',{reason})}
      if(this.opts.pauseIfNoHeal&&lv>=2){
        this.paused=true;this.syncFab();
        toast('Auto tạm dừng: bị '+this.injuryName(lv)+' mà không có thuốc','',4000);
        return 'no-item-pause';
      }
      return 'no-item';
    }
    try{
      if(typeof g.useItem!=='function')throw new Error('Không có useItem');
      g.useItem(pick.id);
      this.stats.heal=(this.stats.heal||0)+1;
      const after=this.injuryLevel();
      this.push(`Chữa thương: ${pick.ten} (−${pick.heal}) · còn ${this.injuryName(after)}`,'ok',{reason,before:lv,after});
      return after>0?'partial':'healed';
    }catch(e){
      this.push('useItem chữa lỗi: '+(e.message||e),'err');
      return 'err';
    }
  },
  ensureHealthy(beforeFight){
    let guard=0;
    while(this.injuryLevel()>=Math.max(1,Number(this.opts.healMinLevel||1))&&guard++<4){
      const st=this.tryHeal(beforeFight?'pre-fight':'tick');
      if(st==='healed'||st==='ok'||st==='off')break;
      if(st==='no-item-pause'||st==='busy'||st==='err'||st==='no-item')return st;
      if(st==='partial')continue;
      break;
    }
    const lv=this.injuryLevel();
    // Trọng thương: không nên đánh tiếp
    if(lv>=3){
      this.push('Trọng thương — tạm dừng để tránh tử vong','err');
      this.paused=true;this.syncFab();
      toast('Auto tạm dừng: Trọng thương','',3500);
      return 'critical';
    }
    // Thương nặng trước trận → cảnh báo, vẫn cho đánh nếu user tắt pause
    if(beforeFight&&lv>=2&&this.opts.pauseIfNoHeal&&!this.pickHealItem()){
      this.push('Thương nặng + hết thuốc — tạm dừng','err');
      this.paused=true;this.syncFab();
      return 'no-item-pause';
    }
    return 'ok';
  },

  /* ── Mục tiêu farm ── */
  nearSlots(){
    const r=run(),here=r.viTri,out=[];
    const R=Number(this.opts.radiusWorld)||55;
    try{
      const slots=A(W.slots);
      for(const s of slots){
        const id=s?.id||s;if(!id)continue;
        let d=NaN;
        try{d=milesTo(id)}catch{}
        if(id===here||(N(d)&&d<=R)||explored(id))out.push(typeof s==='object'?s:{id});
      }
    }catch{
      for(const id of A(r.daKhamPha))out.push({id});
      if(here)out.push({id:here});
    }
    // Ưu tiên đã khám phá + gần
    const uniq=new Map();
    for(const s of out){const id=s?.id||s;if(id)uniq.set(id,s)}
    return [...uniq.values()];
  },
  isNoiChon(slot){
    try{
      if(run().noiChon?.[slot]?.chuNhan)return true;
      const i=info(slot),loai=i?.diaDanh?.loai;
      if(loai&&!/hoang_da|son_thuy|bien|rung/i.test(String(loai))&&placeDef(slot))return true;
    }catch{}
    return false;
  },
  sanYeuLeft(slot){
    try{
      // Game: kp=3, FZ=2; used=cp = max(0, n[0]-(nam-n[1])/FZ); left=max(0,floor(kp-cp))
      // Chưa săn lần nào (row null) → used=0 → còn 3 lần (không phải 0)
      const KP=3,FZ=2;
      const r=run(),row=r.sanYeu?.[slot];
      if(row==null)return KP;
      let used=0;
      if(Array.isArray(row)){
        const c=Number(row[0])||0, y=Number(row[1])||0;
        used=Math.max(0,c-(Number(r.nam||0)-y)/FZ);
      }else if(typeof row==='object'){
        used=Number(row.lan||row[0]||0);
      }else{
        used=Number(row)||0;
      }
      return Math.max(0,Math.floor(KP-used));
    }catch{return 0}
  },
  huntBlockedHere(){
    try{
      if(typeof g.targetHuntBlock==='function'){
        const b=g.targetHuntBlock();
        if(b)return String(b);
      }
    }catch(e){return String(e.message||e)}
    if(this.sanYeuLeft(run().viTri)<=0)return 'Yêu thú quanh đây đã bị săn cạn';
    return null;
  },
  listHuntBeasts(){
    // Ưu tiên API huntTargets (đúng game); fallback placeInfo.beasts
    let list=[];
    try{
      if(typeof g.huntTargets==='function')list=A(g.huntTargets());
    }catch{}
    if(!list.length){
      try{
        const pi=typeof g.placeInfo==='function'?g.placeInfo():null;
        list=A(pi?.beasts);
      }catch{}
    }
    return list.map(b=>({id:b.id||b,ten:b.ten||b.id||b,chance:b.chance,local:b.local,raw:b}));
  },
  encDef(id){
    try{return C.encounters?.get?.(id)||null}catch{return null}
  },
  /* Farm theo content source (kind/tags/nhom/choices) — mọi loại sự kiện, không chỉ săn yêu */
  isFarmEncounter(id){
    const s=String(id||'');
    if(!s)return false;
    if(s==='ev.san_yeu')return true;
    if(this.opts.onlySanYeu)return false;
    if(this.isNonFarmEnc(s))return false;
    // Tông môn tuyển đồ — không tham gia
    if(/tuyen_do|tuyen_do_de|tuyen_de|nhap_mon|nhan_do_de/i.test(s))return false;
    const def=this.encDef(s);
    if(def){
      const kind=String(def.kind||'');
      const tags=def.tags||{};
      const tc=Array.isArray(tags.tinh_chat)?tags.tinh_chat.join(' '):String(tags.tinh_chat||'');
      const nhom=String(def.nhom||'');
      const ten=String(def.ten||'');
      const blob=(tc+' '+nhom+' '+s+' '+ten).toLowerCase();
      // Cửa hàng / tu luyện / đột phá / tông môn nội bộ — không farm ngoài
      if(kind==='cua_hang'||kind==='tu_luyen'||kind==='dot_pha')return false;
      if(kind==='tong_mon'&&this.isSectExcluded(s))return false;
      if(/song_bac|dau_gia|cho_vay|vay_no/.test(blob))return false;
      // Phế tích chỉ để lập động phủ
      if(/phe_tich|lap_dong_phu|khai_phu/.test(blob))return false;
      // Tuyển đồ / nhận đệ tử tông môn
      if(/tuyển đồ|tuyen do|nhận đệ|nhap mon|nhập môn/.test(blob))return false;
      // Chiến đấu / bí cảnh — luôn farm
      if(kind==='chien_dau'||kind==='bi_canh')return true;
      // Sự kiện thành/thôn/hoang dã: nhận, trừ các loại đã loại ở trên
      if(kind==='su_kien'){
        const chs=A(def.choices);
        // Chỉ còn Rời đi + lập phủ → bỏ
        const meaningful=chs.filter(c=>A(c&&c.effects).length>0);
        if(meaningful.length&&meaningful.every(c=>A(c.effects).some(e=>e&&e.lap_dong_phu)))return false;
        return true;
      }
      // Loại khác có choices/effects → thử
      if(A(def.choices).length)return true;
      return false;
    }
    // Không có def: heuristic an toàn — săn/đối đầu/trừ/treo thưởng/di tích…
    return /san_yeu|doi_dau|tru_|cuop|tan_tu|treo|di_tich|di_bao|than_thu|bao_|oan_|hd_|bc_|dc_|tt_|tham_hiem|su_kien/i.test(s)
      && !/tuyen_do|cua_hang|cho_|dau_gia|song_bac|lap_dong/i.test(s);
  },
  SKIP_PLACE_ACTS:new Set([
    'ev.khai_phu','ev.tiem_tap_hoa','ev.bang_treo_thuong','ev.tra_lau_nghe_tin','ev.khach_diem',
    'ev.tham_ban_cu','ev.public_teleport','ev.hoc_duong_tang_thu','ev.dau_gia_hanh','ev.bc_ung_van_phong',
    'ev.bc_ung_kiem_phoi','ev.lr_lo_ren','ev.co_tu_thien_duong','ev.bc_ung_te_khi','ev.mieu_tho_thap_huong',
    'ev.bc_thu_mua_hang_xa','ev.tinh_that_thue','ev.tram_dich_quay','ev.the_gia_phu_de','ev.hop_hoan_lau_huong_phong',
    'ev.van_bao_phan_hoi_ngoai','ev.phuong_thi_cho_tu_si','ev.kl_sap_tho_khoi','ev.kl_lau_co_quan',
    'ev.dau_gia_hoi','ev.dau_gia_lau','ev.song_bac_chieu_bac','ev.cd_an_tuc_phuong','ev.cd_hac_thi',
    'ev.cung_duong_dao_quan','ev.cung_duong_cao_tang'
  ]),
  /* Không farm: đấu giá, sòng bạc, cúng dường, tiện ích xã hội — không tăng tu vi/tài nguyên farm */
  /* Loại trừ theo yêu cầu: Tông môn tuyển đồ, Tông môn đại bỉ, Công phá sơn môn (chỉ theo id/tên) */
  isSectExcluded(id){
    const s=String(id||'');
    if(/tuyen_do|tuyen_de|nhap_mon|nhan_do_de|dai_bi|cong_pha|pha_son_mon|cong_son_mon|son_mon_dai/i.test(s))return true;
    try{
      const ten=String(C.encounters?.get?.(s)?.ten||'');
      if(/tuyển đồ|tuyển đệ|nhận đệ tử|nhập môn|đại bỉ|công phá|phá sơn môn|công sơn môn/i.test(ten))return true;
    }catch{}
    return false;
  },
  /* Không farm: cửa hàng/tiện ích mua bán, đấu giá, sòng bạc, cúng dường, vay nợ + 3 loại sự kiện tông môn.
     Mọi sự kiện khác (Chuyện lớn / Thời thế / Trước mắt) đều làm — pickChoice tự né lựa chọn tốn tài nguyên. */
  isNonFarmEnc(id){
    const s=String(id||'');
    if(!s)return false;
    if(this.isSectExcluded(s))return true;
    if(this.SKIP_PLACE_ACTS.has(s))return true;
    try{
      const k=String(C.encounters?.get?.(s)?.kind||'');
      if(k==='cua_hang'||k==='tu_luyen'||k==='dot_pha')return true;
    }catch{}
    return /dau_gia|song_bac|cung_duong|thap_huong|teleport|khach_diem|tra_lau|tinh_that|hoc_duong|an_tuc|hac_thi|lau_co_quan|tiem_tap|bang_treo|khai_phu|lo_ren|cho_vay|vay_no|tin_dung|thue_do|thinh_cang|thu_mua|thuong_hoi|van_bao_phan_hoi/i.test(s);
  },
  isFarmPlaceAct(act){
    if(!act||act.lockedReason)return false;
    const id=String(act.id||'');
    if(!id||this.isNonFarmEnc(id))return false;
    if(this.isActBanned(run().viTri,id))return false;
    // Phế tích / khai động phủ — không phải farm tài nguyên
    if(/phe_tich|lap_dong_phu|khai_phu/i.test(id))return false;
    if(this.opts.onlySanYeu)return id==='ev.san_yeu';
    const loai=String(act.loai||'');
    if(id==='ev.san_yeu'){
      if(this.sanYeuLeft(run().viTri)<=0)return false;
      const b=this.huntBlockedHere();
      if(b&&/săn cạn|hoang dã|lần theo dấu/i.test(String(b)))return false;
      return this.placeActs().some(a=>a&&a.id==='ev.san_yeu'&&!a.lockedReason);
    }
    if(/hai_thuoc|thuoc_dai/i.test(id)&&!this.opts.includeHaiThuoc)return false;
    // su_kien / overlay / the_cuc / chien_dau / tien_ich tại chỗ → theo content
    // Chuyện lớn (overlay) / Thời thế (the_cuc) / Trước mắt (su_kien): làm tất cả trừ tông môn tuyển đồ/đại bỉ/công phá & vay nợ/đấu giá…
    if(loai==='su_kien'||loai==='the_cuc'||loai==='overlay'){
      return !this.isNonFarmEnc(id);
    }
    // Tiện ích: chỉ việc nghỉ chân/hoạt động (hd_*); cửa hàng, trà lâu, đấu giá… bỏ
    if(loai==='tien_ich')return /^ev\.hd_/i.test(id);
    return this.isFarmEncounter(id);
  },
  placeFarmActs(){
    // Pattern farm tay: sự kiện/overlay tại chỗ trước → săn yêu đến hết lượt → tiện ích khác
    const acts=this.placeActs().filter(a=>this.isFarmPlaceAct(a));
    const rank=a=>{
      const id=String(a.id||''), l=String(a.loai||'');
      if(l==='overlay'||l==='su_kien')return 0;
      if(l==='the_cuc')return 1;
      if(id==='ev.san_yeu')return 2;
      if(l==='tien_ich'&&/hai_thuoc|thuoc_dai/i.test(id))return 9;
      if(l==='tien_ich')return 4;
      return 5;
    };
    return acts.sort((a,b)=>rank(a)-rank(b)||String(a.id).localeCompare(String(b.id)));
  },
  goEnter(slot){
    if(!slot)return false;
    try{
      // Không enter chỗ khác khi còn encounter/trận
      if(run().active||run().tran){
        this.push('Chưa enter — đang bận encounter/trận','dbg');
        return false;
      }
      if(typeof g.enterNode!=='function')throw new Error('Không có enterNode');
      g.enterNode(slot);
      this._doneHere=false;this._stayKey=null;this._stayN=0;this._visitActs=Object.create(null);
      this.push('enterNode('+slot+')','ok');
      return true;
    }catch(e){
      this.push('enterNode fail: '+(e.message||e),'err');
      return false;
    }
  },

  nodeEncounterSample(limit=15){
    const r=run(),out=[];
    for(const [key,node] of Object.entries(r.nodes||{})){
      if(!node?.encounter||node.viec)continue;
      out.push({key,slot:node.slot||key,enc:node.encounter});
      if(out.length>=limit)break;
    }
    return out;
  },
  // Việc treo thưởng / nhiệm vụ ngắn hạn trên map (biến mất ~5 năm)
  urgentJobTargets(maxY){
    const r=run(),out=[];
    const pushJob=(slot,enc,title,hetHan,mode,basePri)=>{
      if(!slot||!hasSlot(slot)||this.isSlotBanned(slot))return;
      const left=N(hetHan)?+hetHan-nowYear():null;
      if(left!==null&&left<0)return; // đã hết hạn
      if(left!==null&&left>8)return; // còn lâu — không ưu tiên gấp
      const travel=travelTo(slot);
      if(N(travel)&&travel>maxY&&slot!==r.viTri)return;
      const dg=danger(slot);
      if(this.opts.skipTuDia&&dg.rank>=3&&slot!==r.viTri)return;
      // Ưu tiên: sắp hết hạn (≤2 năm) rất cao
      let pri=basePri;
      if(left!==null){
        if(left<=0.5)pri=120;
        else if(left<=2)pri=90-left*8;
        else if(left<=5)pri=55-left*3;
        else pri=35;
      }
      out.push({
        slot,enc:enc||'job',title:T(title||enc||'Việc bản đồ'),
        travel,miles:milesTo(slot),danger:dg,
        left,mode:mode||(enc?'node':'enter'),priority:pri,hetHanNam:hetHan??null
      });
    };
    // Việc nhận (treo thưởng / nhiệm vụ)
    for(const v of A(r.viecNhan)){
      if(!v||!v.slot)continue;
      pushJob(v.slot, v.enc||null, v.ten||C.encounters?.get?.(v.enc)?.ten||'Việc treo thưởng', v.hetHanNam, v.enc?'node':'enter', 50);
    }
    // Node bản đồ có hạn (hetHanNam) — sự kiện thành/thôn/hoang dã sắp hết
    for(const [key,node] of Object.entries(r.nodes||{})){
      if(!node?.encounter||node.viec)continue;
      const slot=node.slot||key;
      const enc=node.encounter;
      if(!this.isFarmEncounter(enc))continue;
      if(this.isNodeBanned(slot,enc))continue;
      const het=node.hetHanNam;
      if(!N(het))continue; // chỉ việc có hạn mới vào nhóm gấp
      const def=C.encounters?.get?.(enc);
      pushJob(slot, enc, def?.ten||enc, het, 'node', 45);
    }
    return out;
  },
  targets(){
    const r=run(),out=[],seen=new Set();
    const boost=Math.min(3,Math.floor((this.emptyScans||0)/3));
    let maxY=(N(this.opts.radiusYears)?+this.opts.radiusYears:0.18)*(1+boost*0.55);
    {const lf=this.lifeLeft();if(lf!=null)maxY=Math.max(0,Math.min(maxY,lf-this.minLife()))}
    const near=this.nearSlots();
    const isBanned=s=>this.isSlotBanned(s);

    // 1) Việc sắp hết hạn — ưu tiên cao
    if(!this.opts.onlySanYeu){
      for(const t of this.urgentJobTargets(maxY)){
        const key=t.slot+'|job|'+(t.enc||'');
        if(seen.has(key))continue;
        seen.add(key);
        out.push(t);
      }
    }

    for(const s of near){
      const slot=s?.id||s;if(!slot||!hasSlot(slot))continue;
      if(isBanned(slot))continue;
      const travel=travelTo(slot);
      if(N(travel)&&travel>maxY&&slot!==r.viTri)continue;
      const node=r.nodes?.[slot];
      const dg=danger(slot);
      if(this.opts.skipTuDia&&dg.rank>=3&&slot!==r.viTri)continue;

      // 2) Node combat/săn trên map
      if(this.opts.includeMapNodes!==false&&node?.encounter&&!node.viec){
        const enc=node.encounter,id=String(enc);
        if(this.isFarmEncounter(id)){
          const isSan=id==='ev.san_yeu';
          if(!(isSan&&this.sanYeuLeft(slot)<=0)){
            const key=slot+'|'+id;
            if(!seen.has(key)){
              seen.add(key);
              const encDef=C.encounters?.get?.(enc);
              if(this.isNodeBanned(slot,id))continue;
              {
                const het=node.hetHanNam;
                const yearsLeft=N(het)?+het-nowYear():null;
                let pri=isSan?28:32;
                if(yearsLeft!==null){
                  if(yearsLeft<=0.5)pri=110;
                  else if(yearsLeft<=2)pri=70;
                  else if(yearsLeft<=5)pri=45;
                }
                out.push({slot,enc,title:T(encDef?.ten||enc),travel,miles:milesTo(slot),danger:dg,left:isSan?this.sanYeuLeft(slot):yearsLeft,mode:'node',priority:pri,hetHanNam:het??null});
              }
            }
          }
        }
      }

      // 3) Hoang dã: săn yêu còn lượt — chỉ ô đã khám hoặc rất gần
      if(this.opts.includeWildSan!==false){
        if(!this.isNoiChon(slot)){
          const left=this.sanYeuLeft(slot);
          const mi=milesTo(slot);
          const known=explored(slot)||slot===r.viTri||(N(mi)&&mi<=18);
          if(left>0&&known){
            const key=slot+'|ev.san_yeu';
            if(!seen.has(key)){
              seen.add(key);
              out.push({slot,enc:'ev.san_yeu',title:'Săn yêu (hoang dã)',travel,miles:mi,danger:dg,left,mode:'doAction',priority:28});
            }
          }
        }
      }

      // 4) Săn thú tại chỗ đang đứng — chỉ khi còn lượt & không bị block
      if(!this.opts.onlySanYeu&&this.opts.includePlaceActs&&slot===r.viTri){
        const block=this.huntBlockedHere();
        if(!block){
          for(const b of this.listHuntBeasts()){
            const id=b.id;
            if(this.isBeastBanned(slot,id))continue;
            if(this.avoidList().some(n=>String(T(b.ten||id)).toLowerCase().includes(n)))continue;
            const key=slot+'|hunt|'+id;
            if(seen.has(key))continue;
            seen.add(key);
            // Ưu tiên thấp hơn việc gấp / node map; cao hơn một chút so với hoang dã xa
            out.push({slot,enc:String(id),title:T(b.ten||id),travel:0,miles:0,danger:dg,left:this.sanYeuLeft(slot),mode:'hunt',priority:28,beast:b});
          }
        }
      }
    }

    // 5) Mọi node encounter trên run.nodes trong bán kính năm (không chỉ nearSlots)
    if(this.opts.includeMapNodes!==false){
      for(const [key,node] of Object.entries(r.nodes||{})){
        if(!node?.encounter||node.viec)continue;
        const slot=node.slot||key;
        if(!hasSlot(slot))continue;
        if(isBanned(slot))continue;
        const enc=node.encounter,id=String(enc);
        if(!this.isFarmEncounter(id))continue;
        const travel=travelTo(slot);
        if(N(travel)&&travel>maxY&&slot!==r.viTri)continue;
        const dg=danger(slot);
        if(this.opts.skipTuDia&&dg.rank>=3&&slot!==r.viTri)continue;
        const isSan=id==='ev.san_yeu';
        if(isSan&&this.sanYeuLeft(slot)<=0)continue;
        if(this.isNodeBanned(slot,id))continue;
        const k=slot+'|'+id;
        if(seen.has(k))continue;
        seen.add(k);
        const encDef=C.encounters?.get?.(enc);
        // Node "Chuyện lớn" (overlay) ưu tiên thấp hơn săn hoang dã — tránh kẹt menu nơi
        {
                const het=node.hetHanNam;
                const yearsLeft=N(het)?+het-nowYear():null;
                let pri=isSan?28:32;
                if(yearsLeft!==null){
                  if(yearsLeft<=0.5)pri=110;
                  else if(yearsLeft<=2)pri=70;
                  else if(yearsLeft<=5)pri=45;
                }
                out.push({slot,enc,title:T(encDef?.ten||enc),travel,miles:milesTo(slot),danger:dg,left:isSan?this.sanYeuLeft(slot):yearsLeft,mode:'node',priority:pri,hetHanNam:het??null});
              }
      }
    }

    // 6) Nơi chốn gần (thôn/trấn/di tích…) — vào check hoạt động, không chỉ săn hoang dã
    if(!this.opts.onlySanYeu&&this.opts.includeNearPlaces!==false){
      for(const s of near){
        const slot=s?.id||s;if(!slot||!hasSlot(slot)||slot===r.viTri)continue;
        if(isBanned(slot))continue;
        if(!this.isNoiChon(slot)&&!placeDef(slot))continue;
        const travel=travelTo(slot);
        if(N(travel)&&travel>maxY)continue;
        const dg=danger(slot);
        if(this.opts.skipTuDia&&dg.rank>=3)continue;
        const key=slot+'|visit';
        if(seen.has(key))continue;
        seen.add(key);
        const title=T(info(slot)?.diaDanh?.ten||slotLabel(slot)||slot);
        const leftHere=this.sanYeuLeft(slot);
        const hasNode=!!(r.nodes?.[slot]?.encounter);
        // Ghé thôn/trấn/thành/di tích — cạnh tranh được với săn khi gần hơn
        // Visit trống (không node farm) — ưu tiên thấp, chỉ để quét su_kien gần
        let pri=8;
        if(hasNode)pri=26;
        else if(this.isNoiChon(slot)||placeDef(slot))pri=12;
        out.push({slot,enc:hasNode?r.nodes[slot].encounter:'visit',title:'Ghé '+title,travel,miles:milesTo(slot),danger:dg,left:null,mode:'visit',priority:pri});
      }
    }

    const here=r.viTri;
    const hereLeft=this.sanYeuLeft(here);
    const hereBlocked=!!this.huntBlockedHere();
    const preferNear=this.opts.preferNear!==false;
    const score=t=>{
      const pri=Number(t.priority||0);
      const mi=N(t.miles)?t.miles:(N(t.travel)?t.travel*8000:1e6);
      let modeBoost=0;
      if(t.mode==='doAction'||t.mode==='hunt')modeBoost=40;
      else if(t.mode==='node'||t.mode==='enter')modeBoost=28;
      else if(t.mode==='visit')modeBoost=8; // ghé thành/thôn gần — có thể có nhiệm vụ
      // Đang đứng chỗ còn lượt săn → ưu tiên tuyệt đối ở lại làm hết
      if(t.slot===here&&(t.mode==='doAction'||t.mode==='hunt')&&(t.left>0||hereLeft>0))modeBoost+=80;
      // preferNear: gần trước, nhưng việc farm (săn) vẫn thắng visit trống cùng khoảng cách
      if(preferNear)return -mi*50 + (pri+modeBoost)*3;
      return (pri+modeBoost)*1000 - mi;
    };
    // Luồng: nơi gần nhất → làm hết → blacklist → nơi gần nhất tiếp
    return out.sort((a,b)=>{
      if(a.slot===here&&a.mode==='hunt'&&hereBlocked)return 1;
      if(b.slot===here&&b.mode==='hunt'&&hereBlocked)return -1;
      // Đang đứng còn việc → xong tại chỗ trước khi đi nơi khác
      const aHere=a.slot===here&&(hereLeft>0||a.mode==='node'||a.mode==='doAction'||a.mode==='hunt')?0:1;
      const bHere=b.slot===here&&(hereLeft>0||b.mode==='node'||b.mode==='doAction'||b.mode==='hunt')?0:1;
      if(aHere!==bHere)return aHere-bHere;
      // Tầng ưu tiên: việc gấp (sắp hết hạn) > việc thật (săn/node) > ghé nơi trống
      const tier=t=>(Number(t.priority)>=70)?0:(t.mode==='visit'&&t.enc==='visit')?2:1;
      if(tier(a)!==tier(b))return tier(a)-tier(b);
      // Khoảng cách là chính (gần nhất trước)
      const ma=N(a.miles)?a.miles:(N(a.travel)?a.travel*8000:1e6);
      const mb=N(b.miles)?b.miles:(N(b.travel)?b.travel*8000:1e6);
      if(Math.abs(ma-mb)>0.5)return ma-mb;
      // Cùng khoảng cách: có săn/node trước visit trống
      const rank=t=>(t.mode==='doAction'||t.mode==='hunt')?0:t.mode==='node'||t.mode==='enter'?1:2;
      if(rank(a)!==rank(b))return rank(a)-rank(b);
      // Còn lượt săn nhiều hơn trước
      const la=N(a.left)?a.left:0, lb=N(b.left)?b.left:0;
      if(la!==lb)return lb-la;
      return score(b)-score(a);
    });
  },
  busy(){const r=run();return Boolean(r.active||r.tran||r.bienCo||r.thongBao||r.thongBaoDai)},
  chanceScore(ch){
    if(ch==null||ch==='')return 0.45;
    const s=String(ch);
    const m=s.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if(m)return Math.min(1,Math.max(0,parseFloat(m[1].replace(',','.'))/100));
    if(/dễ|de\b/i.test(s))return 0.85;
    if(/vừa\s*sức|vua\s*suc/i.test(s))return 0.55;
    if(/khó|kho\b/i.test(s))return 0.25;
    if(/phó mặc|pho mac|vận may/i.test(s))return 0.4;
    return 0.45;
  },
  riskLevel(c){
    const lv=c?.risk?.level;
    return lv?String(lv):'';
  },
  stripText(t){return String(t||'').replace(/[\uE000-\uF8FF]/g,'').replace(/<[^>]+>/g,'')},
  choiceSpendsResource(c){
    /* effects content: linh_thach.bac < 0 = trừ LT (source ht "linh_thach") */
    const out={linhThach:0,congHien:0,textHint:false,spends:false};
    try{
      const id=run().active?.id;
      const def=id?(C.encounters?.get?.(id)||this.encDef?.(id)):null;
      const raw=def&&A(def.choices)[c.index];
      if(raw){
        for(const sec of ['effects','success','partial','failure']){
          for(const eff of A(raw[sec])){
            if(!eff||typeof eff!=='object')continue;
            const lt=eff.linh_thach;
            if(lt!=null){
              const bac=typeof lt==='number'?lt:(lt.bac??lt.so??0);
              if(Number(bac)<0)out.linhThach+=Number(bac);
            }
            if(eff.cong_hien!=null){
              const v=typeof eff.cong_hien==='number'?eff.cong_hien:(eff.cong_hien.bac??eff.cong_hien.so??0);
              if(Number(v)<0)out.congHien+=Number(v);
            }
            if(eff.mua!=null)out.textHint=true;
            for(const k of ['tho_nguyen','thoNguyen','tho_nguyen_mat']){
              if(eff[k]!=null){const v=typeof eff[k]==='number'?eff[k]:(eff[k].nam??eff[k].so??0);if(Number(v)<0){out.thoNguyen=(out.thoNguyen||0)+Number(v);out.textHint=true}}
            }
          }
        }
      }
    }catch{}
    const t=this.stripText(c.text||'');
    if(/(nộp|nop|trả|tra|đưa|dua|thuê|thue|mãi lộ|mai lo|mua đường|cược|bồi thường|boi thuong).{0,28}(linh\s*thạch|lt\.)/i.test(t))out.textHint=true;
    if(/^(mua|trả|đặt cược|thuê)\b/i.test(t))out.textHint=true;
    if(/\{lt\./i.test(String(c.text||'')))out.textHint=true;
    if(/(hao|mất|đốt|hiến|trả giá|đổi).{0,14}(thọ nguyên|tuổi thọ|năm thọ)/i.test(t))out.textHint=true;
    out.spends=out.linhThach<0||out.congHien<0||out.textHint;
    return out;
  },
  pickChoice(choices){
    /* Gợi ý game (encounterView): available, risk (zgt), chance (Imt), thoat, phucHet.
       Ưu tiên: an_toan / dễ / có phần thưởng; thoát khi hết việc hoặc không an toàn. */
    const list=A(choices).filter(c=>c&&c.available!==false&&c.index!=null);
    if(!list.length)return null;
    const strip=t=>this.stripText(t).trim();
    const lv=c=>String(c?.risk?.level||c?.risk||'').toLowerCase();
    const isThoat=c=>{
      if(c.thoat===true)return true;
      const t=strip(c.text);
      return /^(đi|thôi|hủy|đóng|bỏ qua|rời|đi tiếp|đi qua|rời đi|lui ra|cáo từ|không mua|không nhận|để sau)\s*$/i.test(t);
    };
    const chanceOf=c=>{
      const ch=c.chance;
      if(ch==null)return null;
      if(typeof ch==='number')return ch;
      const s=String(ch).toLowerCase();
      if(s==='dễ'||s==='de')return 0.9;
      if(s.includes('vừa'))return 0.55;
      if(s==='khó'||s==='kho')return 0.2;
      if(s.includes('phó mặc')||s.includes('van may'))return 0.4;
      const n=parseFloat(String(ch).replace('%','').replace(',','.'));
      if(Number.isFinite(n))return n>1?n/100:n;
      return null;
    };
    const activeId=run().active?.id||'';
    let encKind='';
    try{encKind=String(C.encounters?.get?.(activeId)?.kind||'')}catch{}
    const isShop=encKind==='cua_hang'||this.isNonFarmEnc(activeId);

    // Cửa hàng / non-farm: thoát ngay
    if(isShop){
      const esc=list.find(isThoat)||list.find(c=>c.thoat);
      if(esc){this.push('Rời chỗ không farm → '+strip(esc.text),'ok');return esc}
    }

    // Lọc bỏ tử địa / hiểm nếu còn lựa chọn khác
    let pool=list.slice();
    const notDead=pool.filter(c=>{
      const l=lv(c);
      if(this.opts.skipTuDia&&(l==='tu_dia'||l==='hiem'))return false;
      return true;
    });
    if(notDead.length)pool=notDead;

    // Có an_toan → chỉ chọn trong nhóm an_toan (gợi ý combat của game)
    const safe=pool.filter(c=>lv(c)==='an_toan');
    if(safe.length)pool=safe;
    else{
      // Không an_toan: bỏ ngang_suc nếu còn lựa chọn không combat
      const healthy=this.injuryLevel()===0;
      const soft=pool.filter(c=>!lv(c)||lv(c)==='ngang_suc');
      const noCombat=pool.filter(c=>!lv(c));
      const even=pool.filter(c=>lv(c)==='ngang_suc');
      // Chưa bị thương: ngang sức vẫn nhận (thưởng thường tốt hơn lui đi); đang bị thương: né
      if(healthy&&even.length)pool=pool.filter(c=>!lv(c)||lv(c)==='ngang_suc');
      else if(noCombat.length)pool=noCombat;
      else if(soft.length)pool=soft;
      else{
        const esc=list.find(isThoat);
        if(esc){this.push('Không an toàn → thoát','dbg');return esc}
      }
    }

    // Bỏ phucHet nếu còn cửa khác (duyên đã hết)
    const notHet=pool.filter(c=>!c.phucHet);
    if(notHet.length)pool=notHet;

    // Không chọn lựa chọn làm giảm tài nguyên (nộp/trả LT…)
    const free=pool.filter(c=>!this.choiceSpendsResource(c).spends);
    if(free.length)pool=free;
    else{
      const esc=list.find(isThoat);
      if(esc){this.push('Chỉ còn lựa chọn tốn tài nguyên → thoát','dbg');return esc}
    }

    // Né quái trong danh sách (vd. Bạch Hạc Linh: đánh bị trừ Khí Vận) — kể cả "Lùng con đầu đàn" của menu đó
    {
      const av=this.avoidList();
      if(av.length){
        const hit=c=>{const t=strip(c.text).toLowerCase();return av.some(n=>t.includes(n))};
        if(list.some(hit)){
          // Quái cần né xuất hiện ở ô này → bấm Thôi (không tốn lượt săn), rời ô và nhớ để không quay lại
          const esc=list.find(isThoat)||list.find(c=>c.thoat);
          if(esc){this._avoidReroll=true;this.push('Có quái cần né → Thôi, rời ô','dbg');return esc}
          const keep=pool.filter(c=>!hit(c));
          if(keep.length)pool=keep;
        }
      }
    }
    const scored=pool.map(c=>{
      let score=0;
      const l=lv(c);
      const ch=chanceOf(c);
      if(this.choiceSpendsResource(c).spends)score-=200;
      // Risk — nguồn zgt game
      if(l==='an_toan')score+=100;
      else if(l==='ngang_suc')score+=(this.injuryLevel()===0?70:30);
      else if(!l)score+=50; // không combat
      else score-=50;
      // Chance — nguồn Imt game (dễ / % )
      if(ch!=null){
        score+=Math.round((ch-0.5)*90); // 90% → +36, 50% → 0, 20% → −27
        if(ch<0.3&&l!=='an_toan')score-=30;
      }
      // Thoát: chỉ khi không còn việc
      if(isThoat(c))score-=80;
      // Đang bị thương: tránh cửa có giao chiến
      if(this.injuryLevel()>=1&&l&&l!=='an_toan')score-=60;
      // Lui lấy phần thưởng đã có thì đáng giá hơn đánh tiếp
      if(/lấy (tiền|thưởng|lời)|nhận thưởng|thu hoạch|rút lui/i.test(strip(c.text)))score+=45;
      // Lui đi/bỏ đi tay không: kém hơn làm việc
      if(/^(lặng lẽ lui|lui đi|bỏ đi|làm ngơ|mặc kệ|lờ đi)/i.test(strip(c.text)))score-=40;
      // Có vat / phần thưởng gợi ý trên nút
      if(A(c.vat).length)score+=8;
      if(c.phucHet)score-=60;
      // Mua/cược
      if(/^(mua|trả|đặt cược|thuê|cược)\b/i.test(strip(c.text)))score-=40;
      // Đầu đàn
      if(/đầu đàn|lùng con đầu đàn/i.test(strip(c.text))){
        if((this.opts.apex==='prefer'||this.opts.apex==='always')&&(l==='an_toan'||l==='ngang_suc'))score+=25;
        else if(this.opts.apex==='never')score-=60;
        else score-=30; // fallback: săn thường trước
      }
      // Thứ tự content (index nhỏ = lựa chọn chính thường đứng trước)
      score+=Math.max(0,8-Number(c.index||0));
      return{c,score};
    }).sort((a,b)=>b.score-a.score||a.c.index-b.c.index);

    const best=scored[0]?.c||null;
    if(best){
      const ch=chanceOf(best);
      this.push('pick → ['+(best.index+1)+'] '+strip(best.text).slice(0,42)+' risk='+(lv(best)||'none')+(ch!=null?(' ch='+ch):'')+' score='+scored[0].score.toFixed(1),'dbg',{scores:scored.slice(0,6).map(x=>({i:x.c.index,t:strip(x.c.text).slice(0,40),s:Math.round(x.score)})),poolSize:pool.length,listSize:list.length,enc:activeId,kind:encKind});
    }
    return best;
  },
  /* Blacklist theo NĂM GAME (source: HUNT_RECOVERY_YEARS qit=2, HUNTS_PER_SLOT Qp=3)
     Bp = count - (nam-stamp)/qit; còn lần = floor(Qp - Bp) */
  encounterCooldownYears(encId){
    try{
      const lim=C.encounters?.get?.(encId)?.limits;
      if(lim&&N(lim.hoi_chieu_nam))return Math.max(0.25,+lim.hoi_chieu_nam);
    }catch{}
    return null;
  },
  huntRecoveryYears(){
    try{
      const v=g?.balance?.HUNT_RECOVERY_YEARS??g?.__modPrivate?.HUNT_RECOVERY_YEARS;
      if(N(v)&&v>0)return +v;
    }catch{}
    return 2; // default source qit=2
  },
  huntsPerSlot(){
    try{
      const v=g?.balance?.HUNTS_PER_SLOT??g?.__modPrivate?.HUNTS_PER_SLOT;
      if(N(v)&&v>0)return +v;
    }catch{}
    return 3;
  },
  banSlot(slot,years){
    if(!slot)return;
    const y=N(years)?+years:this.huntRecoveryYears();
    // years game, không phải ms tường
    const until=nowYear()+Math.max(0.05,y);
    this.slotBanNam=this.slotBanNam||Object.create(null);
    this.slotBanNam[slot]=Math.max(this.slotBanNam[slot]||0, until);
    this.push('Tạm bỏ ô '+slot+' · đến năm '+until.toFixed(2)+' (còn ~'+y+' năm)','dbg');
  },
  isSlotBanned(slot){
    if(!slot)return false;
    const until=this.slotBanNam&&this.slotBanNam[slot];
    if(until!=null&&until>nowYear())return true;
    // legacy ms (phiên cũ) — bỏ qua nếu đã hết
    const ms=this.slotBan&&this.slotBan[slot];
    return !!(ms&&ms>Date.now());
  },
  banAct(slot,actId,years){
    if(!slot||!actId)return;
    const y=N(years)?+years:this.huntRecoveryYears();
    const until=nowYear()+Math.max(0.05,y);
    this.actBanNam=this.actBanNam||Object.create(null);
    this.actBanNam[slot+'|'+actId]=Math.max(this.actBanNam[slot+'|'+actId]||0, until);
  },
  isActBanned(slot,actId){
    if(!slot||!actId)return false;
    const until=this.actBanNam&&this.actBanNam[slot+'|'+actId];
    if(until!=null&&until>nowYear())return true;
    const ms=this.actBan&&this.actBan[slot+'|'+actId];
    return !!(ms&&ms>Date.now());
  },

  startSanYeuHere(enc){
    enc=enc||'ev.san_yeu';
    const slot=run().viTri;
    this.push('Tương tác lại ô đang đứng @ '+slot+' · '+enc,'dbg');
    try{
      if(typeof g.reopenPlace==='function'){g.reopenPlace();this.push('reopenPlace','dbg')}
    }catch(e){this.push('reopenPlace: '+(e.message||e),'dbg')}
    if(run().active){this.push('reopenPlace mở encounter','ok');return true}
    try{
      if(typeof g.enterNode==='function'){g.enterNode(slot);this.push('enterNode(self) '+slot,'dbg')}
    }catch(e){this.push('enterNode self: '+(e.message||e),'dbg')}
    if(run().active){this.push('enterNode(self) mở encounter','ok');return true}
    try{
      if(typeof g.chooseActivity==='function'){
        g.chooseActivity(enc);
        this.push('chooseActivity('+enc+')','ok');
        return true;
      }
    }catch(e){this.push('chooseActivity: '+(e.message||e),'dbg')}
    if(run().active)return true;
    try{
      g.doAction(enc);
      this.push('doAction('+enc+') @ '+slot,'ok');
      return true;
    }catch(e){
      this.push('doAction fail: '+(e.message||e),'err');
      throw e;
    }
  },
  startHuntHere(beastId){
    const slot=run().viTri;
    const block=this.huntBlockedHere();
    if(block){
      this.push('Không săn được tại chỗ: '+block,'dbg');
      this.banSlot(slot,0.5);
      this.markHuntFail(slot,beastId,block);
      return false;
    }
    try{
      if(typeof g.targetedHunt==='function'){
        g.targetedHunt(beastId,false);
        this.push('targetedHunt('+beastId+')','ok');
        // Đánh dấu đã thử — nếu tick sau không có active thì coi như cạn/thất bại
        this._pendingHunt={slot,beastId,at:Date.now(),nam:nowYear()};
        return true;
      }
    }catch(e){
      this.push('targetedHunt: '+(e.message||e),'dbg');
      this.markHuntFail(slot,beastId,e.message||e);
      return false;
    }
    return this.startSanYeuHere('ev.san_yeu');
  },
  markHuntFail(slot,beastId,reason){
    this.huntFail=this.huntFail||Object.create(null);
    const k=(slot||'')+'|'+(beastId||'*');
    const n=(this.huntFail[k]||0)+1;
    this.huntFail[k]=n;
    if(n>=2){
      this.banBeast=this.banBeast||Object.create(null);
      this.banBeast[k]=Date.now()+180000;
      this.push('Bỏ mục tiêu săn '+k+' (fail ×'+n+')','dbg',{reason:String(reason||'')});
    }
    // Nhiều fail tại cùng ô → tạm rời
    const slotFails=Object.entries(this.huntFail).filter(([key,v])=>key.startsWith((slot||'')+'|')&&v>0).reduce((a,[,v])=>a+v,0);
    if(slotFails>=3||this.sanYeuLeft(slot)<=0){
      this.banSlot(slot,0.35);
      this.needInteractHere=false;
    }
  },
  isBeastBanned(slot,beastId){
    const k=(slot||'')+'|'+(beastId||'*');
    return !!(this.banBeast&&this.banBeast[k]>Date.now());
  },
  clearPendingHuntIfStale(){
    const p=this._pendingHunt;
    if(!p)return;
    if(run().active||run().tran){this._pendingHunt=null;return}
    if(run().thongBao||run().thongBaoDai)return;
    if(Date.now()-p.at<600)return;
    this.markHuntFail(p.slot,p.beastId,'không vào được encounter');
    this._pendingHunt=null;
  },
  /* Đang trong UI nơi chốn (oNoi) — tab Chuyện lớn / Thời thế / Trước mắt */
  inPlace(){
    try{
      const r=run();
      return !!(r.oNoi&&r.oNoi===r.viTri);
    }catch{return false}
  },
  placeActs(){
    try{
      const v=typeof g.noiView==='function'?g.noiView():null;
      return A(v?.hoatDong);
    }catch{return []}
  },
  markNodeFail(slot,enc,reason){
    this.nodeFail=this.nodeFail||Object.create(null);
    const k=(slot||'')+'|'+(enc||'*');
    const n=(this.nodeFail[k]||0)+1;
    this.nodeFail[k]=n;
    this.push('Node fail ×'+n+': '+k+(reason?(' · '+reason):''),'dbg');
    if(n>=2){
      this.banBeast=this.banBeast||Object.create(null);
      this.banBeast[k]=Date.now()+300000; // 5 phút bỏ encounter này
      this.banSlot(slot,this.huntRecoveryYears());
      try{if(this.inPlace())g.leavePlace?.()}catch{}
      this.needInteractHere=false;
    }
  },
  isNodeBanned(slot,enc){
    const k=(slot||'')+'|'+(enc||'*');
    return !!(this.banBeast&&this.banBeast[k]>Date.now());
  },
  /* Vào encounter node / hoạt động nơi — không spam enterNode */
  startNodeHere(enc,slot){
    slot=slot||run().viTri;
    enc=enc||null;
    if(this.isNodeBanned(slot,enc))return false;
    // 1) Đang trong menu nơi → chooseActivity (Chuyện lớn = overlay → bz)
    if(this.inPlace()&&enc){
      try{
        if(typeof g.chooseActivity==='function'){
          g.chooseActivity(enc);
          this.push('chooseActivity('+enc+') trong nơi','ok');
          this._pendingNode={slot,enc,at:Date.now()};
          return true;
        }
      }catch(e){
        this.push('chooseActivity: '+(e.message||e),'dbg');
        this.markNodeFail(slot,enc,e.message||e);
        return false;
      }
    }
    // 2) Chưa vào nơi → enterNode / reopenPlace
    try{
      if(typeof g.enterNode==='function'){
        g.enterNode(slot);
        this.push('enterNode('+slot+')','dbg');
        this._pendingNode={slot,enc,at:Date.now()};
        return true;
      }
    }catch(e){this.push('enterNode: '+(e.message||e),'dbg')}
    try{
      if(typeof g.reopenPlace==='function'){
        g.reopenPlace();
        this.push('reopenPlace','dbg');
        this._pendingNode={slot,enc,at:Date.now()};
        return true;
      }
    }catch(e){this.push('reopenPlace: '+(e.message||e),'dbg')}
    // 3) doAction fallback
    if(enc){
      try{
        g.doAction(enc);
        this.push('doAction('+enc+')','ok');
        this._pendingNode={slot,enc,at:Date.now()};
        return true;
      }catch(e){
        this.push('doAction node: '+(e.message||e),'dbg');
        this.markNodeFail(slot,enc,e.message||e);
        return false;
      }
    }
    this.markNodeFail(slot,enc,'không mở được');
    return false;
  },
  clearPendingNodeIfStale(){
    const p=this._pendingNode;
    if(!p)return;
    // Đã vào encounter/trận → thành công, xóa pending (không báo fail)
    if(run().active||run().tran||run().bienCo){
      this._pendingNode=null;
      if(run().active&&this.nodeFail)this.nodeFail[(p.slot||'')+'|'+(p.enc||'*')]=0;
      return;
    }
    if(run().thongBao||run().thongBaoDai)return;
    if(Date.now()-p.at<900)return;
    // Hết lượt farm tại nơi (vd. san_yeu cạn sau 1 trận) → không phải fail node
    if(this.inPlace()){
      const left=this.placeFarmActs();
      if(!left.length){
        this._pendingNode=null;
        return;
      }
      // Còn săn/act cùng chỗ → tiếp tục tại chỗ, không đi nơi khác
      if(p.enc&&!this.isNonFarmEnc(p.enc)){
        const leftSy=this.sanYeuLeft(run().viTri||p.slot);
        const still=this.placeFarmActs().some(a=>a.id===p.enc)
          ||(p.enc==='ev.san_yeu'&&leftSy>0&&this.canHuntHere(run().viTri));
        if(still){
          p.at=Date.now();
          p.retries=(p.retries|0)+1;
          if(p.retries>8){
            this.push('retry quá nhiều '+p.enc+' → bỏ pending + tạm bỏ act','dbg');
            this.banAct(run().viTri||p.slot,p.enc,p.enc==='ev.san_yeu'?this.huntRecoveryYears():1);
            if(p.enc==='ev.san_yeu')this.banSlot(run().viTri||p.slot,this.huntRecoveryYears());
            this._pendingNode=null;
            return;
          }
          try{
            if(p.enc==='ev.san_yeu'&&leftSy>0){try{g.reopenPlace?.()}catch{}}
            g.chooseActivity?.(p.enc);
            this.push('tiếp tục '+p.enc+(p.enc==='ev.san_yeu'?(' · còn '+leftSy):''),'dbg');
            return;
          }catch(e){this.push('tiếp tục act: '+(e.message||e),'dbg')}
        }
      }
      this._pendingNode=null;
      return;
    }
    // Đã rời nơi mà vẫn pending → bỏ, không ban
    this._pendingNode=null;
  },
  dismissNotices(){
    let n=0;
    try{if(run().thongBao){g.dongThongBao?.();n++;this.push('Đóng thông báo thưởng','ok')}}catch(e){this.push('dongThongBao: '+(e.message||e),'err')}
    try{if(run().thongBaoDai){g.closeLongNotice?.();n++;this.push('Đóng thông báo dài','ok')}}catch(e){this.push('closeLongNotice: '+(e.message||e),'err')}
    return n;
  },
  handlePursuitPanel(){
    // API riêng: pursuitOptions + choosePursuit('chase'|'release')
    let opts=null;
    try{opts=typeof g.pursuitOptions==='function'?g.pursuitOptions():null}catch{}
    const list=A(opts);
    if(!list.length)return false;
    const injured=this.injuryLevel()>=1;
    const preferRelease=this.opts.pursuit==='release'||this.opts.pursuit==='auto'&&injured||this.injuryLevel()>=2;
    let id=preferRelease?'release':'chase';
    if(!list.some(x=>(x.id||x)===id))id=list[0].id||list[0];
    try{
      g.choosePursuit(id);
      this.push('Pursuit: '+id+(preferRelease?' (ưu tiên an toàn)':''),'ok');
      return true;
    }catch(e){
      this.push('choosePursuit: '+(e.message||e),'err');
      return false;
    }
  },
  combatNoProgress(why){
    this._noProg=(this._noProg||0)+1;
    this.push('Trận chưa tiến triển ('+why+') ×'+this._noProg,'dbg');
    if(this._noProg>=3){this._noProg=0;return 'stuck'}
    return 'combat-wait';
  },
  handleCombat(){
    const tran=run().tran;
    const waitingCombat=run().active?.waiting?.kind==='combat';
    if(waitingCombat&&!tran)this._combatStarted=null;
    if(tran?.ketThuc){
      this._combatStarted=null;this._turnSig=null;this._turnSame=0;this._noProg=0;
      try{g.xongTran();this.push('xongTran (kết trận'+(typeof tran.ketThuc==='string'?': '+tran.ketThuc:'')+')','ok');return 'combat-end'}
      catch(e){this.push('xongTran: '+(e.message||e),'err');return 'stuck'}
    }
    if(!tran)return 'combat-wait';
    /* Màn vào trận: run.tran đã có sẵn nhưng daGiaoChien=false. PHẢI Giao chiến (hoặc Tốc chiến) trước rồi mới ra chiêu được.
       Khớp bản ghi tay: giao_chien → chieu… → danh_thuong → ket_luot → … → xongTran. */
    const started=typeof tran.daGiaoChien==='boolean'?tran.daGiaoChien:!!this._combatStarted;
    if(started){
      const turn=this.playCombatTurn();
      return turn||'combat-wait';
    }
    this._turnSig=null;this._turnSame=0;
    let dk=null;
    try{dk=typeof g.duKienTran==='function'?g.duKienTran():null}catch{}
    const allowFast=this.opts.tocChien&&this.injuryLevel()<2&&dk?.duocTocChien!==false;
    if(allowFast){
      try{
        g.tocChienTran();
        this._combatStarted=true;
        this.push('Tốc chiến','ok');
        return 'combat-fast';
      }catch(e){this.push('Tốc chiến lỗi: '+(e.message||e)+' → giao chiến','dbg')}
    }else if(this.opts.tocChien&&dk&&dk.duocTocChien===false){
      this.push('Trận này không tốc chiến được → giao chiến','dbg');
    }
    try{
      if(typeof g.hanhDongTran!=='function')throw new Error('Không có hanhDongTran');
      g.hanhDongTran({loai:'giao_chien'});
      this._combatStarted=true;
      this.push('Giao chiến ('+(dk?(dk.thang?'dự kiến thắng':'dự kiến khó')+', hiệp~'+(dk.nHiep??'?'):'không có dự kiến')+')','ok');
    }catch(e){
      this.push('giao_chien: '+(e.message||e),'err');
      return this.combatNoProgress('giao_chien lỗi');
    }
    const t2=run().tran;
    if(t2&&!t2.ketThuc)return this.playCombatTurn()||'combat-manual';
    return 'combat-manual';
  },
  /* Một lượt của ta. Dữ liệu thật: run.tran.ta.chieu[] (id dạng "item.xxx#6", dang, phi, uy), ta.linhLuc, ta.hoi[id] = hiệp dùng lại được.
     (Bản cũ đọc tran.phe.ta.chieu — đường dẫn không tồn tại, nên danh sách chiêu luôn rỗng.) */
  playCombatTurn(){
    const tran=run().tran;
    if(!tran||tran.ketThuc||typeof g.hanhDongTran!=='function')return null;
    const ta0=tran.ta||{};
    const sig=[tran.hiep,tran.luot,Math.round(Number(ta0.khiHuyet)||0),Math.round(Number(ta0.linhLuc)||0),A(tran.dich).map(d=>Math.round(Number(d?.khiHuyet)||0)).join(',')].join('|');
    if(sig===this._turnSig){
      if(++this._turnSame>=4){this._turnSame=0;this.push('Trận không đổi sau 4 lượt thử — dừng để xử tay','err',{sig});return 'stuck'}
    }else{this._turnSig=sig;this._turnSame=0}
    if(tran.luot&&tran.luot!=='ta')return 'combat-wait';
    const ended=()=>{const t=run().tran;return !t||!!t.ketThuc};
    const act=a=>{
      try{g.hanhDongTran(a);return true}
      catch(e){this.push('Trận: '+a.loai+(a.id?' '+a.id:'')+' lỗi: '+String(e.message||e).slice(0,60),'dbg');return false}
    };
    const tried=new Set();
    const usable=()=>{
      const t=run().tran;if(!t||t.ketThuc)return [];
      const ta=t.ta||{},hiep=Number(t.hiep)||0,ll=Number(ta.linhLuc)||0;
      const hpR=(Number(ta.khiHuyet)||0)/Math.max(1,Number(ta.khiHuyetToiDa)||1);
      return A(ta.chieu).filter(c=>c&&c.id&&!tried.has(c.id)&&(Number(c.phi)||0)<=ll&&(Number(ta.hoi?.[c.id])||0)<=hiep).map(c=>{
        const uy=Number(c.uy)||0;let w;
        if(c.dang==='hoi_phuc')w=hpR<0.5?900:-1;
        else if(c.dang==='thu')w=hpR<0.7?500:-1;
        else if(c.dang==='khong_che')w=200+uy;
        else w=300+uy*10;
        return{c,w};
      }).filter(x=>x.w>=0).sort((a,b)=>b.w-a.w).map(x=>x.c);
    };
    let n=0,cast=0;
    while(n++<10&&!ended()){
      const list=usable();if(!list.length)break;
      const c=list[0];tried.add(c.id);
      if(act({loai:'chieu',id:c.id})){cast++;this.push('Trận: chiêu '+(c.ten||c.id),'dbg')}
    }
    if(!ended()&&!run().tran?.ta?.daDanhThuong)act({loai:'danh_thuong'});
    if(!ended())act({loai:'ket_luot'});
    this._noProg=0;
    return ended()?'combat-end':'combat-turn';
  },
  _combatKey(tran){
    if(!tran)return 'x';
    try{return String(tran.id||tran.ten||'')+'|'+String(tran.nHiep??tran.hiep??'')+'|'+String(!!tran.ketThuc)}catch{return 'x'}
  },
  tryEncounter(){
    if(run().thongBao||run().thongBaoDai){this.dismissNotices();return 'notice'}
    const a=run().active;if(!a)return 'idle';
    const w=a.waiting;
    // Đấu giá / không farm: chọn thoát ngay nếu có choice
    if(!w&&this.isNonFarmEnc(a.id)){
      let view=null;try{view=g.encounterView?.()}catch{}
      const ch=this.pickChoice(view?.choices||[]);
      if(ch){
        try{g.choose(ch.index);this.push('Thoát non-farm: '+a.id,'ok');return 'choose'}catch(e){this.push('choose non-farm: '+(e.message||e),'err')}
      }
      // Không chọn được → đóng / resume
      try{if(a.done)g.closeEncounter?.();else g.resume?.(null)}catch{}
    }

    // Panel đuổi theo / buông tha (API riêng)
    if(w?.kind==='pursuit'||/pursuit|truy/i.test(String(w?.kind||''))){
      if(this.handlePursuitPanel())return 'pursuit';
    }
    // Thử pursuitOptions ngay cả khi kind khác (một số bản gắn vào choice)
    try{
      const po=typeof g.pursuitOptions==='function'?g.pursuitOptions():null;
      if(A(po).length&&this.handlePursuitPanel())return 'pursuit';
    }catch{}

    if(w?.kind==='combat'||run().tran){
      return this.handleCombat();
    }
    if(w?.kind==='xu_tri'){
      let id=this.opts.xuTri||'tha';
      try{
        const opts=typeof g.cachXuTri==='function'?g.cachXuTri():null;
        const ids=A(opts).map(x=>x.id||x);
        if(ids.length&&!ids.includes(id))id=ids.includes('tha')?'tha':ids[0];
      }catch{}
      try{
        if(typeof g.xuTri!=='function')throw new Error('Không có xuTri');
        g.xuTri(id);
        this.push('Xử tù binh: '+id,'ok');
        this.needInteractHere=false;
        return 'xu_tri';
      }catch(e){
        this.push('xuTri lỗi: '+(e.message||e),'err');
        return 'stuck';
      }
    }
    if(w?.kind==='enemy_escape'){
      // Thường chuyển sang đuổi/tha — thử pursuit trước
      if(this.handlePursuitPanel())return 'pursuit';
      this.push('Địch tháo chạy — dừng để chọn tay','err');
      return 'stuck';
    }
    if(w){
      try{g.resume?.(null)}catch{}
      if(run().active?.waiting){this.push('Chờ UI: '+w.kind+' — dừng','err');return 'stuck'}
      return 'wait';
    }
    if(run().tran)return this.handleCombat();
    if(a.done){
      try{
        if(typeof g.closeEncounter==='function')g.closeEncounter();
        else g.resume?.(null);
        this.push('Đóng encounter (Tiếp tục)','ok');
      }catch(e){
        try{g.resume?.(null)}catch{}
        this.push('closeEncounter: '+(e.message||e),'err');
      }
      // Bản ghi: closeEncounter xong vẫn ở trong nơi → tick sau chooseActivity tiếp (san_yeu còn lượt / sự kiện khác)
      this.needInteractHere=false;
      this.ensureHealthy(false);
      return run().active?'wait':'idle';
    }
    let view=null;
    try{view=typeof g.encounterView==='function'?g.encounterView():null}catch(e){this.push('encounterView: '+(e.message||e),'err');return 'stuck'}
    const choices=A(view?.choices);
    if(!choices.length){
      if(run().tran)return this.handleCombat();
      return 'wait';
    }
    if(!this.opts.autoChoose){this.push('Có lựa chọn — tắt auto chọn, dừng tay');return 'stuck'}
    const pick=this.pickChoice(choices);
    if(!pick){
      const strip=t=>this.stripText(t);
      const cancel=choices.find(c=>c&&(c.thoat||/^(thôi|hủy)/i.test(strip(c.text).trim())));
      try{
        if(cancel&&typeof g.choose==='function'){g.choose(cancel.index);this.push('Chọn Thôi để rời menu','ok')}
        else if(typeof g.closeEncounter==='function')g.closeEncounter();
        else g.resume?.(null);
      }catch(e){this.push('Rời menu: '+(e.message||e),'err')}
      if(a?.id)this.banAct(run().viTri||a.slot,a.id,1);
      this.needInteractHere=false;
      this.push('Rời sự kiện '+(a?.id||'')+', làm việc tiếp theo','ok');
      return 'idle';
    }
    const label=T(this.stripText(pick.text)).slice(0,80);
    const ch=pick.chance!=null?` · ${pick.chance}`:'';
    const rk=this.riskLevel(pick);
    const rkShow=rk?` · risk:${rk}`:'';
    try{
      const txt=this.stripText(pick.text).trim();
      const isCancel=pick.thoat===true||/^(thôi|hủy|đóng|bỏ qua|đi|rời đi|rời|đi tiếp|cáo từ)\s*$/i.test(txt)||/^(xem rồi đi|lảng đi|không muốn|rời (đi|khỏi|chỗ))/i.test(txt);
      g.choose(pick.index);
      this.push(`Chọn [${pick.index+1}] ${label}${ch}${rkShow}`,'ok');
      if(this._avoidReroll){
        this._avoidReroll=false;
        const slot=run().viTri||a.slot;
        try{g.closeEncounter?.()}catch{}
        this.banSlot(slot,10); // 10 năm game: không quay lại ô có quái này
        this._pendingNode=null;
        try{g.leavePlace?.()}catch{}
        this.push('Rời ô '+slot+' (có quái cần né), ban 10 năm','ok');
        return 'idle';
      }
      if(isCancel){
        const slot=run().viTri||a.slot;
        const actId=a?.id||null;
        if(actId)this.banAct(slot,actId,1);
        this.needInteractHere=false;
        this._pendingNode=null;
        // Chỉ đóng sự kiện này (vd. lọt vào chợ mua bán); các sự kiện khác ở nơi vẫn làm tiếp, hết việc tick sau tự rời nơi
        try{g.closeEncounter?.()}catch{}
        this.push('Đã Rời đi khỏi '+(actId||'sự kiện')+' — làm việc tiếp theo ở nơi','dbg');
        return 'idle';
      }
      return 'choice';
    }catch(e){
      this.push('choose lỗi: '+(e.message||e),'err');
      return 'stuck';
    }
  },
  tryCombat(){return this.tryEncounter()},
  async tick(){
    if(!this.running)return;
    this.stepN++;
    try{this.trackGains();this.syncGainsBar()}catch{}
    if(this.paused){this.schedule();return}
    try{
      if(run().ketThuc){this.stop('kiếp đã kết thúc');return}

      /* Watchdog: cùng một thế cục quá lâu (không năm trôi, không đổi encounter/trận) → tạm dừng thay vì lặp vô hạn */
      {
        const t=run().tran,sig=[run().nam,run().viTri,run().oNoi,run().active?.id,run().active?.done,run().active?.waiting?.kind,t?.hiep,t?.daGiaoChien,t?.ketThuc,Math.round(Number(t?.ta?.khiHuyet)||0),Math.round(Number(t?.ta?.linhLuc)||0),!!run().thongBao].join('|');
        if(sig===this._wdSig){
          if(++this._wdN>=25){
            this._wdN=0;this.stats.err++;
            this.push('Watchdog: 25 nhịp liền không có gì đổi — tạm dừng','err');
            try{this.dumpState('watchdog')}catch{}
            this.paused=true;this.syncFab();toast('Auto tạm dừng (đứng yên 25 nhịp) — bấm Xuất log gửi lại','',4500);return;
          }
        }else{this._wdSig=sig;this._wdN=0}
      }

      // Ưu tiên chữa thương khi rảnh
      if(!this.busy()&&this.injuryLevel()>=Math.max(1,Number(this.opts.healMinLevel||1))){
        const hs=this.ensureHealthy(false);
        if(hs==='no-item-pause'||hs==='critical'){this.schedule();return}
      }

      // Đang bị truy đuổi trên world: có thể cần quay đầu
      if(run().truyDuoi&&!run().active&&!run().tran){
        try{
          const block=typeof g.turnBackBlock==='function'?g.turnBackBlock():null;
          if(!block&&typeof g.turnOnPursuer==='function'){
            // Chỉ chủ động quay đầu nếu user muốn đuổi / không prefer release
            if(this.opts.pursuit==='chase'){
              g.turnOnPursuer();
              this.push('Quay đầu đón kẻ truy đuổi','ok');
              this.schedule();return;
            }
          }
        }catch(e){this.push('truyDuoi: '+(e.message||e),'dbg')}
      }

      if(this.busy()){
        const waiting=run().active?.waiting?.kind;
        // combat-wait: giảm spam log
        if(waiting==='combat'||run().tran){
          const st=this.tryEncounter();
          if(st==='stuck'){this.stats.err++;this.push('Kẹt encounter — tạm dừng, xử tay rồi Tiếp tục','err');this.paused=true;this.syncFab();toast('Auto tạm dừng (kẹt encounter)','',3500);return}
          this.schedule();return;
        }
        this.push('Đang bận encounter/trận — xử lý…','dbg',{active:run().active?.id,waiting});
        const st=this.tryEncounter();
        if(st==='stuck'){this.stats.err++;this.push('Kẹt encounter — tạm dừng, xử tay rồi Tiếp tục','err');this.paused=true;this.syncFab();toast('Auto tạm dừng (kẹt encounter)','',3500);return}
        this.schedule();return;
      }

      this.clearPendingHuntIfStale();
      this.clearPendingNodeIfStale();
      this.needInteractHere=false;
      // clearPending* có thể vừa mở encounter (retry) → không được leavePlace/enterNode trong tick này
      if(this.busy()){this.schedule();return}

      // Thọ nguyên cạn dần: dừng sớm để người chơi quyết định (cạn thọ = hết kiếp)
      {
        const lf=this.lifeLeft();
        if(lf!=null&&lf<=this.minLife()){
          this.push('Thọ nguyên còn '+fmtTime(Math.max(0,lf))+' ≤ ngưỡng '+this.minLife()+' năm — Auto dừng','err');
          this.paused=true;this.syncFab();toast('Auto dừng: sắp cạn thọ nguyên','',5000);
          this.schedule();return;
        }
      }

      const ban=this.slotBan||(this.slotBan=Object.create(null));
      const here=run().viTri;
      const now=Date.now();
      const isBanned=s=>this.isSlotBanned(s);

      /* 1) Đang trong nơi → làm việc farm; không có thì leavePlace và ĐI CHỖ KHÁC (không enter lại cùng ô) */
      if(this.inPlace()&&!run().active){
        let acts=this.placeFarmActs();
        const leftSy=this.sanYeuLeft(here);
        const block=this.huntBlockedHere();
        const rawSan=this.placeActs().find(a=>a&&a.id==='ev.san_yeu'&&!a.lockedReason);
        const blockedSan=!!(block&&/săn cạn|hoang dã|lần theo dấu/i.test(String(block)));
        // Chỉ săn khi có act thật + còn lượt + không bị chặn (thành thị/hoang dã)
        const canSan=!!rawSan&&leftSy>0&&!blockedSan&&!this.isActBanned(here,'ev.san_yeu');
        if(canSan&&!acts.some(a=>a.id==='ev.san_yeu'))acts=[...acts,rawSan];
        // Mỗi việc chỉ thử tối đa 2 lần/lượt ghé (săn yêu 6) — tránh lặp vô hạn một việc không biến mất
        acts=acts.filter(a=>(this._visitActs?.[here+'|'+a.id]||0)<(a.id==='ev.san_yeu'?6:2));
        if(acts.length){
          const act=acts[0];
          this.push('Tại nơi: chooseActivity('+act.id+' · '+(act.loai||'')+')'+(act.id==='ev.san_yeu'?' · còn '+leftSy:'') ,'ok');
          this._doneHere=true;
          this._visitActs=this._visitActs||Object.create(null);
          this._visitActs[here+'|'+act.id]=(this._visitActs[here+'|'+act.id]||0)+1;
          try{
            g.chooseActivity(act.id);
            const tb=run().thongBao||run().thongBaoDai;
            const tbText=String(tb?.text||tb||'');
            if(tbText&&/không còn|không thể|không làm/i.test(tbText)){
              this.push('Act hết ('+act.id+'): '+tbText.slice(0,40)+' → bỏ','dbg');
              this.markNodeFail(here,act.id,'không còn');
              try{g.dongThongBao?.()}catch{}
              this.schedule();return;
            }
            this._lastEncAtPlace=act.id;this._pendingNode={slot:here,enc:act.id,at:Date.now()};
            this.stats.ok++;
            this.schedule();return;
          }catch(e){
            this.push('chooseActivity: '+(e.message||e),'err');
            this.markNodeFail(here,act.id,e.message||e);
            this.schedule();return;
          }
        }
        // Hết việc thật sự — rời, ban
        const actIds=this.placeActs().map(a=>a.id).slice(0,8);
        let refreshY=null;
        try{const v=g.noiView?.();if(v&&N(v.suKienConNam))refreshY=+v.suKienConNam}catch{}
        // Còn lượt săn mà không thấy act → không leave (thử reopen)
        if(this.canHuntHere(here)&&this.tryStayHunt(here,leftSy)){
          this.schedule();return;
        }
        this.push('Nơi hết việc farm → leavePlace @ '+here,'dbg',{syLeft:leftSy,block:block||null,noiActs:actIds,thongBao:run().thongBao||run().thongBaoDai||null});
        try{g.leavePlace?.()}catch{}
        // Blacklist theo năm game: săn qit=2; sự kiện limits.hoi_chieu_nam; thành 0.5
        const leftAfter=this.sanYeuLeft(here);
        let banY;
        const lastEnc=this._lastEncAtPlace||null;
        const cd=lastEnc?this.encounterCooldownYears(lastEnc):null;
        if(cd!=null)banY=cd;
        else if(leftAfter<=0&&!(this.isNoiChon(here)||placeDef(here)))
          banY=this.huntRecoveryYears();
        else if(this.isNoiChon(here)||placeDef(here))
          banY=refreshY!=null?Math.min(3,Math.max(0.3,refreshY)):(this._doneHere?1.5:3); // thành/thôn: quay lại khi 'Trước mắt' đổi mới (suKienConNam), chống ping-pong
        else
          banY=0.5;
        this._doneHere=false;
        this.banSlot(here,banY);
        this._lastEncAtPlace=null;
        // Chọn nơi khác ngay trong tick này
        const listHere=this.targets().filter(t=>t.slot!==here&&!isBanned(t.slot)&&!(t.mode==='node'&&this.isNodeBanned(t.slot,t.enc)));
        // Farm thật trước, trong đó chọn cái GẦN nhất (tiết kiệm thọ nguyên)
        const farm=listHere.filter(t=>t.mode==='doAction'||t.mode==='hunt'||t.mode==='node'||t.mode==='visit');
        const byNear=(a,b)=>{
          const da=N(a.miles)?a.miles:(N(a.travel)?a.travel*8000:1e9);
          const db=N(b.miles)?b.miles:(N(b.travel)?b.travel*8000:1e9);
          return da-db||Number(b.priority||0)-Number(a.priority||0);
        };
        const nx=(farm.length?farm:listHere).slice().sort(byNear)[0];
        if(nx){
          if(!this.affordable(nx.travel)){
            this.push('Không đủ thọ nguyên để đi '+nx.slot+' ('+fmtTime(nx.travel)+') — dừng','err');
            this.paused=true;this.syncFab();toast('Auto dừng: không đủ thọ nguyên để di chuyển','',5000);
            this.schedule();return;
          }
          this.push('Đến nơi · '+nx.title+' · '+nx.slot+(N(nx.travel)?' · '+fmtTime(nx.travel):''),'ok');
          this.goEnter(nx.slot);
          this.stats.ok++;
          this.schedule();return;
        }
        // Không còn target — quét daKhamPha gần, bỏ ô đã ban
        try{
          const recent=this.recentSlots||(this.recentSlots=[]);
          const pool=A(run().daKhamPha).filter(s=>s&&s!==here&&hasSlot(s)&&!isBanned(s)&&!recent.includes(s)&&this.affordable(travelTo(s)))
            .sort((a,b)=>(milesTo(a)||9)-(milesTo(b)||9));
          if(pool[0]){
            recent.push(pool[0]);if(recent.length>10)recent.shift();
            this.push('Đổi chỗ → '+pool[0],'ok');
            this.goEnter(pool[0]);
            this.stats.ok++;
            this.schedule();return;
          }
        }catch(e){this.push('Đổi chỗ: '+(e.message||e),'dbg')}
        this.push('Không còn nơi khác trong tầm','dbg');
        this.schedule();return;
      }

      /* 2) Ngoài nơi: chỉ enter lại CHÍNH ô hiện tại khi còn node/sự kiện hoặc san_yeu thật sự có trong nơi */
      if(!this.inPlace()&&!run().active&&!isBanned(here)){
        const nodeEnc=run().nodes?.[here]?.encounter;
        if(nodeEnc&&!this.isNodeBanned(here,nodeEnc)){
          this.goEnter(here);
          this.stats.ok++;
          this.schedule();return;
        }
        // Không enter nơi chỉ vì sanYeuLeft>0 (thành thị hay báo left=3 nhưng không có act san_yeu)
        // Chỉ enter nếu đã biết nơi có farm (recent placeFarm hint) — bỏ nhánh tự enter "để săn"
      }

      /* 3) Đi tới target gần khác ô hiện tại */
      const list=this.targets().filter(t=>!isBanned(t.slot)&&t.slot!==here&&!(t.mode==='node'&&this.isNodeBanned(t.slot,t.enc))&&!(t.mode==='hunt'&&this.isBeastBanned(t.slot,t.enc)));
      const next=list[0]||null;
      if(next){
        // Đang còn việc tại chỗ hoặc đang encounter → không chuyển nơi
        if(run().active||run().tran){
          this.push('Hoãn đi — đang encounter/trận','dbg');
          this.schedule();return;
        }
        const leftHere=this.sanYeuLeft(run().viTri);
        if(this.canHuntHere(run().viTri)&&!this.isSlotBanned(here)&&this.tryStayHunt(here,leftHere)){
          this.schedule();return;
        }
        if(!this.affordable(next.travel)){
          this.push('Không đủ thọ nguyên để đi '+next.slot+' ('+fmtTime(next.travel)+') — dừng','err');
          this.paused=true;this.syncFab();toast('Auto dừng: không đủ thọ nguyên để di chuyển','',5000);
          this.schedule();return;
        }
        this.push('Đến nơi · '+next.title+' · '+next.slot+(N(next.travel)?' · '+fmtTime(next.travel):''),'ok');
        if(this.inPlace()){try{g.leavePlace?.()}catch{}}
        this.goEnter(next.slot);
        this.stats.ok++;
        this.schedule();return;
      }

      this.emptyScans=(this.emptyScans||0)+1;
      if(this.emptyScans===1||this.emptyScans%5===0)this.push('0 mục tiêu trong tầm — quét #'+this.emptyScans,'dbg');
      try{
        const recent=this.recentSlots||(this.recentSlots=[]);
        const pool=A(run().daKhamPha).filter(s=>s&&s!==here&&hasSlot(s)&&!isBanned(s)&&!recent.includes(s)&&this.affordable(travelTo(s)))
          .sort((a,b)=>(milesTo(a)||9)-(milesTo(b)||9));
        if(pool[0]){
          recent.push(pool[0]);if(recent.length>10)recent.shift();
          this.push('Đổi chỗ → '+pool[0],'ok');
          this.goEnter(pool[0]);
        }
      }catch(e){this.push('Đổi chỗ: '+(e.message||e),'dbg')}
      clearTimeout(this.timer);
      this.timer=setTimeout(()=>this.tick(),Math.max(1000,this.opts.delayMs));
      return;
    }catch(e){
      this.stats.err++;this.push('tick exception: '+(e.message||e),'err');this.stop('exception');
    }
  },
  schedule(){
    clearTimeout(this.timer);
    if(!this.running)return;
    this.timer=setTimeout(()=>this.tick(),Math.max(400,this.opts.delayMs|0));
  },
  start(){
    if(this.running&&!this.paused)return;
    if(!g?.state?.run){toast('Chưa có kiếp.');return}
    this.running=true;this.paused=false;this.stepN=0;this.emptyScans=0;this.stats={ok:0,skip:0,err:0,heal:0};
    this.gainsBase=this.charSnapshot();
    this.gainsPrev=this.gainsBase;
    this.gainsAcc={
      linhThach:{plus:0,minus:0},tuVi:{plus:0,minus:0},canhGioi:{plus:0,minus:0},
      chiSo:Object.fromEntries(this.STAT_KEYS.map(k=>[k,{plus:0,minus:0}]))
    };
    this.gainsLog=[];
    try{
      const x=store.get('xuTri',null);if(x)this.opts.xuTri=x;
      const p=store.get('afPursuit',null);if(p)this.opts.pursuit=p;
      const ap=store.get('afApex',null);if(ap)this.opts.apex=ap;
      const av=store.get('afAvoid',null);if(typeof av==='string')this.opts.avoidBeasts=av;
      const ml=store.get('afMinLife',null);if(ml!==null&&ml!==undefined&&N(+ml))this.opts.minLifeYears=+ml;
      const h=store.get('afAutoHeal',null);if(h!==null&&h!==undefined)this.opts.autoHeal=!!h;
      const ht=store.get('afHaiThuoc',null);if(typeof ht==='boolean')this.opts.includeHaiThuoc=ht;
    }catch{}
    this.push('Bắt đầu Auto Farm','ok',{opts:{...this.opts},thuong:this.injuryName(this.injuryLevel())});
    this.dumpState('start');
    if(!this.targets().length)this.push('Cảnh báo: 0 mục tiêu lúc start','err');
    toast('Auto Farm chạy. Tạm dừng/Dừng cạnh icon tool.','ok',3000);
    this.syncFab();
    try{ui.isOpen=false;panel.classList.remove('open');fab.classList.remove('open');fab.style.display='';fab.style.visibility='visible'}catch{}
    this.schedule();
  },
  pause(){
    if(!this.running)return;
    this.paused=!this.paused;
    this.push(this.paused?'Tạm dừng':'Tiếp tục','ok');
    toast(this.paused?'Auto Farm tạm dừng':'Auto Farm tiếp tục',this.paused?'':'ok',2200);
    this.syncFab();
    if(!this.paused)this.schedule();
  },
  stop(reason){
    if(!this.running&&!this.timer)return;
    this.running=false;this.paused=false;clearTimeout(this.timer);this.timer=null;
    this.push('Đã dừng'+(reason?': '+reason:''),'err');
    this.dumpState('stop');
    toast('Đã dừng Auto Farm'+(reason?': '+reason:''),'',3000);
    this.syncFab();
    if(ui.isOpen&&ui.tab==='auto')VIEWS.auto();
  },

  syncGainsBar(){
    let panel=document.getElementById(ID+'-afstats');
    if(!this.running){
      if(panel)panel.remove();
      return;
    }
    if(!panel){
      panel=document.createElement('div');
      panel.id=ID+'-afstats';
      panel.innerHTML='<div class="af-drag" data-afdrag="1"><div class="af-h">Thống kê Auto</div><button type="button" class="af-toggle" data-afcollapse="1" title="Ẩn bảng thống kê">▾</button></div><div class="af-body"></div>';
      document.body.appendChild(panel);
      // Ẩn/hiện bảng (gọn lại chỉ còn thanh tiêu đề)
      const toggleBtn=panel.querySelector('[data-afcollapse]');
      const applyCollapsed=c=>{
        panel.classList.toggle('collapsed',c);
        toggleBtn.textContent=c?'▸':'▾';
        toggleBtn.title=c?'Hiện bảng thống kê':'Ẩn bảng thống kê';
      };
      applyCollapsed(store.get('afStatsCollapsed',false));
      toggleBtn.addEventListener('click',e=>{
        e.stopPropagation();
        const c=!panel.classList.contains('collapsed');
        applyCollapsed(c);
        store.set('afStatsCollapsed',c);
      });
      // Kéo di chuyển
      const head=panel.querySelector('[data-afdrag]');
      let drag=null;
      const onDown=(e)=>{
        if(e.target.closest('[data-afcollapse]'))return;
        if(e.button!=null&&e.button!==0)return;
        const r=panel.getBoundingClientRect();
        drag={x:e.clientX,y:e.clientY,l:r.left,t:r.top};
        panel.style.right='auto';panel.style.bottom='auto';
        panel.style.left=r.left+'px';panel.style.top=r.top+'px';
        e.preventDefault();
      };
      const onMove=(e)=>{
        if(!drag)return;
        const nx=drag.l+(e.clientX-drag.x);
        const ny=drag.t+(e.clientY-drag.y);
        panel.style.left=Math.max(4,Math.min(window.innerWidth-80,nx))+'px';
        panel.style.top=Math.max(4,Math.min(window.innerHeight-80,ny))+'px';
      };
      const onUp=()=>{drag=null};
      head.addEventListener('pointerdown',onDown);
      window.addEventListener('pointermove',onMove);
      window.addEventListener('pointerup',onUp);
      // restore position
      try{
        const pos=store.get('afStatsPos',null);
        if(pos&&N(pos.l)&&N(pos.t)){
          panel.style.left=pos.l+'px';panel.style.top=pos.t+'px';
          panel.style.right='auto';panel.style.bottom='auto';
        }
      }catch{}
      head.addEventListener('pointerup',()=>{
        try{
          const r=panel.getBoundingClientRect();
          store.set('afStatsPos',{l:r.left,t:r.top});
        }catch{}
      });
    }
    const body=panel.querySelector('.af-body')||panel;
    // Snapshot lại mỗi lần vẽ — tránh miss delta giữa các tick
    try{this.trackGains()}catch{}
    const d=this.gainsDelta();
    if(!d){
      body.innerHTML='<div class="af-sub">Đang bắt đầu…</div>';
      return;
    }
    const cell=(n)=>{const x=Number(n)||0;return (x>0?'+':'')+F(x)};
    const pair=p=>{
      if(p&&typeof p==='object'&&('net' in p||'plus' in p))return p;
      const n=Number(p)||0;return{plus:Math.max(0,n),minus:Math.max(0,-n),net:n};
    };
    const row3=(label,p)=>{
      const x=pair(p);
      return `<div class="af-row3"><span class="af-k">${E(label)}</span><span class="pos">${cell(x.plus)}</span><span class="neg">${x.minus?('-'+F(x.minus)):'0'}</span><span class="net">${cell(x.net)}</span></div>`;
    };
    // Phẩm: Phàm → Nghịch Thiên (1→8)
    const phamRows=[];
    for(let p=1;p<=8;p++){
      const v=Number(d.bagByPham?.[p]||d.bagByPham?.[String(p)]||0);
      if(!v&&!d.bagByPham?.[p]&&!d.bagByPham?.[String(p)]){
        // vẫn hiện 0 nếu muốn đủ hàng — chỉ hiện khi có đổi hoặc luôn hiện
        continue;
      }
      const ten=this.PHAM_TEN[p]||('Phẩm '+p);
      phamRows.push(`<div class="af-row"><span class="af-k">${E(ten)}</span><span class="net">${cell(v)}</span></div>`);
    }
    // luôn liệt kê đủ 8 phẩm
    const phamAll=[];
    for(let p=1;p<=8;p++){
      const v=Number((d.bagByPham&& (d.bagByPham[p]??d.bagByPham[String(p)]))||0);
      const ten=this.PHAM_TEN[p]||('Phẩm '+p);
      phamAll.push(`<div class="af-row"><span class="af-k">${E(ten)}</span><span class="net">${cell(v)}</span></div>`);
    }
    body.innerHTML=`
      <div class="af-sec">Tài nguyên</div>
      <div class="af-row3 head"><span></span><span>+</span><span>−</span><span>Thực tế</span></div>
      ${row3('Tu vi', d.tuVi)}
      ${row3('Linh thạch', d.linhThach)}
      <div class="af-sec">Chỉ số</div>
      <div class="af-row3 head"><span></span><span>+</span><span>−</span><span>Thực tế</span></div>
      ${this.STAT_KEYS.map(k=>row3(this.STAT_LABELS[k]||k, d.chiSo?.[k])).join('')}
      <div class="af-sec">Vật phẩm</div>
      ${phamAll.join('')}
      <div class="af-sub">OK ${this.stats.ok||0} · bước ${this.stepN||0}${this.paused?' · tạm dừng':''}<br>Năm ${F(d.base.nam)} → ${F(d.now.nam)}</div>`;
  },

  syncFab(){
    try{fab.style.display='';fab.style.visibility='visible'}catch{}
    const ICO_STOP=`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>`,ICO_PAUSE=`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`,ICO_PLAY=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
    let bar=document.getElementById(ID+'-afbar');
    if(!this.running){if(bar)bar.remove();document.getElementById(ID+'-afstats')?.remove();return}
    if(!bar){
      bar=document.createElement('div');
      bar.id=ID+'-afbar';
      bar.innerHTML=`<button type="button" data-a="stop" title="Dừng" aria-label="Dừng">${ICO_STOP}</button><button type="button" data-a="pause" title="Tạm dừng" aria-label="Tạm dừng">${ICO_PAUSE}</button>`;
      document.body.appendChild(bar);
      bar.addEventListener('click',e=>{
        const btn=e.target&&e.target.closest&&e.target.closest('[data-a]');
        const a=btn&&btn.getAttribute('data-a');
        if(a==='pause')this.pause();
        if(a==='stop')this.stop('tay');
      });
    }
    const pb=bar.querySelector('[data-a="pause"]');
    if(pb){
      pb.innerHTML=this.paused?ICO_PLAY:ICO_PAUSE;
      pb.title=this.paused?'Tiếp tục':'Tạm dừng';
      pb.setAttribute('aria-label',pb.title);
    }
    this.syncGainsBar();
    bar.dataset.paused=this.paused?'1':'0';
    try{
      const fr=fab.getBoundingClientRect();
      const w=40;
      bar.style.left=Math.max(4,fr.left+fr.width/2-w/2)+'px';
      bar.style.top='auto';
      bar.style.bottom=(window.innerHeight-fr.top+8)+'px';
    }catch{}
  }
};

/* ───────── Khung Auto Farm (rút gọn theo yêu cầu: chỉ còn nút Bắt đầu + Xuất log,
 * bỏ nút Quét lại, bỏ khung "Ghi hành động tay", bỏ 2 nút Xem/Đường trên từng thẻ
 * mục tiêu — các hàm ghi/bản đồ vẫn còn trong AutoFarm nhưng không có nút gọi tới
 * nên không ảnh hưởng gì khi không dùng) ───────── */
VIEWS.auto=()=>{
  try{const h=store.get('afHaiThuoc');if(typeof h==='boolean')AutoFarm.opts.includeHaiThuoc=h}catch{}
  const list=AutoFarm.targets().slice(0,40);
  const o=AutoFarm.opts;
  const inj=AutoFarm.injuryLevel();
  const heal=AutoFarm.pickHealItem();
  const injLine=inj>0
    ? `<div class="panel" style="border-color:var(--red,#c4472c)"><b class="r">Thương thế: ${E(AutoFarm.injuryName(inj))}</b><div class="sub">${heal?`Sẽ dùng: ${E(heal.ten)} (heal ${heal.heal})`:'Túi không có đan chữa — nên mua Hồi Xuân Đan / Kim Sang Dược / Sinh Cơ Đan'}</div></div>`
    : '';
  body.innerHTML=`<div class="panel"><b style="color:var(--gold)">Auto Farm</b>
    <div class="sub">Tự đi quanh vùng: săn yêu, làm việc trên bản đồ, ghé nơi gần có việc. Bấm Bắt đầu sẽ thu panel; tạm dừng/dừng ở nút cạnh icon tiên.</div></div>
  ${injLine}
  <div class="bar">
    <button class="btn pri" id="af-toggle">▶ Bắt đầu (thu panel)</button>
    <button class="btn" id="af-export">Xuất log</button>
  </div>
  <div class="bar" style="flex-wrap:wrap;gap:8px">
    <label class="sub"><input type="checkbox" id="af-san" ${o.onlySanYeu?'checked':''}> Chỉ săn yêu</label>
    <label class="sub"><input type="checkbox" id="af-near" ${o.preferNear!==false?'checked':''}> Ưu tiên nơi gần</label>
    <label class="sub"><input type="checkbox" id="af-places" ${o.includeNearPlaces!==false?'checked':''}> Ghé thành thị / trấn gần</label>
    <label class="sub"><input type="checkbox" id="af-nodes" ${o.includeMapNodes!==false?'checked':''}> Việc trên bản đồ</label>
    <label class="sub"><input type="checkbox" id="af-wild" ${o.includeWildSan!==false?'checked':''}> Săn yêu hoang dã</label>
    <label class="sub"><input type="checkbox" id="af-herb" ${o.includeHaiThuoc?'checked':''}> Hái thuốc dại</label>
    <label class="sub"><input type="checkbox" id="af-toc" ${o.tocChien?'checked':''}> Tốc chiến (khi game cho phép)</label>
    <label class="sub"><input type="checkbox" id="af-tudia" ${o.skipTuDia?'checked':''}> Tránh tử địa / khó thắng</label>
    <label class="sub"><input type="checkbox" id="af-choose" ${o.autoChoose?'checked':''}> Tự chọn lựa chọn</label>
    <label class="sub"><input type="checkbox" id="af-heal" ${o.autoHeal?'checked':''}> Tự dùng thuốc chữa thương</label>
    <label class="sub"><input type="checkbox" id="af-pauseheal" ${o.pauseIfNoHeal?'checked':''}> Dừng nếu hết thuốc (nặng+)</label>
  </div>
  <div class="bar">
    <label class="sub grow">Sau thắng (tù binh)
      <select id="af-xutri">
        <option value="tha" ${o.xuTri==='tha'?'selected':''}>Tha mạng</option>
        <option value="ket_lieu" ${o.xuTri==='ket_lieu'?'selected':''}>Kết liễu</option>
        <option value="phe" ${o.xuTri==='phe'?'selected':''}>Phế tu vi</option>
        <option value="suu_hon" ${o.xuTri==='suu_hon'?'selected':''}>Sưu hồn (nếu có)</option>
      </select>
    </label>
    <label class="sub grow">Lùng con đầu đàn (săn yêu)
      <select id="af-apex">
        <option value="fallback" ${o.apex==='fallback'?'selected':''}>Săn thường trước (khi hiểm mới lùng đầu đàn)</option>
        <option value="never" ${o.apex==='never'?'selected':''}>Không bao giờ</option>
        <option value="prefer" ${(o.apex==='prefer'||o.apex==='always')?'selected':''}>Ưu tiên lùng đầu đàn</option>
      </select>
    </label>
    <label class="sub grow">Né săn quái (tên, cách nhau dấu phẩy)
      <input id="af-avoid" type="text" value="${E(o.avoidBeasts||'')}">
    </label>
    <label class="sub grow">Dừng khi thọ nguyên còn ≤ (năm)
      <input id="af-minlife" type="number" min="0" step="1" value="${o.minLifeYears??3}">
    </label>
    <label class="sub grow">Đuổi theo / buông tha
      <select id="af-pursuit">
        <option value="release" ${o.pursuit==='release'?'selected':''}>Buông tha (an toàn)</option>
        <option value="chase" ${o.pursuit==='chase'?'selected':''}>Đuổi theo</option>
        <option value="auto" ${o.pursuit==='auto'?'selected':''}>Tự động (tha nếu đang thương)</option>
      </select>
    </label>
  </div>
  <div class="sum" id="af-stats">OK ${AutoFarm.stats.ok} · bỏ ${AutoFarm.stats.skip} · lỗi ${AutoFarm.stats.err} · chữa ${AutoFarm.stats.heal||0}${AutoFarm.running?(AutoFarm.paused?' · TẠM DỪNG':' · ĐANG CHẠY'):''}</div>
  <div class="panel" style="max-height:32vh;overflow:auto;font-size:12px" id="af-log">${AutoFarm.log.slice().reverse().map(x=>`<div class="sub${x.kind==='err'?' r':x.kind==='ok'?' g':''}">[${E(x.tShow||x.t||'')}] ${E(x.msg)}</div>`).join('')||'<div class="sub">Chưa có nhật ký. Bấm Bắt đầu rồi gửi file log nếu lỗi.</div>'}</div>
  <div class="sum">${list.length} mục tiêu gần → xa</div>
  ${list.map(t=>`<article class="card ${t.danger.rank>=2?'d'+t.danger.rank:''}" data-slot="${E(t.slot)}" data-title="${E(t.title)}">
    <div class="ico">戰</div>
    <div><b>${E(t.title)}</b><small>${E(t.enc)} · ${E(t.slot)} · ${E(t.mode||'')}</small></div>
    <div class="side">${N(t.travel)?fmtTime(t.travel):'—'}<small>${N(t.miles)?fmtMiles(t.miles):''}</small></div>
    <div class="tags"><span class="tag">${E(t.danger.label)}</span>${t.left!=null?`<span class="tag g">Còn ${t.left}/3 lần săn</span>`:''}${t.priority>=40?`<span class="tag o">Việc gấp</span>`:''}</div>
  </article>`).join('')||'<div class="empty">Không có mục tiêu phù hợp trên map hiện tại.<br>Hãy đi khám phá thêm rồi quét lại. Tắt «Chỉ ev.san_yeu» để cày rộng hơn.</div>'}`;
  $(body,'#af-toggle').onclick=()=>AutoFarm.start();
  $(body,'#af-export').onclick=()=>AutoFarm.exportLog();
  $(body,'#af-san').onchange=e=>{o.onlySanYeu=e.target.checked;VIEWS.auto()};
  $(body,'#af-near').onchange=e=>{o.preferNear=e.target.checked;VIEWS.auto()};
  $(body,'#af-places').onchange=e=>{o.includeNearPlaces=e.target.checked;VIEWS.auto()};
  $(body,'#af-nodes').onchange=e=>{o.includeMapNodes=e.target.checked;VIEWS.auto()};
  $(body,'#af-wild').onchange=e=>{o.includeWildSan=e.target.checked;VIEWS.auto()};
  $(body,'#af-herb').onchange=e=>{o.includeHaiThuoc=e.target.checked;store.set('afHaiThuoc',o.includeHaiThuoc);VIEWS.auto()};
  $(body,'#af-toc').onchange=e=>{o.tocChien=e.target.checked};
  $(body,'#af-tudia').onchange=e=>{o.skipTuDia=e.target.checked;VIEWS.auto()};
  $(body,'#af-choose').onchange=e=>{o.autoChoose=e.target.checked};
  $(body,'#af-heal').onchange=e=>{o.autoHeal=e.target.checked;store.set('afAutoHeal',o.autoHeal)};
  $(body,'#af-pauseheal').onchange=e=>{o.pauseIfNoHeal=e.target.checked};
  $(body,'#af-xutri').onchange=e=>{o.xuTri=e.target.value;store.set('xuTri',o.xuTri);toast('Đã nhớ: xử tù binh = '+o.xuTri,'ok',2200)};
  $(body,'#af-avoid').onchange=e=>{o.avoidBeasts=String(e.target.value||'');store.set('afAvoid',o.avoidBeasts);toast('Né: '+(o.avoidBeasts||'(trống)'),'ok',2000)};
  $(body,'#af-minlife').onchange=e=>{o.minLifeYears=Math.max(0,+e.target.value||0);store.set('afMinLife',o.minLifeYears);toast('Dừng khi thọ ≤ '+o.minLifeYears+' năm','ok',2000)};
  $(body,'#af-apex').onchange=e=>{o.apex=e.target.value;store.set('afApex',o.apex);toast('Lùng đầu đàn = '+o.apex,'ok',2000)};
  $(body,'#af-pursuit').onchange=e=>{o.pursuit=e.target.value;store.set('afPursuit',o.pursuit);toast('Đuổi/tha = '+o.pursuit,'ok',2000)};
};

/* ───────── Khởi động: làm mới nhẹ khi khung đang mở (giống vòng tick() của bản gốc) ───────── */
function softRender(){
  if(!ui.isOpen)return;
  const a=document.activeElement;
  if(a&&panel.contains(a)&&/INPUT|SELECT/.test(a.tagName))return;
  if(AutoFarm.running){AutoFarm.refreshLogOnly?.();return}
  VIEWS.auto();
}
let tickTimer=null,unsub=null;
function tick(){clearTimeout(tickTimer);tickTimer=setTimeout(softRender,450)}
try{unsub=g.store.subscribe?.(tick)}catch{}
const iv=setInterval(tick,5000);
const ivFab=setInterval(()=>{AutoFarm.running?fab.classList.add('running'):fab.classList.remove('running')},1000);

window.__VKAF__={
  destroy(){
    try{AutoFarm.stop()}catch{}
    try{document.getElementById(ID+'-afbar')?.remove();document.getElementById(ID+'-afstats')?.remove()}catch{}
    clearInterval(iv);clearInterval(ivFab);clearTimeout(tickTimer);
    try{unsub?.()}catch{}
    panel.remove();fab.remove();toasts.remove();styleEl.remove();
  },
  build:BUILD,ui,VIEWS,AutoFarm
};

toast('Auto Farm sẵn sàng — bấm biểu tượng 自 để mở.','ok',3500);

})();
