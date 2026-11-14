(()=>{
'use strict';
const BUILD='20261114-dibao-v97',ID='vkt2',g=window.game;
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
const KIND_ICON={su_kien:'?',chien_dau:'劍',tu_luyen:'坐',cua_hang:'市',bi_canh:'門',dot_pha:'雷',tong_mon:'宗',linh_mach:'泉',di_tich:'碑',sao_huyet:'巢',khoang_mach:'礦',di_bao:'寶'};
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
function playerTier(){const nv=me();const st=Number(nv.tieuCanhGioi);return Number(nv.canhGioi??0)+(Number.isFinite(st)?st:0)/4}
function danger(slot){
  const i=info(slot);if(!i)return{rank:1,label:'Chưa rõ'};
  let abyss=false;try{abyss=W.seaPoint?.(slot)?.loai==='vo_nhai_uyen'}catch{}
  const base=Number(i.capNen??i.canhGioi);if(!Number.isFinite(base)&&!abyss)return{rank:1,label:'Chưa rõ'};
  const d=abyss?Infinity:base-playerTier();
  if(d<=-.5)return{rank:0,label:'An toàn',d};
  if(d<=.5)return{rank:1,label:'Ngang sức',d};
  if(d<=1.5)return{rank:2,label:'Nguy hiểm',d};
  return{rank:3,label:'Tử địa',d};
}
/* Nơi có đi tới được không (đối chiếu chặn đường của game): sương mù chưa mở, bên kia biển */
function slotRevealed(slot){
  try{const v=run().vungDaMo;if(!Array.isArray(v))return true;const t=W.slot?.(slot);if(!t)return true;return v.some(([x,y,r])=>(x-t.x)**2+(y-t.y)**2<=r*r)}catch{return true}
}
function travelBlock(slot,withFog=false){
  try{
    const r=run();if(!slot||slot===r.viTri)return'';
    if(withFog&&!slotRevealed(slot))return'Nơi đó còn phủ mây, chưa đi tới được';
    let sea=null;try{sea=W.seaPoint?.(slot)||W.seaPoint?.(r.viTri)}catch{}
    if(sea)return'';
    let a,b;try{a=W.tho?.(r.viTri);b=W.tho?.(slot)}catch{}
    if(a==null||b==null||a===b)return'';
    const cg=Math.floor(Number(me().canhGioi??0));
    if(cg>=3)return'';
    const eq=me().trangBi||{},bag=me().tuiDo||{};
    const boat=Object.values(eq).some(id=>(bag[id]??0)>0&&C.items?.get?.(id)?.vuot_bien);
    if(cg>=2&&boat)return'';
    return cg>=2?'Bên kia biển — cần thuyền hoặc pháp khí vượt biển':'Bên kia biển — tới Trúc Cơ mới lên được thuyền';
  }catch{return''}
}

/* ───────── Dị bảo: danh mục đã đối chiếu với game ───────── */
const GUIDE=new Map([{"id":"ev.di_bao_u_hon_dien","ten":"Cửa U Hồn Điện","relic":"item.yeu_hoang_huyet_kinh","gate":[5,5],"hoiChieu":120,"diaDanh":"azgaar:marker:103","dia":{"ten":"U Hồn Điện","han":"幽魂殿","x":1110.1,"y":625.9,"cn":2.8},"chance":0.07,"baoVe":{"ten":"Hạt Hoàng Thủ Lăng","cg":5},"noi":"di_tich"},{"id":"ev.di_bao_kiem_trach","ten":"Kiếm lành giữa đầm","relic":"item.bat_chiet_kiem","gate":[5,5],"hoiChieu":120,"diaDanh":"hoang:394","dia":{"ten":"Kiếm Trạch","han":"劍澤","x":1435.6,"y":529.1,"cn":2.3},"chance":0.07,"baoVe":{"ten":"Vạn Kiếm Oán Hồn","cg":5},"check":"than_thuc +65","noi":"son_thuy"},{"id":"ev.di_bao_tien_van_dien","ten":"Đá ba mặt","relic":"item.tam_sinh_thach","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:102","dia":{"ten":"Tiên Vân Điện","han":"仙雲殿","x":1186.8,"y":645.4,"cn":2.7},"chance":0.03,"check":"dao_tam +75","noi":"di_tich"},{"id":"ev.di_bao_yeu_phong_mo","ten":"Lửa đen Yêu Phong Mộ","relic":"item.cuu_u_hoang_hoa","gate":[5,5],"hoiChieu":120,"diaDanh":"azgaar:marker:34","dia":{"ten":"Yêu Phong Mộ","han":"妖風墓","x":561,"y":257.2,"cn":4.1},"chance":0.07,"baoVe":{"ten":"Hổ Hoàng Tàn Hồn","cg":5},"noi":"di_tich"},{"id":"ev.di_bao_han_giao_linh","ten":"Vảy rồng Giao tộc","relic":"item.thai_co_long_lan","gate":[5,5],"hoiChieu":120,"chance":0.07,"baoVe":{"ten":"Giao Hoàng","cg":5},"tocYeu":"giao","noi":"hoang_da"},{"id":"ev.di_bao_kiem_dai","ten":"Chiến kỳ trên Kiếm Đài","relic":"item.doan_thien_chien_ky","gate":[5,5],"hoiChieu":120,"diaDanh":"azgaar:marker:35","dia":{"ten":"Kiếm Đài","han":"劍台","x":480.7,"y":343.5,"cn":0.1},"chance":0.07,"baoVe":{"ten":"Đoạn Thiên Chiến Hồn","cg":5},"noi":"di_tich"},{"id":"ev.bien_trieu_khu","ten":"Đêm Triều Khư","relic":"item.phong_thien_an","hoiChieu":120,"chance":0.07,"baoVe":{"ten":"Ngũ Tổ Tàn Trận","cg":5}},{"id":"ev.bien_thuyen_rong","ten":"Thuyền đầu rồng","relic":"item.thai_hu_chu","chance":0.03,"check":"than_thuc +100"},{"id":"ev.di_bao_hon_thap","ten":"Kinh không tiếng","relic":"item.luan_hoi_chan_kinh","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:39","dia":{"ten":"Hồn Tháp","han":"魂塔","x":1317.2,"y":691.7,"cn":2.4},"chance":0.03,"check":"ngo_tinh +70","noi":"di_tich"},{"id":"ev.di_bao_u_dien","ten":"Đèn trong U Điện","relic":"item.van_kiep_hon_dang","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:40","dia":{"ten":"U Điện","han":"幽殿","x":1530.2,"y":494.4,"cn":2.4},"chance":0.07,"baoVe":{"ten":"U Minh Quỷ Mẫu","cg":4},"noi":"di_tich"},{"id":"ev.di_bao_lan_dai","ten":"Nhẫn trên ngón xương","relic":"item.can_khon_gioi","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:141","dia":{"ten":"Lan Đài","han":"蘭台","x":344.3,"y":917.5,"cn":4.3},"chance":0.07,"baoVe":{"ten":"Cổ Chiến Khôi Lỗi","cg":5},"noi":"di_tich"},{"id":"ev.di_bao_tan_phong","ten":"Kiếm gãy trên Tàn Phong","relic":"item.toai_thien_kiem","gate":[4,5],"hoiChieu":120,"diaDanh":"hoang:291","dia":{"ten":"Tàn Phong","han":"殘峰","x":1636.8,"y":607.8,"cn":0.4},"chance":0.07,"baoVe":{"ten":"Thái Cổ Lôi Linh","cg":5},"noi":"son_thuy"},{"id":"ev.di_bao_van_dan_trung","ten":"Mộ không đọng tuyết","relic":"item.nghich_menh_dan","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:101","dia":{"ten":"Vạn Đan Trủng","han":"萬丹塚","x":1499,"y":339.3,"cn":0.3},"chance":0.07,"baoVe":{"ten":"Hạn Bạt","cg":4},"noi":"di_tich"},{"id":"ev.di_bao_tuyen_phong","ten":"Bình trên Tuyền Phong","relic":"item.cam_lo_tinh_binh","gate":[4,5],"hoiChieu":120,"diaDanh":"hoang:286","dia":{"ten":"Tuyền Phong","han":"泉峰","x":1117.3,"y":657.2,"cn":2.9},"chance":0.03,"check":"dao_tam +68","noi":"son_thuy"},{"id":"ev.di_bao_dan_coc","ten":"Mộ y gia Đan Cốc","relic":"item.than_nong_bach_thao_kinh","gate":[4,5],"hoiChieu":120,"diaDanh":"hoang:204","dia":{"ten":"Đan Cốc","han":"丹谷","x":1422.7,"y":631.7,"cn":1.9},"chance":0.03,"check":"ngo_tinh +45","noi":"son_thuy"},{"id":"ev.di_bao_xich_trung","ten":"Lò lửa Xích Trủng","relic":"item.hon_nguyen_dan_dinh","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:94","dia":{"ten":"Xích Trủng","han":"赤塚","x":665.1,"y":202.8,"cn":4.9},"chance":0.07,"baoVe":{"ten":"Âm Hỏa Hồn Vương","cg":5},"noi":"di_tich"},{"id":"ev.di_bao_van_son","ten":"Gấu ngủ Vân Sơn","relic":"item.tu_linh_chau","gate":[4,5],"hoiChieu":120,"diaDanh":"hoang:262","dia":{"ten":"Vân Sơn","han":"雲山","x":205.2,"y":614.5,"cn":2.3},"chance":0.07,"baoVe":{"ten":"Thái Nhạc Hùng","cg":5},"noi":"son_thuy"},{"id":"ev.di_bao_kim_dao_dien","ten":"Nghìn chậu đồng","relic":"item.tu_bao_bon","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:36","dia":{"ten":"Kim Đao Điện","han":"金刀殿","x":1573.7,"y":609.3,"cn":1.9},"chance":0.03,"check":"than_thuc +100","noi":"di_tich"},{"id":"ev.di_bao_bang_hon_trung","ten":"Chuông trong mộ băng","relic":"item.do_hon_linh","gate":[4,5],"hoiChieu":120,"diaDanh":"azgaar:marker:90","dia":{"ten":"Băng Hồn Trủng","han":"冰魂塚","x":308,"y":473.2,"cn":2.3},"chance":0.07,"baoVe":{"ten":"Vạn Oán Quỷ","cg":5},"noi":"di_tich"},{"id":"ev.hd_db_linh_quang_khe","ten":"Linh quang dưới khe","gate":[0,2],"noi":"hoang_da"},{"id":"ev.hd_db_bao_quang_day_ho","ten":"Bảo quang đáy hồ","gate":[1,3],"noi":"hoang_da"},{"id":"ev.hd_db_thap_dong_duoi_cat","ten":"Tháp đồng dưới cát","gate":[2,4],"noi":"hoang_da"},{"id":"ev.hd_db_qua_chin_vong_vay","ten":"Linh quả giữa vòng vây","gate":[0,3],"noi":"hoang_da"},{"id":"ev.di_bao_ho_set","ten":"Nhẫn trong hố sét","gate":[4,5],"hoiChieu":30,"check":"ngo_tinh +4","noi":"hoang_da"},{"id":"ev.di_bao_hop_ba_khoa","ten":"Hộp ba khóa","gate":[4,5],"hoiChieu":30,"check":"khi_van +8","noi":"hoang_da"},{"id":"ev.di_bao_keo_dinh","ten":"Kéo đỉnh giữa hồ","gate":[4,5],"hoiChieu":30,"check":"can_cot +4","noi":"hoang_da"}].map(x=>[x.id,x]));
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

  // ── Ưu tiên bộ hàm công khai của game (window.tuTien.core): ổn định qua các bản cập nhật, không cần tải lại cả code game.
  // Khóa nội bộ (giữ tên cũ để phần còn lại của tool không đổi) → tên hàm công khai.
  const PUB_MAP = { xo: 'khuonCua', eJ: 'tinhTocChien', Vr: 'taoBenTa', Ga: 'taoBenDich', Rt: 'tinhKinhMach', Tp: 'docKhuon', al: 'oCuaManh', Jh: 'kiemTraDat', kR: 'chuanBiDotPha', Hon: 'hangTong', wr: 'thieuDeThangCap', Kn: 'tongMonCua', ke: 'thoNguyenToiDa', Rsn: 'trialOpponent', ko: 'timDich', Qn: 'tenCanhGioi', mf: 'travelYears', Nin: 'facilitiesAt', H1: 'shelfStock', rn: 'canhGioi', fn: 'Rng', E1: 'giaMua', gP: 'slotDaMo', ni: 'nhanVaoTui', to: 'chuanBiBeQuan', qw: 'retreatTargetGain', Nb: 'retreatGain', Di: 'tocDoTuLuyen', jan: 'phanBoKhaoHach', bb: 'thieuDeKhaoHach', Lu: 'chuanBiLuyen', Pw: 'nguonDiemGoc', Rrn: 'bangTreoThuong', KI: 'bongLoc', KS: 'tienCuDuoc', kC: 'taoKinhMach', IP: 'giaBan' };
  function publicCore() {
    const core = window.tuTien && window.tuTien.core;
    if (!core || typeof core !== 'object') return null;
    const idx = core.index || {};
    const find = (n) => { if (typeof idx[n] === 'function') return idx[n]; for (const m of Object.values(core)) { if (m && typeof m[n] === 'function') return m[n]; } return null; };
    const K = {}, missing = [], optMissing = [], LABELS = { xo: 'lưới kinh mạch' };
    for (const o of [ANCHORS, REGEX_NAMES, ANCHORS_OPT, REGEX_OPT]) for (const [k, v] of Object.entries(o)) LABELS[k] = v[1];
    for (const [k, n] of Object.entries(PUB_MAP)) { const f = find(n); if (f) K[k] = f; else if (ANCHORS[k] || REGEX_NAMES[k] || k === 'xo') missing.push(LABELS[k] || k); else optMissing.push(LABELS[k] || k); }
    if (missing.length) return null;
    K.bundle = 'tuTien.core ' + (window.tuTien.gameVersion || '');
    K.optMissing = optMissing; K.PO = 30; K.lost = missing; K.labels = LABELS; K.viaPublic = true;
    K.has = (...ks) => ks.every((k) => K[k]);
    K.need = (feature, ...ks) => { const bad = ks.filter((k) => !K[k]); if (bad.length) throw new Error(`Tính năng "${feature}" cần hàm game [${bad.map((k) => LABELS[k] || k).join(', ')}] mà tool chưa nhận ra sau lần cập nhật game này. Các tính năng khác vẫn dùng bình thường. Mở tab Chẩn đoán để lấy báo cáo gửi Claude.`); };
    return K;
  }
  async function loadCore(progress) {
    const g = window.game;
    { const pc = publicCore(); if (pc) return pc; }
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
  const sleep0 = (() => {
    // MessageChannel: nhường luồng ngay không bị trình duyệt kẹp ≥4ms như setTimeout lồng nhau
    try { const ch = new MessageChannel(); let q = []; ch.port1.onmessage = () => { const a = q; q = []; for (const f of a) f(); }; return () => new Promise((r) => { q.push(r); ch.port2.postMessage(0); }); }
    catch { return () => new Promise((r) => setTimeout(r, 0)); }
  })();
  // Nhường luồng cho giao diện mỗi ~12ms (trước kia ≥40ms và nhiều đoạn tính liền vài giây); cập nhật tiến độ ≥250ms/lần.
  // _work = tổng thời gian CPU thật đã tính (không kể lúc nhường) — ngân sách thời gian của "polish" tính theo đó nên kết quả không đổi dù nhường nhiều hơn.
  let _yAt = performance.now(), _pAt = 0, _work = 0;
  const workNow = () => _work + (performance.now() - _yAt);
  const yieldIf = async (onP, frac, label) => { const n = performance.now(); if (n - _yAt < 12) return; _work += n - _yAt; if (onP && n - _pAt > 250) { _pAt = n; onP(frac, label); } await sleep0(); _yAt = performance.now(); };
  // Bản sao nông cho phép tính: chỉ kinhMach.manh/mastery bị ghi đè (đều gán nguyên khối) nên không cần structuredClone cả nhân vật mỗi lần chấm
  const nvFork = (nv0) => ({ ...nv0, kinhMach: { ...nv0.kinhMach } });
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
    try { return S.core.eJ(P, E, {}); } catch { return { thang: false, nHiep: 30, khiHuyetThapNhat: 0, stTa: 0 }; }
  }

  // ───────────────────────── 4. Tối ưu kinh mạch ─────────────────────────

  const BUILD_TAGS={tu_do:[],kiem:['kiem'],the:['the'],phat:['phat'],ma:['ma','nghich'],doc:['doc'],hop_hoan:['hop_hoan'],thi:['thi'],quy:['quy'],ngu_thu:['ngu_thu'],khoi_loi:['khoi_loi'],phu:['phu'],tran:['tran'],dan:['dan'],khi:['khi']};
  const NL_BUILD={ngu_thu:'thu',khoi_loi:'khoi_loi',doc:'trung',thi:'thi',quy:'hon'};
  // Khớp lối: tag trường phái; ngự linh theo loại; lối theo hệ (he_*) và Ám tu theo hệ "am" (content he_am).
  const schoolMatch=(school,tags,raw,it)=>{
    if(tags.some(t=>raw.includes(t)))return true;
    if(school==='doc'&&(raw.includes('doc')||raw.some(t=>String(t).includes('doc'))))return true;
    if(NL_BUILD[school]!==undefined&&it?.ngu_linh?.loai===NL_BUILD[school])return true;
    if(typeof school==='string'&&school.startsWith('he_')){
      const elem=school.slice(3);
      if(A(it?.he).includes(elem))return true;
    }
    return false;
  };
  function itemElements(it){const hs=A(it?.he);return hs.length?hs:['vo_sac']}
  // Luật tà của game (evilSchoolOf): tag ma/thi/quy/doc/hop_hoan/nghich, hoặc ngự linh loại thi/hồn
  function evilSchoolG(it){const t=A(it?.tag),n=['ma','thi','quy','doc','hop_hoan'].find(x=>t.includes(x))||(t.includes('nghich')?'nghich':null);if(n)return n;const l=it?.ngu_linh?.loai;return l==='thi'?'thi':l==='hon'?'quy':null}
  function itemAlignment(it){return evilSchoolG(it)?'ta':'chinh'}
  // Hệ số phản phệ của thể chất (dac_tinh.phan_phe, mặc định 1): đột phá −min(15%, 3% × điểm nghịch × hệ số)
  function phanPheMul(nv){try{return Number(C().theChat?.get?.(nv?.theChat)?.dac_tinh?.phan_phe??1)||1}catch{return 1}}
  function breakPenalty(nghich,nv){return Math.min(0.15,0.03*(nghich||0)*phanPheMul(nv))}
  function chosenElements(){const p=S.pref||{},subs=A(p.subs).filter(x=>x&&x!=='none'&&x!==p.mainElement);return{main:p.mainElement||'auto',subs}}
  function preferenceScore(manh,mode){const p=S.pref||{},tags=BUILD_TAGS[p.school]||[],chosen=chosenElements(),Cc=C();let z=0;for(const q of manh){const it=Cc.items.get(q?.m?.item||q?.item);if(!it)continue;const raw=[...A(it.tag),...TP(it.tran_phai)],hs=itemElements(it);if(schoolMatch(p.school,tags,raw,it))z+=mode==='danh'?55:mode==='tu'?70:60;if(chosen.main!=='auto'&&hs.includes(chosen.main))z+=mode==='danh'?10:12;for(const [i,h]of chosen.subs.entries())if(hs.includes(h))z+=Math.max(2,8-i);const align=itemAlignment(it);if(p.alignment&&p.alignment!=='auto')z+=align===p.alignment?14:-18}return z}
  function schoolStats(manh,mode){const school=S.pref?.school||'tu_do';if(school==='tu_do')return{main:school,total:manh.length,matched:manh.length,need:0,deficit:0};let total=0,matched=0;for(const q of manh){const it=C().items.get(q?.m?.item||q?.item);if(!it)continue;total++;const tags=BUILD_TAGS[school]||[],raw=[...A(it.tag),...TP(it.tran_phai)];if(schoolMatch(school,tags,raw,it))matched++}const pw=Number((S.pref&&(S.pref.pathW??S.pref.w))||0);const need=(total&&!(S.pref&&S.pref._rx))?(mode==='tu'?Math.ceil(total/3):pw>=2?Math.ceil(total*0.5):Math.floor(total/2)+1):0;return{main:school,total,matched,need,deficit:Math.max(0,need-matched)}}
  // Điều kiện bắt buộc của từng lối (đọc từ code game): Thể tu cần tâm pháp nhãn "the" đang thông (D4 → chiêu thể đánh bằng khí huyết);
  // lối ngự linh cần công pháp mở đúng loại ô; Kiếm tu cần kiếm ra chiêu đang thông. Thiếu thì bị trừ, đủ thì cộng — chỉ khi đã chọn theo lối.
  function schoolReqScore(nv,R){
    const school=S.pref?.school||'tu_do',pw=Number((S.pref&&(S.pref.pathW??S.pref.w))||0);
    if(school==='tu_do'||String(school).startsWith('he_')||pw<1)return 0;
    const Cc=C(),th=[];A(nv.kinhMach?.manh).forEach((m,i)=>{const it=Cc.items.get(m.item);if(it&&R.manh?.[i]?.thong)th.push(it)});
    let s=0;const ok=b=>{s+=b?2500:-2500};
    if(school==='the')ok(th.some(it=>it.loai==='cong_phap'&&!it.chieu&&A(it.tag).includes('the')));
    if(NL_BUILD[school]!==undefined)ok(th.some(it=>it.loai==='cong_phap'&&it.ngu_linh&&it.ngu_linh.loai===NL_BUILD[school]));
    if(school==='kiem')ok(th.some(it=>it.chieu&&A(it.tag).includes('kiem')));
    return s;
  }
  function schoolDominanceScore(manh,mode){
    const k=mode==='tu'?0:mode==='can'?.4:.25,x=schoolStats(manh,mode);
    if(x.main==='tu_do'||x.total<2)return 0;
    // Cần đa số mảnh theo lối (game: phủ lối / ô tà mC=1/3)
    if(x.deficit)return -8000*x.deficit + 100*x.matched*k;
    return 2000*x.matched*k;
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
      const evil=itemAlignment(it)==='ta';
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
  function pathShareScore(manh,mode){
    const k=mode==='tu'?0:mode==='can'?.4:.25,p=pathShareInfo(manh);
    const pw=Number((S.pref&& (S.pref.pathW??S.pref.w))||0);
    let s=0;
    // Phủ lối: khi đã chọn lối, muốn càng cao càng tốt; <1/3 phạt nặng; pw>=2 muốn >=50%
    const need=(S.pref&&S.pref._rx)?0:mode==='tu'?(pw>=1?1/3:0):pw>=2?0.5:pw>=1?1/3:0;
    if(need>0&&p.shareMatch<need-1e-9)s-=50000*(need-p.shareMatch);
    else s+=8000*p.shareMatch*k;
    // Đếm món khớp lối
    const st=schoolStats(manh,mode);
    if(st.main!=='tu_do'){
      s+=st.matched*1200*k;
      s-=st.deficit*15000;
      // pw>=1: mỗi món ngoài lối bị phạt
      if(pw>=1)s-=Math.max(0,st.total-st.matched)*(pw>=2?800:350)*k;
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
  /* Thành thạo (masteryMult): Hg = 0.5 + 0.5·thành thạo; món mới chưa lĩnh ngộ bắt đầu ở 0 (×0.5), viên mãn 500 năm ×1.1.
     Game xem trước đúng như vậy; Rt không tự đặt, nên phải đặt tay — nếu không món mới bị chấm cao hơn thực tế gấp đôi. */
  function applyMastery(nv){
    if(S.pref&&S.pref.hypo)return nv; // giả định: coi như đã tu thành thạo
    try{
      const km=nv.kinhMach,learned=new Set(km.daLinhNgo||[]),m={...(km.mastery||{})};
      const nlf=window.tuTien?.core?.['character/kinh_mach']?.namLinhNgo,c=C();
      for(const p of A(km.manh)){
        if(learned.has(p.item)||m[p.item]!==undefined)continue;
        const it=c.items.get(p.item);
        if(it&&(typeof nlf!=='function'||Number(nlf(it))>0))m[p.item]=0;
      }
      km.mastery=m;
    }catch{}
    return nv;
  }
  // Đọc thẳng hàm của game: tỉ lệ đột phá (chuanBiDotPha) + tu vi mỗi năm bế quan (chuanBiBeQuan) cho bộ kinh mạch đang xét
  function gameCultCtx(nv){const K=S.core,r={...g.state.run,nhanVat:nv};r.rngKeys??={};const meta=g.state.meta||{},rng=new K.fn(r.rng||[1]),cache=new Map();return{...g.env,run:r,meta,rng,enc:r.active,noticeLines:[],rngFor(key){let x=cache.get(key);if(!x){const seed=Object.hasOwn(r.rngKeys,key)?r.rngKeys[key]:undefined;x=seed===undefined?K.fn.fromSeed(`${r.seed}|rng|${key}`):new K.fn(seed);cache.set(key,x)}return x}}}
  function gameCult(nv){const K=S.core;if(!K||!K.kR||!K.to)return null;try{const c=gameCultCtx(nv),h=K.kR(c,{dan:[],thieuDot:0}),b=K.to(c);const tv=b&&!b.chan&&isFinite(b.tuViNam)?b.tuViNam:null;return{tiLe:isFinite(h.tiLe)&&h.tiLe>0?h.tiLe:0,tuVi:tv}}catch{return null}}
  function makeEval(nv0,enemies,mode){const K=S.core,c=C(),cache=new Map();let refTu;return manh=>{const key=mode+'|'+manh.map(p=>p.key).sort().join('|');if(cache.has(key))return cache.get(key);const nv=nvFork(nv0);nv.kinhMach.manh=manh.map(p=>({...p.m}));applyMastery(nv);const R=K.Rt(nv,c),P=K.Vr(nv,c),mq=meridianQuality(R,P,mode),dead=mq.dead;let gc=null;if(!dead&&mode!=='danh'){if(refTu===undefined){const n0=clone(nv0);n0.kinhMach.manh=[];refTu=gameCult(n0)?.tuVi||0}gc=gameCult(nv)}let fightScore=0,wins=0;if(!dead)for(const{E}of enemies){const r=fight(P,E),hp=Math.max(0,Math.min(1,(r.khiHuyetThapNhat||0)/Math.max(1,P.khiHuyetToiDa))),dealt=Math.min(1,(r.stTa||0)*Math.max(1,r.nHiep||1)/Math.max(1,E.khiHuyetToiDa));if(r.thang){wins++;fightScore+=100+30*hp+50/Math.max(1,r.nHiep||1)}else if(r.ketQua&&r.ketQua.enemyFled){wins++;fightScore+=70+15*hp}else fightScore+=45*dealt}const toc=R.biDong?.toc_do||0,dp=R.biDong?.dot_pha||0,ktm=R.biDong?.khang_tam_ma||0,nghich=mq.nghich||0;
      // Code game: phản phệ đột phá = min(0.15, 0.03*diemNghich*phanPhe); trần công pháp dot_pha = 0.12 (md)
      // Điểm nghịch: mảnh tương khắc kề nhau / nằm quá nửa trên ô khắc (tooltip game)
      const phaPhe=breakPenalty(nghich,nv),dpEff=Math.min(0.12,Math.max(0,dp));
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
        if(minC&&ll<minC)score-=12000; // không ra nổi chiêu → gần như loại
        else if(sumC&&ll<sumC)score-=1500;
        if(nChieu<1)score-=6000; // không có chiêu đánh
        // Thắng trận vẫn là chính; lấp ô phụ nhưng đủ mạnh để không để lưới trống (đồ đã đúng cảnh)
        score+=wins*8000+fightScore*2.2+mq.score*0.3+toc*15+dp*8-nghich*30+filled*22+nPieces*40+ll*10+nChieu*80;
      }else if(mode==='tu'){
        // Tu luyện: toc + đột phá thực; ưu tiên 0 nghịch nhưng vẫn thưởng lấp đầy khi nghịch không tăng
        // Đột phá công pháp là bắt buộc (đến trần 0.12); vượt trần thì phần dư vô giá trị → dồn sang tốc độ tu luyện + kháng tâm ma
        const over=Math.max(0,dp-0.12);
        if(gc&&gc.tuVi!==null){
          // Số liệu thẳng từ game: tỉ lệ đột phá thực (đã gồm trần, phản phệ, tâm ma) + tu vi/năm khi bế quan
          const tuGain=gc.tuVi!==null&&refTu>0?gc.tuVi/refTu-1:toc;
          score+=dpEff*60000-phaPhe*8000+(dp<=0?-30000:0)+gc.tiLe*20000+tuGain*2800+ktm*300-over*300+mq.connected*50+fightScore*.05;
        }else{
        score+=dpEff*60000+(dp<=0?-30000:0)-phaPhe*8000;
        score+=toc*2800+ktm*900-over*300+mq.connected*50+fightScore*.05;}
        score+=filled*30+nPieces*55;
        // Tuyệt đối không điểm nghịch (mỗi điểm −3% đột phá × phản phệ thể chất, trần −15%)
        score-=nghich*40000;
        if(nghich>0)score-=8000;
      }else{
        // Cân bằng: vẫn cần thắng tối thiểu + tu, nhưng phải lấp mạch (trước đây để trống nhiều)
        const combat=Math.max(0,fightScore),cult=gc&&gc.tuVi!==null?Math.max(0,dpEff*30000-phaPhe*20000+gc.tiLe*8000+((gc.tuVi!==null&&refTu>0?gc.tuVi/refTu-1:toc))*1000+ktm*150):Math.max(0,toc*2200+dpEff*8000-phaPhe*8000+ktm*400);
        const floorPenalty=(toc<=0?-15000:0)+(dpEff<=0?-20000:0);
        score+=wins*500+combat*1+cult*.45+mq.score+floorPenalty-nghich*3000+filled*32+nPieces*60;
      }
      score+=preferenceScore(manh,mode)+schoolDominanceScore(manh,mode)+pathShareScore(manh,mode);score+=schoolReqScore(nv,R);
      const rules=ruleAudit(nv,R),audit=meridianAudit(nv,R,P),school=schoolStats(manh);
      const out={s:score,wins,n:enemies.length,P,R,mq,enemyCount:enemies.length,rules,audit,school};
      if(cache.size>3000)cache.clear();cache.set(key,out);return out}}
  const _candCache = new WeakMap();
  async function buildCandidates(nv0, hypo=false) {
    const K = S.core, c = C();
    const cg = nv0.canhGioi || 0;
    const p = S.pref || {};
    if (S.pref) S.pref._rx = false;
    const school = p.school || 'tu_do';
    const strict = !!(school && school !== 'tu_do' && Number(p.pathW||p.w||0) >= 2);
    let pool;
    if (!hypo) {
      // Cùng rule với giả định, chỉ giới hạn trong túi
      let pw = Number(p.pathW || p.w || 0);
      const tags0 = BUILD_TAGS[school] || [];
      if (school !== 'tu_do' && pw >= 2) {
        const nBag = Object.keys(nv0.tuiDo || {}).filter((id) => {
          const it0 = c.items.get(id);
          if (!it0 || (it0.loai !== 'cong_phap' && it0.loai !== 'phap_khi') || !it0.hinh || (it0.canh_gioi ?? 0) > cg) return false;
          return schoolMatch(school, tags0, [...A(it0.tag), ...TP(it0.tran_phai)].map(String), it0);
        }).length;
        if (nBag < 6) { S.pref._relaxed = nBag; S.pref._rx = true; pw = 1; } else { S.pref._relaxed = 0; S.pref._rx = false; }
      }
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
      let pw = Number(p.pathW || p.w || 0);
      if (school !== 'tu_do' && pw >= 2) {
        // Lối có ít đồ trong cảnh giới này (vd. Phù tu / Trận tu / Khí tu): ép "chỉ đồ lối" sẽ để trống lưới → nới về "ưu tiên"
        let nMatch = 0;
        for (const [, it0] of c.items) {
          if (!it0 || (it0.loai !== 'cong_phap' && it0.loai !== 'phap_khi') || !it0.hinh) continue;
          const i0 = it0.canh_gioi ?? 0; if (i0 > cg || i0 < cgMinPath) continue;
          const t0 = [...(it0.tag || []), ...(typeof it0.tran_phai === 'string' ? [it0.tran_phai] : [])].map(String);
          if (t0.includes('nghich_thien') || t0.includes('di_bao') || (it0.pham_cap ?? 0) >= 8 || it0.tran_phai) continue;
          if (schoolMatch(school, BUILD_TAGS[school] || [], t0, it0)) nMatch++;
        }
        if (nMatch < 10) { S.pref._relaxed = nMatch; S.pref._rx = true; pw = 1; } else { S.pref._relaxed = 0; S.pref._rx = false; }
      }
      for (const [id, it] of c.items) {
        if (!it || (it.loai !== 'cong_phap' && it.loai !== 'phap_khi') || !it.hinh) continue;
        const icg = it.canh_gioi ?? 0;
        if (icg > cg) continue;
        const tags = [...(it.tag || []), ...(typeof it.tran_phai === 'string' ? [it.tran_phai] : [])].map(String);
        if (tags.includes('nghich_thien') || tags.includes('di_bao') || (it.pham_cap ?? 0) >= 8 || it.tran_phai) continue;
        const match = school === 'tu_do' || schoolMatch(school, BUILD_TAGS[school] || [], tags, it)
          || (typeof school === 'string' && school.startsWith('he_') && (it.he || []).includes(school.slice(3)))
          ;
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
        try {
          // gradeMult (Phàm ×0.6; Nghịch Thiên theo cảnh giới) và skillCapRatio (chiêu phẩm thấp bị chặn khi pháp lực vượt trần)
          const core = window.tuTien?.core || {};
          const gm = core['character/pham']?.gradeMult?.(it, cg);
          const sp = core['balance/combat']?.spellPower?.(cg, nv0.tieuCanhGioi || 0);
          const cap = it.chieu && sp > 0 ? core['character/pham']?.skillCapRatio?.(it, sp) : 1;
          const fac = (Number.isFinite(gm) ? gm : 1) * (Number.isFinite(cap) ? cap : 1);
          sc += (fac - 1) * 160;
        } catch {}
        scored.push({ id, sc });
      }
      scored.sort((a, b) => b.sc - a.sc);
      // Pool rộng hơn để anneal có chỗ lấp đầy (giới hạn vẫn cần cho máy yếu)
      pool = scored.slice(0, 260).map((x) => x.id);
    }
    const ck = hypo + '|' + pool.join(',');
    { const m0 = _candCache.get(nv0); if (m0 && m0.has(ck)) return m0.get(ck); }
    const nvWork = hypo ? (() => {
      const n = clone(nv0);
      n.tuiDo = { ...(n.tuiDo || {}) };
      for (const id of pool) n.tuiDo[id] = Math.max(n.tuiDo[id] || 0, 1);
      return n;
    })() : nv0;
    const g = K.xo(c, nvWork), cand = {};
    for (const id of pool) {
      await yieldIf();
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
    const res = { cand, g, pool, hypo: !!hypo };
    { let m0 = _candCache.get(nv0); if (!m0) _candCache.set(nv0, m0 = new Map()); m0.set(ck, res); }
    return res;
  }

  // Xếp tham lam nhanh (giống nút tự đặt của game): lần lượt đặt món + vị trí làm tăng điểm nhiều nhất.
  async function greedy(nv0, mode) {
    const K = S.core, c = C(), { cand } = await buildCandidates(nv0, !!(S.pref && S.pref.hypo));
    const quick = (manh) => {
      const nv = nvFork(nv0); nv.kinhMach.manh = manh.map((p) => ({ ...p.m })); applyMastery(nv);
      const R = K.Rt(nv, c);
      const uy = (R.chieu || []).reduce((a, x) => a + (x.uyLuc || x.uy || 0) / 10, 0);
      const toc = R.biDong.toc_do || 0, dp = Math.min(0.12, R.biDong.dot_pha || 0);
      const w=mode==='tu'?[.35,2800,20000,.15]:mode==='can'?[1.05,1500,6000,.8]:[2.5,2,1,2.2]; // danh: linh lực + uy chiêu
      const thongAll = R.manh.every((m) => !m || m.thong);
      const P=K.Vr(nv,c),mq=meridianQuality(R,P,mode);
      const filled=manh.reduce((a,p)=>a+(p.cells?p.cells.length:0),0);
      const pack=filled*10+manh.length*20;
      const ngh=mq.nghich||0;
      if(mode==='tu'){
        const pack2=filled*30+manh.length*40;
        return (thongAll?0:-1e9)+w[0]*R.linhLuc+w[1]*toc+w[2]*dp+w[3]*uy+mq.score-ngh*25000+pack2+preferenceScore(manh,mode)+schoolDominanceScore(manh,mode);
      }
      if(mode==='can'){
        const pack2=filled*35+manh.length*50;
        return !thongAll?-1e15:w[0]*R.linhLuc+w[1]*toc+w[2]*dp+w[3]*uy+mq.score-ngh*1500+pack2+preferenceScore(manh,mode)+schoolDominanceScore(manh,mode);
      }
      return w[0]*R.linhLuc+w[1]*toc+w[2]*dp+w[3]*uy+mq.score+(thongAll?0:-1e9)-ngh*30+pack*4+preferenceScore(manh,mode)+schoolDominanceScore(manh,mode)+pathShareScore(manh,mode);
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
          await yieldIf();
          const v = quick([...cur, cnd])+(idPath(id)?5000:0);
          if (!best || v > best.v) best = { v, cnd };
        }
      }
      if (!best || best.v <= curS + 1e-9) {
        if(pathOnly){ /* hết đồ lối → chuyển pha lấp */ continue; }
        break;
      }
      cur.push(best.cnd); curS = best.v;
      await yieldIf();
    }
    return cur.map((p) => ({ ...p.m }));
  }

  async function anneal({ nv0, mode, iters, init, onProg, label }) {
    const enemies = benchEnemies(nv0.canhGioi, nv0.tieuCanhGioi || 0);
    const ev = makeEval(nv0, enemies, mode);
    const { cand, g: gg } = await buildCandidates(nv0, !!(S.pref && S.pref.hypo));
    const ids = Object.keys(cand).filter((k) => cand[k].length);
    // ── Gợi ý theo luật game (đọc từ source): mảnh phải nối đan điền mới "thông"; phủ huyệt ×2 (+25%/huyệt thêm); ô cùng màu hệ 1.0 / cùng họ 0.5 ──
    const kmA = nv0.kinhMach || {};
    const hyS = new Set(kmA.huyetThem || []);
    if (Array.isArray(kmA.huyetGoc) && kmA.huyetGoc.length) kmA.huyetGoc.forEach((i) => hyS.add(i)); else (gg.huyet || []).forEach((v, i) => v && hyS.add(i));
    const orH = (h) => ({ loi: 'moc', phong: 'moc', bang: 'thuy', am: 'thuy' }[h] || h);
    const sgH = (e, t) => (e === 'vo_sac' ? (t === 'vo_sac' ? 1 : 0.5) : (t === e ? 1 : (t === 'vo_sac' || orH(t) === orH(e)) ? 0.5 : 0));
    const nbrs = (i) => { const o = [], x = i % gg.rong, y = Math.floor(i / gg.rong); if (x > 0) o.push(i - 1); if (x < gg.rong - 1) o.push(i + 1); if (y > 0) o.push(i - gg.rong); if (y < gg.cao - 1) o.push(i + gg.rong); return o.filter((k) => gg.vung[k] >= 0); };
    const prior = {};
    for (const id of ids) {
      const it = C().items.get(id); const he = (A(it?.he)[0]) || 'vo_sac';
      for (const cd of cand[id]) {
        let hy = 0, mau = 0;
        for (const x of cd.cells) { if (hyS.has(x)) hy++; mau += sgH(he, (kmA.mau || [])[x] || 'vo_sac'); }
        cd._hy = hy; cd._mau = mau / Math.max(1, cd.cells.length);
        cd._nb = new Set(); for (const x of cd.cells) for (const k of nbrs(x)) cd._nb.add(k);
      }
    }
    let _seed2 = 987654321; const rnd2 = () => { _seed2 = (_seed2 + 0x6D2B79F5) | 0; let t = Math.imul(_seed2 ^ (_seed2 >>> 15), 1 | _seed2); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // Chọn vị trí cho món `id` theo giải đấu nhỏ: ưu tiên nối với chuỗi đã đặt / đan điền, phủ huyệt, đúng màu; vẫn giữ 25% ngẫu nhiên để đa dạng
    const pickC = (id, next, skip = -1) => {
      const arr = cand[id]; if (!arr || !arr.length) return null;
      const used = new Set(); const front = new Set([gg.danDien]);
      next.forEach((p, i) => { if (i !== skip) p.cells.forEach((x) => used.add(x)); });
      next.forEach((p, i) => { if (i !== skip) p.cells.forEach((x) => front.add(x)); });
      const ok = [];
      for (let t = 0; t < 14 && ok.length < 6; t++) { const cd = arr[Math.floor(rnd2() * arr.length)]; if (!cd.cells.some((x) => used.has(x))) ok.push(cd); }
      if (!ok.length) return arr[Math.floor(rnd2() * arr.length)];
      if (rnd2() < 0.25) return ok[Math.floor(rnd2() * ok.length)];
      let best = null, bs = -1e9;
      for (const cd of ok) {
        let touch = 0; for (const x of cd.cells) if (front.has(x)) { touch = 1; break; }
        if (!touch) for (const k of cd._nb) if (front.has(k)) { touch = 1; break; }
        const sc = touch * 3 + cd._hy * 1.4 + cd._mau * 1.2 + rnd2() * 0.5;
        if (sc > bs) { bs = sc; best = cd; }
      }
      return best;
    };
    let seed = 12345; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const overlaps = (manh, c, skip = -1) => { const used = new Set(); manh.forEach((p, i) => { if (i !== skip) p.cells.forEach((x) => used.add(x)); }); return c.cells.some((x) => used.has(x)); };
    let cur = [];
    if (init) for (const m of init) { const c = (cand[m.item] || []).find((c) => c.m.x === m.x && c.m.y === m.y && c.m.xoay === m.xoay); if (c && !overlaps(cur, c)) cur.push(c); }
    let curS = ev(cur).s, best = cur, bestS = curS;
    let T0 = init && init.length ? 10 : 40; const dSamples = [];
    for (let it = 0; it < iters; it++) {
      if (S.abort) break;
      await yieldIf(onProg, it / iters, label);
      if (it === 40 && dSamples.length >= 5) { const mean = dSamples.reduce((a, b) => a + b, 0) / dSamples.length; T0 = Math.max(T0, mean * (init && init.length ? 0.25 : 0.6)); }
      const T = Math.max(T0 * 0.01, T0 * (1 - it / iters));
      const next = cur.slice(); const r = rnd();
      const free = () => ids.filter((id) => !next.some((p) => p.m.item === id));
      if (r < 0.62 || next.length === 0) { const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = pickC(id, next); if (!c || overlaps(next, c)) continue; next.push(c); }
      else if (r < 0.72) next.splice(Math.floor(rnd() * next.length), 1);
      else if (r < 0.9) { const i = Math.floor(rnd() * next.length); const id = next[i].m.item; const c = pickC(id, next, i); if (!c || overlaps(next, c, i)) continue; next[i] = c; }
      else { const i = Math.floor(rnd() * next.length); const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = pickC(id, next, i); if (!c || overlaps(next, c, i)) continue; next[i] = c; }
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
    const hy = new Set(km.huyetThem || []);
    // Huyệt gốc của KIẾP này đã lệch so với khuôn (km.huyetGoc, gdd 11 §2.3); không có (save cũ) mới lấy đúng khuôn
    if (Array.isArray(km.huyetGoc) && km.huyetGoc.length) km.huyetGoc.forEach((i) => hy.add(i));
    else g.huyet.forEach((v, i) => v && hy.add(i));
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
    const extra = stuck.length ? ` Túi đầy nên chưa tháo được ${stuck.join(', ')} (đã dời ra chỗ không vướng). Đạo hữu hãy tự bán hoặc vứt bớt vật phẩm không cần thiết trong túi rồi bấm xếp lại.` : '';
    return { ok: okAll, bagFull: stuck.length > 0, stuckNames: stuck.slice(), msg: okAll ? `Đã xếp xong ${want.length} món vào kinh mạch${loadout !== undefined ? ' (Bộ ' + (loadout + 1) + ')' : ''}.${extra}` : 'Xếp chưa trọn: ' + (errs.slice(0, 4).join('; ') || 'có món không đặt được') + '.' + extra + ' Phần còn lại xếp tay theo ảnh.' };
  }

  async function ensureCore(progress){if(!S.core)S.core=await loadCore(progress||(()=>{}));return S.core}
  async function packFill(nv0, mode, manh0){
    // Pha 1: hết đồ đúng lối. Pha 2: lấp mọi ô trống còn đặt được (mảnh nhỏ trước), chỉ cần thông + nghịch không xấu hơn nhiều.
    const K=S.core,c=C(),{cand}=await buildCandidates(nv0,!!(S.pref&&S.pref.hypo));
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
      const nv=nvFork(nv0);nv.kinhMach.manh=manh.map(p=>({...p.m}));
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
            await yieldIf();
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
  // Tu luyện/Cân bằng: đột phá công pháp là bắt buộc → chủ động thử cài các tâm pháp có dot_pha trước khi tìm kiếm ngẫu nhiên
  async function dpSeed(nv0,mode,seed){
    const c=C(),enemies=benchEnemies(nv0.canhGioi,nv0.tieuCanhGioi||0),ev=makeEval(nv0,enemies,mode),{cand}=await buildCandidates(nv0,!!(S.pref&&S.pref.hypo));
    const pack=list=>list.map(m=>({m,key:m.item+':'+m.x+','+m.y+','+m.xoay,cells:(cand[m.item]||[]).find(q=>q.m.x===m.x&&q.m.y===m.y&&q.m.xoay===m.xoay)?.cells||[]}));
    const dpIds=Object.keys(cand).filter(id=>cand[id].length&&(c.items.get(id)?.bi_dong?.dot_pha||0)>0).sort((a,b)=>{const f=id=>{const bd=c.items.get(id).bi_dong;return Math.min(.12,bd.dot_pha||0)*60000+(bd.toc_do||0)*2800};return f(b)-f(a)}).slice(0,6);
    let cur=A(seed).slice(),curS=ev(pack(cur)).s,rr=7;
    const rnd=()=>{rr=(rr*16807)%2147483647;return rr/2147483647};
    for(let round=0;round<2;round++){
      let bestM=null,bestS=curS;
      for(const id of dpIds){
        if(S.abort)return cur;
        if(cur.some(m=>m.item===id))continue;
        const arr=cand[id],tries=Math.min(arr.length,24);
        for(let t=0;t<tries;t++){
          const cd=arr[Math.floor(rnd()*arr.length)];
          const keep=cur.filter(m=>{const q=(cand[m.item]||[]).find(z=>z.m.x===m.x&&z.m.y===m.y&&z.m.xoay===m.xoay);return !(q&&q.cells.some(x=>cd.cells.includes(x)))});
          const trial=[...keep,{...cd.m}],e=ev(pack(trial));
          if(e.s>bestS){bestS=e.s;bestM=trial}
        }
        await yieldIf(null,0);
      }
      if(!bestM)break;cur=bestM;curS=bestS;
    }
    return cur;
  }
  // Đánh bóng cuối: leo đồi thêm món mới / dời mảnh sang vị trí khác cho tới khi không còn cải thiện (kiểm tra thấy tìm ngẫu nhiên đôi khi bỏ sót một món còn đặt thêm được)
  async function polish(nv0,mode,manh,iters,onProg){
    const enemies=benchEnemies(nv0.canhGioi,nv0.tieuCanhGioi||0),ev=makeEval(nv0,enemies,mode),{cand}=await buildCandidates(nv0,!!(S.pref&&S.pref.hypo));
    const pk=l=>l.map(m=>({m,key:m.item+':'+m.x+','+m.y+','+m.xoay}));
    const cellsOf=m=>(cand[m.item]||[]).find(q=>q.m.x===m.x&&q.m.y===m.y&&q.m.xoay===m.xoay)?.cells||[];
    const trialOf=(keep,cd)=>[...keep.filter(m=>!cellsOf(m).some(x=>cd.cells.includes(x))),{...cd.m}];
    const samples=iters>=1500?40:30,moveCap=1e9,t0=workNow(),budget=iters>=1500?45000:iters>=800?30000:20000,late=()=>workNow()-t0>budget;let rr=13;
    const rnd=()=>{rr=(rr*16807)%2147483647;return rr/2147483647};
    let cur=A(manh).slice(),curS=ev(pk(cur)).s;
    for(let round=0;round<3&&!S.abort;round++){
      let bestT=null,bestS=curS+1e-6;
      const ids=Object.keys(cand).filter(id=>cand[id].length&&!cur.some(m=>m.item===id));
      let k=0;
      for(const id of ids){
        const arr=cand[id];
        for(let t=0;t<Math.min(samples,arr.length);t++){const cd=t<samples/2?arr[Math.floor(t*arr.length/(samples/2))]:arr[Math.floor(rnd()*arr.length)],tr=trialOf(cur,cd),e=ev(pk(tr)).s;if(e>bestS){bestS=e;bestT=tr}await yieldIf(null,0)}
        if(++k%12===0){if(S.abort||late())break}
      }
      for(let i=0;i<cur.length&&!S.abort;i++){
        const keep=cur.filter((_,j)=>j!==i),arr=cand[cur[i].item]||[];
        for(let t=0;t<arr.length;t++){const cd=arr[t],tr=trialOf(keep,cd),e=ev(pk(tr)).s;if(e>bestS){bestS=e;bestT=tr}await yieldIf(null,0)}
        if(late())break;
      }
      if(!bestT)break;cur=bestT;curS=bestS;
    }
    return cur;
  }
  async function optimizeOne(nv,mode,iters,onProg,seeds){
    await ensureCore();S.abort=false;if(S.pref)S.pref._mode=mode;
    const current=evalCurrent(nv,mode),nv0=clone(nv);nv0.kinhMach.manh=[];
    onProg?.(.01,'Xếp nền');
    let seed=await greedy(nv0,mode);
    onProg?.(.03,'Lấp mạch');
    if(mode!=='danh')seed=await dpSeed(nv0,mode,seed);
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
    onProg?.(.95,'Đánh bóng');
    finalManh=await polish(nv0,mode,finalManh,iters,onProg);
    finalManh=await packFill(nv0,mode,finalManh);
    const enemies=benchEnemies(nv.canhGioi,nv.tieuCanhGioi||0);
    const ev=makeEval(nv0,enemies,mode);
    const pack=list=>list.map(m=>({m,key:m.item+':'+m.x+','+m.y+','+m.xoay}));
    const scored=[
      {manh:a.manh,e:ev(pack(a.manh))},
      {manh:mid,e:ev(pack(mid))},
      {manh:b.manh,e:ev(pack(b.manh))},
      {manh:finalManh,e:ev(pack(finalManh))},
      ...A(seeds).filter(x=>A(x).length).map(x=>({manh:x,e:ev(pack(x))}))
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
      out[mode]=await optimizeOne(nv,mode,iters,(f,l)=>onProg?.((i+f)/3,mode,l),Object.values(out).map(o=>o?.best?.manh).filter(Boolean));
      if(out[mode]?.best){
        out[mode].best.hypo=hypo;
        const bag=nv.tuiDo||{};
        const need=A(out[mode].best.manh).map(m=>m.item).filter(id=>(bag[id]||0)<1);
        out[mode].best.missing=[...new Set(need)];
      }
      if(S.abort)break;
    }
    // Chiến đấu chạy trước nên chưa thấy cách xếp của hai bộ sau: thử chúng bằng chính phép chấm Chiến đấu, hơn thì lấy (bảo đảm bộ Chiến đấu thắng nhiều nhất)
    if(!S.abort&&out.danh?.best&&out.tu?.best&&out.can?.best){
      for(const m of['tu','can']){
        const mh=A(out[m]?.best?.manh);if(!mh.length)continue;
        const nv3=clone(nv);nv3.kinhMach.manh=mh.map(x=>({...x}));
        try{const e=evalCurrent(nv3,'danh');
          if(e.score>out.danh.best.score&&!(e.R.manh||[]).some(x=>x&&!x.thong)){const bag=nv.tuiDo||{};out.danh.best={...e,hypo,missing:[...new Set(mh.map(x=>x.item).filter(id=>(bag[id]||0)<1))]}}
        }catch{}
      }
    }
    S.results=out;return out;
  }
  function missingForManh(manh){
    const bag=G().state.run.nhanVat.tuiDo||{};
    return [...new Set(A(manh).map(m=>m.item).filter(id=>(bag[id]||0)<1))];
  }
  async function apply(mode,slot,opts={}){
    const r=S.results?.[mode]?.best;if(!r)return{ok:false,msg:'Chưa có kết quả.'};
    // Giả định không còn tự thêm đồ vào túi: thiếu món nào thì phải đặt hàng (tab Vật phẩm) rồi mới xếp được.
    const miss=missingForManh(r.manh);
    if(miss.length){
      const names=miss.slice(0,8).map(id=>C().items.get(id)?.ten||id);
      return{ok:false,missing:miss,msg:'Còn thiếu '+miss.length+' món trong túi: '+names.join(', ')+(miss.length>8?'…':'')+'. Hãy đặt hàng các món này (nút "Đặt hàng" ở danh sách món còn thiếu), nhận hàng rồi xếp.'};
    }
    return applyLayout(r.manh,slot);
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
  return{ensureCore,optimizeThree,apply,applyAll,missingForManh,stop:()=>S.abort=true,reset:()=>{S.core=null},drawGrid,nvNow,pathShareInfo,get core(){return S.core},get results(){return S.results}};
})();

/* ───────── Dữ liệu: Nhiệm vụ bản đồ / Bí cảnh / Dị bảo ───────── */
const slotLabel=slot=>{const i=info(slot);return T(i?.ten||i?.diaDanh?.ten||slot)};
const countryOf=i=>{const q=i?.quocGia;return T(C.quocGia?.get?.(q)?.ten||'')};

/* Một dòng trên bản đồ: từ điểm sự kiện hoặc nơi chốn đặc biệt */
function makeRow({key,slot,title,kind,icon,enc,tags=[],extraLeft=null,noGate=false}){
  const i=info(slot),rc=reach(slot),travel=rc.travel,miles=rc.miles,est=rc.est,hetHan=N(enc?.__han)?+enc.__han:null;
  const open=noGate?{ok:true,left:null}:openOnArrival(slot,travel);
  const expLeft=hetHan!==null?hetHan-(nowYear()+(N(travel)?travel:0)):null;
  const left=[extraLeft,expLeft,open.left].filter(N).reduce((a,b)=>Math.min(a,b),Infinity);
  const slack=Number.isFinite(left)?left:null;
  const block=rc.block||'';
  const ok=open.ok&&N(travel)&&(expLeft===null||expLeft>=0);
  return{key,slot,title,kind,icon,place:slotLabel(slot),country:countryOf(i),travel,miles,est,slack,ok,block,why:(open.ok?(expLeft!==null&&expLeft<0?'Tới nơi thì đã hết hạn':''):open.reason),danger:danger(slot),tags,terrain:A(i?.diaHinh)}
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
    const npcRec=node.npc?run().npc?.[node.npc]:null,npcName=npcRec?.ten?String(npcRec.ten).replace(/[\uE000-\uE0FF]/g,''):'';
    const title=T(npcName&&enc?.ten?`${npcName} — ${enc.ten}`:(enc?.ten||slotLabel(slot)));
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
    out.push(makeRow({key:`tg|${e.id}|${e.slot}`,slot:e.slot,title:ten||'Thế sự',kind:'Thế sự',icon:'訊',enc:{__han:e.denNam},tags:['Tin đã biết',{co_duyen:'Cơ duyên',hiem_hoa:'Hiểm họa',le_hoi:'Lễ hội',tong_mon:'Tông môn'}[def?.nhom]||null].filter(Boolean),noGate:true}));
  }
  return out;
}

/* Loại bí cảnh của một nơi (game chọn theo seed) và cửa sổ cảnh giới được vào: tags.canh_gioi của loại đó */
let _bcList=null;
function biCanhEnc(slot){
  try{
    if(!placeDef(slot)?.khai_mo)return null;
    if(!_bcList)_bcList=[...C.encounters.values()].filter(h=>h&&h.kind==='bi_canh'&&h.tien_ich&&h.dia_diem&&A(h.tags?.noi).includes('bi_canh')&&!h.an&&!h.mat_bi&&(h.weight??1)>0).sort((a,b)=>a.id<b.id?-1:1);
    const i=info(slot),ok=h=>{const o=h.tags||{};return!((o.cap_nen&&(i.capNen<o.cap_nen[0]||i.capNen>o.cap_nen[1]))||(o.dia_hinh&&!o.dia_hinh.some(x=>A(i.diaHinh).includes(x)))||(o.the_luc&&!o.the_luc.some(x=>A(i.theLuc).includes(x)))||(o.quoc_gia&&!(i.quocGia&&o.quoc_gia.includes(i.quocGia)))||(o.toc_yeu&&!(i.tocYeu&&o.toc_yeu.includes(i.tocYeu)))||(o.phe&&!o.phe.includes(i.phe??'chinh')))};
    const l=_bcList.filter(ok),tot=l.reduce((a,h)=>a+(h.weight??1),0);let r=seedNext(`${run().seed}|bi_canh_loai|${slot}`)*tot;
    for(const h of l){r-=h.weight??1;if(r<0)return h}
    return l[l.length-1]||null;
  }catch{return null}
}
function gateLock(range,cg=Math.floor(Number(me().canhGioi??0))){
  if(!Array.isArray(range))return'';
  if(cg>range[1])return`Cấm chế bài xích tu vi ${cgTen(cg)}`;
  if(cg<range[0])return'Tu vi chưa đủ, cấm chế không mở';
  return'';
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
    const bce=biCanhEnc(s.id),gate=bce?.tags?.canh_gioi||null,lock=gateLock(gate);row.bcType=bce?T(bce.ten):null;row.gate=gate;row.locked=lock;
    row.block=rc.block||'';row.ok=Boolean(arrive.ok)&&!lock;row.why=lock?lock:arrive.ok?'':(row.openNow&&N(travel)?`Tới nơi thì cửa đã đóng, mở lại sau ${fmtTime(closedYears(s.id,{...run(),nam:nowYear()+travel}))}`:arrive.reason||'');
    row.wait=!row.openNow&&N(travel)?Math.max(0,closed-travel):0;if(lock)row.wait=0;
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
  const block=travelBlock(slot);
  const t=travelTo(slot),m=milesTo(slot);
  if(N(t)&&(t>0||slot===run().viTri))return{travel:t,miles:m,est:false,block};
  let d=NaN;try{d=W.distance(run().viTri,slot)}catch{}
  const r=estRatios();return N(d)&&r.tr?{travel:d*r.tr,miles:d*r.mi,est:true,block}:{travel:NaN,miles:NaN,est:true,block};
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
  return`<div class="sub" style="grid-column:1/4;border-top:1px dashed rgba(43,43,43,.2);padding-top:5px">${intro?`<i>${E(intro)}${enc.text.length>200?'…':''}</i>`:''}${rows.join('')}</div>`;
}

let relicSlotIdx=null;
const relicSlot=id=>{if(!relicSlotIdx){relicSlotIdx=new Map();for(const s of A(W.slots)){const d=info(s.id)?.diaDanh?.id;if(d)relicSlotIdx.set(d,s.id)}}return relicSlotIdx.get(id)||null};
function treasureRows(){
  const r=run(),active=[],waiting=[];
  const act=new Map();
  for(const [k,node] of Object.entries(r.nodes||{}))if(node?.encounter&&GUIDE.has(node.encounter)&&!node.viec)act.set(node.encounter,{node,slot:node.slot||k});
  for(const [id,gd] of GUIDE){
    const enc=C.encounters.get(id),relic=gd.relic?C.items.get(gd.relic):null,a=act.get(id);
    const base={id,title:T(gd.ten||enc?.ten||id),relic:relic?T(relic.ten):null,boss:gd.baoVe?`${gd.baoVe.ten} (${cgTen(gd.baoVe.cg)})`:null,gate:gd.gate,check:gd.check||null,cooldown:enc?.limits?.hoi_chieu_nam??gd.hoiChieu??null,chance:gd.chance,terrain:gd.noi,placeName:gd.dia?.ten||null};
    if(a&&hasSlot(a.slot)){
      const row=makeRow({key:`db|${a.slot}|${id}`,slot:a.slot,title:base.title,kind:'Dị bảo',icon:KIND_ICON.di_bao,enc:{__han:a.node.hetHanNam},noGate:true});
      Object.assign(row,base,{group:'active'});row.locked=gateLock(gd.gate);active.push(row);continue;
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
const tv=r=>N(r.travel)?+r.travel:1e9;
const SORTS={
  urgent:{name:'Khẩn cấp trước',fn:(a,b)=>(a.ok===b.ok?0:a.ok?-1:1)||((a.slack!==null?a.slack:1e9)-(b.slack!==null?b.slack:1e9))||(tv(a)-tv(b))},
  near:{name:'Gần nhất',fn:(a,b)=>(a.ok===b.ok?0:a.ok?-1:1)||(tv(a)-tv(b))},
  kind:{name:'Theo loại',fn:(a,b)=>a.kind.localeCompare(b.kind,'vi')||(tv(a)-tv(b))},
  safe:{name:'An toàn trước',fn:(a,b)=>(a.ok===b.ok?0:a.ok?-1:1)||(a.danger.rank-b.danger.rank)||(tv(a)-tv(b))}
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
  const m=window.map,cam=m?.cam,root=mapRoot();if(!cam||!hasSlot(slot))return false;
  if(!root&&typeof cam.centerOn!=='function')return false;
  const t=W.slot(slot),sc=Math.max(cam.minScale||.1,Math.min(cam.maxScale||10,cam.scale||1)),vw=cam.width||innerWidth,vh=cam.height||innerHeight;
  if(typeof cam.centerOn==='function'){try{cam.centerOn(t.x,t.y,sc);return true}catch{}}
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
  const blk=travelBlock(slot);
  const ok=Route.set(slot,label);
  if(!focusMap(mode==='go'?run().viTri:slot)&&!window.map)return{ok:false,msg:'Chưa mở được bản đồ.'};
  return{ok:true,msg:ok?(blk?'Đã vẽ đường. Lưu ý: '+blk+'.':''):'Không có đường đi an toàn tới nơi này — đã xem vị trí trên bản đồ.'};
}

/* ───────── Giao diện cổ phong ───────── */
const CSS=`
#${ID},#${ID}-fab,#${ID}-chip,#${ID}-toasts,#${ID}-modal{--ink:#f0e9d6;--ink2:#f4eedd;--ink3:#faf6ea;--gold:#7a1f1a;--gold2:rgba(43,43,43,.55);--paper:#2b2b2b;--mute:#6b6558;--red:#7a1f1a;--jade:#2f7a5c;--cyan:#2f6477;--amber:#b4602a;--vang:#9a7322;--vien:rgba(43,43,43,.55);--vien2:rgba(43,43,43,.18);font-family:"Noto Serif","Songti SC","Source Han Serif SC",Georgia,"Times New Roman",serif;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
#${ID} *,#${ID}-fab *{box-sizing:border-box;font-family:inherit}
#${ID}-fab{position:fixed;left:10px;bottom:88px;z-index:2147483000;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#2b3550,#0e1118 70%);border:1.5px solid var(--gold);color:var(--gold);font-size:25px;line-height:49px;text-align:center;cursor:pointer;box-shadow:0 0 0 3px rgba(43,43,43,.15),0 6px 18px rgba(0,0,0,.6);user-select:none;touch-action:none}
#${ID}-fab.pulse{animation:vkt2p 1.4s ease-in-out infinite}
@keyframes vkt2p{0%,100%{box-shadow:0 0 0 3px rgba(229,72,58,.35),0 0 0 0 rgba(229,72,58,.6)}50%{box-shadow:0 0 0 3px rgba(229,72,58,.6),0 0 0 14px rgba(229,72,58,0)}}
#${ID}-fab b{position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;border-radius:10px;background:var(--red);color:#fff;font:700 12px/20px sans-serif;padding:0 5px;display:none}
#${ID}-fab.has b{display:block}
#${ID}-chip{display:none!important;pointer-events:none!important;visibility:hidden}
#${ID}-afbar{position:fixed;z-index:2147483001;display:flex;flex-direction:column-reverse;align-items:center;gap:6px;pointer-events:auto}
#${ID}-afstats{position:fixed;z-index:2147483646;left:12px;bottom:12px;width:min(380px,calc(100vw - 24px));max-height:min(70vh,520px);overflow:auto;background:linear-gradient(180deg,rgba(22,28,40,.97),rgba(10,12,18,.97));border:1px solid #a8843f;border-radius:12px;padding:0 0 10px;color:#e8dcc8;font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.55);pointer-events:auto}
#${ID}-afstats .af-drag{cursor:move;padding:8px 14px 6px;user-select:none;touch-action:none;display:flex;align-items:center;gap:8px}
#${ID}-afstats .af-tg{flex:none;border:1px solid #a8843f;background:transparent;color:#e2b765;border-radius:6px;width:24px;height:24px;cursor:pointer;font-size:13px;line-height:1;padding:0}
#${ID}-afstats.col{width:auto;max-width:min(380px,calc(100vw - 24px))}
#${ID}-afstats.col .af-drag{padding:6px 10px}
#${ID}-afstats .af-row .pos{color:#2f7a5c}#${ID}-afstats .af-row .neg{color:#a3342b}
#${ID}-afstats .af-h{color:#e2b765;font-weight:700;font-size:14px;letter-spacing:.02em}
#${ID}-afstats .af-body{padding:0 14px}
#${ID}-afstats .af-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(168,132,63,.12)}
#${ID}-afstats .af-row3{display:grid;grid-template-columns:minmax(5.5em,1fr) minmax(4.5em,auto) minmax(4.5em,auto) minmax(5em,auto);gap:10px 12px;padding:4px 0;border-bottom:1px solid rgba(168,132,63,.12);align-items:center}
#${ID}-afstats .af-row3.head{opacity:.65;font-size:11px;border-bottom:1px solid rgba(168,132,63,.3)}
#${ID}-afstats .af-row3 .pos{color:#2f7a5c;text-align:right;font-variant-numeric:tabular-nums}
#${ID}-afstats .af-row3 .neg{color:#a3342b;text-align:right;font-variant-numeric:tabular-nums}
#${ID}-afstats .af-row3 .net,#${ID}-afstats .af-row .net{color:#e2b765;text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
#${ID}-afstats .af-k{opacity:.9}
#${ID}-afstats .af-sec{margin-top:8px;padding-top:6px;border-top:1px solid rgba(168,132,63,.28);color:#e2b765;font-size:12px;font-weight:600}
#${ID}-afstats .af-sub{opacity:.7;font-size:11px;margin-top:8px;line-height:1.35}
#${ID}-afbar button{width:40px;height:40px;border:1.5px solid #a8843f;background:radial-gradient(circle at 30% 25%,#2b3550,#0e1118 70%);color:#e2b765;border-radius:50%;padding:0;display:grid;place-items:center;box-shadow:0 3px 12px rgba(0,0,0,.5);cursor:pointer;line-height:0}
#${ID}-afbar button svg{width:18px;height:18px;display:block;fill:currentColor}
#${ID}-afbar[data-paused="1"] button[data-a="pause"]{border-color:#4fc7a0;color:#4fc7a0}
#${ID}-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${ID}-chip button{border:0;background:rgba(255,255,255,.1);color:var(--paper);width:24px;height:24px;border-radius:50%;cursor:pointer}
#${ID}-modal{position:fixed;inset:0;z-index:2147483300;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:16px;font-family:inherit}
#${ID}-modal .mbox{background:var(--ink3);color:var(--paper);border:1px solid var(--gold);border-radius:6px;max-width:420px;width:100%;max-height:88vh;overflow:auto;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.5)}
#${ID}-modal h3{margin:0 0 8px;font-size:16px;color:var(--gold)}
#${ID}-modal .mb{font-size:13.5px;line-height:1.5}
#${ID}-modal .mb small{color:var(--mute)}
#${ID}-modal .mmsg{margin-top:8px;font-size:13px;color:#a3342b}
#${ID}-modal .macts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
#${ID}-modal button.btn{flex:1 1 auto;min-height:38px;border:1px solid var(--gold2);background:rgba(43,43,43,.08);color:var(--gold);border-radius:3px;padding:6px 10px;font-size:13px;cursor:pointer}
#${ID}-modal button.btn.pri{background:linear-gradient(180deg,#b9362b,#8a241c);border-color:#e5483a;color:#fff}
#${ID}-modal button.btn:disabled{opacity:.45}
#${ID}-toasts{position:fixed;left:10px;right:10px;top:10px;z-index:2147483200;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;max-height:40vh;overflow:hidden}
#${ID}-toasts div{pointer-events:auto;max-width:min(420px,calc(100vw - 28px));width:auto;background:linear-gradient(90deg,#2a1513,#171b25);border:1px solid var(--red);border-left:4px solid var(--red);color:var(--paper);padding:9px 12px;border-radius:8px;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.6);animation:vkt2in .3s;cursor:pointer}
#${ID}-toasts div.ok{border-color:var(--jade);border-left-color:var(--jade);background:linear-gradient(90deg,#10261f,#171b25)}
@keyframes vkt2in{from{transform:translateY(-14px);opacity:0}}
#${ID}{position:fixed;left:8px;bottom:8px;z-index:2147483100;width:min(460px,calc(100vw - 16px));height:min(640px,calc(100dvh - 16px));display:none;flex-direction:column;background:linear-gradient(180deg,var(--ink2),var(--ink));color:var(--paper);border:1px solid var(--gold2);border-radius:12px;box-shadow:0 0 0 1px #000,0 0 0 4px rgba(43,43,43,.12),0 16px 48px rgba(0,0,0,.75);overflow:hidden;font-size:calc(14px*var(--co-chu,1))}
#${ID}.open{display:flex}
#${ID} header{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(43,43,43,.28);background:linear-gradient(90deg,rgba(43,43,43,.12),transparent)}
#${ID} header .seal{width:30px;height:30px;border-radius:6px;background:var(--red);color:#fff;display:grid;place-items:center;font-size:18px;transform:rotate(-4deg);box-shadow:0 0 0 1px #000 inset}
#${ID} header h1{margin:0;font-size:15px;color:var(--gold);letter-spacing:.5px;line-height:1.2}
#${ID} header small{display:block;color:var(--mute);font-size:11.5px}
#${ID} header button{margin-left:auto;border:1px solid var(--gold2);background:transparent;color:var(--gold);border-radius:6px;width:32px;height:32px;font-size:16px;cursor:pointer}
#${ID} .body{flex:1;overflow:auto;padding:8px 10px 12px;-webkit-overflow-scrolling:touch}
#${ID} nav{display:flex;overflow-x:auto;scrollbar-width:none;border-top:1px solid rgba(43,43,43,.28);background:var(--ink)}
#${ID} nav button{flex:1 0 auto;min-width:64px;border:0;background:transparent;color:var(--mute);padding:6px 2px 7px;font-size:11.5px;cursor:pointer;position:relative;line-height:1.25}
#${ID} nav button i{display:block;font-style:normal;font-size:18px;color:inherit}
#${ID} nav button.on{color:var(--gold);background:linear-gradient(180deg,rgba(43,43,43,.14),transparent)}
#${ID} nav button.on::before{content:"";position:absolute;top:0;left:22%;right:22%;height:2px;background:var(--gold)}
#${ID} nav button em{position:absolute;top:2px;right:calc(50% - 22px);background:var(--red);color:#fff;border-radius:9px;font:700 10px/16px sans-serif;min-width:16px;padding:0 4px;font-style:normal}
#${ID} .bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
#${ID} input,#${ID} select{background:var(--ink3);color:var(--paper);border:1px solid rgba(43,43,43,.3);border-radius:7px;padding:7px 8px;font-size:14px;min-width:0}
#${ID} input[type=search],#${ID} .grow{flex:1 1 140px}
#${ID} .chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:6px;scrollbar-width:none}
#${ID} .chip{flex:none;border:1px solid rgba(43,43,43,.3);background:transparent;color:var(--mute);border-radius:14px;padding:4px 11px;font-size:12.5px;cursor:pointer}
#${ID} .chip.on{background:var(--gold);color:#1a1205;border-color:var(--gold);font-weight:700}
#${ID} .sum{color:var(--mute);font-size:12px;margin:2px 0 8px}
#${ID} h3{margin:12px 0 6px;font-size:13px;color:var(--gold);letter-spacing:.4px;display:flex;align-items:center;gap:8px}
#${ID} h3::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(43,43,43,.4),transparent)}
#${ID} .card{position:relative;display:grid;grid-template-columns:34px 1fr auto;gap:4px 10px;background:var(--ink3);border:1px solid rgba(43,43,43,.18);border-left:3px solid var(--jade);border-radius:9px;padding:9px 10px;margin-bottom:8px}
#${ID} .card.late{border-left-color:#6b6f7a;opacity:.62}
#${ID} .card.d2{border-left-color:var(--amber)}#${ID} .card.d3{border-left-color:var(--red)}
#${ID} .seg{display:flex;gap:0;margin:2px 0 8px;border:1px solid var(--gold2);border-radius:9px;overflow:hidden}#${ID} .seg button{flex:1;padding:8px 6px;font:inherit;font-weight:700;background:transparent;color:var(--mute);border:0;border-right:1px solid var(--gold2);cursor:pointer}#${ID} .seg button:last-child{border-right:0}#${ID} .seg button.on{background:var(--gold2);color:#1a1209}#${ID} .hrow{display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;padding:2px 0 6px;margin-bottom:2px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}#${ID} .hrow.wrap{flex-wrap:wrap;overflow:visible}#${ID} .hrow .chip{flex:none;white-space:nowrap}#${ID} .hrow .gl{flex:none;align-self:center;font-size:10.5px;letter-spacing:.04em;color:var(--mute);padding:0 2px 0 8px;border-left:1px solid rgba(160,130,60,.4)}#${ID} .mp-tool select{flex:none;max-width:42%}#${ID} .mp-tool .chip{flex:none}#${ID} .mp-tool .chip b{background:var(--gold2);color:#1a1209;border-radius:9px;padding:0 6px;margin-left:3px}#${ID} .chip.x{border-color:var(--cyan);color:var(--cyan)}#${ID} .fpanel{border:1px solid rgba(160,130,60,.4);border-radius:9px;padding:8px 10px;margin:2px 0 8px;display:grid;gap:8px;background:rgba(0,0,0,.12)}#${ID} .fpanel .ft{font-weight:700;margin-bottom:4px;color:var(--gold)}#${ID} .fpanel .frow{display:flex;gap:8px;flex-wrap:wrap}#${ID} .fpanel label{display:grid;gap:3px;font-size:11.5px;color:var(--mute);flex:1 1 140px}#${ID} .fpanel select{width:100%}
#${ID} .ico.nd{border:0;background:none;padding:0;display:grid;place-items:center}#${ID} .seal{display:inline-grid;place-items:center;width:var(--s,34px);height:var(--s,34px);box-sizing:border-box;border-radius:3px;background:#efe6cf;border:2px solid #8a8478;font-weight:700;font-size:calc(var(--s,34px)*.45);color:#6b5a3a;position:relative}#${ID} .seal:not(.fb)::after{content:"";position:absolute;inset:12%;background:var(--c);-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat}
#${ID} .npc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px;margin-top:6px}#${ID} .npc-grid .npcb{width:100%;height:46px;min-height:46px;padding:3px 6px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.2;overflow:hidden}#${ID} .npc-grid .npcb span{display:block;max-width:100%;font-size:12.5px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}#${ID} .npc-grid .npcb small{display:block;font-size:10.5px;opacity:.75;font-weight:400;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#${ID} .npc-grid .npcb:disabled{opacity:.5;cursor:not-allowed}#${ID} .dl-box{margin-top:8px;border:1px solid var(--vien);padding:6px 8px;background:#ffffff40}#${ID} .dl-box summary{cursor:pointer}#${ID} .dl-r{margin:2px 0}#${ID} .dl-r.ok{color:#2f6b4f}#${ID} .dl-r.no{color:#a3342b}#${ID} .dl-r i{opacity:.8;font-style:normal}
#${ID} .an,#${ID}-fab .an{display:inline-block;width:var(--s,22px);height:var(--s,22px);background:currentColor;-webkit-mask:var(--an) center/contain no-repeat;mask:var(--an) center/contain no-repeat;vertical-align:middle}#${ID} nav button i .an{display:block;margin:0 auto}#${ID} header .seal .an{background:#f0e9d6}#${ID}-fab{display:grid;place-items:center;line-height:1}#${ID}-fab b{position:absolute}#${ID} .gimg{width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:5px}#${ID} .gimg.rk{width:16px;height:auto;margin:0 3px 0 0;filter:drop-shadow(0 0 1px #fff)}
#${ID} .gi.k-item:not(.fb){background:none;border:0;overflow:visible}#${ID} .gi.k-item:not(.fb) img{filter:drop-shadow(0 0 1.5px rgba(255,248,230,.9)) drop-shadow(0 1px 1.5px rgba(40,25,10,.45))}#${ID} .gi.fb,#${ID} .gi.k-enemy,#${ID} .gi.k-face{background:#efe6cf;border:2px solid #8a8478;border-radius:3px;color:#6b5a3a;font-weight:700}
#${ID} input[type=checkbox],#${ID} input[type=radio],#${ID} input[type=range]{accent-color:#7a1f1a}#${ID}{--ci:var(--co-icon,1)}#${ID} .an{width:calc(var(--s,22px)*var(--ci));height:calc(var(--s,22px)*var(--ci))}#${ID} .seal,#${ID} .gi{width:calc(var(--s,34px)*var(--ci));height:calc(var(--s,34px)*var(--ci))}
#${ID} .gi{display:inline-grid;place-items:center;flex:none;width:var(--s,34px);height:var(--s,34px);border-radius:8px;overflow:hidden;background:rgba(0,0,0,.22);border:1px solid rgba(160,130,60,.35);font-size:calc(var(--s,34px)*.5);color:var(--gold)}#${ID} .gi img{width:100%;height:100%;object-fit:contain;display:block}#${ID} .gi.fb{border-color:var(--gold2)}#${ID} .card{content-visibility:auto;contain-intrinsic-size:auto 66px}#${ID} .ico{grid-row:1/3;width:34px;height:34px;border-radius:8px;border:1px solid var(--gold2);color:var(--gold);display:grid;place-items:center;font-size:18px;background:rgba(0,0,0,.25)}
#${ID} .card b{font-size:14.5px;color:#fff;line-height:1.3}
#${ID} .card small,#${ID} .sub{color:var(--mute);font-size:12px;line-height:1.4}
#${ID} .side{text-align:right;font-size:13px;color:var(--cyan);white-space:nowrap}
#${ID} .side small{display:block}
#${ID} .tags{grid-column:2/4;display:flex;flex-wrap:wrap;gap:4px}
#${ID} .tag{font-size:11.5px;border:1px solid rgba(43,43,43,.28);color:var(--paper);border-radius:4px;padding:1px 6px}
#${ID} .tag.g{border-color:var(--jade);color:var(--jade)}#${ID} .tag.r{border-color:var(--red);color:#a3342b}#${ID} .tag.o{border-color:var(--amber);color:var(--amber)}
#${ID} .card.enc{border:1px solid rgba(120,160,255,.55);margin-bottom:8px}#${ID} .enc-log{display:grid;gap:4px;margin-top:6px;font-size:12.5px;line-height:1.5}#${ID} .enc-ch{opacity:.65;font-style:italic}#${ID} .enc-sys{color:#6c6}#${ID} .enc-say b{color:#8ab4ff}#${ID} .enc-choices .btn{text-align:left;flex:1 1 100%}#${ID} .enc-gift{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;padding:3px 0}#${ID} .npc-panel{display:grid;gap:6px;margin-top:4px}#${ID} .npc-sec{background:rgba(127,127,127,.12);border-radius:8px;padding:6px 8px;font-size:12px;line-height:1.45}#${ID} .npc-sec select{max-width:100%;flex:1}#${ID} .acts{grid-column:1/4;flex-wrap:wrap;display:flex;gap:6px;margin-top:3px}
#${ID} button.btn{flex:1;border:1px solid var(--gold2);background:rgba(43,43,43,.08);color:var(--gold);border-radius:7px;padding:8px 6px;font-size:13px;cursor:pointer;min-height:36px}
#${ID} button.btn:active{background:rgba(43,43,43,.25)}
#${ID} button.btn.pri{background:linear-gradient(180deg,#b9362b,#8a241c);border-color:#e5483a;color:#fff}
#${ID} button.btn:disabled{opacity:.45}
#${ID} .empty{text-align:center;color:var(--mute);padding:26px 10px}
#${ID} .panel{background:var(--ink3);border:1px solid rgba(43,43,43,.2);border-radius:9px;padding:10px;margin-bottom:8px}
#${ID} .form{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#${ID} .form label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--mute)}
#${ID} .form select{width:100%}
#${ID} .seg{display:flex;border:1px solid var(--gold2);border-radius:8px;overflow:hidden;margin:8px 0}
#${ID} .seg button{flex:1;border:0;background:transparent;color:var(--mute);padding:8px 2px;font-size:12.5px;cursor:pointer}
#${ID} .seg button.on{background:var(--gold);color:#1a1205;font-weight:700}
#${ID} .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}
#${ID} .stats div{background:rgba(0,0,0,.25);border-radius:7px;padding:6px;text-align:center;font-size:11.5px;color:var(--mute)}
#${ID} .stats b{display:block;color:var(--gold);font-size:15px}
#${ID} details.sec{border:1px solid var(--vien2,rgba(43,43,43,.25));border-radius:6px;margin:8px 0;background:rgba(0,0,0,.05)}
#${ID} details.sec>summary{cursor:pointer;padding:8px 10px;font-weight:700;color:var(--gold);list-style:none;display:flex;gap:6px;align-items:baseline}
#${ID} details.sec>summary::-webkit-details-marker{display:none}
#${ID} details.sec>summary::before{content:'▸';font-size:11px;opacity:.7}
#${ID} details.sec[open]>summary::before{content:'▾'}
#${ID} details.sec>.secb{padding:0 10px 10px}
#${ID} .grp .gh{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--vien2,rgba(43,43,43,.15))}
#${ID} .grp .gt{flex:1;text-align:left;background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:2px 0}
#${ID} .grp .gb{padding:2px 0 6px 22px;display:grid;grid-template-columns:1fr;gap:2px}
#${ID} .grp .gb[hidden]{display:none}
#${ID} .grp .gb label{display:flex;gap:6px;align-items:flex-start;line-height:1.35}
#${ID} .grp input[type=checkbox],#${ID} .pol input[type=checkbox]{margin-top:2px}
#${ID} .pol label{display:flex;gap:6px;align-items:flex-start;margin:3px 0}
#${ID} .jrn summary{cursor:pointer;line-height:1.4;padding:3px 0}
#${ID} .jrn{border-bottom:1px solid var(--vien2,rgba(43,43,43,.15))}
#${ID} .bar2{height:5px;background:rgba(43,43,43,.1);border-radius:3px;overflow:hidden;margin:8px 0}
#${ID} .bar2 i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--jade),var(--gold))}
#${ID} .grid svg,#${ID} .grid img{max-width:100%;height:auto;border-radius:8px}
#${ID} .qty{width:72px;flex:none}
#${ID} details{margin-top:6px}#${ID} summary{cursor:pointer;color:var(--gold);font-size:13px;padding:4px 0}
#${ID} .row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:12.5px;border-bottom:1px dashed rgba(43,43,43,.1)}
.ok{color:var(--jade)}.bad{color:#a3342b}
@media (min-width:700px){#${ID}{left:70px;bottom:20px}}
@media (min-width:1000px){#${ID}{font-size:calc(15px*var(--co-chu,1))}#${ID} header h1{font-size:17px}#${ID} nav button{font-size:12.5px}}
#${ID} header{cursor:move;touch-action:none;user-select:none}
#${ID} header button{cursor:pointer;touch-action:manipulation;margin-left:0}#${ID} header>div:nth-of-type(2){flex:1;min-width:0}
#${ID}-wide{background:none;border:1px solid var(--vien2,#999);border-radius:4px;color:var(--paper);width:32px;height:32px;font-size:16px;line-height:1;display:none}
@media (min-width:900px){#${ID}-wide{display:block}}
#${ID} .rz{position:absolute;right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;z-index:5;touch-action:none;background:linear-gradient(135deg,transparent 0 55%,var(--mute) 55% 60%,transparent 60% 70%,var(--mute) 70% 75%,transparent 75% 85%,var(--mute) 85% 90%,transparent 90%)}
#${ID}.wide .body{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:8px 10px;align-content:start}
#${ID}.wide .body>*{grid-column:1/-1;min-width:0}
#${ID}.wide .body>article.card{grid-column:auto}
@media (max-width:380px){#${ID} .card{grid-template-columns:28px 1fr auto}#${ID} .ico{width:28px;height:28px;font-size:15px}#${ID} nav button{font-size:10.5px}}


/* ===== Giao diện đồng bộ với game (giấy · mực · chu sa) ===== */
#${ID}{background:var(--ink);border:1px solid var(--vien);outline:1px solid var(--vien2);outline-offset:-5px;border-radius:1px;box-shadow:0 2px 10px #2b2b2b33,0 10px 30px #2b2b2b4d;color:var(--paper)}
#${ID}::before{content:"";position:absolute;inset:-4px;pointer-events:none;z-index:1;background:var(--goc) top left/18px 18px no-repeat,var(--goc-tr) top right/18px 18px no-repeat,var(--goc-bl) bottom left/18px 18px no-repeat,var(--goc-br) bottom right/18px 18px no-repeat}
#${ID} header{border-bottom:1px solid var(--vien2);background:none}
#${ID} header .seal{border-radius:1px;box-shadow:none;background:#7a1f1a;color:#f0e9d6;transform:none}
#${ID} header h1{color:#7a1f1a;letter-spacing:.08em}
#${ID} header button,#${ID} button.btn,#${ID} .seg,#${ID} .chip{border-radius:1px}
#${ID} header button,#${ID} button.btn{border:1px solid var(--vien);background:linear-gradient(180deg,#ffffff8c,#f0e9d699);color:var(--paper);box-shadow:inset 0 0 0 2px #ffffff59,inset 0 -1px 0 2px #2b2b2b0f;transition:color .15s,border-color .15s,background-color .15s}
#${ID} header button:hover,#${ID} button.btn:hover:not(:disabled){color:#7a1f1a;border-color:#7a1f1a;background:#7a1f1a12}
#${ID} button.btn.pri{background:#7a1f1a;border-color:#7a1f1a;color:#f0e9d6;box-shadow:inset 0 0 0 2px #7a1f1a,inset 0 0 0 3px #f0e9d6bf,0 2px 6px #7a1f1a40}
#${ID} button.btn.pri:hover:not(:disabled){background:#5e1713;border-color:#5e1713;color:#f0e9d6}
#${ID} button.btn:active{background:#7a1f1a22}
#${ID} nav{border-top:1px solid var(--vien2);background:none}
#${ID} nav button{color:var(--mute)}
#${ID} nav button.on{color:#7a1f1a;background:#7a1f1a12}
#${ID} nav button.on::before{background:#7a1f1a}
#${ID} nav button em,#${ID}-fab b{background:#7a1f1a;color:#f0e9d6}
#${ID} input,#${ID} select,#${ID} textarea{background:#ffffff80;color:var(--paper);border:1px solid var(--vien);border-radius:1px;padding:5px 8px;font-size:13px}
#${ID} input:focus,#${ID} textarea:focus{outline:none;border-color:#7a1f1a;background:#fff}
#${ID} .chip{border:1px solid var(--vien);background:linear-gradient(180deg,#ffffff8c,#f0e9d699);color:var(--paper);padding:3px 10px;font-size:12px}
#${ID} .chip:hover{color:#7a1f1a;border-color:#7a1f1a}
#${ID} .chip.on{background:#7a1f1a;border-color:#7a1f1a;color:#f0e9d6;font-weight:600}
#${ID}-modal{background:rgba(20,18,14,.5)}#${ID}-modal .mbox{background:#f0e9d6;color:#2b2b2b;border:1px solid #2b2b2b8c;border-radius:1px;box-shadow:inset 0 0 0 3px #ffffff59,0 10px 34px #0000007a;padding:16px 18px;max-width:440px}#${ID}-modal h3{color:#7a1f1a;letter-spacing:.06em;font-size:17px;border-bottom:1px solid #2b2b2b2e;padding-bottom:6px}#${ID}-modal .mb small{color:#6b6558}#${ID}-modal .mb b{color:#7a1f1a}#${ID}-modal .macts{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}#${ID}-modal button.btn{border:1px solid #2b2b2b8c;border-radius:1px;background:linear-gradient(180deg,#ffffff8c,#f0e9d699);color:#2b2b2b;box-shadow:inset 0 0 0 2px #ffffff59,inset 0 -1px 0 2px #2b2b2b0f;min-height:40px;font-weight:600}#${ID}-modal button.btn:hover:not(:disabled){color:#7a1f1a;border-color:#7a1f1a;background:#7a1f1a12}#${ID}-modal button.btn.pri{background:#7a1f1a;border-color:#7a1f1a;color:#f0e9d6;box-shadow:inset 0 0 0 2px #7a1f1a,inset 0 0 0 3px #f0e9d6bf,0 2px 6px #7a1f1a40}#${ID}-modal button.btn.pri:hover:not(:disabled){background:#5e1713;color:#f0e9d6}#${ID}-modal .mmsg{color:#a3342b}
#${ID} h3{color:#7a1f1a;letter-spacing:.06em}
#${ID} h3::after{background:linear-gradient(90deg,var(--vien),transparent)}
#${ID} .card,#${ID} .panel{background:#ffffff59;border:1px solid var(--vien2);border-left:3px solid var(--jade);border-radius:1px}
#${ID} .panel{border-left:1px solid var(--vien2)}
#${ID} .card.late{border-left-color:#9a958a;opacity:.7}
#${ID} .card.d2{border-left-color:var(--amber)}#${ID} .card.d3{border-left-color:#7a1f1a}
#${ID} .ico{border:1px solid var(--vien);color:#7a1f1a;background:#ffffff59;border-radius:1px}
#${ID} .card b,#${ID} .stats b{color:var(--paper)}#${ID} .stats b{color:#7a1f1a}
#${ID} .side{color:var(--cyan)}
#${ID} .tag{border:1px solid var(--vien2);color:var(--paper);border-radius:1px;background:#ffffff40}
#${ID} .tag.g{border-color:var(--jade);color:var(--jade)}#${ID} .tag.r{border-color:#7a1f1a;color:#7a1f1a}#${ID} .tag.o{border-color:var(--amber);color:var(--amber)}
#${ID} .seg{border:1px solid var(--vien)}#${ID} .seg button{color:var(--mute)}#${ID} .seg button.on{background:#7a1f1a;color:#f0e9d6}
#${ID} .stats div{background:#2b2b2b0f;border-radius:1px}
#${ID} .bar2{background:#2b2b2b1a;border-radius:0}
#${ID} .bar2 i{background:linear-gradient(90deg,var(--jade),#9a7322)}
#${ID} .row{border-bottom:1px dashed var(--vien2)}
#${ID} summary{color:#7a1f1a}
#${ID} .grid svg,#${ID} .grid img{border-radius:1px}
.ok{color:var(--jade)}.bad{color:#a3342b}
#${ID}-fab{background:var(--ink);border:1.5px solid #7a1f1a;color:#7a1f1a;box-shadow:0 0 0 3px #7a1f1a26,0 3px 10px #2b2b2b4d}
#${ID}-afbar button{background:var(--ink);border:1.5px solid #7a1f1a;color:#7a1f1a;box-shadow:0 3px 10px #2b2b2b4d}
#${ID}-afbar[data-paused="1"] button[data-a="pause"]{border-color:var(--jade);color:var(--jade)}
#${ID}-afstats{background:#f0e9d6f5;border:1px solid var(--vien);outline:1px solid var(--vien2);outline-offset:-4px;border-radius:1px;color:var(--paper);font-family:"Noto Serif",Georgia,serif;box-shadow:0 6px 24px #2b2b2b59}
#${ID}-afstats .af-tg{border:1px solid var(--vien);color:#7a1f1a;border-radius:1px;background:#ffffff80}
#${ID}-afstats .af-h,#${ID}-afstats .af-sec{color:#7a1f1a}
#${ID}-afstats .af-row .net,#${ID}-afstats .af-row3 .net{color:#9a7322}
#${ID}-afstats .af-row{border-bottom:1px solid var(--vien2)}#${ID}-afstats .af-row3{border-bottom:1px solid var(--vien2)}
#${ID}-afstats .af-sec{border-top:1px solid var(--vien2)}
#${ID}-toasts div{background:#f0e9d6;color:var(--paper);border:1px solid var(--vien);border-left:3px solid #7a1f1a;border-radius:1px;font-size:13px;line-height:1.5;box-shadow:0 8px 28px #2b2b2b66;outline:1px solid var(--vien2);outline-offset:-4px}
#${ID}-toasts div.ok{border-left-color:var(--jade);background:#f0e9d6}
#${ID}-toasts div.warn{border-left-color:var(--amber)}#${ID}-toasts div.err{border-left-color:#7a1f1a}

/* icon tool gắn vào thẻ nhân vật của game */
#${ID}-fab.docked{position:absolute!important;left:auto!important;bottom:auto!important;top:3px!important;right:26px!important;width:22px;height:22px;border:0;border-radius:0;background:transparent;box-shadow:none;font-size:15px;line-height:22px;color:#7a1f1a;animation:none;z-index:2;display:block}
#${ID}-fab.docked:hover{color:#5e1713}
#${ID}-fab.docked.has{color:#b52a24}
#${ID}-fab.docked b{top:-2px;right:-4px;min-width:14px;height:14px;font-size:10px;line-height:14px;padding:0 3px;border-radius:7px}
.hud-trang-thai.thu-gon>#${ID}-fab{display:block!important}
#${ID}-afbar.incard{position:absolute!important;top:0;right:48px;left:auto!important;bottom:auto!important;flex-direction:row;gap:0;z-index:2}
#${ID}-afbar.incard button{width:30px;height:30px;border:0!important;border-radius:2px;background:transparent!important;box-shadow:none!important;color:#7a1f1a}
#${ID}-afbar.incard button:hover{background:#7a1f1a1a!important}
#${ID}-afbar.incard button svg{width:15px;height:15px}
.hud-trang-thai.thu-gon>#${ID}-afbar{display:flex!important}
#${ID}-afsum{position:absolute;top:27px;right:6px;z-index:2;text-align:left;font-size:11px;line-height:1.3;color:var(--paper);cursor:pointer;white-space:nowrap;padding:1px 3px;border-radius:1px}
#${ID}-afsum span{display:block}#${ID}-afsum.one span{display:inline}#${ID}-afsum:not(.one) .sep{display:none}
#${ID}-afsum:hover{background:#7a1f1a14;color:#7a1f1a}
#${ID}-afsum b{color:#7a1f1a;font-weight:600}
.hud-trang-thai.thu-gon>#${ID}-afsum{display:block!important}
/* dropdown kiểu game */
.vk-sel{display:inline-flex;align-items:center;gap:6px;min-width:0;text-align:left;font:inherit;font-size:13px;color:#2b2b2b;background:linear-gradient(180deg,#ffffff8c,#f0e9d699);border:1px solid rgba(43,43,43,.55);border-radius:1px;padding:5px 8px;cursor:pointer;box-shadow:inset 0 0 0 2px #ffffff59,inset 0 -1px 0 2px #2b2b2b0f}
.vk-sel:hover:not(:disabled),.vk-sel[aria-expanded=true]{color:#7a1f1a;border-color:#7a1f1a;background:#7a1f1a12}
.vk-sel:disabled{opacity:.5;cursor:not-allowed}
.vk-sel .vk-lab{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vk-sel .vk-arr{flex:none;font-size:9px;opacity:.6}
#${ID} .form .vk-sel{width:100%}
.vk-pop{position:fixed;z-index:2147483300;background:#f0e9d6;border:1px solid rgba(43,43,43,.55);outline:1px solid rgba(43,43,43,.18);outline-offset:-4px;box-shadow:0 8px 28px #2b2b2b66;overflow:auto;padding:4px 0;font:13px/1.4 "Noto Serif",Georgia,serif;color:#2b2b2b;scrollbar-width:thin}
.vk-opt{position:relative;padding:3px 10px 3px 22px;cursor:pointer;overflow-wrap:anywhere}
.vk-opt.active{background:#7a1f1a14}.vk-opt.sel{color:#7a1f1a;font-weight:600}
.vk-opt.sel::before{content:"◆";position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:8px}
.vk-opt.dis{opacity:.45;cursor:not-allowed}
.vk-hide{display:none!important}
`;
const styleEl=document.createElement('style');styleEl.id=ID+'-style';styleEl.textContent=CSS;document.head.appendChild(styleEl);

const TABS=[['quest','事','Nhiệm vụ'],['map','地','Bản đồ'],['realm','秘','Bí cảnh&Dị bảo'],['auto','自','Auto Farm'],['bounty','賞','Treo thưởng'],['people','人','Nhân mạch'],['sect','宗','Tông môn'],['breakthrough','破','Đột phá'],['build','脈','Kinh mạch'],['items','寶','Vật phẩm'],['check','察','Kiểm tra']];
const panel=document.createElement('div');panel.id=ID;panel.setAttribute('role','dialog');
panel.innerHTML=`<header><div class="seal">仙</div><div><h1>Vạn Kiếp Trợ Thủ</h1><small id="${ID}-sub"></small></div><button id="${ID}-wide" title="Mở rộng / thu nhỏ (kéo thanh tiêu đề để di chuyển, kéo góc dưới phải để đổi cỡ)" aria-label="Mở rộng">⤢</button><button id="${ID}-x" aria-label="Thu gọn">✕</button></header><div class="rz" title="Kéo để đổi cỡ"></div><div class="body" id="${ID}-body"></div><nav>${TABS.map(([k,i,n])=>`<button data-t="${k}"><i>${i}</i>${n}</button>`).join('')}</nav>`;
const fab=document.createElement('div');fab.id=ID+'-fab';fab.innerHTML='仙<b></b>';fab.title='Vạn Kiếp Trợ Thủ';
const chip=document.createElement('div');chip.id=ID+'-chip';chip.innerHTML='<span></span><button aria-label="Xóa đường">✕</button>';
const toasts=document.createElement('div');toasts.id=ID+'-toasts';
const modal=document.createElement('div');modal.id=ID+'-modal';
document.body.append(panel,fab,chip,toasts,modal);
const body=$(panel,'.body'),navEl=$(panel,'nav');
/* Chống giật khi đang cuộn: (1) không dựng lại DOM nếu HTML không đổi, (2) hoãn mọi lần làm mới tự động khi người dùng đang cuộn/chạm */
const scr={t:0,touch:false,prog:false};
(()=>{const d=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let last='';
  /* chỉ bỏ qua khi HTML y hệt VÀ không ai sửa DOM sau lần dựng trước (nhiều tab chèn thêm phần tử sau khi gán innerHTML) */
  let dirtyF=false;const note=rs=>{if(rs.some(r=>!(r.type==='attributes'&&r.attributeName==='open')))dirtyF=true};const mo=new MutationObserver(note);mo.observe(body,{childList:true,subtree:true,attributes:true,characterData:true});
  Object.defineProperty(body,'innerHTML',{configurable:true,get(){return d.get.call(this)},set(v){v=String(v);note(mo.takeRecords());const dirty=dirtyF;
    if(v===last&&!dirty&&this.firstChild)return;last=v;const k=this.scrollTop;scr.prog=true;d.set.call(this,v);this.scrollTop=k;scr.prog=false;mo.takeRecords();dirtyF=false}});
  const mark=()=>{scr.t=performance.now()};
  body.addEventListener('scroll',()=>{if(!scr.prog)mark()},{passive:true});
  body.addEventListener('wheel',mark,{passive:true});
  body.addEventListener('touchstart',()=>{scr.touch=true;mark()},{passive:true});
  const end=()=>{scr.touch=false;mark()};body.addEventListener('touchend',end,{passive:true});body.addEventListener('touchcancel',end,{passive:true});
})();
const userScrolling=()=>scr.touch||performance.now()-scr.t<700;
panel.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.parentNode?.classList?.contains('gi')){const q=t.parentNode;q.classList.add('fb');q.textContent=q.dataset.fb||''}},true);
const ui={tab:store.get('tab','quest'),isOpen:false,tabState:{}};
/* Vị trí / cỡ cửa sổ: kéo thanh tiêu đề để dời, kéo góc dưới phải để đổi cỡ, nút ⤢ để mở rộng (PC). Nhớ lại lần sau. */
const PG={pos:store.get('panelPos',null),size:store.get('panelSize',null),wide:store.get('panelWide',false)};
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
function applyPanelGeom(){
  const vw=innerWidth,vh=innerHeight,wideOk=vw>=900,wide=!!PG.wide&&wideOk;
  panel.classList.toggle('wide',wide);
  let w=0,h=0;
  if(PG.size){w=PG.size.w;h=PG.size.h}
  else if(wide){w=Math.min(1240,vw-100);h=Math.min(920,vh-32)}
  else if(vw>=1000){w=660;h=Math.min(800,vh-32)}
  if(w){w=clampN(w,320,vw-8);h=clampN(h,380,vh-8);panel.style.width=w+'px';panel.style.height=h+'px'}else{panel.style.width='';panel.style.height=''}
  if(PG.pos){const rw=panel.offsetWidth||w||460,rh=panel.offsetHeight||h||640;panel.style.left=clampN(PG.pos.l,0,Math.max(0,vw-Math.min(rw,vw)))+'px';panel.style.top=clampN(PG.pos.t,0,Math.max(0,vh-Math.min(rh,vh)))+'px';panel.style.bottom='auto'}
  else{panel.style.left='';panel.style.top='';panel.style.bottom=''}
  const wb=panel.querySelector('#'+ID+'-wide');if(wb)wb.textContent=wide?'⤡':'⤢';
}
(function(){
  const hd=panel.querySelector('header'),rz=panel.querySelector('.rz'),wb=panel.querySelector('#'+ID+'-wide');
  let d=null;
  hd.addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.button>0)return;const r=panel.getBoundingClientRect();d={x:e.clientX,y:e.clientY,l:r.left,t:r.top};try{hd.setPointerCapture(e.pointerId)}catch{}e.preventDefault()});
  hd.addEventListener('pointermove',e=>{if(!d)return;PG.pos={l:d.l+e.clientX-d.x,t:d.t+e.clientY-d.y};applyPanelGeom()});
  const up=()=>{if(!d)return;d=null;store.set('panelPos',PG.pos)};
  hd.addEventListener('pointerup',up);hd.addEventListener('pointercancel',up);
  hd.addEventListener('dblclick',e=>{if(e.target.closest('button'))return;PG.pos=null;PG.size=null;PG.wide=false;store.set('panelPos',null);store.set('panelSize',null);store.set('panelWide',false);applyPanelGeom()});
  let z=null;
  rz.addEventListener('pointerdown',e=>{const r=panel.getBoundingClientRect();z={x:e.clientX,y:e.clientY,w:r.width,h:r.height};PG.pos=PG.pos||{l:r.left,t:r.top};try{rz.setPointerCapture(e.pointerId)}catch{}e.preventDefault();e.stopPropagation()});
  rz.addEventListener('pointermove',e=>{if(!z)return;PG.size={w:z.w+e.clientX-z.x,h:z.h+e.clientY-z.y};applyPanelGeom()});
  const upz=()=>{if(!z)return;z=null;store.set('panelSize',PG.size);store.set('panelPos',PG.pos)};
  rz.addEventListener('pointerup',upz);rz.addEventListener('pointercancel',upz);
  wb.onclick=()=>{PG.wide=!(PG.wide&&innerWidth>=900);PG.size=null;store.set('panelWide',PG.wide);store.set('panelSize',null);applyPanelGeom()};
  addEventListener('resize',applyPanelGeom);
  applyPanelGeom();
})();

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
let d=null;fab.addEventListener('pointerdown',e=>{if(fab.classList.contains('docked'))return;d={x:e.clientX,y:e.clientY,l:fab.offsetLeft,t:fab.offsetTop,m:false};try{fab.setPointerCapture(e.pointerId)}catch{}});
fab.addEventListener('pointermove',e=>{if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>6)d.m=true;if(d.m){const l=Math.max(4,Math.min(innerWidth-56,d.l+dx)),t=Math.max(4,Math.min(innerHeight-56,d.t+dy));fab.style.left=l+'px';fab.style.top=t+'px';fab.style.bottom='auto';chip.style.left=Math.min(l+60,innerWidth-120)+'px';chip.style.top=t+8+'px';chip.style.bottom='auto';try{AutoFarm.running&&AutoFarm.syncFab()}catch{}}});
fab.addEventListener('pointerup',()=>{if(!d)return;const moved=d.m;d=null;if(moved){fab._moved=true;store.set('fab',[fab.offsetLeft,fab.offsetTop])}});
fab.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(fab._moved){fab._moved=false;return}ui.isOpen?ui.close():ui.open()})})();

ui.open=()=>{applyPanelGeom();ui.isOpen=true;ui._t=Date.now();panel.classList.add('open');if(!fab.classList.contains('docked'))fab.style.display='none';Alerts.markSeen();render()};
ui.close=()=>{ui.isOpen=false;panel.classList.remove('open');fab.style.display=''};
/* chặn click dư ngay sau khi vừa mở panel */
panel.addEventListener('click',e=>{if(Date.now()-(ui._t||0)<400){e.preventDefault();e.stopPropagation()}},true);
$(panel,'#'+ID+'-x').onclick=ui.close;
navEl.onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;ui.tab=b.dataset.t;store.set('tab',ui.tab);render()};
function syncNav(){const m=iconMode();if(ui._navMode!==m){ui._navMode=m;$$(navEl,'button').forEach(b=>{const t=TABS.find(x=>x[0]===b.dataset.t),i=$(b,'i');if(t&&i)i.innerHTML=tabIco(t[0],t[1])});const sl=$(panel,'header .seal');if(sl)sl.innerHTML=m==='an'?anEl('logo'.replace('logo','lookup'),20):'仙';fab.firstChild&&fab.firstChild.nodeType===3?fab.firstChild.remove():0;if(!fab.querySelector('.an'))fab.insertAdjacentHTML('afterbegin',m==='an'?anEl('lookup',28):'仙');else if(m!=='an'){fab.querySelector('.an').remove();fab.insertAdjacentHTML('afterbegin','仙')}}$$(navEl,'button').forEach(b=>{const on=b.dataset.t===ui.tab;b.classList.toggle('on',on);if(on&&ui._navTab!==ui.tab){ui._navTab=ui.tab;try{navEl.scrollTo({left:Math.max(0,b.offsetLeft-(navEl.clientWidth-b.offsetWidth)/2),behavior:'auto'})}catch{}}});const n=Alerts.count;$$(navEl,'em').forEach(x=>x.remove());if(n.realm){$(navEl,'[data-t=realm]').insertAdjacentHTML('beforeend',`<em>${n.realm}</em>`)}}

const hdrSub=()=>{const r=run(),i=info(r.viTri);const cg=C.canhGioi?.get?.(me().canhGioi)?.ten;return`Năm ${F(Math.floor(r.nam))} · ${T(i?.ten||'')}`};
function render(){
  if(!ui.isOpen)return;
  const keep=body.scrollTop;$(panel,'#'+ID+'-sub').textContent=hdrSub();
  ui._sig=null;const fn=VIEWS[ui.tab]||VIEWS.quest;fn();syncNav();body.scrollTop=keep;
}
function softRender(){if(!ui.isOpen)return;if(userScrolling()){clearTimeout(ui._srT);ui._srT=setTimeout(softRender,450);return}const a=document.activeElement;if(a&&panel.contains(a)&&/INPUT|SELECT/.test(a.tagName))return;if(ui.tab==='build'||ui.tab==='check'||ui.tab==='breakthrough')return;if(ui.tab==='auto'&&AutoFarm?.running){AutoFarm.refreshLogOnly?.();return}
  if(ui.tab==='quest'||ui.tab==='realm'||ui.tab==='map'){let sg='';try{sg=tabSig(ui.tab)}catch{}if(sg&&sg===ui._sig){const sub=$(panel,'#'+ID+'-sub');if(sub)sub.textContent=hdrSub();return}render();ui._sig=sg;return}
  render()}
function tabSig(tab){
  const q=x=>N(x)?(+x).toFixed(2):'';
  const yr=Math.floor(nowYear()*20)+'|'+run().viTri+'|'+Math.floor(Number(me().canhGioi??0))+'.'+Number(me().tieuCanhGioi??0);
  if(tab==='map')return yr+'|'+(ui._mapSig||'');
  if(tab==='quest')return yr+'|'+eventRows().map(r=>r.key+':'+(r.ok?1:0)+':'+q(r.travel)+':'+q(r.slack)).join(';');
  const bc=realmRows(),tr=treasureRows();
  return yr+'|'+bc.map(r=>r.slot+(r.ok?1:0)+(r.openNow?1:0)+q(r.travel)+q(r.opensIn)+q(r.closesIn)).join(';')+'|'+tr.active.map(r=>r.key+q(r.travel)+(r.ok?1:0)).join(';')+'|'+tr.waiting.map(r=>r.id+q(r.cd)).join(';');
}

const cardHtml=(r,opts={})=>`<article class="card ${r.ok?'':'late'} d${r.danger?.rank>=2?r.danger.rank:0}" data-slot="${E(r.slot)}" data-title="${E(r.title)}"><div class="ico nd">${sealIco(r.icon||'?',34)}</div><div><b>${E(r.title)}</b><small>${E(r.kind)} · ${E(r.place)}${r.country?' · '+E(r.country):''}</small></div><div class="side">${fmtTime(r.travel)}<small>${fmtMiles(r.miles)}</small></div><div class="tags">${r.ok?'<span class="tag g">Tới kịp</span>':`<span class="tag r">${E(r.why||'Không tới kịp')}</span>`}${r.slack!==null&&r.ok?`<span class="tag o">Còn ${fmtTime(Math.max(0,r.slack))} khi tới nơi</span>`:''}${r.danger?.rank>=1?`<span class="tag ${r.danger.rank>=2?'r':''}">${r.danger.label}</span>`:''}${r.block?`<span class="tag o">⚠ ${E(r.block)}</span>`:''}${A(r.tags).map(t=>`<span class="tag">${E(t)}</span>`).join('')}${opts.extra||''}</div>${opts.after||''}<div class="acts"><button class="btn" data-act="view">Xem bản đồ</button><button class="btn pri" data-act="go">Đường đi an toàn</button></div></article>`;

body.addEventListener('click',e=>{
  const tg=e.target.closest('[data-npctoggle]');
  if(tg){const id=tg.dataset.npctoggle;pUi.open[id]=!pUi.open[id];render();return}
  const ngo=e.target.closest('[data-npcgo]');
  if(ngo){let err='';try{err=npcLaunch(ngo.dataset.npcgo,ngo.dataset.id,ngo.dataset.arg||'')}catch(x){err=String(x?.message||x)}if(err){toast(err,'',6000);render();return}ui.close();toast('Đã mở trong game — chọn trực tiếp ở màn hình game.','ok',3500);return}
  const ech=e.target.closest('[data-encch]');
  if(ech){try{let v=null;try{v=g.encounterView?.()}catch{}const i=+ech.dataset.encch,c=v?.choices?.find(x=>x.index===i);if(c?.xacNhan&&!confirm(strip((c.xacNhan.tieu_de||'')+'\n'+(c.xacNhan.noi_dung||''))))return;g.choose(i)}catch(x){toast(String(x?.message||x))}render();return}
  if(e.target.closest('[data-encclose]')){try{g.closeEncounter()}catch(x){toast(String(x?.message||x))}render();return}
  const egf=e.target.closest('[data-encgift]');
  if(egf){try{const q=egf.parentElement.querySelector('.enc-q');g.resume({itemId:egf.dataset.encgift,qty:q?Math.max(1,+q.value||1):1})}catch(x){toast(String(x?.message||x))}render();return}
  if(e.target.closest('[data-encskip]')){try{g.resume(null)}catch(x){toast(String(x?.message||x))}render();return}
  if(e.target.closest('[data-encmin]')){ui.close();return}
  const npn=e.target.closest('[data-npcpin]');
  if(npn){try{g.toggleNpcPin(npn.dataset.npcpin)}catch(x){toast(String(x?.message||x))}render();return}
  if(e.target.closest('[data-npcend]')){try{g.endCompanion()}catch(x){toast(String(x?.message||x))}render();return}
  const na=e.target.closest('[data-npcact]');
  if(na){
    const k=na.dataset.npcact;
    if(k==='view'||k==='go'){const slot=na.dataset.slot2;if(!slot||!hasSlot(slot))return toast('Vị trí này không còn hợp lệ.');const res=showOnMap(slot,na.dataset.t2||'',k);if(!res.ok)return toast(res.msg);ui.close();toast(res.msg||(k==='go'?'Đã vẽ đường đi an toàn.':'Đang xem trên bản đồ.'),res.msg?'':'ok',3200);return}
    try{
      if(k==='hunt'){const id=na.dataset.id,blk=g.huntBlock?.(id);if(blk)return toast(blk);g.huntEnemy(id);toast('Đã truy tìm '+strip(run().npc[id]?.ten||'kẻ thù')+'.','ok');ui.close();return}
      if(k==='invite'){const id=na.dataset.npc,sel=na.parentElement.querySelector('select'),item=sel?.value;if(!item)return toast('Túi không có vật truyền âm.');g.inviteFriend(item,id);toast('Đã gửi lời mời tới '+strip(run().npc[id]?.ten||'')+'.','ok');ui.close();return}
    }catch(err){toast(String(err?.message||err))}
    return;
  }
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
    for(const r of treasureRows().active)if(r.ok||!N(r.travel))m.set(r.key,{label:`Dị bảo xuất hiện: ${r.title} (${r.place})${r.locked?' — ngoài tầm cảnh giới, nguy hiểm':''}`,tab:'realm'});
    return m;
  },
  check(){
    try{ORD.check()}catch{}
    let cur;try{cur=this.collect()}catch{return}
    this.cur=cur;
    if(!(this.notified instanceof Set))this.notified=new Set();
    for(const k of [...this.notified])if(!cur.has(k))this.notified.delete(k);
    const fresh=[...cur].filter(([k])=>!this.seen.has(k));
    if(ui.isOpen){this.markSeen();return}
    if(this.ready){
      const untoast=fresh.filter(([k])=>!this.notified.has(k));
      if(untoast.length){
        for(const [k,v] of untoast.slice(0,3)){toast(v.label);this.notified.add(k)}
        if(untoast.length>3)toast(`Và ${untoast.length-3} thông tin mới khác`);
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

/* ───────── Tab: Nhiệm vụ (trước đây là «Bản đồ») ───────── */
const mapUi={q:'',sort:'urgent',kind:'all',onlyOk:true};
VIEWS.quest=()=>{
  const all=eventRows(),kinds=[...new Set(all.map(r=>r.kind))].sort((a,b)=>a.localeCompare(b,'vi'));
  const q=norm(mapUi.q);
  let rows=all.filter(r=>(mapUi.kind==='all'||r.kind===mapUi.kind)&&(!mapUi.onlyOk||r.ok)&&(!q||norm([r.title,r.place,r.kind,r.country,A(r.tags).join(' ')].join(' ')).includes(q)));
  rows.sort(SORTS[mapUi.sort].fn);
  body.innerHTML=`<div class="bar"><input type="search" id="m-q" placeholder="Tìm sự kiện, địa danh…" value="${E(mapUi.q)}" class="grow"><select id="m-sort">${Object.entries(SORTS).map(([k,v])=>`<option value="${k}" ${k===mapUi.sort?'selected':''}>${v.name}</option>`).join('')}</select></div>
  <div class="chips">${['all',...kinds].map(k=>`<button class="chip ${mapUi.kind===k?'on':''}" data-kind="${E(k)}">${k==='all'?'Tất cả':E(k)}</button>`).join('')}<button class="chip ${mapUi.onlyOk?'on':''}" id="m-ok">Chỉ nơi tới kịp</button></div>
  <div class="sum">Trên bản đồ: ${rows.length}/${all.length} mục · ${E(SORTS[mapUi.sort].name.toLowerCase())}</div>
  ${rows.map(r=>cardHtml(r)).join('')||'<div class="empty">Không có mục phù hợp.<br>Thử bỏ bớt bộ lọc.</div>'}`;
  $(body,'#m-q').oninput=e=>{mapUi.q=e.target.value;clearTimeout(mapUi.t);mapUi.t=setTimeout(()=>{VIEWS.quest();$(body,'#m-q').focus();const i=$(body,'#m-q');i.setSelectionRange(i.value.length,i.value.length)},220)};
  $(body,'#m-sort').onchange=e=>{mapUi.sort=e.target.value;render()};
  $$(body,'[data-kind]').forEach(b=>b.onclick=()=>{mapUi.kind=b.dataset.kind;render()});
  $(body,'#m-ok').onclick=()=>{mapUi.onlyOk=!mapUi.onlyOk;render()};
};

/* ───────── Tab: Bản đồ (tra cứu mọi nơi trên bản đồ) ───────── */
/* Dữ liệu lấy thẳng từ world của game: slot → info(slot) (loại địa danh, quốc gia, cấp nền, địa hình, tộc yêu);
   điểm săn yêu dùng hàm game huntTargets/huntCount (world/hunt) chạy trên bản sao ngữ cảnh đặt vị trí ở ô cần xem. */
const MAP_LOAI={kinh_do:'Kinh đô',thanh:'Thành',tran:'Trấn',thon:'Thôn',tong_mon:'Tông môn',nui:'Núi',rung:'Rừng',coc:'Cốc',dong:'Đồng hoang',dam:'Đầm',thac:'Thác',hoang_mac:'Hoang mạc',dinh:'Đỉnh',di_tich:'Di tích',bi_canh:'Bí cảnh',sao_huyet:'Sào huyệt yêu thú',linh_mach:'Linh mạch',khoang_mach:'Khoáng mạch',phuong_thi:'Phường thị',an_si:'Ẩn sĩ',quan_ai:'Quan ải'};
/* Biểu tượng địa danh đúng như Chú giải của game: ấn /img/node/<tên>.webp tô màu theo ký hiệu, nền giấy + viền */
const NODE_SEAL={村:'thon',鎮:'tran',城:'thanh',京:'kinh_do',宗:'tong',門:'bi_canh',巢:'sao_huyet',靈:'linh_dia',墟:'phe_tich',碑:'di_tich',府:'dong_phu',野:'hoang_da','?':'su_kien',劍:'chien_dau',坐:'tu_luyen',市:'cua_hang',雷:'dot_pha',泉:'linh_mach',秘:'mat_bi',賞:'viec',脈:'noi_linh_mach',礦:'khoang_mach',關:'quan_ai',坊:'phuong_thi',庵:'an_si',原:'wild_plain_grass',林:'wild_forest_pines',嶺:'wild_mountain_ridge',沼:'wild_marsh_reeds',漠:'wild_desert_dunes',淵:'vo_nhai_uyen'};
const NODE_COL={村:'#7a5a2e',鎮:'#d07a1e',城:'#b5352a',京:'#a87c0a',宗:'#1f5a6e',門:'#5b3d7a',碑:'#7a6a4a',巢:'#8a3a1f',靈:'#3d6b45',墟:'#6b6358',府:'#a31d1d',脈:'#2a8077',礦:'#6e4b2a',關:'#4b5563',坊:'#8a6a1e',庵:'#5f6f52',野:'#4f5f1c',原:'#66721f',林:'#2e5b2a',嶺:'#5a5f6b',沼:'#466c78',漠:'#b39257','?':'#4a4a4a',劍:'#b23a2a',坐:'#2f6a8c',市:'#b08a2e',雷:'#6a3d9a',泉:'#2a8077',秘:'#1e1e1e',賞:'#9a5a12'};
const WILD_ICON={hoang_nguyen:'原',rung_ram:'林',son_mach:'嶺',ho_nuoc:'沼',hoang_mac:'漠'};
let sealOk=null;
(()=>{try{const im=new Image();im.onload=()=>{sealOk=true};im.onerror=()=>{sealOk=false};im.src='/img/node/thon.webp'}catch{sealOk=false}})();
const nodeGlyph=id=>{try{const d=placeDef(id);if(!d)return'';if(d.id==='noi.hoang_da'){const dh=A(info(id)?.diaHinh).find(k=>WILD_ICON[k]);return WILD_ICON[dh]||'原'}return d.icon||''}catch{return''}};
const sealIco=(glyph,sz=34)=>{const n=NODE_SEAL[glyph];if(!n||iconMode()==='han')return`<span class="seal fb" style="--s:${sz}px">${E(glyph||'地')}</span>`;return`<span class="seal" style="--s:${sz}px;--m:url(/img/node/${n}.webp);--c:${NODE_COL[glyph]||'#4a4a4a'}"></span>`};
/* Bộ biểu tượng theo cài đặt của game (ấn khắc "an" hay chữ Hán "han"): đọc từ thanh công cụ game đang hiển thị */
const iconMode=()=>{if(sealOk===false)return'han';const h=document.querySelector('.hud-cong-cu');return!h||h.querySelector('.icon.an')?'an':'han'};
const UI_AN={quest:'su_kien',map:'ban_do',realm:'bi_canh',auto:'chien_dau',bounty:'viec',people:'nhan_mach',sect:'tong',breakthrough:'dot_pha',build:'noi_linh_mach',items:'cua_hang',check:'lookup',logo:'lookup'};
const anEl=(name,sz)=>`<span class="an" style="--an:url(/img/node/${name}.webp);--s:${sz}px"></span>`;
const tabIco=(k,glyph)=>iconMode()==='an'&&UI_AN[k]?anEl(UI_AN[k],22):E(glyph);
/* Ảnh nhóm hành động của game (/img/icon/<tên>.webp) — ảnh nhỏ màu, ẩn đi nếu không tải được */
const grpIco=(name,sz=20)=>`<img class="gimg" src="/img/icon/${name}.webp" alt="" width="${sz}" height="${sz}" onerror="this.remove()">`;
const rankSeal=muc=>muc==='boss'?'<img class="gimg rk" src="/img/ui/an-boss.webp" alt="" onerror="this.remove()" title="Đầu lĩnh">':muc==='tinh_anh'?'<img class="gimg rk" src="/img/ui/an-tinh-anh.webp" alt="" onerror="this.remove()" title="Tinh anh">':'';
const sealRaw=(name,col,sz=34,glyph='宗')=>iconMode()==='han'?`<span class="seal fb" style="--s:${sz}px">${E(glyph)}</span>`:`<span class="seal" style="--s:${sz}px;--m:url(/img/node/${name}.webp);--c:${col}"></span>`;
const SECT_SEAL={dai_tong_mon:'sect_great_hall',tong_mon:'tong',mon_phai:'sect_minor'},SECT_COL={chinh:'#1f5a6e',ma:'#8e1b2e',ta:'#6b2a9a'};
const sectSeal=(x,sz)=>sealRaw(SECT_SEAL[x.tang]||'tong',SECT_COL[x.cm]||SECT_COL.chinh,sz);
const placeIco=(id,loai,sz)=>sealIco(nodeGlyph(id)||MAP_GLYPH[loai]||'野',sz);
const MAP_GLYPH={kinh_do:'京',thanh:'城',tran:'鎮',thon:'村',tong_mon:'宗',nui:'嶺',rung:'林',coc:'野',dong:'原',dam:'沼',thac:'野',hoang_mac:'漠',dinh:'嶺',di_tich:'碑',bi_canh:'門',sao_huyet:'巢',linh_mach:'脈',khoang_mach:'礦',phuong_thi:'坊',an_si:'庵',quan_ai:'關'};
const MAP_ICON={kinh_do:'都',thanh:'城',tran:'鎮',thon:'村',tong_mon:'宗',nui:'山',rung:'林',coc:'谷',dong:'原',dam:'澤',thac:'瀑',hoang_mac:'漠',dinh:'峰',di_tich:'跡',bi_canh:'秘',sao_huyet:'巢',linh_mach:'脈',khoang_mach:'礦',phuong_thi:'市',an_si:'隱',quan_ai:'關'};
const MAP_WILD=['rung','nui','coc','dong','dam','hoang_mac','dinh'];
const MAP_SUBS=[
  ['thanh_thi','Thành thị',['kinh_do','thanh'],'Kinh đô và thành lớn: cửa hàng, đấu giá, nhiệm vụ, quán trọ.'],
  ['thon_tran','Thôn trấn',['tran','thon'],'Trấn và thôn: chợ nhỏ, nhận việc, phàm nhân.'],
  ['di_tich','Bí cảnh · Di tích',['bi_canh','di_tich'],'Nơi thăm dò; thời gian mở cửa xem tab Bí cảnh & Dị bảo.'],
  ['mach','Linh mạch · Khoáng mạch',['linh_mach','khoang_mach'],'Linh khí dày để tu luyện; khoáng mạch để đào.'],
  ['khac','Phường thị · Ẩn sĩ · Quan ải',['phuong_thi','an_si','quan_ai'],'Các nơi đặc biệt khác.'],
  ['sao_huyet','Sào huyệt yêu thú',['sao_huyet'],'Hang ổ yêu thú, thường rất nguy hiểm.'],
  ['tim','Tìm vật phẩm',Object.keys(MAP_LOAI).filter(k=>k!=='tong_mon'),'Tra khắp bản đồ: gõ tên vật (nguyên liệu, linh dược, trứng thú, bí phương, yêu tài…) hoặc chọn loại vật; hiện nơi săn được, nơi bán, nơi có cơ duyên.'],
  ['farm','Điểm farm săn yêu',MAP_WILD,'Hoang dã săn được yêu: gõ tên nguyên liệu hoặc thảo dược để tìm vùng có nó; danh sách và tỉ lệ do game tính tại từng ô.']
];
const MAP_MODES=[['dd','Địa danh'],['tim','Tìm vật'],['farm','Săn yêu']];
const MAP_CATS=MAP_SUBS.filter(x=>x[0]!=='tim'&&x[0]!=='farm');
const mapMode=()=>mapSt.sub==='tim'?'tim':mapSt.sub==='farm'?'farm':'dd';
const KIND_GROUPS=[['Nguyên liệu',['yeu_tai','linh_duoc','nguyen_lieu','trung_thu']],['Công thức · pháp',['don_phuong','cong_phap','phu_luc','tran_ban','tran_van']],['Đồ dùng',['dan_duoc','phap_khi','dung_cu','phuong_tien','tru_vat','di_hoa','dac_san']]];
const mapSt={sub:store.get('mapSub','thanh_thi'),q:'',qg:'all',sort:'near',lv:'all',loai:'all',kind:'all',safe:false,left:false,clan:false,n:40,t:0,filtOpen:store.get('mapFilt',innerWidth>700)};
const MapDB={key:'',list:[],byId:new Map(),hunt:new Map(),huntKey:''};
/* ───────── Ảnh của game (tuTien.assets): icon vật, yêu thú, mặt NPC — tải lười, có chữ dự phòng khi không có ảnh ───────── */
const IMGC=new Map();
function gameImgUrl(kind,id,a,b,c){
  const k=kind+'|'+id+'|'+(a??'')+'|'+(b??'')+'|'+(c??'');let u=IMGC.get(k);if(u!==undefined)return u;
  try{const AS=window.tuTien?.assets;u=kind==='face'?AS?.npcFace?.(id,a,b,c):AS?.get?.(kind,id)}catch{}
  u=typeof u==='string'?u:'';if(IMGC.size>6000)IMGC.clear();IMGC.set(k,u);return u;
}
const gi=(kind,id,fb,sz,a,b,c)=>{const u=gameImgUrl(kind,id,a,b,c);return`<span class="gi k-${kind}${u?'':' fb'}" style="--s:${sz||34}px" data-fb="${E(fb||'')}">${u?`<img src="${E(u)}" loading="lazy" decoding="async" alt="">`:E(fb||'')}</span>`};
const ITEM_GLYPH={dan_duoc:'丹',linh_duoc:'藥',nguyen_lieu:'材',yeu_tai:'妖',trung_thu:'卵',don_phuong:'方',cong_phap:'法',phap_khi:'器',phu_luc:'符',tran_ban:'陣',tran_van:'紋',di_hoa:'異',dac_san:'產',dung_cu:'具',phuong_tien:'騎',tru_vat:'囊'};
const itemIco=(id,sz)=>gi('item',id,ITEM_GLYPH[C.items.get(id)?.loai]||'物',sz);
const enemyIco=(id,sz)=>gi('enemy',id,'妖',sz);
function npcIco(id,sz){
  const n=run().npc?.[id];if(!n)return gi('x','','人',sz);
  const age=Math.max(1,Math.floor((nowYear())-(Number(n.namSinh)||nowYear()-25)));
  return gi('face',id,n.gioiTinh==='nu'?'女':'男',sz,n.gioiTinh==='nu'?'nu':'nam',age,n.danhPhan);
}
const coreFn=n=>{try{const c=window.tuTien?.core;if(!c)return null;if(typeof c.index?.[n]==='function')return c.index[n];for(const m of Object.values(c))if(m&&typeof m[n]==='function')return m[n]}catch{}return null};
const KIND_VI={dan_duoc:'Đan dược',phu_luc:'Phù lục',cong_phap:'Công pháp',phap_khi:'Pháp khí',linh_duoc:'Linh dược',nguyen_lieu:'Nguyên liệu',yeu_tai:'Yêu tài',don_phuong:'Bí phương',tru_vat:'Trữ vật',dung_cu:'Dụng cụ',phuong_tien:'Phương tiện',di_hoa:'Dị hỏa',dac_san:'Hàng buôn',tran_van:'Trận văn',trung_thu:'Trứng thú',tran_ban:'Trận bàn'};
const KIND_FILT=['yeu_tai','linh_duoc','nguyen_lieu','trung_thu','don_phuong','dan_duoc','cong_phap','phap_khi','phu_luc','tran_ban','tran_van','di_hoa','dac_san','dung_cu','phuong_tien','tru_vat'];
const PHAM_V=['Phàm','Hoàng','Huyền','Địa','Thiên','Tiên','Thần'];
const gradeTxt=(a,b)=>{const x=PHAM_V[Math.max(1,a)-1]||'?',y=PHAM_V[Math.max(1,b)-1]||'?';return a===b?x+' phẩm':x+'–'+y+' phẩm'};
/* Hàng hóa & cơ duyên tại từng ô — gọi hàm placeInfo của game (danh mục theo loại vật + phẩm cấp, các duyên có thể gặp) */
function mapPlace(id){
  const D=mapBase(),nv=me(),key=run().seed+'|'+nv.canhGioi+'|'+nv.tieuCanhGioi;
  if(D.plKey!==key){D.pl=new Map();D.plKey=key;D.idx=new Map();D.idxKey='';D.idxPos=0}
  if(D.pl.has(id))return D.pl.get(id);
  let out={goods:[],occ:[]};
  try{const PI=coreFn('placeInfo'),e=g.readCtx?.();if(PI&&e){const r=PI({...e,run:{...e.run,viTri:id}});out={goods:A(r.goods).map(x=>({kind:x.kind,a:x.minGrade,b:x.maxGrade,some:!!x.sometimes})),occ:A(r.occasions).map(o=>({id:o.id,ten:T(o.ten),goods:A(o.goods).map(x=>({kind:x.kind,a:x.minGrade,b:x.maxGrade,some:!!x.sometimes}))}))}}}catch{}
  D.pl.set(id,out);return out;
}
/* Chỉ mục tìm kiếm: lập dần ở nền để gõ tìm không bị đơ */
function mapIdxOne(x,D){
  if(D.idx.has(x.id))return D.idx.get(x.id);
  const kinds=new Set(),hay=[x.ten,x.qgTen,MAP_LOAI[x.loai]];
  const pl=mapPlace(x.id);
  for(const gd of pl.goods){kinds.add(gd.kind);hay.push(KIND_VI[gd.kind]||'')}
  for(const o of pl.occ){hay.push(o.ten);for(const gd of o.goods){kinds.add(gd.kind);hay.push(KIND_VI[gd.kind]||'')}}
  if(MAP_WILD.includes(x.loai)||x.loai==='sao_huyet'){
    const h=mapHunt(x.id);
    if(h){for(const t of h.tg){hay.push(t.ten);for(const d of t.drops){hay.push(d.ten);const k=C.items.get(d.id)?.loai;if(k)kinds.add(k)}}for(const z of h.herbs){hay.push(z.ten);kinds.add('linh_duoc')}}
  }
  const r={hay:norm(hay.join(' ')),kinds};D.idx.set(x.id,r);return r;
}
function mapPrefetch(first){
  const D=mapBase();if(D.list[0])mapPlace(D.list[0].id);
  if(D.idxDone===D.plKey)return;
  const pri=new Set(first||[]);
  D.q=D.list.filter(x=>!D.idx.has(x.id)).sort((a,b)=>(pri.has(b.loai)?1:0)-(pri.has(a.loai)?1:0));
  D.qi=0;
  if(D.idxRun)return;D.idxRun=true;let last=0;
  const step=()=>{
    try{
      const t0=performance.now();
      while(D.qi<D.q.length&&performance.now()-t0<12)mapIdxOne(D.q[D.qi++],D);
    }catch{D.qi=D.q.length}
    const busy=D.qi<D.q.length;
    if(!busy||(performance.now()-last>1800)){
      last=performance.now();
      if(ui.isOpen&&ui.tab==='map'&&(mapSt.q||mapSt.kind!=='all')){try{const ae=document.activeElement,typing=ae&&ae.id==='mp-q';if(userScrolling()&&!typing){clearTimeout(ui._mpT);ui._mpT=setTimeout(()=>{if(ui.isOpen&&ui.tab==='map')VIEWS.map()},600)}else{VIEWS.map();if(typing){const i=$(body,'#mp-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)}}}catch{}}
    }
    if(busy){setTimeout(step,0);return}
    D.idxRun=false;D.idxDone=D.plKey;
  };
  setTimeout(step,30);
}
function mapBase(){
  const r=run(),key=r.seed+'|'+A(W.slots).length;
  if(MapDB.key===key)return MapDB;
  const list=[];
  for(const sl of A(W.slots)){
    if(!sl||sl.an)continue;
    const i=info(sl.id);if(!i)continue;
    const loai=String(i.diaDanh?.loai||'');if(!MAP_LOAI[loai])continue;
    list.push({id:sl.id,x:sl.x,y:sl.y,loai,ten:T(i.ten||i.diaDanh?.ten||sl.id),cap:Number(i.capNen),qg:i.quocGia||'',qgTen:countryOf(i),dh:A(i.diaHinh),toc:i.tocYeu||''});
  }
  MapDB.key=key;MapDB.list=list;MapDB.byId=new Map(list.map(x=>[x.id,x]));MapDB.hunt=new Map();MapDB.huntKey='';MapDB.plKey='';MapDB.pl=new Map();MapDB.idx=new Map();MapDB.idxPos=0;MapDB.idxDone='';MapDB.idxRun=false;
  return MapDB;
}
/* Yêu thú ở từng ô hoang dã — gọi đúng hàm huntTargets của game với vị trí giả lập tại ô đó */
function mapHunt(id){
  const D=mapBase(),nv=me(),key=run().seed+'|'+nv.canhGioi+'|'+nv.tieuCanhGioi;
  if(D.huntKey!==key){D.hunt=new Map();D.huntKey=key}
  if(D.hunt.has(id))return D.hunt.get(id);
  let out=null;
  try{
    const HT=coreFn('huntTargets'),HC=coreFn('huntCount'),e=g.readCtx?.();
    if(HT&&e){
      const e2={...e,run:{...e.run,viTri:id}};
      const HD=coreFn('huntDrops'),HB=coreFn('herbsAt');
      const tg=A(HT(e2)).map(x=>{const en=C.enemies.get(x.id);let dl=[];try{dl=HD?A(HD(e2,x.id)).map(d=>({id:d.id,ten:T(d.ten),p:Number(d.chance)||0})):A(x.drops).map(t=>({id:'',ten:T(t),p:0}))}catch{}return{id:x.id,ten:T(x.ten),chance:x.chance,months:x.months,local:!!x.local,cg:Number(en?.canh_gioi??0),tcg:Number(en?.tieu_canh_gioi??0),muc:en?.muc||'',drops:dl}});
      let herbs=[];try{herbs=HB?A(HB(e2,id)).map(h=>({id:h.id,ten:T(h.ten),cg:Number(h.canh_gioi)||0})):[]}catch{}
      let used=0;try{used=HC?Number(HC(e2,id))||0:0}catch{}
      out={tg,herbs,left:Math.max(0,Math.floor(3-used+1e-9))};
    }
  }catch{}
  D.hunt.set(id,out);return out;
}
const capIdx=c=>Math.max(0,Math.min(5,Math.floor((Number(c)||0)+1e-9)));
const capLabel=c=>{const k=capIdx(c);return cgTen(k)+(Number.isFinite(c)?` (${F(Math.round(c*10)/10)})`:'')};
function placeCard(it,extra=''){
  const rc=reach(it.id),dg=danger(it.id),here=run().viTri===it.id;
  const tags=[];
  if(here)tags.push('<span class="tag g">Đang ở đây</span>');
  else if(explored(it.id))tags.push('<span class="tag">Đã khám phá</span>');
  if(dg.rank>=1)tags.push(`<span class="tag ${dg.rank>=2?'r':''}">${E(dg.label)}</span>`);else tags.push('<span class="tag g">An toàn</span>');
  if(rc.block)tags.push(`<span class="tag o">⚠ ${E(rc.block)}</span>`);
  const tz=it.toc?T(C.tocYeu?.get?.('toc.'+it.toc)?.ten||''):'';
  if(tz&&it.loai==='sao_huyet')tags.push(`<span class="tag">Tộc ${E(tz)}</span>`);
  return`<article class="card d${dg.rank>=2?dg.rank:0}" data-slot="${E(it.id)}" data-title="${E(it.ten)}"><div class="ico nd">${placeIco(it.id,it.loai,34)}</div><div><b>${E(it.ten)}</b><small style="display:block">${E(MAP_LOAI[it.loai])}${it.qgTen?' · '+E(it.qgTen):''} · cấp nền ${E(capLabel(it.cap))}</small></div><div class="side">${here?'—':fmtTime(rc.travel)}<small>${here?'':fmtMiles(rc.miles)}</small></div><div class="tags">${tags.join('')}</div>${extra}<div class="acts"><button class="btn" data-act="view">Xem bản đồ</button><button class="btn pri" data-act="go">Đường đi an toàn</button></div></article>`;
}
function farmExtra(it,qn){
  const h=mapHunt(it.id);if(!h)return'';
  const tg=[...h.tg].sort((a,b)=>b.chance-a.chance||a.cg-b.cg);
  const lo=tg.length?Math.min(...tg.map(x=>x.cg)):0,hi=tg.length?Math.max(...tg.map(x=>x.cg)):0;
  const pc=p=>p>=0.995?'chắc chắn':Math.max(1,Math.round(p*100))+'%';
  let hit='';
  if(qn){
    const m=matInfo(h,qn);
    hit=m.lines.slice(0,4).map(l=>`<div class="tag g" style="display:block;margin:3px 0;white-space:normal;line-height:1.4">${anEl('lookup',13)} ${E(l)}</div>`).join('');
  }
  const rows=tg.map(x=>`<div style="margin:3px 0;display:flex;gap:8px;align-items:flex-start">${enemyIco(x.id,30)}<div style="min-width:0">${rankSeal(x.muc)}<b>${E(x.ten)}</b> <span class="sub">— ${E(cgTen(x.cg))}${x.muc==='boss'?' · thủ lĩnh':''} · gặp ${Math.round(x.chance*100)}%${x.local?' · tộc bản địa':''}</span>${x.drops.length?`<div class="sub" style="padding-left:10px">Rơi: ${E(x.drops.slice(0,6).map(d=>d.ten+(d.p?' '+pc(d.p):'')).join(', '))}</div>`:''}</div></div>`).join('');
  const hb=h.herbs.length?`<div style="margin:4px 0"><b>Thảo dược có thể hái</b> <span class="sub">— ${E(h.herbs.map(x=>x.ten).join(', '))}</span></div>`:'';
  return`<div class="sub" style="grid-column:1/-1;margin:4px 0 2px;line-height:1.5">Lượt săn còn: <b>${h.left}/3</b> · ${tg.length} loài yêu (${E(cgTen(lo))}${hi!==lo?' – '+E(cgTen(hi)):''}) · linh khí ${E(F(Math.round(spiritAt(it.id)*10)/10))}${hit}<details style="margin-top:4px"${qn&&hit?' open':''}><summary style="cursor:pointer;color:var(--cyan)">Xem yêu thú, vật rơi, thảo dược</summary>${rows}${hb}</details></div>`;
}
/* Khớp nguyên liệu: tìm trong vật rơi của yêu thú (tỉ lệ gặp × tỉ lệ rơi) và thảo dược hái được */
function matInfo(h,qn){
  const lines=[];let best=0;
  for(const t of h.tg)for(const d of t.drops)if(norm(d.ten).includes(qn)){const p=t.chance*(d.p||0.05);best=Math.max(best,p);lines.push({p,txt:`${d.ten}: rơi từ ${t.ten} (gặp ${Math.round(t.chance*100)}%${d.p?`, rơi ${d.p>=0.995?'chắc chắn':Math.round(d.p*100)+'%'}`:''})`})}
  for(const hb of h.herbs)if(norm(hb.ten).includes(qn)){best=Math.max(best,0.05);lines.push({p:0.05,txt:`${hb.ten}: thảo dược hái được tại vùng này`})}
  lines.sort((a,b)=>b.p-a.p);
  return{best,lines:lines.map(x=>x.txt)};
}
const matScoreC=new Map();
function matScore(x,qn){
  const k=x.id+'|'+qn,c=matScoreC.get(k);if(c!==undefined)return c;
  let b=0;const h=MAP_WILD.includes(x.loai)||x.loai==='sao_huyet'?mapHunt(x.id):null;
  if(h)b=matInfo(h,qn).best;
  const pl=mapPlace(x.id);
  for(const gd of pl.goods)if(norm(KIND_VI[gd.kind]||'').includes(qn))b=Math.max(b,0.04);
  if(matScoreC.size>6000)matScoreC.clear();matScoreC.set(k,b);return b;
}
function goodsExtra(it,qn){
  const pl=mapPlace(it.id);if(!pl.goods.length&&!pl.occ.length)return'';
  const chip=gd=>`<span class="tag ${qn&&norm(KIND_VI[gd.kind]||'').includes(qn)?'g':''}">${E(KIND_VI[gd.kind]||gd.kind)} · ${E(gradeTxt(gd.a,gd.b))}${gd.some?' · đôi khi':''}</span>`;
  const hit=[];
  if(qn){for(const gd of pl.goods)if(norm(KIND_VI[gd.kind]||'').includes(qn))hit.push(`${KIND_VI[gd.kind]}: có ở nơi này (${gradeTxt(gd.a,gd.b)}${gd.some?', đôi khi':''})`);for(const o of pl.occ){const m=o.goods.filter(gd=>norm(KIND_VI[gd.kind]||'').includes(qn));if(norm(o.ten).includes(qn)||m.length)hit.push(`Duyên “${o.ten}”${m.length?': '+m.map(gd=>KIND_VI[gd.kind]+' '+gradeTxt(gd.a,gd.b)).join(', '):''}`)}}
  const hl=hit.slice(0,4).map(l=>`<div class="tag g" style="display:block;margin:3px 0;white-space:normal;line-height:1.4">${anEl('lookup',13)} ${E(l)}</div>`).join('');
  const goods=pl.goods.length?`<div style="margin:4px 0"><b>Có thể kiếm / mua</b><div class="chips" style="flex-wrap:wrap;overflow:visible;margin-top:3px">${pl.goods.map(chip).join('')}</div></div>`:'';
  const occ=pl.occ.length?`<div style="margin:4px 0"><b>Duyên có thể gặp</b>${pl.occ.map(o=>`<div class="sub" style="margin:2px 0"><b>${E(o.ten)}</b>${o.goods.length?' — '+E(o.goods.map(gd=>(KIND_VI[gd.kind]||gd.kind)+' '+gradeTxt(gd.a,gd.b)).join(', ')):''}</div>`).join('')}</div>`:'';
  return`<div class="sub" style="grid-column:1/-1;margin:2px 0;line-height:1.5">${hl}<details${hit.length?' open':''}><summary style="cursor:pointer;color:var(--cyan)">Hàng hóa &amp; cơ duyên (${pl.goods.length+pl.occ.length})</summary>${goods}${occ}<div class="sub">Theo cảnh giới hiện tại; hàng trên kệ đổi theo năm.</div></details></div>`;
}
function spiritAt(id){try{const f=coreFn('spiritQi'),e=g.readCtx?.();return f&&e?Number(f({...e,run:{...e.run,viTri:id}},id))||0:0}catch{return 0}}
VIEWS.map=()=>{
  const D=mapBase(),sub=MAP_SUBS.find(x=>x[0]===mapSt.sub)||MAP_SUBS[0],loais=sub[2],isFarm=sub[0]==='farm';
  const cur=D.byId.get(run().viTri)||(()=>{const s=hasSlot(run().viTri)?W.slot(run().viTri):null;return s?{x:s.x,y:s.y}:{x:0,y:0}})();
  const q=norm(mapSt.q);
  let base=D.list.filter(x=>loais.includes(x.loai));
  const qgs=[...new Map(base.filter(x=>x.qg).map(x=>[x.qg,x.qgTen||x.qg])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'vi'));
  let rows=base.filter(x=>(mapSt.qg==='all'||x.qg===mapSt.qg)&&(mapSt.loai==='all'||x.loai===mapSt.loai)&&(mapSt.lv==='all'||capIdx(x.cap)===+mapSt.lv));
  if(mapSt.safe)rows=rows.filter(x=>danger(x.id).rank<=1);
  mapPrefetch(loais);
  const needIdx=!!q||mapSt.kind!=='all';
  const idxPct=D.list.length?Math.round(100*D.idx.size/D.list.length):100,idxBusy=D.idxDone!==D.plKey;
  if(isFarm&&(mapSt.left||mapSt.clan))rows=rows.filter(x=>{const h=mapHunt(x.id);return h&&(!mapSt.left||h.left>0)&&(!mapSt.clan||h.tg.some(t=>t.local))});
  if(needIdx)rows=rows.filter(x=>{const ix=D.idx.get(x.id);if(!ix)return false;return(mapSt.kind==='all'||ix.kinds.has(mapSt.kind))&&(!q||ix.hay.includes(q))});
  const dist=x=>Math.hypot(x.x-cur.x,x.y-cur.y);
  const SORT={near:['Gần nhất',(a,b)=>dist(a)-dist(b)],capup:['Cấp nền thấp → cao',(a,b)=>(a.cap-b.cap)||dist(a)-dist(b)],capdn:['Cấp nền cao → thấp',(a,b)=>(b.cap-a.cap)||dist(a)-dist(b)],name:['Tên A → Z',(a,b)=>a.ten.localeCompare(b.ten,'vi')]};
  if((isFarm||mapSt.sub==='tim')&&q)SORT.khop=['Khớp vật phẩm nhất',(a,b)=>(matScore(b,q)-matScore(a,q))||dist(a)-dist(b)];
  if(isFarm)SORT.many=['Nhiều loài yêu nhất',(a,b)=>((mapHunt(b.id)?.tg.length||0)-(mapHunt(a.id)?.tg.length||0))||dist(a)-dist(b)];
  if(mapSt.sort==='khop'&&!SORT.khop)mapSt.sort='near';
  if((isFarm||mapSt.sub==='tim')&&q&&mapSt.sortAuto!==q){mapSt.sortAuto=q;if(rows.length)mapSt.sort='khop'}
  if(!q)mapSt.sortAuto='';
  if(!SORT[mapSt.sort])mapSt.sort='near';
  rows.sort(SORT[mapSt.sort][1]);
  const shown=rows.slice(0,mapSt.n);
  const mode=mapMode(),cats=MAP_CATS;
  const lvName=v=>v==='all'?'':cgTen(+v);
  const qgName=mapSt.qg==='all'?'':(qgs.find(x=>x[0]===mapSt.qg)?.[1]||mapSt.qg);
  /* chip lọc đang bật — bấm × để gỡ từng cái */
  const act=[];
  if(mapSt.kind!=='all')act.push(['kind','Loại: '+(KIND_VI[mapSt.kind]||mapSt.kind)]);
  if(mapSt.qg!=='all')act.push(['qg','Nước: '+qgName]);
  if(mapSt.loai!=='all')act.push(['loai','Loại nơi: '+(MAP_LOAI[mapSt.loai]||mapSt.loai)]);
  if(mapSt.lv!=='all')act.push(['lv','Cấp nền: '+lvName(mapSt.lv)]);
  if(mapSt.safe)act.push(['safe','Vừa sức']);
  if(isFarm&&mapSt.left)act.push(['left','Còn lượt săn']);
  if(isFarm&&mapSt.clan)act.push(['clan','Tộc yêu bản địa']);
  const nAct=act.length-(mapSt.kind!=='all'&&mode==='tim'?1:0); /* chip "Loại vật" của chế độ Tìm vật nằm sẵn ở hàng trên, không tính vào số bộ lọc ẩn */
  const modeBar=`<div class="seg" id="mp-modes">${MAP_MODES.map(([k,n])=>`<button class="${k===mode?'on':''}" data-mmode="${k}">${E(n)}</button>`).join('')}</div>`;
  const catBar=mode==='dd'?`<div class="hrow" id="mp-cats">${cats.map(x=>`<button class="chip ${x[0]===mapSt.sub?'on':''}" data-msub="${x[0]}">${E(x[1])}<span class="sub"> ${D.list.filter(y=>x[2].includes(y.loai)).length}</span></button>`).join('')}</div>`:'';
  const kindBar=mode==='tim'?`<div class="hrow" id="mp-kinds"><button class="chip ${mapSt.kind==='all'?'on':''}" data-mkind="all">Tất cả</button>${KIND_GROUPS.map(([gn,ks])=>`<span class="gl">${E(gn)}</span>${ks.map(k=>`<button class="chip ${mapSt.kind===k?'on':''}" data-mkind="${k}">${E(KIND_VI[k])}</button>`).join('')}`).join('')}</div>`:'';
  const ph=mode==='dd'?'Tìm địa danh…':mode==='tim'?'Tìm vật: tên hoặc loại (yêu tài, linh dược, trứng thú, bí phương…)':'Tìm nguyên liệu, thảo dược, yêu thú muốn săn…';
  const toolbar=`<div class="bar mp-tool"><input type="search" id="mp-q" placeholder="${E(ph)}" value="${E(mapSt.q)}" class="grow"><select id="mp-sort" title="Sắp xếp">${Object.entries(SORT).map(([k,v])=>`<option value="${k}" ${k===mapSt.sort?'selected':''}>${E(v[0])}</option>`).join('')}</select><button class="chip ${mapSt.filtOpen?'on':''}" id="mp-ftog">Lọc${nAct?` <b>${nAct}</b>`:''}</button></div>`;
  const actBar=act.length?`<div class="hrow mp-act">${act.map(([k,t])=>`<button class="chip on x" data-mclear="${k}">${E(t)} ✕</button>`).join('')}<button class="chip" data-mclear="all">Xóa lọc</button></div>`:'';
  const loaiSel=loais.length>1?`<label>Loại nơi<select id="mp-loai"><option value="all">Mọi loại</option>${loais.map(l=>`<option value="${l}" ${mapSt.loai===l?'selected':''}>${E(MAP_LOAI[l])}</option>`).join('')}</select></label>`:'';
  const panelF=mapSt.filtOpen?`<div class="fpanel">
    <div class="fsec"><div class="ft">Vị trí</div><div class="frow"><label>Quốc gia<select id="mp-qg"><option value="all">Mọi quốc gia</option>${qgs.map(([k,n])=>`<option value="${E(k)}" ${mapSt.qg===k?'selected':''}>${E(n)}</option>`).join('')}</select></label>${loaiSel}</div></div>
    <div class="fsec"><div class="ft">Độ khó của vùng <span class="sub">(cấp nền = cảnh giới của vùng)</span></div><div class="hrow wrap">${[['all','Mọi cấp'],...[0,1,2,3,4,5].map(k=>[String(k),cgTen(k)])].map(([k,n])=>`<button class="chip ${String(mapSt.lv)===k?'on':''}" data-mlv="${k}">${E(n)}</button>`).join('')}<button class="chip ${mapSt.safe?'on':''}" id="mp-safe" title="Không cao hơn bạn quá nửa cảnh giới">Chỉ nơi vừa sức</button></div></div>
    ${isFarm?`<div class="fsec"><div class="ft">Săn yêu</div><div class="hrow wrap"><button class="chip ${mapSt.left?'on':''}" id="mp-left">Còn lượt săn</button><button class="chip ${mapSt.clan?'on':''}" id="mp-clan">Có tộc yêu bản địa</button></div></div>`:''}
  </div>`:'';
  ui._mapSig=[mapSt.sub,mapSt.q,mapSt.qg,mapSt.sort,mapSt.lv,mapSt.loai,mapSt.kind,idxBusy,mapSt.safe,mapSt.left,mapSt.clan,mapSt.n,mapSt.filtOpen,rows.length,shown.map(x=>x.id).join(',')].join('|');
  body.innerHTML=`${modeBar}${catBar}${kindBar}${toolbar}${actBar}${panelF}
  ${mode==='dd'?`<div class="sub" style="margin:2px 2px 4px">${E(sub[3])}</div>`:''}
  <div class="sum">${rows.length}/${base.length} nơi · ${E(SORT[mapSt.sort][0].toLowerCase())}${needIdx&&idxBusy?` · <span style="color:var(--amber)">đang lập chỉ mục ${idxPct}%… kết quả sẽ đầy đủ sau ít giây</span>`:''}</div>
  ${shown.map(it=>placeCard(it,(MAP_WILD.includes(it.loai)||it.loai==='sao_huyet'?farmExtra(it,q):'')+goodsExtra(it,q))).join('')||'<div class="empty">Không có nơi phù hợp.<br>Thử bỏ bớt bộ lọc.</div>'}
  ${rows.length>shown.length?`<div class="acts" style="justify-content:center;margin:8px 0"><button class="btn" id="mp-more">Xem thêm ${Math.min(40,rows.length-shown.length)} nơi (còn ${rows.length-shown.length})</button></div>`:''}`;
  const reset=()=>Object.assign(mapSt,{qg:'all',lv:'all',loai:'all',kind:'all',safe:false,left:false,clan:false,sort:'near',n:40});
  $$(body,'[data-mmode]').forEach(b=>b.onclick=()=>{const m=b.dataset.mmode;if(m===mapMode())return;if(mapMode()==='dd')mapSt.lastCat=mapSt.sub;mapSt.sub=m==='dd'?(mapSt.lastCat&&MAP_CATS.some(x=>x[0]===mapSt.lastCat)?mapSt.lastCat:'thanh_thi'):m;store.set('mapSub',mapSt.sub);reset();render()});
  $$(body,'[data-msub]').forEach(b=>b.onclick=()=>{mapSt.sub=b.dataset.msub;store.set('mapSub',mapSt.sub);reset();render()});
  $$(body,'[data-mkind]').forEach(b=>b.onclick=()=>{mapSt.kind=b.dataset.mkind;mapSt.n=40;render()});
  $$(body,'[data-mlv]').forEach(b=>b.onclick=()=>{mapSt.lv=mapSt.lv===b.dataset.mlv?'all':b.dataset.mlv;mapSt.n=40;render()});
  $$(body,'[data-mclear]').forEach(b=>b.onclick=()=>{const k=b.dataset.mclear;if(k==='all')reset();else{const z={kind:'all',qg:'all',loai:'all',lv:'all',safe:false,left:false,clan:false};mapSt[k]=z[k]}mapSt.n=40;render()});
  const on=(id,fn)=>{const el=$(body,'#'+id);if(el)el.onclick=fn};
  on('mp-ftog',()=>{mapSt.filtOpen=!mapSt.filtOpen;store.set('mapFilt',mapSt.filtOpen);render()});
  on('mp-safe',()=>{mapSt.safe=!mapSt.safe;mapSt.n=40;render()});on('mp-left',()=>{mapSt.left=!mapSt.left;mapSt.n=40;render()});on('mp-clan',()=>{mapSt.clan=!mapSt.clan;mapSt.n=40;render()});
  on('mp-more',()=>{mapSt.n+=40;render()});
  const sel=(id,key)=>{const el=$(body,'#'+id);if(el)el.onchange=e=>{mapSt[key]=e.target.value;mapSt.n=40;render()}};
  sel('mp-sort','sort');sel('mp-qg','qg');sel('mp-loai','loai');
  const qi=$(body,'#mp-q');qi.oninput=e=>{mapSt.q=e.target.value;mapSt.n=40;clearTimeout(mapSt.t);mapSt.t=setTimeout(()=>{VIEWS.map();const i=$(body,'#mp-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)},300)};
};

/* ───────── Tab: Bí cảnh & Dị bảo ───────── */
const realmCard=r=>{
  const big=r.openNow?(r.closesIn!==null?`Đóng sau ${fmtTime(r.closesIn)}`:'Đang mở'):`Mở sau ${fmtTime(r.opensIn)}`;
  const gateTag=(r.bcType?`<span class="tag">${E(r.bcType)}</span>`:'')+(r.gate?`<span class="tag ${r.locked?'r':'g'}">Vào được: ${E(cgRangeTen(r.gate[0],r.gate[1]))}</span>`:'');
  const reachTag=gateTag+(r.ok?(r.openNow?'<span class="tag g">Tới kịp khi cửa còn mở</span>':(r.wait>0?`<span class="tag o">Nên khởi hành sau ${fmtTime(r.wait)} để tới đúng lúc mở</span>`:'<span class="tag g">Tới nơi vừa lúc mở cửa</span>')):`<span class="tag r">${E(r.why||'Không tới kịp')}</span>`);
  return`<article class="card ${r.openNow?'':'late'}" data-slot="${E(r.slot)}" data-title="${E(r.title)}"><div class="ico nd">${sealIco('門',34)}</div><div><b>${E(r.title)}</b><small>${E(r.kind)}${r.country?' · '+E(r.country):''}</small></div><div class="side" style="color:${r.openNow?'var(--jade)':'var(--amber)'}"><b style="color:inherit;font-size:14px">${E(big)}</b><small>${r.openNow?'':'năm '+Math.floor(r.openYear)}</small></div><div class="tags">${reachTag}${r.cgName?`<span class="tag ${r.cgDiff>=2?'r':r.cgDiff>=1?'o':r.cgDiff<=-1?'g':''}">Cấp nền: ${E(r.cgName)}${r.cgDiff!=null?(r.cgDiff>0?' · cao hơn ngươi '+r.cgDiff+' cảnh':r.cgDiff<0?' · thấp hơn ngươi '+(-r.cgDiff)+' cảnh':' · ngang cảnh giới'):''}</span>`:''}${r.danger?`<span class="tag ${r.danger.rank>=2?'r':r.danger.rank>=1?'o':'g'}">${E(r.danger.label||'')}</span>`:''}${r.winSpan!==null?`<span class="tag">Mỗi lần mở ${fmtTime(r.winSpan)}</span>`:''}${r.period?`<span class="tag">Chu kỳ ${fmtTime(r.period)}</span>`:''}${N(r.travel)?`<span class="tag">Đi ${r.est?'khoảng ':''}${fmtTime(r.travel)} · ${r.est?'~':''}${fmtMiles(r.miles)}</span>`:''}${r.danger.rank>=1?`<span class="tag ${r.danger.rank>=2?'r':''}">${r.danger.label}</span>`:''}</div><div class="acts"><button class="btn" data-act="view">Xem bản đồ</button><button class="btn pri" data-act="go">Đường đi an toàn</button></div></article>`;
};
const STAT_VN={than_thuc:'thần thức',ngo_tinh:'ngộ tính',dao_tam:'đạo tâm',khi_van:'khí vận',can_cot:'căn cốt',than_phap:'thân pháp'},TERRAIN_VN={di_tich:'Di tích',son_thuy:'Sơn thủy',hoang_da:'Hoang dã'};
const checkVn=s=>String(s||'').replace(/[a-z_]+/g,m=>STAT_VN[m]||m.replace(/_/g,' '));
const treasureWaitCard=r=>{
  const state=r.done?'Đã lấy':r.exhausted?'Hết lượt':r.cd>0?`Mở lại sau ${fmtTime(r.cd)}`:'Chưa xuất hiện';
  const col=r.cd>0?'var(--amber)':'var(--mute)';
  return`<article class="card late" ${r.slot?`data-slot="${E(r.slot)}" data-title="${E(r.title)}"`:''}><div class="ico nd">${sealIco('秘',34)}</div><div><b>${E(r.title)}</b><small>${E(r.placeName||'')}${r.terrain?' · '+E(TERRAIN_VN[r.terrain]||r.terrain.replace(/_/g,' ')):''}</small></div><div class="side" style="color:${col}"><b style="color:inherit;font-size:14px">${E(state)}</b>${r.cd>0?`<small>năm ${Math.floor(nowYear()+r.cd)}</small>`:''}</div><div class="tags">${r.relic?`<span class="tag o">Dị bảo: ${E(r.relic)}</span>`:''}${r.boss?`<span class="tag r">Canh giữ: ${E(r.boss)}</span>`:''}${r.gate?`<span class="tag">Cảnh giới: ${E(cgRangeTen(r.gate[0],r.gate[1]))}</span>`:''}${r.check?`<span class="tag">Cần: ${E(checkVn(r.check))}</span>`:''}${r.chance&&!r.done?`<span class="tag">Khoảng ${F(r.chance*100)}% mỗi lần xuất hiện</span>`:''}${r.cooldown?`<span class="tag">Hồi chiêu ${r.cooldown} năm</span>`:''}${N(r.travel)?`<span class="tag">Đi ${r.est?'khoảng ':''}${fmtTime(r.travel)} · ${r.est?'~':''}${fmtMiles(r.miles)}</span>`:''}</div>${treasureHow(r.id)}${r.slot&&!r.done?'<div class="acts"><button class="btn" data-act="view">Xem bản đồ</button><button class="btn pri" data-act="go">Đường đi an toàn</button></div>':''}</article>`;
};
VIEWS.realm=()=>{
  const sub=ui.tabState.realmSub||'bi_canh';
  const bc=realmRows(),tr=treasureRows(),act=[...tr.active].sort(SORTS.urgent.fn);
  const opened=bc.filter(r=>r.openNow).length;
  const tCard=r=>cardHtml(r,{after:treasureHow(r.id),extra:[r.relic?`<span class="tag o">Dị bảo: ${E(r.relic)}</span>`:'',r.boss?`<span class="tag r">Canh giữ: ${E(r.boss)}</span>`:'',r.gate?`<span class="tag ${r.locked?'o':'g'}">Cảnh giới đề xuất: ${E(cgRangeTen(r.gate[0],r.gate[1]))}${r.locked?' · ngoài tầm — game vẫn cho vào, kẻ canh giữ rất khó đánh':''}</span>`:'',r.check?`<span class="tag">Cần: ${E(checkVn(r.check))}</span>`:'',r.cooldown?`<span class="tag">Hồi chiêu ${r.cooldown} năm</span>`:''].join('')});
  const subNav=`<div class="row" style="gap:6px;margin:0 0 10px;flex-wrap:wrap">
    <button type="button" class="btn ${sub==='bi_canh'?'on':''}" data-realm-sub="bi_canh">Bí cảnh · ${bc.length}${opened?` · mở ${opened}`:''}</button>
    <button type="button" class="btn ${sub==='di_bao'?'on':''}" data-realm-sub="di_bao">Dị bảo · ${act.length+tr.waiting.length}${act.length?` · hiện ${act.length}`:''}</button>
  </div>`;
  let main='';
  if(sub==='di_bao'){
    main=`<h3>${grpIco('su_kien',20)}Dị bảo đang xuất hiện · ${act.length}</h3>${act.map(tCard).join('')||'<div class="empty">Chưa có dị bảo nào xuất hiện.</div>'}
    <h3>${grpIco('su_kien',20)}Các dị bảo khác · ${tr.waiting.length}</h3>${tr.waiting.map(treasureWaitCard).join('')||'<div class="empty">Không có.</div>'}`;
  }else{
    main=`<h3>${grpIco('tham_hiem',20)}Bí cảnh · ${bc.length} (đang mở ${opened}) · xếp theo giờ mở cửa</h3>${bc.map(realmCard).join('')||'<div class="empty">Chưa có bí cảnh nào.</div>'}`;
  }
  body.innerHTML=subNav+main;
  $$(body,'[data-realm-sub]').forEach(b=>b.onclick=()=>{ui.tabState.realmSub=b.dataset.realmSub;VIEWS.realm()});
};

/* ───────── Tab: Kinh mạch (Build) ───────── */

const BUILD_PATHS=[['tu_do','Tự do'],['kiem','Kiếm tu'],['the','Thể tu'],['phat','Phật tu'],['ma','Ma tu'],['doc','Độc cổ'],['hop_hoan','Hợp Hoan'],['thi','Luyện Thi'],['quy','Quỷ tu'],['ngu_thu','Ngự Thú'],['khoi_loi','Khôi Lỗi'],['phu','Phù tu'],['tran','Trận tu'],['dan','Đan tu'],['khi','Luyện Bảo'],['he_am','Ám tu'],['he_loi','Lôi tu'],['he_hoa','Hỏa tu'],['he_bang','Băng tu'],['he_phong','Phong tu'],['he_kim','Kim tu'],['he_moc','Mộc tu'],['he_thuy','Thủy tu'],['he_tho','Thổ tu']];
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
const SCHOOLS_B=['kiem','the','phat','ma','doc','hop_hoan','thi','quy','ngu_thu','khoi_loi','phu','tran','dan','khi'];
const NL2S={thu:'ngu_thu',khoi_loi:'khoi_loi',trung:'doc',thi:'thi',hon:'quy'};
const schoolsOf=it=>{const t=A(it?.tag).filter(x=>SCHOOLS_B.includes(x));const nl=it?.ngu_linh&&NL2S[it.ngu_linh.loai];if(nl&&!t.includes(nl))t.push(nl);if(A(it?.tag).includes('nghich')&&!t.includes('ma'))t.push('ma');return t};
const isTaItem=it=>A(it?.tag).some(t=>TA_TAGS_B.includes(t))||(it?.ngu_linh&&['thi','hon'].includes(it.ngu_linh.loai));
const BUILDS=[
  {k:'kiem',ten:'Kiếm tu',nhom:'Chính đạo',core:['Đồ kiếm tu đặt trên kinh mạch như đồ khác; thể chất có kiếm cốt thì chiêu kiếm mạnh thêm. (lời game)','Thể chất Kiếm cốt: uy lực kiếm +25%, kinh lộ tối đa 7 công pháp. (dữ liệu game)','Chính đạo: mỗi điểm tâm ma trừ 1% đột phá; hóa giải bằng đan tĩnh tâm, tĩnh tâm ở chùa, sư phụ áp chế. (lời game)']},
  {k:'the',ten:'Thể tu',nhom:'Chính đạo',core:['Trước hết phải có tâm pháp luyện thể thông mạch; có rồi thì quyền cước và chiêu công của đồ thể tu đánh bằng khí huyết thân thể thay cho pháp lực, chưa có thì đồ thể tu chỉ như món thường. Khí huyết càng dày đòn càng nặng nhưng càng về sau càng tăng chậm: nên kèm căn cốt và đồ tăng khí huyết. (lời game)','Thể chất: Thiết cốt (khí huyết +30%, hộ thể +5%, thể uy lực +15%), Huyền Vũ (khí huyết +40%, tu chậm), Hoang Cổ thánh thể (khí huyết +50%, tu chậm). (dữ liệu game)','Chính đạo: mỗi điểm tâm ma trừ 1% đột phá; hóa giải bằng đan tĩnh tâm, tĩnh tâm ở chùa, sư phụ áp chế. (lời game)']},
  {k:'phat',ten:'Phật tu',nhom:'Chính đạo',core:['Chính đạo: mỗi điểm tâm ma trừ 1% đột phá; hóa giải bằng đan tĩnh tâm, tĩnh tâm ở chùa, sư phụ áp chế. (lời game)','Game không có mô tả cơ chế riêng nào khác cho lối Phật ngoài nhãn đồ "phat" và sơn môn phái Phật, nên tool không ghi thêm.']},
  {k:'ma',ten:'Ma tu',nhom:'Tà đạo',core:['Mảnh tà (ma công, tà công, luyện thi, quỷ tu, độc cổ, hợp hoan) chiếm từ 1/3 số ô đang thông trên kinh mạch thì lưới ngả tà; giữ lưới đủ 5/5/10/20/40/60 năm (Phàm Nhân → Hóa Thần) thì đạo cơ đổi theo, đổi lưới về giữa chừng thì mất số năm đã dồn. (lời game)','Ma niệm làm chiêu tà mạnh thêm và tu nhanh hơn, đột phá không bị trừ. Trần khống ma = 30 + 10 × cảnh giới + bản tâm; vượt trần thì trong trận dễ mất kiểm soát, đột phá dễ tẩu hỏa. (lời game)','Mang mảnh tà là có ma khí: vào đất chính đạo có thể bị nhận ra; thành lớn, sơn môn, chùa soi kỹ nhất. (lời game)']},
  {k:'doc',ten:'Độc cổ',nhom:'Tà đạo',core:['Mảnh tà (ma công, tà công, luyện thi, quỷ tu, độc cổ, hợp hoan) chiếm từ 1/3 số ô đang thông trên kinh mạch thì lưới ngả tà; giữ lưới đủ 5/5/10/20/40/60 năm (Phàm Nhân → Hóa Thần) thì đạo cơ đổi theo, đổi lưới về giữa chừng thì mất số năm đã dồn. (lời game)','Ma niệm làm chiêu tà mạnh thêm và tu nhanh hơn, đột phá không bị trừ. Trần khống ma = 30 + 10 × cảnh giới + bản tâm; vượt trần thì trong trận dễ mất kiểm soát, đột phá dễ tẩu hỏa. (lời game)','Mang mảnh tà là có ma khí: vào đất chính đạo có thể bị nhận ra; thành lớn, sơn môn, chùa soi kỹ nhất. (lời game)','Trùng (ngự linh loại "trung") cần tâm pháp đúng loại thông trên kinh mạch. Thể chất Vạn Độc: độc uy lực +30%. (lời + dữ liệu game)']},
  {k:'hop_hoan',ten:'Hợp hoan',nhom:'Tà đạo',core:['Mảnh tà (ma công, tà công, luyện thi, quỷ tu, độc cổ, hợp hoan) chiếm từ 1/3 số ô đang thông trên kinh mạch thì lưới ngả tà; giữ lưới đủ 5/5/10/20/40/60 năm (Phàm Nhân → Hóa Thần) thì đạo cơ đổi theo, đổi lưới về giữa chừng thì mất số năm đã dồn. (lời game)','Ma niệm làm chiêu tà mạnh thêm và tu nhanh hơn, đột phá không bị trừ. Trần khống ma = 30 + 10 × cảnh giới + bản tâm; vượt trần thì trong trận dễ mất kiểm soát, đột phá dễ tẩu hỏa. (lời game)','Mang mảnh tà là có ma khí: vào đất chính đạo có thể bị nhận ra; thành lớn, sơn môn, chùa soi kỹ nhất. (lời game)']},
  {k:'thi',ten:'Luyện thi',nhom:'Tà đạo',core:['Mảnh tà (ma công, tà công, luyện thi, quỷ tu, độc cổ, hợp hoan) chiếm từ 1/3 số ô đang thông trên kinh mạch thì lưới ngả tà; giữ lưới đủ 5/5/10/20/40/60 năm (Phàm Nhân → Hóa Thần) thì đạo cơ đổi theo, đổi lưới về giữa chừng thì mất số năm đã dồn. (lời game)','Ma niệm làm chiêu tà mạnh thêm và tu nhanh hơn, đột phá không bị trừ. Trần khống ma = 30 + 10 × cảnh giới + bản tâm; vượt trần thì trong trận dễ mất kiểm soát, đột phá dễ tẩu hỏa. (lời game)','Mang mảnh tà là có ma khí: vào đất chính đạo có thể bị nhận ra; thành lớn, sơn môn, chùa soi kỹ nhất. (lời game)','Thi khôi (ngự linh loại "thi") cần tâm pháp đúng loại thông trên kinh mạch. Thể chất Âm Hồn: người luyện thi, dưỡng hồn nuôi thi khôi, quỷ hồn tốn ít ngự lực hơn. (lời + dữ liệu game)']},
  {k:'quy',ten:'Quỷ tu',nhom:'Tà đạo',core:['Mảnh tà (ma công, tà công, luyện thi, quỷ tu, độc cổ, hợp hoan) chiếm từ 1/3 số ô đang thông trên kinh mạch thì lưới ngả tà; giữ lưới đủ 5/5/10/20/40/60 năm (Phàm Nhân → Hóa Thần) thì đạo cơ đổi theo, đổi lưới về giữa chừng thì mất số năm đã dồn. (lời game)','Ma niệm làm chiêu tà mạnh thêm và tu nhanh hơn, đột phá không bị trừ. Trần khống ma = 30 + 10 × cảnh giới + bản tâm; vượt trần thì trong trận dễ mất kiểm soát, đột phá dễ tẩu hỏa. (lời game)','Mang mảnh tà là có ma khí: vào đất chính đạo có thể bị nhận ra; thành lớn, sơn môn, chùa soi kỹ nhất. (lời game)','Quỷ hồn (ngự linh loại "hon") cần tâm pháp đúng loại thông trên kinh mạch. Thể chất Âm Hồn: dưỡng hồn, quỷ hồn tốn ít ngự lực hơn. (lời + dữ liệu game)']},
  {k:'ngu_thu',ten:'Ngự thú',nhom:'Ngự linh',core:['Ngự thú, trùng, khôi lỗi, thi, hồn cần một tâm pháp đúng loại thông trên kinh mạch; tháo tâm pháp thì con loại đó về túi. Mỗi con tốn thần thức theo tư chất và cảnh giới. (lời game)','Linh thú ai cũng nuôi được; ngự thú, trùng tự lớn theo năm và lớn thêm khi cho ăn; tới bình cảnh phải tiến hóa mới lên tiếp. (lời game)']},
  {k:'khoi_loi',ten:'Khôi lỗi',nhom:'Ngự linh',core:['Ngự thú, trùng, khôi lỗi, thi, hồn cần một tâm pháp đúng loại thông trên kinh mạch; tháo tâm pháp thì con loại đó về túi. Mỗi con tốn thần thức theo tư chất và cảnh giới. (lời game)','Khôi lỗi, thi, hồn tự tế luyện chậm hơn, chủ luyện thêm thì lớn nhanh; không vượt cảnh giới chủ. (lời game)']},
  {k:'phu',ten:'Phù tu',nhom:'Nghề',core:['Chế phù: điểm nghề = tính(thần thức) + tính(chỉ số phụ) / 2 (chỉ số chính của luyện đan, chế phù, luyện bảo). Phù dùng giữa trận: công, khống chế, hộ thân; phẩm phù thấp hơn cảnh giới mình thì nhạt đi. (lời game)']},
  {k:'tran',ten:'Trận tu',nhom:'Nghề',core:['Trận nào cũng bày được; sức theo phẩm trận bàn so với đối tượng (thấp ba phẩm trở xuống không tác dụng, cao hơn thì mạnh hơn). Bày giữa trận là hết lượt, mỗi phe tối đa 2 trận, mỗi trận khóa một phần linh lực tối đa tới khi tan; trận nhãn vỡ thì tan. (lời game)']},
  {k:'dan',ten:'Đan tu',nhom:'Nghề',core:['Luyện đan dùng chung điểm nghề với chế phù, luyện bảo (thần thức + chỉ số phụ). (lời game)','Thể chất Bách Thảo: dược kháng chậm, đan hồi trong trận mạnh thêm 50%. (dữ liệu game)']},
  {k:'khi',ten:'Khí tu (luyện bảo)',nhom:'Nghề',core:['Luyện bảo: tinh huyết rút từ thọ nguyên, luyện thành là mất thật; nghề càng cao càng hao ít và càng ít hỏng. (lời game)']},
];
for(const [h,ten] of [['am','Ám tu'],['loi','Lôi tu'],['hoa','Hỏa tu'],['bang','Băng tu'],['phong','Phong tu'],['kim','Kim tu'],['moc','Mộc tu'],['thuy','Thủy tu'],['tho','Thổ tu']]){
  BUILDS.push({k:'he_'+h,ten,nhom:'Theo hệ',elem:h,core:['Mỗi mảnh kề nhau tương sinh +15%, tương khắc −15%; mảnh sinh kém phẩm góp ít hơn (kém một phẩm +10%, kém hai +5%, kém từ ba không góp). Hệ biến dị (Lôi, Phong, Băng, Ám) tính như hệ gốc, Ám như Thủy. (lời game)','Dị hỏa trang bị: chiêu có hệ trùng hệ dị hỏa (trừ vô sắc) được nhân thêm 6% (Huyền), 8% (Địa), 10% (Thiên), 12% (Tiên), 15% (Thần), 20% (Nghịch Thiên). (code game)'].concat(({am:'Thể chất Cửu U: uy lực hệ Ám +25%. Ám không mặc định là tà: mảnh tà chỉ gồm ma công, tà công, luyện thi, quỷ tu, độc cổ, hợp hoan. (dữ liệu + lời game)',bang:'Thể chất Cửu Âm tuyệt mạch: uy lực hệ Băng +25%, tu luyện nhanh hơn. (dữ liệu game)',hoa:'Thể chất Liệt Dương: uy lực hệ Hỏa +25%, nhưng phản phệ tà công ×1,5. (dữ liệu game)'})[h]?[({am:'Thể chất Cửu U: uy lực hệ Ám +25%. Ám không mặc định là tà: mảnh tà chỉ gồm ma công, tà công, luyện thi, quỷ tu, độc cổ, hợp hoan. (dữ liệu + lời game)',bang:'Thể chất Cửu Âm tuyệt mạch: uy lực hệ Băng +25%, tu luyện nhanh hơn. (dữ liệu game)',hoa:'Thể chất Liệt Dương: uy lực hệ Hỏa +25%, nhưng phản phệ tà công ×1,5. (dữ liệu game)'})[h]]:[])});
}
// Hệ số chung của kinh mạch — đọc từ hàm computeMeridians/gearOutput của game (mọi lối đều dùng)
const KM_COMMON=['Mảnh chỉ "thông" khi nối liền đan điền qua các công pháp kề nhau (pháp khí chỉ cần chạm đan điền hoặc chạm công pháp đã thông); mảnh gắn nhãn nghịch chỉ thông khi kề một mảnh khắc nó. (code game)','Sức mảnh = màu × huyệt × sinh khắc × nội tại × kinh lộ. Màu: 0,85 + 0,45 × độ hợp trung bình của các ô mảnh phủ, tức ×0,85 đến ×1,30; ô cùng hệ = 1, ô xám hoặc cùng họ gốc (Lôi/Phong→Mộc, Băng/Ám→Thủy) = 0,5, khác hệ = 0; mảnh vô sắc đặt lên ô xám = 1, lên ô màu = 0,5. (code game)','Huyệt đạo: mảnh phủ 1 huyệt ×2, mỗi huyệt thêm +0,25. Nội tại tương sinh (mảnh nhiều hệ tự sinh nhau) ×1,1. Kinh lộ (chỉ pháp khí): +10% cho mỗi mảnh cùng họ hệ trên chuỗi, tối đa 5 mảnh (Kiếm cốt 7). (code game)','Tốc độ tu, đột phá, kháng tâm ma, an tức của công pháp chỉ phụ thuộc độ thuần thục và phẩm, KHÔNG nhân theo vị trí/màu/huyệt: ở chế độ Tu luyện chỉ cần mảnh thông và tránh cặp nghịch. Chỉ số, khí huyết, hộ thể, linh lực, uy lực chiêu thì nhân theo sức mảnh. (code game)','Hiệu lực mảnh còn nhân theo phẩm và thuần thục: Phàm phẩm ×0,6; đồ Nghịch Thiên theo cảnh giới (×0,6 tới Trúc Cơ, ×0,85 ở Kim Đan, ×1,15 từ Nguyên Anh); thuần thục ×(0,5 + 0,5 × độ thuần thục), Viên mãn ×1,1; linh lực mảnh vô sắc ×0,85; cùng một món mặc hai lần chỉ tính một. (code game)'];
BUILDS.forEach(b=>{b.core=KM_COMMON.concat(b.core)});
function buildMatch(b,it){
  if(!b||!it)return false;
  if(b.elem)return A(it.he).includes(b.elem);
  return schoolsOf(it).includes(b.k);
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
// Hệ hợp của lối = 2 hệ xuất hiện nhiều nhất trong các món mang nhãn lối đó (đếm từ content game), không ghi tay
const _buildHeMemo={};
function buildHe(b){
  if(b.elem)return[b.elem];
  if(_buildHeMemo[b.k])return _buildHeMemo[b.k];
  const cnt={};for(const it of C.items.values()){if(!(it.loai==='cong_phap'||it.loai==='phap_khi')||!buildMatch(b,it))continue;for(const h of A(it.he))if(h!=='vo_sac')cnt[h]=(cnt[h]||0)+1}
  return _buildHeMemo[b.k]=Object.entries(cnt).sort((x,y)=>y[1]-x[1]).slice(0,2).map(x=>x[0]);
}
function buildFit(b,nv){
  let s=0;const why=[];const Cc=C;
  let onKm=0,inBag=0;
  for(const m of A(nv.kinhMach?.manh)){const it=Cc.items.get(m.item);if(it&&buildMatch(b,it))onKm++}
  for(const [id,n] of Object.entries(nv.tuiDo||{})){const it=Cc.items.get(id);if(n>0&&it&&(it.loai==='cong_phap'||it.loai==='phap_khi')&&buildMatch(b,it))inBag++}
  if(onKm){s+=3*onKm;why.push(onKm+' món trên kinh mạch')}
  if(inBag){s+=inBag;why.push(inBag+' món trong túi')}
  const lc=A(nv.linhCan?.he);
  const hm=buildHe(b).filter(h=>lc.includes(h));
  if(hm.length){s+=4*hm.length;why.push('hợp linh căn '+hm.map(h=>ELEMENT_NAMES[h]||h).join('/'))}
  const tc=String(nv.theChat||'');
  // Thể chất hợp: theo mô tả/đặc tính trong content (Kiếm cốt: kiem_uy_luc; Thiết cốt: hợp thể tu; Âm Hồn: luyện thi/dưỡng hồn; Vạn Độc: độc uy lực; Bách Thảo: đan; Huyền Vũ/Hoang Cổ: phản phệ ×0,5; Cửu U/Cửu Âm/Liệt Dương: uy lực hệ +25%)
  const TC={kiem:'kiem_cot',the:['thiet_cot','hoang_co','huyen_vu'],thi:'am_hon',quy:'am_hon',dan:'bach_thao',doc:'van_doc',ma:['huyen_vu','hoang_co'],hop_hoan:['huyen_vu','hoang_co'],he_am:'cuu_u',he_bang:'cuu_am',he_hoa:'liet_duong'};
  if(TC[b.k]&&[TC[b.k]].flat().some(x=>tc.includes(x))){s+=8;why.push('thể chất hợp')}
  if(tc.includes('liet_duong')&&TA_BUILDS_B.includes(b.k)){s-=6;why.push('Liệt Dương phản phệ tà ×1,5')}
  return{s,why};
}
const PATH_W={0:0,1:1,2:3,3:3};
const PATH_MUC=[['0','Không theo lối (chỉ xét sức mạnh)'],['1','Ưu tiên đồ của lối'],['2','Ưu tiên mạnh'],['3','Chỉ dùng đồ của lối']];


const MODES=[['danh','Chiến đấu'],['tu','Tu luyện'],['can','Cân bằng']];
const bld={pref:{body:'current',mainElement:'auto',subs:[],school:'tu_do',alignment:'auto'},iters:900,busy:false,results:null,mode:'danh',msg:''};
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
      return{id:m.item,item:m.item,name:it?.ten||m.item,elements:A(it?.he),alignment:isTaItem(it)?'ta':'chinh',connected:rm?!!rm.thong:true,heSo:rm?.heSo};
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
  const ppMul=Number(C.theChat?.get?.(me().theChat)?.dac_tinh?.phan_phe??1)||1,phaPhe=Math.min(0.15,0.03*nghich*ppMul),dpShow=Math.min(0.12,dp),netBreak=dpShow-phaPhe;
  let grid='';try{grid=BuildEngine.drawGrid(BuildEngine.nvNow(),b.manh).replace('class="vk-img"','class="grid-img"')}catch{}
  const modeNote=bld.mode==='danh'?'Bộ Chiến đấu tối ưu số trận thắng trên trận mẫu (tinh anh/boss).'
    :bld.mode==='tu'?'Bộ Tu luyện chuyên bế quan/đột phá: bắt buộc có đột phá công pháp đến trần 12%; vượt trần thì dồn sang tốc độ tu luyện + kháng tâm ma; không để điểm nghịch (mỗi điểm −3% đột phá × phản phệ thể chất, tối đa −15%). Số thắng chỉ để tham khảo.'
    :'Bộ Cân bằng: giữ số thắng trận mẫu ở mức khá và vẫn có đột phá + tốc độ tu luyện, hạn chế điểm nghịch.';
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
    return '<div class="row" style="align-items:center;gap:6px;padding:3px 0;border-bottom:1px dashed rgba(43,43,43,.07)">'
      +'<span style="width:1.4em;text-align:right;opacity:.65;flex:none">'+String(idx+1)+'</span>'
      +'<i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:'+col+';flex:none"></i>'
      +'<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">'+E(x.name)+' · '+mid+'</span></div>';
  }).join('');
  return '<div class="panel"><div class="sub" style="margin-bottom:6px">'+modeNote+((b.hypo||bld.hypo)?' <b>[Giả định]</b>':'')+'</div>'+(A(b.missing).length?missingOrderHtml(b.missing):'')
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
  const itSel='<select id="b-it" class="grow">'+[['400','Nhanh'],['900','Cân bằng'],['1600','Tính kỹ'],['2800','Rất kỹ']].map(([k,n])=>'<option value="'+k+'" '+(String(bld.iters)===k?'selected':'')+'>'+n+'</option>').join('')+'</select>';
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
    +'<div class="sub" style="margin-top:4px">Hai chế độ cùng thuật toán xếp. <b>Thực tế</b> = đồ trong túi · <b>Giả định</b> = cả đồ chưa có (đúng cảnh). Món còn thiếu sẽ hiện kèm nút <b>Đặt hàng</b> (cọc 30%, hàng về sau vài năm); có đủ đồ trong túi mới xếp được.</div>'
    +'<div class="bar2"><i id="b-bar"></i></div><div class="sub" id="b-msg">'+E(bld.msg)+(bld.results&&bld.hypo?' <span class="tag o">Chế độ giả định</span>':'')+'</div></div>'
    +(bld.results?('<div class="seg">'+MODES.map(([k,n])=>'<button type="button" data-mode="'+k+'" class="'+(bld.mode===k?'on':'')+'">'+n+'</button>').join('')+'</div>'
      +applyBar+buildResultHtml()):'');

  const syncPath=()=>{
    const k=$(body,'#b-school')?.value||'tu_do';
    let w=+($(body,'#b-pw')?.value||0);
    if(k!=='tu_do'&&w===0)w=2; // chọn lối mà mức vẫn 0 thì bộ lọc bị tắt ngầm → mặc định "Ưu tiên mạnh"
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
      bld.msg=(hypo?'Xong giả định. Món còn thiếu hiện ở bên dưới kèm nút Đặt hàng; có đủ đồ trong túi thì xếp vào bộ được.':'Xong. Chọn hướng, bấm xếp vào bộ 1/2/3 hoặc xếp cả 3 bộ.')+(p._relaxed?(' Lối này chỉ có '+p._relaxed+' món phù hợp — đã nới từ "chỉ đồ lối" về "ưu tiên" để không bỏ trống lưới.'):'');
    }catch(e){console.error(e);bld.msg='Chưa tính được: '+(e?.message||e)}
    finally{bld.busy=false;if(ui.tab==='build'&&ui.isOpen)VIEWS.build()}
  };
  $(body,'#b-go')&&($(body,'#b-go').onclick=()=>runOptimize(false));
  $(body,'#b-go-hypo')&&($(body,'#b-go-hypo').onclick=()=>runOptimize(true));
  $$(body,'[data-order-item]').forEach(b=>b.onclick=()=>orderConfirm(b.dataset.orderItem,1,()=>render()));
  $$(body,'[data-order-go]').forEach(b=>b.onclick=()=>{itemSub.v='orders';ui.tab='items';store.set('tab','items');render()});
  $$(body,'[data-apply-slot]').forEach(btn=>btn.onclick=async()=>{
    const slot=+btn.dataset.applySlot;
    const r=await BuildEngine.apply(bld.mode,slot,{hypo:!!bld.hypo});
    toast((r.ok?'Đã xếp «'+(MODES.find(x=>x[0]===bld.mode)?.[1]||bld.mode)+'» vào Bộ '+(slot+1)+'. ':'')+(r.msg||''),r.ok?'ok':'',8000);
    if(r.bagFull)bagFullModal(r.stuckNames);
    render();
  });
  $(body,'#b-apply-all')&&($(body,'#b-apply-all').onclick=async()=>{
    const rs=await BuildEngine.applyAll({hypo:!!bld.hypo});
    toast(rs.map((y,i)=>'Bộ '+(i+1)+' ('+MODES[i][1]+'): '+y.msg).join('\n'),'ok',10000);
    { const bf=rs.find(y=>y.bagFull);if(bf)bagFullModal(bf.stuckNames) }
    render();
  });
};


/* ───────── Đặt hàng vật phẩm (thay cho thêm thẳng vào túi) ─────────
   Cọc 30% khi đặt; hàng về sau vài năm tùy phẩm; hàng về thì trả nốt phần còn lại để nhận vào túi.
   Chưa đủ tiền thì giữ thêm 5 năm; quá hạn giữ thì mất hàng và cả tiền cọc. Chỉ Dị bảo (Nghịch Thiên) không đặt được. */
const ORDER_CFG={
  deposit:0.3,            // tiền cọc = 30% giá
  holdYears:5,            // hàng về được giữ bao lâu; bấm "Giữ thêm" cộng thêm chừng này
  extendFee:0.1,          // phí giữ thêm = 10% giá đơn hàng
  maxExtend:1,            // chỉ được giữ thêm 1 lần
  mult:{1:1,2:2,3:3,4:4,5:5,6:7,7:10},   // hệ số giá theo phẩm (Phàm ×1 … Thiên ×5, Tiên ×7, Thần ×10); Nghịch Thiên không đặt được
  wait:{1:0.5,2:1,3:2,4:3,5:4,6:5,7:5},  // số năm chờ hàng theo phẩm (tối đa 5)
  maxQty:{1:15,2:10,3:5,4:3,5:1,6:1,7:1}
};
function orderBlock(id){
  const r=C.items.get(id);
  if(!r)return'Không có vật phẩm này.';
  if(A(r.tag).includes('di_bao')||A(r.tag).includes('nghich_thien')||(r.pham_cap??0)>=8)return'Dị bảo (Nghịch Thiên) không đặt mua được.';
  if(!(r.gia>0))return'Vật này không có giá nên không đặt được.';
  if(!ORDER_CFG.mult[r.pham_cap])return(GRADE_NAMES[r.pham_cap]||'Phẩm này')+' không cho đặt hàng.';
  return'';
}
const orderMult=id=>ORDER_CFG.mult[C.items.get(id)?.pham_cap]||0;
const orderUnit=id=>Math.round((C.items.get(id)?.gia||0)*orderMult(id));
const orderWait=id=>ORDER_CFG.wait[C.items.get(id)?.pham_cap]||0;
const orderMaxQty=id=>ORDER_CFG.maxQty[C.items.get(id)?.pham_cap]||1;
const orderDeposit=total=>Math.ceil(total*ORDER_CFG.deposit);
const money=()=>Number(me().linhThach)||0;
const itemName=id=>T(C.items.get(id)?.ten||id);
const yrs=n=>(Math.round(n*10)/10).toLocaleString('vi-VN')+' năm';

const Modal={
  q:[],cur:null,
  push(m){this.q.push(m);if(!this.cur)this.next()},
  next(){
    const m=this.q.shift();this.cur=m||null;
    if(!m){modal.style.display='none';modal.innerHTML='';return}
    modal.innerHTML=`<div class="mbox" role="alertdialog"><h3>${E(m.title)}</h3><div class="mb">${m.html}</div><div class="mmsg"></div><div class="macts">${(m.btns||[{t:'Đóng'}]).map((b,i)=>`<button class="btn ${b.pri?'pri':''}" data-i="${i}">${E(b.t)}</button>`).join('')}</div></div>`;
    modal.style.display='flex';
    $$(modal,'[data-i]').forEach(bt=>bt.onclick=async()=>{
      const b=(m.btns||[{t:'Đóng'}])[+bt.dataset.i];let keep=null;
      try{keep=b.fn?await b.fn():null}catch(e){keep=String(e?.message||e)}
      if(typeof keep==='string'&&keep){$(modal,'.mmsg').textContent=keep;return}
      this.next();
    });
  }
};
function bagFullModal(names){
  Modal.push({title:'Túi đồ đã đầy',html:`<p>Túi đầy nên chưa làm tiếp được${names&&names.length?` (<b>${E(names.join(', '))}</b>)`:''}.</p><p>Đạo hữu hãy tự <b>bán hoặc vứt bớt vật phẩm không cần thiết</b> trong túi, rồi bấm lại.</p>`,btns:[{t:'Đã rõ',pri:true}]});
}

/* Đơn đặt hàng của tool nằm TRONG trạng thái của game (run.vktDon) và mọi thay đổi (tiền, đồ, đơn) đi qua g.dev — một giao dịch duy nhất:
   lỗi giữa chừng thì game trả lại nguyên trạng, game tự lưu và cập nhật giao diện; tải lại save cũ thì đơn cũng quay về đúng lúc đó. */
function gameTx(fn){
  let out={ok:false,msg:'Game chưa nhận thao tác này (đang có việc dang dở?).'};
  const err0=g.state.error;
  try{g.dev(ctx=>{out=fn(ctx)||{ok:true}})}catch(e){out={ok:false,msg:String(e?.message||e)}}
  const er=g.state.error;
  if(er&&er!==err0){
    try{g.store.setState({error:undefined})}catch{}
    out=/VKT_ABORT/.test(String(er))?{ok:false,bag:true,msg:'Túi không đủ chỗ cho cả đơn hàng — chưa mất linh thạch nào. Hãy tự bán hoặc vứt bớt vật phẩm rồi thanh toán lại.'}:{ok:false,msg:'Game từ chối: '+String(er).replace(/^Error:\s*/,'')};
  }
  return out;
}
const TUI=()=>window.tuTien?.core?.['character/tui_do'];
const ORD={
  mig:null,
  list_(){const l=run().vktDon;return Array.isArray(l)?l:[]},
  /* chuyển đơn cũ (lưu ngoài game ở bản trước) vào trạng thái game, một lần cho mỗi kiếp */
  migrate(){
    const seed=run().seed??'x';if(this.mig===seed)return;this.mig=seed;
    const k='orders.'+seed;let old=[];try{old=store.get(k,[])}catch{}
    if(!Array.isArray(old)||!old.length)return;
    const r=gameTx(ctx=>{if(!Array.isArray(ctx.run.vktDon))ctx.run.vktDon=old.map(o=>({...o}));return{ok:true}});
    if(r.ok)try{store.set(k,[])}catch{}
  },
  load(){this.migrate();return this.list_()},
  flags(){const k='orderflags.'+(run().seed??'x');let f={};try{f=store.get(k,{})||{}}catch{}return{f,save:()=>{try{store.set(k,f)}catch{}}}},
  status(o){const y=nowYear();return y<o.readyYear?'wait':(y<=o.holdUntil?'ready':'lost')},
  readyCount(){return this.load().filter(o=>this.status(o)==='ready').length},
  byItem(id){return this.load().find(o=>o.item===id)},
  place(id,qty){
    const blk=orderBlock(id);if(blk)return{ok:false,msg:blk};
    qty=Math.floor(Number(qty));if(!Number.isFinite(qty)||qty<1)return{ok:false,msg:'Số lượng phải từ 1 trở lên.'};
    if(qty>orderMaxQty(id))return{ok:false,msg:`Mỗi đơn tối đa ${orderMaxQty(id)} món loại này.`};
    this.migrate();
    const total=orderUnit(id)*qty,dep=orderDeposit(total);
    const r=gameTx(ctx=>{
      const nv=ctx.run.nhanVat,have=Number(nv.linhThach)||0;
      if(have<dep)return{ok:false,msg:`Chưa đủ linh thạch đặt cọc: cần ${F(dep)}, đang có ${F(have)}.`};
      const y=Number(ctx.run.nam)||0,ready=y+orderWait(id);
      nv.linhThach=have-dep;
      (Array.isArray(ctx.run.vktDon)?ctx.run.vktDon:(ctx.run.vktDon=[])).push({id:'o'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),item:id,qty,total,deposit:dep,orderedYear:y,readyYear:ready,holdUntil:ready+ORDER_CFG.holdYears,ext:0});
      return{ok:true};
    });
    if(!r.ok)return r;
    return{ok:true,msg:`Đã đặt «${itemName(id)}»${qty>1?' ×'+qty:''}: cọc ${F(dep)} linh thạch, hàng về sau ${yrs(orderWait(id))}.`};
  },
  find(oid){return this.load().find(o=>o.id===oid)},
  remaining(o){return Math.max(0,o.total-o.deposit)},
  extendFee(o){return Math.ceil(o.total*ORDER_CFG.extendFee)},
  canExtend(o){return (o.ext||0)<ORDER_CFG.maxExtend},
  pay(oid){
    const o0=this.find(oid);if(!o0)return{ok:false,msg:'Không còn đơn này.'};
    if(this.status(o0)==='wait')return{ok:false,msg:'Hàng chưa về.'};
    if(this.status(o0)==='lost')return{ok:false,msg:'Đơn đã quá hạn giữ.'};
    if(run().tran)return{ok:false,msg:'Đang trong trận, chờ xong trận rồi nhận hàng.'};
    const T1=TUI();
    if(!T1||typeof T1.nhanVaoTui!=='function'||typeof T1.conCho!=='function')return{ok:false,msg:'Chưa nhận ra hàm nhận đồ của game sau lần cập nhật này.'};
    const qtyOf=(nv,id)=>Number(nv.tuiDo?.[id]||0);
    const r=gameTx(ctx=>{
      const lst=Array.isArray(ctx.run.vktDon)?ctx.run.vktDon:[],o=lst.find(x=>x.id===oid),nv=ctx.run.nhanVat;
      if(!o)return{ok:false,msg:'Không còn đơn này.'};
      const y=Number(ctx.run.nam)||0;
      if(y<o.readyYear)return{ok:false,msg:'Hàng chưa về.'};
      if(y>o.holdUntil)return{ok:false,msg:'Đơn đã quá hạn giữ.'};
      const rest=Math.max(0,o.total-o.deposit),have=Number(nv.linhThach)||0;
      if(have<rest)return{ok:false,short:true,msg:`Chưa đủ linh thạch: cần ${F(rest)}, đang có ${F(have)}. ${(o.ext||0)<ORDER_CFG.maxExtend?`Có thể bấm "Giữ thêm ${ORDER_CFG.holdYears} năm" (phí ${F(Math.ceil(o.total*ORDER_CFG.extendFee))}).`:'Đơn này đã giữ thêm một lần, không giữ thêm được nữa.'}`};
      if(!T1.conCho(nv,ctx.content,o.item))return{ok:false,bag:true,msg:'Túi đầy! Hãy tự bán hoặc vứt bớt vật phẩm không cần thiết, rồi thanh toán lại.'};
      const before=qtyOf(nv,o.item);
      nv.linhThach=have-rest;
      const okAdd=T1.nhanVaoTui(ctx,o.item,o.qty);
      /* nhận không đủ (túi chỉ chứa được một phần / để riêng chờ cất) → ném lỗi để game hoàn lại TOÀN BỘ, không mất tiền */
      if(okAdd===false||qtyOf(ctx.run.nhanVat,o.item)-before<o.qty||(T1.coDoChoCat&&T1.coDoChoCat(ctx.run.nhanVat)))throw new Error('VKT_ABORT');
      const left=lst.filter(x=>x!==o);if(left.length)ctx.run.vktDon=left;else delete ctx.run.vktDon;
      return{ok:true,rest,qty:o.qty,item:o.item};
    });
    if(!r.ok)return r;
    return{ok:true,msg:`Vật phẩm «${itemName(r.item)}»${r.qty>1?' ×'+r.qty:''} đã được giao đến túi đồ của đạo hữu (đã trả nốt ${F(r.rest)} linh thạch).`};
  },
  extend(oid){
    const o0=this.find(oid);if(!o0)return{ok:false,msg:'Không còn đơn này.'};
    const r=gameTx(ctx=>{
      const o=(ctx.run.vktDon||[]).find(x=>x.id===oid),nv=ctx.run.nhanVat;
      if(!o)return{ok:false,msg:'Không còn đơn này.'};
      const y=Number(ctx.run.nam)||0;
      if(y>o.holdUntil)return{ok:false,msg:'Đơn đã quá hạn giữ.'};
      if((o.ext||0)>=ORDER_CFG.maxExtend)return{ok:false,msg:'Đơn này đã giữ thêm một lần rồi, không giữ thêm được nữa.'};
      const fee=Math.ceil(o.total*ORDER_CFG.extendFee),have=Number(nv.linhThach)||0;
      if(have<fee)return{ok:false,msg:`Chưa đủ linh thạch trả phí giữ thêm: cần ${F(fee)}, đang có ${F(have)}.`};
      nv.linhThach=have-fee;o.holdUntil+=ORDER_CFG.holdYears;o.ext=(o.ext||0)+1;
      return{ok:true,fee,left:o.holdUntil-y,item:o.item};
    });
    if(!r.ok)return r;
    const fl=this.flags();if(fl.f[oid]){fl.f[oid].warned=false;fl.save()}
    return{ok:true,msg:`Đã giữ thêm ${ORDER_CFG.holdYears} năm cho «${itemName(r.item)}», phí ${F(r.fee)} linh thạch (hạn mới còn ${yrs(r.left)}).`};
  },
  check(){
    if(!run().nhanVat)return;
    const list=this.load();if(!list.length)return;
    const fl=this.flags();let dirty=false;
    for(const o of [...list]){
      const st=this.status(o),F0=fl.f[o.id]||(fl.f[o.id]={});
      if(st==='lost'){
        if(F0.lostShown)continue;F0.lostShown=true;dirty=true;
        const id=o.id,it=o.item,q=o.qty,dep=o.deposit;
        /* gỡ đơn quá hạn qua giao dịch của game, hoãn ra ngoài nhịp cập nhật hiện tại để khỏi chồng chéo */
        setTimeout(()=>{const r=gameTx(ctx=>{const l=(ctx.run.vktDon||[]).filter(x=>x.id!==id);if(l.length)ctx.run.vktDon=l;else delete ctx.run.vktDon;return{ok:true}});if(r.ok){Modal.push({title:'Quá hạn giữ hàng',html:`<p>Đạo hữu không thanh toán kịp nên <b>${E(itemName(it))}${q>1?' ×'+q:''}</b> đã bị người khác lấy mất, tiền cọc <b>${F(dep)}</b> linh thạch cũng không được hoàn lại.</p>`,btns:[{t:'Đã rõ'}]});if(ui.isOpen&&ui.tab==='items')VIEWS.items()}},0);
      }else if(st==='ready'&&!F0.told){
        F0.told=true;dirty=true;this.arrivalModal(o);
      }else if(st==='ready'&&!F0.warned&&o.holdUntil-nowYear()<=1){
        F0.warned=true;dirty=true;toast(`Sắp hết hạn giữ «${itemName(o.item)}» (còn ${yrs(o.holdUntil-nowYear())}). Hãy thanh toán hoặc giữ thêm.`,'',9000);
      }
    }
    if(dirty)fl.save();
  },
  arrivalModal(o){
    const rest=this.remaining(o);
    Modal.push({title:'Hàng đã về',html:`<p>Vật phẩm <b>${E(itemName(o.item))}${o.qty>1?' ×'+o.qty:''}</b> đã được giao tới.</p><p>Thanh toán nốt <b>${F(rest)}</b> linh thạch để nhận vào túi đồ (đạo hữu đang có ${F(money())}).</p><small>Hạn giữ hàng còn ${yrs(o.holdUntil-nowYear())}. Quá hạn sẽ mất hàng và cả tiền cọc ${F(o.deposit)}.${this.canExtend(o)?` Được giữ thêm 1 lần ${ORDER_CFG.holdYears} năm, phí ${F(this.extendFee(o))} (10%).`:''}</small>`,
      btns:[
        {t:'Thanh toán',pri:true,fn:()=>{const r=this.pay(o.id);if(!r.ok)return r.msg;toast(r.msg,'ok',6000);if(ui.tab==='items'&&ui.isOpen)VIEWS.items();else render()}},
        ...(this.canExtend(o)?[{t:`Giữ thêm ${ORDER_CFG.holdYears} năm (phí ${F(this.extendFee(o))})`,fn:()=>{const r=this.extend(o.id);if(!r.ok)return r.msg;toast(r.msg,'ok',6000)}}]:[]),
        {t:'Để sau'}
      ]});
  }
};
function syncGame(){}

function orderConfirm(id,qty,after){
  const blk=orderBlock(id);if(blk){toast(blk,'',5000);return}
  const total=orderUnit(id)*qty,dep=orderDeposit(total),rec=C.items.get(id),mult=orderMult(id);
  Modal.push({title:'Đặt hàng',html:`<p><b style="color:${phamColor(rec.pham_cap)}">${E(itemName(id))}</b>${qty>1?' ×'+qty:''} <small>(${E(GRADE_NAMES[rec.pham_cap]||'')})</small></p>
    <p>Giá: <b>${F(total)}</b> linh thạch <small>(giá gốc ${F(rec.gia)} × ${mult}${qty>1?' × '+qty:''})</small><br>Cọc ngay 30%: <b>${F(dep)}</b> · trả nốt khi nhận: <b>${F(total-dep)}</b><br>Hàng về sau <b>${yrs(orderWait(id))}</b>, giữ hàng ${ORDER_CFG.holdYears} năm kể từ lúc về (giữ thêm được 1 lần, phí 10%).</p>
    <small>Đạo hữu đang có ${F(money())} linh thạch. Quá hạn giữ mà chưa thanh toán sẽ mất hàng và tiền cọc.</small>`,
    btns:[{t:`Đặt hàng (cọc ${F(dep)})`,pri:true,fn:()=>{const r=ORD.place(id,qty);if(!r.ok)return r.msg;toast(r.msg,'ok',6000);after&&after()}},{t:'Thôi'}]});
}
/* Một dòng thao tác đặt hàng cho thẻ vật phẩm */
function orderRowHtml(id,r){
  const blk=orderBlock(id);
  if(blk)return`<small style="grid-column:1/3;color:var(--mute)">${E(blk)}</small>`;
  const o=ORD.byItem(id),mq=orderMaxQty(id);
  return`<div class="acts" style="grid-column:1/3"><input class="qty" type="number" inputmode="numeric" min="1" max="${mq}" value="1" aria-label="Số lượng"><button class="btn pri" data-order="${E(id)}">Đặt hàng</button></div><small style="grid-column:1/3">Giá ${F(orderUnit(id))}/món (×${orderMult(id)}) · cọc ${F(orderDeposit(orderUnit(id)))} · về sau ${yrs(orderWait(id))}${o?` · <b>đang có đơn</b>`:''}</small>`;
}
/* Danh sách món còn thiếu của bộ giả định, kèm nút đặt hàng */
function missingOrderHtml(ids){
  const rows=A(ids).map(id=>{
    const blk=orderBlock(id),o=ORD.byItem(id),rec=C.items.get(id)||{};
    let act;
    if(o){const st=ORD.status(o);act=st==='wait'?`<span class="tag o">Đã đặt · về sau ${yrs(o.readyYear-nowYear())}</span>`:`<span class="tag g">Hàng đã về</span> <button class="btn" data-order-go="1" style="flex:none;padding:2px 8px;font-size:12px">Thanh toán</button>`}
    else if(blk)act=`<span class="tag r" title="${E(blk)}">Không đặt được</span>`;
 else if(money()<orderDeposit(orderUnit(id)))act=`<span class="tag o" title="Cần ${F(orderDeposit(orderUnit(id)))} linh thạch đặt cọc">Chưa đủ tiền cọc ${F(orderDeposit(orderUnit(id)))}</span>`;
    else act=`<button class="btn pri" data-order-item="${E(id)}" style="flex:none;padding:2px 8px;font-size:12px">Đặt hàng · cọc ${F(orderDeposit(orderUnit(id)))}</button>`;
    return`<div class="card" style="grid-template-columns:auto 1fr auto;padding:6px 8px">${itemIco(id,30)}<div><b style="color:${phamColor(rec.pham_cap)}">${E(itemName(id))}</b><small> ${E(GRADE_NAMES[rec.pham_cap]||'')}${blk?' · '+E(blk):` · giá ${F(orderUnit(id))}`}</small></div><div class="side">${act}</div></div>`;
  }).join('');
  return`<div class="sub" style="margin:6px 0 2px"><b>Còn thiếu ${A(ids).length} món</b> — cần đủ trong túi mới xếp được:</div>${rows}`;
}
/* Tab con: Đã đặt hàng */
function viewOrders(){
  const list=ORD.load().slice().sort((a,b)=>a.readyYear-b.readyYear);
  const locked=list.reduce((t,o)=>t+o.deposit,0);
  const cards=list.map(o=>{
    const st=ORD.status(o),rec=C.items.get(o.item)||{},rest=ORD.remaining(o);
    const status=st==='wait'?`<span class="tag o">Chờ hàng · còn ${yrs(o.readyYear-nowYear())}</span>`:`<span class="tag g">Hàng đã về</span> <small>hạn giữ còn ${yrs(o.holdUntil-nowYear())}</small>`;
    const acts=st==='ready'?`<div class="acts" style="grid-column:1/4"><button class="btn pri" data-pay="${o.id}">Thanh toán ${F(rest)}</button>${ORD.canExtend(o)?`<button class="btn" data-ext="${o.id}">Giữ thêm ${ORDER_CFG.holdYears} năm · phí ${F(ORD.extendFee(o))}</button>`:''}</div>`:'';
    return`<article class="card" style="grid-template-columns:auto 1fr auto">${itemIco(o.item,36)}<div><b style="color:${phamColor(rec.pham_cap)}">${E(itemName(o.item))}${o.qty>1?' ×'+o.qty:''}</b><small>${E(GRADE_NAMES[rec.pham_cap]||'')} · giá ${F(o.total)} · đã cọc ${F(o.deposit)} · còn nợ ${F(rest)}</small></div><div class="side">${status}</div>${acts}<small class="addmsg" style="grid-column:1/3"></small></article>`;
  }).join('');
  body.insertAdjacentHTML('beforeend',`<div class="sub" style="margin:8px 0">Linh thạch đang có: <b>${F(money())}</b> · tiền cọc đang giữ: <b>${F(locked)}</b> · ${list.length} đơn</div>${cards||'<div class="empty">Chưa có đơn đặt hàng nào. Vào "Danh sách", chọn món rồi bấm Đặt hàng.</div>'}<div class="sub" style="margin-top:10px">Luật: cọc 30% khi đặt · hàng về sau 0,5–5 năm tùy phẩm · về rồi trả nốt để nhận vào túi · hàng về được giữ ${ORDER_CFG.holdYears} năm · giữ thêm được 1 lần ${ORDER_CFG.holdYears} năm, phí 10% giá đơn · quá hạn mất hàng và tiền cọc · hệ số giá: Phàm→Thiên ×1…×5, Tiên ×7, Thần ×10 · Nghịch Thiên (dị bảo) không đặt được.</div>`);
  const redo=()=>{VIEWS.items()};
  $$(body,'[data-pay]').forEach(b=>b.onclick=()=>{const card=b.closest('.card'),r=ORD.pay(b.dataset.pay);if(r.ok){toast(r.msg,'ok',6000);redo()}else{$(card,'.addmsg').textContent=r.msg;$(card,'.addmsg').style.color='#a3342b';if(r.bag)bagFullModal()}});
  $$(body,'[data-ext]').forEach(b=>b.onclick=()=>{const r=ORD.extend(b.dataset.ext);toast(r.msg,r.ok?'ok':'',5000);redo()});
}

/* ───────── Tab: Vật phẩm ───────── */
const TYPE_NAMES={cong_phap:'Công pháp',phap_khi:'Pháp khí',dan_duoc:'Đan dược',nguyen_lieu:'Nguyên liệu',linh_duoc:'Linh dược',yeu_tai:'Yêu tài',phu_luc:'Phù lục',tran_ban:'Trận bàn',don_phuong:'Đơn phương',dung_cu:'Dụng cụ',di_hoa:'Dị hỏa',dac_san:'Đặc sản',phuong_tien:'Phương tiện',tru_vat:'Trữ vật',trung_thu:'Trứng thú',lenh_bai:'Lệnh bài',tran_van:'Trận văn',khac:'Khác'};
const GRADE_NAMES={1:'Phàm phẩm',2:'Hoàng phẩm',3:'Huyền phẩm',4:'Địa phẩm',5:'Thiên phẩm',6:'Tiên phẩm',7:'Thần phẩm',8:'Nghịch Thiên'};
let itemIdx=null;
const itemIndex=()=>itemIdx||(itemIdx=[...C.items].map(([id,r])=>({id,r,name:T(r.ten||id),key:norm(`${r.ten||''} ${TYPE_NAMES[r.loai]||r.loai||''} ${A(r.tag).join(' ')} ${A(r.he).join(' ')}`)})).sort((a,b)=>a.name.localeCompare(b.name,'vi')));
const itemUi={q:'',type:'all',grade:'all',he:'all',bag:false,limit:30};
const inBag=id=>Number(me().tuiDo?.[id]||0),waiting=id=>Number(me().choCat?.[id]||0);
/* ───────── Tab con: Tìm theo hình (công pháp / pháp khí) ───────── */
const PHAM_COLOR_DEF={1:'#2b2b2b',2:'#4f8a3c',3:'#4a68a6',4:'#7a4ba3',5:'#c9661a',6:'#c64a96',7:'#b52a24',8:'#8a4fc0'};
let gameColors=null;
function detectGameColors(){
  if(gameColors)return gameColors;
  const out={he:{},pham:{}};
  try{
    for(const sh of document.styleSheets){
      let rules;try{rules=sh.cssRules}catch{continue}
      for(const r of rules||[]){
        const sel=r.selectorText,col=r.style&&r.style.color;
        if(!sel||!col)continue;
        let m=sel.match(/\.(?:pham|grade|rarity|q|p)[-_]?([1-8])\b/i);if(m&&!out.pham[m[1]])out.pham[m[1]]=col;
        m=sel.match(/\.(?:he|el|element|hanh)[-_](kim|moc|thuy|hoa|tho|bang|loi|phong|am|vo_sac)\b/i);if(m&&!out.he[m[1].toLowerCase()])out.he[m[1].toLowerCase()]=col;
      }
    }
  }catch{}
  return gameColors=out;
}
const heColor=h=>detectGameColors().he[h]||(h==='am'?'#9a86c8':HE_COLOR[h])||'#ccc';
const phamColor=p=>detectGameColors().pham[p]||PHAM_COLOR_DEF[p]||'#ccc';
const heHtml=list=>A(list).map(h=>`<span style="background:${heColor(h)};color:${h==='am'?'#f0e9d6':'#2b2b2b'};font-weight:600;padding:0 5px;border:1px solid rgba(43,43,43,.3)">${E(ELEMENT_NAMES[h]||h)}</span>`).join(' ');
const gradeHtml=p=>N(p)?`<span style="color:${phamColor(p)};font-weight:700">${E(GRADE_NAMES[p]||('Phẩm '+p))}</span>`:'';
const shapeUi={cells:new Set(),tab:'exact',loai:'all',mirror:false,grade:'all',res:null,limit:20};
const SHAPE_N=7;
const parseHinh=h=>{
  const out=[];
  A(h).forEach((row,y)=>{[...String(row)].forEach((ch,x)=>{if(ch!==' '&&ch!=='.'&&ch!=='-'&&ch!=='_'&&ch!=='0')out.push([x,y])})});
  return out;
};
const canonShape=(pts,mirror)=>{
  if(!pts.length)return '';
  const norm1=p=>{const mx=Math.min(...p.map(q=>q[0])),my=Math.min(...p.map(q=>q[1]));return p.map(q=>[q[0]-mx,q[1]-my]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]).map(q=>q.join(',')).join(';')};
  const rot=p=>p.map(([x,y])=>[-y,x]);
  const flip=p=>p.map(([x,y])=>[-x,y]);
  let best=null;
  for(const base of mirror?[pts,flip(pts)]:[pts]){
    let cur=base;
    for(let r=0;r<4;r++){const k=norm1(cur);if(best===null||k<best)best=k;cur=rot(cur)}
  }
  return best;
};
let shapeIdxCache=null;
const shapeIndex=()=>{
  if(shapeIdxCache)return shapeIdxCache;
  const rows=[];
  for(const [id,r] of C.items){
    if(r.loai!=='cong_phap'&&r.loai!=='phap_khi')continue;
    if(!Array.isArray(r.hinh))continue;
    const pts=parseHinh(r.hinh);
    if(!pts.length)continue;
    rows.push({id,r,pts,n:pts.length,k0:canonShape(pts,false),k1:canonShape(pts,true)});
  }
  return shapeIdxCache=rows;
};
const PASSIVE_LABEL={toc_do:'Tốc độ tu luyện',dot_pha:'Tỉ lệ đột phá',khi_huyet:'Khí huyết',ho_the:'Hộ thể',khang_tam_ma:'Kháng tâm ma'};
function passiveLines(bd){
  const out=[];if(!bd)return out;
  let defs=null;
  try{const core=window.tuTien?.core||{};defs=core['character/statDefs']?.STAT_DEFS||null}catch{}
  const fmt=(v,unit)=>unit==='pct'?('+'+F(v*100)+'%'):((v>0?'+':'')+F(v));
  const byKey=new Map();
  if(defs)for(const d of defs)byKey.set(d.key,d);
  for(const [k,v] of Object.entries(bd)){
    if(k==='chi_so'&&v&&typeof v==='object'){
      for(const [c,x] of Object.entries(v)){const d=byKey.get('chi_so.'+c);out.push((d?.label||c)+' '+fmt(Number(x),d?.unit||'flat'))}
      continue;
    }
    if(!N(v))continue;
    const d=byKey.get(k);
    out.push((d?.label||PASSIVE_LABEL[k]||k)+' '+fmt(Number(v),d?.unit||(Math.abs(v)<1?'pct':'flat')));
  }
  return out;
}
const DANG_NAME={cong:'Công',thu:'Thủ',khong_che:'Khống chế',hoi_phuc:'Hồi phục'};
function shapeCardHtml(r,id){
  const pts=parseHinh(r.hinh);
  const w=Math.max(...pts.map(p=>p[0]))+1,h=Math.max(...pts.map(p=>p[1]))+1;
  const on=new Set(pts.map(p=>p.join(',')));
  let mini=`<div style="display:grid;grid-template-columns:repeat(${w},13px);gap:2px;flex:none">`;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)mini+=`<i style="width:13px;height:13px;border-radius:2px;background:${on.has(x+','+y)?'var(--gold)':'rgba(43,43,43,.07)'}"></i>`;
  mini+='</div>';
  let kind=TYPE_NAMES[r.loai]||r.loai||'';
  try{const f=window.tuTien?.core?.['character/pieces']?.itemKindName||window.tuTien?.core?.['index']?.itemKindName;if(typeof f==='function')kind=f(r)||kind}catch{}
  const ch=r.chieu;
  const lines=[];
  if(N(r.linh_luc))lines.push(`Linh lực gốc/lượt: <b>${F(r.linh_luc)}</b>`);
  if(ch)lines.push(`Chiêu <b>${E(T(ch.ten||''))}</b> · ${E(DANG_NAME[ch.dang]||ch.dang||'')} · phí ${F(ch.phi||0)} · hồi ${F(ch.hoi||0)} · uy ${F(ch.uy||0)}`);
  const pl=passiveLines(r.bi_dong);
  if(pl.length)lines.push('Bị động: '+E(pl.join(' · ')));
  if(A(r.he).length>1)lines.push('Mảnh đa hệ: '+heHtml(r.he));
  if(r.tran_phai)lines.push('Trận phái: '+E(String(r.tran_phai)));
  const tags=A(r.tag).filter(Boolean);
  const own=inBag(id);
  return `<article class="card" data-item="${E(id)}" style="grid-template-columns:auto 1fr;gap:10px;align-items:start;border-left:3px solid ${phamColor(r.pham_cap)}">${mini}<div>
    <b style="color:${phamColor(r.pham_cap)}">${E(T(r.ten||id))}</b>${own>0?` <small>(túi: ${F(own)})</small>`:''}
    <small style="display:block">${E(kind)} · ${gradeHtml(r.pham_cap)}${N(r.canh_gioi)?` · ${E(cgTen(r.canh_gioi)||('cảnh '+r.canh_gioi))}`:''}${A(r.he).length?' · '+heHtml(r.he):''} · ${pts.length} ô</small>
    ${lines.map(l=>`<small style="display:block;margin-top:2px">${l}</small>`).join('')}
    ${r.mo_ta?`<small style="display:block;margin-top:3px;opacity:.75">${E(T(r.mo_ta))}</small>`:''}
    ${tags.length?`<small style="display:block;margin-top:2px;opacity:.6">${E(tags.join(' · '))}</small>`:''}
    ${r.gia?`<small style="display:block;opacity:.6">Giá ${F(r.gia)}</small>`:''}
  </div></article>`;
}
/* small ⊆ big (cho phép xoay 90°, tuỳ chọn lật gương, tịnh tiến): mảnh `small` đặt vừa vào vùng `big` */
function shapeFits(small,big,mirror){
  if(!small.length||small.length>big.length)return false;
  const bigSet=new Set(big.map(q=>q.join(',')));
  const rot=p=>p.map(([x,y])=>[-y,x]),flip=p=>p.map(([x,y])=>[-x,y]);
  for(const base of mirror?[small,flip(small)]:[small]){
    let cur=base;
    for(let r=0;r<4;r++){
      const a0=cur[0];
      for(const b0 of big){
        const dx=b0[0]-a0[0],dy=b0[1]-a0[1];
        if(cur.every(q=>bigSet.has((q[0]+dx)+','+(q[1]+dy))))return true;
      }
      cur=rot(cur);
    }
  }
  return false;
}
function shapeSearch(){
  const pts=[...shapeUi.cells].map(s=>s.split(',').map(Number));
  if(!pts.length){shapeUi.res=null;return}
  const key=canonShape(pts,shapeUi.mirror);
  const pass=x=>(shapeUi.loai==='all'||x.r.loai===shapeUi.loai)&&(shapeUi.grade==='all'||String(x.r.pham_cap)===shapeUi.grade);
  const exact=[],fit=[],contain=[];
  for(const x of shapeIndex()){
    if(!pass(x))continue;
    if(x.n===pts.length&&(shapeUi.mirror?x.k1:x.k0)===key){exact.push(x);continue}
    if(x.n<pts.length&&shapeFits(x.pts,pts,shapeUi.mirror))fit.push(x);
    else if(x.n>pts.length&&shapeFits(pts,x.pts,shapeUi.mirror))contain.push(x);
  }
  const byGrade=(a,b)=>(b.r.pham_cap||0)-(a.r.pham_cap||0)||String(a.r.ten).localeCompare(String(b.r.ten),'vi');
  exact.sort(byGrade);
  fit.sort((a,b)=>b.n-a.n||byGrade(a,b));       // lấp được nhiều ô nhất trước
  contain.sort((a,b)=>a.n-b.n||byGrade(a,b));   // sát hình vẽ nhất trước
  shapeUi.res={n:pts.length,exact:exact.map(x=>x.id),fit:fit.map(x=>x.id),contain:contain.map(x=>x.id)};
}
let shapeTimer=null;
const shapeLive=()=>{clearTimeout(shapeTimer);shapeTimer=setTimeout(()=>{shapeSearch();renderShapeResults()},120)};
function renderShapeResults(){
  const box=$(body,'#sh-res');if(!box)return;
  const r=shapeUi.res;
  if(!r){box.innerHTML='<div class="sub">Vẽ tới đâu lọc tới đó. Chưa vẽ ô nào.</div>';return}
  const tabs=[['exact','Khớp đúng',r.exact],['fit','Ráp vừa',r.fit],['contain','Chứa hình',r.contain]];
  if(!tabs.find(t=>t[0]===shapeUi.tab&&t[2].length)){const f=tabs.find(t=>t[2].length);if(f)shapeUi.tab=f[0]}
  const cur=tabs.find(t=>t[0]===shapeUi.tab)||tabs[0];
  const hint={exact:'Cùng hình với hình vẽ (xoay 90° vẫn khớp).',fit:'Mảnh nhỏ hơn, đặt lọt trong vùng đã vẽ — nhiều ô nhất trước.',contain:'Mảnh lớn hơn, hình vẽ nằm trọn bên trong — sát hình nhất trước.'}[cur[0]];
  const lim=shapeUi.limit;
  box.innerHTML=`<div class="bar" style="gap:6px;flex-wrap:wrap">${tabs.map(([k,t,ids])=>`<button class="chip ${k===cur[0]?'on':''}" data-shtab="${k}">${t} (${F(ids.length)})</button>`).join('')}</div>
    <div class="sub">Hình ${r.n} ô${shapeUi.mirror?' · cho lật gương':''} — ${E(hint)}</div>`
    +(cur[2].slice(0,lim).map(id=>shapeCardHtml(C.items.get(id),id)).join('')||'<div class="sub">Không có mảnh nào ở nhóm này.</div>')
    +(cur[2].length>lim?'<button class="btn" id="sh-more" style="width:100%">Xem thêm</button>':'');
  $$(box,'[data-shtab]').forEach(b=>b.onclick=()=>{shapeUi.tab=b.dataset.shtab;shapeUi.limit=20;renderShapeResults()});
  $(box,'#sh-more')?.addEventListener('click',()=>{shapeUi.limit+=20;renderShapeResults()});
}
function viewShapeSearch(){
  const grades=[...new Set(shapeIndex().map(x=>x.r.pham_cap).filter(N))].sort((a,b)=>a-b);
  let cells='';
  for(let y=0;y<SHAPE_N;y++)for(let x=0;x<SHAPE_N;x++){
    const on=shapeUi.cells.has(x+','+y);
    cells+=`<div class="shc" data-c="${x},${y}" style="aspect-ratio:1;border-radius:4px;cursor:pointer;border:1px solid rgba(43,43,43,.3);background:${on?'var(--gold)':'rgba(43,43,43,.06)'}"></div>`;
  }
  body.insertAdjacentHTML('beforeend',`<div class="panel"><b style="color:var(--gold)">Tìm công pháp / pháp khí theo hình</b>
    <div class="sub">Chấm hoặc kéo để vẽ (lưới ${SHAPE_N}×${SHAPE_N}); kết quả lọc ngay khi vẽ. Vị trí trên lưới không quan trọng, xoay 90° vẫn khớp.</div>
    <div id="sh-grid" style="display:grid;grid-template-columns:repeat(${SHAPE_N},1fr);gap:3px;max-width:300px;margin:8px 0;touch-action:none;user-select:none">${cells}</div>
    <div class="bar" style="flex-wrap:wrap;gap:6px">
      <select id="sh-loai"><option value="all">Công pháp + Pháp khí</option><option value="cong_phap" ${shapeUi.loai==='cong_phap'?'selected':''}>Chỉ công pháp</option><option value="phap_khi" ${shapeUi.loai==='phap_khi'?'selected':''}>Chỉ pháp khí</option></select>
      <select id="sh-grade"><option value="all">Mọi phẩm</option>${grades.map(g2=>`<option value="${g2}" ${String(shapeUi.grade)===String(g2)?'selected':''}>${E(GRADE_NAMES[g2]||('Phẩm '+g2))}</option>`).join('')}</select>
      <button class="chip ${shapeUi.mirror?'on':''}" id="sh-mirror">Cho lật gương</button>
    </div>
    <div class="bar" style="gap:6px"><button class="btn pri" id="sh-go">Tìm lại</button><button class="btn" id="sh-clear">Xóa hình</button><span class="sub" id="sh-cnt">${shapeUi.cells.size} ô</span></div>
  </div><div id="sh-res"></div>`);
  const grid=$(body,'#sh-grid');
  const paint=(el,val)=>{
    const c=el?.dataset?.c;if(!c)return;
    if(val)shapeUi.cells.add(c);else shapeUi.cells.delete(c);
    el.style.background=val?'var(--gold)':'rgba(43,43,43,.06)';
    $(body,'#sh-cnt').textContent=shapeUi.cells.size+' ô';
    shapeLive();
  };
  let painting=null;
  const rootN=panel.getRootNode();
  const at=e=>{const el=(rootN.elementFromPoint?rootN:document).elementFromPoint(e.clientX,e.clientY);return el&&el.closest?el.closest('.shc'):null};
  grid.addEventListener('pointerdown',e=>{const el=at(e);if(!el)return;e.preventDefault();painting=!shapeUi.cells.has(el.dataset.c);paint(el,painting);try{grid.setPointerCapture(e.pointerId)}catch{}});
  grid.addEventListener('pointermove',e=>{if(painting===null)return;const el=at(e);if(el)paint(el,painting)});
  const stop=()=>{painting=null};
  grid.addEventListener('pointerup',stop);grid.addEventListener('pointercancel',stop);
  $(body,'#sh-loai').onchange=e=>{shapeUi.loai=e.target.value;shapeLive()};
  $(body,'#sh-grade').onchange=e=>{shapeUi.grade=e.target.value;shapeLive()};
  $(body,'#sh-mirror').onclick=e=>{shapeUi.mirror=!shapeUi.mirror;e.currentTarget.classList.toggle('on',shapeUi.mirror);shapeLive()};
  $(body,'#sh-clear').onclick=()=>{shapeUi.cells.clear();shapeUi.res=null;$$(body,'.shc').forEach(el=>el.style.background='rgba(43,43,43,.06)');$(body,'#sh-cnt').textContent='0 ô';renderShapeResults()};
  $(body,'#sh-go').onclick=()=>{shapeSearch();renderShapeResults()};
  if(shapeUi.cells.size&&!shapeUi.res)shapeSearch();
  renderShapeResults();
}

const itemSub={v:'list'};
VIEWS.items=()=>{
  if(itemSub.v==='shape')body.innerHTML='';else if(itemSub.v==='orders')body.innerHTML='';else VIEWS.itemsList();
  const bar=`<div class="bar" id="i-sub" style="gap:6px"><button class="chip ${itemSub.v==='list'?'on':''}" data-sub="list">Danh sách</button><button class="chip ${itemSub.v==='shape'?'on':''}" data-sub="shape">Tìm theo hình</button><button class="chip ${itemSub.v==='orders'?'on':''}" data-sub="orders">Đã đặt hàng${ORD.load().length?` (${ORD.load().length}${ORD.readyCount()?' · '+ORD.readyCount()+' đã về':''})`:''}</button></div>`;
  body.insertAdjacentHTML('afterbegin',bar);
  $$(body,'#i-sub [data-sub]').forEach(b=>b.onclick=()=>{itemSub.v=b.dataset.sub;VIEWS.items()});
  if(itemSub.v==='shape')viewShapeSearch();
  if(itemSub.v==='orders')viewOrders();
};
VIEWS.itemsList=()=>{
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
  ${shown.map(({id,r})=>`<article class="card" data-item="${E(id)}" style="grid-template-columns:auto 1fr auto">${itemIco(id,36)}<div><b style="color:${phamColor(r.pham_cap)}">${E(T(r.ten||id))}</b><small>${E(TYPE_NAMES[r.loai]||r.loai||'')} · ${gradeHtml(r.pham_cap)}${N(r.canh_gioi)?` · ${E(cgTen(r.canh_gioi)||('cảnh '+r.canh_gioi))}`:''}${A(r.he).length?' · '+heHtml(r.he):''}</small></div><div class="side">${inBag(id)?`Túi: ${F(inBag(id))}`:''}${waiting(id)?`<small>Chờ cất: ${F(waiting(id))}</small>`:''}</div>${r.mo_ta?`<small style="grid-column:1/3">${E(T(r.mo_ta).slice(0,140))}</small>`:''}${orderRowHtml(id,r)}</article>`).join('')||'<div class="empty">Không tìm thấy vật phẩm.</div>'}
  ${all.length>shown.length?'<button class="btn" id="i-more" style="width:100%">Xem thêm</button>':''}`;
  let t;$(body,'#i-q').oninput=e=>{itemUi.q=e.target.value;itemUi.limit=30;clearTimeout(t);t=setTimeout(()=>{VIEWS.items();const i=$(body,'#i-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)};
  $(body,'#i-type').onchange=e=>{itemUi.type=e.target.value;if(itemUi.type!=='cong_phap'&&itemUi.type!=='phap_khi')itemUi.he='all';itemUi.limit=30;render()};
  $(body,'#i-grade').onchange=e=>{itemUi.grade=e.target.value;itemUi.limit=30;render()};
  $(body,'#i-he')&&($(body,'#i-he').onchange=e=>{itemUi.he=e.target.value;itemUi.limit=30;render()});
  $(body,'#i-bag').onclick=()=>{itemUi.bag=!itemUi.bag;itemUi.limit=30;render()};
  $(body,'#i-more')?.addEventListener('click',()=>{itemUi.limit+=30;render()});
  $$(body,'[data-order]').forEach(b=>b.onclick=()=>{const card=b.closest('[data-item]'),q=Math.max(1,Math.floor(Number($(card,'.qty').value)||1));orderConfirm(b.dataset.order,q,()=>VIEWS.items())});
  $$(body,'.qty').forEach(i=>i.onkeydown=e=>{if(e.key==='Enter')i.closest('[data-item]').querySelector('[data-order]')?.click()});
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
          for(const dan of sets)for(const thieuDot of burn){try{const z=K.kR(coreContext(),{dan,thieuDot});options.push({dan,thieuDot,rate:z.tiLe,burn:thieuDot?A(h.thieuDot)[thieuDot-1]?.nam:null,nguon:A(z.nguon)})}catch{}}
          options.sort((a,b)=>b.rate-a.rate)}catch{}
      }catch{}
    }
    const nm=id=>T(C.items.get(id)?.ten||id),top=cg>=REALMS.length-1&&tc>=3,done=N(need)&&need<=0,ok=!done&&years!==null&&left!==null?years<left-5:null;
    $(body,'#bt-state').innerHTML=left!==null?`Thọ ${F(Math.floor(nv.tuoi||0))} / ${F(life)} · còn <b>${fmtTime(left)}</b>`:(K?'Chưa đọc được thọ nguyên.':'Chưa chuẩn bị được phép tính của game — mở tab Kiểm tra để xem chi tiết.');
    /* 1. kế hoạch tu luyện */
    if(top||done)out.push(`<h3>${grpIco('tu_luyen',20)}Tu vi</h3><div class="panel"><div class="sub">${top?`${REALMS[cg]} Đại viên mãn là mức cao nhất mà game hiện có — không còn cảnh giới kế để đột phá. Việc còn lại là giữ thọ nguyên và tìm cơ duyên.`:'Tu vi đã đủ Đại viên mãn, chỉ còn chờ đột phá lên cảnh giới kế.'}</div></div>`);
    else out.push(`<h3>${grpIco('tu_luyen',20)}Kế hoạch tới Đại viên mãn</h3><div class="panel"><div class="stats"><div>Tu vi còn thiếu<b>${N(need)?F(need):'?'}</b></div><div>Tới tiểu cảnh kế<b>${N(nextNeed)?F(nextNeed):'?'}</b></div><div>Tu vi mỗi năm<b>${N(retreat?.tuViNam)?F(retreat.tuViNam):'—'}</b></div></div>${years!==null?`<div class="sub">Bế quan tại đây cần khoảng <b>${fmtTime(years)}</b>.</div>`:''}${ok===null?'':`<div class="tags" style="margin-top:6px"><span class="tag ${ok?'g':'r'}">${ok?'Kịp: còn dư thọ an toàn':'Không kịp: thọ hiện có không đủ nếu bế quan ở đây'}</span></div>`}${retreat?.chan?`<div class="tags" style="margin-top:6px"><span class="tag r">Chỗ này không bế quan được: ${E(retreat.chan)}</span></div>`:''}${stagn?'<div class="tags" style="margin-top:6px"><span class="tag o">Lịch luyện có thể cạn giữa chừng, nên xen kẽ đi đánh hoặc đi xa.</span></div>':''}<div class="sub" style="margin-top:6px">Mỗi nơi bế quan cho tu vi mỗi năm khác nhau (linh mạch, động phủ, tông môn). Nếu không kịp, hãy đổi chỗ bế quan hoặc kéo dài thọ nguyên.</div></div>`);
    /* 2. bình cảnh */
    if(!top&&!done){const barrier=effectItems('pha_binh_canh').filter(it=>{const e=effectOf(it,'pha_binh_canh');return e?.canh_gioi===cg}).sort((a,b)=>inBag(b.id)-inBag(a.id));
    out.push(`<h3>${grpIco('tu_luyen',20)}Bình cảnh trong tiểu cảnh</h3><div class="panel"><div class="sub">Tu vi đầy một tiểu cảnh thì phần dư dồn vào bình cảnh; chưa tích đủ thì chưa lên được. Đan phá chướng chỉ dùng được khi đã chạm bình cảnh, và cộng thêm một phần tỉ lệ vào bình cảnh (game cũng tự dùng đan đã chuẩn bị khi chạm bình cảnh)${nv.binhCanh>0?` — bạn đang tích ${F(nv.binhCanh)}.`:'.'}</div>${barrier.map(it=>pillRow(it,`phá ${F((effectOf(it,'pha_binh_canh')?.phan||0)*100)}% bình cảnh`)).join('')||'<div class="sub">Cảnh giới này không có đan phá chướng riêng.</div>'}</div>`)}
    /* 3. đột phá */
    const next=cg+1,pills=[...C.items.values()].filter(it=>it.dot_pha&&typeof it.dot_pha==='object'&&(it.dot_pha.canh_gioi===undefined||it.dot_pha.canh_gioi===next)).sort((a,b)=>(b.dot_pha?.ti_le||0)-(a.dot_pha?.ti_le||0)).slice(0,10);
    const best=options[0];
    const srcRows=best&&best.nguon.length?`<div class="sub" style="margin:8px 0 4px">Từng khoản trong phương án tốt nhất (game tính)</div>${best.nguon.map(n=>`<div class="row"><span>${E(T(n.ten))}</span><b style="color:${n.gt<0?'#a3342b':'inherit'}">${n.gt>=0?'+':''}${F(Math.round(n.gt*1000)/10)}%</b></div>`).join('')}`:'';
    if(!top)out.push(`<h3>${grpIco('tu_luyen',20)}Đột phá lên ${E(REALMS[next]||'cảnh giới kế')}</h3><div class="panel">${base!==null?`<div class="sub">Không dùng gì: <b>${F(base*100)}%</b></div>`:'<div class="sub">Chưa tính được tỉ lệ ở trạng thái hiện tại (cần đạt Đại viên mãn).</div>'}${best?`<div class="tags" style="margin:6px 0"><span class="tag g">Tốt nhất với đồ đang có: ${best.dan.length?best.dan.map(nm).join(' + '):'không dùng đan'}${best.thieuDot?` · đốt ${best.thieuDot} nấc thọ${N(best.burn)?' (−'+F(best.burn)+' năm)':''}`:''} → ${F(best.rate*100)}%</span></div>`:''}${srcRows}${options.length>1?`<details><summary>Các phương án khác</summary>${options.slice(0,10).map(x=>`<div class="row"><span>${x.dan.length?x.dan.map(nm).join(' + '):'Không dùng đan'}${x.thieuDot?` · đốt ${x.thieuDot} nấc`:''}</span><b>${F(x.rate*100)}%</b></div>`).join('')}</details>`:''}<div class="sub" style="margin:8px 0 4px">Đan hỗ trợ đột phá</div>${pills.map(it=>pillRow(it,`+${F((it.dot_pha.ti_le||0)*100)}%`)).join('')||'<div class="sub">Không có đan phù hợp.</div>'}<div class="sub" style="margin-top:6px">Công pháp, pháp khí có nội tại "đột phá" trên kinh mạch cũng cộng thêm tỉ lệ — dùng tab Kinh mạch, chọn hướng Tu luyện.</div></div>`);
    /* 4. chấn tổn */
    const scar=Number(run().flags?.[`dot_pha_that_bai.${next}`]||0);
    if(scar>0){const heal=effectItems('heal_breakthrough_scar').filter(it=>Number(effectOf(it,'heal_breakthrough_scar'))===next);out.push(`<h3>${grpIco('tu_luyen',20)}Chấn tổn đột phá</h3><div class="panel"><div class="sub">Đạo cơ đang có <b>${scar}</b> vết rạn do đột phá thất bại, làm giảm tỉ lệ lần sau. Đan chữa chấn tổn:</div>${heal.map(it=>pillRow(it,'chữa 1 vết')).join('')||'<div class="sub">Không có đan chữa phù hợp.</div>'}</div>`)}
    /* 5. thọ nguyên */
    const lifeItems=effectItems('tho_nguyen').sort((a,b)=>(effectOf(b,'tho_nguyen')||0)-(effectOf(a,'tho_nguyen')||0));
    out.push(`<h3>${grpIco('tu_luyen',20)}Thọ nguyên</h3><div class="panel"><div class="sub">Thọ gốc theo cảnh giới: ${BASE_LIFE.map((v,i)=>`${REALMS[i]} ${v}`).join(' · ')}. Bạn được cộng thêm ${F(nv.thoNguyenThem||0)} năm${nv.lifespanLost?`, đã hao mất ${F(nv.lifespanLost)} năm`:''}.</div>${lifeItems.map(it=>pillRow(it,`+${F(effectOf(it,'tho_nguyen'))} năm`)).join('')||'<div class="sub">Không có vật phẩm kéo dài thọ nguyên.</div>'}<div class="sub" style="margin-top:6px">Dùng nhiều lần cùng loại đan thì càng về sau càng nhạt. Lên cảnh giới mới sẽ nâng thọ gốc.</div></div>`);
    $(body,'#bt-rest').innerHTML=out.join('');
  })();
};

/* ───────── Tab: Auto Farm (API game: enterNode / tocChienTran / leavePlace) ───────── */
/* ───────── Phân nhóm sự kiện (từ content game 2026-11-09): [nhóm, khóa, nhãn, số sự kiện, số sự kiện có cửa nguy, danh sách id bỏ "ev."] ───────── */
const AF_GROUPS=[["san","Săn yêu & thú dữ"],["hoang","Hoang dã & thám hiểm"],["bicanh","Bí cảnh · dị bảo · di tích"],["bienco","Biến cố dọc đường"],["thanh","Thành trấn & phong thổ"],["nhan","Nhân mạch & duyên"],["nghe","Nghề & ngự linh"],["treo","Treo thưởng & nhiệm vụ"],["tongmon","Tông môn"],["ta","Tà đạo & tâm ma"],["khac","Khác"]];
const AF_SUBS=[["nhan","ban_menh","Bản mệnh",2,0,"ev.ban_menh_lao_tho ev.ban_menh_truong_lao_giang"],["bicanh","bi_canh/chan_truyen","Bí cảnh · Chân truyền",3,1,"ev.bc_lien_thu_pha_cam ev.bc_chan_truyen_trong_thuong ev.bc_chan_truyen_chan_loi"],["bicanh","bi_canh/hung_dia","Bí cảnh · Hung địa",3,0,"ev.thien_co_cac ev.huyet_tri ev.hong_hoang_coc"],["bicanh","bi_canh/linh_vat","Bí cảnh · Linh vật",3,0,"ev.van_duoc_vien ev.han_bang_dong ev.thien_loi_tri"],["bicanh","bi_canh/loi_tat","Bí cảnh · Lối tắt",5,0,"ev.loi_tat_thu_cua ev.loi_tat_dan_duong ev.loi_tat_mo_cua_som ev.loi_tat_hon_giu_cong ev.loi_tat_yeu_vuc"],["bienco","bien_co/an_tinh_the_luc","Biến cố · Ẩn tình thế lực",9,0,"ev.bc_at_bi_vay_giua_duong ev.bc_at_trung_doc_trong_rung ev.bc_at_lo_dinh ev.at_trong_trung_linh_can ev.at_do_ba_chieu ev.at_son_mon_giu_khach ev.at_the_gia_moi_khach ev.at_tong_mon_moi_khach ev.at_uy_ap_ep_moi"],["bienco","bien_co/be_quan","Biến cố · Bế quan",35,6,"ev.bq_rung_hoi_am ev.bq_rung_tan_tu_rinh ev.bq_rung_to_nhen ev.bq_son_chu_hang ev.bq_son_tranh_linh_nhan ev.bq_son_bong_ung ev.bq_ho_suong_tanh ev.bq_ho_thuy_quy ev.bq_ho_tieng_hat ev.bq_mac_cat_dong ev.bq_mac_xin_nuoc ev.bq_mac_chuot_mo ev.bq_bang_tim_hoi_am ev.bq_bang_xac_trong_bang ev.bq_yv_tuan_lanh_dia ev.bq_yv_bay_nho ev.bq_yv_ma_tu_luyen_hon ev.bq_tt_trom_phong ev.bq_tt_ke_say_dap_cua ev.bq_tt_dom_tui ev.bq_tt_bo_khoai_kham ev.bq_tt_linh_don_kham ev.bq_tt_tieu_nhi_ban_tin ev.bq_tm_pha_cam_che ev.bq_tm_ma_tu_lan_vao ev.bq_tm_su_huynh_doi_cho ev.bq_tm_than_thuc_dom ev.bq_tm_tieng_tieu ev.bq_tm_chien_thu ev.bq_dp_yeu_doi_dat ev.bq_dp_tan_tu_chiem_phu ev.bq_dp_ke_lan_dau ev.bq_dp_thu_dao_vach ev.bq_dp_ke_thu_tim_toi ev.bq_dp_tham_bau"],["bienco","bien_co/di_tuong","Biến cố · Dị tượng",20,4,"ev.bc_dt_bao_quang ev.bc_dt_o_thu_giu_bao ev.bc_dt_tong_mon_phong_nui ev.bc_dt_lo_dan_co ev.bc_dt_co_bia_hien_chu ev.bc_dt_kiep_loi_xua_thu ev.bc_dt_tam_ma_lac_chu ev.bc_dt_di_vat_do_kiep ev.bc_dt_bam_tu_phuong_thi ev.bc_dt_thich_khach_quan_tro ev.bc_dt_chan_duong_doat_bao ev.bc_dt_bang_huu_moi_quen ev.bc_dt_mat_na_dong ev.bc_dt_tan_hon_duoi_nui ev.bc_dt_ngoc_gian_co_tu ev.bc_dt_tieng_noi_trong_dau ev.bc_dt_thon_vang_nguoi ev.bc_dt_gieng_hoa_do ev.bc_dt_doan_nguoi_bi_xich ev.bc_dt_te_dan_chin_cot"],["bienco","bien_co/duong","Biến cố · Đường đi",26,1,"ev.dc_cay_do_chan_loi ev.dc_bui_ram_dong ev.dc_tho_san_chay_toi ev.dc_doan_buon_bi_vay ev.dc_cau_treo ev.dc_nghi_gian_te ev.dc_bo_khoai_bat_nham ev.dc_tram_thu_phi ev.dc_thuy_quai_keo_chan ev.dc_hang_tru_bao_tuyet ev.dc_cat_sut ev.dc_bay_vay_lua_trai ev.dc_gia_nguoi_gap_nan ev.dc_ung_sa_xuong ev.dc_chan_giua_may ev.dc_huyet_te_tran ev.dc_ten_tam_doc ev.dc_bang_truy_na ev.dc_suong_do ev.dc_co_trung_giang ev.dc_canh_bang_che_troi ev.dc_nguyen_anh_doat_xa ev.dc_lao_ganh_cui ev.dc_nguoi_ngoi_xem ev.dau_gia_bam_duoi ev.dc_ganh_hang_rong"],["san","bien_co/hoang_da","Biến cố · Hoang dã",18,2,"ev.bc_hd_danh_hoi_linh_khi ev.bc_hd_soi_vay ev.bc_hd_gau_thuc_giac ev.bc_hd_thuy_yeu_keo_nguoi ev.bc_hd_bong_ung ev.bc_hd_bao_cat ev.bc_hd_thu_me_tim_con ev.bc_hd_bang_nut ev.bc_hd_tuan_son ev.bc_hd_dai_yeu_ve_hang ev.bc_hd_son_tac_vay ev.bc_hd_tan_tu_dom_ngo ev.bc_hd_cuu_kiem_khach ev.bc_hd_sat_thu_nham_nguoi ev.bc_hd_ma_tu_bat_hon ev.bc_hd_am_phong ev.bc_hd_linh_duoc_chin ev.bc_hd_to_nhen"],["bienco","bien_co/lao_quai","Biến cố · Lão quái",12,5,"ev.lq_thieu_nien_mat_gia ev.lq_khach_thuc_hai ev.lq_lao_ma_thay_xac ev.lq_lenh_truy_sat ev.lq_lao_to_xuat_quan ev.lq_cuoc_ba_chieu ev.lq_lao_quai_mua_tho ev.lq_dan_co_tieng_khoc ev.lq_nguoi_lam_chung ev.lq_lien_thu_tru_ma ev.lq_ho_phap_do_kiep ev.lq_nguyen_anh_lanh_nan"],["bienco","bien_co/noi_gian","Biến cố · Nội gián",3,2,"ev.bc_noi_gian_ma_dao ev.bc_noi_gian_chinh_dao ev.bc_noi_gian_lo"],["bienco","bien_co/phan_do","Biến cố · Phản đồ",3,0,"ev.bc_pd_chay_tron ev.bc_pd_hang_an ev.bc_pd_gui_boc"],["ta","bien_co/tam_ma","Biến cố · Tâm ma",9,9,"ev.tam_ma_tieng_go_cua ev.tam_ma_bong_tren_vach ev.tam_ma_mau_tren_tay ev.tam_ma_co_nhan_ve ev.tam_ma_tieng_thi_tham ev.tam_ma_guong_dong ev.tam_ma_doat_than ev.tam_ma_tram_mat ev.tam_ma_ho_mau"],["bienco","bien_co/thanh_tran","Biến cố · Thành trấn",25,5,"ev.bc_yeu_thu_vao_lang ev.bc_yeu_thu_so_cui ev.bc_ac_ba_thu_tien ev.bc_ke_say_gay_su ev.bc_ke_cap_cat_tui ev.bc_vu_gian_bac ev.bc_cong_tu_phi_xe ev.bc_gioi_nghiem_luong ev.bc_bo_khoai_doi_le ev.bc_khe_uoc_gia ev.bc_co_trong_tra ev.bc_gac_cong_dem_tuyet ev.bc_thuy_quy_ben ev.bc_mo_quang_thi_bien ev.bc_gian_te_bat_con_tin ev.bc_tu_cau_ken_re ev.bc_cuop_tien_trang ev.bc_ta_tu_khach_diem ev.bc_bi_bat_nham ev.bc_kiem_khach_doi_dau ev.bc_xac_chet_day ev.bc_sat_thu_trong_quan ev.bc_thu_trieu_pha_cong ev.bc_suong_den_nuot_pho ev.bc_lao_quai_doat_xa"],["san","bien_co/the_cuc","Biến cố · Thú cuồng",23,3,"ev.bc_hn_thu_cuong_vao_lang ev.bc_hn_bay_thu_danh_hoi ev.bc_hn_huyet_nguyet_lang ev.bc_hn_tu_si_mat_tri ev.bc_hn_mo_mo_dau_lang ev.dc_hn_quy_hoa_dan_loi ev.tt_giu_cong_thanh ev.tt_dot_thu_hai ev.tt_thu_vuong ev.bc_tt_dan_chay_nan ev.bc_tt_thu_lac_dan ev.gc_chieu_mo_ngoai_vien ev.dc_gc_hoi_theo_phe ev.dc_gc_nghi_gian_te ev.dc_gc_thuong_binh ev.bc_gc_trung_thu_luong ev.bc_hn_cong_dong_som ev.bc_hn_cho_te_huyet ev.bc_hn_co_nhan_phat_cuong ev.bc_hn_gieng_nhuom_do ev.bc_hn_cuong_si_go_cua ev.bc_mt_hem_toi_bat_nguoi ev.bc_mt_xac_kho_giua_pho"],["bienco","bien_co/the_luc","Biến cố · Thế lực",23,0,"ev.bc_tl_nhuong_duong ev.bc_tl_cuop_hang ev.bc_tl_treo_gheo ev.bc_tl_doi_mua_bao_vat ev.bc_tl_uc_hiep_tan_tu ev.bc_tl_danh_phu_khuan ev.bc_tl_hoi_muon_tien ev.bc_tl_tranh_cho_tra_lau ev.bc_tl_tranh_linh_duoc ev.bc_tl_thu_kiem ev.bc_tl_chan_truyen_ngua_mat ev.bc_tl_tuan_nui ev.bc_tl_tranh_con_moi ev.bc_tl_thu_chan_cua_tiem ev.bc_tl_thu_vay_quan_tro ev.bc_tl_thu_chien_thu ev.bc_tl_thu_cao_thi ev.bc_tl_cg_trieu_dinh_moi ev.bc_tl_cg_ep_ky_minh_uoc ev.bc_tl_cg_hich_tru_ma ev.bc_tl_cg_hoa_dam ev.bc_tl_cg_huyet_lenh ev.bc_tl_cg_bien_ai_cau_vien"],["bienco","bien_co/the_luc_dap_mat","Biến cố · Thế lực chạm mặt",7,0,"ev.tl_dm_ao_vai_vao_tiem ev.tl_dm_nha_gian_dau_gia ev.tl_dm_dung_ngoai_cua ev.tl_dm_dong_tien_duoi_dat ev.tl_dm_ba_chieu_giua_cho ev.tl_dm_lao_to_xuat_quan ev.tl_dm_uy_ap_cong_thanh"],["bienco","bien_co/tho_nguyen","Biến cố · Thọ nguyên",7,2,"ev.tho_dien_tho_dan ev.tho_tin_thai_tue ev.tho_huyet_tho_dan ev.tho_ho_phap_lan_cuoi ev.tho_ngo_dao_la_roi ev.tho_co_nhan_lam_chung ev.tho_mo_dong_nien"],["ta","bien_co/tru_ma","Biến cố · Trừ ma",9,0,"ev.tru_ma_kiem_tu_tuan_son ev.tru_ma_phu_chieu_ma ev.tru_ma_dao_si_giu_lang ev.tru_ma_chap_su_tran ev.tru_ma_kinh_chieu_ma ev.tru_ma_mieu_chuc_go_chuong ev.tru_ma_cam_ve_kinh_thanh ev.tru_ma_chap_phap_son_mon ev.tru_ma_la_han_tran"],["bienco","bien_co/truy_na","Biến cố · Truy nã",19,1,"ev.tn_chap_phap_quan_tro ev.tn_bo_khoai_bang_truy_na ev.tn_tho_san_tien_thuong ev.tn_tieu_nhi_bao_tin ev.tn_dam_dong_lanh_thuong ev.tn_truong_lao_dich_than ev.tn_ho_ve_thuong_hoi ev.tn_linh_don_ai_quan ev.tn_co_su_mieu ev.td_quan_tro ev.td_cong_thanh ev.td_bat_bong_giua_duong ev.td_lan_theo_khi_tuc ev.td_bao_vay_luc_dieu_tuc ev.td_rung_sau ev.gt_su_gia_doi_boi_thuong ev.gt_nho_trung_gian ev.gt_lap_cong ev.gt_thinh_toi_son_mon"],["nhan","chung","Chung",6,1,"ev.nhap_mon_tien_duyen ev.linh_duoc_canh_giu ev.linh_duoc_canh_giu_manh ev.lao_gia_hap_hoi ev.tan_tu_chan_duong ev.ma_tu_ra_tay"],["nhan","chuyen_xua","Chuyện xưa",16,1,"ev.cx_tra_lau_ngu_to ev.cx_hat_toc_canh_dien ev.cx_bich_hoa_doan_thien ev.cx_lao_binh_ke_chuyen ev.cx_lang_gia_ke_chuyen ev.cx_so_tran_huyet_sat ev.cx_bia_vong_hai ev.cx_ngu_dan_dem_trieu ev.cx_rua_gia_bai_bien ev.cx_lao_lai_do ev.cx_bia_kim_cuong ev.cx_ngu_to_tu ev.cx_thien_that_trong ev.cx_thay_boi_loi_sam ev.cx_tam_thien_su ev.cx_dai_tinh_tuong"],["tongmon","cong_pha_son_mon","Công phá sơn môn",3,0,"ev.cong_pha_son_mon ev.cong_pha_tong_mon ev.cong_pha_dai_tong"],["bicanh","di_bao","Dị bảo",22,6,"ev.di_bao_u_hon_dien ev.di_bao_kiem_trach ev.di_bao_tien_van_dien ev.di_bao_yeu_phong_mo ev.di_bao_han_giao_linh ev.di_bao_kiem_dai ev.bien_trieu_khu ev.bien_thuyen_rong ev.di_bao_hon_thap ev.di_bao_u_dien ev.di_bao_lan_dai ev.di_bao_tan_phong ev.di_bao_van_dan_trung ev.di_bao_tuyen_phong ev.di_bao_dan_coc ev.di_bao_xich_trung ev.di_bao_van_son ev.di_bao_kim_dao_dien ev.di_bao_bang_hon_trung ev.di_bao_ho_set ev.di_bao_hop_ba_khoa ev.di_bao_keo_dinh"],["bicanh","di_tich","Di tích",30,2,"ev.dao_boi_di_tich ev.ditich_bia_da ev.ditich_cam_che_tan ev.ditich_ngoc_gian_vo ev.ditich_mo_gio ev.ditich_thach_su ev.ditich_ke_dao_trom ev.ditich_tran_phap_cu ev.ditich_kiem_gay ev.ditich_quan_tai_xich ev.ditich_den_truong_minh ev.ditich_tieng_go ev.ditich_tre_chep_bia ev.ditich_hanh_lang_no ev.ditich_dong_ho_cat ev.ditich_hu_tro ev.ditich_guong_co ev.ditich_khoi_cho_lenh ev.ditich_nguoi_trong_xich ev.ditich_cua_da_uong_mau ev.ditich_thu_chua_gui ev.ditich_dien_ngung_thoi ev.ditich_vong_thien_dai ev.ditich_dinh_dong ev.ditich_nguoi_hoa_da ev.ditich_am_binh_tuan ev.ditich_sap_co_vat ev.ditich_truyen_thua_chon_mot ev.ditich_tran_nhan_song ev.ditich_mo_co_chu"],["hoang","dia_diem/an_si","Địa điểm · Ẩn sĩ",3,0,"ev.as_chi_diem ev.as_doi_kinh ev.as_vuon_thuoc"],["hoang","dia_diem/khoang_mach","Địa điểm · Khoáng mạch",6,0,"ev.km_dao_khoang ev.km_phu_mo_bi_xich ev.km_sap_ham ev.km_son_mon_doi_phi ev.km_tranh_mo ev.km_da_song"],["hoang","dia_diem/linh_mach","Địa điểm · Linh mạch",5,0,"ev.lm_tan_tu_chiem_mach ev.lm_son_mon_rao_mach ev.lm_thu_giu_mat_mach ev.lm_ke_tron_ben_mach ev.lm_mach_reo"],["hoang","dia_diem/phuong_thi","Địa điểm · Phường thị",4,2,"ev.pt_doi_chac ev.pt_phap_khi_gia ev.pt_leu_tra_tin_tuc ev.pt_ban_sach_tra_no"],["hoang","dia_diem/quan_ai","Địa điểm · Quan ải",6,1,"ev.qa_phi_qua_ai ev.qa_hang_lau ev.qa_linh_ai_sach_nhieu ev.qa_tham_bao_vuot_bien ev.tn_quan_ai_doi_chieu ev.tn_quan_ai_phuc_binh"],["hoang","dong_phu","Động phủ",8,4,"ev.dp_vach_rong ev.dp_khach_tru_mua ev.dp_ong_truc_hut_mach ev.dp_dan_xin_nuoc ev.dp_kiem_y_trong_da ev.dp_chu_cu_ve ev.dp_kiep_van_nho ev.dp_guong_chu_cu"],["san","giao_chien","Giao chiến",1,0,"ev.yeu_thu_lang_thang"],["san","hang","Hang ổ",8,0,"ev.hang_xa_quat ev.hang_lang_oa ev.hang_hat_sao ev.co_tu_dong_phu ev.thu_luyen_thap ev.vuong_lang ev.van_thi_quat ev.am_thanh"],["san","hanh_dong","Hành động (săn yêu, bế quan…)",10,0,"ev.be_quan ev.be_quan_tiep ev.khai_phu ev.dot_pha ev.luyen_che ev.san_yeu ev.truy_tim_yeu ev.truy_tim_dau_dan ev.td_quay_lai ev.truy_thu"],["hoang","hoang_da/cam_dia","Hoang dã · Cấm địa",8,5,"ev.hd_cd_cam_dia_mo_cua ev.hd_cd_xich_phong_an ev.hd_cd_ket_trong_cam_dia ev.hd_cd_dao_van_vach ev.hd_cd_trang_mau ev.hd_cd_ngu_tinh_lien_chau ev.hd_cd_khe_nut_troi ev.hd_cd_thien_hoa_roi"],["san","hoang_da/chu_o","Hoang dã · Lãnh thổ có chủ",2,0,"ev.chu_o_lanh_tho ev.chu_o_hang_trong"],["hoang","hoang_da/chung","Hoang dã · Chung",16,3,"ev.hd_chung_bia_vo_tu ev.hd_chung_hang_rong ev.hd_chung_xac_vo_danh ev.hd_chung_nguoi_nha_tim ev.hd_chung_kiem_khach ev.hd_chung_duoc_dai_nhan_ra ev.hd_chung_chuong_duoi_dat ev.hd_chung_binh_tro chain.hd_chung_binh_tro ev.hd_chung_binh_tro_tha ev.hd_chung_thien_kiep_nguoi_khac ev.hd_chung_dong_phu_tu_mo ev.hd_chung_than_thuc_do_xet ev.hd_chung_nguyen_anh_duoi_giet ev.hd_chung_dai_nang_toa_hoa ev.hd_chung_linh_khi_trieu"],["san","hoang_da/dai_yeu","Hoang dã · Đại yêu",10,3,"ev.hd_dy_vuong_chiem_mach ev.hd_dy_yeu_su_thu_cong ev.hd_dy_vuong_trong_thuong ev.hd_dy_hai_vuong_tranh_mach ev.hd_dy_vuong_mung_tho ev.hd_dy_vuong_lac_con ev.hd_dy_lang_duoi_mach_can ev.hd_dy_thu_trieu_dau_song ev.hd_dy_bai_xac_sau_trieu ev.hd_dy_thuong_doan_giua_trieu"],["bicanh","hoang_da/di_bao","Hoang dã · Dị bảo",4,0,"ev.hd_db_linh_quang_khe ev.hd_db_bao_quang_day_ho ev.hd_db_thap_dong_duoi_cat ev.hd_db_qua_chin_vong_vay"],["san","hoang_da/di_thu","Hoang dã · Dị thú",6,0,"ev.di_thu_huy_oc_dao chain.di_thu_huy ev.di_thu_huy_hang ev.di_thu_quy_nguu ev.di_thu_tuong_da ev.di_thu_hung_thu"],["hoang","hoang_da/hai_dao","Hoang dã · Hải đảo",15,3,"ev.hd_dao_ke_bi_day ev.hd_dao_chim_non_tren_ghenh ev.hd_dao_thuyen_ma ev.hd_dao_thu_trong_chai ev.hd_dao_hai_tac_giu_nguoi ev.hd_dao_so_hai_than ev.hd_dao_xac_kinh ev.hd_dao_hai_thi ev.hd_dao_dao_troi ev.hd_dao_nguoi_giu_den ev.hd_dao_duong_da_duoi_trieu ev.hd_dao_dao_cam_kiem ev.hd_dao_bang_trung_lao ev.hd_dao_dao_dang_chim ev.hd_dao_bong_cua_troi"],["hoang","hoang_da/ho_nuoc","Hoang dã · Hồ nước",16,6,"ev.hd_ho_trai_ngoc_dem_trang ev.hd_ho_dien_trieu_khu ev.hd_ho_giao_thuc_day ev.hd_ho_lao_chai_ca_la ev.hd_ho_dan_dem_tren_nuoc ev.hd_ho_thuyen_khong_nguoi chain.hd_ho_hop_nguoi_chet ev.hd_ho_hop_b2 ev.hd_ho_bang_giua_he ev.hd_ho_ke_luyen_ho ev.hd_ho_ly_ngu_do_kiep ev.hd_ho_cho_day_ho ev.hd_ho_bong_khong_theo ev.hd_ho_luoi_cau_thang ev.hd_ho_giao_nhan_bi_xich ev.hd_ho_bia_tren_mai_rua"],["hoang","hoang_da/hoang_mac","Hoang dã · Hoang mạc",16,1,"ev.hd_mac_gieng_co ev.hd_mac_di_chi_duoi_cat ev.hd_mac_bao_cat ev.hd_mac_lai_buon_can_nuoc ev.hd_mac_thanh_ao_anh chain.hd_mac_dao_mo ev.hd_mac_nguoi_dao_mo ev.hd_mac_ham_mo_thu_hai ev.hd_mac_oc_dao_di ev.hd_mac_nguoi_mua_bong ev.hd_mac_mo_than_giu_nuoc ev.hd_mac_phan_do_cho_chet ev.hd_mac_chuot_buon_mo ev.hd_mac_sao_roi ev.hd_mac_doan_lac_da_ma ev.hd_mac_nguoi_dem_cat"],["hoang","hoang_da/hoang_nguyen","Hoang dã · Hoang nguyên",14,3,"ev.hd_bang_suoi_am ev.hd_bang_bang_phong_co_tu ev.hd_bang_hang_hung_ngu_dong ev.hd_bang_linh_gac_dai_canh ev.hd_bang_chim_bang_goi_bay ev.hd_bang_bang_nguyen_dap_loi ev.hd_bang_diem_danh_duoi_bang ev.hd_bang_sen_tuyet_bo_chay ev.hd_bang_xac_di_ve_bac ev.hd_bang_sam_duoi_bang ev.hd_bang_bai_nga_cu_tuong ev.hd_bang_tuong_bang_giong_nguoi ev.hd_bang_ai_bang_thu_phi ev.hd_bang_be_trong_bang"],["hoang","hoang_da/khoi_loi","Hoang dã · Khôi lỗi",4,0,"ev.khoi_loi_dong_phu_bo ev.khoi_loi_cam_che_co ev.khoi_loi_lo_luyen_thi ev.khoi_loi_ai_co"],["san","hoang_da/linh_thu","Hoang dã · Linh thú",4,3,"ev.linh_thu_loc_dan_duong ev.linh_thu_dieu_trom ev.linh_thu_cam_ly ev.linh_thu_thuc_thiet"],["hoang","hoang_da/rung_ram","Hoang dã · Rừng rậm",16,6,"ev.hd_rung_qua_chin ev.hd_rung_dong_phu_goc_co ev.hd_rung_cay_thanh_tinh ev.hd_rung_tho_san_ket_bay ev.hd_rung_hac_mua_trang ev.hd_rung_cay_gia_xin_nuoc chain.hd_rung_cay_gia ev.hd_rung_cay_gia_b2 ev.hd_rung_ken_nguoi ev.hd_rung_mua_hat ev.hd_rung_vo_ho ev.hd_rung_lao_don_cay ev.hd_rung_cho_dem_yeu ev.hd_rung_kiem_trong_cay ev.hd_rung_tang_le_vuon ev.hd_rung_hoa_ru_ngu"],["hoang","hoang_da/son_mach","Hoang dã · Sơn mạch",14,6,"ev.hd_son_vach_ngan_kim ev.hd_son_long_mach_thuc_tinh ev.hd_son_dai_yeu_thuc_giac ev.hd_son_hai_nguoi_tranh_chi ev.hd_son_kiem_gay_tren_suon ev.hd_son_nui_don_dem ev.hd_son_son_than_sap_tan ev.hd_son_van_co_tren_dinh ev.hd_son_yeu_nup_tranh_kiep ev.hd_son_quan_tai_tren_vach ev.hd_son_lao_ganh_da ev.hd_son_da_va_troi_roi ev.hd_son_bac_da_len_may ev.hd_son_yeu_ruoc_dau"],["hoang","hoang_da/tien_ich","Hoang dã · Tiện ích",2,0,"ev.hd_nghi_chan ev.hd_hai_thuoc_dai"],["san","hoang_da/yeu_vuc","Hoang dã · Yêu vực",16,7,"ev.hd_yeu_bai_xuong ev.hd_yeu_lang_vuong_mo_ban ev.hd_yeu_ranh_gioi ev.hd_yeu_tu_binh ev.hd_yeu_bang_cho_nguoi chain.hd_yeu_hung_loi_the ev.hd_yeu_hung_loi_the ev.hd_yeu_hung_tra_loi ev.hd_yeu_hoc_lam_nguoi ev.hd_yeu_xu_an ev.hd_yeu_do_hoa_hinh ev.hd_yeu_dem_quy ev.hd_yeu_ba_nuoi_yeu ev.hd_yeu_nguoi_hoa_yeu ev.hd_yeu_van_bat_up ev.hd_yeu_non_bam_theo"],["san","ke_dich_nguoi","Kẻ địch là người",10,4,"ev.kdn_son_tac_chan_deo ev.kdn_thuy_tac_moc_thuyen ev.kdn_luu_khau_vao_lang ev.kdn_ung_bo_khoai_duoi ev.kdn_luong_dao_binh ev.kdn_thinh_ap_tieu ev.kdn_viem_thay_cung_nuoi_co ev.kdn_am_sat_chen_tra ev.kdn_bang_truy_na ev.kdn_nghia_dao_tren_mai"],["nghe","nghe/che_phu","Nghề · Chế phù",6,5,"ev.cp_phu_thuong_doi ev.cp_lang_ta_khi ev.cp_bua_gia ev.cp_hoc_tro_chep_len ev.cp_dau_phu ev.cp_phu_su_mu"],["nghe","nghe/chung","Nghề · Chung",17,8,"ev.mui_dan_yeu_thu ev.mui_dan_ke_cuop ev.mui_dan_tan_tu ev.mui_dan_ke_xin ev.di_hoa_dia_tam ev.di_hoa_cuu_u ev.di_hoa_tam_muoi ev.di_hoa_huyen_bang ev.di_hoa_tu_loi ev.di_hoa_cot_linh ev.di_hoa_thai_duong ev.di_hoa_niet_ban ev.di_hoa_cuu_thien ev.di_hoa_canh_kim ev.di_hoa_hau_tho ev.di_hoa_cuong_phong ev.lo_co_ngu_to"],["nghe","nghe/luyen_bao","Nghề · Luyện bảo",6,4,"ev.lb_lao_binh_dat_kiem ev.lb_phoi_doi_mau ev.lb_hoc_viec_chep_trom ev.lb_hoi_dau_khi ev.lb_dao_gia_quan_ai ev.lb_lo_co_dia_hoa"],["nghe","nghe/luyen_dan","Nghề · Luyện đan",9,4,"ev.ld_sam_mung_tho ev.ld_phu_de_do_benh chain.ld_phu_de_do_benh ev.ld_phu_de_toi_han ev.ld_dan_ha_chan_cho ev.ld_thu_tu_cau_dan ev.ld_don_phuong_bi_chep ev.ld_hoi_dau_dan ev.ld_lo_cuoi_cua_lao"],["nghe","nghe/tran_phap","Nghề · Trận pháp",6,1,"ev.tp_rao_thon_mua_dong ev.tp_me_tran_chan_duong ev.tp_thieu_chu_thay_tran ev.tp_tran_giu_kho ev.tp_doi_gia_thu_tran ev.tp_va_dai_tran"],["nghe","ngu_linh/khoi_loi","Ngự linh · Khôi lỗi",7,0,"ev.kl_sap_tho_khoi ev.kl_lau_co_quan ev.kl_tho_khoi_gap_nan ev.kl_xuong_khoi_bo_hoang ev.kl_dien_co_quan ev.kl_mo_thien_cong ev.kl_dau_khoi_an_cuoc"],["nghe","ngu_linh/linh_thu","Ngự linh · Linh thú",14,0,"ev.lt_danh_hoi_bui_ram ev.lt_danh_hoi_mat_ho ev.lt_danh_hoi_nen_gach ev.lt_danh_hoi_cat_vang ev.lt_loc_bay_tho_san ev.lt_tho_dem_trang ev.lt_cam_ly_lao_ngu ev.lt_thanh_dieu_bay_dan ev.lt_bach_trach_vach_da ev.lt_tam_bao_cho_chon ev.lt_thuc_thiet_tho_ren ev.lt_tinh_net ev.lt_kho_cua_no ev.lt_hoa_hinh"],["nghe","ngu_linh/linh_thu_ket_giao","Ngự linh · Kết giao linh thú",12,3,"ev.nl_lt_ho_trang_mac_bay ev.nl_lt_chuot_vang_tha_bac ev.nl_lt_soi_con_theo_chan ev.nl_lt_ho_me_trung_ten ev.nl_lt_ran_xanh_nghe_kinh ev.nl_lt_hac_dau_dinh_nui ev.nl_lt_qua_lua_dau_xom ev.nl_lt_mat_troi_thu_hai ev.nl_lt_trau_xanh_dao_truong ev.nl_lt_meo_den_tren_noc ev.nl_lt_ngua_lua_bat_kham ev.nl_lt_khi_tim_don_set"],["nghe","ngu_linh/than_thu","Ngự linh · Thần thú",8,0,"ev.nl_than_ly_long_doi_te ev.nl_than_lan_hoa_cuong ev.nl_than_dao_biet_lan ev.nl_than_loan_thu_suc ev.nl_than_rong_mac_can ev.nl_than_lan_trung_ten ev.nl_than_quy_len_bai ev.nl_than_to_loan_hoa_da"],["nghe","ngu_linh/thi_hon","Ngự linh · Thi hồn",8,1,"ev.cho_am_dem ev.thi_ke_dao_mo ev.thi_xac_than_lang ev.thi_mo_tuong_quan ev.thi_lang_thi_vuong ev.hon_phien_vo_chu ev.hon_quy_thanh ev.hon_dien_quy_mau"],["nghe","ngu_linh/thu_trung","Ngự linh · Thú / trùng",16,1,"ev.nl_thu_lao_chan_yeu ev.nl_thu_xac_trong_hang ev.nl_trung_co_su_doi_ruong ev.nl_trung_o_co_trong_dam ev.nl_cho_dem_thu_co ev.nl_thu_mo_ngu_thu_su ev.nl_thu_hai_cot_thu_hoang ev.nl_trung_dong_co_vuong ev.nl_trung_co_mau_ngu_dong ev.nl_thu_cam_ly_vuot_thac ev.nl_thu_chon_vang_duoi_trom ev.nl_thu_to_thanh_dieu ev.nl_thu_dinh_gio ev.nl_thu_luyen_huyet_tinh ev.nl_thu_bai_tu_lan ev.nl_thu_ho_phach_co"],["nghe","ngu_linh/trung_hoa_than","Ngự linh · Trùng hóa thần",3,0,"ev.nl_thu_to_liet_khong_ung ev.nl_thu_to_phan_son_ho ev.nl_thu_to_bich_lan_mang"],["nhan","nhan_mach/ban_be","Nhân mạch · Bạn bè",23,2,"ev.ban_luan_dao ev.ban_doi_vat ev.ban_xem_dau ev.ban_thu_nha ev.ban_thu_nha_toi ev.ban_chen_mung ev.ban_chuyen_que ev.ban_say_ruou ev.ban_cho_phien ev.ban_tung_thieu ev.ban_ti_thi ev.ban_gui_gam ev.ban_toc_bac ev.ban_goi_tien_boi ev.ban_giua_hai_ben ev.ban_hoa_giai ev.ban_dan_nguoi_toi ev.ban_nhac_no ev.ban_giu_ho ev.ban_lac_loi ev.ban_do_de ev.ban_mua_do_gia ev.rung_dong"],["nhan","nhan_mach/chung","Nhân mạch · Chung",10,1,"ev.ruou_luan_dao ev.ban_cu_ghe_tham ev.ban_cu_dai_khach ev.ban_gap_nan ev.tien_ban ev.ke_gay_kho ev.ke_thu_phuc_kich ev.ke_thu_vu_oan ev.tu_thu_sat_thu ev.tu_thu_cai_bay"],["nhan","nhan_mach/chuoc_nguoi","Nhân mạch · Chuộc người",5,5,"ev.chuoc_ban_hon_phien ev.chuoc_ket_nghia_tong_giam ev.chuoc_dao_lu_yeu_vuong ev.chuoc_tri_ky_khe_uoc ev.chuoc_su_phu_ke_thu_cu"],["nhan","nhan_mach/dao_lu","Nhân mạch · Đạo lữ",25,2,"ev.song_tu ev.dl_ky_niem ev.dl_ho_phap ev.dl_gap_nan ev.dl_xa_cach ev.dl_tranh_cai ev.dl_vuot_truoc ev.dl_hop_kich ev.dl_ke_theo_duoi ev.dl_du_ngoan ev.dl_luyen_dan ev.dl_con_tin_ke_thu ev.dl_ghen ev.dl_ghen_thai_bo ev.dl_gian_doi ev.dl_tho_nguyen ev.dl_linh_duoc ev.dl_nguoi_cu ev.dl_don_thoi ev.dl_dat_ten ev.dl_linh_dien ev.dl_bat_trom ev.dl_chieu_toi ev.dl_bay_phu ev.ly_tan"],["nhan","nhan_mach/doi_su","Nhân mạch · Đối sự",8,4,"ev.ban_thuong_xin_dan ev.ban_thuong_ho_phap ev.ban_thuong_ke_danh_len ev.ban_mat_di_vat ev.ban_mat_dap_mo ev.ban_mat_ke_nhat_xac ev.ban_mat_truy_hung ev.ban_mat_yeu_thu_giu_xac"],["nhan","nhan_mach/doi_thu","Nhân mạch · Đối thủ",4,0,"ev.dt_bia_co ev.dt_canh_bao ev.dt_tranh_suat ev.dt_ten_tren_loi_dai"],["nhan","nhan_mach/hau_boi","Nhân mạch · Hậu bối",5,1,"ev.hau_boi_quy_cua ev.hau_boi_loi_dai ev.hau_boi_chon_truyen_nhan ev.hau_boi_de_truyen_thua ev.hau_boi_hoi_dao"],["nhan","nhan_mach/hiem_khich","Nhân mạch · Hiềm khích",5,0,"ev.hiem_tranh_hang ev.hiem_chan_cau ev.hiem_sa_co ev.hiem_linh_tuyen ev.hiem_thue_nguoi"],["ta","nhan_mach/hop_hoan","Nhân mạch · Hợp hoan",1,0,"ev.thai_bo"],["nhan","nhan_mach/ket_nghia","Nhân mạch · Kết nghĩa",6,3,"ev.ket_nghia_huyet_thu ev.ket_nghia_mua_chuoc ev.ket_nghia_em_nho ev.ket_nghia_mung_tho ev.ket_nghia_che_cho ev.ket_nghia_chia_phuc"],["nhan","nhan_mach/nhan_vat","Nhân mạch · Nhân vật",12,0,"ev.gap_thien_kieu ev.gap_nguoi_su_mon ev.gap_ninh_tam_sinh ev.thach_dau ev.tam_su ev.tri_ky ev.ket_nghia ev.nhan_duyen ev.tham_ban_cu ev.anh_mat_khac_thuong ev.ban_phan_boi ev.ninh_tranh_co_duyen"],["nhan","nhan_mach/quen_biet","Nhân mạch · Quen biết",7,0,"ev.qb_mon_do_cu ev.qb_ru_hai_thuoc ev.qb_hoi_muon ev.qb_hoi_muon_toi ev.qb_tin_don ev.qb_canh_duoc_vien ev.qb_muon_but_ky"],["nhan","nhan_mach/sam_hoi","Nhân mạch · Sám hối",5,2,"ev.sam_hoi_quy_ke_thu ev.sam_hoi_no_mau ev.sam_hoi_chen_tra ev.sam_hoi_ke_mang_oan ev.sam_hoi_tre_mo_coi"],["nhan","nhan_mach/su_mon","Nhân mạch · Sư môn",10,2,"ev.bai_su ev.thinh_giao ev.su_phu_giao_viec ev.su_phu_viec_ban ev.su_phu_gap_nan ev.su_phu_toa_hoa ev.dau_hieu_an_y ev.doat_xa ev.dong_mon_nho_giup ev.dong_mon_ham_hai"],["nhan","nhan_mach/su_phu","Nhân mạch · Sư phụ",6,1,"ev.su_phu_khao_hach ev.su_phu_goi_ve ev.su_phu_dua_thu ev.su_phu_chuyen_cu ev.su_phu_trach_phat ev.su_phu_chi_diem"],["nhan","nhan_mach/tham_bi_canh","Nhân mạch · Thám bí cảnh",14,0,"ev.bc_thap_loi_moi ev.bc_thap_ban_do ev.bc_thap_cua_da ev.bc_thap_thu_ho ev.bc_thap_tro_mat ev.bc_thap_chia_bau ev.bc_cao_loi_moi ev.bc_cao_lenh_bai ev.bc_cao_tran_nhan ev.bc_cao_thu_ho ev.bc_cao_tro_mat ev.bc_cao_chia_bau chain.tham_bi_canh_thap chain.tham_bi_canh_cao"],["nhan","nhan_mach/thu_oan","Nhân mạch · Thù oán",15,2,"ev.oan_tra_lau_cham_mat ev.oan_dau_gia_tranh_mua ev.oan_cong_thanh_vu_cao ev.oan_chung_chuyen_do ev.oan_tuu_lau_say ev.oan_cho_ngoai_cua ev.oan_su_phu_ra_mat ev.oan_tran_vay_cho_ngoi ev.oan_con_tin_the_luc ev.oan_con_tin_ma_tu ev.oan_con_tin_son_trai ev.oan_con_tin_dao_lu ev.oan_duoc_tha_dan_duong ev.oan_duoc_tha_do_don ev.oan_duoc_tha_bao_oan"],["nhan","nhan_mach/tinh_y","Nhân mạch · Tình ý",8,0,"ev.ty_ngam_trang ev.ty_vat_ky_niem ev.ty_hieu_lam ev.ty_cham_thuong ev.ty_ke_thu_ba ev.ty_hoi_dao_tam ev.ty_giai_vay ev.ty_lo_hen"],["nhan","nhan_mach/tri_ky","Nhân mạch · Tri kỷ",6,0,"ev.tk_dem_luan_dao ev.tk_hau_su ev.tk_cung_ngo ev.tk_bong_tam_ma ev.tk_lau_ngay ev.tk_van_co_do"],["nhan","nhan_qua","Nhân quả",5,0,"ev.bao_an ev.bao_an_co_ten ev.bao_thu ev.bao_thu_co_ten ev.bao_thu_thue_nguoi"],["treo","noi_chon","Nơi chốn (nhiệm vụ lớn)",46,4,"ev.tra_lau_nghe_tin ev.bang_cao_thi ev.ke_moc_tui ev.dan_lang_cau_cuu ev.dau_gia_hoi ev.dau_gia_lau ev.dau_gia_hanh ev.thu_trieu_cong_thanh ev.ma_tu_tan_sat ev.son_mon_dong_kin ev.tuyen_do_dai_hoi ev.nhiem_vu_tong_mon ev.dong_mon_khieu_khich ev.cam_dia_hau_son ev.bi_canh_tham_hiem ev.truyen_thua_co_tu ev.tranh_doat_bao_vat ev.san_yeu_thu ev.diet_sao_huyet ev.ngoa_son_ngo_dao ev.hai_thuoc_son_da ev.dong_phu_an ev.phe_tich_hoang_vu ev.khai_dong_phu_son_thuy ev.dong_phu ev.teleport_talisman ev.dp_thu_pha_linh_dien ev.dp_tan_tu_luc_loi ev.dp_khach_tru_nho ev.dp_ke_thu_do_toi ev.dp_yeu_toc_doi_dat ev.dp_am_khi_vach_sau ev.dp_linh_duoc_dot_bien ev.dp_mach_nuoc_doi_dong ev.dp_ban_cu_ghe ev.dp_cam_che_hu ev.dp_mach_khoang ev.tru_ma_lenh ev.lien_minh_tram_yeu ev.phe_tich_luc_loi ev.phe_tich_am_khi ev.co_mo_ta_vat ev.khach_diem ev.thuong_doan_tuyen_ho_ve ev.du_dan_su ev.thien_kieu_qua_duong"],["hoang","phe_tich","Phế tích",8,3,"ev.pt_bia_cong_duc ev.pt_bua_com_con_nong ev.pt_ke_dao_mo ev.pt_gieng_biet_noi ev.pt_tran_cu_con_chay ev.pt_den_truong_minh ev.pt_vo_phong_an ev.pt_pho_ngung_dong"],["thanh","phong_tho/bac_minh","Phong thổ · Bạc mệnh",20,4,"ev.minh_luat_khach ev.minh_khach_ke_thu ev.minh_tuan_bien ev.minh_mieu_huyen_vu ev.minh_rua_mac_can ev.minh_dai_canh ev.minh_ro_tien_co ev.minh_chung_lo ev.minh_tam_bang ev.minh_tre_tap_giao ev.minh_sinh_le_da_thu ev.minh_on_khong_qua_dem ev.minh_linh_nho_nha ev.minh_dong_da_do ev.minh_ngan_hac_tram_tran ev.minh_cau_ca_lo_bang ev.minh_xe_tiep_te ev.minh_khach_dong_cung ev.minh_vach_bang_lo_dien ev.minh_bang_do_tham"],["thanh","phong_tho/lac_dao_thanh","Phong thổ · Lạc Đao Thành",10,2,"ev.lac_dao_mat_dam ev.lac_dao_thu_ben_kia chain.lac_dao_thanh ev.lac_dao_ba_loi_moi ev.lac_dao_chan_su_gia ev.lac_dao_vay_phu ev.lac_dao_ke_bao_tin ev.lac_dao_yen_ba_phe ev.lac_dao_so_tuan_thuyen ev.lac_dao_ben_vang"],["thanh","phong_tho/le_hoi","Phong thổ · Lễ hội",14,1,"ev.vong_to_thich_khach ev.vong_to_truong_lao ev.vong_to_kiem_gay ev.dang_hoi_khe_uoc ev.dang_hoi_den_nguoc_dong ev.te_quan_thieu_do_cung ev.te_quan_ten_khong_doc ev.te_quan_linh_ve_an_co ev.dai_han_dai_canh ev.dai_han_cuc_quang ev.dai_han_thu_doi ev.ruoc_than_kieu_nang ev.ruoc_than_cam_hoi ev.ruoc_than_ran_trang"],["thanh","phong_tho/luong","Phong thổ · Lương",6,2,"ev.luong_doi_dau_yeu ev.luong_ngoai_quan_ai ev.luong_le_te_quan ev.luong_den_do ev.luong_trung_binh ev.luong_chuong_ngan_chung"],["thanh","phong_tho/thinh","Phong thổ · Thịnh",7,2,"ev.thinh_khe_uoc ev.thinh_tien_mang ev.thinh_hai_than ev.thinh_ban_tin ev.thinh_van_bao_cho_vay ev.thinh_doi_no ev.thinh_hang_lau"],["thanh","phong_tho/ung","Phong thổ · Ưng",6,1,"ev.ung_tu_bai ev.ung_to_mieu ev.ung_thu_sinh ev.ung_ngu_dan_vot_do ev.ung_luat_phu_thanh ev.ung_cuu_hac"],["thanh","phong_tho/viem","Phong thổ · Viêm",6,2,"ev.viem_mieu_than ev.viem_ruoc_than ev.viem_su_tru_ta ev.viem_rung_thuoc ev.viem_khat_thuc ev.viem_luc_soat_ta_vat"],["ta","ta_phai/dac_trung","Tà phái · Đặc trưng",20,11,"ev.hac_thi_ta_phai ev.hac_thi_tang_vat ev.hac_thi_treo_dau ev.hac_thi_dan_khong_nhan ev.phan_da_ma_tiem_quan_tai ev.phan_da_ma_do_tham ev.phan_da_ma_le_nhap ev.phan_da_ma_vay_bat ev.hop_hoan_lau_huong_phong ev.hop_hoan_lau_lo_dinh ev.hop_hoan_lau_me_huong ev.hop_hoan_lau_hoa_khoi ev.cho_no_san_sau ev.cho_no_tu_si_phe ev.cho_no_bo_tron ev.cho_no_ho_dau ev.mieu_ta_than_te_song ev.mieu_ta_than_mo_mat ev.mieu_ta_than_tu_tu ev.cho_thi_hon_ta_phai"],["ta","ta_phai/gay_su","Tà phái · Gây sự",7,0,"ev.gay_su_tuan_khu ev.gay_su_thi_danh_hoi ev.gay_su_lang_tat_den ev.gay_su_ba_dong ev.gay_su_quan_ruou ev.gay_su_my_nhan ev.gay_su_huyet_ky"],["ta","ta_phai/thon_tran","Tà phái · Thôn trấn",17,6,"ev.dat_ta_bang_treo_dau ev.dat_ta_hang_cam ev.dat_ta_mua_tin ev.dat_ta_canh_lo_thi ev.dat_ta_u_co ev.dat_ta_thu_mua_mau ev.dat_ta_hu_hon ev.dat_ta_cho_nguoi ev.dat_ta_dang_nguoi ev.dat_ta_ke_tron ev.dat_ta_doi_no_thue ev.dat_ta_ke_do_duong ev.dat_ta_dai_sinh_tu ev.dat_ta_thue_vao_thanh ev.dat_ta_quan_tro_kin ev.dat_ta_phan_do ev.dat_ta_ma_dau_xem_cot"],["ta","ta_tu","Tà tu",10,10,"ev.ta_tu_tre_linh_can ev.ta_tu_dao_co_xin_tha ev.ta_tu_co_nhan ev.ta_tu_thon_dich ev.ta_tu_thu_non ev.ta_tu_xac_cha ev.ta_tu_oan_hon ev.ta_tu_be_quan_khach ev.ta_tu_long_tu ev.ta_tu_hoi_den"],["ta","ta_vat","Tà vật",11,5,"ev.tv_lh_thay_phap_nuoi_quy ev.tv_lh_co_mat_chu ev.tv_mq_thi_trong_ham ev.tv_mq_da_den_goi ev.tv_pt_tuong_chet_tuan_thanh ev.tv_pt_tieng_hat_ru ev.tv_ho_thuy_quy_tim_the ev.tv_rung_thu_sinh_mieu_hoang ev.tv_mac_han_bat ev.tv_phi_cuong ev.tv_quy_vuong"],["san","than_thu","Thần thú",20,2,"ev.than_thu_lan_dau_chan chain.than_thu_ky_lan ev.than_thu_lan_tho_san ev.than_thu_lan_nguoi_nga ev.than_thu_ky_lan ev.than_thu_vu_da_lan chain.than_thu_huyen_vu ev.than_thu_vu_lai_do ev.than_thu_vu_huyen_quy ev.than_thu_huyen_vu ev.than_thu_phuong_ngo_dong chain.than_thu_phuong ev.than_thu_phuong_cuop_trung ev.than_thu_phuong_thu_vay ev.than_thu_phuong ev.than_thu_long_vay_luoi chain.than_thu_long ev.than_thu_long_giao_canh ev.than_thu_long_xoay ev.than_thu_long_hon"],["thanh","thanh_tran/buon_chuyen","Thành trấn · Buôn chuyến",23,2,"ev.bc_ung_kiem_phoi ev.bc_ung_van_phong ev.bc_ung_te_khi ev.bc_thinh_cang_thi ev.bc_luong_quan_thi ev.bc_minh_cho_bang ev.bc_viem_cho_thao ev.bc_thu_mua_hang_xa ev.bc_thinh_thuong_hoi ev.bc_tram_thue ev.bc_thuong_doan_ho_tong ev.bc_cuop_hang ev.bc_buon_lau_qua_ai ev.bc_hang_gia ev.bc_lai_buon_tinh_ranh ev.bc_khe_uoc_van_bao ev.bc_giao_hang_van_bao ev.bc_ngu_nhan_doi_hang ev.bc_co_tien_chi_lo ev.van_bao_phan_hoi ev.van_bao_phan_hoi_ngoai ev.van_bao_truy_no ev.van_bao_treo_thuong"],["thanh","thanh_tran/cho_den","Thành trấn · Chợ đen",2,0,"ev.cd_an_tuc_phuong ev.cd_hac_thi"],["thanh","thanh_tran/chung","Thành trấn · Chung",31,5,"ev.thon_dam_cuoi ev.thon_tre_linh_can ev.thon_bo_ruong ev.thon_gieng_can ev.thon_cu_gia_gap_tien ev.thon_soi_ve_lang ev.tran_quan_tro_dem ev.tran_ly_truong_nho ev.tran_kiem_khach ev.tran_phu_xe_dem ev.tran_doan_hat ev.thanh_nha_mon_oan ev.thanh_lau_xanh ev.thanh_dai_tran_nut ev.thanh_de_tu_xuong_nui ev.thanh_tri_phu_cau_dan ev.kinh_hoang_tu_chieu_mo ev.kinh_cam_quan_tra_xet ev.kinh_quoc_su ev.kinh_ung_the_gia_chon_phe ev.kinh_thinh_van_bao_khach_khanh ev.ky_van_mua_ca ev.ky_van_dam_cuoi_chuot ev.ky_van_tieng_dan_dem ev.ky_van_nguoi_dien_tien_tri ev.ky_van_bong_tren_mai ev.ky_van_sao_roi ev.tiem_tap_hoa ev.public_teleport ev.tinh_that_thue ev.ganh_hang_rong"],["thanh","thanh_tran/dau_gia","Thành trấn · Đấu giá",2,2,"ev.dau_gia_rinh_doat ev.dau_gia_rinh_bay"],["thanh","thanh_tran/gia_toc","Thành trấn · Gia tộc",18,6,"ev.gia_toc_khao_linh_can ev.gia_toc_thu_tu_chuong_ngua ev.gia_toc_dem_te_to ev.gia_toc_hon_dang ev.gia_toc_chen_com_khach_cu ev.gia_toc_thoai_hon ev.gia_toc_khach_khanh_mot_ngay ev.gia_toc_kk_noi_gian ev.gia_toc_kk_dau_thiep ev.gia_toc_kk_tang_thu ev.gia_toc_ung_chao_loang ev.gia_toc_thinh_khe_uoc ev.gia_toc_luong_ra_ai ev.gia_toc_viem_than_tu_duong ev.gia_toc_minh_thu_phuong_nam ev.gia_toc_tranh_mo chain.gia_toc_mo_doi ev.gia_toc_mo_sap"],["thanh","thanh_tran/hoai_bich","Thành trấn · Hoài bích",3,3,"ev.hb_thieu_gia_ep_gia ev.hb_chan_truyen_nhan_vo ev.hb_noi_mon_ty_thi"],["thanh","thanh_tran/lam_cong","Thành trấn · Làm công",28,3,"ev.lam_cong_boc_vac ev.lam_cong_dung_bep ev.lam_cong_ganh_nuoc ev.lam_cong_thu_gap chain.lam_cong_thu_gap ev.lam_cong_thu_gap_chan_duong ev.lam_cong_gac_kho ev.lam_cong_keo_be ev.lam_cong_kiem_dau_tay ev.lam_cong_lao_tho_giu_chan ev.lam_cong_dung_nha ev.lam_cong_gat_thue ev.lam_cong_chan_trau ev.lam_cong_hai_sam ev.lam_cong_viet_thu ev.lam_cong_tu_duong ev.lam_cong_dao_gieng ev.lam_cong_chuot_kho ev.lam_cong_canh_ruong ev.lam_cong_dap_de ev.lam_cong_ke_chuyen ev.lam_cong_quet_cho ev.lam_cong_tuong_thanh ev.lam_cong_cheo_do ev.lam_cong_trong_lo_dan ev.lam_cong_thuong_doan chain.lam_cong_thuong_doan ev.lam_cong_thuong_doan_ha_trai"],["thanh","thanh_tran/lam_phat","Thành trấn · Làm phát",4,0,"ev.lam_phat_tuu_lau_dan ev.lam_phat_tra_quan_phu ev.lam_phat_chuong_quy_than ev.lam_phat_thuong_nhan_nghi"],["thanh","thanh_tran/loi_dai","Thành trấn · Lôi đài",3,0,"ev.loi_dai_treo_thuong ev.dau_truong_ngam ev.loi_dai_danh_thay"],["thanh","thanh_tran/mua_tin","Thành trấn · Mua tin",24,1,"ev.mua_tin_dong_phu chain.mua_tin_dong_phu ev.mua_tin_dong_phu_toi ev.mua_tin_dong_phu_rong ev.mua_tin_linh_duoc chain.mua_tin_linh_duoc ev.mua_tin_linh_duoc_toi ev.mua_tin_linh_duoc_rong ev.mua_tin_khe_uoc chain.mua_tin_khe_uoc ev.mua_tin_khe_uoc_toi ev.mua_tin_khe_uoc_rong ev.mua_tin_dai_yeu chain.mua_tin_dai_yeu ev.mua_tin_dai_yeu_toi ev.mua_tin_dai_yeu_rong ev.mua_tin_que_mieu chain.mua_tin_que_mieu ev.mua_tin_que_mieu_toi ev.mua_tin_que_mieu_rong ev.mua_tin_xac_bang chain.mua_tin_xac_bang ev.mua_tin_xac_bang_toi ev.mua_tin_xac_bang_rong"],["thanh","thanh_tran/pham_nhan","Thành trấn · Phàm nhân",24,2,"ev.pn_hoi_dap_nieu ev.pn_hoi_vat_lang ev.pn_choi_ga_dau_dinh ev.pn_tre_dong_tuong ev.pn_an_gio_nha_la ev.pn_dam_ma_thieu_nguoi ev.pn_ca_de_kho ev.pn_sot_ret_dau_mua ev.pn_thay_cung_danh_ta ev.pn_lu_ve_dem ev.pn_le_cau_mua ev.pn_ban_con_mua_doi ev.pn_quan_thu_thue ev.pn_leu_chong_di_thi ev.pn_lop_hoc_truong_lang ev.pn_tu_si_lam_phep ev.pn_lang_thang_xem_cot ev.pn_an_may_doi_com ev.pn_nguoi_cung_que ev.pn_tin_tong_mon_thu_do ev.pn_cuop_mua_gat ev.pn_den_troi_nguoc ev.pn_ga_gay_nua_dem ev.pn_cay_da_ke_chuyen"],["thanh","thanh_tran/pho_thi","Thành trấn · Phố thị",42,13,"ev.song_bac_chieu_bac ev.song_bac_con_no ev.song_bac_tu_si_bip ev.song_bac_cam_phap_khi ev.song_bac_van_cuoc_tho ev.tra_trang_quan_tra ev.tra_trang_tra_vuong_hoi ev.tra_trang_che_co_thanh_tinh ev.tra_trang_no_mua_che ev.tra_trang_bai_hat_hai_che ev.y_quan_kham_benh ev.y_quan_dich_benh ev.y_quan_lang_trung_an_the ev.y_quan_thu_thuoc ev.y_quan_benh_nhan_ngu ev.y_quan_cau_dan ev.tuu_phuong_quan_ruou ev.tuu_phuong_chum_tram_nam ev.tuu_phuong_say_ruou_lo_loi ev.tuu_phuong_dau_ruou_hao_kiet ev.tuu_phuong_khi_gia_doi_ruou ev.dien_trang_tru_hai_ruong ev.dien_trang_ta_dien_noi_day ev.dien_trang_ruong_linh_mach ev.dien_trang_bu_nhin ev.dien_trang_tieu_thu_linh_can ev.phuong_thi_cho_tu_si ev.phuong_thi_hang_tu_tong_mon ev.phuong_thi_dau_gia_nho ev.phuong_thi_bi_bam_duoi ev.phuong_thi_sap_khong_nguoi ev.phuong_thi_dat_luyen ev.phuong_thi_mua_dan_doc ev.the_gia_phu_de ev.the_gia_bong_loc ev.the_gia_hon_su_ep_buoc ev.the_gia_tranh_ngoi_gia_chu ev.the_gia_con_chau_y_the ev.the_gia_ban_bau_vat ev.the_gia_biet_vien_bi_diet ev.the_gia_toc_hoi_so_tai ev.the_gia_lao_to_be_quan"],["thanh","thanh_tran/son_thuy","Thành trấn · Sơn thủy",47,11,"ev.lc_cho_ca ev.lc_luoi_vot_do_co ev.lc_te_ha_ba ev.lc_thu_du_bai_lau ev.lc_dem_ca_noi ev.bd_thue_do ev.bd_do_dem ev.bd_khach_la_tren_do ev.bd_thuy_tac_chan_do ev.bd_kien_hang_nang_tay ev.mq_lo_quang ev.mq_sap_ham ev.mq_ap_boc_lot ev.mq_mach_linh_thach ev.mq_tieng_cuoc_dem ev.ls_leu_thuoc_da ev.ls_di_san_cung_tho ev.ls_bay_yeu_thu ev.ls_tho_san_mat_tich ev.ls_le_tra_xuong ev.dt_nha_thu_thuoc ev.dt_vuon_thuoc_bi_trom ev.dt_sam_hoa_hinh ev.dt_thu_thuoc_moi ev.dt_ep_ban_ruong_thuoc ev.lr_lo_ren ev.lr_ban_ve_co ev.lr_doi_kiem ev.lr_kiem_khoc_trong_lo ev.lr_ren_lai_phap_khi ev.lr_dat_luyen ev.lr_khi_su_luu_lac ev.st_chuong_chua_hoang ev.st_ban_nui ev.st_che_vach_da ev.st_phu_ong_cau_tien ev.st_coc_vong ev.st_hai_vang_trang ev.st_hac_dua_thu ev.st_cam_su_ben_thac ev.st_phong_nui_ngam_trang ev.st_da_tam_sinh ev.st_do_thu_tho ev.st_tan_hon_muon_than ev.st_lao_doi_tho ev.st_hac_chet_tren_dinh ev.st_da_vong_phu"],["thanh","thanh_tran/tin_nguong","Thành trấn · Tín ngưỡng",37,8,"ev.cho_phien_sap_hang ev.cho_phien_ngoc_phat_sang ev.cho_phien_sap_khong_nguoi ev.cho_phien_thu_phi_cho ev.cho_phien_ke_bam_duoi ev.mieu_tho_thap_huong ev.mieu_tho_the_cau_khan ev.mieu_tho_xa_nuong ev.mieu_tho_den_do ev.mieu_tho_tuong_nut ev.mieu_tho_bua_tran_trach ev.mieu_tho_phu_su_qua_duong ev.lang_hoang_lua_xanh ev.lang_hoang_xuong_duoi_gieng ev.lang_hoang_lao_dao_lap_dan ev.lang_hoang_ruoc_dau_dem ev.lang_hoang_gieng_co ev.tran_bien_quan_nhu ev.tran_bien_bat_phu ev.tran_bien_buon_lau ev.tran_bien_lua_hieu ev.tran_bien_cot_moc ev.tram_dich_quay ev.tram_dich_thu_khan ev.tram_dich_ho_tong ev.tram_dich_ngua_ve_mot_minh ev.tram_dich_ngua_kho_mau ev.hoc_duong_tang_thu ev.hoc_duong_thu_sinh_bi_bat ev.hoc_duong_sach_chep_sai ev.hoc_duong_ban_de ev.hoc_duong_chu_bo ev.co_tu_thien_duong ev.cung_duong_cao_tang ev.cung_duong_dao_quan ev.cung_duong_mieu_xa ev.cung_duong_phap_hoi"],["thanh","thanh_tran/treo_thuong","Thành trấn · Treo thưởng",1,0,"ev.bang_treo_thuong"],["thanh","thanh_tran/vu_oan","Thành trấn · Vụ oan",6,0,"ev.vu_oan_ben_gieng ev.vu_oan_nha_tro ev.vu_oan_den_hon chain.vu_oan_tim_hung ev.vu_oan_lan_dau ev.vu_oan_bat_hung"],["nhan","tien_duyen","Tiên duyên",9,1,"ev.td_lao_dao_tro_nho ev.td_sap_sach_cu ev.td_van_co_ben_ho ev.td_tan_quyen_mieu_hoang ev.td_nguoi_dat_ben ev.td_hoc_viec_y_quan ev.td_nghe_giang_ngoai_tuong ev.td_ngoc_gian_bai_bun ev.td_theo_xe_tieu"],["tongmon","tong_mon","Tông môn",24,1,"ev.chap_su_duong ev.tang_kinh_cac ev.bao_kho ev.linh_mach_tong_mon ev.dai_bi ev.truy_na ev.dan_phong ev.khi_phong ev.phu_duong ev.dan_ha_khao_hach ev.son_mon_tu_thu ev.son_mon_khac_phe ev.son_mon_khac_phe_truy ev.son_mon_khac_phe_truy_2 ev.son_mon_khac_phe_truy_nang ev.son_mon_khac_phe_truy_cuc ev.nhan_su_tong_mon ev.tinh_tam_chua ev.tm_cg_lao_to_xuat_quan ev.tm_cg_ghe_truong_lao ev.tm_cg_moc_gioi_linh_mach ev.tm_cg_su_gia_chien_thu ev.tm_cg_tong_kho_can ev.tm_cg_ma_tong_vay_nui"],["tongmon","tong_mon_khoi_loi","Tông môn · khôi lỗi",6,1,"ev.kl_tm_khoi_gac_nui ev.kl_tm_xuong_co_quan ev.kl_tm_tim_lieu ev.kl_tm_khoi_phat_cuong ev.kl_tm_dau_khoi ev.kl_tm_khoi_to_su"],["tongmon","tong_mon_noi","Tông môn · nội bộ",13,0,"ev.tm_duoc_vien ev.tm_khoang_mach ev.tm_phu_cac ev.tm_tran_cac ev.tm_kiem_trung ev.tm_thu_vien ev.tm_luyen_the_tri ev.tm_giang_duong ev.tm_am_cac ev.tm_huyet_tri ev.tm_co_hon_quat ev.tm_luyen_hon_dien ev.tm_huong_cac"],["tongmon","tong_mon_tinh_that","Tông môn · tĩnh thất",2,0,"ev.tinh_that_tong_mon ev.tinh_that_mat_do"],["tongmon","tong_mon_xet_an","Tông môn · xét án",1,0,"ev.chap_phap_xet_an"],["treo","treo_thuong/bat_cuop","Treo thưởng · Bắt cướp",6,0,"ev.tt_bat_cuop ev.tt_bat_cuop_thuy_tac ev.tt_bat_cuop_trom_trau ev.tt_bat_cuop_phu_nha ev.tt_bat_cuop_van_bao ev.tt_bat_cuop_linh_mach"],["treo","treo_thuong/ho_tong","Treo thưởng · Hộ tống",5,0,"ev.tt_ho_tong_thuong_doan ev.tt_ho_tong_van_bao ev.tt_ho_tong_dan_chay_nan ev.tt_ho_tong_dich_tram ev.tt_ho_tong_tuan_bien"],["treo","treo_thuong/ta_dao","Treo thưởng · Trừ tà đạo",5,0,"ev.tt_ta_vat ev.tt_ta_vat_phe_tich ev.tt_ma_tu ev.tt_ta_vat_chua ev.tt_thi_tu_dao_mo"],["treo","treo_thuong/theo_phe","Treo thưởng · Theo phe",8,0,"ev.tm_tru_ma_gieng_co ev.tm_tru_ma_lang_trung_gia ev.tm_tru_ma_chuong_hon ev.tm_tru_ma_ma_dau ev.tm_cuop_xe_dan ev.tm_san_de_tu ev.tm_cuop_dan_lu ev.tm_phuc_chan_truyen"],["tongmon","treo_thuong/tong_mon","Treo thưởng · Tông môn",19,0,"ev.tm_tru_yeu ev.tm_ap_tai ev.tm_yeu_duoc_vien ev.tm_yeu_dam_nuoc ev.tm_yeu_dau_dan ev.tm_yeu_ho_toc ev.tm_diet_ma_tu ev.tm_tru_ta_vat ev.tm_ta_tu_huyet_te ev.tm_phan_do_bi_kip ev.tm_phan_do_dan_phong ev.tm_phan_do_chan_truyen ev.tm_ap_tai_dan ev.tm_ho_tong_tan_de_tu ev.tm_ap_tai_linh_thach ev.tm_mo_linh_thach ev.tm_doat_duoc_vien ev.tm_dong_phu_cu ev.tm_mat_tham"],["treo","treo_thuong/tru_yeu","Treo thưởng · Trừ yêu",7,0,"ev.tt_tru_yeu ev.tt_tru_yeu_ben_do ev.tt_tru_yeu_deo_nui ev.tt_tru_yeu_hai_thuoc ev.tt_tru_yeu_lang_bay ev.tt_tru_yeu_xa_mieu ev.tt_tru_yeu_tuyet_bang"],["treo","treo_thuong/truy_na","Treo thưởng · Truy nã",5,0,"ev.tt_truy_na_dao_pham ev.tt_truy_na_trai_chu ev.tt_truy_na_yeu_vuong ev.tt_truy_na_huyet_lenh ev.tt_truy_na_ma_dau"],["treo","treo_thuong/viec_co_ten","Treo thưởng · Việc có tên",9,0,"ev.tm_ve_que_dong_mon ev.tm_tim_dai_de_tu ev.tm_noi_gian ev.tm_hoa_giai ev.tm_dua_thu ev.tm_doi_kiem ev.tm_dan_thi_luyen ev.tm_doi_thu_so_tai ev.tm_mo_co_nhan"],["hoang","vuot_bien","Vượt biên",11,0,"ev.ben_ngao_duong ev.bien_bang_troi ev.bien_tuan_thuyen_minh ev.ben_vinh_trieu ev.bien_giao_tuan ev.bien_trieu_rut ev.ben_lac_khu ev.bien_hai_tac ev.bien_dao_dam ev.bien_cuong_phong ev.bien_ngu_nhan"],["nhan","xuat_than/khoi_dau","Xuất thân · Khởi đầu",3,0,"chain.nhan_co_tan_hon ev.nhan_phat_sang ev.tan_hon_thuc_tinh"],["nhan","xuat_than/theo_nuoc","Xuất thân · Theo nước",16,5,"ev.xt_tu_bai_lac_de ev.xt_mo_dung_doi_an ev.xt_hop_niem_sap ev.xt_khe_uoc_dan_ha ev.xt_lo_dan_bo_hoang ev.xt_trieu_binh_cu ev.xt_dong_doi_dao_binh ev.xt_huyet_thu_goi_ve ev.xt_truy_con_tin ev.xt_so_binh_goi_ten ev.xt_mo_ong_duoi_tuyet ev.xt_lua_dai_tat ev.xt_khoi_hieu_la ev.xt_xa_toc_doi_an ev.xt_so_bach_an ev.xt_chen_ruou_gio_ret"],["tongmon","tongmon/dac_biet","Tuyển đồ · đại bỉ · công phá (nhận theo tên/ID đặc biệt)",0,0,""],["khac","khac","Sự kiện mới / chưa phân loại",0,0,""]];
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
    focus:'balanced',
    llFull:'tiep',
    grpOff:null,
    pol:null,
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
    if(this._decOpen&&this._dec)this._dec.notes.push(String(msg).slice(0,160));
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
      tuVi:Number(nv.tuVi||0),
      binhCanh:Number(nv.binhCanh||0),
      tuViTong:Number(nv.tuVi||0)+Number(nv.binhCanh||0),
      lichLuyen:this.llInfo(nv).cur,
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
      tuVi:(()=>{const a=acc.tuVi||{plus:0,minus:0};return{net:a.plus-a.minus,plus:a.plus,minus:a.minus}})(),
      canhGioi:pair('canhGioi', now.canhGioi-base.canhGioi),
      lichLuyen:pair('lichLuyen', (now.lichLuyen||0)-(base.lichLuyen||0)),
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
        linhThach:{plus:0,minus:0},tuVi:{plus:0,minus:0},lichLuyen:{plus:0,minus:0},canhGioi:{plus:0,minus:0},
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
    if(!acc.lichLuyen)acc.lichLuyen={plus:0,minus:0};
    bump(acc.lichLuyen, prev.lichLuyen??now.lichLuyen, now.lichLuyen);
    // Tu vi: cộng dồn theo phiên. Lên tiểu/đại cảnh giới thì tu vi về 0 → không tính là mất, phần mới có sau khi lên tính là nhận.
    if(now.canhGioi>prev.canhGioi||(now.canhGioi===prev.canhGioi&&now.tieu>prev.tieu)){
      acc.tuVi.plus+=Math.max(0,Number(now.tuViTong)||0);
    }else if(now.canhGioi<prev.canhGioi||now.tieu<prev.tieu){
      // tụt cảnh giới: không suy ra được mất bao nhiêu, bỏ qua nhịp này
    }else bump(acc.tuVi, prev.tuViTong??prev.tuVi, now.tuViTong??now.tuVi);
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
      ${row3('Lịch luyện', d.lichLuyen)}
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
      lichLuyen:this.llInfo(r.nhanVat||{}).cur,
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
  /* ───────── Nhật ký sự kiện: gặp gì, có lựa chọn nào, vì sao chọn, kết quả ra sao (để sửa lỗi / tối ưu) ───────── */
  jr:{cur:null,list:[],loaded:false,saveT:null,seq:0},
  jrnLoad(){
    if(this.jr.loaded)return;this.jr.loaded=true;
    try{const a=store.get('afJrn',[]);if(Array.isArray(a)){this.jr.list=a.slice(-150);this.jr.seq=Number(this.jr.list[this.jr.list.length-1]?.n||0)}}catch{}
  },
  jrnSave(){
    clearTimeout(this.jr.saveT);
    this.jr.saveT=setTimeout(()=>{try{store.set('afJrn',this.jr.list.slice(-150))}catch{}},1500);
  },
  jrnSnap(){
    try{
      const s=this.charSnapshot(),nv=me()||{};
      return{nam:s.nam,lt:s.linhThach,tv:s.tuViTong,ll:+Number(s.lichLuyen||0).toFixed(1),th:s.thuongThe,cg:s.canhGioi,tieu:s.tieu,chi:s.chiSo,bag:s.bagTotal,tho:Number(nv.thoNguyen??NaN)}
    }catch{return null}
  },
  jrnDelta(a,b){
    if(!a||!b)return null;
    const d={};
    for(const k of ['lt','tv','ll','th','cg','tieu','bag']){const x=Number(b[k])-Number(a[k]);if(Number.isFinite(x)&&Math.abs(x)>1e-9)d[k]=+x.toFixed(2)}
    if(Number.isFinite(a.tho)&&Number.isFinite(b.tho)&&a.tho!==b.tho)d.tho=+(b.tho-a.tho).toFixed(2);
    const nam=Number(b.nam)-Number(a.nam);if(nam>1e-9)d.nam=+nam.toFixed(2);
    for(const k of Object.keys(b.chi||{})){const x=Number(b.chi[k])-Number(a.chi?.[k]||0);if(Math.abs(x)>1e-9)d[k]=+x.toFixed(2)}
    return d;
  },
  jrnTail(a,n=10){
    try{return A(a?.transcript).slice(-n).map(x=>this.stripText(typeof x==='string'?x:(x.text||x.msg||JSON.stringify(x))).trim().slice(0,240)).filter(Boolean)}catch{return[]}
  },
  jrnBegin(a,view){
    const gi=this.groupOf(a.id),def=this.encDef(a.id)||{};
    const sub=AF_SUBS.find(r=>r[1]===gi.k);
    let noi=view?.noi;if(noi&&typeof noi==='object')noi=noi.ten||noi.name||null;
    this.jr.cur={
      n:++this.jr.seq,id:a.id,ten:T(String(def.ten||view?.ten||'')).slice(0,80),kind:def.kind||view?.kind||null,
      nhom:gi.g,sub:gi.k,subLabel:sub?sub[2]:null,tags:def.tags?.tinh_chat||null,cg:def.tags?.canh_gioi||null,
      t:new Date().toISOString(),nam:nowYear(),slot:a.slot||run().viTri||null,noi:noi?String(noi).slice(0,60):null,
      start:this.jrnSnap(),text:this.stripText(view?.text||'').trim().slice(0,600),steps:[]
    };
    return this.jr.cur;
  },
  jrnEnd(reason){
    const cur=this.jr.cur;if(!cur)return;this.jr.cur=null;
    cur.end=this.jrnSnap();cur.d=this.jrnDelta(cur.start,cur.end);cur.te=new Date().toISOString();cur.why=reason||null;
    this.jr.list.push(cur);
    if(this.jr.list.length>400)this.jr.list.shift();
    this.jrnSave();this.refreshJournal();
  },
  /* Gọi mỗi nhịp: encounter đổi / đóng → chốt bản ghi; còn mở → cập nhật kết quả cuối */
  jrnSync(){
    const cur=this.jr.cur;if(!cur)return;
    const a=run().active;
    if(a&&a.id===cur.id){
      if(a.ketQua)cur.ket=String(a.ketQua);
      cur.done=!!a.done;if(run().tran)cur.combat=true;
      cur.tail=this.jrnTail(a);
      return;
    }
    this.jrnEnd(a?'đổi sang '+a.id:'đã đóng');
  },
  jrnStep(view,choices,pick,tag){
    try{
      this.jrnLoad();
      const a=run().active;if(!a)return null;
      if(this.jr.cur&&this.jr.cur.id!==a.id)this.jrnEnd('đổi sang '+a.id);
      const cur=this.jr.cur||this.jrnBegin(a,view);
      const D=this._dec||{drops:[],scores:[],notes:[]};this._dec=null;
      const why={};D.drops.forEach(d=>{(why[d.i]=why[d.i]||[]).push(d.w)});
      const sc={};D.scores.forEach(x=>{sc[x.i]=x});
      const strip=t=>this.stripText(t).trim();
      const opts=A(choices).map(c=>{
        let hz=null,sp=null;
        try{const h=this.choiceHazard(c);hz={};if(h.injury)hz.inj=h.injury;if(h.tamMa)hz.tm=+h.tamMa.toFixed(2);if(h.karma)hz.oan=1;if(h.lose)hz.mat=1;if(h.join)hz.mon=1;if(h.kill)hz.giet=1;if(!Object.keys(hz).length)hz=null}catch{}
        try{const q=this.choiceSpendsResource(c);if(q.spends)sp={lt:q.linhThach||0,ch:q.congHien||0,tho:q.thoNguyen||0,txt:q.textHint?1:0}}catch{}
        const o={i:c.index,tx:strip(c.text).slice(0,110),av:c.available!==false};
        if(c.lockedReason)o.lock=strip(c.lockedReason).slice(0,80);
        const rk=String(c?.risk?.level||c?.risk||'');if(rk)o.rk=rk;
        if(c.chance!=null)o.ch=c.chance;
        if(c.thoat)o.th=1;if(c.phucHet)o.het=1;
        if(hz)o.hz=hz;if(sp)o.sp=sp;
        const x=sc[c.index];if(x){o.sc=x.s;if(x.ev!=null)o.ev=x.ev}
        if(why[c.index])o.why=why[c.index];
        return o;
      });
      const step={
        k:cur.steps.length+1,scene:a.scene||null,tag:tag||null,
        text:cur.steps.length?this.stripText(view?.text||'').trim().slice(0,400):undefined,
        opts,pick:pick?pick.index:null,notes:D.notes.slice(0,8),
        pol:{...this.P()},before:this.jrnSnap(),trLen:A(a.transcript).length
      };
      cur.steps.push(step);
      return step;
    }catch(e){try{console.warn('[AutoFarm] jrnStep',e)}catch{};return null}
  },
  jrnAfter(step){
    if(!step)return;
    try{
      const a=run().active;
      step.out=A(a?.transcript).slice(step.trLen).map(x=>this.stripText(typeof x==='string'?x:(x.text||x.msg||JSON.stringify(x))).trim().slice(0,260)).filter(Boolean).slice(0,10);
      step.d=this.jrnDelta(step.before,this.jrnSnap());
      step.sceneAfter=a?.scene||null;step.waitAfter=a?.waiting?.kind||null;
      if(run().tran)step.combat=true;
      delete step.trLen;
    }catch{}
  },
  jrnSummary(r){
    const last=A(r.steps).slice().reverse().find(x=>x.pick!=null);
    const o=last?A(last.opts).find(x=>x.i===last.pick):null;
    return{pick:o?o.tx:(last?'(không chọn)':'(không có bước)')};
  },
  jrnPayload(){
    this.jrnLoad();
    const all=this.jr.list.slice();if(this.jr.cur)all.push({...this.jr.cur,dangMo:true});
    return{
      build:BUILD,at:new Date().toISOString(),
      note:'Nhật ký sự kiện AutoFarm. Mỗi bản ghi = 1 sự kiện: steps[] có opts (mọi lựa chọn: tx text, rk risk, ch cơ hội, hz nguy cơ theo effects, sp tốn tài nguyên, ev giá trị kỳ vọng, sc điểm, why lý do bị loại), pick là index đã chọn, out là dòng kết quả, d là thay đổi (lt linh thạch, tv tu vi, th thương thế, chiSo…).',
      opts:{...this.opts,grpOff:[...(this.opts.grpOff||[])]},
      pol:this.P(),
      state:this.jrnSnap(),
      count:all.length,entries:all
    };
  },
  jrnText(){
    const P=this.jrnPayload(),L=[];
    L.push('# Nhật ký AutoFarm · '+P.at+' · build '+P.build);
    L.push('Chính sách: '+Object.entries(P.pol).map(([k,v])=>k+'='+(v?1:0)).join(' ')+' · nhóm tắt: '+(P.opts.grpOff.join(', ')||'(không)'));
    for(const r of P.entries){
      L.push('');
      L.push(`## #${r.n} · năm ${r.nam} · ${r.nhom}/${r.sub} · ${r.id} "${r.ten}"${r.slot?' · ô '+r.slot:''}${r.noi?' · '+r.noi:''}${r.dangMo?' · (đang mở)':''}`);
      if(r.text)L.push('> '+r.text.replace(/\s+/g,' ').slice(0,300));
      for(const st of A(r.steps)){
        L.push(`  Bước ${st.k}${st.scene?' [cảnh '+st.scene+']':''}${st.tag?' ('+st.tag+')':''}`);
        if(st.text)L.push('  > '+st.text.replace(/\s+/g,' ').slice(0,200));
        for(const o of A(st.opts)){
          const f=[];if(o.rk)f.push(o.rk);if(o.ch!=null)f.push(String(o.ch));if(o.ev!=null)f.push('ev '+o.ev);if(o.sc!=null)f.push('đ '+o.sc);
          if(o.hz)f.push('nguy:'+Object.entries(o.hz).map(([k,v])=>k+(v===1?'':v)).join('/'));
          if(o.sp)f.push('tốn:'+(o.sp.lt||o.sp.ch||o.sp.tho||'có'));
          if(!o.av)f.push('KHÓA'+(o.lock?': '+o.lock:''));
          L.push(`   ${o.i===st.pick?'▶':' '} [${o.i+1}] ${o.tx}${f.length?'  ('+f.join(' · ')+')':''}${o.why?'  ✗ loại: '+o.why.join('; '):''}`);
        }
        if(st.notes?.length)L.push('   ghi chú: '+st.notes.join(' | '));
        if(st.out?.length)L.push('   → '+st.out.join(' / '));
        if(st.d&&Object.keys(st.d).length)L.push('   Δ '+Object.entries(st.d).map(([k,v])=>k+(v>0?' +':' ')+v).join(', '));
      }
      if(r.ket)L.push('  Kết quả: '+r.ket);
      if(r.combat)L.push('  (có giao chiến)'+(r.tail?.length?' '+r.tail.slice(-4).join(' / '):''));
      if(r.d&&Object.keys(r.d).length)L.push('  Tổng Δ: '+Object.entries(r.d).map(([k,v])=>k+(v>0?' +':' ')+v).join(', '));
    }
    return L.join('\n');
  },
  exportJournal(){
    const text=JSON.stringify(this.jrnPayload(),null,1);
    try{const blob=new Blob([text],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`autofarm-nhat-ky-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),20_000)}catch{}
    toast('Đã tải nhật ký sự kiện ('+this.jr.list.length+' bản ghi)','ok',3000);
  },
  copyJournalText(){
    const t=this.jrnText();
    try{navigator.clipboard?.writeText?.(t);toast('Đã copy bản đọc nhanh ('+t.length+' ký tự)','ok',3000)}catch{toast('Không copy được — dùng Tải JSON','err',3000)}
  },
  clearJournal(){this.jr.list=[];this.jr.cur=null;try{store.set('afJrn',[])}catch{}this.refreshJournal();toast('Đã xóa nhật ký sự kiện','ok',2000)},
  refreshJournal(){
    if(!ui.isOpen||ui.tab!=='auto')return;
    const el=$(body,'#af-jrn');if(!el)return;
    const now=Date.now();if(this._jrnT&&now-this._jrnT<600)return;this._jrnT=now;
    el.innerHTML=this.jrnListHtml();
    const nEl=$(body,'#af-jrn-n');if(nEl)nEl.textContent=this.jr.list.length+' bản ghi';
  },
  jrnListHtml(){
    this.jrnLoad();
    const rows=this.jr.list.slice(-25).reverse();
    const cur=this.jr.cur;
    const one=r=>{
      const sm=this.jrnSummary(r),d=r.d||{};
      const dd=Object.entries(d).filter(([k])=>k!=='nam').slice(0,5).map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(' · ');
      return `<details class="jrn"><summary>#${r.n} <b>${E(r.ten||r.id)}</b> <small>${E(r.sub||'')}</small> → ${E(sm.pick.slice(0,40))}${dd?` <small class="g">${E(dd)}</small>`:''}</summary>
        <div class="sub">${E(r.id)} · năm ${E(r.nam)}${r.ket?' · '+E(r.ket):''}</div>
        ${A(r.steps).map(st=>`<div class="sub"><b>Bước ${st.k}</b>${st.scene?' ['+E(st.scene)+']':''}${A(st.opts).map(o=>`<div style="margin-left:8px">${o.i===st.pick?'▶ ':'· '}${E(o.tx)} <small>${E([o.rk,o.ch!=null?o.ch:'',o.ev!=null?'ev '+o.ev:'',o.hz?'nguy '+Object.keys(o.hz).join('/'):'',o.why?'✗ '+o.why.join('; '):''].filter(Boolean).join(' · '))}</small></div>`).join('')}${A(st.out).length?`<div style="margin-left:8px" class="g">→ ${E(st.out.join(' / ').slice(0,300))}</div>`:''}</div>`).join('')}
      </details>`;
    };
    return (cur?`<div class="sub"><b>Đang mở:</b> ${E(cur.ten||cur.id)} (${A(cur.steps).length} bước)</div>`:'')+(rows.map(one).join('')||'<div class="sub">Chưa có bản ghi. Chạy Auto, mỗi sự kiện gặp sẽ được ghi lại ở đây.</div>');
  },
  /* ── Nhóm sự kiện + chính sách lựa chọn (người dùng tự chọn theo lối tu: chính đạo / ma tu / liều…) ── */
  POL_DEF:{tamMa:false,oan:false,thuongNang:false,tonLT:false,matVat:false,thoNguyen:false,giaNhap:false,giet:false},
  POL_INFO:[
    ['tamMa','Tâm ma tăng','Cho phép lựa chọn làm tăng tâm ma (hợp ma tu / tà đạo)'],
    ['oan','Gieo oán · đắc tội người','Gieo oán hận (plant_seed), quan hệ NPC xấu đi'],
    ['thuongNang','Có thể trọng thương','Lựa chọn có thể gây thương thế từ cấp 2 trở lên'],
    ['tonLT','Tốn linh thạch / công hiến','Mua, nộp phí, đổi vật, hối lộ, chuộc người…'],
    ['matVat','Mất vật phẩm','Giao nộp, bị lấy mất đồ hoặc đặc sản trong túi'],
    ['thoNguyen','Hao thọ nguyên','Đổi thọ nguyên lấy lợi ích'],
    ['giaNhap','Gia nhập / rời môn phái','Thay đổi tông môn của nhân vật'],
    ['giet','Sát nhân · diệt khẩu','Giết NPC trong lựa chọn']],
  POL_PRESET:{
    chinh:{tamMa:false,oan:false,thuongNang:false,tonLT:false,matVat:false,thoNguyen:false,giaNhap:false,giet:false},
    ma:{tamMa:true,oan:true,thuongNang:false,tonLT:false,matVat:false,thoNguyen:false,giaNhap:false,giet:true},
    lieu:{tamMa:true,oan:true,thuongNang:false,tonLT:true,matVat:false,thoNguyen:false,giaNhap:true,giet:true}},
  GRP_DEF_OFF:['tongmon/dac_biet'],
  _grpIdx:null,
  loadCfg(){
    try{const o=store.get('afGrpOff',null);this.opts.grpOff=new Set(Array.isArray(o)?o:this.GRP_DEF_OFF)}catch{this.opts.grpOff=new Set(this.GRP_DEF_OFF)}
    try{const q=store.get('afPol',null);this.opts.pol={...this.POL_DEF,...(q&&typeof q==='object'?q:{})}}catch{this.opts.pol={...this.POL_DEF}}
  },
  P(){if(!this.opts.pol)this.loadCfg();return this.opts.pol},
  saveCfg(){try{store.set('afGrpOff',[...this.opts.grpOff]);store.set('afPol',this.opts.pol)}catch{}},
  grpIndex(){
    if(this._grpIdx)return this._grpIdx;
    const m=new Map();
    for(const r of AF_SUBS){if(!r[5])continue;for(const id of r[5].split(' '))m.set(id,{g:r[0],k:r[1]})}
    return this._grpIdx=m;
  },
  groupOf(id){
    const s=String(id||'');
    let sect=false;try{sect=this.isSectExcluded(s)}catch{}
    if(sect)return{g:'tongmon',k:'tongmon/dac_biet'};
    return this.grpIndex().get(s)||{g:'khac',k:'khac'};
  },
  subOn(k){if(!(this.opts.grpOff instanceof Set))this.loadCfg();return !this.opts.grpOff.has(k)},
  grpBlocked(id){return !this.subOn(this.groupOf(id).k)},
  /* Farm theo content source (kind/tags/nhom/choices) — mọi loại sự kiện, không chỉ săn yêu */
  isFarmEncounter(id){
    const s=String(id||'');
    if(!s)return false;
    if(this.grpBlocked(s))return false;
    if(s==='ev.san_yeu')return true;
    if(this.opts.onlySanYeu)return false;
    if(this.isNonFarmEnc(s))return false;
    // Tông môn tuyển đồ — không tham gia
    if(/tuyen_do|tuyen_do_de|tuyen_de|nhap_mon|nhan_do_de/i.test(s)&&!this.subOn('tongmon/dac_biet'))return false;
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
      if(/song_bac|dau_gia|cho_vay|vay_no/.test(blob))return false;
      // Phế tích chỉ để lập động phủ
      if(/phe_tich|lap_dong_phu|khai_phu/.test(blob))return false;
      // Tuyển đồ / nhận đệ tử tông môn
      if(/tuyển đồ|tuyen do|nhận đệ|nhap mon|nhập môn/.test(blob)&&!this.subOn('tongmon/dac_biet'))return false;
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
    if(this.grpBlocked(s))return true;
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
      if(!slot||!hasSlot(slot)||this.isSlotBanned(slot)||travelBlock(slot,true))return;
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

  /* ── Lịch luyện (đọc từ source game) ──
     Thắng trận cộng lịch luyện: thường +2, tinh anh +6, boss +10, thua +1, nhân hệ số theo đại cảnh giới [1,1,.9,.8,.7,.6]; trần theo cảnh giới [20,20,25,30,35,40].
     Bế quan tiêu lịch luyện để có tu vi đủ; cạn thì tu vi chỉ còn ~50% (đan chỉ còn 30%). Lịch luyện đầy thì săn thêm không còn cộng tu vi tiềm năng, chỉ còn đồ rơi. */
  LL_CAP:[20,20,25,30,35,40],LL_GAIN:{thuong:2,tinh_anh:6,boss:10,thua:1},LL_REALM:[1,1,.9,.8,.7,.6],LL_DEF:10,
  llInfo(nv){
    nv=nv||me()||{};
    const cg=Math.max(0,Math.min(5,Math.floor(Number(nv.canhGioi||0))));
    const cap=this.LL_CAP[cg];
    const raw=nv.lichLuyen;
    const cur=(raw!=null&&Number.isFinite(Number(raw)))?Number(raw):this.LL_DEF;
    const k=this.LL_REALM[cg];
    return{cur,cap,pct:Math.max(0,Math.min(1,cur/cap)),full:cur>=cap-0.01,gain:{thuong:this.LL_GAIN.thuong*k,tinh_anh:this.LL_GAIN.tinh_anh*k,boss:this.LL_GAIN.boss*k}};
  },
  /* ── Giá trị kỳ vọng của một lựa chọn, đọc từ effects trong content game ──
     Đơn vị "điểm" so sánh được giữa các lựa chọn của cùng một sự kiện. Rủi ro/an toàn vẫn do bộ lọc phía trên quyết định. */
  FOCUS_W:{
    balanced:{tuVi:12,ll:3,lt:1.2,item:7,stat:45,khiVan:60,daoTam:40,tamMa:-50,injury:-40,tho:-9,dv:4,ch:3,time:-25,linhNgo:25,nghe:2,heal:5,tuLuyen:14},
    tuvi:{tuVi:24,ll:7,lt:.8,item:5,stat:35,khiVan:50,daoTam:40,tamMa:-55,injury:-40,tho:-9,dv:2,ch:2,time:-25,linhNgo:25,nghe:2,heal:5,tuLuyen:28},
    taiNguyen:{tuVi:8,ll:2,lt:2.4,item:12,stat:30,khiVan:50,daoTam:30,tamMa:-45,injury:-40,tho:-9,dv:5,ch:5,time:-25,linhNgo:20,nghe:2,heal:5,tuLuyen:9},
    chiSo:{tuVi:8,ll:2,lt:1,item:6,stat:90,khiVan:110,daoTam:70,tamMa:-60,injury:-40,tho:-9,dv:3,ch:3,time:-25,linhNgo:30,nghe:3,heal:5,tuLuyen:9}
  },
  _evCache:Object.create(null),
  evCond(cond,pWin){
    if(cond==null)return 1;
    if(cond==='won')return pWin;
    if(cond==='lost')return 1-pWin;
    if(cond==='fled')return .08;
    if(typeof cond==='object'){
      if(cond.ngau_nhien!=null)return Math.max(0,Math.min(1,Number(cond.ngau_nhien)||0));
      if(Array.isArray(cond.all))return cond.all.reduce((p,x)=>p*this.evCond(x,pWin),1);
      if(Array.isArray(cond.any))return 1-cond.any.reduce((p,x)=>p*(1-this.evCond(x,pWin)),1);
      if(cond.not!=null)return 1-this.evCond(cond.not,pWin);
    }
    return .6; // điều kiện khác (cờ, cảnh giới…): chưa biết trước → trung bình
  },
  evList(list,pWin,W,out,weight,muc){
    for(const ef of A(list)){
      if(!ef||typeof ef!=='object')continue;
      const w=weight*this.evCond(ef.if,pWin);
      if(!w)continue;
      const add=(k,v)=>{out.pts+=v*w;out.parts[k]=(out.parts[k]||0)+v*w};
      const num=x=>{const n=typeof x==='number'?x:(x&&typeof x==='object'?(x.bac??x.so??x.nam??0):0);return Number(n)||0};
      if(ef.tu_vi!=null)add('tuVi',num(ef.tu_vi)*W.tuVi);
      if(ef.tu_luyen&&typeof ef.tu_luyen==='object')add('tuVi',Number(ef.tu_luyen.nam||0)*Number(ef.tu_luyen.he_so||1)*W.tuLuyen);
      if(ef.linh_thach!=null)add('lt',num(ef.linh_thach)*W.lt);
      if(ef.add_item!=null){const so=typeof ef.add_item==='object'?Number(ef.add_item.so||1):1;add('item',so*W.item)}
      if(ef.stat&&typeof ef.stat==='object')for(const v of Object.values(ef.stat))add('stat',(Number(v)||0)*W.stat);
      if(ef.khi_van!=null)add('khiVan',num(ef.khi_van)*W.khiVan);
      if(ef.dao_tam!=null)add('daoTam',num(ef.dao_tam)*W.daoTam);
      if(ef.tam_ma!=null)add('tamMa',num(ef.tam_ma)*W.tamMa);
      if(ef.injury!=null)add('injury',Math.max(1,num(ef.injury))*W.injury);
      if(ef.tho_nguyen!=null)add('tho',num(ef.tho_nguyen)*(W.tho<0?-W.tho:W.tho));
      if(ef.danh_vong!=null)add('dv',(typeof ef.danh_vong==='object'?Object.values(ef.danh_vong).reduce((t,v)=>t+(Number(v)||0),0):num(ef.danh_vong))*W.dv);
      if(ef.cong_hien!=null)add('ch',num(ef.cong_hien)*W.ch*0.1);
      if(ef.linh_ngo!=null)add('linhNgo',W.linhNgo);
      if(ef.kinh_nghiem_nghe&&typeof ef.kinh_nghiem_nghe==='object')add('nghe',Object.values(ef.kinh_nghiem_nghe).reduce((a,b)=>a+(Number(b)||0),0)*W.nghe);
      if(ef.heal!=null)add('heal',(this.injuryLevel()>0?num(ef.heal):0)*W.heal*3);
      if(ef.time!=null)add('time',num(ef.time)*W.time);
      if(ef.combat!=null){
        const m=ef.muc||muc||'thuong';
        const ll=this.llInfo(),g1=ll.gain[m==='boss'?'boss':m==='tinh_anh'?'tinh_anh':'thuong'];
        add('ll',ll.full?0:g1*W.ll);
        add('item',(m==='boss'?3:m==='tinh_anh'?1.6:1)*W.item*.6); // đồ rơi từ trận
      }
    }
  },
  /* Lựa chọn thô của game, đúng cảnh đang mở (scene) — cùng logic vm() của game */
  rawChoice(c){
    const a=run().active;const id=a?.id;const def=id?(C.encounters?.get?.(id)||this.encDef?.(id)):null;
    if(!def)return null;
    const list=(a.scene&&def.scenes?.[a.scene]?.choices)||def.choices;
    if(A(list).some(x=>x&&x.nguon))return null; // nguồn động: không ánh xạ được chỉ số
    return A(list)[c.index]||null;
  },
  /* Phân tích rủi ro từ effects thật (kể cả success/failure/partial và cảnh kế tiếp) */
  choiceHazard(c){
    const h={injury:0,tamMa:0,karma:false,lose:false,join:false,kill:false};
    try{
      const raw=this.rawChoice(c);if(!raw)return h;
      const a=run().active,def=C.encounters?.get?.(a.id)||this.encDef?.(a.id);
      const scan=(list,depth)=>{
        for(const ef of A(list)){
          if(!ef||typeof ef!=='object')continue;
          if(ef.injury!=null)h.injury=Math.max(h.injury,Math.max(1,Number(typeof ef.injury==='object'?(ef.injury.so??ef.injury.cap??1):ef.injury)||1));
          if(ef.tam_ma!=null&&Number(typeof ef.tam_ma==='object'?(ef.tam_ma.so??0):ef.tam_ma)>0)h.tamMa+=1;
          if((ef.plant_seed!=null&&/oan|han/.test(JSON.stringify(ef.plant_seed)))||(ef.npc_relation!=null&&/-\d/.test(JSON.stringify(ef.npc_relation))))h.karma=true;
          if(ef.remove_item!=null||ef.mat_dac_san!=null)h.lose=true;
          if(ef.gia_nhap_mon_phai!=null||ef.roi_mon_phai!=null)h.join=true;
          if(ef.npc_giet!=null)h.kill=true;
          if(ef.goto_scene&&depth<2&&def?.scenes?.[ef.goto_scene]){
            for(const ch of A(def.scenes[ef.goto_scene].choices))for(const sec of ['effects','failure'])scan(ch[sec],depth+1);
          }
        }
      };
      scan(raw.effects,0);scan(raw.failure,0);scan(raw.partial,0);
      // thành công không thương tích nhưng đòn đánh bại có thể: lấy cả success (tác dụng phụ)
      scan(raw.success,0);
    }catch{}
    return h;
  },
  choiceEV(c,chanceN,risk){
    try{
      const raw=this.rawChoice(c);if(!raw)return{pts:0,parts:{}};
      const W0=this.FOCUS_W[this.opts.focus]||this.FOCUS_W.balanced;
      const W=this.P().tamMa?{...W0,tamMa:0}:W0;
      const pWin=risk==='an_toan'?.92:risk==='ngang_suc'?.62:(chanceN!=null?chanceN:.75);
      const out={pts:0,parts:{}};
      this.evList(raw.effects,pWin,W,out,1);
      if(raw.check||A(raw.success).length||A(raw.failure).length){
        const p=chanceN!=null?chanceN:.5;
        this.evList(raw.success,pWin,W,out,p);
        this.evList(raw.partial,pWin,W,out,Math.max(0,(1-p))*.4);
        this.evList(raw.failure,pWin,W,out,1-p);
      }
      return out;
    }catch{return{pts:0,parts:{}}}
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
      const raw=this.rawChoice(c);
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
            if(eff.mua!=null||eff.doi!=null)out.textHint=true;
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
    const D={drops:[],scores:[],notes:[]};
    this._dec=D;this._decOpen=true;
    let r=null;
    try{r=this._pickChoice(choices,D)}finally{this._decOpen=false}
    D.picked=r?r.index:null;
    return r;
  },
  _pickChoice(choices,D){
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
    const narrow=(next,why)=>{if(next.length&&next.length<pool.length){pool.forEach(c=>{if(!next.includes(c))D.drops.push({i:c.index,w:why})});pool=next}};
    const pol=this.P();
    const notDead=pool.filter(c=>{
      const l=lv(c);
      if(this.opts.skipTuDia&&(l==='tu_dia'||l==='hiem'))return false;
      return true;
    });
    narrow(notDead,'tử địa / hiểm');

    // Có an_toan → chỉ chọn trong nhóm an_toan (gợi ý combat của game)
    const safe=pool.filter(c=>lv(c)==='an_toan');
    if(safe.length)narrow(safe,'có cửa an_toan hơn');
    else{
      // Không an_toan: bỏ ngang_suc nếu còn lựa chọn không combat
      const healthy=this.injuryLevel()===0;
      const soft=pool.filter(c=>!lv(c)||lv(c)==='ngang_suc');
      const noCombat=pool.filter(c=>!lv(c));
      const even=pool.filter(c=>lv(c)==='ngang_suc');
      // Chưa bị thương: ngang sức vẫn nhận (thưởng thường tốt hơn lui đi); đang bị thương: né
      if(healthy&&even.length)narrow(pool.filter(c=>!lv(c)||lv(c)==='ngang_suc'),'combat quá khó');
      else if(noCombat.length)narrow(noCombat,'tránh combat');
      else if(soft.length)narrow(soft,'combat quá khó');
      else{
        const esc=list.find(isThoat);
        if(esc){this.push('Không an toàn → thoát','dbg');return esc}
      }
    }

    // Bỏ phucHet nếu còn cửa khác (duyên đã hết)
    const notHet=pool.filter(c=>!c.phucHet);
    narrow(notHet,'đã hết duyên');

    // Chính sách tài nguyên: tốn LT/công hiến/thọ nguyên chỉ bị loại khi người dùng KHÔNG cho phép
    const spendBad=c=>{const q=this.choiceSpendsResource(c);if(q.thoNguyen&&!pol.thoNguyen)return true;return !pol.tonLT&&q.spends&&!q.thoNguyen};
    const free=pool.filter(c=>!spendBad(c));
    if(free.length)narrow(free,'tốn tài nguyên');
    else{
      const esc=list.find(isThoat);
      if(esc){this.push('Chỉ còn lựa chọn tốn tài nguyên → thoát','dbg');return esc}
    }

    // Chính sách rủi ro (người dùng chọn): trọng thương, tâm ma, oán nghiệp, mất vật, môn phái, sát nhân
    {
      const viol=c=>{
        const h=this.choiceHazard(c);c._hz=h;const v=[];
        if(h.injury>=2&&!pol.thuongNang)v.push('có thể trọng thương');
        if(h.tamMa>0&&!pol.tamMa)v.push('tăng tâm ma');
        if(h.karma&&!pol.oan)v.push('gieo oán / đắc tội');
        if(h.lose&&!pol.matVat)v.push('mất vật phẩm');
        if(h.join&&!pol.giaNhap)v.push('đổi môn phái');
        if(h.kill&&!pol.giet)v.push('sát nhân');
        c._viol=v;return v;
      };
      pool.forEach(viol);
      const ok=pool.filter(c=>!c._viol.length);
      if(ok.length&&ok.length<pool.length){
        pool.forEach(c=>{if(c._viol.length)D.drops.push({i:c.index,w:'chính sách: '+c._viol.join(', ')})});
        pool=ok;
      }else if(!ok.length){
        const esc=list.find(isThoat);
        const escOk=esc&&!(viol(esc).length);
        if(escOk){this.push('Mọi cửa đều trái chính sách → thoát','dbg');return esc}
        // không thoát được: chọn cửa ít vi phạm nhất, ưu tiên không trọng thương
        this.push('Mọi cửa đều trái chính sách và không có lối thoát → chọn cửa ít vi phạm nhất','dbg');
        const min=Math.min(...pool.map(c=>c._viol.length+(c._hz.injury>=2?2:0)));
        narrow(pool.filter(c=>c._viol.length+(c._hz.injury>=2?2:0)===min),'ít vi phạm chính sách nhất');
      }
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
          narrow(keep,'quái cần né');
        }
      }
    }
    const scored=pool.map(c=>{
      let score=0;
      const l=lv(c);
      const ch=chanceOf(c);
      if(spendBad(c))score-=200;
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
      // Giá trị kỳ vọng từ effects thật của game (tu vi, linh thạch, đồ, chỉ số, khí vận, lịch luyện…), giới hạn ±70 để không đè luật an toàn
      const ev=this.choiceEV(c,ch,l);
      score+=Math.max(-70,Math.min(70,ev.pts*.5));c._ev=ev;
      if(A(c.vat).length)score+=4;
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

    D.scores=scored.map(x=>({i:x.c.index,s:Math.round(x.score),ev:x.c._ev?+x.c._ev.pts.toFixed(1):null}));
    const best=scored[0]?.c||null;
    if(best){
      const ch=chanceOf(best);
      this.push('pick → ['+(best.index+1)+'] '+strip(best.text).slice(0,42)+' risk='+(lv(best)||'none')+(ch!=null?(' ch='+ch):'')+' ev='+(best._ev?best._ev.pts.toFixed(1):'-')+' score='+scored[0].score.toFixed(1),'dbg',{scores:scored.slice(0,6).map(x=>({i:x.c.index,t:strip(x.c.text).slice(0,40),s:Math.round(x.score)})),poolSize:pool.length,listSize:list.length,enc:activeId,kind:encKind});
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
    const a=run().active;if(!a){try{this.jrnSync()}catch{}return 'idle'}
    try{this.jrnSync();if(!this.jr.cur){let v0=null;try{v0=g.encounterView?.()}catch{}this.jrnLoad();this.jrnBegin(a,v0)}}catch{}
    const w=a.waiting;
    // Đấu giá / không farm: chọn thoát ngay nếu có choice
    if(!w&&this.isNonFarmEnc(a.id)){
      let view=null;try{view=g.encounterView?.()}catch{}
      const ch=this.pickChoice(view?.choices||[]);
      if(ch){
        const _st0=this.jrnStep(view,view?.choices||[],ch,'không farm');
        try{g.choose(ch.index);this.jrnAfter(_st0);this.push('Thoát non-farm: '+a.id,'ok');return 'choose'}catch(e){this.push('choose non-farm: '+(e.message||e),'err')}
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
        if(id==='auto'){
          // Kết liễu để lấy đồ rơi khi game không cảnh báo hậu quả (thù oán, thế lực…); nếu có cảnh báo thì tha
          const kl=A(opts).find(x=>x&&x.id==='ket_lieu');
          id=(kl&&!kl.canhBao)?'ket_lieu':'tha';
          this.push('Tù binh (tự động): '+id+(kl&&kl.canhBao?' — game cảnh báo: '+this.stripText(typeof kl.canhBao==='string'?kl.canhBao:(kl.canhBao.text||kl.canhBao.moTa||'hậu quả')).slice(0,60):''),'dbg');
        }
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
    const _st=this.jrnStep(view,choices,pick,pick?'':'không chọn được');
    if(!pick){
      const strip=t=>this.stripText(t);
      const cancel=choices.find(c=>c&&(c.thoat||/^(thôi|hủy)/i.test(strip(c.text).trim())));
      try{
        if(cancel&&typeof g.choose==='function'){g.choose(cancel.index);if(_st){_st.pick=cancel.index;_st.tag='rời menu'}this.jrnAfter(_st);this.push('Chọn Thôi để rời menu','ok')}
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
      this.jrnAfter(_st);
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
        if(actId==='ev.san_yeu'||actId==='ev.san_yeu_thu'){
          // Thôi không đổi con quái của ô → vào lại chỉ lặp lại y hệt: bỏ ô, rời nơi, tới nơi khác
          this.banSlot(slot,6);
          try{g.leavePlace?.()}catch{}
          this.push('Hết cửa săn an toàn ở '+slot+' → bỏ ô 6 năm, đi nơi khác','ok');
          return 'idle';
        }
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
    try{this.jrnSync()}catch{}
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

      // Lịch luyện đầy: săn thêm chỉ còn đồ rơi — tùy chọn dừng để đi bế quan
      if(this.opts.llFull==='dung'&&!this.busy()){
        const L=this.llInfo();
        if(L.full){this.stop('lịch luyện đầy ('+L.cur.toFixed(0)+'/'+L.cap+')');toast('Lịch luyện đã đầy — nên bế quan để đổi thành tu vi','ok',5000);return}
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
      linhThach:{plus:0,minus:0},tuVi:{plus:0,minus:0},lichLuyen:{plus:0,minus:0},canhGioi:{plus:0,minus:0},
      chiSo:Object.fromEntries(this.STAT_KEYS.map(k=>[k,{plus:0,minus:0}]))
    };
    this.gainsLog=[];
    try{
      const x=store.get('xuTri',null);if(x)this.opts.xuTri=x;
      const fo=store.get('afFocus',null);if(fo&&this.FOCUS_W[fo])this.opts.focus=fo;
      this.opts.llFull='tiep';
      this.loadCfg();this.jrnLoad();
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
    try{this.jrnEnd('auto dừng'+(reason?': '+reason:''))}catch{}
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
      document.getElementById(ID+'-afsum')?.remove();this.statsOpen=false;
      return;
    }
    let sum=document.getElementById(ID+'-afsum');
    if(!sum){
      sum=document.createElement('div');sum.id=ID+'-afsum';sum.title='Bấm để xem thống kê Auto';
      sum.addEventListener('click',e=>{e.stopPropagation();this.statsOpen=!this.statsOpen;this.syncGainsBar()});
      document.body.appendChild(sum);try{vkDock()}catch{}
    }
    if(!panel){
      panel=document.createElement('div');
      panel.id=ID+'-afstats';
      panel.innerHTML='<div class="af-drag" data-afdrag="1"><button type="button" class="af-tg" data-aftoggle="1" title="Thu gọn / mở rộng">▾</button><div class="af-h">Thống kê Auto</div></div><div class="af-body"></div>';
      panel.querySelector('[data-aftoggle]').addEventListener('click',e=>{
        e.stopPropagation();this.statsOpen=false;this.syncGainsBar();
      });
      panel.querySelector('[data-aftoggle]').addEventListener('pointerdown',e=>e.stopPropagation());
      document.body.appendChild(panel);
      // Kéo di chuyển
      const head=panel.querySelector('[data-afdrag]');
      let drag=null;
      const onDown=(e)=>{
        if(panel.classList.contains('docked'))return;
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
        if(panel.classList.contains('docked'))return;
        try{
          const r=panel.getBoundingClientRect();
          store.set('afStatsPos',{l:r.left,t:r.top});
        }catch{}
      });
    }
    panel.style.display=this.statsOpen?'':'none';
    const body=panel.querySelector('.af-body')||panel;
    // Snapshot lại mỗi lần vẽ — tránh miss delta giữa các tick
    try{this.trackGains()}catch{}
    const d=this.gainsDelta();
    if(!d){
      sum.innerHTML='Auto…';
      body.innerHTML='<div class="af-sub">Đang bắt đầu…</div>';
      return;
    }
    const pair=p=>{
      if(p&&typeof p==='object'&&('net' in p||'plus' in p))return p;
      const n=Number(p)||0;return{plus:Math.max(0,n),minus:Math.max(0,-n),net:n};
    };
    const sg=n=>{const x=Number(n)||0;return (x>0?'+':'')+F(x)};
    const line=(label,p)=>{
      const x=pair(p);
      return `<div class="af-row"><span class="af-k">${E(label)}</span><span><span class="pos">${sg(x.plus)}</span> <span class="neg">${x.minus?('−'+F(x.minus)):'−0'}</span> = <b class="net">${sg(x.net)}</b></span></div>`;
    };
    const short=p=>{const x=pair(p);return sg(x.net)};
    const collapsed=false;
    panel.classList.toggle('col',collapsed);
    const tg=panel.querySelector('[data-aftoggle]');if(tg)tg.textContent=collapsed?'▸':'▾';
    const hh=panel.querySelector('.af-h');
    if(hh)hh.textContent='Thống kê Auto';
    sum.innerHTML=`<span>Linh thạch: <b>${short(d.linhThach)}</b></span><span class="sep"> · </span><span>Tu vi: <b>${short(d.tuVi)}</b></span>`;try{vkDock()}catch{}
    if(collapsed){body.innerHTML='';return}
    const stats=this.STAT_KEYS.map(k=>[this.STAT_LABELS[k]||k,pair(d.chiSo?.[k])]).filter(([,x])=>x.plus||x.minus);
    const bag=[];
    for(let p=1;p<=8;p++){
      const v=Number((d.bagByPham&&(d.bagByPham[p]??d.bagByPham[String(p)]))||0);
      if(v)bag.push(`<div class="af-row"><span class="af-k">${E(this.PHAM_TEN[p]||('Phẩm '+p))}</span><b class="net">${sg(v)}</b></div>`);
    }
    body.innerHTML=`
      ${line('Tu vi',d.tuVi)}
      ${line('Linh thạch',d.linhThach)}
      ${line('Lịch luyện',d.lichLuyen)}
      ${N(d.canhGioi?.net)&&d.canhGioi.net?line('Cảnh giới',d.canhGioi):''}
      ${stats.map(([l,x])=>line(l,x)).join('')||'<div class="af-sub">Chỉ số: chưa đổi</div>'}
      ${bag.length?'<div class="af-sec">Vật phẩm trong túi</div>'+bag.join(''):''}
      <div class="af-sub">Năm ${F(d.base.nam)} → ${F(d.now.nam)} · bước ${this.stepN||0}${this.paused?' · tạm dừng':''} · (+ nhận, − mất, = thực)</div>`;
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
    try{vkDock()}catch{}
    if(!bar.classList.contains('incard'))try{
      const fr=fab.getBoundingClientRect();
      const w=40;
      bar.style.left=Math.max(4,fr.left+fr.width/2-w/2)+'px';
      bar.style.top='auto';
      bar.style.bottom=(window.innerHeight-fr.top+8)+'px';
    }catch{}
  }
};

/* ───────── Auto: nhóm sự kiện / chính sách lựa chọn / nhật ký ───────── */
const AF_UI={open:new Set(),sec:new Map()};
function afGrpHtml(){
  const A_=AutoFarm;A_.subOn('x');
  const off=A_.opts.grpOff;
  let totalOn=0,total=0;
  const body_=AF_GROUPS.map(([gk,gl])=>{
    const subs=AF_SUBS.filter(r=>r[0]===gk);
    if(!subs.length)return'';
    const n=subs.reduce((t,r)=>t+r[3],0),on=subs.filter(r=>!off.has(r[1])).reduce((t,r)=>t+r[3],0);
    totalOn+=on;total+=n;
    const open=AF_UI.open.has(gk);
    return `<div class="gg" data-g="${gk}"><div class="gh"><input type="checkbox" data-gcb="${gk}" aria-label="${E(gl)}"><button type="button" class="gt" data-gtog="${gk}"><span class="car">${open?'▾':'▸'}</span> <b>${E(gl)}</b> <small data-gcount="${gk}">${on}/${n}</small></button></div>
      <div class="gb" ${open?'':'hidden'}>${subs.map(r=>`<label class="sub"><input type="checkbox" data-sub="${E(r[1])}" ${off.has(r[1])?'':'checked'}><span>${E(r[2])} <small>${r[3]?r[3]+' sự kiện':''}${r[4]?` · <span class="r">⚠ ${r[4]} có cửa nguy</span>`:''}</small></span></label>`).join('')}</div></div>`;
  }).join('');
  return `<div class="grp" id="af-grp" data-total="${totalOn}/${total}">
    <div class="sub">Tích để cho phép, bỏ tích để Auto bỏ qua cả nhóm (gặp thì rời đi). Bấm tên nhóm để mở từng mục. Mặc định tắt: tuyển đồ · đại bỉ · công phá sơn môn.</div>
    <div class="bar"><button class="btn" data-gall="1">Chọn hết</button><button class="btn" data-gall="0">Bỏ hết</button><button class="btn" data-gdef="1">Mặc định</button></div>
    ${body_}</div>`;
}
function afSec(key,title,inner,open){
  const on=AF_UI.sec.has(key)?AF_UI.sec.get(key):open;
  return `<details class="sec" data-sec="${key}" ${on?'open':''}><summary>${title}</summary><div class="secb">${inner}</div></details>`;
}
function afPolHtml(){
  const P=AutoFarm.P();
  return `<div class="pol" id="af-pol">
    <div class="sub">Trong một sự kiện, Auto sẽ <b>không</b> chọn lựa chọn có hệ quả bị bỏ tích ở dưới (dựa trên effects thật của game, kể cả khi thất bại). Nếu mọi cửa đều trái chính sách thì bấm Thoát.</div>
    <div class="bar"><label class="sub grow">Mẫu nhanh
      <select id="af-polpre"><option value="">— chọn mẫu —</option><option value="chinh">Chính đạo · an toàn</option><option value="ma">Ma tu / tà đạo</option><option value="lieu">Liều lĩnh (trừ trọng thương)</option></select></label></div>
    ${AutoFarm.POL_INFO.map(([k,l,d])=>`<label class="sub"><input type="checkbox" data-pol="${k}" ${P[k]?'checked':''}><span><b>Cho phép: ${E(l)}</b><br><small>${E(d)}</small></span></label>`).join('')}</div>`;
}
function afJrnHtml(){
  AutoFarm.jrnLoad();
  return `<div class="jr">
    <div class="sub">Mỗi sự kiện gặp được ghi: nhóm, nội dung, mọi lựa chọn (rủi ro, cơ hội, giá trị, lý do bị loại), lựa chọn đã bấm, kết quả và thay đổi chỉ số. Xuất ra để gửi lại cho mình sửa lỗi.</div>
    <div class="bar"><button class="btn pri" id="af-jrn-json">Tải JSON</button><button class="btn" id="af-jrn-copy">Copy bản đọc</button><button class="btn" id="af-jrn-clear">Xóa</button></div>
    <div id="af-jrn" style="max-height:34vh;overflow:auto;font-size:12px">${AutoFarm.jrnListHtml()}</div></div>`;
}
function afGrpRefresh(root){
  const off=AutoFarm.opts.grpOff;let tOn=0,tAll=0;
  AF_GROUPS.forEach(([gk])=>{
    const subs=AF_SUBS.filter(r=>r[0]===gk);if(!subs.length)return;
    const n=subs.reduce((t,r)=>t+r[3],0),on=subs.filter(r=>!off.has(r[1])).reduce((t,r)=>t+r[3],0);
    tOn+=on;tAll+=n;
    const cb=$(root,`[data-gcb="${gk}"]`),ct=$(root,`[data-gcount="${gk}"]`);
    const nOn=subs.filter(r=>!off.has(r[1])).length;
    if(cb){cb.checked=nOn===subs.length;cb.indeterminate=nOn>0&&nOn<subs.length}
    if(ct)ct.textContent=on+'/'+n;
    subs.forEach(r=>{const x=$(root,`[data-sub="${r[1]}"]`);if(x)x.checked=!off.has(r[1])});
  });
  const t=$(body,'#af-grp-total');if(t)t.textContent=tOn+'/'+tAll;
}
function afWire(){
  body.querySelectorAll('details.sec').forEach(d=>d.addEventListener('toggle',()=>AF_UI.sec.set(d.dataset.sec,d.open)));
  const gp=$(body,'#af-grp');
  if(gp){
    afGrpRefresh(gp);
    gp.addEventListener('change',e=>{
      const t=e.target,off=AutoFarm.opts.grpOff;
      if(t.dataset.sub!==undefined){t.checked?off.delete(t.dataset.sub):off.add(t.dataset.sub)}
      else if(t.dataset.gcb){AF_SUBS.filter(r=>r[0]===t.dataset.gcb).forEach(r=>{t.checked?off.delete(r[1]):off.add(r[1])})}
      else return;
      AutoFarm.saveCfg();afGrpRefresh(gp);
    });
    gp.addEventListener('click',e=>{
      const tg=e.target.closest('[data-gtog]');
      if(tg){const k=tg.dataset.gtog,gb=tg.closest('.gg').querySelector('.gb');const open=gb.hasAttribute('hidden');open?(gb.removeAttribute('hidden'),AF_UI.open.add(k)):(gb.setAttribute('hidden',''),AF_UI.open.delete(k));tg.querySelector('.car').textContent=open?'▾':'▸';return}
      const all=e.target.closest('[data-gall]');
      if(all){const off=AutoFarm.opts.grpOff;AF_SUBS.forEach(r=>{all.dataset.gall==='1'?off.delete(r[1]):off.add(r[1])});AutoFarm.saveCfg();afGrpRefresh(gp);return}
      if(e.target.closest('[data-gdef]')){AutoFarm.opts.grpOff=new Set(AutoFarm.GRP_DEF_OFF);AutoFarm.saveCfg();afGrpRefresh(gp)}
    });
  }
  const pp=$(body,'#af-pol');
  if(pp){
    pp.addEventListener('change',e=>{
      const t=e.target;
      if(t.dataset.pol){AutoFarm.opts.pol[t.dataset.pol]=t.checked;AutoFarm.saveCfg();const sel=$(pp,'#af-polpre');if(sel)sel.value=''}
      else if(t.id==='af-polpre'&&t.value){
        AutoFarm.opts.pol={...AutoFarm.POL_DEF,...AutoFarm.POL_PRESET[t.value]};AutoFarm.saveCfg();
        pp.querySelectorAll('[data-pol]').forEach(x=>{x.checked=!!AutoFarm.opts.pol[x.dataset.pol]});
        toast('Đã áp mẫu: '+t.selectedOptions[0].textContent,'ok',2000);
      }
    });
  }
  const jj=$(body,'#af-jrn-json');if(jj)jj.onclick=()=>AutoFarm.exportJournal();
  const jc=$(body,'#af-jrn-copy');if(jc)jc.onclick=()=>AutoFarm.copyJournalText();
  const jx=$(body,'#af-jrn-clear');if(jx)jx.onclick=()=>{if(confirm('Xóa toàn bộ nhật ký sự kiện?'))AutoFarm.clearJournal()};
}
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
    <button class="btn" id="af-refresh">Quét lại</button>
    <button class="btn" id="af-export">Xuất log</button>
  </div>
  <div class="sum" id="af-stats">OK ${AutoFarm.stats.ok} · bỏ ${AutoFarm.stats.skip} · lỗi ${AutoFarm.stats.err} · chữa ${AutoFarm.stats.heal||0}${AutoFarm.running?(AutoFarm.paused?' · TẠM DỪNG':' · ĐANG CHẠY'):''}</div>
  ${afSec('opt','Tùy chọn chạy',`<div class="bar" style="flex-wrap:wrap;gap:8px">
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
    <label class="sub"><input type="checkbox" id="af-mapfollow" ${store.get('mapFollow',true)!==false?'checked':''}> Bản đồ tự dõi theo nhân vật</label>
  </div>
  <div class="bar">
    <label class="sub grow">Sau thắng (tù binh)
      <select id="af-xutri">
        <option value="tha" ${o.xuTri==='tha'?'selected':''}>Tha mạng</option>
        <option value="auto" ${o.xuTri==='auto'?'selected':''}>Tự động: kết liễu lấy đồ nếu game không cảnh báo</option>
        <option value="ket_lieu" ${o.xuTri==='ket_lieu'?'selected':''}>Kết liễu</option>
        <option value="phe" ${o.xuTri==='phe'?'selected':''}>Phế tu vi</option>
        <option value="suu_hon" ${o.xuTri==='suu_hon'?'selected':''}>Sưu hồn (nếu có)</option>
      </select>
    </label>
    <label class="sub grow">Ưu tiên khi chọn lựa chọn sự kiện
      <select id="af-focus">
        <option value="balanced" ${(o.focus||'balanced')==='balanced'?'selected':''}>Cân bằng</option>
        <option value="tuvi" ${o.focus==='tuvi'?'selected':''}>Tu vi / lịch luyện</option>
        <option value="taiNguyen" ${o.focus==='taiNguyen'?'selected':''}>Tài nguyên (linh thạch, đồ)</option>
        <option value="chiSo" ${o.focus==='chiSo'?'selected':''}>Chỉ số (thần thức, khí vận, đạo tâm…)</option>
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
  </div>`,true)}
  ${afSec('pol','Chính sách lựa chọn',afPolHtml(),false)}
  ${afSec('grp','Nhóm sự kiện Auto sẽ làm <small id="af-grp-total"></small>',afGrpHtml(),false)}
  ${afSec('jrn','Nhật ký sự kiện <small id="af-jrn-n">'+AutoFarm.jr.list.length+' bản ghi</small>',afJrnHtml(),false)}
  ${afSec('log','Nhật ký chạy (hệ thống)',`<div class="panel" style="max-height:32vh;overflow:auto;font-size:12px" id="af-log">${AutoFarm.log.slice().reverse().map(x=>`<div class="sub${x.kind==='err'?' r':x.kind==='ok'?' g':''}">[${E(x.tShow||x.t||'')}] ${E(x.msg)}</div>`).join('')||'<div class="sub">Chưa có nhật ký. Bấm Bắt đầu rồi gửi file log nếu lỗi.</div>'}</div>`,false)}
  ${afSec('tgt','Mục tiêu gần → xa ('+list.length+')',`${list.map(t=>`<article class="card ${t.danger.rank>=2?'d'+t.danger.rank:''}" data-slot="${E(t.slot)}" data-title="${E(t.title)}">
    <div class="ico nd">${sealIco('劍',34)}</div>
    <div><b>${E(t.title)}</b><small>${E(t.enc)} · ${E(t.slot)} · ${E(t.mode||'')}</small></div>
    <div class="side">${N(t.travel)?fmtTime(t.travel):'—'}<small>${N(t.miles)?fmtMiles(t.miles):''}</small></div>
    <div class="tags"><span class="tag">${E(t.danger.label)}</span>${t.left!=null?`<span class="tag g">Còn ${t.left}/3 lần săn</span>`:''}${t.priority>=40?`<span class="tag o">Việc gấp</span>`:''}</div>
    <div class="acts"><button class="btn" data-act="view">Xem</button><button class="btn pri" data-act="go">Đường</button></div>
  </article>`).join('')||'<div class="empty">Không có mục tiêu phù hợp trên map hiện tại.<br>Hãy đi khám phá thêm rồi quét lại. Tắt «Chỉ ev.san_yeu» để cày rộng hơn.</div>'}`,false)}`;
  afWire();
  $(body,'#af-toggle').onclick=()=>AutoFarm.start();
  $(body,'#af-refresh').onclick=()=>VIEWS.auto();
  $(body,'#af-export').onclick=()=>AutoFarm.exportLog();
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
  $(body,'#af-mapfollow').onchange=e=>{try{store.set('mapFollow',e.target.checked)}catch{}};
  $(body,'#af-xutri').onchange=e=>{o.xuTri=e.target.value;store.set('xuTri',o.xuTri);toast('Đã nhớ: xử tù binh = '+o.xuTri,'ok',2200)};
  $(body,'#af-avoid').onchange=e=>{o.avoidBeasts=String(e.target.value||'');store.set('afAvoid',o.avoidBeasts);toast('Né: '+(o.avoidBeasts||'(trống)'),'ok',2000)};
  $(body,'#af-minlife').onchange=e=>{o.minLifeYears=Math.max(0,+e.target.value||0);store.set('afMinLife',o.minLifeYears);toast('Dừng khi thọ ≤ '+o.minLifeYears+' năm','ok',2000)};
  $(body,'#af-focus').onchange=e=>{o.focus=e.target.value;store.set('afFocus',o.focus);toast('Ưu tiên lựa chọn: '+e.target.selectedOptions[0].textContent,'ok',2000)};
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
  body.innerHTML=`<div class="bar"><select id="j-sort" class="grow">${Object.entries(SORTS).map(([k,v])=>`<option value="${k}" ${k===jobUi.sort?'selected':''}>${v.name}</option>`).join('')}</select></div><div class="sum">${rows.length} việc đã nhận · nhận ở bảng treo thưởng thôn trấn, thành, kinh đô hoặc điện nhiệm vụ tông môn</div>${rows.map(r=>r.slot?cardHtml(r):`<article class="card late"><div class="ico nd">${sealIco('賞',34)}</div><div><b>${E(r.title)}</b><small>Chưa rõ nơi làm việc</small></div></article>`).join('')||'<div class="empty">Bạn chưa nhận việc treo thưởng nào.<br>Nhận việc ở bảng treo thưởng rồi quay lại đây.</div>'}`;
  $(body,'#j-sort').onchange=e=>{jobUi.sort=e.target.value;render()};
};

/* ───────── Tab: Nhân mạch ───────── */
const SEX={nam:'Nam',nu:'Nữ'};
const REL_NAME={quen_biet:'Quen biết',doi_thu:'Đối thủ',bang_huu:'Bằng hữu',hiem_khich:'Hiềm khích',ke_thu:'Kẻ thù',tu_thu:'Tử thù',tri_ky:'Tri kỷ',ket_nghia:'Huynh đệ kết nghĩa',dao_lu:'Đạo lữ',su_phu:'Sư phụ',phan_boi:'Kẻ phản bội'};
const relName=k=>REL_NAME[k]||String(k||'quen_biet').replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const TRIP_NAME={lich_luyen:'Lịch luyện',viec:'Lo việc',ve_que:'Về quê',tham:'Tới thăm'};
let facSlotIdx=null;
const facSlot=dd=>{if(!facSlotIdx){facSlotIdx=new Map();for(const s of A(W.slots))if(s?.dia_danh)facSlotIdx.set(s.dia_danh,s.id)}return facSlotIdx.get(dd)||null};
/* Nơi ở gốc của NPC — theo hàm game: người giữ ghế/sư phụ ở thế lực của họ; đạo lữ theo động phủ/tông môn của người chơi */
function npcBase(npc){
  const r=run();
  if(npc.theLuc&&(npc.seat||npc.danhPhan==='su_phu')){const s=facSlot(npc.theLuc);if(s&&hasSlot(s))return{slot:s,note:'Ở thế lực của họ · '+slotLabel(s),src:'home'}}
  const mine=Object.keys(r.noiChon||{}).find(k=>r.noiChon[k]?.chuNhan==='nguoi_choi');
  if(npc.danhPhan==='dao_lu'){
    if(npc.home&&r.noiChon?.[npc.home]?.chuNhan==='nguoi_choi')return{slot:npc.home,note:'Ở động phủ của bạn',src:'home'};
    const y=mine||(typeof r.flags?.mon_phai==='string'?r.flags.mon_phai:null);if(y&&hasSlot(y))return{slot:y,note:'Ở chỗ bạn · '+slotLabel(y),src:'home'};
  }
  if(hasSlot(npc.home))return{slot:npc.home,note:r.noiChon?.[npc.home]?.chuNhan==='nguoi_choi'?'Ở động phủ của bạn':'Ở nhà · '+slotLabel(npc.home),src:'home'};
  if(hasSlot(npc.que))return{slot:npc.que,note:'Quê nhà · '+slotLabel(npc.que),src:'home'};
  return null;
}
function personLocation(id,npc){
  const r=run(),now=nowYear();
  for(const [key,node] of Object.entries(r.nodes||{})){if(!node||node.viec)continue;if(node.npc===id||Object.values(node.vars||{}).some(v=>String(v)===id)){const s=node.slot||key;if(hasSlot(s))return{slot:s,note:'Đang xuất hiện trên bản đồ',src:'now'}}}
  if(r.dongHanh?.npc===id)return{slot:r.viTri,note:'Đang đồng hành cùng bạn',src:'with'};
  const base=npcBase(npc),tr=npc.trip&&N(npc.trip.until)&&+npc.trip.until>now?npc.trip:null;
  if(tr){
    if(N(tr.arrive)&&+tr.arrive>now&&hasSlot(tr.to)){const from=hasSlot(tr.from)?tr.from:base?.slot||null;return{slot:from,note:`Đang trên đường tới ${slotLabel(tr.to)} · tới sau ~${fmtTime(+tr.arrive-now)}`,src:'trip'}}
    if(hasSlot(tr.to))return{slot:tr.to,note:`${TRIP_NAME[tr.kind]||'Đang đi'} · ${slotLabel(tr.to)} · về sau ~${fmtTime(Math.max(.1,+tr.until-now))}`,src:'trip'};
  }
  if(base)return base;
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
    out.push({id,name:strip(npc.ten||id),title:strip(def?.goi||''),sex:SEX[String(npc.gioiTinh||'').toLowerCase()]||'Chưa rõ',alive,realm:REALMS[npc.canhGioi]?`${REALMS[npc.canhGioi]}${N(npc.tieuCanhGioi)?' · '+STAGES[npc.tieuCanhGioi]:''}`:'',age:N(npc.namSinh)?Math.floor(nowYear()-npc.namSinh):null,rel:relName(npc.danhPhan),relKey:npc.danhPhan||'quen_biet',fav:N(npc.haoCam)?+npc.haoCam:0,debt:N(npc.no?.so)?+npc.no.so:0,romance:Boolean(npc.tinhY),hurt:alive&&N(npc.injuredUntil)&&+npc.injuredUntil>nowYear()?+npc.injuredUntil-nowYear():0,loc,here,acts,travel:loc.slot?travelTo(loc.slot):NaN,miles:loc.slot?milesTo(loc.slot):NaN,kind:def?.loai||''});
  }
  return out;
}
/* ───────── Nhân mạch: tương tác NPC (điều kiện lấy từ code game: npc_interact, npc_invite, dualCultivation, hunt) ───────── */
const NPC_FRIEND=['tri_ky','ket_nghia','dao_lu'];
const DRAIN_ML=0.1; /* hằng ML của game: tỉ lệ tu vi thu khi thải bổ */
const NPC_FILTERS=[['all','Mọi việc'],['gift','Có thể tặng quà ngay'],['hunt','Kẻ thù truy tìm được'],['invite','Mời tới được'],['drain','Thải bổ được'],['dual','Song tu được']];
const giftLevel=g=>g>=10?'rất vui':g>=4?'vui':'phải phép';
function npcFlags(id,npc,e,inv){
  const f={};
  if(!npc||npc.song===false||npc.chuaGap)return f;
  try{const hb=g.huntBase?.(id);if(hb!==undefined&&hb!==null){f.foe=true;f.huntSlot=hb;f.huntBlock=g.huntBlock?.(id)||''}}catch{}
  const iv=inv?.get(id);if(iv){f.invite=true;f.inviteYears=iv.years;f.inviteReason=iv.reason||''}
  try{const DB=coreFn('drainBlock'),SV=coreFn('drainerBlock');if(DB&&e){f.drainerReason=SV?(SV(e)||''):'';f.drainReason=DB(e,id)||'';f.drainOk=!f.drainReason}}catch{}
  if(npc.danhPhan==='dao_lu'){try{const DU=coreFn('dualBlock');if(DU&&e){f.dualReason=DU(e,id)||'';f.dualOk=!f.dualReason}}catch{}}
  return f;
}
function npcGifts(id,npc,e){
  const out=[];const GF=coreFn('giftable'),GA=coreFn('giftAffinity');
  if(!GF||!GA||!e)return{list:out,like:''};
  for(const [iid,cnt] of Object.entries(me().tuiDo||{})){
    try{if(!GF(e,iid))continue;const def=C.items.get(iid);if(!def)continue;out.push({id:iid,ten:T(def.ten),n:Number(cnt)||1,gain:Number(GA(e,id,npc,def))||0})}catch{}
  }
  out.sort((a,b)=>b.gain-a.gain||a.ten.localeCompare(b.ten,'vi'));
  let like='';try{like=String(g.relationInfo?.(id)?.like||'')}catch{}
  return{list:out,like};
}
/* ───────── Nhân mạch: luật thời gian & đạo lữ — đọc từ code game (banCoTheTham, ev.tham_ban_cu, ev.rung_dong/nhan_duyen) ───────── */
const waitTxt=y=>{y=Math.max(0,+y||0);const m=Math.ceil(y*12-1e-6);if(m<=0)return'chưa tới 1 tháng';const Y=Math.floor(m/12),M=m%12;return(Y?Y+' năm':'')+(Y&&M?' ':'')+(M?M+' tháng':'')};
const VISIT_GAP=5,FRIEND_REL=['bang_huu','tri_ky','ket_nghia','dao_lu'];
function visitInfo(id,npc,e){
  const r=run();
  if(npc.chuaGap)return{ok:false,why:'Chưa từng gặp mặt nên chưa thăm được'};
  if(!FRIEND_REL.includes(npc.danhPhan||''))return{ok:false,why:`Mới chỉ ${relName(npc.danhPhan||'quen_biet').toLowerCase()} — game chỉ cho "Thăm bạn cũ" với bằng hữu, tri kỷ, huynh đệ kết nghĩa hoặc đạo lữ`};
  const last=npc.namGapCuoi??npc.namGap,since=r.nam-last,remain=VISIT_GAP-since;
  if(remain>1e-9)return{ok:false,why:`Mới gặp cách đây ${waitTxt(since)} — game bắt cách nhau ${VISIT_GAP} năm, còn phải đợi ${waitTxt(remain)} nữa`,wait:remain};
  if(!npcInRange(e,npc))return{ok:false,why:'Ở xa quá tầm đi lại của ngươi — phải tới gần mới thăm được'};
  return{ok:true};
}
function evLimit(d){
  const r=run(),h=r.history?.[d.id],L=d.limits||{};
  if(L.moi_run!==undefined&&(h?.lan??0)>=L.moi_run)return'Đã hết lượt trong kiếp này';
  if(L.hoi_chieu_nam!==undefined&&h&&Number.isFinite(h.namCuoi)){const w=L.hoi_chieu_nam-(r.nam-h.namCuoi);if(w>1e-9)return'Còn đợi '+waitTxt(w)}
  return'';
}
const LIFE_YOUNG=0.4;
function daoLuDiag(id,npc,e){
  const r=run(),mv=me(),out={rows:[],step:'',blockWhy:''};
  if(npc.danhPhan==='dao_lu'){out.done=true;return out}
  if(npc.chuaGap||!npc.song)return out;
  const mine=mv.gioiTinh??'nam',age=Math.floor(r.nam-npc.namSinh),life=Number(BASE_LIFE[npc.canhGioi])||0,lim=life*LIFE_YOUNG,fav=Number(npc.haoCam)||0;
  const second=!!npc.tinhY,need=second?75:55;
  const others=Object.entries(r.npc).filter(([k,n])=>k!==id&&n.song&&(n.tinhY||n.danhPhan==='dao_lu')).map(([,n])=>strip(n.ten||''));
  const dl=Object.values(r.npc).filter(n=>n.danhPhan==='dao_lu').length;
  const R=(ok,label,detail)=>out.rows.push({ok,label,detail});
  R(['bang_huu','tri_ky'].includes(npc.danhPhan),'Danh phận bằng hữu hoặc tri kỷ',`hiện là ${relName(npc.danhPhan||'quen_biet').toLowerCase()}`);
  R(fav>=need,`Hảo cảm ≥ ${need}`,`hiện ${F(fav)}`);
  R(npc.gioiTinh&&npc.gioiTinh!==mine,'Khác giới với ngươi',`họ ${SEX[String(npc.gioiTinh||'').toLowerCase()]||'?'}, ngươi ${SEX[mine]||mine}`);
  R(age<=lim,`Còn trẻ (tuổi ≤ ${Math.floor(lim)}, tức ${Math.round(LIFE_YOUNG*100)}% thọ nguyên cảnh giới hiện tại)`,`họ ${age} tuổi`);
  if(!second)R(!npc.tinhY&&!others.length,'Cả ngươi lẫn họ chưa để ý ai khác',others.length?`đang có tình ý/đạo lữ với: ${others.slice(0,3).join(', ')}`:'chưa có');
  else R(true,'Họ đã có tình ý với ngươi','đã nhận hoa');
  R(dl===0,'Ngươi chưa có đạo lữ',dl?`đã có ${dl} đạo lữ`:'chưa có');
  const bad=out.rows.filter(x=>!x.ok);
  out.step=bad.length?'':(second?'ngo':'hoa');
  out.pending=second?'ngo':'hoa';
  out.blockWhy='';
  return out;
}
function daoLuHtml(DL,npc){
  if(DL.done)return`<div class="sub" style="margin-top:8px">${grpIco('dao_lu',18)}Đã là đạo lữ của ngươi.</div>`;
  if(!DL.rows.length)return'';
  const ok=DL.rows.every(x=>x.ok);
  return`<details class="dl-box" ${ok?'open':''}><summary><b>Đường tới đạo lữ</b> <span class="sub">· bước ${DL.pending==='ngo'?'2/2 · ngỏ ý kết đạo lữ':'1/2 · tỏ lòng bằng nhành hoa'} ${ok?'· đủ điều kiện, bấm nút phía trên':'· chưa đủ'}</span></summary>${DL.rows.map(x=>`<div class="sub dl-r ${x.ok?'ok':'no'}">${x.ok?'✔':'✘'} ${E(x.label)} <i>— ${E(x.detail)}</i></div>`).join('')}<div class="sub" style="margin-top:4px">Cả hai bước nằm trong "Thăm bạn cũ" (lựa chọn ẩn, chỉ hiện khi đủ điều kiện). Tỏ lòng còn một lần thử khí vận: hỏng thì tụt 3 hảo cảm. Sau khi họ nhận hoa và hảo cảm ≥ 75 mới ngỏ ý kết đạo lữ được.</div></details>`;
}
function npcPanel(x,npc,e,inv,fl){
  const parts=[];
  const nm=E(x.name);
  /* 0. Gọi ra tương tác — mỗi nút đã kiểm tra đúng điều kiện của game; bấm là mở ngay trong game */
  if(x.alive){
    const busy=npcBusy(),VI=visitInfo(x.id,npc,e),DL=daoLuDiag(x.id,npc),yr=Math.floor(run().nam),giftWait=npc.lastGiftYear===yr?(yr+1-run().nam):0;
    const evs=npcEvents(x.id,npc,e);
    const notesM=new Map();
    const B=(k,a,t,why,pri)=>{const dis=busy||why;if(why&&!busy){const l=notesM.get(why)||[];l.push(t);notesM.set(why,l)}return`<button class="btn npcb ${pri?'pri':''}" data-npcgo="${k}" data-id="${E(x.id)}" ${a?`data-arg="${E(a)}"`:''} ${dis?'disabled':''} ${why?`title="${E(why)}"`:''}><span>${t}</span></button>`};
    const vWhy=VI.ok?'':VI.why;
    const btns=[
      B('visit','','Thăm bạn cũ',vWhy,1),
      B('visit','han','Hàn huyên',vWhy),
      B('visit','tu','Tu luyện cùng',vWhy),
      B('visit','tang','Tặng quà',vWhy||(giftWait>0?`Năm nay đã tặng rồi — đợi sang năm (còn ${waitTxt(giftWait)})`:'')),
      DL.step==='hoa'?B('visit','hoa','Tỏ lòng · tặng hoa',vWhy||DL.blockWhy):'',
      DL.step==='ngo'?B('visit','ngo','Ngỏ ý kết đạo lữ',vWhy||DL.blockWhy):'',
      npc.danhPhan==='dao_lu'?B('dual','','Song tu',''):'',
      fl.drainOk&&!fl.foe?B('drain','','Thải bổ',''):'',
      `<button class="btn npcb" data-npcpin="${E(x.id)}"><span>${npc.pinned?'Bỏ ghim':'Ghim'}</span></button>`,
      run().dongHanh?.npc===x.id?'<button class="btn npcb" data-npcend="1"><span>Từ biệt</span></button>':''
    ].filter(Boolean).join('');
    const notes=[...notesM].map(([w,l])=>`<b>${l.join(' · ')}</b>: ${E(w)}`);
    const evb=evs.map(v=>{const why=v.lock||(npcInRange(e,npc)?'':'Ở xa quá tầm đi lại');return`<button class="btn npcb" data-npcgo="ev" data-id="${E(x.id)}" data-arg="${E(v.id)}" ${busy||why?'disabled':''} title="${E((why?why+' — ':'')+(v.gap==='cho_ho'?'Sự kiện ở nơi họ':'Họ tìm tới'))}"><span>${E(v.ten)}${v.lock?`<small>${E(v.lock)}</small>`:EV_GROUP[v.kind]?`<small>${EV_GROUP[v.kind]}</small>`:''}</span></button>`}).join('');
    parts.push(`<div class="npc-sec"><b>${grpIco('%s',18)}Gọi ra · tương tác ngay</b> <span class="sub">· bấm là mở ngay trong game, bảng tool tự hạ xuống</span>${busy?`<div class="sub" style="color:var(--amber)">${E(busy)}</div>`:''}<div class="npc-grid">${btns}</div>${notes.length?`<div class="sub" style="margin-top:6px;line-height:1.55">${notes.map(n=>'• '+n).join('<br>')}</div>`:''}${evs.length?`<div class="sub" style="margin:8px 0 4px">Chuyện hợp với người này lúc này (${evs.length}) — đúng điều kiện của game:</div><div class="npc-grid">${evb}</div>`:'<div class="sub" style="margin-top:6px">Lúc này không có chuyện đặc biệt nào hợp với họ.</div>'}${daoLuHtml(DL,npc)}</div>`);
  }
  /* 1. Tặng quà */
  if(x.alive&&!fl.foe){
    const G=npcGifts(x.id,npc,e),yr=Math.floor(run().nam),given=npc.lastGiftYear===yr;
    const top=G.list.slice(0,5);
    parts.push(`<div class="npc-sec"><b>${grpIco('%s',18)}Tặng quà</b> <span class="sub">${given?'· năm nay đã tặng, đợi sang năm':x.here?'· đang cùng nơi, tặng được':'· cần ở cùng nơi với họ'}${G.like?` · họ ưa: ${E(G.like)}`:' · chưa biết sở thích (tặng một lần để biết)'}</span>${top.length?`<div class="sub" style="margin-top:3px">${top.map(t=>`${E(t.ten)} ×${t.n}: <b>+${t.gain}</b> hảo cảm (${giftLevel(t.gain)})`).join('<br>')}</div>`:'<div class="sub">Túi không có món tặng được.</div>'}</div>`);
  }
  /* 2. Truy tìm kẻ thù / báo thù */
  if(fl.foe){
    const sl=fl.huntSlot;
    parts.push(`<div class="npc-sec"><b>${grpIco('%s',18)}Truy tìm · báo thù</b> <span class="sub">· nơi xuất thân: ${E(sl?slotLabel(sl):'?')}</span><div class="sub">${fl.huntBlock?E(fl.huntBlock):'Có thể truy tìm ngay: nếu hắn đang ở đây sẽ giáp mặt, nếu không sẽ biết hắn ở chốn nào gần đó.'}</div><div class="acts">${sl?`<button class="btn" data-npcact="view" data-slot2="${E(sl)}" data-t2="${nm}">Xem nơi xuất thân</button><button class="btn" data-npcact="go" data-slot2="${E(sl)}" data-t2="${nm}">Đường đi an toàn</button>`:''}<button class="btn pri" data-npcact="hunt" data-id="${E(x.id)}" ${fl.huntBlock?'disabled':''}>Truy tìm</button></div></div>`);
  }
  /* 3. Mời tới */
  if(fl.invite&&fl.inviteReason!=='Đang ở ngay đây'){
    const items=Object.keys(me().tuiDo||{}).filter(i=>{const d=C.items.get(i);return d&&A(d.dung).some(u=>u&&'truyen_am' in u)});
    const sel=items.length?`<select data-invitesel="${E(x.id)}">${items.map(i=>`<option value="${E(i)}">${E(T(C.items.get(i).ten))} ×${me().tuiDo[i]}</option>`).join('')}</select>`:'';
    parts.push(`<div class="npc-sec"><b>${grpIco('%s',18)}Mời tới chỗ ta</b> <span class="sub">· ${fl.inviteReason?E(fl.inviteReason):`họ sẽ tới sau khoảng ${Math.max(1,Math.ceil(fl.inviteYears||0))} năm`}</span><div class="sub">${items.length?'Dùng vật truyền âm (hạc giấy…) trong túi; họ có thể mất vài năm mới tới và ở lại một lúc.':'Túi không có vật truyền âm để gửi lời mời.'}</div><div class="acts">${sel}<button class="btn pri" data-npcact="invite" data-npc="${E(x.id)}" ${fl.inviteReason||!items.length?'disabled':''}>Mời tới</button></div></div>`);
  }
  /* 4. Thải bổ / Song tu */
  if(fl.dualReason!==undefined&&x.alive){
    let gain='';try{const DG=coreFn('dualGain');gain=DG?` · được ~${F(Math.round(DG(e)))} tu vi`:''}catch{}
    parts.push(`<div class="npc-sec"><b>${grpIco('%s',18)}Song tu (đạo lữ)</b> <span class="sub">${fl.dualOk?'· làm được'+gain:'· '+E(fl.dualReason)}</span><div class="sub">Cách nhau tối thiểu 5 năm; làm ở mục hành động song tu (1 năm).</div></div>`);
  }
  if(fl.drainReason!==undefined&&x.alive&&!fl.drainerReason){
    let gain='';try{const DG=coreFn('drainGain');gain=DG&&fl.drainOk?` · được ~${F(Math.round(DG(e,npc.canhGioi,DRAIN_ML)))} tu vi`:''}catch{}
    parts.push(`<div class="npc-sec"><b>${grpIco('%s',18)}Thải bổ</b> <span class="sub">${fl.drainOk?'· làm được'+gain:'· '+E(fl.drainReason)}</span><div class="sub">Điều kiện game: tà tu có công pháp hợp hoan đang vận hành; hảo cảm ≥ 60; mỗi người 5 năm một lần, toàn thân 3 năm một lần. Làm ở mục hành động “Thải bổ” (1 năm).</div></div>`);
  }
  /* 5. Mốc hảo cảm */
  const fav=Number(npc.haoCam)||0,MOCS=[-100,-50,-20,20,60,100],nx=MOCS.find(m=>m>fav);
  parts.push(`<div class="npc-sec sub">Hảo cảm ${fav>0?'+':''}${F(fav)}${nx!==undefined?` · mốc kế ${nx>0?'+':''}${nx}`:' · đã tối đa'}. Hảo cảm ≥ 60 mới thải bổ được.</div>`);
  return parts.join('');
}

/* ───────── Nhân mạch: gọi NPC ra tương tác trực tiếp (mở encounter bằng core.startEncounter, lọc điều kiện bằng chuyenCua/trongTam/banCoTheTham của game) ───────── */
const EV_SKIP=new Set(['ev.tham_ban_cu','ev.song_tu','ev.thai_bo']);
const EV_GROUP={chien_dau:'Có giao chiến',tong_mon:'Sư môn',tu_luyen:'Tu luyện'};
const evName=(d,nm)=>strip(T(d.ten||d.id)).replace(/\{[^}]*\}/g,nm).trim();
function npcBusy(){const r=run();return r.active?'Đang có một sự kiện mở — xong việc đó đã.':r.bienCo?'Đang có biến cố chờ — xử lý trước.':''}
function npcEvents(id,npc,e){
  const out=[],CF=coreFn('chuyenCua'),DP=coreFn('dipCua');
  if(!CF||!DP||!e||!npc||npc.song===false)return out;
  let list=[];try{list=CF(e,id,DP(npc))||[]}catch{}
  const nm=strip(npc.ten||'');
  for(const d of list){if(EV_SKIP.has(d.id))continue;out.push({id:d.id,ten:evName(d,nm),kind:d.kind||'su_kien',gap:d.gap_o||'tim_toi',lock:evLimit(d)})}
  return out;
}
function npcInRange(e,npc){try{const f=coreFn('trongTam');return f?!!f(e,npc):true}catch{return true}}
function npcStart(evId,vars){
  const SE=coreFn('startEncounter');
  if(!SE||typeof g.dev!=='function')return 'Bản game này không cho tool mở sự kiện trực tiếp.';
  const b=npcBusy();if(b)return b;
  let err='';
  g.dev(ctx=>{try{if(!SE(ctx,evId,ctx.run.viTri,vars))err='Game không mở được sự kiện này.'}catch(x){err=String(x?.message||x)}});
  if(!err&&!run().active)err='Sự kiện không mở ra (có thể chưa đủ điều kiện).';
  return err;
}
function encPick(match){
  let v=null;try{v=g.encounterView?.()}catch{}
  const c=v?.choices?.find(x=>x.available&&match(x.text||''));
  if(!c)return false;g.choose(c.index);return true;
}
function npcLaunch(kind,id,arg){
  const npc=run().npc[id];if(!npc||npc.song===false)return 'Người này không còn để gặp.';
  const nm=strip(npc.ten||'');
  if(kind==='visit'){
    const e0=g.readCtx?.(),VI=visitInfo(id,npc,e0);if(!VI.ok)return VI.why;
    const BT=coreFn('banCoTheTham');let ok=true;
    if(BT){ok=false;g.dev(ctx=>{try{ok=!!BT(ctx,ctx.run.viTri)?.includes?.(id)}catch{}})}
    if(!ok)return 'Game chưa cho thăm '+nm+' lúc này (điều kiện thời gian/khoảng cách chưa đủ).';
    const err=npcStart('ev.tham_ban_cu',{ban:id});if(err)return err;
    if(arg){
      const M={han:t=>t.startsWith('Ghé thăm'),tu:t=>t.startsWith('Ở lại'),tang:t=>t.includes('một món đồ'),hoa:t=>t.includes('nhành hoa'),ngo:t=>t.startsWith('Ngỏ ý')}[arg];
      if(M&&!encPick(M))return 'Lựa chọn này chưa mở trong game — sự kiện "Thăm bạn cũ" đã mở, ngươi chọn trực tiếp trong game.';
    }
    return '';
  }
  if(kind==='dual'){
    const e=g.readCtx?.(),DU=coreFn('dualBlock'),why=DU&&e?DU(e,id):'';if(why)return why;
    return npcStart('ev.song_tu',{dl:id});
  }
  if(kind==='drain'){
    const e=g.readCtx?.(),DB=coreFn('drainBlock'),why=DB&&e?DB(e,id):'';if(why)return why;
    const err=npcStart('ev.thai_bo',{});if(err)return err;
    encPick(t=>t.includes(nm));return '';
  }
  if(kind==='ev'){
    const e=g.readCtx?.();if(!npcInRange(e,npc))return nm+' ở xa quá tầm đi lại của ngươi.';
    return npcStart(arg,{doi_tuong:id});
  }
  return 'Việc không rõ.';
}
function encLines(v){
  const L=A(v.transcript).slice(-14),r=run();
  return L.map(l=>{
    const nm=l.ai&&r.npc?.[l.ai]?strip(r.npc[l.ai].ten||''):(l.ai||'');
    const cls=l.kind==='choice'?'enc-ch':l.kind==='say'?'enc-say':l.kind==='result'||l.kind==='system'?'enc-sys':'enc-nar';
    const t=strip(String(l.text||''));
    return `<div class="${cls}">${l.kind==='say'&&nm?`<b>${E(nm)}:</b> `:''}${E(t)}</div>`;
  }).join('');
}
function encCard(){
  let v=null;try{v=g.encounterView?.()}catch{}
  const w=run().active?.waiting;
  if(!v&&!w)return '';
  let inner='';
  if(w?.kind==='npc_tang'){
    let gv=null;try{gv=g.giftView?.()}catch{}
    const items=A(gv?.options).map(o=>{const d=C.items.get(o.itemId);return `<div class="enc-gift"><span>${itemIco(o.itemId,28)}<b style="margin-left:6px">${E(T(d?.ten||o.itemId))}</b> ×${F(o.count)} <small>· ${E(({rat_vui:'rất vui',vui:'vui',phep:'phải phép'})[o.level]||'')}${o.use?' · '+E(strip(o.use)):''}</small></span><span class="acts">${o.stackable&&o.count>1?`<input type="number" min="1" max="${o.count}" value="1" class="enc-q" style="width:56px">`:''}<button class="btn pri" data-encgift="${E(o.itemId)}">Tặng</button></span></div>`}).join('');
    inner=`<div class="sub">Hộp tặng quà ${E(strip(gv?.name||''))} — mỗi năm chỉ nhận một món.</div>${items||'<div class="empty">Trong túi không có món nào tặng được.</div>'}<div class="acts"><button class="btn" data-encskip="1">Thôi</button></div>`;
  }else if(w){
    inner=`<div class="sub">Việc này đang chờ ở màn riêng của game (${E(w.kind)}). Thu nhỏ tool để xử lý trong game${w.kind==='do_hoi'?', hoặc bấm Xong để bỏ qua':''}.</div><div class="acts">${w.kind==='do_hoi'?'<button class="btn" data-encskip="1">Xong</button>':''}<button class="btn pri" data-encmin="1">Thu nhỏ tool</button></div>`;
  }else{
    const ch=A(v.choices).filter(c=>!c.thoat||true).map(c=>`<button class="btn ${c.thoat?'':'pri'}" data-encch="${c.index}" ${c.available?'':'disabled'} title="${E(c.lockedReason||'')}">${E(strip(c.text))}${c.chance?` <small>(${E(c.chance)})</small>`:''}${c.risk?` <small>${anEl('chien_dau',12)} ${E(c.risk.enemy||'')} · ${E(String(c.risk.level))}</small>`:''}</button>`).join('');
    inner=(v.transcript?.length?'':`<div class="enc-nar">${E(strip(v.text||''))}</div>`)+encLines(v)+(v.done?`<div class="acts"><button class="btn pri" data-encclose="1">Đóng</button></div>`:`<div class="acts enc-choices">${ch}</div>`);
  }
  return `<div class="card enc" style="display:block"><b>${E(strip(v?.ten||v?.id||'Sự kiện'))}</b> <small>${E(strip(v?.noi||''))}</small><div class="enc-log">${inner}</div></div>`;
}
const PSORT={act:{name:'Có thể gặp trước',fn:(a,b)=>(+b.here-+a.here)||(+b.alive-+a.alive)||(a.travel||1e9)-(b.travel||1e9)},near:{name:'Gần nhất',fn:(a,b)=>(+b.alive-+a.alive)||((N(a.travel)?a.travel:1e9)-(N(b.travel)?b.travel:1e9))},fav:{name:'Hảo cảm cao',fn:(a,b)=>b.fav-a.fav},name:{name:'Theo tên',fn:(a,b)=>a.name.localeCompare(b.name,'vi')}};
let pInv=new Map();const pUi={q:'',sort:'act',life:'alive',sex:'all',rel:'all',where:'all',act:'all',limit:40,open:{}};
VIEWS.people=()=>{
  try{pInv=new Map((g.inviteOptions?.()||[]).map(o=>[o.id,o]))}catch{pInv=new Map()}
  const e0=g.readCtx?.(),all=peopleRows(),rels=[...new Set(all.map(x=>x.rel))].sort((a,b)=>a.localeCompare(b,'vi')),q=norm(pUi.q);
  const needFl=pUi.act!=='all';for(const x of all)if(x.alive&&(needFl||pUi.open[x.id]||true))x.fl=npcFlags(x.id,run().npc[x.id],e0,pInv);
  const actOk=x=>{const fl=x.fl||{};switch(pUi.act){case'gift':return x.alive&&x.here&&run().npc[x.id].lastGiftYear!==Math.floor(run().nam);case'hunt':return !!fl.foe;case'invite':return !!fl.invite&&!fl.inviteReason;case'drain':return !!fl.drainOk;case'dual':return !!fl.dualOk;default:return true}};
  const rows=all.filter(x=>actOk(x)&&(!q||norm([x.name,x.title,x.rel,x.loc.note,x.realm].join(' ')).includes(q))&&(pUi.life==='all'||(pUi.life==='alive')===x.alive)&&(pUi.sex==='all'||x.sex===pUi.sex)&&(pUi.rel==='all'||x.rel===pUi.rel)&&(pUi.where==='all'||(pUi.where==='here'&&x.here)||(pUi.where==='known'&&x.loc.slot)||(pUi.where==='now'&&(x.loc.src==='now'||x.loc.src==='with'))||(pUi.where==='unknown'&&!x.loc.slot))).sort(PSORT[pUi.sort].fn),shown=rows.slice(0,pUi.limit);
  const sel=(id,arr,v)=>`<select id="${id}" class="grow">${arr.map(([k,n])=>`<option value="${E(k)}" ${k===v?'selected':''}>${E(n)}</option>`).join('')}</select>`;
  body.innerHTML=`<div class="bar"><input type="search" id="p-q" class="grow" placeholder="Tìm tên, quan hệ, nơi ở…" value="${E(pUi.q)}"></div><div class="bar">${sel('p-sort',Object.entries(PSORT).map(([k,v])=>[k,v.name]),pUi.sort)}${sel('p-life',[['all','Còn sống & đã khuất'],['alive','Còn sống'],['dead','Đã khuất']],pUi.life)}</div><div class="bar">${sel('p-sex',[['all','Mọi giới'],['Nam','Nam'],['Nữ','Nữ']],pUi.sex)}${sel('p-rel',[['all','Mọi quan hệ'],...rels.map(x=>[x,x])],pUi.rel)}${sel('p-where',[['all','Mọi vị trí'],['here','Ở cùng nơi'],['now','Đang xuất hiện'],['known','Biết nơi ở'],['unknown','Chưa rõ tung tích']],pUi.where)}</div><div class="bar">${sel('p-act',NPC_FILTERS,pUi.act)}</div><div class="sum">${rows.length}/${all.length} nhân mạch · ${all.filter(x=>x.fl?.foe).length} kẻ thù còn sống · ${all.filter(x=>x.fl?.invite&&!x.fl.inviteReason).length} có thể mời tới</div>
  ${shown.map(x=>`<article class="card ${x.alive?'':'late'}" ${x.loc.slot?`data-slot="${E(x.loc.slot)}" data-title="${E(x.name)}"`:''} style="grid-template-columns:40px 1fr auto">${x.alive?npcIco(x.id,40):`<div class="ico nd">${sealIco('墟',34)}</div>`}<div><b>${E(x.name)}</b><small>${E([x.title,x.realm,x.age!==null?x.age+' tuổi':''].filter(Boolean).join(' · '))}</small></div><div class="side">${N(x.travel)?fmtTime(x.travel):''}<small>${N(x.miles)?fmtMiles(x.miles):''}</small></div><div class="tags"><span class="tag">${E(x.rel)}</span><span class="tag ${x.fav>0?'g':x.fav<0?'r':''}">Hảo cảm ${x.fav>0?'+':''}${F(x.fav)}</span>${x.romance?'<span class="tag o">Có tình ý</span>':''}${x.hurt?`<span class="tag r">Đang trọng thương · ~${fmtTime(x.hurt)}</span>`:''}${x.debt?`<span class="tag r">Nợ ${F(x.debt)}</span>`:''}${x.alive?'':'<span class="tag r">Đã khuất</span>'}${x.fl?.foe?'<span class="tag r">Kẻ thù</span>':''}<span class="tag">${E(x.loc.note)}</span>${x.acts.map(a=>`<span class="tag g">${E(a)}</span>`).join('')}</div>${x.alive?`<div class="acts">${x.loc.slot?'<button class="btn" data-act="view">Xem bản đồ</button><button class="btn pri" data-act="go">Đường đi an toàn</button>':''}<button class="btn" data-npctoggle="${E(x.id)}">${pUi.open[x.id]?'Thu gọn':'Tương tác'}</button></div>`:''}${pUi.open[x.id]&&x.alive?`<div class="npc-panel" style="grid-column:1/-1">${npcPanel(x,run().npc[x.id],e0,pInv,x.fl||{})}</div>`:''}</article>`).join('')||'<div class="empty">Chưa có nhân mạch phù hợp.</div>'}${rows.length>shown.length?'<button class="btn" id="p-more" style="width:100%">Xem thêm</button>':''}`;
  $(body,'#p-more')?.addEventListener('click',()=>{pUi.limit+=40;render()});
  let t;$(body,'#p-q').oninput=e=>{pUi.q=e.target.value;pUi.limit=40;clearTimeout(t);t=setTimeout(()=>{VIEWS.people();const i=$(body,'#p-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)},220)};
  for(const [id,k] of [['p-sort','sort'],['p-life','life'],['p-sex','sex'],['p-rel','rel'],['p-where','where'],['p-act','act']])$(body,'#'+id).onchange=e=>{pUi[k]=e.target.value;pUi.limit=40;render()};
};

/* ───────── Tab: Tông môn ───────── */
const SECT_PHAI={kiem:'Kiếm tu',the:'Thể tu',khi:'Luyện bảo',ngu_thu:'Ngự thú',tran:'Trận pháp',dan:'Đan đạo',am:'Hệ Ám',phat:'Phật tu',phu:'Phù lục',khoi_loi:'Khôi lỗi',ma:'Ma tu',doc:'Độc cổ',thi:'Luyện thi',hop_hoan:'Hợp Hoan',quy:'Quỷ tu'};
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
    const travel=travelTo(s.id),rec=ev.find(e=>e.slot===s.id&&+e.denNam>nowYear());
    out.push({slot:s.id,title:T(d.ten),han:d.ten_han||'',tang:d.tang||'mon_phai',phai:d.phai,he:A(d.he),cm:d.chinh_ma,rel:d.quan_he,country:countryOf(i),mine:mine===s.id,explored:explored(s.id),hidden:Boolean(d.an),recruit:rec?+rec.denNam-nowYear():null,thi:Boolean(rec&&N(rec.tuNam)&&r.sectAdmissionAttempts?.[s.id]===rec.tuNam),travel,miles:milesTo(s.id),danger:danger(s.id),ok:N(travel),
      destroyed,destroyedYear:destroyed?dead.get(s.id):null,leader:destroyed?null:seatPerson(s.id,'leader.0'),ancestor:destroyed?null:seatPerson(s.id,'ancestor.0'),vice:destroyed?null:seatPerson(s.id,'vice_leader.0')});
  }
  return out;
}
const deadLast=fn=>(a,b)=>(+a.destroyed-+b.destroyed)||(a.destroyed?b.destroyedYear-a.destroyedYear:fn(a,b));
const SSORT={near:{name:'Gần nhất',fn:deadLast((a,b)=>(+b.mine-+a.mine)||(a.travel-b.travel))},tier:{name:'Quy mô lớn trước',fn:deadLast((a,b)=>(TANG_RANK[a.tang]-TANG_RANK[b.tang])||(a.travel-b.travel))},recruit:{name:'Đang tuyển đồ trước',fn:deadLast((a,b)=>((b.recruit!==null)-(a.recruit!==null))||(a.travel-b.travel))},name:{name:'Theo tên',fn:deadLast((a,b)=>a.title.localeCompare(b.title,'vi'))}};
const sUi={q:'',sort:'near',phai:'all',cm:'all',tang:'all',he:'all',hideDead:false};
// Lối tu của sơn môn = trường phái `phai` (đọc từ dữ liệu game) → dùng đúng danh sách/nhãn của tab Kinh mạch (BUILDS); lối theo hệ lọc theo `he` của sơn môn
const sectBuild=k=>BUILDS.find(b=>b.k===k);
const sectLabel=ph=>(sectBuild(ph)&&!sectBuild(ph).elem?sectBuild(ph).ten:SECT_PHAI[ph])||ph||'';
const sectMatchBuild=(x,k)=>{const b=sectBuild(k);if(b&&b.elem)return x.he.includes(b.elem);return x.phai===k};
const sectPathK=()=>{const w=bld.path?.w||0,k=bld.path?.k||'';return k&&w>0&&sectBuild(k)?k:''};
const personLine=(label,p)=>p?`<div class="sub" style="grid-column:2/4">${label}: ${p.known?`<b style="color:${p.alive?'var(--paper)':'#a3342b'}">${E(p.name)}</b>${p.realm?` · ${E(p.realm)}`:''}${p.alive?'':' · đã mất'}`:'<span>chưa rõ danh tính</span>'}</div>`:'';
VIEWS.sect=()=>{
  const all=sectRows(),q=norm(sUi.q),phais=[...new Set(all.map(x=>x.phai).filter(Boolean))].sort((a,b)=>{const ia=BUILDS.findIndex(x=>x.k===a),ib=BUILDS.findIndex(x=>x.k===b);return (ia<0?99:ia)-(ib<0?99:ib)||sectLabel(a).localeCompare(sectLabel(b),'vi')});
  const pK=sectPathK(),fk=sUi.phai==='path'?(pK||'all'):sUi.phai;
  const rows=all.filter(x=>(fk==='all'||sectMatchBuild(x,fk))&&(sUi.cm==='all'||x.cm===sUi.cm)&&(sUi.tang==='all'||x.tang===sUi.tang)&&(sUi.he==='all'||x.he.includes(sUi.he))&&!(sUi.hideDead&&x.destroyed)&&(!q||norm([x.title,x.han,SECT_TANG[x.tang],SECT_CM[x.cm],sectLabel(x.phai),x.country,x.leader?.name,x.he.map(h=>ELEMENT_NAMES[h]).join(' ')].join(' ')).includes(q))).sort(SSORT[sUi.sort].fn);
  const sel=(id,arr,v)=>`<select id="${id}" class="grow">${arr.map(([k,n])=>`<option value="${E(k)}" ${k===v?'selected':''}>${E(n)}</option>`).join('')}</select>`;
  const rk=run().tongMon,ndead=all.filter(x=>x.destroyed).length;
  body.innerHTML=`${rk?`<div class="panel"><b style="color:var(--gold)">Bạn đang ở ${E(slotLabel(rk.slot))}</b><div class="sub">Cấp bậc: ${E(RANKS[rk.capBac??0]||'—')}${N(me().congHien)?` · công hiến ${F(me().congHien)}`:''}</div></div>`:''}<div class="bar"><input type="search" id="s-q" class="grow" placeholder="Tìm tông môn, chưởng môn, hệ…" value="${E(sUi.q)}"></div>
  <div class="chips"><button class="chip ${sUi.tang==='all'?'on':''}" data-tang="all">Mọi quy mô</button>${Object.entries(SECT_TANG).map(([k,n])=>`<button class="chip ${sUi.tang===k?'on':''}" data-tang="${k}">${E(n)}</button>`).join('')}${ndead?`<button class="chip ${sUi.hideDead?'on':''}" id="s-dead">Ẩn đã bị diệt (${ndead})</button>`:''}</div>
  <div class="bar">${sel('s-phai',[['all','Mọi lối tu'],...(pK?[['path','Lối đang theo ở Kinh mạch: '+sectBuild(pK).ten]]:[]),...phais.map(p=>[p,(sectBuild(p)&&!sectBuild(p).elem?'['+sectBuild(p).nhom+'] ':'')+sectLabel(p)])],sUi.phai==='path'&&!pK?'all':sUi.phai)}${sel('s-sort',Object.entries(SSORT).map(([k,v])=>[k,v.name]),sUi.sort)}${sel('s-cm',[['all','Chính / Ma'],...Object.entries(SECT_CM)],sUi.cm)}${sel('s-he',[['all','Mọi hệ'],...ELEMS],sUi.he)}</div><div class="sum">${rows.length}/${all.length} tông môn</div>
  ${rows.map(x=>`<article class="card ${x.destroyed?'late':x.mine?'':'d'+(x.danger.rank>=2?x.danger.rank:0)}" data-slot="${E(x.slot)}" data-title="${E(x.title)}"><div class="ico nd">${x.destroyed?sealIco('墟',34):sectSeal(x,34)}</div><div><b>${E(x.title)}${x.han?` <small>${E(x.han)}</small>`:''}</b><small>${E(SECT_TANG[x.tang]||'')} · ${E(sectLabel(x.phai))}${pK&&sectMatchBuild(x,pK)?' ✓ đúng lối đang theo':''} · ${E(x.he.map(h=>ELEMENT_NAMES[h]||h).join('/'))}</small></div><div class="side">${fmtTime(x.travel)}<small>${fmtMiles(x.miles)}</small></div>${personLine('Chưởng môn',x.leader)}${personLine('Phó chưởng môn',x.vice)}${personLine('Tổ sư',x.ancestor)}<div class="tags">${x.destroyed?`<span class="tag r">Đã bị diệt năm ${Math.floor(x.destroyedYear)}</span>`:''}${x.mine?'<span class="tag g">Tông môn của bạn</span>':''}${x.recruit!==null&&!x.destroyed?`<span class="tag o">Đang tuyển đồ · còn ${fmtTime(Math.max(0,x.recruit))}</span>`:''}${x.recruit!==null&&x.thi&&!x.destroyed?'<span class="tag">Bạn đã thi kỳ này</span>':''}<span class="tag ${x.cm==='chinh'?'g':x.cm==='trung_lap'?'':'r'}">${E(SECT_CM[x.cm]||'')}</span>${x.country?`<span class="tag">${E(x.country)} · ${E(SECT_REL[x.rel]||'')}</span>`:''}${x.hidden?'<span class="tag">Ẩn thế</span>':''}${x.explored?'':'<span class="tag">Chưa khám phá</span>'}${x.danger.rank>=1&&!x.destroyed?`<span class="tag ${x.danger.rank>=2?'r':''}">${x.danger.label}</span>`:''}</div><div class="acts"><button class="btn" data-act="view">Xem bản đồ</button>${x.destroyed?'':'<button class="btn pri" data-act="go">Đường đi an toàn</button>'}</div></article>`).join('')||'<div class="empty">Không có tông môn phù hợp.</div>'}`;
  let t;$(body,'#s-q').oninput=e=>{sUi.q=e.target.value;clearTimeout(t);t=setTimeout(()=>{VIEWS.sect();const i=$(body,'#s-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)},220)};
  $$(body,'[data-tang]').forEach(b=>b.onclick=()=>{sUi.tang=b.dataset.tang;render()});
  $(body,'#s-dead')?.addEventListener('click',()=>{sUi.hideDead=!sUi.hideDead;render()});
  for(const [id,k] of [['s-phai','phai'],['s-sort','sort'],['s-cm','cm'],['s-he','he']])$(body,'#'+id).onchange=e=>{sUi[k]=e.target.value;render()};
};
/* ───────── Bán nhanh: tick chọn món trong túi rồi bán hết (không cần cửa hàng) ───────── */
const QS={on:false,sel:new Set(),K:null,price:{},bar:null,busy:false};
const qsHas=id=>Number(me().tuiDo?.[id]||0)>0;
const qsCtx=()=>({...g.env,run:run(),meta:g.state.meta,enc:undefined,noticeLines:[]});
function qsBlock(id){
  const nv=me(),it=C.items.get(id);if(!it)return'Không rõ vật phẩm';
  if(!qsHas(id))return'Không còn trong túi';
  if((nv.lockedItems||[]).includes(id))return'Đã khóa';
  if(it.loai==='lenh_bai'||it.tran_phai)return'Không bán được';
  if(!(it.gia>0))return'Không có giá';
  if(Number(it.pham)===8)return'Bảo vật Nghịch Thiên';
  return null;
}
function qsQuote(id){
  const n=Number(me().tuiDo?.[id]||0);if(!n||!QS.K?.IP)return NaN;
  try{const ctx=qsCtx();let t=0;for(let a=0;a<n;a++){const p=Number(QS.K.IP(ctx,id,undefined,a));if(!Number.isFinite(p))return NaN;t+=p}return t}catch{return NaN}
}
function qsCellId(el){
  try{const k=Object.keys(el).find(x=>x.startsWith('__reactFiber$'));let f=k&&el[k];
    for(let d=0;f&&d<6;d++,f=f.child){const p=f.memoizedProps;if(p&&p.it&&p.it.id)return p.it.id;const c=p&&p.children;if(c&&c.props&&c.props.it&&c.props.it.id)return c.props.it.id}
  }catch{}return null;
}
const qsCells=()=>[...document.querySelectorAll('.bnv-tui [data-tui]:not(.trong)')];
function qsMarks(){
  if(!QS.on)return;
  for(const el of qsCells()){const id=qsCellId(el),on=!!id&&QS.sel.has(id);if(el.classList.contains('vkt-qs-sel')!==on)el.classList.toggle('vkt-qs-sel',on)}
}
function qsTotals(){let kinds=0,pcs=0,gold=0,bad=false;for(const id of [...QS.sel]){if(!qsHas(id)){QS.sel.delete(id);continue}kinds++;pcs+=Number(me().tuiDo[id]);const p=QS.price[id]??(QS.price[id]=qsQuote(id));if(Number.isFinite(p))gold+=p;else bad=true}return{kinds,pcs,gold,bad}}
function qsBar(){
  const t=QS.on?qsTotals():{kinds:0,pcs:0,gold:0,bad:false};
  document.querySelectorAll('.vkt-qs-btn').forEach(n=>{
    const lab=n.querySelector('.vkt-qs-lab');if(!lab)return;
    const txt=!QS.on?'Bán nhanh':t.kinds?`Bán ${F(t.kinds)} món · +${F(t.gold)}${t.bad?'+':''}`:'Thôi bán nhanh (Esc)';
    if(lab.textContent!==txt)lab.textContent=txt;
    n.title=!QS.on?'Bán nhanh: bấm các ô muốn bán rồi bấm lại nút này để bán hết, không cần vào cửa hàng (giá theo game).':t.kinds?`Bán ${F(t.pcs)} cái của ${F(t.kinds)} món, nhận khoảng ${F(t.gold)} linh thạch. Bấm ô lần nữa để bỏ chọn.`:'Bấm các ô muốn bán (bán trọn cả chồng).';
    if(n.classList.contains('dang-chon')!==QS.on)n.classList.toggle('dang-chon',QS.on);
    n.disabled=QS.busy;
  });
}
function qsClick(){if(!QS.on)return qsStart();if(qsTotals().kinds)qsDoSell();else qsStop()}
async function qsStart(){
  if(QS.on){qsStop();return}
  if(run().tran){toast('Đang trong trận, chưa bán được','warn');return}
  QS.on=true;QS.sel.clear();QS.price={};document.documentElement.classList.add('vkt-qs-on');qsBar();qsMarks();
  try{QS.K=await BuildEngine.ensureCore()}catch{QS.K=null}
  if(!QS.K?.IP){toast('Không đọc được hàm giá bán của game, không bán nhanh được','err');qsStop();return}
  qsBar();
}
function qsStop(){QS.on=false;QS.sel.clear();document.documentElement.classList.remove('vkt-qs-on');document.querySelectorAll('.vkt-qs-sel').forEach(x=>x.classList.remove('vkt-qs-sel'));qsBar()}
function qsDoSell(){
  if(QS.busy||!QS.on)return;const nv=me(),t=qsTotals();if(!t.kinds)return;
  const ids=[...QS.sel],skipped=[];const ok=ids.filter(id=>{const b=qsBlock(id);if(b){skipped.push(`${T(C.items.get(id)?.ten||id)} (${b})`);return false}return true});
  if(!ok.length){toast('Không có món nào bán được: '+skipped.join(', '),'err',6000);return}
  const high=ok.filter(id=>Number(C.items.get(id)?.pham)>=5).map(id=>T(C.items.get(id).ten));
  if(high.length&&!confirm('Có vật phẩm phẩm cao: '+high.join(', ')+'. Vẫn bán?'))return;
  QS.busy=true;let gold=0,pcs=0,kinds=0;
  try{
    const ctx=qsCtx();
    for(const id of ok){
      const n=Number(nv.tuiDo[id]||0);if(n<=0)continue;let p=0;
      for(let a=0;a<n;a++){const x=Number(QS.K.IP(ctx,id,undefined,a));if(!Number.isFinite(x)){p=NaN;break}p+=x}
      if(!Number.isFinite(p)){skipped.push(`${T(C.items.get(id)?.ten||id)} (không tính được giá)`);continue}
      nv.tuiDo[id]-=n;if(!(nv.tuiDo[id]>0))delete nv.tuiDo[id];
      nv.linhThach=Number(nv.linhThach||0)+p;gold+=p;pcs+=n;kinds++;
    }
    g.store.setState({run:{...run(),nhanVat:{...nv,tuiDo:{...nv.tuiDo}}}});
  }catch(e){toast('Lỗi khi bán: '+(e.message||e),'err',6000)}
  QS.busy=false;QS.sel.clear();QS.price={};
  toast(`Bán nhanh: ${F(kinds)} món (${F(pcs)} cái), +${F(gold)} linh thạch.`+(skipped.length?` Bỏ qua: ${skipped.join(', ')}`:''),'ok',6000);
  qsMarks();qsBar();
}
/* chặn game xử lý ô túi khi đang ở chế độ bán nhanh, rồi tick/bỏ tick món */
function qsPick(e){
  if(!QS.on)return;const el=e.target&&e.target.closest&&e.target.closest('.bnv-tui [data-tui]');if(!el||el.classList.contains('trong'))return;
  e.stopPropagation();e.preventDefault();if(e.type!=='click')return;
  const id=qsCellId(el);if(!id)return;const b=qsBlock(id);
  if(b){toast(`${T(C.items.get(id)?.ten||id)}: ${b}`,'warn',2500);return}
  QS.sel.has(id)?QS.sel.delete(id):QS.sel.add(id);qsMarks();qsBar();
}
const qsKey=e=>{if(QS.on&&e.key==='Escape'){e.stopPropagation();qsStop()}};
for(const ev of ['pointerdown','mousedown','click','dblclick','contextmenu'])document.addEventListener(ev,qsPick,true);
document.addEventListener('keydown',qsKey,true);
const qsCss=document.createElement('style');qsCss.id=ID+'-qs-style';
qsCss.textContent=`.vkt-qs-on .bnv-tui [data-tui]:not(.trong){cursor:pointer}.vkt-qs-sel{outline:2px solid #7a1f1a!important;outline-offset:-2px;box-shadow:0 0 0 2px rgba(122,31,26,.35) inset,0 0 8px rgba(122,31,26,.55)!important}
.vkt-qs-btn{margin-left:6px}.vkt-qs-btn .vkt-qs-ico{display:inline-block;vertical-align:-.15em}`;
document.head.appendChild(qsCss);
let qsRaf=0;
function qsInject(){qsRaf=0;try{document.querySelectorAll('.bnv-don-nut:not(.vkt-qs-btn)').forEach(b=>{const p=b.parentElement;if(!p)return;let n=p.querySelector(':scope > .vkt-qs-btn');if(!n){n=document.createElement('button');n.type='button';n.className='nut-phu bnv-don-nut vkt-qs-btn';const ic=b.firstElementChild;n.innerHTML=`<span class="${ic?E(ic.getAttribute('class')||''):''} vkt-qs-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/></svg></span> <span class="vkt-qs-lab">Bán nhanh</span>`;n.onclick=e=>{e.stopPropagation();qsClick()};b.after(n)}});qsBar();qsMarks();if(QS.on&&!document.querySelector('.bnv-tui'))qsStop()}catch{}}
const qsMo=new MutationObserver(()=>{if(!qsRaf)qsRaf=requestAnimationFrame(qsInject)});
try{qsMo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});qsInject()}catch{}

/* Dropdown thay <select> gốc, cùng kiểu với ô chọn của game */
const VK={pop:null,anchor:null,sel:null,idx:0,opts:[]};
function vkClose(){VK.pop?.remove();VK.pop=null;VK.anchor?.setAttribute('aria-expanded','false');VK.anchor=null;VK.sel=null;document.removeEventListener('mousedown',vkOut,true);document.removeEventListener('keydown',vkKey,true);window.removeEventListener('resize',vkClose);window.removeEventListener('scroll',vkScroll,true)}
function vkOut(e){if(VK.pop&&!VK.pop.contains(e.target)&&!(VK.anchor&&VK.anchor.contains(e.target)))vkClose()}
function vkScroll(e){if(VK.pop&&!VK.pop.contains(e.target))vkClose()}
function vkMark(){VK.pop?.querySelectorAll('.vk-opt').forEach((el,i)=>el.classList.toggle('active',i===VK.idx));VK.pop?.querySelectorAll('.vk-opt')[VK.idx]?.scrollIntoView({block:'nearest'})}
function vkPick(i){const o=VK.opts[i],sel=VK.sel,btn=VK.anchor;if(!o||o.disabled||!sel)return;vkClose();if(sel.value!==o.value){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}))}vkLabel(sel,btn);btn?.focus?.()}
function vkKey(e){if(!VK.pop)return;const n=VK.opts.length;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();vkClose()}
  else if(e.key==='ArrowDown'){e.preventDefault();VK.idx=(VK.idx+1)%n;vkMark()}
  else if(e.key==='ArrowUp'){e.preventDefault();VK.idx=(VK.idx+n-1)%n;vkMark()}
  else if(e.key==='Enter'){e.preventDefault();vkPick(VK.idx)}}
function vkLabel(sel,btn){const o=sel.options[sel.selectedIndex],t=o?o.textContent.trim():'';const l=btn.querySelector('.vk-lab');if(l&&l.textContent!==t)l.textContent=t||'—';btn.disabled=sel.disabled}
function vkOpen(sel,btn){
  if(VK.pop&&VK.anchor===btn){vkClose();return}
  vkClose();VK.sel=sel;VK.anchor=btn;VK.opts=[...sel.options];VK.idx=Math.max(0,sel.selectedIndex);
  const pop=document.createElement('div');pop.className='vk-pop';pop.setAttribute('role','listbox');
  pop.innerHTML=VK.opts.map((o,i)=>`<div class="vk-opt${i===sel.selectedIndex?' sel':''}${o.disabled?' dis':''}" role="option" data-i="${i}">${E(o.textContent.trim()||'—')}</div>`).join('');
  pop.addEventListener('mousedown',e=>{e.preventDefault();const el=e.target.closest('.vk-opt');if(el)vkPick(+el.dataset.i)});
  pop.addEventListener('mousemove',e=>{const el=e.target.closest('.vk-opt');if(el&&+el.dataset.i!==VK.idx){VK.idx=+el.dataset.i;VK.pop.querySelectorAll('.vk-opt').forEach((x,i)=>x.classList.toggle('active',i===VK.idx))}});
  document.body.appendChild(pop);VK.pop=pop;btn.setAttribute('aria-expanded','true');
  const r=btn.getBoundingClientRect(),vh=innerHeight,vw=innerWidth,below=vh-r.bottom-8,above=r.top-8,up=below<180&&above>below;
  pop.style.minWidth=Math.max(r.width,120)+'px';pop.style.maxWidth=Math.min(vw-16,420)+'px';pop.style.maxHeight=Math.max(120,Math.min(up?above:below,360))+'px';
  pop.style.left=Math.max(8,Math.min(r.left,vw-pop.offsetWidth-8))+'px';
  if(up)pop.style.bottom=(vh-r.top+2)+'px';else pop.style.top=(r.bottom+2)+'px';
  vkMark();document.addEventListener('mousedown',vkOut,true);document.addEventListener('keydown',vkKey,true);window.addEventListener('resize',vkClose);window.addEventListener('scroll',vkScroll,true);
}
function vkEnhance(){
  try{
    panel.querySelectorAll('select:not([data-vk])').forEach(sel=>{
      sel.dataset.vk='1';const b=document.createElement('button');b.type='button';b.className='vk-sel '+(sel.className||'');b.setAttribute('aria-haspopup','listbox');b.setAttribute('aria-expanded','false');
      if(sel.id)b.dataset.for=sel.id;if(sel.title)b.title=sel.title;
      b.innerHTML='<span class="vk-lab"></span><span class="vk-arr" aria-hidden="true">▼</span>';
      b.onclick=e=>{e.preventDefault();e.stopPropagation();if(!sel.disabled)vkOpen(sel,b)};
      sel.classList.add('vk-hide');sel.after(b);vkLabel(sel,b);sel.addEventListener('change',()=>vkLabel(sel,b));
    });
    panel.querySelectorAll('select[data-vk]').forEach(sel=>{const b=sel.nextElementSibling;if(b&&b.classList.contains('vk-sel'))vkLabel(sel,b)});
    if(VK.anchor&&!VK.anchor.isConnected)vkClose();
  }catch{}
}
let vkRaf=0;const vkMo=new MutationObserver(()=>{if(!vkRaf)vkRaf=requestAnimationFrame(()=>{vkRaf=0;vkEnhance()})});
try{vkMo.observe(panel,{childList:true,subtree:true});vkEnhance()}catch{}

/* Icon tool + nút Tạm dừng/Dừng/Tiếp tục là nút nổi trên màn hình (dễ bấm). Chỉ khung thống kê Auto gắn vào thẻ nhân vật của game. */
function vkDock(){
  const card=document.querySelector('.hud-trang-thai');
  const bar=document.getElementById(ID+'-afbar'),sum=document.getElementById(ID+'-afsum');
  let undocked=false;
  if(fab.classList.contains('docked')||fab.parentElement!==document.body){document.body.appendChild(fab);fab.classList.remove('docked');fab.style.display=ui.isOpen?'none':'';undocked=true}
  if(bar&&(bar.classList.contains('incard')||bar.parentElement!==document.body)){document.body.appendChild(bar);bar.classList.remove('incard');bar.style.cssText='';undocked=true}
  if(card){
    if(sum&&sum.parentElement!==card){card.appendChild(sum);sum.classList.add('incard');sum.style.cssText=''}
    if(sum){
      try{
        const nm=card.querySelector('.hud-danh .ten'),cr=card.getBoundingClientRect();
        if(nm&&cr.width){
          const rg=document.createRange();rg.selectNodeContents(nm);const nr=rg.getBoundingClientRect(),left=nr.right-cr.left+12,limit=cr.width-108;
          sum.classList.add('one');const w1=sum.offsetWidth;
          if(left+w1<=limit){sum.style.left=left+'px';sum.style.top=(nr.top-cr.top+2)+'px';sum.style.right='auto'}
          else{sum.classList.remove('one');sum.style.left='auto';sum.style.right='6px';sum.style.top='30px'}
        }
      }catch{}
    }
  }else if(sum&&sum.classList.contains('incard')){document.body.appendChild(sum);sum.classList.remove('incard')}
  if(undocked){try{AutoFarm.running&&AutoFarm.syncFab()}catch{}}
  try{placeToasts()}catch{}
}
let dkRaf=0;const dkMo=new MutationObserver(()=>{if(!dkRaf)dkRaf=requestAnimationFrame(()=>{dkRaf=0;try{vkDock()}catch{}})});
try{dkMo.observe(document.body,{childList:true,subtree:true});vkDock()}catch{}
/* ───────── Khởi động ───────── */
let lastPos=run().viTri,timer=null,unsub=null,iv=null;
function tick(){clearTimeout(timer);timer=setTimeout(()=>{if(run().viTri!==lastPos){lastPos=run().viTri;if(Route.target)Route.redraw();try{if(store.get('mapFollow',true)!==false&&window.map?.focusPlayer)window.map.focusPlayer(false,true)}catch{}}Alerts.check();softRender()},450)}
try{unsub=g.store.subscribe?.(tick)}catch{}
iv=setInterval(tick,5000);
/* Không tự vẽ đường khi mở tool */
try{Route.clear()}catch{try{stopDrawing()}catch{}}
Alerts.check();ui.syncRouteChip();
window.__VKT2__={ORD,BuildEngine,destroy(){try{AutoFarm.stopRecord()}catch{}try{AutoFarm.stop()}catch{}try{document.getElementById(ID+'-afbar')?.remove();document.getElementById(ID+'-afstats')?.remove()}catch{}clearInterval(iv);clearTimeout(timer);try{dkMo.disconnect();document.getElementById(ID+'-afsum')?.remove()}catch{}try{vkMo.disconnect();vkClose()}catch{}try{qsMo.disconnect();qsStop();qsCss.remove();for(const ev of ['pointerdown','mousedown','click','dblclick','contextmenu'])document.removeEventListener(ev,qsPick,true);document.removeEventListener('keydown',qsKey,true);document.querySelectorAll('.vkt-qs-btn').forEach(x=>x.remove())}catch{}try{unsub?.()}catch{}stopDrawing();panel.remove();fab.remove();chip.remove();toasts.remove();styleEl.remove()},ui,Route,build:BUILD,VIEWS,BuildEngine,hooks:{realmRows,eventRows,treasureRows,jobRows,peopleRows,sectRows,checks,safePath,placeWindow,closedYears,openOnArrival,focusMap,startDrawing,stopDrawing,mapRoot,ORD,ORDER_CFG,coreContext,Alerts,AutoFarm}};

})();
