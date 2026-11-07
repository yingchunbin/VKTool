(()=>{
'use strict';
const BUILD='20261107-autofarm-v55',ID='vkt2',g=window.game;
if(!g?.state?.run||!g?.env?.content?.encounters||!g?.env?.world){alert('Game chưa sẵn sàng. Hãy vào một kiếp rồi chạy lại.');return}
try{window.__VKT2__?.destroy?.()}catch{}
document.getElementById(ID)?.remove();document.getElementById(ID+'-style')?.remove();document.getElementById(ID+'-fab')?.remove();

/* ───────── tiện ích chung ───────── */
const C=g.env.content,W=g.env.world;
const A=v=>Array.isArray(v)?v:[];
const N=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v));
const TP=v=>typeof v==='string'&&v?[v]:A(v);
const T=s=>String(s??'').replace(/[-]/g,'').replace(/\s+/g,' ').trim();
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:2});
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const $=(r,s)=>r.querySelector(s),$$=(r,s)=>[...r.querySelectorAll(s)];
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

/* ───────── cửa mở theo chu kỳ của bí cảnh (khớp với cách game tính) ───────── */
const seedFnv=s=>{let t=2166136261;for(let i=0;i<s.length;i++){t^=s.charCodeAt(i);t=Math.imul(t,16777619)}return t>>>0};
const seedNext=s=>{let t=(seedFnv(s)+1831565813)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
const seedInt=(s,r)=>r[0]+Math.floor(seedNext(s)*(r[1]-r[0]+1));
let noiByLoaiCache=null;
const noiByLoai=()=>noiByLoaiCache||(noiByLoaiCache=(()=>{const m=new Map();for(const d of C.noiChon?.values?.()||[])for(const l of A(d.loai))m.set(l,d);return m})());
function placeDef(slot,r=run()){const ch=r?.noiChon?.[slot];if(ch?.chuNhan)return C.noiChon?.get?.('noi.dong_phu')||null;const i=info(slot);if(!i?.slot?.co_dinh||!i.diaDanh)return null;const d=noiByLoai().get(i.diaDanh.loai)||null;return d&&ch?.biDiet!==undefined?(C.noiChon?.get?.('noi.phe_tich')||d):d}
function placeWindow(slot,r=run()){const km=placeDef(slot,r)?.khai_mo;if(!km)return null;const a=`${r.seed}|khai_mo|${slot}`,period=seedInt(`${a}|chu_ky`,km.chu_ky_nam),span=Math.min(seedInt(`${a}|mo`,km.mo_nam),period-1),phase=Math.floor(seedNext(`${a}|pha`)*period),c=r.nam-phase,u=Math.floor(c/period),open=c-u*period<span,cycle=open?u:u+1,opensAt=phase+cycle*period;return{open,cycle,opensAt,closesAt:opensAt+span,period,span}}
function closedYears(slot,r=run()){const ch=r?.noiChon?.[slot],a=N(ch?.moLai)&&+ch.moLai>+r.nam?+ch.moLai-+r.nam:0,w=placeWindow(slot,r);if(!w)return a;const s=w.open?(ch?.enteredCycle===w.cycle?w.opensAt+w.period-r.nam:0):w.opensAt-r.nam;return Math.max(a,s)}
/* Tới nơi sau t năm thì cửa có mở không, và còn mở được bao lâu */
function openOnArrival(slot,t){const r=run(),r2={...r,nam:r.nam+(N(t)?t:0)},ch=r.noiChon?.[slot];if(N(ch?.biDiet)&&+ch.biDiet<=r2.nam)return{ok:false,reason:'Đã thành phế tích'};if(ch?.chuNhan)return{ok:false,reason:'Động phủ có chủ'};const c=closedYears(slot,r2);if(c>0)return{ok:false,reason:`Còn đóng cửa ${fmtTime(c)}`};const w=placeWindow(slot,r2);let left=null;if(w)left=w.open?(ch?.enteredCycle===w.cycle?w.closesAt+w.period-r2.nam:w.closesAt-r2.nam):null;return{ok:true,left}}

/* ───────── loại nơi chốn & mức nguy hiểm ───────── */
const PLACE_KIND={sao_huyet:'Sào huyệt yêu thú',di_tich:'Di tích',khoang_mach:'Khoáng mạch',bi_canh:'Bí cảnh'};
const placeKind=i=>PLACE_KIND[String(i?.diaDanh?.loai||'')]||null;
const KIND_ICON={su_kien:'事',chien_dau:'戰',tu_luyen:'修',cua_hang:'市',bi_canh:'秘',dot_pha:'破',tong_mon:'宗',linh_mach:'脈',di_tich:'跡',sao_huyet:'巢',khoang_mach:'礦',di_bao:'寶'};
const KIND_NAME={su_kien:'Sự kiện',chien_dau:'Chiến đấu',tu_luyen:'Tu luyện',cua_hang:'Cửa hàng',bi_canh:'Bí cảnh',dot_pha:'Đột phá',tong_mon:'Tông môn',linh_mach:'Linh mạch'};

const CG_TEN={0:'Phàm nhân',1:'Luyện khí',2:'Trúc cơ',3:'Kết đan',4:'Nguyên anh',5:'Hóa thần',6:'Luyện hư',7:'Hợp đạo',8:'Đại thừa',9:'Độ kiếp'};
function cgTen(n){
  if(n==null||n==='')return'';
  const k=Math.floor(Number(n));
  if(!Number.isFinite(k))return String(n);
  return T(C.canhGioi?.get?.(k)?.ten||C.canhGioi?.get?.(String(k))?.ten||'')||CG_TEN[k]||('Cảnh '+k);
}
function cgRangeTen(a,b){
  if(a==null&&b==null)return'';
  if(b==null||a===b||Number(a)===Number(b))return cgTen(a);
  return cgTen(a)+' – '+cgTen(b);
}
function danger(slot){const i=info(slot);if(!i)return{rank:1,label:'Chưa rõ'};const self=Number(me().canhGioi??0),base=Number(i.capNen??i.canhGioi??self),d=base-self;if(d>=2)return{rank:3,label:'Tử địa'};if(d>=1)return{rank:2,label:'Nguy hiểm'};if(d<=-1)return{rank:0,label:'An toàn'};return{rank:1,label:'Ngang sức'}}

/* ───────── Dị bảo: danh mục đã đối chiếu với game ───────── */
const GUIDE=new Map([{"id":"ev.di_bao_u_hon_dien","ten":"Cửa U Hồn Điện","relic":"item.yeu_hoang_huyet_kinh","gate":[5,5],"hoiChieu":120,"diaDanh":"azgaar:marker:103","dia":{"ten":"U Hồn Điện","han":"幽魂殿","x":1110.1,"y":625.9,"cn":2.8},"chance":0.07,"baoVe":{"ten":"Hạt Hoàng Thủ Lăng","cg":5},"noi":"di_tich"},{"id":"ev.di_bao_kiem_trach","ten":"Kiếm lành giữa đầm","relic":"item.bat_chiet_kiem","gate":[5,5],"hoiChieu":120,"diaDanh":"hoang:394","dia":{"ten":"Kiếm Trạch","han":"劍澤","x":1435.6,"y":529.1,"cn":2.3},"chance":0.07,"baoVe":{"ten":"Vạn Kiếm Oán Hồn","cg":5},"check":"than_thuc +65","noi":"son_thuy"},{"id":"ev.di_bao_tien_van_dien","ten":"Đá ba mặt","relic":"item.tam_sinh_thach","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:102","dia":{"ten":"Tiên Vân Điện","han":"仙雲殿","x":1186.8,"y":645.4,"cn":2.7},"chance":0.03,"check":"dao_tam +75","noi":"di_tich"},{"id":"ev.di_bao_yeu_phong_mo","ten":"Lửa đen Yêu Phong Mộ","relic":"item.cuu_u_hoang_hoa","gate":[5,5],"hoiChieu":120,"diaDanh":"azgaar:marker:34","dia":{"ten":"Yêu Phong Mộ","han":"妖風墓","x":561,"y":257.2,"cn":4.1},"chance":0.07,"baoVe":{"ten":"Hổ Hoàng Tàn Hồn","cg":5},"noi":"di_tich"},{"id":"ev.di_bao_han_giao_linh","ten":"Vảy rồng Giao tộc","relic":"item.thai_co_long_lan","gate":[5,5],"hoiChieu":120,"chance":0.07,"baoVe":{"ten":"Giao Hoàng","cg":5},"tocYeu":"giao","noi":"hoang_da"},{"id":"ev.di_bao_kiem_dai","ten":"Chiến kỳ trên Kiếm Đài","relic":"item.doan_thien_chien_ky","gate":[5,5],"hoiChieu":120,"diaDanh":"azgaar:marker:35","dia":{"ten":"Kiếm Đài","han":"劍台","x":480.7,"y":343.5,"cn":0.1},"chance":0.07,"baoVe":{"ten":"Đoạn Thiên Chiến Hồn","cg":5},"noi":"di_tich"},{"id":"ev.bien_trieu_khu","ten":"Đêm Triều Khư","relic":"item.phong_thien_an","hoiChieu":120,"chance":0.07,"baoVe":{"ten":"Ngũ Tổ Tàn Trận","cg":5}},{"id":"ev.bien_thuyen_rong","ten":"Thuyền đầu rồng","relic":"item.thai_hu_chu","hoiChieu":120,"chance":0.03,"check":"than_thuc +100"},{"id":"ev.di_bao_hon_thap","ten":"Kinh không tiếng","relic":"item.luan_hoi_chan_kinh","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:39","dia":{"ten":"Hồn Tháp","han":"魂塔","x":1317.2,"y":691.7,"cn":2.4},"chance":0.03,"check":"ngo_tinh +70","noi":"di_tich"},{"id":"ev.di_bao_u_dien","ten":"Đèn trong U Điện","relic":"item.van_kiep_hon_dang","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:40","dia":{"ten":"U Điện","han":"幽殿","x":1530.2,"y":494.4,"cn":2.4},"chance":0.07,"baoVe":{"ten":"U Minh Quỷ Mẫu","cg":4},"noi":"di_tich"},{"id":"ev.di_bao_lan_dai","ten":"Nhẫn trên ngón xương","relic":"item.can_khon_gioi","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:141","dia":{"ten":"Lan Đài","han":"蘭台","x":344.3,"y":917.5,"cn":4.3},"chance":0.07,"baoVe":{"ten":"Cổ Chiến Khôi Lỗi","cg":5},"noi":"di_tich"},{"id":"ev.di_bao_tan_phong","ten":"Kiếm gãy trên Tàn Phong","relic":"item.toai_thien_kiem","gate":[4,5],"hoiChieu":120,"diaDanh":"hoang:291","dia":{"ten":"Tàn Phong","han":"殘峰","x":1636.8,"y":607.8,"cn":0.4},"chance":0.07,"baoVe":{"ten":"Thái Cổ Lôi Linh","cg":5},"noi":"son_thuy"},{"id":"ev.di_bao_van_dan_trung","ten":"Mộ không đọng tuyết","relic":"item.nghich_menh_dan","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:101","dia":{"ten":"Vạn Đan Trủng","han":"萬丹塚","x":1499,"y":339.3,"cn":0.3},"chance":0.07,"baoVe":{"ten":"Hạn Bạt","cg":4},"noi":"di_tich"},{"id":"ev.di_bao_tuyen_phong","ten":"Bình trên Tuyền Phong","relic":"item.cam_lo_tinh_binh","gate":[4,5],"hoiChieu":120,"diaDanh":"hoang:286","dia":{"ten":"Tuyền Phong","han":"泉峰","x":1117.3,"y":657.2,"cn":2.9},"chance":0.03,"check":"dao_tam +68","noi":"son_thuy"},{"id":"ev.di_bao_dan_coc","ten":"Mộ y gia Đan Cốc","relic":"item.than_nong_bach_thao_kinh","gate":[4,5],"hoiChieu":120,"diaDanh":"hoang:204","dia":{"ten":"Đan Cốc","han":"丹谷","x":1422.7,"y":631.7,"cn":1.9},"chance":0.03,"check":"ngo_tinh +45","noi":"son_thuy"},{"id":"ev.di_bao_xich_trung","ten":"Lò lửa Xích Trủng","relic":"item.hon_nguyen_dan_dinh","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:94","dia":{"ten":"Xích Trủng","han":"赤塚","x":665.1,"y":202.8,"cn":4.9},"chance":0.07,"baoVe":{"ten":"Âm Hỏa Hồn Vương","cg":5},"noi":"di_tich"},{"id":"ev.di_bao_van_son","ten":"Gấu ngủ Vân Sơn","relic":"item.tu_linh_chau","gate":[4,5],"hoiChieu":120,"diaDanh":"hoang:262","dia":{"ten":"Vân Sơn","han":"雲山","x":205.2,"y":614.5,"cn":2.3},"chance":0.07,"baoVe":{"ten":"Thái Nhạc Hùng","cg":5},"noi":"son_thuy"},{"id":"ev.di_bao_kim_dao_dien","ten":"Nghìn chậu đồng","relic":"item.tu_bao_bon","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:36","dia":{"ten":"Kim Đao Điện","han":"金刀殿","x":1573.7,"y":609.3,"cn":1.9},"chance":0.03,"check":"than_thuc +100","noi":"di_tich"},{"id":"ev.di_bao_bang_hon_trung","ten":"Chuông trong mộ băng","relic":"item.do_hon_linh","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:90","dia":{"ten":"Băng Hồn Trủng","han":"冰魂塚","x":308,"y":473.2,"cn":2.3},"chance":0.07,"baoVe":{"ten":"Vạn Oán Quỷ","cg":5},"noi":"di_tich"},{"id":"ev.di_bao_ho_set","ten":"Nhẫn trong hố sét","gate":[4,5],"hoiChieu":30,"check":"ngo_tinh +4","noi":"hoang_da"},{"id":"ev.di_bao_hop_ba_khoa","ten":"Hộp ba khóa","gate":[4,5],"hoiChieu":30,"check":"khi_van +8","noi":"hoang_da"},{"id":"ev.di_bao_keo_dinh","ten":"Kéo đỉnh giữa hồ","gate":[4,5],"hoiChieu":30,"check":"can_cot +4","noi":"hoang_da"}].map(x=>[x.id,x]));
function encounterLimits(enc,r=run()){const id=enc?.id,lim=enc?.limits||{},h=r?.history?.[id],lan=Number(h?.lan)||0,act=Object.values(r?.nodes||{}).filter(n=>n?.encounter===id).length,out={exhausted:false,cooldownLeft:0};if(N(lim.moi_run)&&lan+act>=+lim.moi_run)out.exhausted=true;if(N(lim.hoi_chieu_nam)&&h&&N(h.namCuoi)){const left=+h.namCuoi+ +lim.hoi_chieu_nam-(+r.nam||0);if(left>0)out.cooldownLeft=left}return out}

const BuildEngine=(()=>{const S={core:null,abort:false,pref:{},results:null};
  const ANCHORS = {
    eJ:  [/\.doDung\)!=null&&/, 'mô phỏng trận'],
    Vr:  [/\{ten:[\w$]+\.ten,drugResistTran:\{\},drugRetention:/, 'chỉ số nhân vật khi đánh'],
    Ga:  [/muc\?\?"thuong",\w=\w\.canh_gioi/, 'dựng quái'],
    Rt:  [/\(([\w$]+),([\w$]+),([\w$]+)\)\{const [\w$]+=\3\.dac_tinh\?\?\{\},[\w$]+=[\w$]+\(\3\)/, 'tính kinh mạch'],
    Tp:  ['.khuon.split(', 'khuôn kinh mạch'],
    al:  [/\(\w\.hinh\?\?\[\],\w\.xoay\)/, 'ô của mảnh'],
    Jh:  ['Món này đã có trên kinh mạch', 'kiểm tra chỗ đặt'],
    kR:  ['pillOptions:', 'tỉ lệ đột phá'],
    Hon: [/\.tran_phai\)\{if\(\w\.tang!=="dai_tong_mon"/, 'Tàng Kinh Các'],
    wr:  ['["chưa có sư môn"]', 'điều kiện thăng cấp'],
    Kn:  [/\.flags\.mon_phai;if\(typeof \w=="string"\)/, 'sư môn'],
    ke:  [/\.thoNguyen;return \w\+Math\.round\(\w\*\(\w\.lifespanBonusPct/, 'thọ nguyên'],
    Rsn: ['"inner_disciple":"core_disciple";', 'đối thủ khảo hạch'],
    ko:  [/return \w\.run\.tamMa;/, 'quái từ nhân vật'],
    Qn:  [/\[0\]\.ten:`\$\{/, 'tên cảnh giới'],
    mf:  [/\.world\.distance\(\w\.run\.viTri,\w\)\*\w\.yearsPerUnit/, 'thời gian đi đường'],
    Nin: [[/\.qua_cua\|\|\w\.treo_thuong\|\|\w\.bien_co\|\|/, /\.tien_ich\|\|![\w$]+\.dia_diem\|\|/, /\.tien_ich\|\|![\w$]+\.dia_diem\|\|[\w$]+\.an\|\|/], 'tiện ích ở một nơi'],
    H1:  [/\|ke\|\$\{\w\}\|\$\{\w\}`,\{sizeFactor:/, 'hàng trong tiệm'],
  };
  const REGEX_NAMES = {
    rn: [/function ([\w$]+)\(([\w$]+)\)\{return [\w$]+\[Math\.max\(0,Math\.min\([\w$]+,\2\)\)\]\}/, 'bảng cảnh giới'],
    fn: [/class ([\w$]+)\{constructor\(([\w$]+)\)\{this\.state=\2\}static fromSeed/, 'bộ số ngẫu nhiên'],
    No: [/(?:const |[,;])([\w$]+)=\["Tạp dịch","Ngoại môn"/, 'tên cấp bậc tông môn'],
    E1: [/function ([\w$]+)\(([\w$]+),([\w$]+),([\w$]+),([\w$]+)=0\)\{return [\w$]+\(\2,\3,\4,[\w$]+\(\2,\3,"buy",\5\)\)\}/, 'giá mua'],
    gP: [/if\(!([\w$]+)\([\w$]+,[\w$]+\)\)throw new Error\("Nơi đó còn phủ mây/, 'vùng đã khám phá'],
  };

  // Hàm cho tính năng phụ: thiếu thì chỉ tính năng đó tắt, phần còn lại vẫn chạy.
  const ANCHORS_OPT = {
    ni:  [/\.vat\[[\w$]+\]=\([\w$]+\.vat\[[\w$]+\]\?\?0\)\+[\w$]+,!0/, 'thêm đồ vào túi'],
    to:  [/tuViNam:[\w$]+\([\w$]+,!![\w$]+\.song_tu\)/, 'thông tin bế quan'],
    qw:  [/\.untilExhausted&&!/, 'tu vi còn thiếu'],
    Nb:  [/return [\w$]+\([\w$]+\.run\.nhanVat,[\w$]+,[\w$]+,[\w$]+\.tuViNam\/\(/, 'tu vi theo số năm'],
    Di:  [/\*[\w$]+\.cultivationSpeed\}const /, 'tốc độ tu luyện'],
    jan: ['{ten:"Trường thi",diem:0}', 'thi nghề'],
    bb:  ['"đã tới bậc cao nhất"];const', 'điều kiện thi nghề'],
    Lu:  ['Tay nghề còn kém quá xa', 'luyện chế'],
    Pw:  [/\{ten:`Chỉ số \(/, 'điểm luyện chế'],
    Rrn: [/\.treoThuong&&\w\.nam-\w\.treoThuong\.nam</, 'bảng treo thưởng'],
    KI:  [/\.namBongLoc\)\),\[\w,\w\]=/, 'bổng lộc'],
    KS:  ['"đã được tiến cử"', 'tiến cử'],
    Uen: ['"ngang_suc":"an_toan"', 'ước lượng trận của game'],
  };
  const REGEX_OPT = {
    kC: [[/function ([\w$]+)\(([\w$]+),([\w$]+),([\w$]+)\)\{const [\w$]+=[\w$]+\(\2\);return\{mau:/, /function ([\w$]+)\([\w$,=]{0,40}\)\{[^{}]{0,240}return\{mau:/, /function ([\w$]+)\([\w$,=]{0,40}\)\{[\s\S]{0,300}?return\{mau:[\s\S]{0,160}?huyetThem:\[\],manh:\[\]/], 'dựng kinh mạch'],
    IP: [/function ([\w$]+)\(([\w$]+),([\w$]+),([\w$]+),([\w$]+)=0\)\{return [\w$]+\(\2,\3,\4,\5,[\w$]+\(\2,\3,"sell",\5\)\)\}/, 'giá bán'],
  };

  const findAny = (src, a) => Array.isArray(a) ? (a.map((x) => findFn(src, x)).find(Boolean) || null) : findFn(src, a);
  function findFn(src, anchor) {
    let idx = -1, count = 0;
    if (typeof anchor === 'string') {
      idx = src.indexOf(anchor);
      if (idx >= 0) count = src.indexOf(anchor, idx + 1) >= 0 ? 2 : 1;
    } else {
      const re = new RegExp(anchor.source, 'g'); let m;
      while ((m = re.exec(src))) { if (count === 0) idx = m.index; count++; if (count > 1) break; }
    }
    if (count !== 1) return null;
    const j = src.lastIndexOf('function ', idx);
    if (j < 0 || idx - j > 1500) return null;
    const m = /^function ([\w$]+)\(/.exec(src.slice(j, j + 80));
    return m ? m[1] : null;
  }

  async function loadCore(progress) {
    const g = window.game;
    if (!g || !g.env || !g.env.content) throw new Error('Chưa thấy game. Hãy mở trang game, đợi tải xong rồi bấm lại dấu trang.');
    const tag = document.querySelector('script[type=module][src*="/assets/index-"]') || document.querySelector('script[type=module][src]') || { src: ((performance.getEntriesByType('resource').find((r) => /\/assets\/index-[^/]*\.js(\?|$)/.test(r.name)) || {}).name) };
    if (!tag.src) throw new Error('Không tìm thấy file code chính của game.');
    const url = tag.src, base = url.slice(0, url.lastIndexOf('/') + 1);
    progress('Đang tải code game…');
    let src = await (await fetch(url)).text();
    const names = {}, missing = [];
    for (const [k, [a, label]] of Object.entries(ANCHORS)) { const n = findAny(src, a); if (n) names[k] = n; else missing.push(label); }
    for (const [k, [re, label]] of Object.entries(REGEX_NAMES)) { const m = re.exec(src); if (m) names[k] = m[1]; else missing.push(label); }
    // Bản mới của game: hàm tính kinh mạch tách thành hàm trong (t,n,e) + hàm bọc có cache (t,n)
    if (names.Rt && new RegExp('function ' + names.Rt.replace(/\$/g, '\\$') + '\\([\\w$]+,[\\w$]+,[\\w$]+\\)').test(src)) {
      const m = new RegExp('function ([\\w$]+)\\(([\\w$]+),([\\w$]+)\\)\\{(?:(?!function ).){0,900}?=' + names.Rt.replace(/\$/g, '\\$') + '\\(\\2,\\3,[\\w$]+\\)', 's').exec(src);
      if (m) names.Rt = m[1]; else missing.push('tính kinh mạch (bọc)');
    }
    // Bản mới của game: kiểm tra món (t,n,e,i) tách khỏi hàm kiểm tra chỗ đặt (t,n,e,i=-1)
    if (names.Jh && !new RegExp('function ' + names.Jh.replace(/\$/g, '\\$') + '\\([\\w$]+,[\\w$]+,[\\w$]+,[\\w$]+=-1\\)').test(src)) {
      const m = new RegExp('function ([\\w$]+)\\([\\w$]+,[\\w$]+,[\\w$]+,[\\w$]+=-1\\)\\{(?:(?!function ).){0,400}?' + names.Jh.replace(/\$/g, '\\$') + '\\(', 's').exec(src);
      if (m) names.Jh = m[1]; else missing.push('kiểm tra chỗ đặt (bọc)');
    }
    if (names.Tp) {
      const m = new RegExp(`function ([\\w$]+)\\(([\\w$]+),([\\w$]+)\\)\\{return ${names.Tp.replace(/\$/g, '\\$')}\\(([\\w$]+)\\(\\2,\\3\\)\\)\\}`).exec(src);
      if (m) names.xo = m[1]; else missing.push('lưới kinh mạch');
    }
    const optMissing = [];
    for (const [k, [a, label]] of Object.entries(ANCHORS_OPT)) { const n = findAny(src, a); if (n) names[k] = n; else optMissing.push(label); }
    for (const [k, [re, label]] of Object.entries(REGEX_OPT)) {
      let m = null; for (const r of (Array.isArray(re) ? re : [re])) { m = r.exec(src); if (m) break; }
      let n = m ? m[1] : null;
      if (!n && k === 'kC') n = findFn(src, /huyetThem:\[\],manh:\[\],daLinhNgo:\[\],cho:\{/);
      if (n) names[k] = n; else optMissing.push(label);
    }
    { const m = /,([\w$]+)=\(([\w$]+),([\w$]+),([\w$]+)\)=>\2\.world\.info\(\4\)\.capNen-[\w$]+\(\3\.nhanVat\),([\w$]+)=([\w$]+)=>[\w$]+\.find\(([\w$]+)=>\6<=\7\.max\)/.exec(src); if (m) { names.ua = m[1]; names.is = m[5]; } else optMissing.push('độ nguy hiểm'); }
    let PO = 30; { const m = /,PO=([\w$]+)[,;]/.exec(src); if (m) { const v = new RegExp('[,; ]' + m[1].replace(/\$/g, '\\$') + '=(\\d+(?:\\.\\d+)?)').exec(src); if (v) PO = +v[1]; } }
    
    // Đường dẫn tương đối → tuyệt đối (vì bản sao chạy từ blob:)
    src = src.replace(/from"\.\//g, 'from"' + base).replace(/import\("\.\//g, 'import("' + base);
    // Bản sao chạy từ blob: nên import.meta.url phải trỏ về file gốc của game
    src = src.replace(/import\.meta\.url/g, JSON.stringify(url));
    // Không cho bản sao khởi động lại giao diện game
    // Bản mới (index-DOzQvZmM…): const $b=u8t.createRoot(...hud...);async function Dwe(){...} ... Dwe().catch(...)
    // __tuTienReady không còn nằm sát trước lời gọi boot như bản cũ → phải lấy tên hàm boot TRƯỚC khi thay createRoot.
    let ok1 = false, ok2 = false;
    const bootM = /createRoot\(document\.getElementById\("hud"\)\);async function ([\w$]+)\(\)/.exec(src);
    src = src.replace(/((?:[\w$]+\(\);)*)const ([\w$]+)=[\w$]+\.createRoot\(document\.getElementById\("hud"\)\)/, (_, __, v) => { ok1 = true; return `const ${v}={render(){}}`; });
    // Cũ: ...{__tuTienReady:!0})})boot().catch(
    src = src.replace(/(__tuTienReady:!0\}\)\})([\w$]+)\(\)\.catch\(/, (_, a) => { ok2 = true; return a + 'Promise.resolve().catch('; });
    // Mới: chặn <bootFn>().catch( (tên lấy từ ngay sau createRoot)
    if (!ok2 && bootM) {
      const reBoot = new RegExp('([;}\\s])' + bootM[1].replace(/\$/g, '\\$') + '\\(\\)\\.catch\\(');
      src = src.replace(reBoot, (_, a) => { ok2 = true; return a + 'Promise.resolve().catch('; });
    }
    if (!ok1 || !ok2) throw new Error('Game vừa đổi cách khởi động nên tool chưa chạy được. Hãy chụp màn hình này gửi Claude để sửa tool. (ok1=' + ok1 + ', ok2=' + ok2 + ', boot=' + ((bootM && bootM[1]) || '?') + ')');
    src = src.replace(/window\.addEventListener\("contextmenu",/, 'void("contextmenu",');
    if (names.Uen) {
      const fi = src.indexOf('function ' + names.Uen + '(');
      if (fi >= 0) {
        const seg = src.slice(fi, fi + 2000);
        const seg2 = seg.replace(/if\(([\w$]+)\(\{ta:([\w$]+),dich:([\w$]+)\}\)===0\)return\{level:"unknown",enemy:[\w$]+\.ten\};(const [\w$]+=[\w$]+\([\w$]+,[\w$]+\);return\{)/, (_, g, a, b, rest) => `const __vkAn=${g}({ta:${a},dich:${b}})===0;${rest}an:__vkAn,`);
        if (seg2 !== seg) src = src.slice(0, fi) + seg2 + src.slice(fi + 2000);
      }
    }
    src += `\n;export const __VKT={${Object.entries(names).map(([k, v]) => k + ':' + v).join(',')}};`;
    progress('Đang dựng bộ tính toán…');
    const blobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const mod = await import(blobUrl);
    URL.revokeObjectURL(blobUrl);
    const K = mod.__VKT;
    K.bundle = url.split('/').pop();
    K.optMissing = optMissing; K.PO = PO; K.lost = missing;
    const LABELS = { xo: 'lưới kinh mạch' }; for (const o of [ANCHORS, REGEX_NAMES, ANCHORS_OPT, REGEX_OPT]) for (const [k, v] of Object.entries(o)) LABELS[k] = v[1];
    K.labels = LABELS; K.has = (...ks) => ks.every((k) => K[k]);
    K.need = (feature, ...ks) => { const bad = ks.filter((k) => !K[k]); if (bad.length) throw new Error(`Tính năng "${feature}" cần hàm game [${bad.map((k) => LABELS[k] || k).join(', ')}] mà tool chưa nhận ra sau lần cập nhật game này. Các tính năng khác vẫn dùng bình thường. Mở tab Chẩn đoán để lấy báo cáo gửi Claude.`); };
    return K;
  }

  // ───────────────────────── 2. Tiện ích ─────────────────────────
  const G = () => window.game;
  const C = () => G().env.content;
  const clone = (x) => structuredClone(x);
  const sleep0 = () => new Promise((r) => setTimeout(r, 0));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HE = { kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ', bang: 'Băng', loi: 'Lôi', phong: 'Phong', am: 'Ám', vo_sac: 'Vô sắc' };
  const heTen = (h) => HE[h] ?? h;

  const nvNow = () => clone(G().state.run.nhanVat);

  // ───────────────────────── 3. Mô phỏng trận ─────────────────────────
  const enemyRosterCache=new Map();
  // Trận mẫu: CHỈ quái muc=tinh_anh|boss (đọc từ content). Không lấy thuong, không dùng danh sách ID cố định.
  // Ma trận: cùng cảnh giới × 4 tiểu cảnh (0..3); hơn 1 cảnh giới × tiểu cảnh đầu (0).
  function allGameEnemies(cg,tcP=0){
    const K=S.core,c=C(),MAX_BASE=12;
    const key=`${K.bundle||'game'}|${cg}|elite-boss|cg4tc+cg1tc0|${c.enemies.size}|${MAX_BASE}`;
    if(enemyRosterCache.has(key))return enemyRosterCache.get(key);
    // Chỉ lấy định nghĩa gốc có muc tinh_anh hoặc boss — không ép muc lên quái thường
    const pool=[...c.enemies].filter(([,def])=>{
      const m=def&&def.muc;
      return m==='tinh_anh'||m==='boss';
    }).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
    const picked=[];
    if(pool.length<=MAX_BASE)picked.push(...pool);
    else{
      const used=new Set();
      // rải đều theo index để đủ boss + tinh anh, tránh cụm ID cố định
      for(let i=0;i<MAX_BASE;i++){
        const at=Math.min(pool.length-1,Math.floor(i*(pool.length-1)/(MAX_BASE-1)));
        const x=pool[at];
        if(!used.has(x[0])){used.add(x[0]);picked.push(x)}
      }
      // bảo đảm có ít nhất vài boss nếu pool còn
      const bosses=pool.filter(([,d])=>d.muc==='boss');
      for(const x of bosses){
        if(picked.length>=MAX_BASE)break;
        if(!used.has(x[0])){used.add(x[0]);picked.push(x)}
      }
    }
    const out=[];
    const selfCg=Math.max(0,Number(cg)||0);
    // cùng cảnh giới: 4 tiểu cảnh giới
    const sameTcs=[0,1,2,3];
    // hơn 1 cảnh giới: chỉ tiểu cảnh đầu
    const higherTcs=[0];
    for(const [id,def] of picked){
      const muc=def.muc; // tinh_anh | boss — giữ nguyên từ content
      for(const tc of sameTcs){
        try{
          out.push({id:`${id}|cg${selfCg}|tc${tc}|${muc}`,baseId:id,realm:selfCg,tc,muc,E:K.Ga({...def,canh_gioi:selfCg,tieu_canh_gioi:tc},c,{muc})});
        }catch{}
      }
      for(const tc of higherTcs){
        try{
          out.push({id:`${id}|cg${selfCg+1}|tc${tc}|${muc}`,baseId:id,realm:selfCg+1,tc,muc,E:K.Ga({...def,canh_gioi:selfCg+1,tieu_canh_gioi:tc},c,{muc})});
        }catch{}
      }
    }
    enemyRosterCache.set(key,out);return out
  }
  const benchEnemies=allGameEnemies;
  function fight(P, E) {
    try { return S.core.eJ(clone(P), clone(E), {}); } catch { return { thang: false, nHiep: 30, khiHuyetThapNhat: 0, stTa: 0 }; }
  }

  // ───────────────────────── 4. Tối ưu kinh mạch ─────────────────────────

  const BUILD_TAGS={tu_do:[],kiem:['kiem'],the:['the'],phat:['phat'],ma:['ma','nghich'],doc:['doc'],hop_hoan:['hop_hoan'],thi:['thi'],quy:['quy'],ngu_thu:['ngu_thu'],khoi_loi:['khoi_loi'],phu:['phu'],tran:['tran'],dan:['dan'],khi:['khi'],am:['am']};
  const NL_BUILD={ngu_thu:'thu',khoi_loi:'khoi_loi',doc:'trung',thi:'thi',quy:'hon'};
  // Khớp lối: tag trường phái; ngự linh theo loại; lối theo hệ (he_*) và Ám tu theo hệ "am" (content he_am).
  const schoolMatch=(school,tags,raw,it)=>{
    if(tags.some(t=>raw.includes(t)))return true;
    if(school==='doc'&&(raw.includes('doc')||raw.some(t=>String(t).includes('doc'))))return true;
    if(NL_BUILD[school]!==undefined&&it?.ngu_linh?.loai===NL_BUILD[school])return true;
    if(school==='am'||school==='he_am'){
      const hs=A(it?.he);
      if(hs.includes('am')||raw.includes('am'))return true;
    }
    if(typeof school==='string'&&school.startsWith('he_')){
      const elem=school.slice(3);
      if(A(it?.he).includes(elem))return true;
    }
    return false;
  };
  function itemElements(it){const hs=A(it?.he);return hs.length?hs:['vo_sac']}
  function itemAlignment(it){const raw=[...A(it?.tag),...TP(it?.tran_phai)].map(String);return raw.some(x=>['ma','nghich','quy','thi','ta','ta_dao'].includes(x))?'ta':'chinh'}
  function chosenElements(){const p=S.pref||{},subs=A(p.subs).filter(x=>x&&x!=='none'&&x!==p.mainElement);return{main:p.mainElement||'auto',subs}}
  function preferenceScore(manh,mode){const p=S.pref||{},tags=BUILD_TAGS[p.school]||[],chosen=chosenElements(),Cc=C();let z=0;for(const q of manh){const it=Cc.items.get(q?.m?.item||q?.item);if(!it)continue;const raw=[...A(it.tag),...TP(it.tran_phai)],hs=itemElements(it);if(schoolMatch(p.school,tags,raw,it))z+=mode==='danh'?55:mode==='tu'?70:60;if(chosen.main!=='auto'&&hs.includes(chosen.main))z+=mode==='danh'?10:12;for(const [i,h]of chosen.subs.entries())if(hs.includes(h))z+=Math.max(2,8-i);const align=itemAlignment(it);if(p.alignment&&p.alignment!=='auto')z+=align===p.alignment?14:-18}return z}
  function schoolStats(manh){const school=S.pref?.school||'tu_do';if(school==='tu_do')return{main:school,total:manh.length,matched:manh.length,need:0,deficit:0};let total=0,matched=0;for(const q of manh){const it=C().items.get(q?.m?.item||q?.item);if(!it)continue;total++;const tags=BUILD_TAGS[school]||[],raw=[...A(it.tag),...TP(it.tran_phai)];if(schoolMatch(school,tags,raw,it))matched++}const pw=Number((S.pref&&(S.pref.pathW??S.pref.w))||0);const need=total?(pw>=2?Math.ceil(total*0.5):Math.floor(total/2)+1):0;return{main:school,total,matched,need,deficit:Math.max(0,need-matched)}}
  function schoolDominanceScore(manh){
    const x=schoolStats(manh);
    if(x.main==='tu_do'||x.total<2)return 0;
    // Cần đa số mảnh theo lối (game: phủ lối / ô tà mC=1/3)
    if(x.deficit)return -8000*x.deficit + 100*x.matched;
    return 2000*x.matched;
  }
  // Game: mC=1/3 — ô tà trên các ô đang thông ≥ 1/3 → path = tà; ngược lại chính
  // Đồng thời độ phủ lối (số ô mảnh khớp lối / tổng ô mảnh thông) nên > 1/3 khi đã chọn lối
  function pathShareInfo(manh){
    const c=C(), school=S.pref?.school||'tu_do';
    const tags=BUILD_TAGS[school]||[];
    let cells=0, matchCells=0, evilCells=0;
    const pieces=[];
    for(const q of manh){
      const id=q?.m?.item||q?.item; const it=c.items.get(id); if(!it)continue;
      const n=q.cells?q.cells.length:(Array.isArray(it.hinh)?it.hinh.flat().filter(Boolean).length:4);
      cells+=n;
      const raw=[...A(it.tag),...TP(it.tran_phai)];
      if(school!=='tu_do'&&schoolMatch(school,tags,raw,it))matchCells+=n;
      const evil=itemAlignment(it)==='ta'||raw.some(t=>['ma','nghich','quy','thi','doc','hop_hoan','ta'].includes(String(t)));
      if(evil)evilCells+=n;
      pieces.push({id,n,match:school==='tu_do'||schoolMatch(school,tags,raw,it),evil});
    }
    const mC=1/3;
    const shareMatch=cells?matchCells/cells:0;
    const shareEvil=cells?evilCells/cells:0;
    const wantTa=TA_BUILDS_B.includes(school)||(S.pref&&S.pref.alignment==='ta');
    const path=shareEvil>=mC-1e-9?'ta':'chinh';
    return {cells,matchCells,evilCells,shareMatch,shareEvil,path,wantTa,mC,okPath:school==='tu_do'?true:(shareMatch>=mC-1e-9),okAlign:wantTa?(path==='ta'):(path==='chinh')};
  }
  function pathShareScore(manh){
    const p=pathShareInfo(manh);
    const pw=Number((S.pref&& (S.pref.pathW??S.pref.w))||0);
    let s=0;
    // Phủ lối: khi đã chọn lối, muốn càng cao càng tốt; <1/3 phạt nặng; pw>=2 muốn >=50%
    const need=pw>=2?0.5:pw>=1?1/3:0;
    if(need>0&&p.shareMatch<need-1e-9)s-=50000*(need-p.shareMatch);
    else s+=8000*p.shareMatch;
    // Đếm món khớp lối
    const st=schoolStats(manh);
    if(st.main!=='tu_do'){
      s+=st.matched*1200;
      s-=st.deficit*15000;
      // pw>=1: mỗi món ngoài lối bị phạt
      if(pw>=1)s-=Math.max(0,st.total-st.matched)*(pw>=2?800:350);
    }
    if(!p.okAlign)s-=25000;
    else s+=3000;
    return s;
  }
  function ruleAudit(nv,R){const pieces=[];for(let i=0;i<A(nv.kinhMach?.manh).length;i++){const m=nv.kinhMach.manh[i],it=C().items.get(m.item),rm=A(R.manh)[i];if(!it)continue;pieces.push({id:m.item,name:it.ten,alignment:itemAlignment(it),elements:itemElements(it),connected:Boolean(rm?.thong),color:rm?.mau??1,generation:rm?.sinhKhac??1,intrinsic:rm?.noiTai??1,route:rm?.kinhLo??1,acupoint:rm?.huyet??1,isEvil:itemAlignment(it)==='ta'&&it.loai==='cong_phap'})}return{pieces,dead:pieces.filter(x=>!x.connected).length,evilActive:pieces.filter(x=>x.isEvil&&x.connected).length,evilTotal:pieces.filter(x=>x.isEvil).length}}
  function meridianQuality(R,P,mode){const live=(R.manh||[]).filter(Boolean),dead=live.filter(x=>!x.thong).length,connected=live.length-dead,heSo=live.reduce((a,x)=>a+(x.heSo||0),0),huyet=live.filter(x=>(x.huyet||1)>1).length,nghich=R.diemNghich||0,ll=P.linhLucMoiLuot||0,maxll=P.linhLucToiDa||ll*3,costs=(P.chieu||[]).filter(x=>x.dang&&x.phi>0).map(x=>x.phi),minCost=costs.length?Math.min(...costs):0,maxCost=costs.length?Math.max(...costs):0,castReady=!minCost||ll>=minCost,burstReady=!maxCost||maxll>=maxCost;
    // nghịch: game trừ đột phá 3%/điểm (trần 15%) — mode tu gần như không chấp nhận
    let score=connected*3-dead*200000-nghich*(mode==='tu'?5000:mode==='danh'?20:80);
    // danh: bắt buộc hồi/lượt >= chiêu rẻ nhất; thưởng nếu >= tổng phi mọi chiêu đang có
    const sumCost=costs.reduce((a,b)=>a+b,0);
    const sustain= !sumCost || ll>=sumCost;
    if(mode==='danh')score+=ll*6+(castReady?40:-8000)+(sustain?50:-2500)+(burstReady?15:-200);
    else if(mode==='tu')score+=ll*1+(castReady?5:0);
    else score+=ll*3+(castReady?20:-1500)+(sustain?15:-400);
    return{score,dead,connected,heSo,huyet,nghich,ll,maxll,minCost,maxCost,castReady,burstReady}}
  function meridianAudit(nv,R,P){const Cc=C(),roles={tam:0,dau:0,phap:0,bao:0},pieces=[];for(let i=0;i<(nv.kinhMach.manh||[]).length;i++){const m=nv.kinhMach.manh[i],it=Cc.items.get(m.item),rm=(R.manh||[])[i];if(!it)continue;let role='Khác';if(it.loai==='cong_phap'){if(it.chieu){roles.dau++;role='Đấu pháp'}else{roles.tam++;role='Tâm pháp'}}else if(it.loai==='phap_khi'){if(it.chieu){roles.phap++;role='Pháp khí'}else{roles.bao++;role='Bảo vật'}}pieces.push({id:m.item,ten:it.ten,role,thong:!!rm?.thong,heSo:rm?.heSo||0,huyet:(rm?.huyet||1)>1,kinhLo:rm?.kinhLo||1,mau:rm?.mau||1,sinhKhac:rm?.sinhKhac||1,noiTai:rm?.noiTai||1})}return{roles,pieces,...meridianQuality(R,P,'danh')}}
  function makeEval(nv0,enemies,mode){const K=S.core,c=C(),cache=new Map();return manh=>{const key=mode+'|'+manh.map(p=>p.key).sort().join('|');if(cache.has(key))return cache.get(key);const nv=clone(nv0);nv.kinhMach.manh=manh.map(p=>({...p.m}));const R=K.Rt(nv,c),P=K.Vr(nv,c),mq=meridianQuality(R,P,mode),dead=mq.dead;let fightScore=0,wins=0;if(!dead)for(const{E}of enemies){const r=fight(P,E),hp=Math.max(0,Math.min(1,(r.khiHuyetThapNhat||0)/Math.max(1,P.khiHuyetToiDa))),dealt=Math.min(1,(r.stTa||0)*Math.max(1,r.nHiep||1)/Math.max(1,E.khiHuyetToiDa));if(r.thang){wins++;fightScore+=100+30*hp+50/Math.max(1,r.nHiep||1)}else if(r.ketQua&&r.ketQua.enemyFled){wins++;fightScore+=70+15*hp}else fightScore+=45*dealt}const toc=R.biDong?.toc_do||0,dp=R.biDong?.dot_pha||0,ktm=R.biDong?.khang_tam_ma||0,nghich=mq.nghich||0;
      // Code game: phản phệ đột phá = min(0.15, 0.03*diemNghich*phanPhe); trần công pháp dot_pha = 0.12 (md)
      // Điểm nghịch: mảnh tương khắc kề nhau / nằm quá nửa trên ô khắc (tooltip game)
      const phaPhe=Math.min(0.15,0.03*nghich),dpEff=Math.min(0.12,Math.max(0,dp));
      // Độ lấp: số ô bị mảnh chiếm (khuyến khích xếp đầy hơn khi giả định)
      const filled=manh.reduce((a,p)=>a+(p.cells?p.cells.length:0),0);
      const nPieces=manh.length;
      let score=-dead*1e12;
      if(mode==='danh'){
        // Mục tiêu chính: số trận thắng. Lấp ô chỉ phụ. Đủ linh lực ra chiêu.
        const costs=(P.chieu||[]).filter(x=>x.dang&&x.phi>0).map(x=>x.phi);
        const minC=costs.length?Math.min(...costs):0;
        const sumC=costs.reduce((a,b)=>a+b,0);
        const ll=P.linhLucMoiLuot||0;
        const nChieu=costs.length;
        if(minC&&ll<minC)score-=50000; // không ra nổi chiêu → gần như loại
        else if(sumC&&ll<sumC)score-=5000;
        if(nChieu<1)score-=20000; // không có chiêu đánh
        // Thắng trận vẫn là chính; lấp ô phụ nhưng đủ mạnh để không để lưới trống (đồ đã đúng cảnh)
        score+=wins*2500+fightScore*2.2+mq.score*0.3+toc*15+dp*8-nghich*30+filled*22+nPieces*40+ll*10+nChieu*80;
      }else if(mode==='tu'){
        // Tu luyện: toc + đột phá thực; ưu tiên 0 nghịch nhưng vẫn thưởng lấp đầy khi nghịch không tăng
        const netBreak=dpEff-phaPhe;
        score+=toc*2500+netBreak*8000+ktm*420+mq.connected*50+fightScore*.05;
        score+=filled*30+nPieces*55;
        // 1 điểm nghịch ≈ mất rất nhiều — không đổi lấy toc nhỏ
        score-=nghich*25000;
        if(nghich>0)score-=8000;
      }else{
        // Cân bằng: vẫn cần thắng tối thiểu + tu, nhưng phải lấp mạch (trước đây để trống nhiều)
        const combat=Math.max(0,fightScore),cult=Math.max(0,toc*2200+(dpEff-phaPhe)*5000+ktm*240);
        const floorPenalty=(wins<Math.max(1,Math.floor(enemies.length*.35))?-2e5:0)+(toc<=0?-15000:0);
        score+=wins*120+combat*.5+cult*.45+mq.score+floorPenalty-nghich*150+filled*32+nPieces*60;
      }
      score+=preferenceScore(manh,mode)+schoolDominanceScore(manh)+pathShareScore(manh);
      const rules=ruleAudit(nv,R),audit=meridianAudit(nv,R,P),school=schoolStats(manh);
      const out={s:score,wins,n:enemies.length,P,R,mq,enemyCount:enemies.length,rules,audit,school};
      if(cache.size>3000)cache.clear();cache.set(key,out);return out}}
  function buildCandidates(nv0, hypo=false) {
    const K = S.core, c = C();
    const cg = nv0.canhGioi || 0;
    const p = S.pref || {};
    const school = p.school || 'tu_do';
    const strict = !!(school && school !== 'tu_do' && Number(p.pathW||p.w||0) >= 2);
    let pool;
    if (!hypo) {
      // Cùng rule với giả định, chỉ giới hạn trong túi
      const pw = Number(p.pathW || p.w || 0);
      const tags0 = BUILD_TAGS[school] || [];
      pool = Object.keys(nv0.tuiDo || {}).filter((id) => {
        const it = c.items.get(id);
        if (!it || (it.loai !== 'cong_phap' && it.loai !== 'phap_khi') || !it.hinh) return false;
        if ((it.canh_gioi ?? 0) > cg) return false;
        const raw = [...A(it.tag), ...TP(it.tran_phai)].map(String);
        const match = school === 'tu_do' || schoolMatch(school, tags0, raw, it);
        const isTam = it.loai === 'cong_phap' && !it.chieu;
        if (school !== 'tu_do' && pw >= 3 && !match) return false;
        if (school !== 'tu_do' && pw >= 2 && !match && !isTam) return false;
        return true;
      });
      if (school && school !== 'tu_do') {
        pool.sort((a, b) => {
          const ia = c.items.get(a), ib = c.items.get(b);
          const ma = schoolMatch(school, tags0, [...A(ia.tag), ...TP(ia.tran_phai)], ia) ? 1 : 0;
          const mb = schoolMatch(school, tags0, [...A(ib.tag), ...TP(ib.tran_phai)], ib) ? 1 : 0;
          if (mb !== ma) return mb - ma;
          return (ib.canh_gioi ?? 0) - (ia.canh_gioi ?? 0);
        });
      }
    } else {
      // Toàn bộ công pháp/pháp khí có hình, canh_gioi ≤ cảnh hiện tại (không cắt theo tier gắt)
      const scored = [];
      const modeHint = (S.pref && S.pref._mode) || '';
      // Cảnh: đồ ngoài lối chỉ cg-1..cg; đồ đúng lối được cg-2..cg (đủ lựa chọn độc/ma…)
      // Loại nghich_thien / tran_phai
      // Ngoài lối: cg-1..cg · Đúng lối: cg-3..cg (thêm 1 bậc thấp hơn để đủ mảnh lấp / phủ lối)
      const cgMin = Math.max(0, cg - 1);
      const cgMinPath = Math.max(0, cg - 3);
      const pw = Number(p.pathW || p.w || 0);
      for (const [id, it] of c.items) {
        if (!it || (it.loai !== 'cong_phap' && it.loai !== 'phap_khi') || !it.hinh) continue;
        const icg = it.canh_gioi ?? 0;
        if (icg > cg) continue;
        const tags = [...(it.tag || []), ...(typeof it.tran_phai === 'string' ? [it.tran_phai] : [])].map(String);
        if (tags.includes('nghich_thien') || it.tran_phai) continue;
        const match = school === 'tu_do' || schoolMatch(school, BUILD_TAGS[school] || [], tags, it)
          || (typeof school === 'string' && school.startsWith('he_') && (it.he || []).includes(school.slice(3)))
          || ((school === 'am' || school === 'he_am') && (it.he || []).includes('am'));
        const isTam = it.loai === 'cong_phap' && !it.chieu;
        // pathW>=2: chỉ đồ lối (+ tâm pháp vô chiêu để đủ linh lực)
        // pathW>=3: chỉ đồ lối
        if (school !== 'tu_do' && pw >= 3 && !match) continue;
        if (school !== 'tu_do' && pw >= 2 && !match && !isTam) continue;
        if (!match && icg < cgMin) continue;
        if (match && icg < cgMinPath) continue;
        const pc = it.pham_cap || 1;
        let sc = pc * 10 + (it.chieu ? (it.chieu.uy || 0) * 4 : 0)
          + ((it.bi_dong && it.bi_dong.toc_do) || 0) * 14 + ((it.bi_dong && it.bi_dong.dot_pha) || 0) * 16
          + (icg === cg ? 40 : icg === cg - 1 ? 22 : icg === cg - 2 ? 12 : 4);
        const cellsN = Array.isArray(it.hinh) ? it.hinh.flat().filter(Boolean).length : (it.hinh && it.hinh.length) || 4;
        if (cellsN <= 3) sc += 6;
        // Đúng lối: cộng rất mạnh để anneal/greedy ưu tiên hết pool lối trước
        if (match) sc += 200 + (pw >= 1 ? 150 : 0) + (pw >= 2 ? 200 : 0);
        else sc -= 40 + pw * 30;
        if (isTam) sc += 12;
        if (modeHint === 'danh') {
          if (it.chieu) sc += 60 + (it.chieu.uy || 0) * 6;
          else sc -= 8;
        }
        if (modeHint === 'tu') {
          sc += ((it.bi_dong && it.bi_dong.toc_do) || 0) * 22 + ((it.bi_dong && it.bi_dong.dot_pha) || 0) * 28;
        }
        scored.push({ id, sc });
      }
      scored.sort((a, b) => b.sc - a.sc);
      // Pool rộng hơn để anneal có chỗ lấp đầy (giới hạn vẫn cần cho máy yếu)
      pool = scored.slice(0, 260).map((x) => x.id);
    }
    const nvWork = hypo ? (() => {
      const n = clone(nv0);
      n.tuiDo = { ...(n.tuiDo || {}) };
      for (const id of pool) n.tuiDo[id] = Math.max(n.tuiDo[id] || 0, 1);
      return n;
    })() : nv0;
    const g = K.xo(c, nvWork), cand = {};
    for (const id of pool) {
      const it = c.items.get(id); if (!it) continue;
      const seen = new Set(); cand[id] = [];
      for (let xoay = 0; xoay < 4; xoay++) for (let y = 0; y < g.cao; y++) for (let x = 0; x < g.rong; x++) {
        const m = { item: id, x, y, xoay };
        let err; try { err = K.Jh(nvWork, c, m); } catch (e) { err = 'x'; }
        if (err) continue;
        const cells = K.al(g, m, it); if (!cells) continue;
        const key = id + ':' + [...cells].sort((a, b) => a - b).join(',');
        if (seen.has(key)) continue; seen.add(key);
        cand[id].push({ m, cells, key });
      }
    }
    return { cand, g, pool, hypo: !!hypo };
  }

  // Xếp tham lam nhanh (giống nút tự đặt của game): lần lượt đặt món + vị trí làm tăng điểm nhiều nhất.
  async function greedy(nv0, mode) {
    const K = S.core, c = C(), { cand } = buildCandidates(nv0, !!(S.pref && S.pref.hypo));
    const quick = (manh) => {
      const nv = clone(nv0); nv.kinhMach.manh = manh.map((p) => ({ ...p.m }));
      const R = K.Rt(nv, c);
      const uy = (R.chieu || []).reduce((a, x) => a + (x.uyLuc || x.uy || 0) / 10, 0);
      const toc = R.biDong.toc_do || 0, dp = R.biDong.dot_pha || 0;
      const w=mode==='tu'?[.35,190,120,.15]:mode==='can'?[1.05,90,55,.8]:[2.5,2,1,2.2]; // danh: linh lực + uy chiêu
      const thongAll = R.manh.every((m) => !m || m.thong);
      const P=K.Vr(nv,c),mq=meridianQuality(R,P,mode);
      const filled=manh.reduce((a,p)=>a+(p.cells?p.cells.length:0),0);
      const pack=filled*10+manh.length*20;
      const ngh=mq.nghich||0;
      if(mode==='tu'){
        const pack2=filled*30+manh.length*40;
        return (thongAll?0:-1e9)+w[0]*R.linhLuc+w[1]*toc+w[2]*dp+w[3]*uy+mq.score-ngh*25000+pack2+preferenceScore(manh,mode)+schoolDominanceScore(manh);
      }
      if(mode==='can'){
        const pack2=filled*35+manh.length*50;
        return !thongAll?-1e15:w[0]*R.linhLuc+w[1]*toc+w[2]*dp+w[3]*uy+mq.score-ngh*120+pack2+preferenceScore(manh,mode)+schoolDominanceScore(manh);
      }
      return w[0]*R.linhLuc+w[1]*toc+w[2]*dp+w[3]*uy+mq.score+(thongAll?0:-1e9)-ngh*30+pack*4+preferenceScore(manh,mode)+schoolDominanceScore(manh)+pathShareScore(manh);
    };
    let cur = [], curS = quick(cur);
    const school=S.pref?.school||'tu_do';
    const tags=BUILD_TAGS[school]||[];
    const idPath=(id)=>{
      if(!school||school==='tu_do')return 0;
      const it=c.items.get(id);if(!it)return 0;
      return schoolMatch(school,tags,[...A(it.tag),...TP(it.tran_phai)],it)?1:0;
    };
    // Greedy: ưu tiên duyệt id đúng lối trước
    const idsAll=Object.keys(cand).sort((a,b)=>idPath(b)-idPath(a));
    for (let round = 0; round < 90; round++) {
      let best = null;
      const used = new Set(cur.flatMap((p) => p.cells));
      // 40 vòng đầu: chỉ đồ lối (nếu còn); sau đó mọi món
      const pathOnly=round<45&&school&&school!=='tu_do';
      for (const id of idsAll) {
        if (cur.some((p) => p.m.item === id)) continue;
        if(pathOnly&&!idPath(id))continue;
        for (const cnd of cand[id]) {
          if (cnd.cells.some((x) => used.has(x))) continue;
          const v = quick([...cur, cnd])+(idPath(id)?5000:0);
          if (!best || v > best.v) best = { v, cnd };
        }
      }
      if (!best || best.v <= curS + 1e-9) {
        if(pathOnly){ /* hết đồ lối → chuyển pha lấp */ continue; }
        break;
      }
      cur.push(best.cnd); curS = best.v;
      if (round % 3 === 0) await sleep0();
    }
    return cur.map((p) => ({ ...p.m }));
  }

  async function anneal({ nv0, mode, iters, init, onProg, label }) {
    const enemies = benchEnemies(nv0.canhGioi, nv0.tieuCanhGioi || 0);
    const ev = makeEval(nv0, enemies, mode);
    const { cand } = buildCandidates(nv0, !!(S.pref && S.pref.hypo));
    const ids = Object.keys(cand).filter((k) => cand[k].length);
    let seed = 12345; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const overlaps = (manh, c, skip = -1) => { const used = new Set(); manh.forEach((p, i) => { if (i !== skip) p.cells.forEach((x) => used.add(x)); }); return c.cells.some((x) => used.has(x)); };
    let cur = [];
    if (init) for (const m of init) { const c = (cand[m.item] || []).find((c) => c.m.x === m.x && c.m.y === m.y && c.m.xoay === m.xoay); if (c && !overlaps(cur, c)) cur.push(c); }
    let curS = ev(cur).s, best = cur, bestS = curS;
    let T0 = init && init.length ? 10 : 40; const dSamples = [];
    for (let it = 0; it < iters; it++) {
      if (S.abort) break;
      if (it % 4 === 0) { onProg && onProg(it / iters, label); await sleep0(); }
      if (it === 40 && dSamples.length >= 5) { const mean = dSamples.reduce((a, b) => a + b, 0) / dSamples.length; T0 = Math.max(T0, mean * (init && init.length ? 0.25 : 0.6)); }
      const T = Math.max(T0 * 0.01, T0 * (1 - it / iters));
      const next = cur.slice(); const r = rnd();
      const free = () => ids.filter((id) => !next.some((p) => p.m.item === id));
      if (r < 0.62 || next.length === 0) { const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c)) continue; next.push(c); }
      else if (r < 0.72) next.splice(Math.floor(rnd() * next.length), 1);
      else if (r < 0.9) { const i = Math.floor(rnd() * next.length); const id = next[i].m.item; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c, i)) continue; next[i] = c; }
      else { const i = Math.floor(rnd() * next.length); const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c, i)) continue; next[i] = c; }
      const e = ev(next);
      if (it < 40 && Math.abs(e.s) < 1e9 && Math.abs(curS) < 1e9 && e.s !== curS) dSamples.push(Math.abs(e.s - curS));
      if (e.s >= curS || rnd() < Math.exp((e.s - curS) / T)) { cur = next; curS = e.s; if (e.s > bestS) { best = next; bestS = e.s; } }
    }
    const e = ev(best);
    return{manh:best.map(p=>({...p.m})),score:e.s,wins:e.wins,n:enemies.length,P:e.P,R:e.R,mq:e.mq,rules:e.rules,audit:e.audit,school:e.school,s:e.s};
  }

  // Bỏ khỏi cách xếp mọi món không thông (không có tác dụng gì), rồi chấm lại.
  function stripDead(nv, res, mode) {
    let manh = res.manh.slice();
    for (let k = 0; k < 5; k++) {
      const nv2 = clone(nv); nv2.kinhMach.manh = manh;
      const R = S.core.Rt(nv2, C());
      const keep = manh.filter((m, i) => R.manh[i] && R.manh[i].thong);
      if (keep.length === manh.length) break;
      manh = keep;
    }
    if (manh.length === res.manh.length) return res;
    const nv3 = clone(nv); nv3.kinhMach.manh = manh;
    return { ...evalCurrent(nv3, mode), manh };
  }
  function evalCurrent(nv, mode) {
    const enemies = benchEnemies(nv.canhGioi, nv.tieuCanhGioi || 0);
    const ev = makeEval({ ...clone(nv), kinhMach: { ...clone(nv.kinhMach), manh: [] } }, enemies, mode);
    const manh = nv.kinhMach.manh.map((m) => ({ m, key: m.item + ':' + m.x + ',' + m.y + ',' + m.xoay }));
    const e = ev(manh);
    return{manh:clone(nv.kinhMach.manh),score:e.s,wins:e.wins,n:enemies.length,P:e.P,R:e.R,mq:e.mq,rules:e.rules,audit:e.audit,school:e.school,s:e.s};
  }

  // ───────────────────────── 5. Vẽ kinh mạch ─────────────────────────
  const HE_COLOR = { kim:'#c3cad3', moc:'#8fb27a', thuy:'#7fa3c4', hoa:'#d58a6c', tho:'#d2b36e', loi:'#a68cc8', bang:'#b5dbe6', phong:'#9cc7b4', am:'#5b4a78', vo_sac:'#a39b8c' };
  // Biến thể nhạt/đậm cùng tông --he-* của game (khi nhiều mảnh cùng hệ)
  const BASE = { kim:['#c3cad3','#d0d6dd','#b0b8c2'], moc:['#8fb27a','#a0c08c','#7a9c68'], thuy:['#7fa3c4','#93b3cf','#6b8fad'], hoa:['#d58a6c','#e0a088','#c47a5c'], tho:['#d2b36e','#ddc288','#c4a45c'], loi:['#a68cc8','#b8a0d4','#9278b4'], bang:['#b5dbe6','#c8e6ee','#9ecbd8'], phong:['#9cc7b4','#b0d4c4','#88b5a0'], am:['#5b4a78','#6e5c8c','#4a3c64'], vo_sac:['#a39b8c','#b2aba0','#91897c'] };
  const TINT = { kim:'#e8ebef', moc:'#e4eedf', thuy:'#e2ebf2', hoa:'#f3e6df', tho:'#f3ecdf', loi:'#ebe6f3', bang:'#eaf4f7', phong:'#e6f1ec', am:'#e4e0eb', vo_sac:'#ebe8e3' };

  function drawGrid(nv, manh, mark) {
    const K = S.core, c = C();
    const nv2 = clone(nv); nv2.kinhMach.manh = manh;
    const g = K.xo(c, nv2), km = nv2.kinhMach;
    const hy = new Set(km.huyetThem || []); g.huyet.forEach((v, i) => v && hy.add(i));
    const own = {}, cols = [], used = {}, pieces = [];
    const R = K.Rt(nv2, c);
    manh.forEach((m, n) => {
      const it = c.items.get(m.item); const he = (it.he || ['vo_sac'])[0];
      const pal = BASE[he] || ['#888']; cols.push(pal[(used[he] = (used[he] || 0) + 1) % pal.length]);
      const cells = K.al(g, m, it) || []; cells.forEach((x) => (own[x] = n));
      const rm = R.manh[n];
      pieces.push({ it, cells, thong: rm ? rm.thong : false, heSo: rm ? rm.heSo : 0, onHuyet: cells.some((x) => hy.has(x)) });
    });
    // chỉ vẽ vùng có ô mở
    let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
    for (let i = 0; i < g.rong * g.cao; i++) if (km.trangThai[i] !== 'an' || own[i] !== undefined) { const x = i % g.rong, y = Math.floor(i / g.rong); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(g.rong - 1, x1 + 1); y1 = Math.min(g.cao - 1, y1 + 1);
    const Sz = 84, M = 10, W = (x1 - x0 + 1) * Sz + 2 * M, H = (y1 - y0 + 1) * Sz + 2 * M;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const d = cv.getContext('2d');
    d.fillStyle = '#f3ece0'; d.fillRect(0, 0, W, H);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * g.rong + x, px = M + (x - x0) * Sz, py = M + (y - y0) * Sz, st = km.trangThai[i];
      let fill = st === 'an' ? '#f3ece0' : (TINT[km.mau[i]] || '#ddd');
      if (own[i] !== undefined) fill = cols[own[i]];
      d.fillStyle = fill; d.fillRect(px + 2, py + 2, Sz - 4, Sz - 4);
      d.strokeStyle = '#bdb2a3'; d.lineWidth = 2; d.strokeRect(px + 2, py + 2, Sz - 4, Sz - 4);
      if (st === 'tac') { d.fillStyle = '#7a1f1a'; d.font = 'bold 38px sans-serif'; d.textAlign = 'center'; d.textBaseline = 'middle'; d.fillText('×', px + Sz / 2, py + Sz / 2); }
      if (i === g.danDien && own[i] === undefined) { d.fillStyle = '#fbf7ef'; d.fillRect(px + 5, py + 5, Sz - 10, Sz - 10); d.strokeStyle = '#7a1f1a'; d.lineWidth = 4; d.strokeRect(px + 5, py + 5, Sz - 10, Sz - 10); d.fillStyle = '#7a1f1a'; d.font = 'bold 40px serif'; d.textAlign = 'center'; d.textBaseline = 'middle'; d.fillText('丹', px + Sz / 2, py + Sz / 2 + 2); }
      if (hy.has(i)) { d.beginPath(); d.arc(px + Sz - 16, py + 16, 9, 0, 7); d.fillStyle = '#d9b228'; d.fill(); d.strokeStyle = '#7a5c00'; d.lineWidth = 1.5; d.stroke(); }
      if (mark && mark.has(i)) { d.strokeStyle = '#1a7f37'; d.lineWidth = 7; d.strokeRect(px + 8, py + 8, Sz - 16, Sz - 16); d.fillStyle = '#1a7f37'; d.font = 'bold 18px sans-serif'; d.textAlign = 'left'; d.textBaseline = 'alphabetic'; d.fillText('MỞ', px + 12, py + Sz - 12); }
    }
    pieces.forEach((p, n) => {
      const cs = new Set(p.cells); d.strokeStyle = '#1e1512'; d.lineWidth = 7;
      for (const cI of cs) {
        const x = cI % g.rong, y = Math.floor(cI / g.rong), px = M + (x - x0) * Sz, py = M + (y - y0) * Sz;
        const L = (a, b, e, f) => { d.beginPath(); d.moveTo(a, b); d.lineTo(e, f); d.stroke(); };
        if (!cs.has(cI - g.rong)) L(px, py, px + Sz, py);
        if (!cs.has(cI + g.rong)) L(px, py + Sz, px + Sz, py + Sz);
        if (!cs.has(cI - 1) || x === 0) L(px, py, px, py + Sz);
        if (!cs.has(cI + 1) || x === g.rong - 1) L(px + Sz, py, px + Sz, py + Sz);
      }
      const c0 = Math.min(...p.cells); const x = c0 % g.rong, y = Math.floor(c0 / g.rong);
      const px = M + (x - x0) * Sz + Sz / 2, py = M + (y - y0) * Sz + Sz / 2;
      d.font = 'bold 36px sans-serif'; d.textAlign = 'center'; d.textBaseline = 'middle';
      d.lineWidth = 6; d.strokeStyle = '#1e1512'; d.strokeText(String(n + 1), px, py); d.fillStyle = '#fff'; d.fillText(String(n + 1), px, py);
    });
    const legend = pieces.map((p, n) => `<div class="vk-lg"><span class="vk-sw" style="background:${cols[n]}">${n + 1}</span><b>${esc(p.it.ten)}</b> <span class="vk-mu">· ${esc((p.it.he || ['vo_sac']).map(heTen).join('/'))}${p.onHuyet ? ' · trên huyệt' : ''}${p.thong ? '' : ' · <span class="vk-bad">không thông</span>'}</span></div>`).join('');
    return `<img class="vk-img" src="${cv.toDataURL('image/png')}" alt="kinh mạch">`;
  }

    function applyLayout(target, loadout) {
    const g = G();
    if (!g.state.run || g.state.run.ketThuc) return { ok: false, msg: 'Chưa có kiếp đang chơi.' };
    const km = () => g.state.run.nhanVat.kinhMach;
    const step = (fn) => { const before = JSON.stringify(km().manh); try { fn(); } catch (e) { return String(e && e.message || e); } if (g.state.error) return g.state.error; return JSON.stringify(km().manh) === before ? 'game không nhận thao tác' : null; };
    if (loadout !== undefined) {
      const nLo = (km().loadouts || []).length || 1;
      if (loadout >= nLo) return { ok: false, msg: `Chưa mở Bộ ${loadout + 1}. Mở thêm bộ trong màn Kinh mạch của game trước (bộ 2 tốn 1.000 linh thạch).` };
      if ((km().activeLoadout || 0) !== loadout && typeof g.switchLoadout === 'function') { try { g.switchLoadout(loadout); } catch (e) { return { ok: false, msg: 'Không đổi được bộ: ' + (e.message || e) }; } if (g.state.error) { const er = g.state.error; g.store.setState({ error: undefined }); return { ok: false, msg: 'Game không cho đổi bộ: ' + er + (/Túi/.test(er) ? '. Đổi bộ cần chỗ trống trong túi để cất đồ bộ cũ: bán hoặc vứt bớt đồ rồi bấm lại.' : '') }; } }
    }
    const same = (a, b) => a.item === b.item && a.x === b.x && a.y === b.y && a.xoay === b.xoay;
    const want = target.map((m) => ({ item: m.item, x: m.x, y: m.y, xoay: m.xoay }));
    const wantItems = new Set(want.map((m) => m.item));
    const errs = [];
    const K = S.core, Cc = C();
    const grid = K.xo(Cc, g.state.run.nhanVat);
    const cellsOf = (m) => K.al(grid, m, Cc.items.get(m.item)) || [];
    const wantCells = new Set(want.flatMap(cellsOf));
    const stuck = [];
    // dời một món không cần tới chỗ không vướng cách xếp mới (khi túi đầy, không tháo được)
    const parkAway = (i) => {
      const m = km().manh[i];
      for (let xoay = 0; xoay < 4; xoay++) for (let y = 0; y < grid.cao; y++) for (let x = 0; x < grid.rong; x++) {
        const c = cellsOf({ item: m.item, x, y, xoay }); if (!c.length || c.some((q) => wantCells.has(q))) continue;
        if (!step(() => g.doiManh(i, { x, y, xoay }))) return true;
      }
      return false;
    };
    // 1. Tháo món không có trong cách xếp mới
    for (let i = km().manh.length - 1; i >= 0; i--) {
      const m = km().manh[i]; if (wantItems.has(m.item)) continue;
      const e = step(() => g.goManh(i));
      if (e) { const ten = Cc.items.get(m.item)?.ten || m.item; if (cellsOf(m).some((q) => wantCells.has(q)) ? parkAway(i) : true) stuck.push(ten); else errs.push(`Tháo ${ten}: ${e}`); }
    }
    // 2. Dời / đặt, lặp vài vòng vì có món phải chờ món khác dời đi
    for (let pass = 0; pass < 6; pass++) {
      let progress = false, pending = 0;
      for (const w of want) {
        const cur = km().manh; const idx = cur.findIndex((m) => m.item === w.item);
        if (idx >= 0 && same(cur[idx], w)) continue;
        pending++;
        const e = idx >= 0 ? step(() => g.doiManh(idx, { x: w.x, y: w.y, xoay: w.xoay })) : step(() => g.datManh(w));
        if (!e) progress = true; else if (pass === 5) errs.push(`${C().items.get(w.item)?.ten || w.item}: ${e}`);
      }
      if (!pending) break;
      if (!progress) {
        // kẹt: tháo các món còn sai chỗ rồi đặt lại ở vòng sau
        for (let i = km().manh.length - 1; i >= 0; i--) { const m = km().manh[i]; const w = want.find((x) => x.item === m.item); if (w && !same(m, w)) step(() => g.goManh(i)); }
      }
    }
    g.store && g.store.setState && g.state.error && g.store.setState({ error: undefined });
    const final = km().manh; const okAll = want.every((w) => final.some((m) => same(m, w)));
    const extra = stuck.length ? ` Túi đầy nên chưa tháo được ${stuck.join(', ')} (đã dời ra chỗ không vướng); vứt hoặc bán bớt 1 món trong túi rồi tháo nó, hoặc bấm lại.` : '';
    return { ok: okAll, msg: okAll ? `Đã xếp xong ${want.length} món vào kinh mạch${loadout !== undefined ? ' (Bộ ' + (loadout + 1) + ')' : ''}.${extra}` : 'Xếp chưa trọn: ' + (errs.slice(0, 4).join('; ') || 'có món không đặt được') + '.' + extra + ' Phần còn lại xếp tay theo ảnh.' };
  }

  async function ensureCore(progress){if(!S.core)S.core=await loadCore(progress||(()=>{}));return S.core}
  async function packFill(nv0, mode, manh0){
    // Pha 1: hết đồ đúng lối. Pha 2: lấp mọi ô trống còn đặt được (mảnh nhỏ trước), chỉ cần thông + nghịch không xấu hơn nhiều.
    const K=S.core,c=C(),{cand}=buildCandidates(nv0,!!(S.pref&&S.pref.hypo));
    const school=S.pref?.school||'tu_do';
    const tags=BUILD_TAGS[school]||[];
    const isMatch=(id)=>{
      if(school==='tu_do')return false;
      const it=c.items.get(id);if(!it)return false;
      return schoolMatch(school,tags,[...A(it.tag),...TP(it.tran_phai)],it);
    };
    // Ưu tiên mảnh ít ô để bịt lỗ
    const sizeOf=(id)=>{
      const it=c.items.get(id);if(!it||!it.hinh)return 9;
      return Array.isArray(it.hinh)?it.hinh.flat().filter(Boolean).length:(it.hinh.length||9);
    };
    const usedIds=new Set(manh0.map(m=>m.item));
    let cur=[];
    for(const m of manh0){
      const cnd=(cand[m.item]||[]).find(x=>x.m.x===m.x&&x.m.y===m.y&&x.m.xoay===m.xoay);
      if(cnd)cur.push(cnd); else usedIds.delete(m.item);
    }
    const evalN=(manh)=>{
      const nv=clone(nv0);nv.kinhMach.manh=manh.map(p=>({...p.m}));
      const R=K.Rt(nv,c),P=K.Vr(nv,c);
      const dead=(R.manh||[]).filter(x=>x&&!x.thong).length;
      const filled=manh.reduce((a,p)=>a+(p.cells?p.cells.length:0),0);
      let matchCells=0,cells=0;
      for(const p of manh){
        const n=p.cells?p.cells.length:0;cells+=n;
        if(isMatch(p.m.item))matchCells+=n;
      }
      return {n:R.diemNghich||0,dead,toc:R.biDong?.toc_do||0,dp:R.biDong?.dot_pha||0,ll:P.linhLucMoiLuot||0,uy:(P.chieu||[]).reduce((a,x)=>a+(x.uyLuc||x.uy||0),0),filled,np:manh.length,shareMatch:cells?matchCells/cells:0};
    };
    const idsBySize=Object.keys(cand).sort((a,b)=>sizeOf(a)-sizeOf(b)||(isMatch(b)-isMatch(a)));
    const tryAdd=async(preferPath,fillMode)=>{
      let base=evalN(cur);
      for(let round=0;round<120;round++){
        let best=null;
        const used=new Set(cur.flatMap(p=>p.cells));
        for(const id of idsBySize){
          if(usedIds.has(id))continue;
          const pathItem=isMatch(id);
          if(preferPath&&!pathItem)continue;
          if(!preferPath&&pathItem)continue;
          for(const cnd of cand[id]){
            if(cnd.cells.some(x=>used.has(x)))continue;
            const next=[...cur,cnd];
            const e=evalN(next);
            if(e.dead>0)continue;
            if(mode==='tu'&&e.n>base.n)continue;
            if(mode!=='tu'&&e.n>base.n+(fillMode?3:1))continue;
            let v;
            if(fillMode){
              // Lấp hố: chỉ cần thêm ô + không chết mạch
              v=cnd.cells.length*100 - sizeOf(id)*3 + 20;
              if(e.n>base.n)v-=30*(e.n-base.n);
              // phụ: không giảm ll/uy quá mạnh
              if(mode==='danh'&&e.uy<base.uy-5)v-=15;
            }else{
              v=cnd.cells.length*20+15;
              v+=(e.toc-base.toc)*40+(e.dp-base.dp)*30;
              if(mode==='danh')v+=(e.uy-base.uy)*.4+(e.ll-base.ll)*8;
              if(mode==='tu')v+=(e.toc-base.toc)*70+(e.dp-base.dp)*50;
              if(preferPath)v+=100;
              if(e.n>base.n)v-=50*(e.n-base.n);
            }
            if(!best||v>best.v)best={v,cnd,e,id};
          }
        }
        if(!best)break;
        if(fillMode&&best.v<=0)break;
        if(!fillMode&&best.v<=0&&!preferPath)break;
        cur.push(best.cnd);usedIds.add(best.id);base=best.e;
        if(round%6===0)await sleep0();
      }
      return base;
    };
    // Pha 1 — đồ lối (nếu có)
    if(school&&school!=='tu_do')await tryAdd(true,false);
    // Pha 2 — lấp hố đồ ngoài lối (ưu tiên mảnh nhỏ)
    await tryAdd(false,true);
    // Pha 3 — nếu còn đồ lối lọt khe
    if(school&&school!=='tu_do')await tryAdd(true,true);
    // Pha 4 — lấp hố lại
    await tryAdd(false,true);
    return cur.map(p=>({...p.m}));
  }
  async function optimizeOne(nv,mode,iters,onProg){
    await ensureCore();S.abort=false;if(S.pref)S.pref._mode=mode;
    const current=evalCurrent(nv,mode),nv0=clone(nv);nv0.kinhMach.manh=[];
    onProg?.(.01,'Xếp nền');
    let seed=await greedy(nv0,mode);
    onProg?.(.03,'Lấp mạch');
    seed=await packFill(nv0,mode,seed);
    const a=await anneal({nv0,mode,iters:Math.round(iters*.5),init:seed,onProg:f=>onProg?.(.05+f*.4,'Tối ưu')});
    onProg?.(.48,'Lấp lại');
    let mid=await packFill(nv0,mode,a.manh);
    const b=await anneal({nv0,mode,iters:Math.round(iters*.4),init:mid,onProg:f=>onProg?.(.5+f*.4,'Tinh chỉnh')});
    onProg?.(.90,'Lối rồi lấp hố');
    let finalManh=await packFill(nv0,mode,b.manh);
    finalManh=await packFill(nv0,mode,finalManh);
    finalManh=await packFill(nv0,mode,finalManh);
    finalManh=await packFill(nv0,mode,finalManh);
    const enemies=benchEnemies(nv.canhGioi,nv.tieuCanhGioi||0);
    const ev=makeEval(nv0,enemies,mode);
    const pack=list=>list.map(m=>({m,key:m.item+':'+m.x+','+m.y+','+m.xoay}));
    const scored=[
      {manh:a.manh,e:ev(pack(a.manh))},
      {manh:mid,e:ev(pack(mid))},
      {manh:b.manh,e:ev(pack(b.manh))},
      {manh:finalManh,e:ev(pack(finalManh))}
    ].sort((x,y)=>y.e.s-x.e.s);
    let best={manh:scored[0].manh,score:scored[0].e.s,s:scored[0].e.s,wins:scored[0].e.wins,n:enemies.length,P:scored[0].e.P,R:scored[0].e.R,mq:scored[0].e.mq,rules:scored[0].e.rules,audit:scored[0].e.audit,hypo:!!(S.pref&&S.pref.hypo)};
    best=stripDead(nv,best,mode);
    const e2=ev(pack(best.manh));
    best={...best,score:e2.s,s:e2.s,wins:e2.wins,P:e2.P,R:e2.R,mq:e2.mq,rules:e2.rules,audit:e2.audit,
      missing:(S.pref&&S.pref.hypo)?[...new Set(best.manh.map(m=>m.item).filter(id=>!((nv.tuiDo||{})[id]>0)))]:[]};
    if(current.score>=best.score&&!(current.R.manh||[]).some(x=>x&&!x.thong))best={...current,same:true};
    return{current,best,mode};
  }
  async function optimizeThree(pref,iters,onProg){
    (await ensureCore()).need('Tối ưu kinh mạch','eJ','Vr','Ga','Rt','xo','al','Jh','fn');
    S.pref=pref||{};S.abort=false;
    const nv=nvNow();
    if(S.pref.body&&S.pref.body!=='current'&&C().theChat?.has?.(S.pref.body))nv.theChat=S.pref.body;
    const out={},hypo=!!S.pref.hypo;
    for(const[i,mode]of['danh','tu','can'].entries()){
      out[mode]=await optimizeOne(nv,mode,iters,(f,l)=>onProg?.((i+f)/3,mode,l));
      if(out[mode]?.best){
        out[mode].best.hypo=hypo;
        const bag=nv.tuiDo||{};
        const need=A(out[mode].best.manh).map(m=>m.item).filter(id=>(bag[id]||0)<1);
        out[mode].best.missing=[...new Set(need)];
      }
      if(S.abort)break;
    }
    S.results=out;return out;
  }
  async function ensureItemsForManh(manh){
    const bag=G().state.run.nhanVat.tuiDo||{};
    const missing=[...new Set(A(manh).map(m=>m.item).filter(id=>(bag[id]||0)<1))];
    if(!missing.length)return{ok:true,added:[],missing:[]};
    const K=await ensureCore();
    const added=[];
    if(K.ni){
      const ctx={...G().env,run:G().state.run,meta:G().state.meta,enc:undefined,noticeLines:[]};
      for(const id of missing){try{K.ni(ctx,id,1);added.push(id)}catch(e){}}
    }
    const bag2=G().state.run.nhanVat.tuiDo||{};
    const still=missing.filter(id=>(bag2[id]||0)<1);
    return{ok:!still.length,added,missing:still};
  }
  async function apply(mode,slot,opts={}){
    const r=S.results?.[mode]?.best;if(!r)return{ok:false,msg:'Chưa có kết quả.'};
    let note='';
    if(r.hypo||opts.hypo){
      const en=await ensureItemsForManh(r.manh);
      if(en.added.length)note+='Đã thêm tạm '+en.added.length+' món vào túi. ';
      if(en.missing.length){
        const names=en.missing.slice(0,8).map(id=>C().items.get(id)?.ten||id);
        return{ok:false,msg:note+'Thiếu '+en.missing.length+' món không thêm được: '+names.join(', ')+(en.missing.length>8?'…':'')+'.'};
      }
    }
    const out=applyLayout(r.manh,slot);
    out.msg=(note||'')+(out.msg||'');
    return out;
  }
  async function applyAll(opts={}){
    const n=(G().state.run.nhanVat.kinhMach.loadouts||[]).length||1;
    const rs=[];
    for(const[m,i] of [['danh',0],['tu',1],['can',2]]){
      if(i>=n){rs.push({ok:false,msg:'Chưa mở Bộ '+(i+1)+'.'});continue}
      rs.push(await apply(m,i,opts));
    }
    return rs;
  }
  return{ensureCore,optimizeThree,apply,applyAll,stop:()=>S.abort=true,reset:()=>{S.core=null},drawGrid,nvNow,pathShareInfo,get core(){return S.core},get results(){return S.results}};
})();

/* ───────── Dữ liệu: Nhiệm vụ bản đồ / Bí cảnh / Dị bảo ───────── */
const slotLabel=slot=>{const i=info(slot);return T(i?.ten||i?.diaDanh?.ten||slot)};
const countryOf=i=>{const q=i?.quocGia;return T(C.quocGia?.get?.(q)?.ten||'')};

/* Một dòng trên bản đồ: từ điểm sự kiện hoặc nơi chốn đặc biệt */
function makeRow({key,slot,title,kind,icon,enc,tags=[],extraLeft=null,noGate=false}){
  const i=info(slot),travel=travelTo(slot),miles=milesTo(slot),hetHan=N(enc?.__han)?+enc.__han:null;
  const open=noGate?{ok:true,left:null}:openOnArrival(slot,travel);
  const expLeft=hetHan!==null?hetHan-(nowYear()+(N(travel)?travel:0)):null;
  const left=[extraLeft,expLeft,open.left].filter(N).reduce((a,b)=>Math.min(a,b),Infinity);
  const slack=Number.isFinite(left)?left:null;
  const ok=open.ok&&N(travel)&&(expLeft===null||expLeft>=0);
  return{key,slot,title,kind,icon,place:slotLabel(slot),country:countryOf(i),travel,miles,slack,ok,why:open.ok?(expLeft!==null&&expLeft<0?'Tới nơi thì đã hết hạn':''):open.reason,danger:danger(slot),tags,terrain:A(i?.diaHinh)}
}

function eventRows(){
  const r=run(),out=[],seenSlot=new Set();
  for(const [k,node] of Object.entries(r.nodes||{})){
    if(!node||typeof node!=='object'||node.viec)continue;
    const slot=node.slot||k;if(!hasSlot(slot))continue;
    const enc=node.encounter?C.encounters.get(node.encounter):null,i=info(slot),pk=placeKind(i);
    if(!enc&&!pk)continue;
    if(node.npc&&!enc)continue;
    seenSlot.add(slot);
    const tags=[],kindKey=enc?(GUIDE.has(enc.id)?'di_bao':enc.kind):(pk==='Bí cảnh'?'bi_canh':pk==='Di tích'?'di_tich':pk==='Khoáng mạch'?'khoang_mach':'sao_huyet');
    const kindName=GUIDE.has(enc?.id)?'Dị bảo':(enc?KIND_NAME[enc.kind]||'Sự kiện':pk);
    if(enc?.an)tags.push('Mật bí');
    for(const t of A(enc?.tags?.tinh_chat).slice(0,2))tags.push({co_duyen:'Cơ duyên',ky_van:'Kỳ vận',nguy_hiem:'Nguy hiểm',nhan_qua:'Nhân quả'}[t]||null);
    if(node.coDinh)tags.push('Cố định');
    const title=T(enc?.ten||slotLabel(slot));
    // Bí cảnh đã có tab «Bí cảnh & Dị bảo» — không liệt kê lại trên Bản đồ
    if(kindKey==='bi_canh'||kindName==='Bí cảnh'||pk==='Bí cảnh')continue;
    out.push(makeRow({key:`ev|${slot}|${enc?.id||''}`,slot,title,kind:kindName,icon:KIND_ICON[kindKey]||'事',enc:enc?{__han:node.hetHanNam}:null,tags:tags.filter(Boolean),noGate:Boolean(enc)}));
  }
  // Thế sự: bỏ đại hội đấu giá / tông môn tuyển đồ / tông môn đại bỉ (id từ content/world/the_cuc.yaml)
  const SKIP_WORLD=new Set(['world.dai_bi_tong_mon','world.tong_mon_tuyen_do','world.dai_hoi_dau_gia']);
  for(const e of A(r.theGioi?.dangDien)){
    if(!e||!e.daBiet||!hasSlot(e.slot)||SKIP_WORLD.has(e.id))continue;
    const def=C.theCuc?.get?.(e.id),left=+e.denNam-nowYear();
    if(left<=0)continue;
    const ten=T(def?.ten||'');
    // Phòng id đổi tên: lọc thêm theo tên hiển thị
    if(/đại hội đấu giá|tông môn tuyển đồ|tông môn đại bỉ/i.test(ten))continue;
    out.push(makeRow({key:`tg|${e.id}|${e.slot}`,slot:e.slot,title:ten||'Thế sự',kind:'Thế sự',icon:'訊',enc:{__han:e.denNam},tags:['Tin đã biết'],noGate:true}));
  }
  return out;
}

/* Nơi chốn có cửa mở theo chu kỳ (bí cảnh…) đã khám phá */
function realmRows(){
  const out=[];
  for(const s of A(W.slots)){
    if(s.an)continue;
    const def=placeDef(s.id);if(!def?.khai_mo)continue;
    const isEx=explored(s.id),i=info(s.id),w=placeWindow(s.id),closed=closedYears(s.id),rc=reach(s.id),travel=rc.travel;
    const dg=danger(s.id);
    const capRaw=Number(i?.capNen??i?.canhGioi??NaN);
    const selfCg=Math.floor(Number(me().canhGioi??0));
    const CG_FALLBACK={0:'Phàm nhân',1:'Luyện khí',2:'Trúc cơ',3:'Kết đan',4:'Nguyên anh',5:'Hóa thần',6:'Luyện hư',7:'Hợp đạo',8:'Đại thừa',9:'Độ kiếp'};
    const cgKey=N(capRaw)?Math.floor(capRaw):null;
    let cgName=null;
    if(cgKey!=null){
      const fromC=T(C.canhGioi?.get?.(cgKey)?.ten||C.canhGioi?.get?.(String(cgKey))?.ten||'');
      cgName=fromC||cgTen(cgKey);
    }
    const cgDiff=cgKey!=null?(cgKey-selfCg):null;
    const row={key:`bc|${s.id}`,slot:s.id,title:slotLabel(s.id),kind:placeKind(i)||T(def.ten||'Bí cảnh'),icon:KIND_ICON.bi_canh,place:slotLabel(s.id),country:countryOf(i),travel,miles:rc.miles,est:rc.est,explored:isEx,danger:dg,capNen:cgKey,cgName,cgSelf:selfCg,cgDiff,tags:[]};
    row.openNow=closed<=0;row.opensIn=closed;row.winSpan=w?.span??null;row.period=w?.period??null;
    row.closesIn=row.openNow&&w?Math.max(0,w.closesAt-nowYear()):null;
    row.openYear=nowYear()+closed;
    const arrive=N(travel)?openOnArrival(s.id,travel):{ok:false};
    row.ok=Boolean(arrive.ok);row.why=arrive.ok?'':(row.openNow&&N(travel)?`Tới nơi thì cửa đã đóng, mở lại sau ${fmtTime(closedYears(s.id,{...run(),nam:nowYear()+travel}))}`:arrive.reason||'');
    row.wait=!row.openNow&&N(travel)?Math.max(0,closed-travel):0;
    out.push(row);
  }
  out.sort((a,b)=>(b.openNow-a.openNow)||(a.openNow?(a.closesIn??1e9)-(b.closesIn??1e9):a.opensIn-b.opensIn));
  return out;
}


/* Thời gian / quãng đường ước tính cho nơi chưa khám phá (game chỉ tính chính xác với nơi đã đi qua) */
let estCache={pos:null,tr:0,mi:0};
function estRatios(){
  const pos=run().viTri;if(estCache.pos===pos&&estCache.tr)return estCache;
  estCache={pos,tr:0,mi:0};
  for(const s of A(run().daKhamPha)){if(s===pos||!hasSlot(s))continue;let d=NaN;try{d=W.distance(pos,s)}catch{}if(!(d>20))continue;const t=travelTo(s),m=milesTo(s);if(N(t)&&N(m)){estCache={pos,tr:t/d,mi:m/d};break}}
  return estCache;
}
function reach(slot){
  if(explored(slot)){const t=travelTo(slot),m=milesTo(slot);if(N(t))return{travel:t,miles:m,est:false}}
  let d=NaN;try{d=W.distance(run().viTri,slot)}catch{}
  const r=estRatios();return N(d)&&r.tr?{travel:d*r.tr,miles:d*r.mi,est:true}:{travel:NaN,miles:NaN,est:true};
}
const slotNear=(x,y)=>{let best=null,bd=1e9;for(const s of A(W.slots)){if(s.an)continue;const d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=s.id}}return bd<6?best:null};
const REALM_STAGE=(c,t)=>`${REALMS[c]||'Cảnh giới '+c}${N(t)&&c>0?' '+(STAGES[t]||''):''}`;
const lootText=roi=>{const out=[];for(const x of A(roi)){if(!x||typeof x!=='object')continue;if(x.linh_thach)out.push(`${F(x.linh_thach)} linh thạch`);if(x.tu_vi)out.push(`${F(x.tu_vi)} tu vi`);const it=typeof x.add_item==='string'?x.add_item:x.add_item?.id;if(it&&C.items.get(it))out.push(T(C.items.get(it).ten))}return out};
function effectBits(list,out={combat:[],items:[],other:[]}){
  const walkE=v=>{if(Array.isArray(v)){v.forEach(walkE);return}if(!v||typeof v!=='object')return;
    if(v.combat){const e=C.enemies.get(v.combat);out.combat.push(e?`${T(e.ten)} (${REALM_STAGE(e.canh_gioi,e.tieu_canh_gioi)}${e.muc==='boss'?', thủ lĩnh':''})${A(lootText(e.roi)).length?` — rơi ${lootText(e.roi).slice(0,4).join(', ')}`:''}`:String(v.combat))}
    const it=typeof v.add_item==='string'?v.add_item:v.add_item?.id;if(it)out.items.push(T(C.items.get(it)?.ten||it));
    if(v.injury)out.other.push('bị thương');if(v.linh_thach)out.other.push(`${F(v.linh_thach)} linh thạch`);if(v.tu_vi)out.other.push(`${F(v.tu_vi)} tu vi`);if(v.dao_tam)out.other.push(`đạo tâm ${v.dao_tam>0?'+':''}${v.dao_tam}`);if(v.lore)out.other.push('thu được bí văn');if(v.phuc_phan)out.other.push('kết duyên — có thể được báo đáp về sau');
    for(const k of ['success','partial','failure','effects'])if(v[k])walkE(v[k])};
  walkE(list);return out;
}
const uniq=a=>[...new Set(a)];
function treasureHow(id){
  const enc=C.encounters.get(id);if(!enc)return'';
  const rows=[];
  for(const ch of A(enc.choices)){
    const name=T(ch.text||'Lựa chọn');let line=`<b>${E(name)}</b>`;
    if(ch.check){const st=STAT_VN[ch.check.chi_so]||String(ch.check.chi_so||'').replace(/_/g,' '),have=me().chiSo?.[ch.check.chi_so];line+=` — thử ${E(st)}${ch.check.do_kho?`, độ khó ${E(ch.check.do_kho)}`:''}${N(have)?` (bạn có ${F(have)})`:''}`}
    const bits=[];
    if(ch.success||ch.partial){const o=effectBits([ch.success,ch.partial]);const p=[];if(o.combat.length)p.push('giao chiến với '+uniq(o.combat).join('; '));if(o.items.length)p.push('có thể nhận '+uniq(o.items).join(', '));if(o.other.length)p.push(uniq(o.other).join(', '));if(p.length)bits.push('Thành công: '+p.join(' · '))}
    if(ch.failure){const o=effectBits(ch.failure);const p=[...uniq(o.other),...o.combat.map(x=>'giao chiến với '+x)];bits.push('Thất bại: '+(p.join(', ')||'tay trắng ra về'))}
    if(ch.effects){const o=effectBits(ch.effects);const p=[...uniq(o.combat).map(x=>'giao chiến với '+x),...uniq(o.items).map(x=>'nhận '+x),...uniq(o.other)];if(p.length)bits.push('Kết quả: '+p.join(', '))}
    rows.push(`<div style="margin-top:3px">▸ ${line}${bits.length?`<br><span class="sub">${bits.map(E).join('<br>')}</span>`:''}</div>`);
  }
  const intro=T(String(enc.text||'')).slice(0,200);
  return`<div class="sub" style="grid-column:1/4;border-top:1px dashed rgba(226,183,101,.2);padding-top:5px">${intro?`<i>${E(intro)}${enc.text.length>200?'…':''}</i>`:''}${rows.join('')}</div>`;
}

let relicSlotIdx=null;
const relicSlot=id=>{if(!relicSlotIdx){relicSlotIdx=new Map();for(const s of A(W.slots)){const d=info(s.id)?.diaDanh?.id;if(d)relicSlotIdx.set(d,s.id)}}return relicSlotIdx.get(id)||null};
function treasureRows(){
  const r=run(),active=[],waiting=[];
  const act=new Map();
  for(const [k,node] of Object.entries(r.nodes||{}))if(node?.encounter&&GUIDE.has(node.encounter)&&!node.viec)act.set(node.encounter,{node,slot:node.slot||k});
  for(const [id,gd] of GUIDE){
    const enc=C.encounters.get(id),relic=gd.relic?C.items.get(gd.relic):null,a=act.get(id);
    const base={id,title:T(gd.ten||enc?.ten||id),relic:relic?T(relic.ten):null,boss:gd.baoVe?`${gd.baoVe.ten} (${cgTen(gd.baoVe.cg)})`:null,gate:gd.gate,check:gd.check||null,cooldown:gd.hoiChieu||null,chance:gd.chance,terrain:gd.noi,placeName:gd.dia?.ten||null};
    if(a&&hasSlot(a.slot)){
      const row=makeRow({key:`db|${a.slot}|${id}`,slot:a.slot,title:base.title,kind:'Dị bảo',icon:KIND_ICON.di_bao,enc:{__han:a.node.hetHanNam},noGate:true});
      Object.assign(row,base,{group:'active'});active.push(row);continue;
    }
    const done=(()=>{const f=enc?.requires?.not_flag;return typeof f==='string'&&f.startsWith('di_bao_xong_')&&Boolean(r.flags?.[f])})();
    const lim=enc?encounterLimits(enc):{};
    const slot=gd.dia?slotNear(gd.dia.x,gd.dia.y)||relicSlot(gd.diaDanh):null;
    if(!slot&&!done)continue;
    const cd=lim.cooldownLeft>0?lim.cooldownLeft:0;
    waiting.push({...base,group:'wait',done,exhausted:Boolean(lim.exhausted),cd,slot,...(()=>{const q=slot?reach(slot):{travel:NaN,miles:NaN,est:false};return{travel:q.travel,miles:q.miles,est:q.est}})(),
      status:done?'Đã lấy được':lim.exhausted?'Đã dùng hết lượt':cd>0?`Mở lại sau ${fmtTime(cd)}`:'Chưa xuất hiện',sortKey:done?3:lim.exhausted?2:cd>0?1:0});
  }
  waiting.sort((a,b)=>a.sortKey-b.sortKey||(a.sortKey===1?a.cd-b.cd:0)||a.title.localeCompare(b.title,'vi'));
  return{active,waiting};

}

/* Sắp xếp: tới kịp trước; việc gấp (còn ít thời gian dư) trước; sau đó gần trước */
const SORTS={
  urgent:{name:'Khẩn cấp trước',fn:(a,b)=>(a.ok===b.ok?0:a.ok?-1:1)||((a.slack!==null?a.slack-(a.travel||0):1e9)-(b.slack!==null?b.slack-(b.travel||0):1e9))||(a.travel-b.travel)},
  near:{name:'Gần nhất',fn:(a,b)=>(a.ok===b.ok?0:a.ok?-1:1)||(a.travel-b.travel)},
  kind:{name:'Theo loại',fn:(a,b)=>a.kind.localeCompare(b.kind,'vi')||(a.travel-b.travel)},
  safe:{name:'An toàn trước',fn:(a,b)=>(a.ok===b.ok?0:a.ok?-1:1)||(a.danger.rank-b.danger.rank)||(a.travel-b.travel)}
};

/* ───────── Đường đi an toàn & vẽ lên bản đồ ───────── */
function safePath(target){
  const start=run().viTri;if(!hasSlot(start)||!hasSlot(target))return null;
  if(start===target)return{path:[W.slot(start)],target};
  let land=null;try{land=W.tho(start)}catch{}
  const all=A(W.slots).filter(s=>s&&!s.an);
  const build=(sameLand)=>sameLand&&land!=null?all.filter(s=>{try{return W.tho(s.id)===land}catch{return true}}):all.slice();
  const dijkstra=(nodes,step)=>{
    const idx=new Map(nodes.map((s,i)=>[s.id,i]));if(!idx.has(start)||!idx.has(target))return null;
    const n=nodes.length,dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),done=new Uint8Array(n);
    const si=idx.get(start),ti=idx.get(target),dg=new Int8Array(n);
    for(let i=0;i<n;i++)dg[i]=danger(nodes[i].id).rank;
    dist[si]=0;
    for(;;){
      let u=-1,best=Infinity;
      for(let i=0;i<n;i++)if(!done[i]&&dist[i]<best){best=dist[i];u=i}
      if(u<0||u===ti)break;done[u]=1;const a=nodes[u];
      for(let v=0;v<n;v++){
        if(done[v])continue;
        const d=Math.hypot(a.x-nodes[v].x,a.y-nodes[v].y);if(d>step)continue;
        const w=d+2+(v===ti?0:dg[v]===3?40:dg[v]===2?12:0);
        if(dist[u]+w<dist[v]){dist[v]=dist[u]+w;prev[v]=u}
      }
    }
    if(!Number.isFinite(dist[ti]))return null;
    const path=[];for(let v=ti;v>=0;v=prev[v]){path.push(nodes[v]);if(v===si)break}path.reverse();
    return path[0]?.id===start?{path,target,len:dist[ti]}:null;
  };
  for(const same of [true,false]){
    const nodes=build(same);
    for(const step of [29.1,42,60,90,140]){
      const r=dijkstra(nodes,step);if(r)return r;
    }
  }
  return null;
}

const mapRoot=()=>{const m=window.map,cam=m?.cam;return m?.app?.stage?.children?.find?.(x=>x?.scale&&x?.position&&Math.abs((x.scale.x||0)-(cam?.scale||0))<1e-6)||null};
function focusMap(slot){
  const m=window.map,cam=m?.cam,root=mapRoot();if(!cam||!root||!hasSlot(slot))return false;
  const t=W.slot(slot),sc=Math.max(cam.minScale||.1,Math.min(cam.maxScale||10,cam.scale||1)),vw=cam.width||innerWidth,vh=cam.height||innerHeight;
  const maxX=Math.max(0,(cam.worldWidth||1920)-vw/sc),maxY=Math.max(0,(cam.worldHeight||1080)-vh/sc);
  const x=Math.max(0,Math.min(maxX,t.x-vw/(2*sc))),y=Math.max(0,Math.min(maxY,t.y-vh/(2*sc)));
  cam.x=x;cam.y=y;cam.scale=sc;root.scale.set?.(sc);root.position.set?.(-x*sc,-y*sc);
  for(const fn of cam.listeners||[])try{fn(cam)}catch{}
  return true;
}

/* Hiệu ứng: đường mảnh trắng; mỗi chặng dừng có vòng đỏ lan tỏa; điểm cuối màu cam. Chỉ vẽ nét, không tô nền. */
const COL={path:0xf2f0e6,red:0xff2d2d,orange:0xff9a1f};
let gfx=null,raf=0,drawing=null;
function stopDrawing(){cancelAnimationFrame(raf);raf=0;try{gfx?.parent?.removeChild(gfx);gfx?.destroy?.()}catch{}gfx=null}
function busyNow(){const r=run();return Boolean(r.active||r.tran||r.bienCo)}
function startDrawing(path){
  stopDrawing();drawing=path;
  const m=window.map,root=mapRoot(),cam=m?.cam;if(!root||!cam||!path?.length)return false;
  let Gr=window.PIXI?.Graphics;
  if(!Gr){const st=[...(m?.app?.stage?.children||[])];while(st.length&&!Gr){const x=st.pop();if((x?.lineStyle&&x?.moveTo&&x?.lineTo)||(x?.stroke&&x?.moveTo))Gr=x.constructor;st.push(...(x?.children||[]))}}
  if(!Gr)return false;
  try{gfx=new Gr()}catch{return false}
  gfx.name='vkt2-route';gfx.eventMode='none';gfx.interactive=false;gfx.alpha=1;
  try{root.addChild(gfx)}catch{return false}
  const t0=performance.now();
  const COL_LINE=0xffffff,COL_EDGE=0x1c1917,COL_STOP=0xef4444,COL_DEST=0xf97316;
  const seg=(x1,y1,x2,y2,w,color,alpha)=>{
    try{
      if(typeof gfx.stroke==='function'&&typeof gfx.setStrokeStyle==='function'){
        gfx.moveTo(x1,y1);gfx.lineTo(x2,y2);gfx.stroke({width:w,color,alpha,pixelLine:false,cap:'round',join:'round'});
      }else if(typeof gfx.lineStyle==='function'){
        gfx.lineStyle(w,color,alpha,1,true);gfx.moveTo(x1,y1);gfx.lineTo(x2,y2);
      }else if(typeof gfx.stroke==='function'){
        gfx.moveTo(x1,y1);gfx.lineTo(x2,y2);gfx.stroke({width:w,color,alpha});
      }
    }catch{}
  };
  const ring=(x,y,r,w,color,alpha)=>{
    if(alpha<=0.01||r<=0)return;
    try{
      if(typeof gfx.stroke==='function'&&typeof gfx.circle==='function'){gfx.circle(x,y,r);gfx.stroke({width:w,color,alpha})}
      else if(typeof gfx.lineStyle==='function'){gfx.lineStyle(w,color,alpha);gfx.beginFill?.(color,0);gfx.drawCircle(x,y,r);gfx.endFill?.()}
    }catch{}
  };
  const glow=(x,y,r,color,alpha)=>{
    if(alpha<=0.01||r<=0)return;
    try{
      if(typeof gfx.circle==='function'&&typeof gfx.fill==='function'){gfx.circle(x,y,r);gfx.fill({color,alpha})}
      else{gfx.lineStyle?.(0,color,0);gfx.beginFill?.(color,alpha);gfx.drawCircle?.(x,y,r);gfx.endFill?.()}
    }catch{}
  };
  const frame=()=>{
    if(!gfx?.parent)return;
    raf=requestAnimationFrame(frame);
    const busy=busyNow();
    gfx.visible=!busy;if(busy)return;
    const sc=Math.max(.001,Number(cam.scale)||1),t=(performance.now()-t0)/1000;
    try{gfx.clear?.()}catch{try{gfx.clear()}catch{}}
    try{
      const lw=1.05/sc,edge=1.7/sc,dash=16/sc,gap=8/sc;
      for(let i=1;i<path.length;i++){
        const a=path[i-1],z=path[i],dx=z.x-a.x,dy=z.y-a.y,len=Math.hypot(dx,dy);if(len<=0)continue;
        for(let d=0;d<len;d+=dash+gap){
          const d2=Math.min(len,d+dash);
          const x1=a.x+dx*d/len,y1=a.y+dy*d/len,x2=a.x+dx*d2/len,y2=a.y+dy*d2/len;
          seg(x1,y1,x2,y2,edge,COL_EDGE,.28);
          seg(x1,y1,x2,y2,lw,COL_LINE,.92);
        }
      }
      const marks=[];let last=null;const minGap=28;
      for(let i=1;i<path.length-1;i++){
        const q=path[i];if(last&&Math.hypot(q.x-last.x,q.y-last.y)<minGap)continue;
        marks.push({q,dest:false});last=q;
      }
      marks.push({q:path[path.length-1],dest:true});
      for(const {q,dest} of marks){
        const c=dest?COL_DEST:COL_STOP,base=dest?5.5:4.2;
        glow(q.x,q.y,(base+14)/sc,c,.22);
        glow(q.x,q.y,(base+7)/sc,c,.38);
        ring(q.x,q.y,base/sc,1.4/sc,c,.95);
        ring(q.x,q.y,(base+3)/sc,1/sc,c,.55);
        for(let k=0;k<3;k++){
          const ph=(t*(dest?0.85:1.05)+k/3)%1;
          ring(q.x,q.y,(base+ph*(dest?36:28))/sc,1.2/sc,c,(1-ph)*0.9);
        }
        glow(q.x,q.y,1.8/sc,c,1);
      }
    }catch{stopDrawing()}
  };
  raf=requestAnimationFrame(frame);return true;
}

/* Trạng thái dẫn đường: giữ qua lần tải lại, tự vẽ lại khi nhân vật di chuyển, tự xóa khi đã tới */
const Route={
  target:null,label:'',
  set(slot,label){this.target=slot;this.label=label||slotLabel(slot);try{sessionStorage.setItem('vkt2.route',JSON.stringify({t:slot,l:this.label}))}catch{};return this.redraw()},
  clear(){this.target=null;this.label='';stopDrawing();try{sessionStorage.removeItem('vkt2.route')}catch{};ui.syncRouteChip?.()},
  restore(){try{const x=JSON.parse(sessionStorage.getItem('vkt2.route')||'null');if(x?.t&&hasSlot(x.t)){this.target=x.t;this.label=x.l||'';this.redraw()}}catch{}},
  redraw(){
    if(!this.target)return false;
    if(run().viTri===this.target&&!busyNow()){this.clear();return false}
    const r=safePath(this.target);if(!r){stopDrawing();ui.syncRouteChip?.();return false}
    startDrawing(r.path);ui.syncRouteChip?.();return true;
  }
};
/* mode 'view' = nhìn tới đích; 'go' = nhìn nhân vật */
function showOnMap(slot,label,mode){
  const ok=Route.set(slot,label);
  if(!focusMap(mode==='go'?run().viTri:slot)&&!window.map)return{ok:false,msg:'Chưa mở được bản đồ.'};
  return{ok:true,msg:ok?'':'Không có đường đi an toàn tới nơi này — đã xem vị trí trên bản đồ.'};
}

/* ───────── Giao diện cổ phong ───────── */
const CSS=`
#${ID},#${ID}-fab,#${ID}-chip,#${ID}-toasts{--ink:#10131a;--ink2:#171b25;--ink3:#202636;--gold:#e2b765;--gold2:#a8843f;--paper:#efe4cc;--mute:#a9a08c;--red:#e5483a;--jade:#4fc7a0;--cyan:#6cc3d8;--amber:#ff9a1f;font-family:"Noto Serif","Songti SC","Source Han Serif SC",Georgia,"Times New Roman",serif;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
#${ID} *,#${ID}-fab *{box-sizing:border-box;font-family:inherit}
#${ID}-fab{position:fixed;left:10px;bottom:88px;z-index:2147483000;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#2b3550,#0e1118 70%);border:1.5px solid var(--gold);color:var(--gold);font-size:25px;line-height:49px;text-align:center;cursor:pointer;box-shadow:0 0 0 3px rgba(226,183,101,.15),0 6px 18px rgba(0,0,0,.6);user-select:none;touch-action:none}
#${ID}-fab.pulse{animation:vkt2p 1.4s ease-in-out infinite}
@keyframes vkt2p{0%,100%{box-shadow:0 0 0 3px rgba(229,72,58,.35),0 0 0 0 rgba(229,72,58,.6)}50%{box-shadow:0 0 0 3px rgba(229,72,58,.6),0 0 0 14px rgba(229,72,58,0)}}
#${ID}-fab b{position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;border-radius:10px;background:var(--red);color:#fff;font:700 12px/20px sans-serif;padding:0 5px;display:none}
#${ID}-fab.has b{display:block}
#${ID}-chip{display:none!important;pointer-events:none!important;visibility:hidden}
#${ID}-afbar{position:fixed;z-index:2147483001;display:flex;flex-direction:column-reverse;align-items:center;gap:6px;pointer-events:auto}
#${ID}-afstats{position:fixed;z-index:2147483646;left:12px;bottom:12px;width:min(380px,calc(100vw - 24px));max-height:min(70vh,520px);overflow:auto;background:linear-gradient(180deg,rgba(22,28,40,.97),rgba(10,12,18,.97));border:1px solid #a8843f;border-radius:12px;padding:0 0 10px;color:#e8dcc8;font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.55);pointer-events:auto}
#${ID}-afstats .af-drag{cursor:move;padding:10px 14px 6px;user-select:none;touch-action:none}
#${ID}-afstats .af-h{color:#e2b765;font-weight:700;font-size:14px;letter-spacing:.02em}
#${ID}-afstats .af-body{padding:0 14px}
#${ID}-afstats .af-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(168,132,63,.12)}
#${ID}-afstats .af-row3{display:grid;grid-template-columns:minmax(5.5em,1fr) minmax(4.5em,auto) minmax(4.5em,auto) minmax(5em,auto);gap:10px 12px;padding:4px 0;border-bottom:1px solid rgba(168,132,63,.12);align-items:center}
#${ID}-afstats .af-row3.head{opacity:.65;font-size:11px;border-bottom:1px solid rgba(168,132,63,.3)}
#${ID}-afstats .af-row3 .pos{color:#9fe6a0;text-align:right;font-variant-numeric:tabular-nums}
#${ID}-afstats .af-row3 .neg{color:#ff8d80;text-align:right;font-variant-numeric:tabular-nums}
#${ID}-afstats .af-row3 .net,#${ID}-afstats .af-row .net{color:#e2b765;text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
#${ID}-afstats .af-k{opacity:.9}
#${ID}-afstats .af-sec{margin-top:8px;padding-top:6px;border-top:1px solid rgba(168,132,63,.28);color:#e2b765;font-size:12px;font-weight:600}
#${ID}-afstats .af-sub{opacity:.7;font-size:11px;margin-top:8px;line-height:1.35}
#${ID}-afbar button{width:40px;height:40px;border:1.5px solid #a8843f;background:radial-gradient(circle at 30% 25%,#2b3550,#0e1118 70%);color:#e2b765;border-radius:50%;padding:0;display:grid;place-items:center;box-shadow:0 3px 12px rgba(0,0,0,.5);cursor:pointer;line-height:0}
#${ID}-afbar button svg{width:18px;height:18px;display:block;fill:currentColor}
#${ID}-afbar[data-paused="1"] button[data-a="pause"]{border-color:#4fc7a0;color:#4fc7a0}
#${ID}-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${ID}-chip button{border:0;background:rgba(255,255,255,.1);color:var(--paper);width:24px;height:24px;border-radius:50%;cursor:pointer}
#${ID}-toasts{position:fixed;left:10px;right:10px;top:10px;z-index:2147483200;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;max-height:40vh;overflow:hidden}
#${ID}-toasts div{pointer-events:auto;max-width:min(420px,calc(100vw - 28px));width:auto;background:linear-gradient(90deg,#2a1513,#171b25);border:1px solid var(--red);border-left:4px solid var(--red);color:var(--paper);padding:9px 12px;border-radius:8px;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.6);animation:vkt2in .3s;cursor:pointer}
#${ID}-toasts div.ok{border-color:var(--jade);border-left-color:var(--jade);background:linear-gradient(90deg,#10261f,#171b25)}
@keyframes vkt2in{from{transform:translateY(-14px);opacity:0}}
#${ID}{position:fixed;left:8px;bottom:8px;z-index:2147483100;width:min(460px,calc(100vw - 16px));height:min(640px,calc(100dvh - 16px));display:none;flex-direction:column;background:linear-gradient(180deg,var(--ink2),var(--ink));color:var(--paper);border:1px solid var(--gold2);border-radius:12px;box-shadow:0 0 0 1px #000,0 0 0 4px rgba(226,183,101,.12),0 16px 48px rgba(0,0,0,.75);overflow:hidden;font-size:14px}
#${ID}.open{display:flex}
#${ID} header{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(226,183,101,.28);background:linear-gradient(90deg,rgba(226,183,101,.12),transparent)}
#${ID} header .seal{width:30px;height:30px;border-radius:6px;background:var(--red);color:#fff;display:grid;place-items:center;font-size:18px;transform:rotate(-4deg);box-shadow:0 0 0 1px #000 inset}
#${ID} header h1{margin:0;font-size:15px;color:var(--gold);letter-spacing:.5px;line-height:1.2}
#${ID} header small{display:block;color:var(--mute);font-size:11.5px}
#${ID} header button{margin-left:auto;border:1px solid var(--gold2);background:transparent;color:var(--gold);border-radius:6px;width:32px;height:32px;font-size:16px;cursor:pointer}
#${ID} .body{flex:1;overflow:auto;padding:8px 10px 12px;-webkit-overflow-scrolling:touch}
#${ID} nav{display:flex;overflow-x:auto;scrollbar-width:none;border-top:1px solid rgba(226,183,101,.28);background:var(--ink)}
#${ID} nav button{flex:1 0 auto;min-width:64px;border:0;background:transparent;color:var(--mute);padding:6px 2px 7px;font-size:11.5px;cursor:pointer;position:relative;line-height:1.25}
#${ID} nav button i{display:block;font-style:normal;font-size:18px;color:inherit}
#${ID} nav button.on{color:var(--gold);background:linear-gradient(180deg,rgba(226,183,101,.14),transparent)}
#${ID} nav button.on::before{content:"";position:absolute;top:0;left:22%;right:22%;height:2px;background:var(--gold)}
#${ID} nav button em{position:absolute;top:2px;right:calc(50% - 22px);background:var(--red);color:#fff;border-radius:9px;font:700 10px/16px sans-serif;min-width:16px;padding:0 4px;font-style:normal}
#${ID} .bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
#${ID} input,#${ID} select{background:var(--ink3);color:var(--paper);border:1px solid rgba(226,183,101,.3);border-radius:7px;padding:7px 8px;font-size:14px;min-width:0}
#${ID} input[type=search],#${ID} .grow{flex:1 1 140px}
#${ID} .chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:6px;scrollbar-width:none}
#${ID} .chip{flex:none;border:1px solid rgba(226,183,101,.3);background:transparent;color:var(--mute);border-radius:14px;padding:4px 11px;font-size:12.5px;cursor:pointer}
#${ID} .chip.on{background:var(--gold);color:#1a1205;border-color:var(--gold);font-weight:700}
#${ID} .sum{color:var(--mute);font-size:12px;margin:2px 0 8px}
#${ID} h3{margin:12px 0 6px;font-size:13px;color:var(--gold);letter-spacing:.4px;display:flex;align-items:center;gap:8px}
#${ID} h3::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(226,183,101,.4),transparent)}
#${ID} .card{position:relative;display:grid;grid-template-columns:34px 1fr auto;gap:4px 10px;background:var(--ink3);border:1px solid rgba(226,183,101,.18);border-left:3px solid var(--jade);border-radius:9px;padding:9px 10px;margin-bottom:8px}
#${ID} .card.late{border-left-color:#6b6f7a;opacity:.62}
#${ID} .card.d2{border-left-color:var(--amber)}#${ID} .card.d3{border-left-color:var(--red)}
#${ID} .ico{grid-row:1/3;width:34px;height:34px;border-radius:8px;border:1px solid var(--gold2);color:var(--gold);display:grid;place-items:center;font-size:18px;background:rgba(0,0,0,.25)}
#${ID} .card b{font-size:14.5px;color:#fff;line-height:1.3}
#${ID} .card small,#${ID} .sub{color:var(--mute);font-size:12px;line-height:1.4}
#${ID} .side{text-align:right;font-size:13px;color:var(--cyan);white-space:nowrap}
#${ID} .side small{display:block}
#${ID} .tags{grid-column:2/4;display:flex;flex-wrap:wrap;gap:4px}
#${ID} .tag{font-size:11.5px;border:1px solid rgba(226,183,101,.28);color:var(--paper);border-radius:4px;padding:1px 6px}
#${ID} .tag.g{border-color:var(--jade);color:var(--jade)}#${ID} .tag.r{border-color:var(--red);color:#ff8d80}#${ID} .tag.o{border-color:var(--amber);color:var(--amber)}
#${ID} .acts{grid-column:1/4;display:flex;gap:6px;margin-top:3px}
#${ID} button.btn{flex:1;border:1px solid var(--gold2);background:rgba(226,183,101,.08);color:var(--gold);border-radius:7px;padding:8px 6px;font-size:13px;cursor:pointer;min-height:36px}
#${ID} button.btn:active{background:rgba(226,183,101,.25)}
#${ID} button.btn.pri{background:linear-gradient(180deg,#b9362b,#8a241c);border-color:#e5483a;color:#fff}
#${ID} button.btn:disabled{opacity:.45}
#${ID} .empty{text-align:center;color:var(--mute);padding:26px 10px}
#${ID} .panel{background:var(--ink3);border:1px solid rgba(226,183,101,.2);border-radius:9px;padding:10px;margin-bottom:8px}
#${ID} .form{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#${ID} .form label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--mute)}
#${ID} .form select{width:100%}
#${ID} .seg{display:flex;border:1px solid var(--gold2);border-radius:8px;overflow:hidden;margin:8px 0}
#${ID} .seg button{flex:1;border:0;background:transparent;color:var(--mute);padding:8px 2px;font-size:12.5px;cursor:pointer}
#${ID} .seg button.on{background:var(--gold);color:#1a1205;font-weight:700}
#${ID} .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}
#${ID} .stats div{background:rgba(0,0,0,.25);border-radius:7px;padding:6px;text-align:center;font-size:11.5px;color:var(--mute)}
#${ID} .stats b{display:block;color:var(--gold);font-size:15px}
#${ID} .bar2{height:5px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;margin:8px 0}
#${ID} .bar2 i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--jade),var(--gold))}
#${ID} .grid svg,#${ID} .grid img{max-width:100%;height:auto;border-radius:8px}
#${ID} .qty{width:72px;flex:none}
#${ID} details{margin-top:6px}#${ID} summary{cursor:pointer;color:var(--gold);font-size:13px;padding:4px 0}
#${ID} .row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:12.5px;border-bottom:1px dashed rgba(255,255,255,.08)}
.ok{color:var(--jade)}.bad{color:#ff8d80}
@media (min-width:700px){#${ID}{left:70px;bottom:20px}}
@media (max-width:380px){#${ID} .card{grid-template-columns:28px 1fr auto}#${ID} .ico{width:28px;height:28px;font-size:15px}#${ID} nav button{font-size:10.5px}}
`;
const styleEl=document.createElement('style');styleEl.id=ID+'-style';styleEl.textContent=CSS;document.head.appendChild(styleEl);

const TABS=[['map','地','Bản đồ'],['realm','秘','Bí cảnh&Dị bảo'],['auto','自','Auto Farm'],['bounty','賞','Treo thưởng'],['people','人','Nhân mạch'],['sect','宗','Tông môn'],['breakthrough','破','Đột phá'],['build','脈','Kinh mạch'],['items','寶','Vật phẩm'],['check','察','Kiểm tra']];
const panel=document.createElement('div');panel.id=ID;panel.setAttribute('role','dialog');
panel.innerHTML=`<header><div class="seal">仙</div><div><h1>Vạn Kiếp Trợ Thủ</h1><small id="${ID}-sub"></small></div><button id="${ID}-x" aria-label="Thu gọn">✕</button></header><div class="body" id="${ID}-body"></div><nav>${TABS.map(([k,i,n])=>`<button data-t="${k}"><i>${i}</i>${n}</button>`).join('')}</nav>`;
const fab=document.createElement('div');fab.id=ID+'-fab';fab.innerHTML='仙<b></b>';fab.title='Vạn Kiếp Trợ Thủ';
const chip=document.createElement('div');chip.id=ID+'-chip';chip.innerHTML='<span></span><button aria-label="Xóa đường">✕</button>';
const toasts=document.createElement('div');toasts.id=ID+'-toasts';
document.body.append(panel,fab,chip,toasts);
const body=$(panel,'.body'),navEl=$(panel,'nav');
const ui={tab:store.get('tab','map'),isOpen:false,tabState:{}};

function placeToasts(){try{const r=fab.getBoundingClientRect(),top=r.top+r.height/2<innerHeight/2;toasts.style.top=top?'auto':'10px';toasts.style.bottom=top?'10px':'auto'}catch{}}
function toast(msg,kind='',ms=4200){
  placeToasts();
  while(toasts.childElementCount>=4)toasts.firstElementChild?.remove();
  const d=document.createElement('div');if(kind)d.className=kind;
  d.textContent=msg;toasts.appendChild(d);
  const t=setTimeout(()=>d.remove(),ms);
  d.onclick=()=>{clearTimeout(t);d.remove()};
}
/* Chip dẫn đường đã bỏ — chỉ toast 1 lần khi bấm; đường vẫn vẽ trên map tới khi tới nơi */
ui.syncRouteChip=()=>{chip.style.display='none'};
$(chip,'button').onclick=()=>Route.clear();

/* kéo biểu tượng tới chỗ khác */
(()=>{const pos=store.get('fab',null);if(pos){fab.style.left=Math.min(pos[0],innerWidth-56)+'px';fab.style.top=Math.min(pos[1],innerHeight-56)+'px';fab.style.bottom='auto';chip.style.left=Math.min(pos[0]+60,innerWidth-120)+'px';chip.style.top=pos[1]+8+'px';chip.style.bottom='auto'}
let d=null;fab.addEventListener('pointerdown',e=>{d={x:e.clientX,y:e.clientY,l:fab.offsetLeft,t:fab.offsetTop,m:false};fab.setPointerCapture(e.pointerId)});
fab.addEventListener('pointermove',e=>{if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>6)d.m=true;if(d.m){const l=Math.max(4,Math.min(innerWidth-56,d.l+dx)),t=Math.max(4,Math.min(innerHeight-56,d.t+dy));fab.style.left=l+'px';fab.style.top=t+'px';fab.style.bottom='auto';chip.style.left=Math.min(l+60,innerWidth-120)+'px';chip.style.top=t+8+'px';chip.style.bottom='auto';try{AutoFarm.running&&AutoFarm.syncFab()}catch{}}});
fab.addEventListener('pointerup',()=>{if(!d)return;const moved=d.m;d=null;if(moved)store.set('fab',[fab.offsetLeft,fab.offsetTop]);else ui.open()})})();

ui.open=()=>{ui.isOpen=true;panel.classList.add('open');fab.style.display='none';Alerts.markSeen();render()};
ui.close=()=>{ui.isOpen=false;panel.classList.remove('open');fab.style.display=''};
$(panel,'#'+ID+'-x').onclick=ui.close;
navEl.onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;ui.tab=b.dataset.t;store.set('tab',ui.tab);render()};
function syncNav(){$$(navEl,'button').forEach(b=>{const on=b.dataset.t===ui.tab;b.classList.toggle('on',on);if(on&&b.scrollIntoView)try{b.scrollIntoView({block:'nearest',inline:'center'})}catch{}});const n=Alerts.count;$$(navEl,'em').forEach(x=>x.remove());if(n.realm){$(navEl,'[data-t=realm]').insertAdjacentHTML('beforeend',`<em>${n.realm}</em>`)}}

const hdrSub=()=>{const r=run(),i=info(r.viTri);const cg=C.canhGioi?.get?.(me().canhGioi)?.ten;return`Năm ${F(Math.floor(r.nam))} · ${T(i?.ten||'')}`};
function render(){
  if(!ui.isOpen)return;
  const keep=body.scrollTop;$(panel,'#'+ID+'-sub').textContent=hdrSub();
  const fn=VIEWS[ui.tab]||VIEWS.map;fn();syncNav();body.scrollTop=keep;
}
function softRender(){if(!ui.isOpen)return;const a=document.activeElement;if(a&&panel.contains(a)&&/INPUT|SELECT/.test(a.tagName))return;if(ui.tab==='build'||ui.tab==='check'||ui.tab==='breakthrough')return;if(ui.tab==='auto'&&AutoFarm?.running){AutoFarm.refreshLogOnly?.();return}render()}

const cardHtml=(r,opts={})=>`<article class="card ${r.ok?'':'late'} d${r.danger?.rank>=2?r.danger.rank:0}" data-slot="${E(r.slot)}" data-title="${E(r.title)}"><div class="ico">${E(r.icon||'事')}</div><div><b>${E(r.title)}</b><small>${E(r.kind)} · ${E(r.place)}${r.country?' · '+E(r.country):''}</small></div><div class="side">${fmtTime(r.travel)}<small>${fmtMiles(r.miles)}</small></div><div class="tags">${r.ok?'<span class="tag g">Tới kịp</span>':`<span class="tag r">${E(r.why||'Không tới kịp')}</span>`}${r.slack!==null&&r.ok?`<span class="tag o">Còn ${fmtTime(Math.max(0,r.slack))} khi tới nơi</span>`:''}${r.danger?.rank>=1?`<span class="tag ${r.danger.rank>=2?'r':''}">${r.danger.label}</span>`:''}${A(r.tags).map(t=>`<span class="tag">${E(t)}</span>`).join('')}${opts.extra||''}</div>${opts.after||''}<div class="acts"><button class="btn" data-act="view">Xem bản đồ</button><button class="btn pri" data-act="go">Đường đi an toàn</button></div></article>`;

body.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const card=b.closest('[data-slot]');
  if(b.dataset.act==='view'||b.dataset.act==='go'){
    const slot=card?.dataset.slot;if(!slot||!hasSlot(slot))return toast('Vị trí này không còn hợp lệ.');
    const res=showOnMap(slot,card.dataset.title,b.dataset.act);
    if(!res.ok)return toast(res.msg);
    ui.close();if(res.msg)toast(res.msg,'');else toast(b.dataset.act==='go'?'Đã vẽ đường đi an toàn tới '+card.dataset.title:'Đang xem '+card.dataset.title+' · đường đi an toàn đã được vẽ','ok',3200);
  }
});

const VIEWS={};

/* ───────── Thông báo khi thu gọn ───────── */
const Alerts={
  count:{realm:0},seen:new Set(store.get('seen.'+run().seed,[])),cur:new Map(),ready:false,
  collect(){
    const m=new Map();
    for(const r of realmRows())if(r.openNow&&r.ok){const w=placeWindow(r.slot);m.set(`bc|${r.slot}|${w?.cycle}`,{label:`Bí cảnh ${r.title} đang mở cửa`,tab:'realm'})}
    for(const r of treasureRows().active)if(r.ok)m.set(r.key,{label:`Dị bảo xuất hiện: ${r.title} (${r.place})`,tab:'realm'});
    return m;
  },
  check(){
    let cur;try{cur=this.collect()}catch{return}
    this.cur=cur;
    if(!(this.notified instanceof Set))this.notified=new Set();
    for(const k of [...this.notified])if(!cur.has(k))this.notified.delete(k);
    const fresh=[...cur].filter(([k])=>!this.seen.has(k));
    if(ui.isOpen){this.markSeen();return}
    if(this.ready){
      const untoast=fresh.filter(([k])=>!this.notified.has(k));
      if(untoast.length){
        for(const [k,v] of untoast.slice(0,3)){toast('🔔 '+v.label);this.notified.add(k)}
        if(untoast.length>3)toast(`🔔 và ${untoast.length-3} thông tin mới khác`);
      }
    }
    this.ready=true;
    this.count={realm:fresh.length};
    fab.classList.toggle('has',fresh.length>0);
    fab.classList.toggle('pulse',fresh.length>0);
    $(fab,'b').textContent=fresh.length||'';
  },
  markSeen(){for(const k of this.cur.keys())this.seen.add(k);this.seen=new Set([...this.seen].filter(k=>this.cur.has(k)||this.seen.size<200));store.set('seen.'+run().seed,[...this.seen]);this.count={realm:0};fab.classList.remove('has','pulse');$(fab,'b').textContent=''}
};

/* ───────── Tab: Bản đồ ───────── */
const mapUi={q:'',sort:'urgent',kind:'all',onlyOk:true};
VIEWS.map=()=>{
  const all=eventRows(),kinds=[...new Set(all.map(r=>r.kind))].sort((a,b)=>a.localeCompare(b,'vi'));
  const q=norm(mapUi.q);
  let rows=all.filter(r=>(mapUi.kind==='all'||r.kind===mapUi.kind)&&(!mapUi.onlyOk||r.ok)&&(!q||norm([r.title,r.place,r.kind,r.country,A(r.tags).join(' ')].join(' ')).includes(q)));
  rows.sort(SORTS[mapUi.sort].fn);
  body.innerHTML=`<div class="bar"><input type="search" id="m-q" placeholder="Tìm sự kiện, địa danh…" value="${E(mapUi.q)}" class="grow"><select id="m-sort">${Object.entries(SORTS).map(([k,v])=>`<option value="${k}" ${k===mapUi.sort?'selected':''}>${v.name}</option>`).join('')}</select></div>
  <div class="chips">${['all',...kinds].map(k=>`<button class="chip ${mapUi.kind===k?'on':''}" data-kind="${E(k)}">${k==='all'?'Tất cả':E(k)}</button>`).join('')}<button class="chip ${mapUi.onlyOk?'on':''}" id="m-ok">Chỉ nơi tới kịp</button></div>
  <div class="sum">Trên bản đồ: ${rows.length}/${all.length} mục · ${E(SORTS[mapUi.sort].name.toLowerCase())}</div>
  ${rows.map(r=>cardHtml(r)).join('')||'<div class="empty">Không có mục phù hợp.<br>Thử bỏ bớt bộ lọc.</div>'}`;
  $(body,'#m-q').oninput=e=>{mapUi.q=e.target.value;clearTimeout(mapUi.t);mapUi.t=setTimeout(()=>{VIEWS.map();$(body,'#m-q').focus();const i=$(body,'#m-q');i.setSelectionRange(i.value.length,i.value.length)},220)};
  $(body,'#m-sort').onchange=e=>{mapUi.sort=e.target.value;render()};
  $$(body,'[data-kind]').forEach(b=>b.onclick=()=>{mapUi.kind=b.dataset.kind;render()});
  $(body,'#m-ok').onclick=()=>{mapUi.onlyOk=!mapUi.onlyOk;render()};
};

/* ───────── Tab: Bí cảnh & Dị bảo ───────── */
const realmCard=r=>{
  const big=r.openNow?(r.closesIn!==null?`Đóng sau ${fmtTime(r.closesIn)}`:'Đang mở'):`Mở sau ${fmtTime(r.opensIn)}`;
  const reachTag=r.ok?(r.openNow?'<span class="tag g">Tới kịp khi cửa còn mở</span>':(r.wait>0?`<span class="tag o">Nên khởi hành sau ${fmtTime(r.wait)} để tới đúng lúc mở</span>`:'<span class="tag g">Tới nơi vừa lúc mở cửa</span>')):`<span class="tag r">${E(r.why||'Không tới kịp')}</span>`;
  return`<article class="card ${r.openNow?'':'late'}" data-slot="${E(r.slot)}" data-title="${E(r.title)}"><div class="ico">秘</div><div><b>${E(r.title)}</b><small>${E(r.kind)}${r.country?' · '+E(r.country):''}</small></div><div class="side" style="color:${r.openNow?'var(--jade)':'var(--amber)'}"><b style="color:inherit;font-size:14px">${E(big)}</b><small>${r.openNow?'':'năm '+Math.floor(r.openYear)}</small></div><div class="tags">${reachTag}${r.cgName?`<span class="tag ${r.cgDiff>=2?'r':r.cgDiff>=1?'o':r.cgDiff<=-1?'g':''}">Cấp nền: ${E(r.cgName)}${r.cgDiff!=null?(r.cgDiff>0?' · cao hơn ngươi '+r.cgDiff+' cảnh':r.cgDiff<0?' · thấp hơn ngươi '+(-r.cgDiff)+' cảnh':' · ngang cảnh giới'):''}</span>`:''}${r.danger?`<span class="tag ${r.danger.rank>=2?'r':r.danger.rank>=1?'o':'g'}">${E(r.danger.label||'')}</span>`:''}${r.winSpan!==null?`<span class="tag">Mỗi lần mở ${fmtTime(r.winSpan)}</span>`:''}${r.period?`<span class="tag">Chu kỳ ${fmtTime(r.period)}</span>`:''}${N(r.travel)?`<span class="tag">Đi ${r.est?'khoảng ':''}${fmtTime(r.travel)} · ${r.est?'~':''}${fmtMiles(r.miles)}</span>`:''}${r.danger.rank>=1?`<span class="tag ${r.danger.rank>=2?'r':''}">${r.danger.label}</span>`:''}</div><div class="acts"><button class="btn" data-act="view">Xem bản đồ</button><button class="btn pri" data-act="go">Đường đi an toàn</button></div></article>`;
};
const STAT_VN={than_thuc:'thần thức',ngo_tinh:'ngộ tính',dao_tam:'đạo tâm',khi_van:'khí vận',can_cot:'căn cốt',than_phap:'thân pháp'},TERRAIN_VN={di_tich:'Di tích',son_thuy:'Sơn thủy',hoang_da:'Hoang dã'};
const checkVn=s=>String(s||'').replace(/[a-z_]+/g,m=>STAT_VN[m]||m.replace(/_/g,' '));
const treasureWaitCard=r=>{
  const state=r.done?'Đã lấy':r.exhausted?'Hết lượt':r.cd>0?`Mở lại sau ${fmtTime(r.cd)}`:'Chưa xuất hiện';
  const col=r.cd>0?'var(--amber)':'var(--mute)';
  return`<article class="card late" ${r.slot?`data-slot="${E(r.slot)}" data-title="${E(r.title)}"`:''}><div class="ico">寶</div><div><b>${E(r.title)}</b><small>${E(r.placeName||'')}${r.terrain?' · '+E(TERRAIN_VN[r.terrain]||r.terrain.replace(/_/g,' ')):''}</small></div><div class="side" style="color:${col}"><b style="color:inherit;font-size:14px">${E(state)}</b>${r.cd>0?`<small>năm ${Math.floor(nowYear()+r.cd)}</small>`:''}</div><div class="tags">${r.relic?`<span class="tag o">Dị bảo: ${E(r.relic)}</span>`:''}${r.boss?`<span class="tag r">Canh giữ: ${E(r.boss)}</span>`:''}${r.gate?`<span class="tag">Cảnh giới: ${E(cgRangeTen(r.gate[0],r.gate[1]))}</span>`:''}${r.check?`<span class="tag">Cần: ${E(checkVn(r.check))}</span>`:''}${r.chance&&!r.done?`<span class="tag">Khoảng ${F(r.chance*100)}% mỗi lần xuất hiện</span>`:''}${r.cooldown?`<span class="tag">Hồi chiêu ${r.cooldown} năm</span>`:''}${N(r.travel)?`<span class="tag">Đi ${r.est?'khoảng ':''}${fmtTime(r.travel)} · ${r.est?'~':''}${fmtMiles(r.miles)}</span>`:''}</div>${treasureHow(r.id)}${r.slot&&!r.done?'<div class="acts"><button class="btn" data-act="view">Xem bản đồ</button><button class="btn pri" data-act="go">Đường đi an toàn</button></div>':''}</article>`;
};
VIEWS.realm=()=>{
  const sub=ui.tabState.realmSub||'bi_canh';
  const bc=realmRows(),tr=treasureRows(),act=[...tr.active].sort(SORTS.urgent.fn);
  const opened=bc.filter(r=>r.openNow).length;
  const tCard=r=>cardHtml(r,{after:treasureHow(r.id),extra:[r.relic?`<span class="tag o">Dị bảo: ${E(r.relic)}</span>`:'',r.boss?`<span class="tag r">Canh giữ: ${E(r.boss)}</span>`:'',r.gate?`<span class="tag">Cảnh giới: ${E(cgRangeTen(r.gate[0],r.gate[1]))}</span>`:'',r.check?`<span class="tag">Cần: ${E(checkVn(r.check))}</span>`:'',r.cooldown?`<span class="tag">Hồi chiêu ${r.cooldown} năm</span>`:''].join('')});
  const subNav=`<div class="row" style="gap:6px;margin:0 0 10px;flex-wrap:wrap">
    <button type="button" class="btn ${sub==='bi_canh'?'on':''}" data-realm-sub="bi_canh">Bí cảnh · ${bc.length}${opened?` · mở ${opened}`:''}</button>
    <button type="button" class="btn ${sub==='di_bao'?'on':''}" data-realm-sub="di_bao">Dị bảo · ${act.length+tr.waiting.length}${act.length?` · hiện ${act.length}`:''}</button>
  </div>`;
  let main='';
  if(sub==='di_bao'){
    main=`<h3>Dị bảo đang xuất hiện · ${act.length}</h3>${act.map(tCard).join('')||'<div class="empty">Chưa có dị bảo nào xuất hiện.</div>'}
    <h3>Các dị bảo khác · ${tr.waiting.length}</h3>${tr.waiting.map(treasureWaitCard).join('')||'<div class="empty">Không có.</div>'}`;
  }else{
    main=`<h3>Bí cảnh · ${bc.length} (đang mở ${opened}) · xếp theo giờ mở cửa</h3>${bc.map(realmCard).join('')||'<div class="empty">Chưa có bí cảnh nào.</div>'}`;
  }
  body.innerHTML=subNav+main;
  $$(body,'[data-realm-sub]').forEach(b=>b.onclick=()=>{ui.tabState.realmSub=b.dataset.realmSub;VIEWS.realm()});
};

/* ───────── Tab: Kinh mạch (Build) ───────── */

const BUILD_PATHS=[['tu_do','Tự do'],['kiem','Kiếm tu'],['the','Thể tu'],['phat','Phật tu'],['ma','Ma tu'],['doc','Độc cổ'],['hop_hoan','Hợp Hoan'],['thi','Luyện Thi'],['quy','Quỷ tu'],['am','Ám tu'],['ngu_thu','Ngự Thú'],['khoi_loi','Khôi Lỗi'],['phu','Phù tu'],['tran','Trận tu'],['dan','Đan tu'],['khi','Luyện Bảo'],['he_loi','Lôi tu'],['he_hoa','Hỏa tu'],['he_bang','Băng tu'],['he_phong','Phong tu'],['he_kim','Kim tu'],['he_moc','Mộc tu'],['he_thuy','Thủy tu'],['he_tho','Thổ tu']];
const ELEMS=[['kim','Kim'],['moc','Mộc'],['thuy','Thủy'],['hoa','Hỏa'],['tho','Thổ'],['bang','Băng'],['loi','Lôi'],['phong','Phong'],['am','Ám'],['vo_sac','Vô sắc']];
const ELEMENT_NAMES=Object.fromEntries(ELEMS);
const HE_COLOR={kim:'#c3cad3',moc:'#8fb27a',thuy:'#7fa3c4',hoa:'#d58a6c',tho:'#d2b36e',loi:'#a68cc8',bang:'#b5dbe6',phong:'#9cc7b4',am:'#5b4a78',vo_sac:'#a39b8c'};
/* ───────── Lối build (gom từ tab Lối Build + Kinh mạch huuhoang; luật đối chiếu content/code game) ───────── */
// XOt trong code game: [0,0,.06,.08,.1,.12,.15,.2] — dị hỏa cùng hệ chiêu +6%…+20% theo phẩm
// mC=1/3, fy=[5,5,10,20,40,60] — tỉ lệ mảnh tà / năm giữ lưới tà
const TIER_CG=[0,0,1,2,3,4,5,99];
const PHAM_TEN=['Phàm','Hoàng','Huyền','Địa','Thiên','Tiên','Thần','Nghịch Thiên'];
const DIHOA_PCT=[0,0,6,8,10,12,15,20];
const tierCg=it=>(it.tran_phai?4:TIER_CG[Math.max(1,Math.min(8,it.pham_cap||2))-1]);
const freshAt=(it,R)=>R<=tierCg(it)+1;
const TA_TAGS_B=['ma','nghich','thi','quy','doc','hop_hoan'];
const TA_BUILDS_B=['ma','doc','hop_hoan','thi','quy'];
const SCHOOLS_B=['kiem','the','phat','ma','doc','hop_hoan','thi','quy','ngu_thu','khoi_loi','phu','tran','dan','khi','am'];
const NL2S={thu:'ngu_thu',khoi_loi:'khoi_loi',trung:'doc',thi:'thi',hon:'quy'};
const schoolsOf=it=>{const t=A(it?.tag).filter(x=>SCHOOLS_B.includes(x));const nl=it?.ngu_linh&&NL2S[it.ngu_linh.loai];if(nl&&!t.includes(nl))t.push(nl);if(A(it?.tag).includes('nghich')&&!t.includes('ma'))t.push('ma');return t};
const isTaItem=it=>A(it?.tag).some(t=>TA_TAGS_B.includes(t))||(it?.ngu_linh&&['thi','hon'].includes(it.ngu_linh.loai));
const BUILDS=[
  {k:'kiem',ten:'Kiếm tu',nhom:'Chính đạo',he:['kim'],core:[
    'Đồ có nhãn kiếm: chiêu × (1 + kiếm uy lực). Thể chất Kiếm cốt +25% uy kiếm, kinh lộ dài hơn.',
    'Đặt kiếm lên huyệt; nối chuỗi tâm pháp cùng hệ từ đan điền tới kiếm (cùng họ hệ +10%/món).',
    'Dị hỏa trang bị cùng hệ chiêu: +6% (Huyền) → +20% (Nghịch Thiên) theo bảng XOt trong code game.']},
  {k:'the',ten:'Thể tu',nhom:'Chính đạo',he:['tho','kim'],core:[
    'Bắt buộc: một tâm pháp luyện thể (nhãn thể) đang thông — chưa có thì đồ thể tu chỉ như món thường.',
    'Có tâm pháp thể: chiêu thể đánh bằng sức thân (hệ số căn cốt × khí huyết thân, công thức trong code game).',
    'Thể chất hợp: Thiết cốt / Huyền Vũ / Hoang Cổ.']},
  {k:'phat',ten:'Phật tu',nhom:'Chính đạo',he:['kim','hoa','tho'],core:[
    'Đồ Phật: kháng tâm ma, chiêu thủ / khống chế; đột phá ít bị trừ vì tâm ma.',
    'Tông Phật giảm tốc độ tăng tâm ma; giết tu sĩ người bị trừ cống hiến.']},
  {k:'ma',ten:'Ma tu (huyết)',nhom:'Tà đạo',he:['hoa','vo_sac'],core:[
    'Mảnh tà ≥ 1/3 ô đang thông (mC=1/3 trong code) thì lưới ngả tà; giữ đủ năm theo fy=[5,5,10,20,40,60] mới đổi đạo cơ.',
    'Ma niệm tăng uy chiêu tà và hút máu; vượt trần dễ mất kiểm soát / tẩu hỏa.',
    'Huyền Vũ / Hoang Cổ giảm phản phệ tà; Liệt Dương tăng phản phệ.']},
  {k:'doc',ten:'Độc cổ',nhom:'Tà đạo',he:['moc','thuy'],core:[
    'Cần công pháp triệu trùng (ngự linh loại trung) để mở ô cổ trùng; luyện cổ bằng độc nang.',
    'Mảnh tà ≥ 1/3 ô thông nếu đi đường tà.']},
  {k:'hop_hoan',ten:'Hợp hoan',nhom:'Tà đạo',he:['hoa','thuy'],core:[
    'Đồ hợp hoan / song tu; lưới tà khi đủ tỉ lệ mảnh tà trên ô thông.']},
  {k:'thi',ten:'Luyện thi',nhom:'Tà đạo',he:['tho','am'],core:[
    'Công pháp thi mở ô thi khôi; luyện thi từ thi du, bạch cốt…',
    'Mảnh tà ≥ 1/3 ô thông để lưới ngả tà.']},
  {k:'quy',ten:'Quỷ tu',nhom:'Tà đạo',he:['am','thuy'],core:[
    'Công pháp hồn mở ô quỷ hồn; luyện hồn từ oán hồn ty, âm phù…',
    'Mảnh tà ≥ 1/3 ô thông.']},
  {k:'am',ten:'Ám tu',nhom:'Theo hệ',he:['am'],elem:'am',core:[
    'Hệ Ám là biến dị linh căn (cùng nhóm Lôi/Băng/Phong trong content linh_can).',
    'Dồn công pháp / pháp khí he:["am"] (Tàng Ảnh Pháp, U Minh Quyết, U Hồn Chỉ, Tịch Hồn Kinh… trong he_am).',
    'Đặt đúng màu Ám trên lưới để hưởng hệ số màu; dị hỏa hệ Ám (nếu có) cộng uy chiêu cùng hệ theo XOt.',
    'Ám không mặc định là tà — chỉ khi gắn tag ma/nghịch/thi/quỷ/độc/hợp hoan mới tính mảnh tà.']},
  {k:'ngu_thu',ten:'Ngự thú',nhom:'Song tu',he:['moc','tho'],core:[
    'Công pháp ngự thú mở ô thú (tối đa theo rule ngự linh); ấp trứng, nuôi tiến hóa.']},
  {k:'khoi_loi',ten:'Khôi lỗi',nhom:'Song tu',he:['kim','tho'],core:[
    'Công pháp khôi lỗi mở ô khôi; luyện từ hàn thiết + yêu đan / đồ phổ.']},
  {k:'phu',ten:'Phù tu',nhom:'Nghề',he:['hoa','loi'],core:[
    'Nghề chế phù (phù bút); phù công / hộ / độn dùng giữa trận.']},
  {k:'tran',ten:'Trận tu',nhom:'Nghề',he:['tho','loi'],core:[
    'Nghề trận pháp (trận bút); trận bàn sức theo phẩm so cảnh giới; tối đa 2 trận cùng lúc.']},
  {k:'dan',ten:'Đan tu',nhom:'Nghề',he:['moc','hoa'],core:[
    'Nghề luyện đan (đan lô + dị hỏa); công pháp thiên về hồi phục / tu luyện.']},
  {k:'khi',ten:'Khí tu (luyện bảo)',nhom:'Nghề',he:['hoa','kim'],core:[
    'Nghề luyện bảo (khí lô); tăng thần thức, tự đúc pháp khí.']},
];
for(const [h,ten] of [['loi','Lôi tu'],['hoa','Hỏa tu'],['bang','Băng tu'],['phong','Phong tu'],['kim','Kim tu'],['moc','Mộc tu'],['thuy','Thủy tu'],['tho','Thổ tu']]){
  BUILDS.push({k:'he_'+h,ten,nhom:'Theo hệ',he:[h],elem:h,core:[
    `Dồn công pháp / pháp khí hệ ${ELEMENT_NAMES[h]||h}; đặt đúng màu lưới tối đa ×1,3.`,
    `Dị hỏa hệ ${ELEMENT_NAMES[h]||h}: chiêu cùng hệ +${DIHOA_PCT[2]}%…+${DIHOA_PCT[7]}% theo phẩm (XOt).`,
    'Sinh khắc hàng xóm: sinh +15%, khắc −15% (rule kinh mạch trong code game).']});
}
function buildMatch(b,it){
  if(!b||!it)return false;
  if(b.elem)return A(it.he).includes(b.elem);
  return schoolsOf(it).includes(b.k)||(b.k==='am'&&A(it.he).includes('am'));
}
function itemGroup(it){
  if(it.loai==='cong_phap'||it.loai==='phap_khi'){
    if(it.ngu_linh&&!it.chieu)return 'ngulinh';
    if(!it.chieu)return it.loai==='cong_phap'?'tam':'bd';
    const d=it.chieu?.dang;return d==='cong'?'cong':d==='khong_che'?'kc':'thu';
  }
  if(it.loai==='tran_ban')return 'tran';
  if(it.loai==='phu_luc')return 'phu';
  if(it.loai==='trung_thu')return 'trung';
  if(it.loai==='nguyen_lieu'&&A(it.tag).includes('khoi_loi'))return 'dopho';
  if(it.loai==='di_hoa')return 'dihoa';
  if(it.loai==='dung_cu')return 'dungcu';
  return null;
}
const GROUP_TEN={tam:'Tâm pháp',ngulinh:'Ngự linh (mở ô)',cong:'Chiêu công',kc:'Khống chế',thu:'Thủ / hồi',bd:'Pháp bảo bị động',trung:'Trứng thú',dopho:'Đồ phổ khôi',tran:'Trận bàn',phu:'Phù lục',dihoa:'Dị hỏa',dungcu:'Dụng cụ nghề'};
const BUILD_EXTRA={ngu_thu:['trung'],khoi_loi:['dopho'],tran:['tran','dungcu'],phu:['phu','dungcu'],dan:['dihoa','dungcu'],khi:['dihoa','dungcu'],ma:['tran'],quy:['tran'],am:['dihoa']};
const NGHE_DC={dan:'luyen_dan',khi:'luyen_bao',phu:'che_phu',tran:'tran_phap'};
function buildPicks(b,R){
  const Cc=C,out={};
  for(const it of Cc.items.values()){
    const g=itemGroup(it);if(!g)continue;
    if((it.canh_gioi??0)>R)continue;
    let ok=buildMatch(b,it);
    const extra=BUILD_EXTRA[b.k]||[];
    if(!ok&&extra.includes(g)){
      if(g==='dungcu')ok=it.dung_cu===NGHE_DC[b.k];
      else if(g==='dihoa')ok=!b.elem||A(it.he).includes(b.elem);
      else if(g==='tran')ok=b.k==='tran'||(b.k==='quy'&&it.tran_phap?.kieu==='cau_hon')||(b.k==='ma'&&it.tran_phap?.kieu==='huyet_te');
      else ok=true;
    }
    if(b.elem&&['trung','dopho','dungcu'].includes(g))ok=false;
    if(b.elem&&(g==='dihoa'||g==='tran')&&!A(it.he).includes(b.elem))ok=false;
    if(b.elem&&g==='tran'&&!(it.tran_phap&&it.tran_phap.kieu==='ngu_hanh'))ok=false;
    if(!ok)continue;
    if(g!=='dungcu'&&g!=='dopho'&&g!=='trung'&&!freshAt(it,R))continue;
    const tc=tierCg(it);
    const sc=(it.pham_cap||1)*10+(tc>=R-1?30:0)+(it.theo_kiep?-100:0)+(A(it.tag).includes('chi_khai_bao')?-5:0)
      +(it.chieu?(it.chieu.uy||0)*5:0)+((it.bi_dong&&it.bi_dong.toc_do)||0)*10+(it.ngu_linh&&it.ngu_linh.o?8*it.ngu_linh.o:0);
    (out[g]=out[g]||[]).push({it,sc});
  }
  for(const g of Object.keys(out))out[g]=out[g].sort((a,b)=>b.sc-a.sc).slice(0,g==='dungcu'?2:4).map(x=>x.it);
  return out;
}
function buildFit(b,nv){
  let s=0;const why=[];const Cc=C;
  let onKm=0,inBag=0;
  for(const m of A(nv.kinhMach?.manh)){const it=Cc.items.get(m.item);if(it&&buildMatch(b,it))onKm++}
  for(const [id,n] of Object.entries(nv.tuiDo||{})){const it=Cc.items.get(id);if(n>0&&it&&(it.loai==='cong_phap'||it.loai==='phap_khi')&&buildMatch(b,it))inBag++}
  if(onKm){s+=3*onKm;why.push(onKm+' món trên kinh mạch')}
  if(inBag){s+=inBag;why.push(inBag+' món trong túi')}
  const lc=A(nv.linhCan?.he);
  const hm=A(b.he).filter(h=>lc.includes(h));
  if(hm.length){s+=4*hm.length;why.push('hợp linh căn '+hm.map(h=>ELEMENT_NAMES[h]||h).join('/'))}
  const tc=String(nv.theChat||'');
  const TC={kiem:'kiem_cot',the:['thiet_cot','hoang_co','huyen_vu'],thi:'am_hon',quy:'am_hon',dan:'bach_thao',ma:['huyen_vu','hoang_co'],doc:['huyen_vu','hoang_co']};
  if(TC[b.k]&&[TC[b.k]].flat().some(x=>tc.includes(x))){s+=8;why.push('thể chất hợp')}
  if(tc.includes('liet_duong')&&TA_BUILDS_B.includes(b.k)){s-=6;why.push('Liệt Dương phản phệ tà ×1,5')}
  return{s,why};
}
const PATH_W={0:0,1:1,2:3,3:3};
const PATH_MUC=[['0','Không theo lối (chỉ xét sức mạnh)'],['1','Ưu tiên đồ của lối'],['2','Ưu tiên mạnh'],['3','Chỉ dùng đồ của lối']];


const MODES=[['danh','Chiến đấu'],['tu','Tu luyện'],['can','Cân bằng']];
const bld={pref:{body:'current',mainElement:'auto',subs:[],school:'tu_do',alignment:'auto'},iters:500,busy:false,results:null,mode:'danh',msg:''};
const opt=(arr,v)=>arr.map(([k,n])=>`<option value="${E(k)}" ${k===v?'selected':''}>${E(n)}</option>`).join('');
function rootText(){const lc=me().linhCan;if(!lc||typeof lc!=='object')return'—';return[({vo:'Vô linh căn',tap:'Tạp linh căn',song:'Song linh căn',thien:'Thiên linh căn',bien_di:'Biến dị linh căn'})[lc.pham]||lc.pham,A(lc.he).map(h=>ELEMENT_NAMES[h]||h).join(' · ')].filter(Boolean).join(' · ')}
function bodyOptions(){const cur=me().theChat,col=C.theChat,out=[['current',`Hiện tại · ${T(col?.get?.(cur)?.ten||cur||'—')}`]];if(col instanceof Map)for(const[id,r] of col)if(id!==cur)out.push([id,T(r?.ten||id)]);return out}

function buildResultHtml(){
  const res=bld.results?.[bld.mode];if(!res)return'';
  const b=res.best,c=res.current,R=b.R||{},P=b.P||{},delta=(b.s??b.score??0)-(c.s??c.score??0);
  let rules=b.rules,audit=b.audit;
  let pieces=A(rules&&rules.pieces);
  if(!pieces.length&&audit&&audit.pieces){
    pieces=A(audit.pieces).map(p=>({name:p.ten||p.name,elements:A(p.he||p.elements),alignment:p.alignment||(p.isEvil?'ta':'chinh'),connected:p.thong??p.connected,heSo:p.heSo}));
  }
  if(!pieces.length&&b.manh){
    pieces=A(b.manh).map((m,i)=>{
      const it=C.items.get(m.item),rm=A(R.manh)[i];
      return{id:m.item,item:m.item,name:it?.ten||m.item,elements:A(it?.he),alignment:A(it?.tag).some(t=>['ma','nghich','quy','thi','doc','hop_hoan'].includes(t))?'ta':'chinh',connected:rm?!!rm.thong:true,heSo:rm?.heSo};
    });
  }
  if(pieces.length&&R.manh){
    pieces=pieces.map((x,i)=>{
      if(x.heSo!=null)return x;
      const rm=A(R.manh)[i];
      return rm?Object.assign({},x,{heSo:rm.heSo}):x;
    });
  }
  const nEn=b.n||b.enemyCount||0,nghich=R.diemNghich||0,dp=R.biDong?.dot_pha||0;
  const phaPhe=Math.min(0.15,0.03*nghich),dpShow=Math.min(0.12,dp),netBreak=dpShow-phaPhe;
  let grid='';try{grid=BuildEngine.drawGrid(BuildEngine.nvNow(),b.manh).replace('class="vk-img"','class="grid-img"')}catch{}
  const modeNote=bld.mode==='danh'?'Bộ Chiến đấu tối ưu số trận thắng trên trận mẫu (tinh anh/boss).'
    :bld.mode==='tu'?'Bộ Tu luyện tối ưu tốc độ + đột phá thực (đột phá công pháp kẹp ≤12%, mỗi điểm nghịch −3% đột phá, trần −15%). Số thắng chỉ mang tính tham khảo.'
    :'Bộ Cân bằng trộn thắng trận và tu luyện.';
  // Chỉ mảnh thông. Format: Tên · Hệ/Cảnh/xHệSố  (vd Thủy/Hóa Thần/x1.25) — không kèm phẩm
  pieces=pieces.filter(x=>x.connected!==false);
  const pieceRows=pieces.map((x,idx)=>{
    const he0=A(x.elements)[0]||'vo_sac';
    const col=HE_COLOR[he0]||HE_COLOR.vo_sac||'#a39b8c';
    const heTxt=A(x.elements).map(h=>ELEMENT_NAMES[h]||h).join('/')||'—';
    const it=C.items.get(x.id)||C.items.get(x.item);
    const cgTxt=it!=null&&it.canh_gioi!=null?cgTen(it.canh_gioi):(x.cap||'—');
    const hs=x.heSo!=null?x.heSo:null;
    const mid=E(heTxt)+'/'+E(String(cgTxt))+'/'+(hs!=null?('x'+F(hs)):'x?');
    return '<div class="row" style="align-items:center;gap:6px;padding:3px 0;border-bottom:1px dashed rgba(255,255,255,.06)">'
      +'<span style="width:1.4em;text-align:right;opacity:.65;flex:none">'+String(idx+1)+'</span>'
      +'<i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:'+col+';flex:none"></i>'
      +'<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">'+E(x.name)+' · '+mid+'</span></div>';
  }).join('');
  return '<div class="panel"><div class="sub" style="margin-bottom:6px">'+modeNote+((b.hypo||bld.hypo)?' <b>[Giả định]</b>':'')+'</div>'+(A(b.missing).length?('<div class="sub" style="margin:4px 0">Cần có / sẽ thêm khi xếp: <b>'+A(b.missing).slice(0,16).map(id=>E((C.items.get(id)||{}).ten||id)).join(', ')+(b.missing.length>16?'…':'')+'</b> ('+b.missing.length+' món).</div>'):'')
    +'<div class="tags" style="margin-bottom:6px"><span class="tag '+(delta>0?'g':'')+'">'+(b.same?'Cách xếp hiện tại đã tốt':'Tăng '+F(delta)+' điểm heuristic')+'</span>'
    +'<span class="tag">Thắng '+(b.wins??0)+'/'+nEn+' trận mẫu</span>'
    +'<span class="tag '+((rules&&rules.dead)||(b.mq&&b.mq.dead)?'r':'g')+'">'+((rules&&rules.dead)||(b.mq&&b.mq.dead)||0)+' mảnh đứt mạch</span></div>'
    +'<div class="stats"><div>Tốc độ tu luyện<b>+'+F((R.biDong?.toc_do||0)*100)+'%</b></div>'
    +'<div>Đột phá (công pháp)<b>+'+F(dp*100)+'%'+(dp>0.12?' → kẹp '+F(dpShow*100)+'%':'')+'</b></div>'
    +'<div>Linh lực mỗi lượt<b>'+F(P.linhLucMoiLuot||0)+'</b></div>'
    +(()=>{const costs=(P.chieu||[]).filter(x=>x.dang&&x.phi>0).map(x=>x.phi);const minC=costs.length?Math.min(...costs):0;const sumC=costs.reduce((a,b)=>a+b,0);const ll=P.linhLucMoiLuot||0;const ok1=!minC||ll>=minC,ok2=!sumC||ll>=sumC;return '<div>Chiêu / lượt<b class="'+(ok1?'ok':'r')+'">'+F(ll)+' hồi · min '+F(minC)+' · tổng '+F(sumC)+(ok2?' ✓':' ⚠ thiếu')+'</b></div>';})()
    +'<div>Điểm nghịch<b class="'+(nghich>0?'r':'')+'">'+nghich+(nghich>0?' (−'+F(phaPhe*100)+'% đột phá)':'')+'</b></div>'
    +'<div>Đột phá thực<b class="'+(netBreak<0?'r':'')+'">'+(netBreak>=0?'+':'')+F(netBreak*100)+'%</b></div>'
    +'<div>Thông mạch<b>'+(b.mq?.connected||0)+'/'+A(b.manh).length+'</b></div>'
    +'<div>Khí huyết<b>'+F(P.khiHuyetToiDa||0)+'</b></div>'
    +(()=>{try{const ps=BuildEngine.pathShareInfo(A(b.manh).map(m=>({item:m.item,cells:null,m})));return '<div>Phủ lối / tà<b class="'+(ps.okPath&&ps.okAlign?'ok':'r')+'">'+F(ps.shareMatch*100)+'% lối · '+F(ps.shareEvil*100)+'% tà → '+(ps.path==='ta'?'Tà':'Chính')+(ps.okPath&&ps.okAlign?' ✓':' ⚠')+'</b></div>'}catch(e){return ''}})()
    +'</div>'
    +'<div class="grid">'+grid+'</div>'
    +'<div style="margin-top:10px"><div class="sub" style="margin-bottom:4px"><b>Từng mảnh trên kinh mạch ('+pieces.length+')</b></div>'
    +(pieces.length?pieceRows:'<div class="sub">Không đọc được danh sách mảnh.</div>')
    +'</div></div>';
}
VIEWS.build=()=>{
  const p=bld.pref;
  const nv=me();
  const R0=Math.max(0,Math.min(5,Number(nv.canhGioi)||0));
  if(!bld.path)bld.path={k:(p.school&&p.school!=='tu_do')?p.school:'',w:(p.school&&p.school!=='tu_do')?1:0};

  const lc=nv.linhCan||{};
  const heList=A(lc.he).filter(Boolean);
  const mainHe=heList[0]||'auto';
  const subHe=heList.slice(1);
  const pathK=bld.path.k||'';
  const pathW=bld.path.w||0;
  const school=pathK&&pathW>0?pathK:'tu_do';
  const align=TA_BUILDS_B.includes(school)?'ta':'auto';
  p.body='current';
  p.mainElement=mainHe==='auto'?'auto':mainHe;
  p.subs=subHe.slice();
  p.school=school;
  p.alignment=align;

  const ranked=BUILDS.map(b=>({b,f:buildFit(b,nv)})).sort((a,c)=>c.f.s-a.f.s);
  const curB=pathK?BUILDS.find(x=>x.k===pathK):null;
  const R=bld.buildR!=null?bld.buildR:R0;
  bld.buildR=R;

  const schoolSel='<select id="b-school" class="grow">'+[['tu_do','Tự do (không theo lối)'],...BUILDS.map(b=>[b.k,'['+b.nhom+'] '+b.ten])].map(([k,n])=>'<option value="'+E(k)+'" '+(k===(pathK||'tu_do')?'selected':'')+'>'+E(n)+'</option>').join('')+'</select>';
  const wSel='<select id="b-pw" class="grow">'+PATH_MUC.map(([v,t])=>'<option value="'+v+'" '+(String(pathW)===v?'selected':'')+'>'+E(t)+'</option>').join('')+'</select>';
  const itSel='<select id="b-it" class="grow">'+[['250','Nhanh'],['500','Cân bằng'],['900','Tính kỹ']].map(([k,n])=>'<option value="'+k+'" '+(String(bld.iters)===k?'selected':'')+'>'+n+'</option>').join('')+'</select>';
  const rSel='<div class="chips" style="flex-wrap:wrap;margin:6px 0">'+[1,2,3,4,5].map(r=>'<button type="button" class="chip '+(r===R?'on':'')+'" data-br="'+r+'">'+E(cgTen(r))+(r===R0?' · hiện':'')+'</button>').join('')+'</div>';

  let picksHtml='';
  if(curB){
    const picks=buildPicks(curB,R);
    const ORDER=['tam','ngulinh','cong','kc','thu','bd','trung','dopho','tran','phu','dihoa','dungcu'];
    const row=it=>{
      const own=(nv.tuiDo&&nv.tuiDo[it.id]>0)||A(nv.kinhMach?.manh).some(m=>m.item===it.id);
      return '<div class="row"><span><b>'+E(it.ten)+'</b>'+(own?' <span class="tag g">có</span>':'')+'<small> · '+E(A(it.he).map(h=>ELEMENT_NAMES[h]||h).join('/')||'—')+' · '+E(PHAM_TEN[(it.pham_cap||1)-1]||'')+' · từ '+E(cgTen(it.canh_gioi??0))+'</small></span><b>'+(it.gia?'~'+F(it.gia):'—')+'</b></div>';
    };
    picksHtml=ORDER.filter(g=>picks[g]?.length).map(g=>'<div class="sub" style="margin-top:8px"><b>'+E(GROUP_TEN[g])+'</b></div>'+picks[g].map(row).join('')).join('')||'<div class="sub">Chưa có món phù hợp ở cảnh giới này trong content.</div>';
  }
  const fitLine=ranked.slice(0,3).map(x=>'<b>'+E(x.b.ten)+'</b>'+(x.f.why.length?' ('+E(x.f.why.join(', '))+')':'')).join(' · ');
  const theChatTen=T(C.theChat?.get?.(nv.theChat)?.ten||nv.theChat||'—');
  const nLoad=Math.max(1,A(nv.kinhMach?.loadouts).length||1);
  const hePhuTxt=subHe.length?subHe.map(h=>ELEMENT_NAMES[h]||h).join(', '):'—';

  const applyBar=bld.results?('<div style="margin:8px 0">'
    +'<div class="bar" style="flex-wrap:wrap;gap:6px">'
    +[0,1,2].map(i=>'<button type="button" class="btn '+(i===0?'pri':'')+'" data-apply-slot="'+i+'" '+(i>=nLoad?'disabled':'')+'>Xếp vào bộ '+(i+1)+(i>=nLoad?' (chưa mở)':'')+'</button>').join('')
    +'</div>'
    +'<div class="bar" style="margin-top:6px"><button type="button" class="btn" id="b-apply-all" style="width:100%">Xếp cả 3 bộ (Chiến đấu / Tu luyện / Cân bằng)</button></div>'
    +'</div>'):'';

  body.innerHTML='<div class="panel"><b style="color:var(--gold)">Kinh mạch · Lối build</b>'
    +'<div class="sub">Chọn lối + mức ưu tiên + mức tính. Thông số nhân vật đọc tự động.</div>'
    +'<div class="bar" style="margin-top:8px;flex-wrap:wrap;gap:6px">'+schoolSel+wSel+itSel+'</div>'
    +'<div class="sub" style="margin-top:6px">Gợi ý lối: '+(fitLine||'—')+'</div></div>'
    +'<div class="panel"><div class="sub" style="line-height:1.55">'
    +'<div><b>Thông số đang áp dụng</b></div>'
    +'<div>'+E(cgTen(nv.canhGioi))+(N(nv.tieuCanhGioi)?' · '+(['Sơ','Trung','Hậu','ĐVM'][nv.tieuCanhGioi]||''):'')+' · '+E(theChatTen)+'</div>'
    +'<div>Linh căn: '+E(rootText())+'</div>'
    +'<div>Hệ chính: '+E(mainHe==='auto'?'—':(ELEMENT_NAMES[mainHe]||mainHe))+' · Hệ phụ: '+E(hePhuTxt)+'</div>'
    +'<div>Lối xếp: '+E(curB?curB.ten:'Không ép lối')+(pathW?' (mức '+pathW+')':'')+' · '+(align==='ta'?'Tà (theo lối)':'Theo lối')+' · Bộ mở: '+nLoad+'/3</div>'
    +'</div></div>'
    +(curB?('<div class="panel"><b style="color:var(--gold)">'+E(curB.ten)+' · cốt lõi</b>'
      +'<ul style="margin:6px 0 0;padding-left:18px;font-size:13px">'+curB.core.map(x=>'<li>'+x+'</li>').join('')+'</ul>'
      +'<div class="sub" style="margin-top:8px">Đồ lắp gợi ý ở '+E(cgTen(R))+':</div>'
      +rSel+picksHtml+'</div>'):'')
    +'<div class="panel"><b style="color:var(--gold)">Xếp kinh mạch tối ưu</b>'
    +'<div class="sub" style="margin-bottom:8px">Trận mẫu: tinh anh + boss. Dùng đồ trong túi, theo lối và thông số trên.</div>'
    +'<div class="acts" style="flex-wrap:wrap;gap:4px">'
    +'<button class="btn pri" id="b-go" style="padding:4px 8px;font-size:12px" '+(bld.busy?'disabled':'')+'>'+(bld.busy?'…':'Phân tích thực tế')+'</button>'
    +'<button class="btn" id="b-go-hypo" style="padding:4px 8px;font-size:12px" '+(bld.busy?'disabled':'')+' title="Cùng thuật toán; pool = toàn đồ game phù hợp cảnh giới">Phân tích giả định</button>'
    +'<button class="btn" id="b-stop" style="padding:4px 8px;font-size:12px" '+(bld.busy?'':'disabled')+'>Dừng</button></div>'
    +'<div class="sub" style="margin-top:4px">Hai chế độ cùng thuật toán xếp. <b>Thực tế</b> = đồ trong túi · <b>Giả định</b> = cả đồ chưa có (đúng cảnh). Khi xếp giả định sẽ cố thêm món thiếu vào túi.</div>'
    +'<div class="bar2"><i id="b-bar"></i></div><div class="sub" id="b-msg">'+E(bld.msg)+(bld.results&&bld.hypo?' <span class="tag o">Chế độ giả định</span>':'')+'</div></div>'
    +(bld.results?('<div class="seg">'+MODES.map(([k,n])=>'<button type="button" data-mode="'+k+'" class="'+(bld.mode===k?'on':'')+'">'+n+'</button>').join('')+'</div>'
      +applyBar+buildResultHtml()):'');

  const syncPath=()=>{
    const k=$(body,'#b-school')?.value||'tu_do';
    const w=+($(body,'#b-pw')?.value||0);
    bld.path={k:k==='tu_do'?'':k,w:k==='tu_do'?0:w};
    p.school=k==='tu_do'?'tu_do':k;
    bld.iters=+($(body,'#b-it')?.value||bld.iters);
  };
  $(body,'#b-school')&&($(body,'#b-school').onchange=()=>{syncPath();VIEWS.build()});
  $(body,'#b-pw')&&($(body,'#b-pw').onchange=()=>{syncPath();VIEWS.build()});
  $(body,'#b-it')&&($(body,'#b-it').onchange=()=>{bld.iters=+$(body,'#b-it').value});
  $$(body,'[data-br]').forEach(el=>el.onclick=()=>{bld.buildR=+el.dataset.br;VIEWS.build()});
  $$(body,'[data-mode]').forEach(x=>x.onclick=()=>{bld.mode=x.dataset.mode;VIEWS.build()});
  $(body,'#b-stop')&&($(body,'#b-stop').onclick=()=>BuildEngine.stop());
  const runOptimize=async(hypo)=>{
    syncPath();
    const he=A((me().linhCan||{}).he);
    p.body='current';
    p.mainElement=he[0]||'auto';
    p.subs=he.slice(1);
    p.school=bld.path.k&&bld.path.w>0?bld.path.k:'tu_do';
    p.alignment=TA_BUILDS_B.includes(p.school)?'ta':'auto';
    p.hypo=!!hypo;
    p.pathW=bld.path.w||0;
    bld.hypo=!!hypo;
    bld.busy=true;bld.msg=hypo?'Đang xếp giả định (toàn đồ game)…':'Đang chuẩn bị…';VIEWS.build();
    const msg=()=>$(body,'#b-msg'),bar=()=>$(body,'#b-bar');
    try{
      await BuildEngine.ensureCore(x=>{if(msg())msg().textContent=x});
      bld.results=await BuildEngine.optimizeThree(p,bld.iters,(f,m,l)=>{if(bar())bar().style.width=Math.round(f*100)+'%';if(msg())msg().textContent=(MODES.find(x=>x[0]===m)?.[1]||'')+' · '+l+' · '+Math.round(f*100)+'%'});
      bld.msg=hypo?'Xong giả định. Có thể xếp vào bộ (sẽ thêm món thiếu vào túi nếu được).':'Xong. Chọn hướng, bấm xếp vào bộ 1/2/3 hoặc xếp cả 3 bộ.';
    }catch(e){console.error(e);bld.msg='Chưa tính được: '+(e?.message||e)}
    finally{bld.busy=false;if(ui.tab==='build'&&ui.isOpen)VIEWS.build()}
  };
  $(body,'#b-go')&&($(body,'#b-go').onclick=()=>runOptimize(false));
  $(body,'#b-go-hypo')&&($(body,'#b-go-hypo').onclick=()=>runOptimize(true));
  $$(body,'[data-apply-slot]').forEach(btn=>btn.onclick=async()=>{
    const slot=+btn.dataset.applySlot;
    const r=await BuildEngine.apply(bld.mode,slot,{hypo:!!bld.hypo});
    toast((r.ok?'Đã xếp «'+(MODES.find(x=>x[0]===bld.mode)?.[1]||bld.mode)+'» vào Bộ '+(slot+1)+'. ':'')+(r.msg||''),r.ok?'ok':'',8000);
    render();
  });
  $(body,'#b-apply-all')&&($(body,'#b-apply-all').onclick=async()=>{
    const rs=await BuildEngine.applyAll({hypo:!!bld.hypo});
    toast(rs.map((y,i)=>'Bộ '+(i+1)+' ('+MODES[i][1]+'): '+y.msg).join('\n'),'ok',10000);
    render();
  });
};


/* ───────── Tab: Vật phẩm ───────── */
const TYPE_NAMES={cong_phap:'Công pháp',phap_khi:'Pháp khí',dan_duoc:'Đan dược',nguyen_lieu:'Nguyên liệu',linh_duoc:'Linh dược',yeu_tai:'Yêu tài',phu_luc:'Phù lục',tran_ban:'Trận bàn',don_phuong:'Đơn phương',dung_cu:'Dụng cụ',di_hoa:'Dị hỏa',dac_san:'Đặc sản',phuong_tien:'Phương tiện',tru_vat:'Trữ vật',trung_thu:'Trứng thú',lenh_bai:'Lệnh bài',tran_van:'Trận văn',khac:'Khác'};
const GRADE_NAMES={1:'Phàm phẩm',2:'Hoàng phẩm',3:'Huyền phẩm',4:'Địa phẩm',5:'Thiên phẩm',6:'Tiên phẩm',7:'Thần phẩm',8:'Nghịch Thiên'};
let itemIdx=null;
const itemIndex=()=>itemIdx||(itemIdx=[...C.items].map(([id,r])=>({id,r,name:T(r.ten||id),key:norm(`${r.ten||''} ${TYPE_NAMES[r.loai]||r.loai||''} ${A(r.tag).join(' ')} ${A(r.he).join(' ')}`)})).sort((a,b)=>a.name.localeCompare(b.name,'vi')));
const itemUi={q:'',type:'all',grade:'all',he:'all',bag:false,limit:30};
const inBag=id=>Number(me().tuiDo?.[id]||0),waiting=id=>Number(me().choCat?.[id]||0);
const BAG_MAX=999999;
async function addItemToBag(id,qty){
  const nv=me(),rec=C.items.get(id),n=Math.floor(Number(qty));
  if(!nv||!rec)return{ok:false,msg:'Chưa có kiếp đang chơi hoặc vật phẩm không tồn tại.'};
  if(!Number.isFinite(n)||n<1)return{ok:false,msg:'Số lượng phải từ 1 trở lên.'};
  if(n>BAG_MAX)return{ok:false,msg:`Tối đa ${F(BAG_MAX)} mỗi lần.`};
  if(run().tran)return{ok:false,msg:'Đang trong trận, chờ xong trận rồi thêm.'};
  const before=inBag(id),waitBefore=waiting(id);let manual=false;
  try{const K=await BuildEngine.ensureCore();if(K.ni){K.ni({...g.env,run:run(),meta:g.state.meta,enc:undefined,noticeLines:[]},id,n)}else manual=true}catch{manual=true}
  if(manual&&inBag(id)===before&&waiting(id)===waitBefore){
    nv.tuiDo??={};const used=Object.keys(nv.tuiDo).filter(k=>nv.tuiDo[k]>0).length,cap=30+Number(nv.oTuiThem||0);
    if(before>0||used<cap)nv.tuiDo[id]=before+n;else{nv.choCat??={};nv.choCat[id]=waitBefore+n}
  }
  const got=inBag(id)-before,wait=waiting(id)-waitBefore;
  try{g.store.setState({run:{...run()}})}catch{}
  if(got<=0&&wait<=0)return{ok:false,msg:'Không thêm được vật phẩm này.'};
  return{ok:true,msg:`Đã thêm ${F(got)} ${T(rec.ten||id)} vào túi${wait>0?` · ${F(wait)} đang chờ cất vì túi đầy`:''}.`};
}
VIEWS.items=()=>{
  // Đủ mọi entry trong content.items (Map game); bộ lọc loai/phẩm khớp enum game
  const allIdx=itemIndex();
  const typeOrder=['cong_phap','phap_khi','dan_duoc','linh_duoc','nguyen_lieu','yeu_tai','phu_luc','tran_ban','don_phuong','dung_cu','di_hoa','dac_san','phuong_tien','tru_vat','trung_thu','lenh_bai','tran_van','khac'];
  const types=[...new Set(allIdx.map(x=>x.r.loai).filter(Boolean))].sort((a,b)=>{
    const ia=typeOrder.indexOf(a),ib=typeOrder.indexOf(b);
    return (ia<0?99:ia)-(ib<0?99:ib)||String(TYPE_NAMES[a]||a).localeCompare(TYPE_NAMES[b]||b,'vi');
  });
  const grades=[...new Set(allIdx.map(x=>x.r.pham_cap).filter(N))].sort((a,b)=>a-b);
  const needHe=itemUi.type==='cong_phap'||itemUi.type==='phap_khi';
  if(!needHe)itemUi.he='all';
  const heSet=new Set();
  if(needHe){
    for(const x of allIdx){
      if(x.r.loai!==itemUi.type)continue;
      for(const h of A(x.r.he))if(h)heSet.add(h);
    }
  }
  const heList=[...heSet].sort((a,b)=>String(ELEMENT_NAMES[a]||a).localeCompare(ELEMENT_NAMES[b]||b,'vi'));
  const q=norm(itemUi.q);
  const all=allIdx.filter(x=>{
    if(itemUi.type!=='all'&&x.r.loai!==itemUi.type)return false;
    if(itemUi.grade!=='all'&&String(x.r.pham_cap)!==itemUi.grade)return false;
    if(needHe&&itemUi.he!=='all'&&!A(x.r.he).includes(itemUi.he))return false;
    if(itemUi.bag&&!(inBag(x.id)>0||waiting(x.id)>0))return false;
    if(q&&!x.key.includes(q)&&!norm(x.name).includes(q))return false;
    return true;
  });
  const shown=all.slice(0,itemUi.limit);
  const heSel=needHe?`<select id="i-he"><option value="all">Mọi hệ</option>${heList.map(h=>`<option value="${E(h)}" ${itemUi.he===h?'selected':''}>${E(ELEMENT_NAMES[h]||h)}</option>`).join('')}</select>`:'';
  body.innerHTML=`<div class="bar"><input type="search" id="i-q" placeholder="Tìm vật phẩm…" value="${E(itemUi.q)}" class="grow"></div>
  <div class="bar" style="flex-wrap:wrap;gap:6px">
    <select id="i-type"><option value="all">Mọi loại</option>${types.map(t=>`<option value="${E(t)}" ${itemUi.type===t?'selected':''}>${E(TYPE_NAMES[t]||t)}</option>`).join('')}</select>
    <select id="i-grade"><option value="all">Mọi phẩm</option>${grades.map(g=>`<option value="${g}" ${String(itemUi.grade)===String(g)?'selected':''}>${E(GRADE_NAMES[g]||('Phẩm '+g))}</option>`).join('')}</select>
    ${heSel}
    <button class="chip ${itemUi.bag?'on':''}" id="i-bag">Đang có</button>
  </div>
  <div class="sum">${F(all.length)} / ${F(allIdx.length)} vật phẩm${all.length>shown.length?` · hiện ${shown.length}`:''}</div>
  ${shown.map(({id,r})=>`<article class="card" data-item="${E(id)}" style="grid-template-columns:1fr auto"><div><b>${E(T(r.ten||id))}</b><small>${E(TYPE_NAMES[r.loai]||r.loai||'')} · ${E(GRADE_NAMES[r.pham_cap]||'')}${N(r.canh_gioi)?` · ${E(cgTen(r.canh_gioi)||('cảnh '+r.canh_gioi))}`:''}${A(r.he).length?' · '+E(A(r.he).map(h=>ELEMENT_NAMES[h]||h).join('/')):''}</small></div><div class="side">${inBag(id)?`Túi: ${F(inBag(id))}`:''}${waiting(id)?`<small>Chờ cất: ${F(waiting(id))}</small>`:''}</div>${r.mo_ta?`<small style="grid-column:1/3">${E(T(r.mo_ta).slice(0,140))}</small>`:''}<div class="acts" style="grid-column:1/3"><input class="qty" type="number" inputmode="numeric" min="1" max="${BAG_MAX}" value="1" aria-label="Số lượng"><button class="btn pri" data-add="${E(id)}">Thêm vào túi</button></div><small class="addmsg" style="grid-column:1/3"></small></article>`).join('')||'<div class="empty">Không tìm thấy vật phẩm.</div>'}
  ${all.length>shown.length?'<button class="btn" id="i-more" style="width:100%">Xem thêm</button>':''}`;
  let t;$(body,'#i-q').oninput=e=>{itemUi.q=e.target.value;itemUi.limit=30;clearTimeout(t);t=setTimeout(()=>{VIEWS.items();const i=$(body,'#i-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)};
  $(body,'#i-type').onchange=e=>{itemUi.type=e.target.value;if(itemUi.type!=='cong_phap'&&itemUi.type!=='phap_khi')itemUi.he='all';itemUi.limit=30;render()};
  $(body,'#i-grade').onchange=e=>{itemUi.grade=e.target.value;itemUi.limit=30;render()};
  $(body,'#i-he')&&($(body,'#i-he').onchange=e=>{itemUi.he=e.target.value;itemUi.limit=30;render()});
  $(body,'#i-bag').onclick=()=>{itemUi.bag=!itemUi.bag;itemUi.limit=30;render()};
  $(body,'#i-more')?.addEventListener('click',()=>{itemUi.limit+=30;render()});
  $$(body,'[data-add]').forEach(b=>b.onclick=async()=>{const card=b.closest('[data-item]'),qty=$(card,'.qty').value,out=$(card,'.addmsg');b.disabled=true;const res=await addItemToBag(b.dataset.add,qty);b.disabled=false;out.textContent=res.msg;out.style.color=res.ok?'var(--jade)':'#ff8d80';if(res.ok){const s=$(card,'.side');s.firstChild?.remove?.();s.insertAdjacentHTML('afterbegin',`Túi: ${F(inBag(b.dataset.add))}`)}});
  $$(body,'.qty').forEach(i=>i.onkeydown=e=>{if(e.key==='Enter')i.closest('[data-item]').querySelector('[data-add]').click()});
};


/* ───────── Tab: Kiểm tra ───────── */
function checks(){
  const rows=[],add=(group,name,ok,note='')=>rows.push({group,name,ok,note}),nv=me(),r=run();
  const fnOk=k=>typeof g[k]==='function';
  add('Chức năng của game','Thời gian đi đường',fnOk('travelYears'));add('Chức năng của game','Quãng đường (dặm)',fnOk('distanceLi'));
  add('Chức năng của game','Việc treo thưởng đã nhận',fnOk('orderList'));add('Chức năng của game','Tiện ích tại nơi chốn',fnOk('facilitiesAt'));
  add('Chức năng của game','Đổi bộ kinh mạch',fnOk('switchLoadout'));add('Chức năng của game','Đặt / tháo mảnh kinh mạch',fnOk('datManh')&&fnOk('goManh')&&fnOk('doiManh'));
  add('Dữ liệu kiếp này','Vị trí nhân vật',hasSlot(r.viTri));add('Dữ liệu kiếp này','Kinh mạch',Array.isArray(nv.kinhMach?.manh));add('Dữ liệu kiếp này','Túi đồ',typeof nv.tuiDo==='object');
  add('Dữ liệu kiếp này','Bản đồ',typeof window.map?.cam==='object','Mở bản đồ để vẽ đường');
  const K=BuildEngine.core;
  if(!K)add('Tính toán nâng cao','Chưa chuẩn bị',null,'Bấm "Kiểm tra lại"');
  else{for(const [k,label] of Object.entries(K.labels||{}))if(k!=='PO')add('Tính toán nâng cao',label,Boolean(K[k]));add('Tính toán nâng cao','Phiên bản game đang chạy',true,K.bundle||'')}
  return rows;
}
VIEWS.check=()=>{
  const rows=checks(),bad=rows.filter(x=>x.ok===false),groups=[...new Set(rows.map(x=>x.group))];
  body.innerHTML=`<div class="panel"><b style="color:var(--gold)">${bad.length?`${bad.length} mục chưa khớp với bản game hiện tại`:'Mọi mục đều khớp với bản game'}</b><div class="sub">Phiên bản trợ thủ ${E(BUILD)}. Game vừa cập nhật mà có chức năng không chạy thì bấm kiểm tra lại, rồi sao chép báo cáo gửi cho người làm.</div><div class="acts" style="margin-top:8px"><button class="btn pri" id="c-run">Kiểm tra lại</button><button class="btn" id="c-copy">Sao chép báo cáo</button></div><div class="sub" id="c-msg"></div></div>
  ${groups.map(gr=>`<h3>${E(gr)}</h3><div class="panel">${rows.filter(x=>x.group===gr).map(x=>`<div class="row"><span>${x.ok===true?'<b class="ok">✔</b>':x.ok===false?'<b class="bad">✘</b>':'…'} ${E(x.name)}</span><small>${E(x.note)}</small></div>`).join('')}</div>`).join('')}`;
  $(body,'#c-run').onclick=async e=>{e.target.disabled=true;const m=$(body,'#c-msg');BuildEngine.reset();try{await BuildEngine.ensureCore(x=>{m.textContent=x})}catch(err){m.textContent='Chưa chuẩn bị được: '+(err.message||err)}render()};
  $(body,'#c-copy').onclick=async()=>{const rep=JSON.stringify({ban:BUILD,gio:new Date().toISOString(),game:BuildEngine.core?.bundle||null,thieu:BuildEngine.core?.lost||null,loi:rows.filter(x=>x.ok===false).map(x=>`${x.group}: ${x.name}`),dat:rows.filter(x=>x.ok===true).length},null,2),m=$(body,'#c-msg');try{await navigator.clipboard.writeText(rep);m.textContent='Đã sao chép báo cáo.'}catch{m.textContent=rep}};
};

/* ───────── Tab: Đột phá & Thọ ───────── */
const REALMS=['Phàm Nhân','Luyện Khí','Trúc Cơ','Kết Đan','Nguyên Anh','Hóa Thần'],STAGES=['Sơ kỳ','Trung kỳ','Hậu kỳ','Đại viên mãn'],BASE_LIFE=[70,120,280,550,1100,2200];
const effectItems=key=>[...C.items.values()].filter(it=>A(it.dung).some(d=>d&&typeof d==='object'&&key in d));
const effectOf=(it,key)=>{for(const d of A(it.dung))if(d&&typeof d==='object'&&key in d)return d[key]};
const ownedText=id=>inBag(id)>0?`<b class="ok">Có ${F(inBag(id))}</b>`:'<span class="sub">Chưa có</span>';
const pillRow=(it,extra)=>`<div class="row"><span><b>${E(T(it.ten))}</b>${extra?` · ${E(extra)}`:''}${it.gia?` <small>(giá ${F(it.gia)})</small>`:''}</span>${ownedText(it.id)}</div>`;
function coreContext(){const K=BuildEngine.core,r=structuredClone(run()),meta=structuredClone(g.state.meta||{}),rng=new K.fn(r.rng),cache=new Map();r.rngKeys??={};return{...g.env,run:r,meta,rng,enc:r.active,noticeLines:[],rngFor(key){let x=cache.get(key);if(!x){const seed=Object.hasOwn(r.rngKeys,key)?r.rngKeys[key]:undefined;x=seed===undefined?K.fn.fromSeed(`${r.seed}|rng|${key}`):new K.fn(seed);cache.set(key,x)}return x}}}
let btToken=0;
VIEWS.breakthrough=()=>{
  const tok=++btToken,nv=me(),cg=+nv.canhGioi||0,tc=+nv.tieuCanhGioi||0;
  const head=`<div class="panel"><b style="color:var(--gold)">${E(REALMS[cg]||'Cảnh giới '+cg)} · ${E(STAGES[tc]||'')}</b><div class="sub">Tu vi ${F(nv.tuVi||0)}${nv.binhCanh>0?` · đã tích ${F(nv.binhCanh)} ở bình cảnh`:''} · tuổi ${F(Math.floor(nv.tuoi||0))}</div><div class="sub" id="bt-state">Đang tính thọ nguyên và tu vi còn thiếu…</div></div><div id="bt-rest"></div>`;
  body.innerHTML=head;
  (async()=>{
    let K;try{K=await BuildEngine.ensureCore()}catch(e){K=null}
    if(tok!==btToken||ui.tab!=='breakthrough'||!ui.isOpen)return;
    const out=[];let life=null,left=null,need=null,nextNeed=null,retreat=null,years=null,stagn=false,base=null,options=[];
    if(K){
      try{const c=coreContext(),n2=c.run.nhanVat;life=K.ke?K.ke(n2):null;left=N(life)&&N(n2.tuoi)?life-n2.tuoi:null;
        try{need=K.qw?.(c,{untilExhausted:true});nextNeed=K.qw?.(c,{nextMinorRealm:true})}catch{}
        try{retreat=K.to?.(c);if(retreat&&!retreat.chan&&N(retreat.tuViNam)&&retreat.tuViNam>0&&N(need)){years=need/retreat.tuViNam;try{stagn=K.Nb?.(c,retreat,{dan:[],danSo:{}},years)<need*.97}catch{}}}catch{}
        try{const h=K.kR(c,{dan:[],thieuDot:0});base=h.tiLe;const usable=[...new Set(h.danDung||[])],burn=[0,...A(h.thieuDot).map((x,i)=>x.duoc?i+1:null).filter(Boolean)],sets=[[],...usable.map(x=>[x])];
          for(let i=0;i<usable.length;i++)for(let j=i+1;j<usable.length;j++)sets.push([usable[i],usable[j]]);
          for(const dan of sets)for(const thieuDot of burn){try{const z=K.kR(coreContext(),{dan,thieuDot});options.push({dan,thieuDot,rate:z.tiLe,burn:thieuDot?A(h.thieuDot)[thieuDot-1]?.nam:null})}catch{}}
          options.sort((a,b)=>b.rate-a.rate)}catch{}
      }catch{}
    }
    const nm=id=>T(C.items.get(id)?.ten||id),top=cg>=REALMS.length-1&&tc>=3,done=N(need)&&need<=0,ok=!done&&years!==null&&left!==null?years<left-5:null;
    $(body,'#bt-state').innerHTML=left!==null?`Thọ ${F(Math.floor(nv.tuoi||0))} / ${F(life)} · còn <b>${fmtTime(left)}</b>`:(K?'Chưa đọc được thọ nguyên.':'Chưa chuẩn bị được phép tính của game — mở tab Kiểm tra để xem chi tiết.');
    /* 1. kế hoạch tu luyện */
    if(top||done)out.push(`<h3>Tu vi</h3><div class="panel"><div class="sub">${top?`${REALMS[cg]} Đại viên mãn là mức cao nhất mà game hiện có — không còn cảnh giới kế để đột phá. Việc còn lại là giữ thọ nguyên và tìm cơ duyên.`:'Tu vi đã đủ Đại viên mãn, chỉ còn chờ đột phá lên cảnh giới kế.'}</div></div>`);
    else out.push(`<h3>Kế hoạch tới Đại viên mãn</h3><div class="panel"><div class="stats"><div>Tu vi còn thiếu<b>${N(need)?F(need):'?'}</b></div><div>Tới tiểu cảnh kế<b>${N(nextNeed)?F(nextNeed):'?'}</b></div><div>Tu vi mỗi năm<b>${N(retreat?.tuViNam)?F(retreat.tuViNam):'—'}</b></div></div>${years!==null?`<div class="sub">Bế quan tại đây cần khoảng <b>${fmtTime(years)}</b>.</div>`:''}${ok===null?'':`<div class="tags" style="margin-top:6px"><span class="tag ${ok?'g':'r'}">${ok?'Kịp: còn dư thọ an toàn':'Không kịp: thọ hiện có không đủ nếu bế quan ở đây'}</span></div>`}${retreat?.chan?`<div class="tags" style="margin-top:6px"><span class="tag r">Chỗ này không bế quan được: ${E(retreat.chan)}</span></div>`:''}${stagn?'<div class="tags" style="margin-top:6px"><span class="tag o">Lịch luyện có thể cạn giữa chừng, nên xen kẽ đi đánh hoặc đi xa.</span></div>':''}<div class="sub" style="margin-top:6px">Mỗi nơi bế quan cho tu vi mỗi năm khác nhau (linh mạch, động phủ, tông môn). Nếu không kịp, hãy đổi chỗ bế quan hoặc kéo dài thọ nguyên.</div></div>`);
    /* 2. bình cảnh */
    if(!top&&!done){const barrier=effectItems('pha_binh_canh').filter(it=>{const e=effectOf(it,'pha_binh_canh');return e?.canh_gioi===undefined||e.canh_gioi===cg}).sort((a,b)=>inBag(b.id)-inBag(a.id));
    out.push(`<h3>Bình cảnh trong tiểu cảnh</h3><div class="panel"><div class="sub">Tu vi đầy một tiểu cảnh thì phần dư dồn vào bình cảnh; chưa tích đủ thì chưa lên được. Đan phá chướng giúp vượt nhanh phần còn thiếu${nv.binhCanh>0?` — bạn đang tích ${F(nv.binhCanh)}.`:'.'}</div>${barrier.map(it=>pillRow(it,`phá ${F((effectOf(it,'pha_binh_canh')?.phan||0)*100)}% bình cảnh`)).join('')||'<div class="sub">Cảnh giới này không có đan phá chướng riêng.</div>'}</div>`)}
    /* 3. đột phá */
    const next=cg+1,pills=[...C.items.values()].filter(it=>it.dot_pha&&typeof it.dot_pha==='object'&&(it.dot_pha.canh_gioi===undefined||it.dot_pha.canh_gioi===next)).sort((a,b)=>(b.dot_pha?.ti_le||0)-(a.dot_pha?.ti_le||0)).slice(0,10);
    const best=options[0];
    if(!top)out.push(`<h3>Đột phá lên ${E(REALMS[next]||'cảnh giới kế')}</h3><div class="panel">${base!==null?`<div class="sub">Không dùng gì: <b>${F(base*100)}%</b></div>`:'<div class="sub">Chưa tính được tỉ lệ ở trạng thái hiện tại (cần đạt Đại viên mãn).</div>'}${best?`<div class="tags" style="margin:6px 0"><span class="tag g">Tốt nhất với đồ đang có: ${best.dan.length?best.dan.map(nm).join(' + '):'không dùng đan'}${best.thieuDot?` · đốt ${best.thieuDot} nấc thọ${N(best.burn)?' (−'+F(best.burn)+' năm)':''}`:''} → ${F(best.rate*100)}%</span></div>`:''}${options.length>1?`<details><summary>Các phương án khác</summary>${options.slice(0,10).map(x=>`<div class="row"><span>${x.dan.length?x.dan.map(nm).join(' + '):'Không dùng đan'}${x.thieuDot?` · đốt ${x.thieuDot} nấc`:''}</span><b>${F(x.rate*100)}%</b></div>`).join('')}</details>`:''}<div class="sub" style="margin:8px 0 4px">Đan hỗ trợ đột phá</div>${pills.map(it=>pillRow(it,`+${F((it.dot_pha.ti_le||0)*100)}%`)).join('')||'<div class="sub">Không có đan phù hợp.</div>'}<div class="sub" style="margin-top:6px">Công pháp, pháp khí có nội tại "đột phá" trên kinh mạch cũng cộng thêm tỉ lệ — dùng tab Kinh mạch, chọn hướng Tu luyện.</div></div>`);
    /* 4. chấn tổn */
    const scar=Number(run().flags?.[`dot_pha_that_bai.${next}`]||0);
    if(scar>0){const heal=effectItems('heal_breakthrough_scar');out.push(`<h3>Chấn tổn đột phá</h3><div class="panel"><div class="sub">Đạo cơ đang có <b>${scar}</b> vết rạn do đột phá thất bại, làm giảm tỉ lệ lần sau. Đan chữa chấn tổn:</div>${heal.map(it=>pillRow(it,`chữa ${effectOf(it,'heal_breakthrough_scar')} vết`)).join('')||'<div class="sub">Không có đan chữa phù hợp.</div>'}</div>`)}
    /* 5. thọ nguyên */
    const lifeItems=effectItems('tho_nguyen').sort((a,b)=>(effectOf(b,'tho_nguyen')||0)-(effectOf(a,'tho_nguyen')||0));
    out.push(`<h3>Thọ nguyên</h3><div class="panel"><div class="sub">Thọ gốc theo cảnh giới: ${BASE_LIFE.map((v,i)=>`${REALMS[i]} ${v}`).join(' · ')}. Bạn được cộng thêm ${F(nv.thoNguyenThem||0)} năm${nv.lifespanLost?`, đã hao mất ${F(nv.lifespanLost)} năm`:''}.</div>${lifeItems.map(it=>pillRow(it,`+${F(effectOf(it,'tho_nguyen'))} năm`)).join('')||'<div class="sub">Không có vật phẩm kéo dài thọ nguyên.</div>'}<div class="sub" style="margin-top:6px">Dùng nhiều lần cùng loại đan thì càng về sau càng nhạt. Lên cảnh giới mới sẽ nâng thọ gốc.</div></div>`);
    $(body,'#bt-rest').innerHTML=out.join('');
  })();
};

/* ───────── Tab: Auto Farm (API game: enterNode / tocChienTran / leavePlace) ───────── */
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
  charSnapshot(){
    const nv=me()||{};
    const bag=this.bagByPham();
    const chi={};
    const srcChi=nv.chiSo||{};
    for(const k of this.STAT_KEYS)chi[k]=Number(srcChi[k]||0);
    return{
      nam:nowYear(),
      linhThach:Number(nv.linhThach||0),
      tuVi:Number(nv.tuVi||0),
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
    const acts=A(noi?.hoatDong).map(x=>({id:x.id,loai:x.loai,ten:T(x.ten||''),locked:x.lockedReason||null})).slice(0,20);
    const choices=A(view?.choices).map(c=>({
      index:c.index,text:String(c.text||'').slice(0,80),
      risk:c.risk?.level||null,chance:c.chance,thoat:!!c.thoat,available:c.available!==false
    })).slice(0,20);
    return{
      nam:r.nam,viTri:r.viTri,oNoi:r.oNoi||null,
      thuongThe:Number(r.nhanVat?.thuongThe||0),
      canhGioi:Number(r.nhanVat?.canhGioi||0),
      linhThach:Number(r.nhanVat?.linhThach||0),
      tuVi:Number(r.nhanVat?.tuVi||0),
      active:a?{id:a.id,slot:a.slot,done:!!a.done,waiting:a.waiting?.kind||null}:null,
      encKind:view?.kind||(this.encDef?this.encDef(a?.id)?.kind:null)||null,
      huntBlock:block?String(block):null,
      sanYeuLeft:this.sanYeuLeft?this.sanYeuLeft(r.viTri):null,
      noiActs:acts,
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
    const gn=$(body,'#af-gains');
    if(gn)gn.innerHTML=`<b style="color:var(--gold)">Nhận được khi Auto</b>${this.gainsHtml()}`;
    this.syncGainsBar?.();
  },

  /* ── Thương thế & chữa trị ── */
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
  pickHealItem(){
    const nv=me(),need=this.injuryLevel();
    if(need<=0)return null;
    /* Ưu tiên hàm chọn đan của chính game (core/character/heal_item): đã tính sẵn cảnh giới đan, đan vô dụng, rẻ nhất đủ chữa */
    try{
      const hi=window.tuTien?.core?.['character/heal_item'];
      if(hi&&typeof hi.pickHealItem==='function'){
        const p=hi.pickHealItem(nv,C.items,'cheapest',run().flags||nv.flags||{});
        if(p&&p.id&&(nv.tuiDo?.[p.id]||0)>0){
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
      // Đan yếu hơn cảnh giới quá nhiều thường vô dụng — game cũng chặn
      const slack=Number(it.canh_gioi??0);
      if(Number.isFinite(slack)&&nv.canhGioi>slack+2)continue;
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
      this.push(`Thương thế: ${this.injuryName(lv)} — túi không có đan chữa`,'err',{reason});
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
      if(kind==='tong_mon')return false;
      if(/giao_dich|mua_ban|song_bac|dau_gia|cho_am|cho_phien/.test(blob))return false;
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
  isNonFarmEnc(id){
    const s=String(id||'');
    if(!s)return false;
    if(this.SKIP_PLACE_ACTS.has(s))return true;
    // Theo content.kind trong source game
    try{
      const k=String(C.encounters?.get?.(s)?.kind||'');
      if(k==='cua_hang'||k==='tu_luyen'||k==='dot_pha')return true;
    }catch{}
    return /dau_gia|song_bac|cung_duong|thap_huong|teleport|khach_diem|tra_lau|tham_ban|tinh_that|phuong_thi|hoc_duong|van_bao|an_tuc|hac_thi|lau_co_quan|sap_tho_khoi|tiem_tap|bang_treo|khai_phu|loi_dai|cho_am|cho_phien|cho_|sap_|lo_ren|thu_mua|mua_ban|cua_hang|tuyen_do|tuyen_de|nhap_mon|nhan_do/i.test(s);
  },
  isFarmPlaceAct(act){
    if(!act||act.lockedReason)return false;
    const id=String(act.id||'');
    if(!id||this.isNonFarmEnc(id))return false;
    if(this.isActBanned(run().viTri,id))return false;
    // Phế tích / khai động phủ — không phải farm tài nguyên
    if(/phe_tich|lap_dong_phu|khai_phu|dong_phu/i.test(id))return false;
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
    if(loai==='su_kien'||loai==='the_cuc'||loai==='overlay'||loai==='chien_dau'||loai==='tien_ich'||!loai){
      return this.isFarmEncounter(id);
    }
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
    const r=run(),out=[],ban=this.slotBan||{},now=Date.now();
    for(const v of A(r.viecNhan)){
      if(!v||!v.slot||!hasSlot(v.slot))continue;
      if(ban[v.slot]&&ban[v.slot]>now)continue;
      const left=N(v.hetHanNam)?+v.hetHanNam-nowYear():null;
      // Chỉ ưu tiên việc sắp hết hạn (≤5 năm) hoặc không rõ hạn nhưng gần
      if(left!==null&&left>5.5)continue;
      const travel=travelTo(v.slot);
      if(N(travel)&&travel>maxY&&v.slot!==r.viTri)continue;
      const dg=danger(v.slot);
      if(this.opts.skipTuDia&&dg.rank>=3)continue;
      const enc=v.enc||null;
      out.push({
        slot:v.slot,
        enc:enc||'job',
        title:T(v.ten||C.encounters?.get?.(enc)?.ten||'Việc treo thưởng'),
        travel,miles:milesTo(v.slot),danger:dg,
        left:left,mode:enc?'node':'enter',priority:left!==null?100-left*10:40
      });
    }
    return out;
  },
  targets(){
    const r=run(),out=[],seen=new Set();
    const boost=Math.min(3,Math.floor((this.emptyScans||0)/3));
    const maxY=(N(this.opts.radiusYears)?+this.opts.radiusYears:0.18)*(1+boost*0.55);
    const near=this.nearSlots();
    const ban=this.slotBan||(this.slotBan=Object.create(null));
    const now=Date.now();

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
      if(ban[slot]&&ban[slot]>now)continue;
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
              out.push({slot,enc,title:T(encDef?.ten||enc),travel,miles:milesTo(slot),danger:dg,left:isSan?this.sanYeuLeft(slot):null,mode:'node',priority:isSan?20:22});
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
        if(ban[slot]&&ban[slot]>now)continue;
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
        out.push({slot,enc,title:T(encDef?.ten||enc),travel,miles:milesTo(slot),danger:dg,left:isSan?this.sanYeuLeft(slot):null,mode:'node',priority:isSan?20:22});
      }
    }

    // 6) Nơi chốn gần (thôn/trấn/di tích…) — vào check hoạt động, không chỉ săn hoang dã
    if(!this.opts.onlySanYeu&&this.opts.includeNearPlaces!==false){
      for(const s of near){
        const slot=s?.id||s;if(!slot||!hasSlot(slot)||slot===r.viTri)continue;
        if(ban[slot]&&ban[slot]>now)continue;
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
      const soft=pool.filter(c=>!lv(c)||lv(c)==='ngang_suc');
      const noCombat=pool.filter(c=>!lv(c));
      if(noCombat.length)pool=noCombat;
      else if(soft.length)pool=soft;
      else{
        const esc=list.find(isThoat);
        if(esc){this.push('Không an toàn → thoát','dbg');return esc}
      }
    }

    // Bỏ phucHet nếu còn cửa khác (duyên đã hết)
    const notHet=pool.filter(c=>!c.phucHet);
    if(notHet.length)pool=notHet;

    const scored=pool.map(c=>{
      let score=0;
      const l=lv(c);
      const ch=chanceOf(c);
      // Risk — nguồn zgt game
      if(l==='an_toan')score+=100;
      else if(l==='ngang_suc')score+=30;
      else if(!l)score+=50; // không combat
      else score-=50;
      // Chance — nguồn Imt game (dễ / % )
      if(ch!=null){
        if(ch>=0.7)score+=40;
        else if(ch>=0.4)score+=15;
        else score-=20;
      }
      // Thoát: chỉ khi không còn việc
      if(isThoat(c))score-=80;
      // Có vat / phần thưởng gợi ý trên nút
      if(A(c.vat).length)score+=8;
      if(c.phucHet)score-=60;
      // Mua/cược
      if(/^(mua|trả|đặt cược|thuê|cược)\b/i.test(strip(c.text)))score-=40;
      // Đầu đàn
      if(/đầu đàn|lùng con đầu đàn/i.test(strip(c.text))){
        if(this.opts.apex==='always'&&l==='an_toan')score+=5;
        else if(this.opts.apex==='never')score-=25;
        else score-=5;
      }
      // Thứ tự content (index nhỏ = lựa chọn chính thường đứng trước)
      score+=Math.max(0,8-Number(c.index||0));
      return{c,score};
    }).sort((a,b)=>b.score-a.score||a.c.index-b.c.index);

    const best=scored[0]?.c||null;
    if(best){
      const ch=chanceOf(best);
      this.push('pick → ['+(best.index+1)+'] '+strip(best.text).slice(0,42)+' risk='+(lv(best)||'none')+(ch!=null?(' ch='+ch):'')+' score='+scored[0].score.toFixed(1),'dbg');
    }
    return best;
  },
  banSlot(slot,ms){
    if(!slot)return;
    this.slotBan=this.slotBan||Object.create(null);
    this.slotBan[slot]=Date.now()+(ms||180000);
    this.push('Tạm bỏ ô '+slot,'dbg');
  },
  banAct(slot,actId,ms){
    if(!slot||!actId)return;
    this.actBan=this.actBan||Object.create(null);
    this.actBan[slot+'|'+actId]=Date.now()+(ms||600000);
  },
  isActBanned(slot,actId){
    if(!slot||!actId)return false;
    const t=this.actBan&&this.actBan[slot+'|'+actId];
    return !!(t&&t>Date.now());
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
      this.banSlot(slot,120000);
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
      this.banSlot(slot,90000);
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
      this.banSlot(slot,45000);
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
      // Còn việc khác / cùng enc → thử 1 lần
      // Không retry activity vừa thoát/non-farm — tránh vòng luông_doi / chợ
      if(p.enc&&!p.retried&&!this.isNonFarmEnc(p.enc)){
        const still=this.placeFarmActs().some(a=>a.id===p.enc);
        if(still){
          p.retried=true;p.at=Date.now();
          try{
            g.chooseActivity?.(p.enc);
            this.push('retry chooseActivity('+p.enc+')','dbg');
            return;
          }catch(e){this.push('retry chooseActivity: '+(e.message||e),'dbg')}
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
      this.banSlot(run().viTri||a.slot,180000);
      try{g.leavePlace?.()}catch{}
      this.needInteractHere=false;
      this.push('Rời chỗ, tìm farm khác','ok');
      return 'idle';
    }
    const label=T(this.stripText(pick.text)).slice(0,80);
    const ch=pick.chance!=null?` · ${pick.chance}`:'';
    const rk=this.riskLevel(pick);
    const rkShow=rk?` · risk:${rk}`:'';
    try{
      const txt=this.stripText(pick.text).trim();
      const isCancel=pick.thoat===true||/^(thôi|hủy|đóng|bỏ qua|đi)\s*$/i.test(txt)||/rời|xem rồi đi|lảng đi|không muốn/i.test(txt);
      g.choose(pick.index);
      this.push(`Chọn [${pick.index+1}] ${label}${ch}${rkShow}`,'ok');
      if(isCancel){
        const slot=run().viTri||a.slot;
        const actId=run().active?.id||a?.id||null;
        this.banSlot(slot,600000);
        if(actId)this.banAct(slot,actId,600000);
        this.needInteractHere=false;
        this._pendingNode=null;
        // Quan trọng: Rời đi trong activity KHÔNG tự thoát nơi — phải leavePlace
        try{g.closeEncounter?.()}catch{}
        try{g.leavePlace?.()}catch{}
        this.push('Đã chọn Thoát/Đi — rời nơi, tìm chỗ khác','dbg');
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

      const ban=this.slotBan||(this.slotBan=Object.create(null));
      const here=run().viTri;
      const now=Date.now();
      const isBanned=s=>!!(ban[s]&&ban[s]>now);

      /* 1) Đang trong nơi → làm việc farm; không có thì leavePlace và ĐI CHỖ KHÁC (không enter lại cùng ô) */
      if(this.inPlace()&&!run().active){
        let acts=this.placeFarmActs();
        const leftSy=this.sanYeuLeft(here);
        const block=this.huntBlockedHere();
        const rawSan=this.placeActs().find(a=>a&&a.id==='ev.san_yeu'&&!a.lockedReason);
        const blockedSan=!!(block&&/săn cạn|hoang dã|lần theo dấu/i.test(String(block)));
        // Chỉ săn khi có act thật + còn lượt + không bị chặn (thành thị/hoang dã)
        const canSan=!!rawSan&&leftSy>0&&!blockedSan;
        if(canSan){
          if(!acts.some(a=>a.id==='ev.san_yeu'))acts=[rawSan,...acts];
          acts=[...acts].sort((a,b)=>(a.id==='ev.san_yeu'?0:1)-(b.id==='ev.san_yeu'?0:1));
        }
        if(acts.length){
          const act=acts[0];
          this.push('Tại nơi: chooseActivity('+act.id+' · '+(act.loai||'')+')'+(act.id==='ev.san_yeu'?' · còn '+leftSy:'') ,'ok');
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
            this._pendingNode={slot:here,enc:act.id,at:Date.now()};
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
        // Còn lượt săn mà không thấy act → không leave (thử reopen)
        if(leftSy>0&&!blockedSan){
          this.push('Còn '+leftSy+' lượt săn — reopenPlace @ '+here,'dbg');
          try{g.reopenPlace?.()}catch{}
          this.schedule();return;
        }
        this.push('Nơi hết việc farm → leavePlace @ '+here,'dbg',{syLeft:leftSy,block:block||null,noiActs:actIds,thongBao:run().thongBao||run().thongBaoDai||null});
        try{g.leavePlace?.()}catch{}
        const banMs=(this.isNoiChon(here)||placeDef(here))?600000:45000;
        this.banSlot(here,banMs);
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
          this.push('Đến nơi · '+nx.title+' · '+nx.slot+(N(nx.travel)?' · '+fmtTime(nx.travel):''),'ok');
          this.goEnter(nx.slot);
          this.stats.ok++;
          this.schedule();return;
        }
        // Không còn target — quét daKhamPha gần, bỏ ô đã ban
        try{
          const recent=this.recentSlots||(this.recentSlots=[]);
          const pool=A(run().daKhamPha).filter(s=>s&&s!==here&&hasSlot(s)&&!isBanned(s)&&!recent.includes(s))
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
        const pool=A(run().daKhamPha).filter(s=>s&&s!==here&&hasSlot(s)&&!isBanned(s)&&!recent.includes(s))
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
      panel.innerHTML='<div class="af-drag" data-afdrag="1"><div class="af-h">Thống kê Auto</div></div><div class="af-body"></div>';
      document.body.appendChild(panel);
      // Kéo di chuyển
      const head=panel.querySelector('[data-afdrag]');
      let drag=null;
      const onDown=(e)=>{
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
  <div class="panel" id="af-gains"><b style="color:var(--gold)">Nhận được khi Auto</b>
    ${AutoFarm.gainsHtml()}
  </div>
  <div class="bar">
    <button class="btn pri" id="af-toggle">▶ Bắt đầu (thu panel)</button>
    <button class="btn" id="af-refresh">Quét lại</button>
    <button class="btn" id="af-export">Xuất log</button>
  </div>
  <div class="panel"><b style="color:var(--gold)">Ghi hành động tay</b>
    <div class="sub">Bật ghi → thao tác trên game như thường (đi, vào nơi, chọn activity, săn, combat, thuốc…) → Dừng ghi → <b>Xuất ghi</b>. File gồm mọi API + state (noiActs, choices, combat, bag thuốc, node gần) + summary để đối chiếu source.</div>
    <div class="bar">
      <button class="btn ${AutoFarm.rec.on?'':'pri'}" id="af-rec-toggle">${AutoFarm.rec.on?'■ Dừng ghi':'● Bắt đầu ghi'}</button>
      <button class="btn" id="af-rec-export" ${AutoFarm.rec.events.length?'':'disabled'}>Xuất ghi (${AutoFarm.rec.events.length})</button>
    </div>
    <div class="panel" style="max-height:18vh;overflow:auto;font-size:12px" id="af-rec-log">${AutoFarm.rec.events.length?AutoFarm.rec.events.slice().reverse().slice(0,20).map(x=>`<div class="sub">[${E(x.tShow||'')}] <b>${E(x.kind)}</b> ${E(typeof x.detail==='string'?x.detail:JSON.stringify(x.detail||{}).slice(0,100))}</div>`).join(''):'<div class="sub">Chưa ghi gì.</div>'}</div>
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
        <option value="prefer" ${o.apex==='prefer'?'selected':''}>Ưu tiên lùng đầu đàn</option>
      </select>
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
    <div class="acts"><button class="btn" data-act="view">Xem</button><button class="btn pri" data-act="go">Đường</button></div>
  </article>`).join('')||'<div class="empty">Không có mục tiêu phù hợp trên map hiện tại.<br>Hãy đi khám phá thêm rồi quét lại. Tắt «Chỉ ev.san_yeu» để cày rộng hơn.</div>'}`;
  $(body,'#af-toggle').onclick=()=>AutoFarm.start();
  $(body,'#af-refresh').onclick=()=>VIEWS.auto();
  $(body,'#af-export').onclick=()=>AutoFarm.exportLog();
  $(body,'#af-rec-toggle').onclick=()=>{AutoFarm.rec.on?AutoFarm.stopRecord():AutoFarm.startRecord()};
  $(body,'#af-rec-export').onclick=()=>AutoFarm.exportRecord();
  $(body,'#af-san').onchange=e=>{o.onlySanYeu=e.target.checked;VIEWS.auto()};
  $(body,'#af-near').onchange=e=>{o.preferNear=e.target.checked;VIEWS.auto()};
  $(body,'#af-places').onchange=e=>{o.includeNearPlaces=e.target.checked;VIEWS.auto()};
  $(body,'#af-nodes').onchange=e=>{o.includeMapNodes=e.target.checked;VIEWS.auto()};
  $(body,'#af-wild').onchange=e=>{o.includeWildSan=e.target.checked;VIEWS.auto()};
  $(body,'#af-herb').onchange=e=>{o.includeHaiThuoc=e.target.checked;store.set('afHaiThuoc',o.includeHaiThuoc);VIEWS.auto()};
  $(body,'#af-herb').onchange=e=>{o.includeHaiThuoc=e.target.checked;store.set('afHaiThuoc',o.includeHaiThuoc);VIEWS.auto()};
  $(body,'#af-toc').onchange=e=>{o.tocChien=e.target.checked};
  $(body,'#af-tudia').onchange=e=>{o.skipTuDia=e.target.checked;VIEWS.auto()};
  $(body,'#af-choose').onchange=e=>{o.autoChoose=e.target.checked};
  $(body,'#af-heal').onchange=e=>{o.autoHeal=e.target.checked;store.set('afAutoHeal',o.autoHeal)};
  $(body,'#af-pauseheal').onchange=e=>{o.pauseIfNoHeal=e.target.checked};
  $(body,'#af-xutri').onchange=e=>{o.xuTri=e.target.value;store.set('xuTri',o.xuTri);toast('Đã nhớ: xử tù binh = '+o.xuTri,'ok',2200)};
  $(body,'#af-apex').onchange=e=>{o.apex=e.target.value;store.set('afApex',o.apex);toast('Lùng đầu đàn = '+o.apex,'ok',2000)};
  $(body,'#af-pursuit').onchange=e=>{o.pursuit=e.target.value;store.set('afPursuit',o.pursuit);toast('Đuổi/tha = '+o.pursuit,'ok',2000)};
};

/* ───────── Tab: Treo thưởng (việc đã nhận) ───────── */
const strip=s=>T(String(s??'').replace(/[-]/g,''));
function jobRows(){
  const r=run(),list=A(r.viecNhan),out=[];
  for(const v of list){
    if(!v||typeof v!=='object')continue;
    const slot=v.slot,enc=v.enc?C.encounters.get(v.enc):null,title=strip(v.ten||enc?.ten||'Việc treo thưởng');
    if(!hasSlot(slot)){out.push({key:'job|'+v.id,slot:null,title,kind:'Treo thưởng',icon:'賞',place:'Chưa rõ nơi',ok:false,why:'Không rõ địa điểm',tags:[],travel:NaN,miles:NaN,slack:null,danger:{rank:0}});continue}
    const travel=travelTo(slot),left=N(v.hetHanNam)?+v.hetHanNam-nowYear():null,slack=left!==null?left-(N(travel)?travel:0):null;
    const row=makeRow({key:'job|'+(v.id||slot),slot,title,kind:'Treo thưởng',icon:'賞',enc:{__han:v.hetHanNam}});
    row.tags=[left!==null?`Hạn còn ${fmtTime(Math.max(0,left))}`:'Không giới hạn thời gian'];
    if(N(v.congHien))row.tags.push(`Công hiến ${F(v.congHien)}`);
    if(v.thuong&&typeof v.thuong==='string')row.tags.push('Thưởng: '+strip(v.thuong));
    row.hetHan=left;out.push(row);
  }
  return out;
}
const jobUi={sort:'urgent'};
VIEWS.bounty=()=>{
  const rows=jobRows().sort(SORTS[jobUi.sort].fn);
  body.innerHTML=`<div class="bar"><select id="j-sort" class="grow">${Object.entries(SORTS).map(([k,v])=>`<option value="${k}" ${k===jobUi.sort?'selected':''}>${v.name}</option>`).join('')}</select></div><div class="sum">${rows.length} việc đã nhận · nhận ở bảng treo thưởng thôn trấn, thành, kinh đô hoặc điện nhiệm vụ tông môn</div>${rows.map(r=>r.slot?cardHtml(r):`<article class="card late"><div class="ico">賞</div><div><b>${E(r.title)}</b><small>Chưa rõ nơi làm việc</small></div></article>`).join('')||'<div class="empty">Bạn chưa nhận việc treo thưởng nào.<br>Nhận việc ở bảng treo thưởng rồi quay lại đây.</div>'}`;
  $(body,'#j-sort').onchange=e=>{jobUi.sort=e.target.value;render()};
};

/* ───────── Tab: Nhân mạch ───────── */
const SEX={nam:'Nam',nu:'Nữ'};
const REL_NAME={quen_biet:'Quen biết',doi_thu:'Đối thủ',bang_huu:'Bằng hữu',hiem_khich:'Hiềm khích',ke_thu:'Kẻ thù',tu_thu:'Tử thù',tri_ky:'Tri kỷ',ket_nghia:'Huynh đệ kết nghĩa',dao_lu:'Đạo lữ',su_phu:'Sư phụ',phan_boi:'Kẻ phản bội'};
const relName=k=>REL_NAME[k]||String(k||'quen_biet').replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
function personLocation(id,npc){
  const r=run();
  for(const [key,node] of Object.entries(r.nodes||{})){if(!node||node.viec)continue;if(node.npc===id||Object.values(node.vars||{}).some(v=>String(v)===id)){const s=node.slot||key;if(hasSlot(s))return{slot:s,note:'Đang xuất hiện trên bản đồ',src:'now'}}}
  if(r.dongHanh?.npc===id)return{slot:r.viTri,note:'Đang đồng hành cùng bạn',src:'with'};
  if(npc.trip&&N(npc.trip.until)&&+npc.trip.until>nowYear()&&hasSlot(npc.trip.to))return{slot:npc.trip.to,note:'Đang đi tới '+slotLabel(npc.trip.to),src:'trip'};
  if(hasSlot(npc.home))return{slot:npc.home,note:r.noiChon?.[npc.home]?.chuNhan==='nguoi_choi'?'Ở động phủ của bạn':'Ở nhà · '+slotLabel(npc.home),src:'home'};
  if(hasSlot(npc.que))return{slot:npc.que,note:'Quê nhà · '+slotLabel(npc.que),src:'home'};
  if(hasSlot(npc.noiGap))return{slot:npc.noiGap,note:'Nơi gặp gần nhất · '+slotLabel(npc.noiGap),src:'seen'};
  return{slot:null,note:'Chưa rõ tung tích',src:'none'};
}
function peopleRows(){
  const r=run(),out=[],yr=Math.floor(nowYear());
  for(const [id,npc] of Object.entries(r.npc||{})){
    if(!npc||npc.chuaGap)continue;
    const def=C.npc?.get?.(id.replace(/\.\d+$/,''))||C.npc?.get?.(npc.goc),alive=npc.song!==false,loc=alive?personLocation(id,npc):{slot:null,note:'Đã khuất',src:'none'},here=loc.slot&&loc.slot===r.viTri;
    const acts=[];
    if(alive){if(here){acts.push('Đang ở cùng nơi — có thể gặp');if(npc.lastGiftYear!==yr)acts.push('Có thể tặng quà');if(npc.lastAskYear!==yr)acts.push('Có thể hỏi chuyện');if(npc.danhPhan==='dao_lu')acts.push('Việc đạo lữ')}else if(loc.slot)acts.push('Có thể tìm đến')}
    out.push({id,name:strip(npc.ten||id),title:strip(def?.goi||''),sex:SEX[String(npc.gioiTinh||'').toLowerCase()]||'Chưa rõ',alive,realm:REALMS[npc.canhGioi]?`${REALMS[npc.canhGioi]}${N(npc.tieuCanhGioi)?' · '+STAGES[npc.tieuCanhGioi]:''}`:'',age:N(npc.namSinh)?Math.floor(nowYear()-npc.namSinh):null,rel:relName(npc.danhPhan),relKey:npc.danhPhan||'quen_biet',fav:N(npc.haoCam)?+npc.haoCam:0,debt:N(npc.no?.so)?+npc.no.so:0,romance:Boolean(npc.tinhY),loc,here,acts,travel:loc.slot?travelTo(loc.slot):NaN,miles:loc.slot?milesTo(loc.slot):NaN,kind:def?.loai||''});
  }
  return out;
}
const PSORT={act:{name:'Có thể gặp trước',fn:(a,b)=>(+b.here-+a.here)||(+b.alive-+a.alive)||(a.travel||1e9)-(b.travel||1e9)},near:{name:'Gần nhất',fn:(a,b)=>(+b.alive-+a.alive)||((N(a.travel)?a.travel:1e9)-(N(b.travel)?b.travel:1e9))},fav:{name:'Hảo cảm cao',fn:(a,b)=>b.fav-a.fav},name:{name:'Theo tên',fn:(a,b)=>a.name.localeCompare(b.name,'vi')}};
const pUi={q:'',sort:'act',life:'alive',sex:'all',rel:'all',where:'all',limit:40};
VIEWS.people=()=>{
  const all=peopleRows(),rels=[...new Set(all.map(x=>x.rel))].sort((a,b)=>a.localeCompare(b,'vi')),q=norm(pUi.q);
  const rows=all.filter(x=>(!q||norm([x.name,x.title,x.rel,x.loc.note,x.realm].join(' ')).includes(q))&&(pUi.life==='all'||(pUi.life==='alive')===x.alive)&&(pUi.sex==='all'||x.sex===pUi.sex)&&(pUi.rel==='all'||x.rel===pUi.rel)&&(pUi.where==='all'||(pUi.where==='here'&&x.here)||(pUi.where==='known'&&x.loc.slot)||(pUi.where==='now'&&(x.loc.src==='now'||x.loc.src==='with'))||(pUi.where==='unknown'&&!x.loc.slot))).sort(PSORT[pUi.sort].fn),shown=rows.slice(0,pUi.limit);
  const sel=(id,arr,v)=>`<select id="${id}" class="grow">${arr.map(([k,n])=>`<option value="${E(k)}" ${k===v?'selected':''}>${E(n)}</option>`).join('')}</select>`;
  body.innerHTML=`<div class="bar"><input type="search" id="p-q" class="grow" placeholder="Tìm tên, quan hệ, nơi ở…" value="${E(pUi.q)}"></div><div class="bar">${sel('p-sort',Object.entries(PSORT).map(([k,v])=>[k,v.name]),pUi.sort)}${sel('p-life',[['all','Còn sống & đã khuất'],['alive','Còn sống'],['dead','Đã khuất']],pUi.life)}</div><div class="bar">${sel('p-sex',[['all','Mọi giới'],['Nam','Nam'],['Nữ','Nữ']],pUi.sex)}${sel('p-rel',[['all','Mọi quan hệ'],...rels.map(x=>[x,x])],pUi.rel)}${sel('p-where',[['all','Mọi vị trí'],['here','Ở cùng nơi'],['now','Đang xuất hiện'],['known','Biết nơi ở'],['unknown','Chưa rõ tung tích']],pUi.where)}</div><div class="sum">${rows.length}/${all.length} nhân mạch</div>
  ${shown.map(x=>`<article class="card ${x.alive?'':'late'}" ${x.loc.slot?`data-slot="${E(x.loc.slot)}" data-title="${E(x.name)}"`:''} style="grid-template-columns:34px 1fr auto"><div class="ico">${x.alive?(x.sex==='Nữ'?'女':'男'):'亡'}</div><div><b>${E(x.name)}</b><small>${E([x.title,x.realm,x.age!==null?x.age+' tuổi':''].filter(Boolean).join(' · '))}</small></div><div class="side">${N(x.travel)?fmtTime(x.travel):''}<small>${N(x.miles)?fmtMiles(x.miles):''}</small></div><div class="tags"><span class="tag">${E(x.rel)}</span><span class="tag ${x.fav>0?'g':x.fav<0?'r':''}">Hảo cảm ${x.fav>0?'+':''}${F(x.fav)}</span>${x.romance?'<span class="tag o">Có tình ý</span>':''}${x.debt?`<span class="tag r">Nợ ${F(x.debt)}</span>`:''}${x.alive?'':'<span class="tag r">Đã khuất</span>'}<span class="tag">${E(x.loc.note)}</span>${x.acts.map(a=>`<span class="tag g">${E(a)}</span>`).join('')}</div>${x.loc.slot&&x.alive?'<div class="acts"><button class="btn" data-act="view">Xem bản đồ</button><button class="btn pri" data-act="go">Đường đi an toàn</button></div>':''}</article>`).join('')||'<div class="empty">Chưa có nhân mạch phù hợp.</div>'}${rows.length>shown.length?'<button class="btn" id="p-more" style="width:100%">Xem thêm</button>':''}`;
  $(body,'#p-more')?.addEventListener('click',()=>{pUi.limit+=40;render()});
  let t;$(body,'#p-q').oninput=e=>{pUi.q=e.target.value;pUi.limit=40;clearTimeout(t);t=setTimeout(()=>{VIEWS.people();const i=$(body,'#p-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)},220)};
  for(const [id,k] of [['p-sort','sort'],['p-life','life'],['p-sex','sex'],['p-rel','rel'],['p-where','where']])$(body,'#'+id).onchange=e=>{pUi[k]=e.target.value;pUi.limit=40;render()};
};

/* ───────── Tab: Tông môn ───────── */
const SECT_PHAI={kiem:'Kiếm tu',the:'Thể tu',khi:'Luyện bảo',ngu_thu:'Ngự thú',tran:'Trận pháp',dan:'Đan đạo',am:'Âm đạo',phat:'Phật tu',phu:'Phù lục',khoi_loi:'Khôi lỗi',ma:'Ma tu',doc:'Độc cổ',thi:'Luyện thi',hop_hoan:'Hợp Hoan',quy:'Quỷ tu'};
const SECT_TANG={dai_tong_mon:'Đại tông môn',tong_mon:'Tông môn',mon_phai:'Môn phái'},TANG_RANK={dai_tong_mon:0,tong_mon:1,mon_phai:2};
const SECT_CM={chinh:'Chính đạo',trung_lap:'Trung lập',ta:'Tà đạo',ma:'Ma đạo'};
const SECT_REL={ho_quoc:'Hộ quốc',phu_thuoc:'Phụ thuộc quốc',trung_lap:'Trung lập',doi_dich:'Đối địch quốc'};
const RANKS=['Tạp dịch','Ngoại môn','Nội môn','Chân truyền','Trưởng lão'];
const stageText=n=>n&&N(n.canhGioi)?`${REALMS[n.canhGioi]||'Cảnh giới '+n.canhGioi}${N(n.tieuCanhGioi)&&n.canhGioi>0?' '+(STAGES[n.tieuCanhGioi]||''):''}`.trim():'';
function seatPerson(slot,seat){
  const id=run().factionSeats?.[slot]?.[seat];if(typeof id!=='string')return null;
  const n=run().npc?.[id];if(!n)return{name:'',realm:'',alive:true,known:false};
  return{name:strip(n.ten||id),realm:stageText(n),alive:n.song!==false,known:true,id};
}
function sectRows(){
  const r=run(),out=[],mine=r.tongMon?.slot,ev=A(r.theGioi?.dangDien).filter(e=>e?.id==='world.tong_mon_tuyen_do'&&e.daBiet);
  const dead=new Map();for(const d of A(r.destroyedSects))if(d&&d.slot)dead.set(d.slot,+d.year||0);
  for(const s of A(W.slots)){
    const i=info(s.id),d=i?.diaDanh;if(!d||d.loai!=='tong_mon')continue;
    const destroyed=dead.has(s.id);
    if(d.an&&!explored(s.id)&&mine!==s.id&&!destroyed)continue;
    const travel=travelTo(s.id),rec=ev.find(e=>e.slot===s.id);
    out.push({slot:s.id,title:T(d.ten),han:d.ten_han||'',tang:d.tang,phai:d.phai,he:A(d.he),cm:d.chinh_ma,rel:d.quan_he,country:countryOf(i),mine:mine===s.id,explored:explored(s.id),hidden:Boolean(d.an),recruit:rec?+rec.denNam-nowYear():null,travel,miles:milesTo(s.id),danger:danger(s.id),ok:N(travel),
      destroyed,destroyedYear:destroyed?dead.get(s.id):null,leader:destroyed?null:seatPerson(s.id,'leader.0'),ancestor:destroyed?null:seatPerson(s.id,'ancestor.0'),vice:destroyed?null:seatPerson(s.id,'vice_leader.0')});
  }
  return out;
}
const deadLast=fn=>(a,b)=>(+a.destroyed-+b.destroyed)||(a.destroyed?b.destroyedYear-a.destroyedYear:fn(a,b));
const SSORT={near:{name:'Gần nhất',fn:deadLast((a,b)=>(+b.mine-+a.mine)||(a.travel-b.travel))},tier:{name:'Quy mô lớn trước',fn:deadLast((a,b)=>(TANG_RANK[a.tang]-TANG_RANK[b.tang])||(a.travel-b.travel))},recruit:{name:'Đang tuyển đồ trước',fn:deadLast((a,b)=>((b.recruit!==null)-(a.recruit!==null))||(a.travel-b.travel))},name:{name:'Theo tên',fn:deadLast((a,b)=>a.title.localeCompare(b.title,'vi'))}};
const sUi={q:'',sort:'near',phai:'all',cm:'all',tang:'all',he:'all',hideDead:false};
const personLine=(label,p)=>p?`<div class="sub" style="grid-column:2/4">${label}: ${p.known?`<b style="color:${p.alive?'var(--paper)':'#ff8d80'}">${E(p.name)}</b>${p.realm?` · ${E(p.realm)}`:''}${p.alive?'':' · đã mất'}`:'<span>chưa rõ danh tính</span>'}</div>`:'';
VIEWS.sect=()=>{
  const all=sectRows(),q=norm(sUi.q),phais=[...new Set(all.map(x=>x.phai))].sort((a,b)=>(SECT_PHAI[a]||a).localeCompare(SECT_PHAI[b]||b,'vi'));
  const rows=all.filter(x=>(sUi.phai==='all'||x.phai===sUi.phai)&&(sUi.cm==='all'||x.cm===sUi.cm)&&(sUi.tang==='all'||x.tang===sUi.tang)&&(sUi.he==='all'||x.he.includes(sUi.he))&&!(sUi.hideDead&&x.destroyed)&&(!q||norm([x.title,x.han,SECT_PHAI[x.phai],SECT_TANG[x.tang],SECT_CM[x.cm],x.country,x.leader?.name,x.he.map(h=>ELEMENT_NAMES[h]).join(' ')].join(' ')).includes(q))).sort(SSORT[sUi.sort].fn);
  const sel=(id,arr,v)=>`<select id="${id}" class="grow">${arr.map(([k,n])=>`<option value="${E(k)}" ${k===v?'selected':''}>${E(n)}</option>`).join('')}</select>`;
  const rk=run().tongMon,ndead=all.filter(x=>x.destroyed).length;
  body.innerHTML=`${rk?`<div class="panel"><b style="color:var(--gold)">Bạn đang ở ${E(slotLabel(rk.slot))}</b><div class="sub">Cấp bậc: ${E(RANKS[rk.capBac??0]||'—')}${N(me().congHien)?` · công hiến ${F(me().congHien)}`:''}</div></div>`:''}<div class="bar"><input type="search" id="s-q" class="grow" placeholder="Tìm tông môn, chưởng môn, hệ…" value="${E(sUi.q)}"></div>
  <div class="chips"><button class="chip ${sUi.tang==='all'?'on':''}" data-tang="all">Mọi quy mô</button>${Object.entries(SECT_TANG).map(([k,n])=>`<button class="chip ${sUi.tang===k?'on':''}" data-tang="${k}">${E(n)}</button>`).join('')}${ndead?`<button class="chip ${sUi.hideDead?'on':''}" id="s-dead">Ẩn đã bị diệt (${ndead})</button>`:''}</div>
  <div class="bar">${sel('s-phai',[['all','Mọi lối tu'],...phais.map(p=>[p,SECT_PHAI[p]||p])],sUi.phai)}${sel('s-sort',Object.entries(SSORT).map(([k,v])=>[k,v.name]),sUi.sort)}${sel('s-cm',[['all','Chính / Ma'],...Object.entries(SECT_CM)],sUi.cm)}${sel('s-he',[['all','Mọi hệ'],...ELEMS],sUi.he)}</div><div class="sum">${rows.length}/${all.length} tông môn</div>
  ${rows.map(x=>`<article class="card ${x.destroyed?'late':x.mine?'':'d'+(x.danger.rank>=2?x.danger.rank:0)}" data-slot="${E(x.slot)}" data-title="${E(x.title)}"><div class="ico">${x.destroyed?'滅':'宗'}</div><div><b>${E(x.title)}${x.han?` <small>${E(x.han)}</small>`:''}</b><small>${E(SECT_TANG[x.tang]||'')} · ${E(SECT_PHAI[x.phai]||x.phai||'')} · ${E(x.he.map(h=>ELEMENT_NAMES[h]||h).join('/'))}</small></div><div class="side">${fmtTime(x.travel)}<small>${fmtMiles(x.miles)}</small></div>${personLine('Chưởng môn',x.leader)}${personLine('Phó chưởng môn',x.vice)}${personLine('Tổ sư',x.ancestor)}<div class="tags">${x.destroyed?`<span class="tag r">Đã bị diệt năm ${Math.floor(x.destroyedYear)}</span>`:''}${x.mine?'<span class="tag g">Tông môn của bạn</span>':''}${x.recruit!==null&&!x.destroyed?`<span class="tag o">Đang tuyển đồ · còn ${fmtTime(Math.max(0,x.recruit))}</span>`:''}<span class="tag ${x.cm==='chinh'?'g':x.cm==='trung_lap'?'':'r'}">${E(SECT_CM[x.cm]||'')}</span>${x.country?`<span class="tag">${E(x.country)} · ${E(SECT_REL[x.rel]||'')}</span>`:''}${x.hidden?'<span class="tag">Ẩn thế</span>':''}${x.explored?'':'<span class="tag">Chưa khám phá</span>'}${x.danger.rank>=1&&!x.destroyed?`<span class="tag ${x.danger.rank>=2?'r':''}">${x.danger.label}</span>`:''}</div><div class="acts"><button class="btn" data-act="view">Xem bản đồ</button>${x.destroyed?'':'<button class="btn pri" data-act="go">Đường đi an toàn</button>'}</div></article>`).join('')||'<div class="empty">Không có tông môn phù hợp.</div>'}`;
  let t;$(body,'#s-q').oninput=e=>{sUi.q=e.target.value;clearTimeout(t);t=setTimeout(()=>{VIEWS.sect();const i=$(body,'#s-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)},220)};
  $$(body,'[data-tang]').forEach(b=>b.onclick=()=>{sUi.tang=b.dataset.tang;render()});
  $(body,'#s-dead')?.addEventListener('click',()=>{sUi.hideDead=!sUi.hideDead;render()});
  for(const [id,k] of [['s-phai','phai'],['s-sort','sort'],['s-cm','cm'],['s-he','he']])$(body,'#'+id).onchange=e=>{sUi[k]=e.target.value;render()};
};
/* ───────── Khởi động ───────── */
let lastPos=run().viTri,timer=null,unsub=null,iv=null;
function tick(){clearTimeout(timer);timer=setTimeout(()=>{if(run().viTri!==lastPos){lastPos=run().viTri;if(Route.target)Route.redraw()}Alerts.check();softRender()},450)}
try{unsub=g.store.subscribe?.(tick)}catch{}
iv=setInterval(tick,5000);
/* Không tự vẽ đường khi mở tool */
try{Route.clear()}catch{try{stopDrawing()}catch{}}
Alerts.check();ui.syncRouteChip();
window.__VKT2__={destroy(){try{AutoFarm.stopRecord()}catch{}try{AutoFarm.stop()}catch{}try{document.getElementById(ID+'-afbar')?.remove();document.getElementById(ID+'-afstats')?.remove()}catch{}clearInterval(iv);clearTimeout(timer);try{unsub?.()}catch{}stopDrawing();panel.remove();fab.remove();chip.remove();toasts.remove();styleEl.remove()},ui,Route,build:BUILD,VIEWS,BuildEngine,hooks:{realmRows,eventRows,treasureRows,jobRows,peopleRows,sectRows,checks,safePath,placeWindow,closedYears,openOnArrival,focusMap,startDrawing,stopDrawing,mapRoot,addItemToBag,coreContext,Alerts,AutoFarm}};

})();
