(()=>{
'use strict';
const BUILD='20261103-bag-r46',V=`Vạn Kiếp Trợ Thủ · ${BUILD}`,ID='vk-tro-ly',BID='vk-tro-ly-bubble',g=window.game;
if(!g?.state?.run||!g?.env?.content?.encounters||!g?.env?.world){alert('Game chưa sẵn sàng.');return}
const prior=document.getElementById(ID),priorApi=window.__VK_EVENT_HUNTER__;if(prior){if(priorApi?.buildId===BUILD){prior.style.display='flex';document.getElementById(BID)?.remove();console.info(`[VKTool] Đang dùng bản mới nhất ${BUILD}`);return}try{priorApi?.close?.()}catch{}document.getElementById(ID)?.remove();document.getElementById(BID)?.remove();console.info(`[VKTool] Đã thay bản cũ bằng ${BUILD}`)}
const C=g.env.content,W=g.env.world,A=v=>Array.isArray(v)?v:[],N=v=>Number.isFinite(Number(v));
const fmtDuration=t=>{if(!N(t))return'?';const years=Number(t),days=Math.round(years*360);if(days<30)return`${Math.max(1,days)} ngày`;const months=Math.round(years*12);if(months<12)return`${months} tháng`;return`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(years)} năm`},fmtDistance=d=>N(d)?`${F(d)} dặm`:'?';
const TickCache={_sig:null,_store:new Map(),begin(sig){if(sig!==this._sig){this._sig=sig;this._store.clear()}},get(k,fn){if(this._store.has(k))return this._store.get(k);const v=fn();this._store.set(k,v);return v},clear(){this._store.clear();this._sig=null}};
const Runtime={run:()=>g.state.run||{},character:()=>g.state.run?.nhanVat||{},flags:()=>g.state.run?.flags||{},place:slot=>g.state.run?.noiChon?.[slot]||null,node:slot=>g.state.run?.nodes?.[slot]||null,currentSlot:()=>g.state.run?.viTri??null,location:slot=>{try{return W.info(slot??g.state.run?.viTri)||null}catch{return null}},itemQty:id=>Number(g.state.run?.nhanVat?.tuiDo?.[id]||0),profession:key=>g.state.run?.nhanVat?.nghe?.[key]??null,stat:key=>{const nv=g.state.run?.nhanVat||{};if(key==='canh_gioi')return nv.canhGioi;if(key==='tieu_canh_gioi')return nv.tieuCanhGioi;return nv.chiSo?.[key]}};
const Verdict=(state,label,expected,actual,source,reason)=>({state,label,expected,actual,source,reason});
const overall=rs=>rs.some(x=>x.state==='unmet')?'unmet':rs.some(x=>x.state==='unknown')?'unknown':rs.length?'met':'unknown';
const compare=(actual,expr)=>{if(!N(actual))return null;if(N(expr))return Number(actual)>=Number(expr);const m=String(expr??'').trim().match(/^(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$/);if(!m)return null;const a=Number(actual),v=Number(m[2]);return m[1]==='>='?a>=v:m[1]==='<='?a<=v:m[1]==='>'?a>v:m[1]==='<'?a<v:a===v};
function flagValue(name,scope,ctx){if(scope==='noi'){if(ctx.slot==null)return{known:false,source:'run.noiChon[slot].flags',reason:'Thiếu ngữ cảnh địa điểm'};const fs=Runtime.place(ctx.slot)?.flags||{};return{known:Object.prototype.hasOwnProperty.call(fs,name),value:fs[name],source:`run.noiChon.${ctx.slot}.flags.${name}`}}const fs=Runtime.flags();return{known:Object.prototype.hasOwnProperty.call(fs,name),value:fs[name],source:`run.flags.${name}`}}
function evalCondition(c,ctx={}){if(!c||typeof c!=='object'||Array.isArray(c))return{state:'unknown',results:[Verdict('unknown','Điều kiện',c,null,'condition','Cấu trúc điều kiện chưa được hỗ trợ')]};const rs=[];if(Array.isArray(c.all)){const children=c.all.map(x=>evalCondition(x,ctx));rs.push(...children.flatMap(x=>x.results));}if(Array.isArray(c.any)){const children=c.any.map(x=>evalCondition(x,ctx)),state=children.some(x=>x.state==='met')?'met':children.every(x=>x.state==='unmet')?'unmet':'unknown';rs.push(Verdict(state,'Một trong các điều kiện','ít nhất 1',children.map(x=>x.state),'condition.any',state==='met'?'Có ít nhất một điều kiện đạt':state==='unmet'?'Không có điều kiện nào đạt':'Chưa đủ dữ liệu để kết luận'));}if(c.not&&typeof c.not==='object'){const child=evalCondition(c.not,ctx),state=child.state==='met'?'unmet':child.state==='unmet'?'met':'unknown';rs.push(Verdict(state,'Phủ định điều kiện',false,child.state,'condition.not',state==='unknown'?'Điều kiện con chưa xác định':'Đã đảo kết quả điều kiện con'));}
const stat=(field,label,path='chiSo')=>{if(c[field]===undefined)return;const got=Runtime.stat(field),ok=compare(got,c[field]);rs.push(Verdict(ok==null?'unknown':ok?'met':'unmet',label,c[field],got,`run.nhanVat.${path==='root'?'':path+'.'}${field==='canh_gioi'?'canhGioi':field}`,ok==null?'Không hiểu phép so sánh hoặc thiếu dữ liệu':ok?'Đã đạt yêu cầu':'Chưa đạt yêu cầu'))};stat('canh_gioi','Cảnh giới','root');for(const [k,l] of [['than_thuc','Thần thức'],['ngo_tinh','Ngộ tính'],['khi_van','Khí vận'],['than_phap','Thân pháp'],['can_cot','Căn cốt'],['dao_tam','Đạo tâm']])stat(k,l);
if(c.dia_danh!==undefined){const wanted=A(c.dia_danh),slot=ctx.slot??Runtime.currentSlot(),info=Runtime.location(slot),actual=info?.diaDanh?.id??info?.slot?.dia_danh??null;rs.push(!wanted.length||!actual?Verdict('unknown','Địa danh',wanted,actual,slot?`world.info.${slot}`:'run.viTri','Không đọc được địa danh hiện tại'):Verdict(wanted.includes(actual)?'met':'unmet','Địa danh',wanted,actual,`world.info.${slot}`,wanted.includes(actual)?'Đang ở đúng địa danh':'Không ở địa danh yêu cầu'))}
if(c.nghe&&typeof c.nghe==='object'&&!Array.isArray(c.nghe)){for(const [job,expr] of Object.entries(c.nghe)){const rec=Runtime.profession(job),got=rec?.bac,ok=compare(got,expr);rs.push(Verdict(ok==null?'unknown':ok?'met':'unmet',`Nghề ${job}`,expr,got,`run.nhanVat.nghe.${job}.bac`,ok==null?'Không đọc được cấp nghề hoặc biểu thức chưa hợp lệ':ok?'Đã đạt cấp nghề':'Chưa đạt cấp nghề'))}}
if(c.co_item!==undefined){const spec=c.co_item,id=typeof spec==='string'?spec:spec?.id||spec?.item,need=Number(typeof spec==='object'?(spec.so??spec.qty??1):1),got=id?Runtime.itemQty(id):NaN;rs.push(!id||!N(need)?Verdict('unknown','Vật phẩm',spec,null,'run.nhanVat.tuiDo','Schema vật phẩm chưa hợp lệ'):Verdict(got>=need?'met':'unmet','Vật phẩm',need,got,`run.nhanVat.tuiDo.${id}`,got>=need?'Đang có đủ trong túi':'Trong túi chưa đủ'))}
for(const [key,neg] of [['flag',false],['not_flag',true]])if(typeof c[key]==='string'){const fv=flagValue(c[key],c.pham_vi,ctx);const state=!fv.known?'unknown':(neg?!Boolean(fv.value):Boolean(fv.value))?'met':'unmet';rs.push(Verdict(state,neg?'Cờ phủ định':'Cờ tiến trình',neg?false:true,fv.known?fv.value:undefined,fv.source,fv.known?'Đã đọc đúng phạm vi cờ':fv.reason||'Cờ không tồn tại, chưa rõ giá trị mặc định của game'))}
if(c.cach_nam&&typeof c.cach_nam==='object'){const x=c.cach_nam,fv=flagValue(x.flag,x.pham_vi,ctx),years=Number(x.nam),now=Number(Runtime.run().nam);if(!x.flag||!N(years)||!N(now)||!fv.known||!N(fv.value))rs.push(Verdict('unknown','Hồi chiếu',years,fv.known&&N(fv.value)?now-Number(fv.value):null,fv.source||'condition.cach_nam',fv.reason||'Thiếu mốc năm ở đúng phạm vi'));else{const elapsed=now-Number(fv.value);rs.push(Verdict(elapsed>=years?'met':'unmet','Hồi chiếu',years,elapsed,fv.source,elapsed>=years?'Đã đủ số năm':'Chưa đủ số năm'))}}
if(c.mon_phai!==undefined){const tongMon=Runtime.run().tongMon??Runtime.character().tongMon??null,wanted=Boolean(c.mon_phai),actual=Boolean(tongMon);rs.push(Verdict(actual===wanted?'met':'unmet','Thành viên môn phái',wanted,actual,'run.tongMon',actual===wanted?'Đúng trạng thái môn phái':'Không đúng trạng thái môn phái'))}
if(c.cap_bac!==undefined){const tongMon=Runtime.run().tongMon??Runtime.character().tongMon??{},actual=tongMon?.capBac??tongMon?.cap_bac??tongMon?.bac??Runtime.character()?.capBacTongMon,ok=compare(actual,c.cap_bac);rs.push(Verdict(ok==null?'unknown':ok?'met':'unmet','Cấp bậc tông môn',c.cap_bac,actual,'run.tongMon.capBac',ok==null?'Không đọc được cấp bậc tông môn':ok?'Đã đạt cấp bậc':'Chưa đạt cấp bậc'))}
if(c.phai_son_mon!==undefined){const wanted=A(c.phai_son_mon),tongMon=Runtime.run().tongMon??Runtime.character().tongMon??{},actual=tongMon?.phai??tongMon?.loai??tongMon?.sonMon?.phai??tongMon?.diaDanh?.phai??null;rs.push(Verdict(!wanted.length||!actual?'unknown':wanted.includes(actual)?'met':'unmet','Phái sơn môn',wanted,actual,'run.tongMon.phai',!actual?'Không đọc được phái sơn môn':wanted.includes(actual)?'Đúng phái sơn môn':'Không đúng phái sơn môn'))}
if(c.co_bien!==undefined){const names=A(c.co_bien),vars=ctx.vars||{},missing=names.filter(k=>vars[k]===undefined||vars[k]===null);rs.push(Verdict(!names.length?'unknown':missing.length?'unmet':'met','Biến tồn tại',names,Object.keys(vars),'context.vars',missing.length?'Thiếu biến: '+missing.join(', '):'Đủ biến yêu cầu'))}
if(c.khong_bien!==undefined){const names=A(c.khong_bien),vars=ctx.vars||{},present=names.filter(k=>vars[k]!==undefined&&vars[k]!==null);rs.push(Verdict(!names.length?'unknown':present.length?'unmet':'met','Biến không tồn tại',names,Object.keys(vars),'context.vars',present.length?'Biến đang tồn tại: '+present.join(', '):'Không có biến bị cấm'))}
if(c.node_flag!==undefined){const flag=String(c.node_flag),flags=ctx.nodeFlags||ctx.flags||{},actual=flags instanceof Set?flags.has(flag):Boolean(flags?.[flag]);rs.push(Verdict(actual?'met':'unmet','Cờ encounter',flag,actual,'context.nodeFlags',actual?'Cờ đã bật':'Cờ chưa bật'))}
if(c.ngau_nhien!==undefined){const chance=Number(c.ngau_nhien);rs.push(Verdict('unknown','Xác suất ngẫu nhiên',chance,N(chance)?`${F(chance*100)}%`:null,'condition.ngau_nhien',N(chance)?'Chỉ xác định khi game gieo ngẫu nhiên':'Giá trị xác suất không hợp lệ'))}
if(c.chenh_canh_gioi!==undefined){const self=Number(Runtime.character()?.canhGioi),other=Number(ctx.targetRealm??ctx.vars?.canh_gioi),difference=N(self)&&N(other)?self-other:null,ok=difference===null?null:compare(difference,c.chenh_canh_gioi);rs.push(Verdict(ok==null?'unknown':ok?'met':'unmet','Chênh cảnh giới',c.chenh_canh_gioi,difference,'context.targetRealm',ok==null?'Thiếu cảnh giới đối tượng':ok?'Đạt yêu cầu chênh lệch':'Không đạt yêu cầu chênh lệch'))}

const supported=['all','any','not','canh_gioi','than_thuc','ngo_tinh','khi_van','than_phap','can_cot','dao_tam','co_item','dia_danh','nghe','flag','not_flag','cach_nam','pham_vi','mon_phai','cap_bac','phai_son_mon','co_bien','khong_bien','node_flag','ngau_nhien','chenh_canh_gioi'];const unsupported=Object.keys(c).filter(k=>!supported.includes(k));if(unsupported.length)rs.push(Verdict('unknown','Điều kiện chưa hỗ trợ',unsupported,null,'condition','Chưa xác minh đầy đủ schema hoặc ngữ cảnh'));return{state:overall(rs),results:rs}}
function equipmentItemId(value){return typeof value==='string'?value:value&&typeof value==='object'?(value.item??value.itemId??value.id??null):null}
function inventoryLocations(id){const out=[],run=Runtime.run(),nv=Runtime.character(),add=(kind,label,qty,path,slot=null,meta=null)=>{const q=Number(qty);if(Number.isFinite(q)&&q>0)out.push({kind,label,qty:q,path,slot,meta})};add('bag','Túi nhân vật',nv.tuiDo?.[id],`run.nhanVat.tuiDo.${id}`);for(const [part,value] of Object.entries(nv.trangBi||{})){const itemId=equipmentItemId(value);if(itemId===id)add('equipped',`Trang bị: ${part}`,1,`run.nhanVat.trangBi.${part}`,null,{schema:typeof value==='string'?'id':'object'})}for(const [i,x] of A(nv.kinhMach?.manh).entries())if(equipmentItemId(x)===id)add('meridian','Kinh mạch đang dùng',1,`run.nhanVat.kinhMach.manh.${i}`);if(A(nv.kinhMach?.daLinhNgo).includes(id))add('learned','Đã lĩnh ngộ',1,'run.nhanVat.kinhMach.daLinhNgo');for(const [slot,no] of Object.entries(run.noiChon||{})){if(no?.dongPhu?.kho&&typeof no.dongPhu.kho==='object')add('cave_storage',`Kho động phủ · ${W.info(slot).ten}`,no.dongPhu.kho[id],`run.noiChon.${slot}.dongPhu.kho.${id}`,slot)}return out}
function inventoryState(id){const locations=inventoryLocations(id),kinds=[...new Set(locations.map(x=>x.kind))],bagQty=locations.filter(x=>x.kind==='bag').reduce((n,x)=>n+x.qty,0),storedQty=locations.filter(x=>x.kind==='cave_storage').reduce((n,x)=>n+x.qty,0),referenced=locations.some(x=>x.kind==='equipped'||x.kind==='meridian'),carriedQty=bagQty>0?bagQty:referenced?1:0,qty=carriedQty+storedQty;return{id,owned:qty>0,qty,bagQty,storedQty,carriedQty,locations,kinds,learned:locations.some(x=>x.kind==='learned'),equipped:locations.some(x=>x.kind==='equipped'),stored:storedQty>0,inMeridian:locations.some(x=>x.kind==='meridian'),countRule:'bag-authoritative; equipment/meridian are references; verified storage additive',confidence:'runtime-verified-paths'}}
function activeEncounterSlots(encounterId){const out=[];for(const [slot,node] of Object.entries(Runtime.run().nodes||{}))if(node?.encounter===encounterId)out.push({slot,expires:N(node.hetHanNam)?Number(node.hetHanNam):null,node});return out}
function encounterAvailability(encounter,ctx={}){if(!encounter||typeof encounter!=='object')return{state:'unknown',reason:'Không có record encounter',conditions:{state:'unknown',results:[]},active:[]};const active=activeEncounterSlots(encounter.id),slot=ctx.slot??active[0]?.slot??Runtime.currentSlot(),conditions=encounter.requires?evalCondition(encounter.requires,{...ctx,slot}):{state:'met',results:[]};return{state:active.length?'active':conditions.state==='met'?'eligible':conditions.state==='unmet'?'blocked':'unknown',reason:active.length?'Encounter đang tồn tại trên bản đồ':conditions.state==='met'?'Các điều kiện đã hỗ trợ đều đạt':conditions.state==='unmet'?'Có điều kiện xác nhận chưa đạt':'Còn điều kiện hoặc dữ liệu chưa xác định',conditions,active,slot}}
function treasureState(eventId,ctx={}){const guide=TREASURE_GUIDE.get(eventId)||null,enc=C.encounters?.get?.(eventId)||null,itemId=guide?.relic||null,inventory=itemId?inventoryState(itemId):null,owned=Boolean(inventory?.owned),availability=encounterAvailability(enc,ctx);const state=owned?'owned':availability.state;return{state,eventId,itemId,owned,inventory,guide,encounter:enc,availability,confidence:enc?'source-runtime':'unknown'}}
const SPECIAL_TREASURES=new Map([
['item.nghich_lan_thuan',{itemId:'item.nghich_lan_thuan',name:'Nghịch Lân Thuẫn',sourceType:'source_hint',hint:'Vảy ngược không tìm được ở đâu, chỉ rơi khi kẻ mạnh nhất một cõi ngã xuống.',evidence:'content.items.item.nghich_lan_thuan.goi_y'}],
['item.thien_dien_dan',{itemId:'item.thien_dien_dan',name:'Thiên Diễn Đan',sourceType:'source_hint',hint:'Viên đan luyện cho ngày lên trời, nay chỉ còn trong tay những kẻ đứng đầu cõi người.',evidence:'content.items.item.thien_dien_dan.goi_y'}]
]);
function acquisitionState(itemId){const item=C.items?.get?.(itemId)||null,special=SPECIAL_TREASURES.get(itemId)||null,inventory=inventoryState(itemId);if(inventory.owned)return{state:'owned',itemId,inventory,sources:[],confidence:'runtime-verified-paths'};if(special)return{state:'source_hinted',itemId,inventory,sources:[{type:special.sourceType,verified:false,hint:special.hint,evidence:special.evidence}],confidence:'item-source-hint-only',reason:'Runtime content không chứa enemy, encounter hoặc loot table tham chiếu trực tiếp đến vật phẩm này'};return{state:item?'catalog_only':'unknown',itemId,inventory,sources:[],confidence:item?'item-record-only':'unknown'}}
function specialTreasureStates(){return[...SPECIAL_TREASURES.keys()].map(acquisitionState)}
function treasureStates(){return[...TREASURE_GUIDE.keys()].map(id=>treasureState(id))}
function allTreasureStates(){return{encounter:treasureStates(),special:specialTreasureStates()}}

const F=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:2}),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),T=s=>String(s??'').replace(/[\uE000-\uF8FF]/g,'').replace(/\s+/g,' ').trim();
const walk=(v,fn,p=[],seen=new WeakSet())=>{if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);fn(v,p);if(Array.isArray(v))v.forEach((x,i)=>walk(x,fn,p.concat(i),seen));else Object.entries(v).forEach(([k,x])=>walk(x,fn,p.concat(k),seen))};
const names={co_duyen:'Cơ duyên',ky_van:'Kỳ vận',nguy_hiem:'Nguy hiểm',nhan_qua:'Nhân quả',giao_dich:'Giao dịch',bi_canh:'Bí cảnh',the_luc:'Thế lực',tham_hiem:'Thám hiểm',su_vu:'Sự vụ',le_hoi:'Lễ hội',mua_ban:'Mua bán',tu_luyen:'Tu luyện',tong_mon:'Tông môn',nhan_mach:'Nhân mạch',di_lai:'Di chuyển',luyen_che:'Luyện chế'};
const SPECIAL_PLACE_TYPES=new Map([['sao_huyet','Sào huyệt yêu thú'],['di_tich','Di tích'],['khoang_mach','Khoáng mạch'],['bi_canh','Bí cảnh']]);
const YEU_TOC={lang:'Lang tộc',ho:'Hồ tộc',xa:'Xà tộc',hung:'Hùng tộc',vien:'Viên tộc',giao:'Giao tộc'};
function placeType(info){const id=String(info?.diaDanh?.loai||'');return SPECIAL_PLACE_TYPES.get(id)||null}
function mapEventType(e){const text=norm([e?.id,e?.ten,e?.name,A(e?.tags?.noi).join(' '),A(e?.tags?.tinh_chat).join(' ')].join(' '));if(text.includes('sao huyet'))return'Sào huyệt yêu thú';if(text.includes('khoang mach'))return'Khoáng mạch';if(text.includes('di tich'))return'Di tích';return null}
function placeRecord(slot,node=null,run=g.state.run){if(!slot||!W.hasSlot(slot))return null;let info;try{info=W.info(slot)}catch{return null}const type=placeType(info);if(!type)return null;const chosen=run?.noiChon?.[slot]||{},events=[...new Set([...A(chosen.suKien),...A(chosen.gan)])].filter(id=>C.encounters.has(id)),travel=+g.travelYears(slot),distance=+g.distanceLi(slot);return{recordType:'place',key:`place|${slot}`,slot,name:info?.ten||info?.diaDanh?.ten||slot,type,typeId:String(info?.diaDanh?.loai||''),country:info?.quocGia||null,faction:A(info?.theLuc),terrain:A(info?.diaHinh),beastClan:info?.tocYeu||null,beastClanName:YEU_TOC[info?.tocYeu]||info?.tocYeu||null,baseLevel:N(info?.capNen)?+info.capNen:null,discovered:A(run?.daKhamPha).includes(slot),active:Boolean(node),travelYears:travel,distanceLi:distance,expiryYear:N(node?.hetHanNam)?+node.hetHanNam:null,cooldownUntil:N(chosen.moLai)?+chosen.moLai:null,refreshYear:N(chosen.namLamMoi)?+chosen.namLamMoi:null,destroyedYear:N(chosen.biDiet)?+chosen.biDiet:null,events:events.map(id=>({id,ten:C.encounters.get(id)?.ten||id,kind:C.encounters.get(id)?.kind||null})),raw:{node,chosen}}}
function collectPlaceRecords(run=g.state.run){const out=[],seen=new Set();for(const[key,raw]of Object.entries(run?.nodes||{})){const node=raw&&typeof raw==='object'?raw:{},slot=node.slot||key;if(node.viec||seen.has(slot))continue;const record=placeRecord(slot,node,run);if(record){seen.add(slot);out.push(record)}}return out.sort((a,b)=>a.travelYears-b.travelYears||a.name.localeCompare(b.name,'vi'))}
function placeTimeState(record,year=g.state.run?.nam){const expiry=N(record?.expiryYear)?+record.expiryYear:null,cooldown=N(record?.cooldownUntil)?+record.cooldownUntil:null,arrival=N(year)&&N(record?.travelYears)?+year+record.travelYears:null;return{expiryYear:expiry,cooldownUntil:cooldown,arrivalYear:arrival,remainingAtArrival:expiry!==null&&arrival!==null?expiry-arrival:null,canArrive:expiry===null||arrival===null?null:arrival<=expiry,onCooldown:cooldown!==null&&N(year)?cooldown>+year:null}}

function inspect(e,vars={}){const o={combat:[],mandatory:false,gain:new Set(),risk:new Set(),repeat:false,treasure:false};const G={linh_thach:'Linh thạch',tu_vi:'Tu vi',danh_vong:'Danh vọng',phuc_phan:'Phúc phận',dao_tam:'Đạo tâm',add_item:'Vật phẩm',roi_quy:'Đồ hiếm',roi_ho:'Chiến lợi phẩm',kinh_nghiem_nghe:'Kinh nghiệm nghề',npc_relation:'Quan hệ NPC',tho_nguyen:'Thọ nguyên'},R={tam_ma:'Tâm ma',injury:'Thương thế',lifespanLost:'Mất thọ nguyên',thu_oan:'Thù oán'};walk([e.choices,e.scenes,e.effects],(x,p)=>{if(x.combat){let id=String(x.combat),m=id.match(/^\{(.+)\}$/);if(m)id=vars[m[1]]??id;const en=C.enemies?.get?.(id),npc=g.state.run.npc?.[id];o.combat.push({id,ten:T(en?.ten||npc?.ten||id),path:p.join('.')});if(p.includes('effects')||e.kind==='chien_dau')o.mandatory=true}if(x.roi_quy||x.roi_ho||x.add_item)o.treasure=true;for(const[k,n]of Object.entries(G))if(Object.hasOwn(x,k)){const v=x[k];typeof v==='number'&&v<0?o.risk.add(n):o.gain.add(n)}for(const[k,n]of Object.entries(R))if(Object.hasOwn(x,k))o.risk.add(n);if(x.repeat_choices)o.repeat=true});return o}
function tags(e,src){const s=new Set();A(e?.tags?.tinh_chat).forEach(x=>s.add(names[x]||x));A(e?.tags?.noi).forEach(x=>names[x]&&s.add(names[x]));if(e.kind==='bi_canh')s.add('Bí cảnh');if(e.kind==='chien_dau')s.add('Chiến đấu');if(e.kind==='cua_hang')s.add('Cửa hàng');if(e.kind==='tu_luyen')s.add('Tu luyện');if(e.kind==='tong_mon')s.add('Tông môn');if(e.nhom&&names[e.nhom])s.add(names[e.nhom]);if(src==='Treo thưởng')s.add('Treo thưởng');if(src==='Ngọc giản tông môn')s.add('Ngọc giản tông môn');if(src==='Nhiệm vụ đã nhận')s.add('Đang nhận');if(src==='Danh mục dị bảo')s.add('Địa điểm cố định');if(src==='Dị bảo đang xuất hiện')s.add('Đang xuất hiện');if(src==='Chuỗi nhiệm vụ')s.add('Chuỗi');if(src==='Tiện ích tại nơi')s.add('Thường trú');return[...s]}
function rareTreasure(r){
 const items=new Set(),chances=new Set(),checks=[],bosses=[];walk(r.e,(x,p)=>{if(typeof x.add_item==='string'){const it=C.items?.get?.(x.add_item);if(it?.tag?.includes?.('di_bao'))items.add(x.add_item)}const q=x?.if?.ngau_nhien??(x?.if?.all?.find?.(z=>z?.ngau_nhien)?.ngau_nhien);if(N(q))chances.add(+q);if(x.check?.chi_so)checks.push({stat:x.check.chi_so,difficulty:x.check.do_kho});if(x.combat)bosses.push(String(x.combat))});if(!items.size)return null;const guide=TREASURE_GUIDE.get(r.enc)||null;return{direct:true,items:[...items],chance:[...chances],checks,bosses,cooldown:Number(r.e?.limits?.hoi_chieu_nam)||guide?.hoiChieu||null,min:A(r.e?.tags?.canh_gioi)[0]??guide?.gate?.[0],max:A(r.e?.tags?.canh_gioi)[1]??guide?.gate?.[1],guide};
}
const TYPE_NAMES={cong_phap:'Công pháp',phap_khi:'Pháp khí',dan_duoc:'Đan dược',nguyen_lieu:'Nguyên liệu',linh_duoc:'Linh dược',yeu_tai:'Yêu tài',phu_luc:'Phù lục',tran_ban:'Trận bàn',don_phuong:'Đơn phương',dung_cu:'Dụng cụ',di_hoa:'Dị hỏa',dac_san:'Đặc sản',phuong_tien:'Phương tiện',tru_vat:'Trữ vật',trung_thu:'Trứng thú',lenh_bai:'Lệnh bài',tran_van:'Trận văn',khac:'Khác'};
const GRADE_NAMES={1:'Phàm phẩm',2:'Hoàng phẩm',3:'Huyền phẩm',4:'Địa phẩm',5:'Thiên phẩm',6:'Linh phẩm',7:'Tiên phẩm',8:'Nghịch Thiên'};const ELEMENT_NAMES={kim:'Kim',moc:'Mộc',thuy:'Thủy',hoa:'Hỏa',tho:'Thổ',bang:'Băng',phong:'Phong',loi:'Lôi',vo_sac:'Vô sắc'};const SCHOOL_GROUPS={ta_dao:{ten:'Tà đạo',tags:['ma','quy','thi','nghich']},doc_co:{ten:'Độc Cổ',tags:['doc','co']},ngu_linh:{ten:'Ngự Linh',tags:['ngu_linh']},hop_hoan:{ten:'Hợp Hoan',tags:['hop_hoan']},kiem:{ten:'Kiếm',tags:['kiem']},phat:{ten:'Phật',tags:['phat']},dan:{ten:'Đan',tags:['dan']},the:{ten:'Thể',tags:['the']},phu:{ten:'Phù',tags:['phu']},tran:{ten:'Trận',tags:['tran']},khi:{ten:'Khí',tags:['khi']},ngu_thu:{ten:'Ngự thú',tags:['ngu_thu']},tong_mon:{ten:'Tông môn',tags:['tong_mon']}};const SCHOOL_SOURCE_TAGS=new Set(Object.values(SCHOOL_GROUPS).flatMap(x=>x.tags));const itemSchoolGroups=r=>{const raw=new Set([...A(r.tran_phai),...A(r.tag)]);return Object.entries(SCHOOL_GROUPS).filter(([,v])=>v.tags.some(t=>raw.has(t))).map(([k])=>k)};const norm=x=>T(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const ITEM_SOURCE_NOTES={chi_luyen:'Chỉ luyện chế',chi_khai_bao:'Chỉ có trong bí cảnh / rương',di_bao:'Dị bảo',nghich_thien:'Nghịch thiên',tong_mon:'Đổi ở tông môn',khong_nguon:'Không rõ nguồn',noi_bo:'Nội bộ tông'};
const ITEM_CATEGORY_ORDER=['Tâm pháp (tu luyện, bị động)','Đấu pháp (công pháp có chiêu)','Pháp khí chiến đấu','Pháp bảo bị động','Đan tăng tỉ lệ đột phá','Đan tăng tu luyện / tu vi','Đan phá bình cảnh','Đan tăng thọ','Đan chữa thương','Đan giảm tâm ma','Đan nâng phẩm đạo cơ','Đan tăng chỉ số','Đan kinh mạch','Đan dùng trong trận','Đan khác','Đi lại / phương tiện','Túi trữ vật','Đan lô','Khí lô','Phù bút','Dị hỏa','Phù lục','Trận bàn','Đơn phương','Linh dược','Yêu tài','Nguyên liệu','Đặc sản vùng','Lệnh bài','Khác'];
function itemCategory(it){const dung=JSON.stringify(it.dung||'');if(it.loai==='cong_phap')return it.chieu?'Đấu pháp (công pháp có chiêu)':'Tâm pháp (tu luyện, bị động)';if(it.loai==='phap_khi')return it.chieu?'Pháp khí chiến đấu':'Pháp bảo bị động';if(it.loai==='dan_duoc'){if(it.dot_pha)return'Đan tăng tỉ lệ đột phá';if(dung.includes('pha_binh_canh'))return'Đan phá bình cảnh';if(dung.includes('tho_nguyen'))return'Đan tăng thọ';if(dung.includes('_cell'))return'Đan kinh mạch';if(dung.includes('duong_pham'))return'Đan nâng phẩm đạo cơ';if(it.tu_luyen||dung.includes('tu_vi')||dung.includes('tu_luyen'))return'Đan tăng tu luyện / tu vi';if(dung.includes('heal'))return'Đan chữa thương';if(dung.includes('tam_ma'))return'Đan giảm tâm ma';if(dung.includes('stat'))return'Đan tăng chỉ số';if(it.tran)return'Đan dùng trong trận';return'Đan khác'}if(it.loai==='phuong_tien')return'Đi lại / phương tiện';if(it.loai==='tru_vat')return'Túi trữ vật';if(it.loai==='dung_cu')return it.dung_cu==='luyen_dan'?'Đan lô':it.dung_cu==='luyen_bao'?'Khí lô':'Phù bút';return{di_hoa:'Dị hỏa',phu_luc:'Phù lục',tran_ban:'Trận bàn',don_phuong:'Đơn phương',linh_duoc:'Linh dược',yeu_tai:'Yêu tài',nguyen_lieu:'Nguyên liệu',dac_san:'Đặc sản vùng',lenh_bai:'Lệnh bài'}[it.loai]||'Khác'}
function effectValueText(k,v){const stats={than_thuc:'thần thức',ngo_tinh:'ngộ tính',than_phap:'thân pháp',can_cot:'căn cốt',dao_tam:'đạo tâm',khi_van:'khí vận'};if(k==='heal')return`Chữa ${v} bậc thương thế`;if(k==='tho_nguyen')return`+${v} năm thọ`;if(k==='tam_ma')return`Giảm ${Math.abs(Number(v)||0)} tâm ma`;if(k==='tu_vi')return`Tăng tu vi (mức ${typeof v==='object'?JSON.stringify(v):v})`;if(k==='pha_binh_canh')return'Phá bình cảnh';if(k==='unlock_cell')return`+${v} lượt khai thông kinh mạch`;if(k==='recolor_cell')return`Đổi màu ${v} ô kinh mạch`;if(k==='heal_cell')return'Chữa ô kinh mạch tổn';if(k==='stat'&&v&&typeof v==='object')return Object.entries(v).map(([a,b])=>`${stats[a]||a} +${b}`).join(', ');if(k==='dung_truyen_tong_phu')return`Truyền tống${v?.tam?' · tầm '+v.tam:''}`;if(k==='do_duong')return'Dò đường quanh vùng';if(k==='tranh_hiem')return'Tránh nguy hiểm';if(k==='truyen_am')return'Truyền âm';if(k==='tu_luyen'&&v&&typeof v==='object')return`Tu luyện ×${v.he_so??'?'} trong ${v.nam??'?'} năm`;return String(k).replaceAll('_',' ')}
function itemGameData(it){const out=[];const b=it.bi_dong||{};if(it.linh_luc)out.push(`Linh lực ${F(it.linh_luc)}`);if(b.toc_do)out.push(`Tu luyện +${F(b.toc_do*100)}%`);if(b.dot_pha)out.push(`Đột phá +${F(b.dot_pha*100)}%`);if(b.khi_huyet)out.push(`Khí huyết +${F(b.khi_huyet*100)}%`);if(b.ho_the)out.push(`Hộ thể +${F(b.ho_the*100)}%`);if(b.khang_tam_ma)out.push(`Kháng tâm ma +${F(b.khang_tam_ma*100)}%`);for(const[k,v]of Object.entries(b.chi_so||{}))out.push(effectValueText('stat',{[k]:v}));if(it.chieu)out.push(`Chiêu ${it.chieu.ten||''} · ${it.chieu.dang||''} · uy ${it.chieu.uy??it.chieu.uyLuc??'?'}`);if(it.dot_pha?.ti_le)out.push(`Đột phá +${F(it.dot_pha.ti_le*100)}%${it.dot_pha.canh_gioi!==undefined?' · cảnh giới '+it.dot_pha.canh_gioi:''}`);if(it.tu_luyen)out.push(`Tu luyện +${F((it.tu_luyen.toc_do||0)*100)}% trong ${it.tu_luyen.nam??'?'} năm`);for(const d of A(it.dung))if(d&&typeof d==='object')for(const[k,v]of Object.entries(d))out.push(effectValueText(k,v));if(it.tran)out.push('Trong trận: '+Object.keys(it.tran).map(x=>x.replaceAll('_',' ')).join(', '));if(it.loai==='phuong_tien')out.push(`Tốc độ đi ×${it.di_lai??'?'}${it.tam?' · tầm '+it.tam:''}${it.bay?' · bay':''}${it.vuot_bien?' · vượt biển':''}`);if(it.tru_vat)out.push(`+${it.tru_vat} ô túi`);if(it.ngu_linh?.o)out.push(`Mở ${it.ngu_linh.o} ô ngự linh`);if(it.di_hoa)out.push(`Dị hỏa +${it.di_hoa} điểm luyện chế`);if(it.loai==='don_phuong'&&it.day){const dp=C.donPhuong?.get?.(it.day);if(dp?.ten)out.push('Dạy '+dp.ten)}return[...new Set(out.filter(Boolean))]}
function itemSourceNotes(it){const out=[];for(const t of A(it.tag))if(ITEM_SOURCE_NOTES[t])out.push(ITEM_SOURCE_NOTES[t]);if(it.theo_kiep)out.push('Giữ qua kiếp sau');if(it.tran_phai)out.push('Chỉ phái riêng');if(it.xuat_xu)out.push('Đặc sản vùng');if(A(it.dia_hinh).length)out.push('Có ở: '+A(it.dia_hinh).join(', ').replaceAll('_',' '));return out}
function inventorySnapshot(){const run=Runtime.run(),nv=Runtime.character(),m=new Map(),add=(id,kind,label,qty=1)=>{if(!id)return;const a=m.get(id)||[];a.push({kind,label,qty:Number(qty)||1});m.set(id,a)};for(const[id,q]of Object.entries(nv.tuiDo||{}))if(+q>0)add(id,'owned','Túi nhân vật',+q);for(const[k,v]of Object.entries(nv.trangBi||{}))add(equipmentItemId(v),'owned','Trang bị: '+k,1);for(const x of A(nv.kinhMach?.manh))add(equipmentItemId(x),'owned','Kinh mạch đang dùng',1);for(const id of A(nv.kinhMach?.daLinhNgo))add(id,'learned','Đã lĩnh ngộ',1);for(const[slot,no]of Object.entries(run.noiChon||{})){for(const[id,q]of Object.entries(no?.dongPhu?.kho||{}))if(+q>0)add(id,'owned','Kho động phủ · '+(W.info(slot)?.ten||slot),+q);for(const[id,q]of Object.entries(no?.tongMon?.kho||no?.sect?.kho||{}))if(+q>0)add(id,'owned','Kho tông môn · '+(W.info(slot)?.ten||slot),+q);for(const[ak,ah]of[['auctionHouse',no?.auctionHouse],['dauGia',no?.dauGia]])for(const lot of A(ah?.lots)){const id=lot?.itemId||lot?.item?.id||lot?.item;if(id&&lot?.result==null)add(id,'market',(ak==='dauGia'?'Đại hội đấu giá':'Đấu giá')+' · '+(W.info(slot)?.ten||slot),lot?.so||lot?.qty||1)}}for(const o of A(run.orders)){const id=o?.itemId||o?.item?.id||o?.item;if(id)add(id,'pending','Đơn đặt hàng',o?.so||o?.qty||1)}return m}
const itemIndex=[...C.items].map(([id,record])=>{const category=itemCategory(record),game=itemGameData(record),notes=itemSourceNotes(record),search=norm([record.ten,id,record.loai,category,GRADE_NAMES[record.pham_cap]||'',A(record.he).join(' '),itemSchoolGroups(record).flatMap(k=>[k,SCHOOL_GROUPS[k]?.ten]).join(' '),A(record.tag).join(' '),record.mo_ta,record.goi_y,game.join(' '),notes.join(' ')].join(' '));return{id,record,category,game,notes,search}});
let itemInventoryIndex=inventorySnapshot();
const itemSources=new Map();
function commercePoolMatch(r,p){if(!p||typeof p!=='object')return false;if(p.loai&&r.loai!==p.loai)return false;if(p.tag?.length&&!A(r.tag).some(t=>p.tag.includes(t)))return false;if(p.pham?.length&&N(r.pham_cap)&&(r.pham_cap<p.pham[0]||r.pham_cap>p.pham[1]))return false;const realm=+g.state.run.nhanVat?.canhGioi||+g.state.run.nhanVat?.canh_gioi||0;if(p.canh_gioi?.length&&N(r.canh_gioi)){const d=r.canh_gioi-realm;if(d<p.canh_gioi[0]||d>p.canh_gioi[1])return false}return true}
function buildItemSources(targetIds){const wanted=new Set(targetIds),missing=[...wanted].filter(id=>!itemSources.has(id));if(!missing.length)return new Map([...wanted].map(id=>[id,itemSources.get(id)||[]]));const fresh=new Map(missing.map(id=>[id,[]])),add=(id,x)=>{if(fresh.has(id)&&!fresh.get(id).some(a=>a.kind===x.kind&&a.id===x.id&&a.op===x.op&&a.path===x.path))fresh.get(id).push(x)},scan=(kind,col)=>{if(!(col instanceof Map))return;for(const[id,o]of col){walk(o,(x,path)=>{for(const[k,v]of Object.entries(x)){const iid=typeof v==='string'?v:v&&typeof v==='object'&&typeof v.id==='string'?v.id:null;if(iid&&fresh.has(iid)&&['add_item','roi_quy','mua','linh_ngo','hach','tran_phap'].includes(k))add(iid,{kind,id,op:k,path:path.concat(k).join('.'),ctx:x})}});if(kind==='encounter')for(const iid of missing){const r=C.items.get(iid);if(!r)continue;for(const[k,pool]of A(o.ke_hang).entries())if(commercePoolMatch(r,pool))add(iid,{kind,id,op:'pool_shop',path:`ke_hang.${k}`,ctx:pool});for(const[k,pool]of A(o.dau_gia?.ke).entries())if(commercePoolMatch(r,pool))add(iid,{kind,id,op:'pool_auction',path:`dau_gia.ke.${k}`,ctx:pool});for(const[k,lot]of A(o.dau_gia?.lo).entries())if(lot?.id===iid)add(iid,{kind,id,op:'auction_fixed',path:`dau_gia.lo.${k}`,ctx:lot})}}};scan('encounter',C.encounters);scan('enemy',C.enemies);scan('chain',C.chains);for(const[id,list]of fresh)itemSources.set(id,list);return new Map([...wanted].map(id=>[id,itemSources.get(id)||[]]))}
function itemRecordText(r){const parts=[];if(r.mo_ta)parts.push(r.mo_ta);if(r.he?.length)parts.push('Hệ: '+r.he.join(', '));if(N(r.gia))parts.push('Giá trị: '+F(r.gia)+' linh thạch');if(r.chieu)parts.push(`Chiêu: ${r.chieu.ten||''} · ${r.chieu.dang||''} · uy lực ${r.chieu.uy??'?'} · tốn ${r.chieu.phi??0} · hồi ${r.chieu.hoi??0}`);if(r.bi_dong)parts.push('Bị động: '+Object.entries(r.bi_dong).map(([k,v])=>k+' '+(typeof v==='object'?JSON.stringify(v):v)).join(', '));if(r.tag?.length)parts.push('Đặc điểm: '+r.tag.map(t=>t.replaceAll('_',' ')).join(', '));if(r.theo_kiep)parts.push('Theo qua kiếp');if(r.goi_y)parts.push('Gợi ý: '+r.goi_y);return parts}
function sourceText(a){const col=a.kind==='enemy'?C.enemies:a.kind==='chain'?C.chains:a.kind==='nơi chốn'?C.noiChon:a.kind==='bảng rơi'?C.lootTables:a.kind==='đơn phương'?C.donPhuong:C.encounters,o=col?.get?.(a.id),fallback=a.kind==='enemy'?'Kẻ địch':a.kind==='chain'?'Chuỗi nhiệm vụ':'Một hoạt động trong game',name=T(o?.ten||o?.name||fallback),ops={add_item:'Nhận trực tiếp',roi_quy:'Rơi theo xác suất',mua:'Mua',linh_ngo:'Lĩnh ngộ',hach:'Khôi lỗi giao',tran_phap:'Trận pháp',pool_shop:'Cửa hàng (bảng hàng)',pool_auction:'Đấu giá (bảng hàng)',auction_fixed:'Đấu giá cố định'};const where=a.kind==='encounter'?'sự kiện':a.kind==='enemy'?'kẻ địch':a.kind==='chain'?'chuỗi':a.kind==='nơi chốn'?'nơi chốn':a.kind==='bảng rơi'?'bảng rơi':a.kind==='đơn phương'?'đơn phương':'nguồn';return`${ops[a.op]||a.op} · ${where}: ${name}`}
/* Túi đúng source game: To / Xo / oi / Zt / Th. w6=30 ô gốc. */
function equipSlotOf(it){if(!it)return null;if(it.tru_vat)return'tru_vat';if(it.di_hoa)return'di_hoa';if(it.di_lai)return'di_lai';return it.dung_cu||null}
function bagStats(){
  const nv=Runtime.character()||{},items=g.env?.content?.items;
  const truId=nv.trangBi?.tru_vat;
  const tru=truId&&items?.get(truId)?.tru_vat||0;
  const vehId=nv.trangBi?.di_lai,veh=vehId&&items?.get(vehId);
  const vehOk=veh&&veh.loai==='phuong_tien'&&(veh.canh_gioi??0)<=(nv.canhGioi??0);
  const cap=30+(nv.oTuiThem||0)+tru+(vehOk?(veh.tui||0):0);
  const zt=id=>{const q=+(nv.tuiDo?.[id]||0);const onGrid=(nv.kinhMach?.manh||[]).filter(m=>m.item===id).length;const equipped=Object.values(nv.trangBi||{}).includes(id)&&q>0?1:0;return q-onGrid-equipped};
  const used=Object.keys(nv.tuiDo||{}).filter(id=>zt(id)>0).length;
  return{nv,cap,used,free:Math.max(0,cap-used),zt};
}
function canGrantItem(id){
  const run=g.state?.run;
  if(!run||run.ketThuc)return{ok:false,msg:'Chưa có kiếp đang chơi.'};
  if(!g.env?.content?.items?.has(id))return{ok:false,msg:'Không có món này trong dữ liệu game.'};
  const b=bagStats();
  if(b.zt(id)>0)return{ok:true,msg:'Xếp chồng, không tốn ô mới.'};
  const it=g.env.content.items.get(id),slot=equipSlotOf(it);
  if(b.used<b.cap)return{ok:true,msg:`Còn ${b.free} ô (${b.used}/${b.cap}).`};
  if(slot&&!b.nv.trangBi?.[slot]&&!(b.nv.tuiDo?.[id]>0))return{ok:true,msg:'Túi đầy nhưng ô trang bị tương ứng đang trống, game cho nhận thẳng vào ô đó.'};
  return{ok:false,msg:`Túi đầy (${b.used}/${b.cap} ô). Mỗi món khác nhau một ô; vứt hoặc cất bớt rồi thêm.`}
}
function grantBagItem(id){
  const chk=canGrantItem(id);if(!chk.ok)return chk;
  const run=g.state.run,nv=run.nhanVat,content=g.env.content;
  nv.tuiDo=nv.tuiDo||{};
  nv.tuiDo[id]=(nv.tuiDo[id]||0)+1;
  const it=content.items.get(id),slot=equipSlotOf(it);
  if(slot){nv.trangBi=nv.trangBi||{};if(!nv.trangBi[slot])nv.trangBi[slot]=id}
  const busy=!!(run.active&&!run.active.done&&run.active.waiting);
  try{if(!busy&&typeof g.sapXepTui==='function')g.sapXepTui()}catch(e){console.error(e)}
  if(g.state?.error){try{g.store.setState({error:undefined})}catch{}}
  try{if(g.state.run===run)g.store.setState({run:{...run,nhanVat:nv}})}catch{}
  const b=bagStats();
  return{ok:true,msg:`Đã thêm ${it?.ten||id} ×1. Túi ${b.used}/${b.cap} ô.`}
}
const TREASURE_GUIDE=new Map([["ev.di_bao_u_hon_dien", {"ten": "Cửa U Hồn Điện", "relic": "item.yeu_hoang_huyet_kinh", "gate": [5, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:103", "dia": {"ten": "U Hồn Điện", "han": "幽魂殿", "x": 1110.1, "y": 625.9, "cn": 2.8}, "chance": 0.07, "baoVe": {"ten": "Hạt Hoàng Thủ Lăng", "cg": 5}, "noi": "di_tich"}],["ev.di_bao_kiem_trach", {"ten": "Kiếm lành giữa đầm", "relic": "item.bat_chiet_kiem", "gate": [5, 5], "hoiChieu": 120, "diaDanh": "hoang:394", "dia": {"ten": "Kiếm Trạch", "han": "劍澤", "x": 1435.6, "y": 529.1, "cn": 2.3}, "chance": 0.07, "baoVe": {"ten": "Vạn Kiếm Oán Hồn", "cg": 5}, "check": "than_thuc +65", "noi": "son_thuy"}],["ev.di_bao_tien_van_dien", {"ten": "Đá ba mặt", "relic": "item.tam_sinh_thach", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:102", "dia": {"ten": "Tiên Vân Điện", "han": "仙雲殿", "x": 1186.8, "y": 645.4, "cn": 2.7}, "chance": 0.03, "check": "dao_tam +75", "noi": "di_tich"}],["ev.di_bao_yeu_phong_mo", {"ten": "Lửa đen Yêu Phong Mộ", "relic": "item.cuu_u_hoang_hoa", "gate": [5, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:34", "dia": {"ten": "Yêu Phong Mộ", "han": "妖風墓", "x": 561, "y": 257.2, "cn": 4.1}, "chance": 0.07, "baoVe": {"ten": "Hổ Hoàng Tàn Hồn", "cg": 5}, "noi": "di_tich"}],["ev.di_bao_han_giao_linh", {"ten": "Vảy rồng Giao tộc", "relic": "item.thai_co_long_lan", "gate": [5, 5], "hoiChieu": 120, "chance": 0.07, "baoVe": {"ten": "Giao Hoàng", "cg": 5}, "tocYeu": "giao", "noi": "hoang_da"}],["ev.di_bao_kiem_dai", {"ten": "Chiến kỳ trên Kiếm Đài", "relic": "item.doan_thien_chien_ky", "gate": [5, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:35", "dia": {"ten": "Kiếm Đài", "han": "劍台", "x": 480.7, "y": 343.5, "cn": 0.1}, "chance": 0.07, "baoVe": {"ten": "Đoạn Thiên Chiến Hồn", "cg": 5}, "noi": "di_tich"}],["ev.bien_trieu_khu", {"ten": "Đêm Triều Khư", "relic": "item.phong_thien_an", "hoiChieu": 120, "chance": 0.07, "baoVe": {"ten": "Ngũ Tổ Tàn Trận", "cg": 5}}],["ev.bien_thuyen_rong", {"ten": "Thuyền đầu rồng", "relic": "item.thai_hu_chu", "hoiChieu": 120, "chance": 0.03, "check": "than_thuc +100"}],["ev.di_bao_hon_thap", {"ten": "Kinh không tiếng", "relic": "item.luan_hoi_chan_kinh", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:39", "dia": {"ten": "Hồn Tháp", "han": "魂塔", "x": 1317.2, "y": 691.7, "cn": 2.4}, "chance": 0.03, "check": "ngo_tinh +70", "noi": "di_tich"}],["ev.di_bao_u_dien", {"ten": "Đèn trong U Điện", "relic": "item.van_kiep_hon_dang", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:40", "dia": {"ten": "U Điện", "han": "幽殿", "x": 1530.2, "y": 494.4, "cn": 2.4}, "chance": 0.07, "baoVe": {"ten": "U Minh Quỷ Mẫu", "cg": 4}, "noi": "di_tich"}],["ev.di_bao_lan_dai", {"ten": "Nhẫn trên ngón xương", "relic": "item.can_khon_gioi", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:141", "dia": {"ten": "Lan Đài", "han": "蘭台", "x": 344.3, "y": 917.5, "cn": 4.3}, "chance": 0.07, "baoVe": {"ten": "Cổ Chiến Khôi Lỗi", "cg": 5}, "noi": "di_tich"}],["ev.di_bao_tan_phong", {"ten": "Kiếm gãy trên Tàn Phong", "relic": "item.toai_thien_kiem", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "hoang:291", "dia": {"ten": "Tàn Phong", "han": "殘峰", "x": 1636.8, "y": 607.8, "cn": 0.4}, "chance": 0.07, "baoVe": {"ten": "Thái Cổ Lôi Linh", "cg": 5}, "noi": "son_thuy"}],["ev.di_bao_van_dan_trung", {"ten": "Mộ không đọng tuyết", "relic": "item.nghich_menh_dan", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:101", "dia": {"ten": "Vạn Đan Trủng", "han": "萬丹塚", "x": 1499, "y": 339.3, "cn": 0.3}, "chance": 0.07, "baoVe": {"ten": "Hạn Bạt", "cg": 4}, "noi": "di_tich"}],["ev.di_bao_tuyen_phong", {"ten": "Bình trên Tuyền Phong", "relic": "item.cam_lo_tinh_binh", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "hoang:286", "dia": {"ten": "Tuyền Phong", "han": "泉峰", "x": 1117.3, "y": 657.2, "cn": 2.9}, "chance": 0.03, "check": "dao_tam +68", "noi": "son_thuy"}],["ev.di_bao_dan_coc", {"ten": "Mộ y gia Đan Cốc", "relic": "item.than_nong_bach_thao_kinh", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "hoang:204", "dia": {"ten": "Đan Cốc", "han": "丹谷", "x": 1422.7, "y": 631.7, "cn": 1.9}, "chance": 0.03, "check": "ngo_tinh +45", "noi": "son_thuy"}],["ev.di_bao_xich_trung", {"ten": "Lò lửa Xích Trủng", "relic": "item.hon_nguyen_dan_dinh", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:94", "dia": {"ten": "Xích Trủng", "han": "赤塚", "x": 665.1, "y": 202.8, "cn": 4.9}, "chance": 0.07, "baoVe": {"ten": "Âm Hỏa Hồn Vương", "cg": 5}, "noi": "di_tich"}],["ev.di_bao_van_son", {"ten": "Gấu ngủ Vân Sơn", "relic": "item.tu_linh_chau", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "hoang:262", "dia": {"ten": "Vân Sơn", "han": "雲山", "x": 205.2, "y": 614.5, "cn": 2.3}, "chance": 0.07, "baoVe": {"ten": "Thái Nhạc Hùng", "cg": 5}, "noi": "son_thuy"}],["ev.di_bao_kim_dao_dien", {"ten": "Nghìn chậu đồng", "relic": "item.tu_bao_bon", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:36", "dia": {"ten": "Kim Đao Điện", "han": "金刀殿", "x": 1573.7, "y": 609.3, "cn": 1.9}, "chance": 0.03, "check": "than_thuc +100", "noi": "di_tich"}],["ev.di_bao_bang_hon_trung", {"ten": "Chuông trong mộ băng", "relic": "item.do_hon_linh", "gate": [4, 5], "hoiChieu": 120, "diaDanh": "azgaar:marker:90", "dia": {"ten": "Băng Hồn Trủng", "han": "冰魂塚", "x": 308, "y": 473.2, "cn": 2.3}, "chance": 0.07, "baoVe": {"ten": "Vạn Oán Quỷ", "cg": 5}, "noi": "di_tich"}],["ev.di_bao_ho_set", {"ten": "Nhẫn trong hố sét", "gate": [4, 5], "hoiChieu": 30, "check": "ngo_tinh +4", "noi": "hoang_da"}],["ev.di_bao_hop_ba_khoa", {"ten": "Hộp ba khóa", "gate": [4, 5], "hoiChieu": 30, "check": "khi_van +8", "noi": "hoang_da"}],["ev.di_bao_keo_dinh", {"ten": "Kéo đỉnh giữa hồ", "gate": [4, 5], "hoiChieu": 30, "check": "can_cot +4", "noi": "hoang_da"}]]);const TREASURE_CATALOG=[
['ev.di_bao_u_hon_dien','U Hồn Điện'],['ev.di_bao_kiem_trach','Kiếm Trạch'],['ev.di_bao_tien_van_dien','Tiên Vân Điện'],['ev.di_bao_yeu_phong_mo','Yêu Phong Mộ'],['ev.di_bao_kiem_dai','Kiếm Đài'],['ev.di_bao_hon_thap','Hồn Tháp'],['ev.di_bao_u_dien','U Điện'],['ev.di_bao_lan_dai','Lan Đài'],['ev.di_bao_tan_phong','Tàn Phong'],['ev.di_bao_van_dan_trung','Vạn Đan Trủng'],['ev.di_bao_tuyen_phong','Tuyền Phong'],['ev.di_bao_dan_coc','Đan Cốc'],['ev.di_bao_xich_trung','Xích Trủng'],['ev.di_bao_van_son','Vân Sơn'],['ev.di_bao_kim_dao_dien','Kim Đao Điện'],['ev.di_bao_bang_hon_trung','Băng Hồn Trủng'],['ev.di_bao_han_giao_linh',null],['ev.bien_trieu_khu','Bến Vĩnh Triều'],['ev.bien_thuyen_rong','Bến Lạc Khư']];
function nearestSlot(match){let best=null,bt=Infinity;for(const sl of W.slots||[]){if(sl.an)continue;let info;try{info=W.info(sl.id)}catch{continue}if(!match(info,sl))continue;const t=+g.travelYears(sl.id);if(t<bt){bt=t;best=sl.id}}return best}
function groups(r){const b=new Set(),isTreasure=TREASURE_GUIDE.has(r.enc)||Boolean(rareTreasure(r)),isSect=['Ngọc giản tông môn','Nhiệm vụ đã nhận'].includes(r.src),isMap=r.src==='Sự kiện trên bản đồ';r.rare=rareTreasure(r);if(isTreasure)b.add('treasure');if(isSect)b.add('sect');if(isMap&&!isTreasure)b.add('mapevent');if(isTreasure||isSect||isMap||r.x?.catalog)b.add('all');return b}
function repeat(r){const l=r.e?.limits||{};if(l.moi_run)return'Một lần mỗi kiếp';if(N(l.hoi_chieu_nam))return`Lặp lại sau ${F(l.hoi_chieu_nam)} năm`;if(r.meta.repeat)return'Có lựa chọn lặp';if(r.src==='Tiện ích tại nơi')return'Thường trú theo địa điểm';return'Theo vòng đời sự kiện'}
function hallOpen(){const a=g.state.run.active;return a?.id==='ev.nhiem_vu_tong_mon'&&a?.waiting?.kind==='treo_thuong'&&a?.waiting?.data?.loai==='tong_mon'}
function syncSect(){if(!hallOpen())return[];const found=new Map();for(const li of document.querySelectorAll('.tt-viec')){const el=li.querySelector('button')||li;for(const k of Reflect.ownKeys(el).filter(k=>/reactFiber/i.test(String(k)))){for(let f=el[k],i=0;f&&i<20;i++,f=f.return)for(const p of[f.pendingProps,f.memoizedProps]){const v=p?.v;if(v?.id&&v?.enc&&v?.slot)found.set(v.id,{...v,ten:T(v.ten)})}}}const values=[...found.values()],snapshot={year:Math.floor(g.state.run.nam),sectSlot:g.state.run.tongMon?.slot||null,values};sessionStorage.setItem('veh3-sect',JSON.stringify(snapshot));return values}
function cleanPrivateText(value){return String(value??'').replace(/[\uE000-\uE0FF]/g,'')}
function questRecord(value,source,run=g.state.run,context={}){if(!value||typeof value!=='object')return null;const id=String(value.id||value.viec||value.questId||''),encounter=String(value.enc||value.encounter||''),definition=encounter?C.encounters.get(encounter):null,slot=value.slot||value.diaDiem||definition?.slot||null,born=N(value.namSinh)?+value.namSinh:N(context.boardYear)?+context.boardYear:null,endYear=N(value.hetHanNam)?+value.hetHanNam:N(value.hanNam)?+value.hanNam:N(value.han)&&born!==null?born+Number(value.han):null,travel=slot&&W.hasSlot(slot)?+g.travelYears(slot):null,distance=slot&&W.hasSlot(slot)?+g.distanceLi(slot):null,remaining=endYear!==null&&N(run.nam)?endYear-run.nam:null;return{recordType:'quest',key:`quest|${source}|${id||encounter}|${slot||''}`,id:id||null,name:cleanPrivateText(value.ten||definition?.ten||id||encounter||'Nhiệm vụ'),source,encounter:encounter||null,slot:slot&&W.hasSlot(slot)?slot:null,startYear:born,endYear,remainingYears:remaining,travelYears:travel,distanceLi:distance,canArrive:remaining===null||travel===null?null:travel<=remaining,contribution:N(value.congHien)?+value.congHien:null,reward:value.thuong??value.reward??null,status:value.hoanThanh?'completed':value.thatBai?'failed':'active',vars:value.vars||{},raw:value}}
function collectQuestRecords(run=g.state.run){const out=[],seen=new Set(),add=(value,source,context={})=>{const record=questRecord(value,source,run,context);if(record&&!seen.has(record.key)){seen.add(record.key);out.push(record)}};for(const value of A(run?.viecNhan))add(value,'Nhiệm vụ đã nhận');for(const value of A(run?.nhiemVu))add(value,'Nhiệm vụ');for(const[,place]of Object.entries(run?.noiChon||{})){const board=place?.treoThuong;for(const value of A(board?.viec))add(value,'Treo thưởng',{boardYear:board?.nam})}for(const[id,state]of Object.entries(run?.chains||{})){const definition=C.chains?.get?.(id);add({id,...(definition||{}),...state,enc:definition?.encounter||definition?.enc},'Chuỗi nhiệm vụ')}for(const value of sectCache())add(value,'Ngọc giản tông môn');for(const entry of(g.orderList?.()||[]))add(entry.viec||entry,'Nhiệm vụ đã nhận');return out.sort((a,b)=>(a.status==='active'?0:1)-(b.status==='active'?0:1)||(a.canArrive===false?1:0)-(b.canArrive===false?1:0)||(a.distanceLi??Infinity)-(b.distanceLi??Infinity)||(a.endYear??Infinity)-(b.endYear??Infinity))}
function sectCache(){if(!hallOpen())return[];try{const snapshot=JSON.parse(sessionStorage.getItem('veh3-sect')||'null');if(!snapshot||!Array.isArray(snapshot.values)||snapshot.year!==Math.floor(g.state.run.nam)||snapshot.sectSlot!==(g.state.run.tongMon?.slot||null))return[];return snapshot.values}catch{return[]}}
function addRows(){const run=g.state.run,out=[],seen=new Set(),add=(slot,enc,src,x={})=>{if(!slot||!enc||!C.encounters.has(enc)||!W.hasSlot(slot))return;const key=[slot,enc,src,x.id||x.ten||''].join('|');if(seen.has(key))return;seen.add(key);const e=C.encounters.get(enc),born=N(x.namSinh)?+x.namSinh:(typeof x.id==='string'&&N(x.id.split('@').at(-1))?+x.id.split('@').at(-1):null),expires=N(x.hetHanNam)?+x.hetHanNam:(born!==null&&N(x.han)?born+(+x.han):null),travel=+g.travelYears(slot),dist=+g.distanceLi(slot),r={slot,enc,src,x,e,info:W.info(slot),born,expires,travel,dist,remain:expires===null?null:expires-(run.nam+travel),meta:inspect(e,x.vars||{})};r.tags=tags(e,src);r.groups=groups(r);out.push(r)};for(const[s,n]of Object.entries(run.nodes||{}))n?.encounter&&add(s,n.encounter,'Sự kiện trên bản đồ',n);for(const[s,p]of Object.entries(run.noiChon||{})){A(p?.suKien).forEach(e=>add(s,e,'Sự kiện tại nơi',{ten:p.tenMoi}));A(p?.gan).forEach(e=>add(s,e,'Tiện ích tại nơi',{ten:p.tenMoi}));A(p?.treoThuong?.viec).forEach(v=>add(v.slot,v.enc,'Treo thưởng',v))}for(const[id,c]of Object.entries(run.chains||{})){const d=C.chains?.get?.(id);d?.slot&&add(d.slot,d.encounter||d.enc,'Chuỗi nhiệm vụ',{id,...c})}sectCache().forEach(v=>add(v.slot,v.enc,'Ngọc giản tông môn',v));for(const m of(g.orderList?.()||[])){const v=m.viec||m;add(v.slot,v.enc||v.encounter,'Nhiệm vụ đã nhận',v)}for(const [enc,place] of TREASURE_CATALOG){if(!C.encounters.has(enc))continue;const active=Object.entries(run.nodes||{}).find(([,n])=>n?.encounter===enc);if(active)continue;let slot=place?nearestSlot(info=>info.ten===place):null;if(!slot&&enc==='ev.di_bao_han_giao_linh')slot=nearestSlot(info=>(info.tocYeu==='giao')&&(info.diaHinh?.some(x=>['hoang_da','son_thuy'].includes(x))||info.slot?.co_dinh===false));if(!slot)continue;const e=C.encounters.get(enc),rareItem=[];walk(e,x=>{if(typeof x.add_item==='string'&&C.items.get(x.add_item)?.tag?.includes?.('di_bao'))rareItem.push(x.add_item)});add(slot,enc,'Danh mục dị bảo',{catalog:true,ten:e.ten,rareItem:[...new Set(rareItem)],place,active:false})}return out}
function preview(r){try{const run=g.state.run;if(!run.tran||run.active?.slot!==r.slot)return null;return g.duKienTran?.()||null}catch{return null}}
function focusMap(slot){const m=window.map,cam=m?.cam,root=m?.app?.stage?.children?.find?.(x=>x?.scale&&x?.position&&Math.abs((x.scale.x||0)-cam?.scale)<1e-6);if(!cam||!root||!W.hasSlot(slot))return false;const t=W.slot(slot),scale=Math.max(cam.minScale||.1,Math.min(cam.maxScale||10,cam.scale||1)),maxX=Math.max(0,(cam.worldWidth||1920)-(cam.width||innerWidth)/scale),maxY=Math.max(0,(cam.worldHeight||1080)-(cam.height||innerHeight)/scale),x=Math.max(0,Math.min(maxX,t.x-(cam.width||innerWidth)/(2*scale))),y=Math.max(0,Math.min(maxY,t.y-(cam.height||innerHeight)/(2*scale)));cam.x=x;cam.y=y;cam.scale=scale;root.scale.set?.(scale);root.position.set?.(-x*scale,-y*scale);for(const fn of cam.listeners||[])try{fn(cam)}catch{}return true}

const RELATION_NAMES={quen_biet:'Quen biết',doi_thu:'Đối thủ',bang_huu:'Bằng hữu',hiem_khich:'Hiềm khích',ke_thu:'Kẻ thù',tu_thu:'Tử thù',tri_ky:'Tri kỷ',ket_nghia:'Kết nghĩa',dao_lu:'Đạo lữ',su_phu:'Sư phụ',phan_boi:'Kẻ phản bội',de_tu:'Đệ tử',an_nhan:'Ân nhân'};
const GIFT_NAMES={dan_duoc:'Đan dược',linh_duoc:'Linh dược',phap_khi:'Pháp khí',cong_phap:'Công pháp',phu_luc:'Phù lục',yeu_tai:'Yêu tài',dac_san:'Đặc sản'};
function npcRuntimeLocation(id,run=g.state.run){for(const [key,raw]of Object.entries(run?.nodes||{})){const node=raw&&typeof raw==='object'?raw:{},vars=node.vars&&typeof node.vars==='object'?node.vars:{};if(node.viec)continue;if(Object.values(vars).some(v=>String(v)===String(id))){const enc=C.encounters?.get?.(node.encounter),isPeople=node.encounter==='nhan_mach'||enc?.kind==='nhan_mach'||A(enc?.tags?.tinh_chat).includes('nhan_mach');if(isPeople)return{slot:node.slot||key,note:'Đang xuất hiện trên bản đồ',until:N(node.hetHanNam)?+node.hetHanNam:null,confidence:'runtime',source:'node'}}}return null}
function npcInteractionHints(id,npc,run=g.state.run,location=null){const alive=npc?.song!==false,met=!npc?.chuaGap,here=Boolean(location?.slot&&location.slot===run?.viTri),samePlace=here||run?.dongHanh?.npc===id,out=[];if(!alive)return out;if(!met)return['Chưa gặp'];if(samePlace){out.push('Có thể gặp mặt');if(npc.lastGiftYear!==Math.floor(Number(run.nam)||0))out.push('Có thể tặng quà');else out.push('Đã tặng quà năm nay');if(npc.lastAskYear!==Math.floor(Number(run.nam)||0))out.push('Có thể hỏi chuyện');else out.push('Đã hỏi chuyện năm nay');if(npc.danhPhan==='dao_lu')out.push('Tương tác đạo lữ');if(run?.dongHanh?.npc===id)out.push('Đang đồng hành')}else if(location?.slot)out.push('Có thể tìm đến');else out.push('Chưa rõ nơi tương tác');return out}
function npcLocation(id,npc,run=g.state.run){const runtime=npcRuntimeLocation(id,run);if(runtime)return runtime;if(run?.dongHanh?.npc===id)return{slot:run.viTri,note:'Đang đồng hành',until:N(run.dongHanh.den)?+run.dongHanh.den:null,confidence:'runtime',source:'companion'};if(npc?.trip&&N(npc.trip.until)&&+npc.trip.until>+run.nam)return{slot:npc.trip.to||null,note:npc.trip.to===run.viTri?'Đang ở điểm đến chuyến đi':'Đang đi tới '+safePlaceName(npc.trip.to),until:+npc.trip.until,confidence:'state',source:'trip'};if(npc?.home&&W.hasSlot(npc.home))return{slot:npc.home,note:run?.noiChon?.[npc.home]?.chuNhan==='nguoi_choi'?'Ở động phủ của người chơi':'Ở nhà',until:null,confidence:'state',source:'home'};if(npc?.que&&W.hasSlot(npc.que))return{slot:npc.que,note:'Ở quê nhà',until:null,confidence:'fallback',source:'hometown'};if(npc?.seen?.slot&&W.hasSlot(npc.seen.slot))return{slot:npc.seen.slot,note:'Vị trí gặp gần nhất',until:N(npc.seen.year)?+npc.seen.year:null,confidence:'history',source:'seen'};if(npc?.theLuc&&(npc.seat||npc.danhPhan==='su_phu'))return{slot:null,note:'Thuộc thế lực · chưa xác định trụ sở',until:null,confidence:'unknown',source:'faction'};return{slot:null,note:'Chưa rõ tung tích',until:null,confidence:'unknown',source:'unknown'}}
function giftItemMatch(record,kind){if(!record||!kind)return false;const type=String(record.loai||''),tags=A(record.tag).map(String);if(['dan_duoc','phap_khi','cong_phap','phu_luc'].includes(kind))return type===kind;if(kind==='linh_duoc')return type==='linh_duoc'||tags.includes('linh_duoc');if(kind==='yeu_tai')return type==='yeu_tai'||tags.includes('yeu_tai')||tags.includes('yeu_thu');if(kind==='dac_san')return type==='dac_san'||tags.includes('dac_san');return false}
function giftItems(kind){return[...C.items].filter(([,record])=>giftItemMatch(record,kind)).map(([id,record])=>({id,record,qty:Runtime.itemQty(id)})).sort((a,b)=>(b.qty-a.qty)||(a.record.ten||a.id).localeCompare(b.record.ten||b.id,'vi'))}
function collectPeopleRecords(run=g.state.run){
  const out=[],now=Number(run?.nam)||0;
  for(const[id,npc]of Object.entries(run?.npc||{})){
    if(!npc||npc.chuaGap)continue;
    const activeRelation=npc.danhPhan&&npc.danhPhan!=='quen_biet'||N(npc.haoCam)&&+npc.haoCam!==0||npc.lastGiftYear!=null||npc.lastAskYear!=null||npc.tinhY||N(npc.no?.so)&&+npc.no.so>0||npc.seen?.slot||run?.dongHanh?.npc===id;
    if(!activeRelation&&npc.song!==false)continue;
    const location=npcLocation(id,npc,run);
    const slot=location.slot&&W.hasSlot(location.slot)?location.slot:null;
    const distance=slot?+g.distanceLi(slot):null,travel=slot?+g.travelYears(slot):null;
    const name=T(npc.ten||npc.name||id);
    const genderCode=String(npc.gioiTinh||npc.gioi_tinh||'').toLowerCase();
    const gender=genderCode==='nam'?'Nam':genderCode==='nu'?'Nữ':genderCode?T(genderCode):'Chưa rõ';
    const lifeState=npc.song===false?'Đã khuất':'Còn sống';
    const interactions=npcInteractionHints(id,npc,run,location);
    const relationKey=String(npc.danhPhan||'quen_biet');
    const relation=RELATION_NAMES[relationKey]||T(relationKey).replaceAll('_',' ');
    const debt=N(npc.no?.so)?+npc.no.so:0;
    const giftLike=npc.giftLike||npc.soThich||null;
    const giftLikeName=npc.giftLikeName||npc.soThichName||(giftLike&&GIFT_NAMES[giftLike])||null;
    let giftOwned=0,giftTotal=0;
    if(giftLike){
      try{
        const gifts=giftItems(giftLike);
        giftTotal=gifts.length;
        giftOwned=gifts.filter(x=>x.qty>0).length;
      }catch{}
    }
    const placeName=slot?safePlaceName(slot):null;
    const canMeet=interactions.includes('Có thể gặp mặt');
    const until=N(location.until)?+location.until:null;
    const remaining=until!==null?until-now:null;
    out.push({
      key:`person|${id}`,id,name,npc,gender,genderCode,lifeState,
      relation,relationKey,affection:N(npc.haoCam)?+npc.haoCam:0,debt,
      romance:Boolean(npc.tinhY),location,slot,placeName,distance,travel,
      interactions,canMeet,giftLike,giftLikeName,giftOwned,giftTotal,
      lastGiftYear:npc.lastGiftYear,lastAskYear:npc.lastAskYear,seen:npc.seen||null,
      home:npc.home||null,hometown:npc.que||null,faction:npc.theLuc||null,
      seat:npc.seat||null,remaining,until
    });
  }
  const rank=x=>x.lifeState==='Đã khuất'?6:x.canMeet?0:x.location.source==='node'?1:x.location.source==='companion'?2:x.slot?3:5;
  return out.sort((a,b)=>rank(a)-rank(b)||(a.travel??Infinity)-(b.travel??Infinity)||(a.distance??Infinity)-(b.distance??Infinity)||b.affection-a.affection||a.name.localeCompare(b.name,'vi'));
}

const SEED_NAMES={an_nghia:'Ân nghĩa',oan_han:'Oan hận',truy_na:'Truy nã',no_van_bao:'Nợ vẫn báo'};
function collectRandomRecords(run=g.state.run){const year=+run?.nam,out=[],seen=new Set(),add=r=>{if(r?.key&&!seen.has(r.key)){seen.add(r.key);out.push(r)}};const bienCo=run?.bienCo;if(bienCo?.encounter){const e=C.encounters.get(bienCo.encounter),target=bienCo.vars?.doi_tuong,npc=target&&run?.npc?.[target];add({recordType:'random',key:`bienco|${bienCo.encounter}|${bienCo.slot||run.viTri||''}`,source:'bienCo',kind:'Biến cố',name:`${e?.ten||bienCo.encounter}${npc?.ten?' — '+npc.ten:''}`,slot:bienCo.slot||run.viTri||null,startYear:N(bienCo.namSinh)?+bienCo.namSinh:null,endYear:N(bienCo.hetHanNam)?+bienCo.hetHanNam:null,state:'active',encounter:bienCo.encounter,vars:bienCo.vars||{}})}for(const[key,raw]of Object.entries(run?.nodes||{})){const node=raw&&typeof raw==='object'?raw:null;if(!node?.encounter||(!node.npc&&!node.viec&&!N(node.hetHanNam)))continue;const slot=node.slot||key,e=C.encounters.get(node.encounter),npc=node.npc&&run?.npc?.[node.npc],name=npc?.ten?`${npc.ten}${e?.ten?' — '+e.ten:''}`:e?.ten||node.viec||node.npc||node.encounter;add({recordType:'random',key:`node|${slot}|${node.encounter}|${node.npc||node.viec||''}`,source:'nodes',kind:node.npc?'NPC ghé qua':node.viec?'Việc đã nhận':'Sự kiện tạm thời',name,slot,startYear:N(node.namSinh)?+node.namSinh:null,endYear:N(node.hetHanNam)?+node.hetHanNam:null,state:'active',encounter:node.encounter,npc:node.npc||null,quest:node.viec||null,vars:node.vars||{}})}for(const mark of A(run?.lookupMarks)){if(!mark?.slot||!N(mark.untilYear)||N(year)&&+mark.untilYear<=year)continue;add({recordType:'random',key:`lookup|${mark.slot}|${mark.untilYear}`,source:'lookupMarks',kind:'Dò hỏi',name:T(mark.label)||'Dấu dò hỏi',slot:mark.slot,startYear:null,endYear:+mark.untilYear,state:'active'})}for(const seed of A(run?.seeds)){if(!seed||typeof seed!=='object')continue;const npc=seed.doiTuong&&run?.npc?.[seed.doiTuong],state=!N(year)||!N(seed.tuNam)||!N(seed.denNam)?'unknown':year<+seed.tuNam?'waiting':year<=+seed.denNam?'active':'expired';add({recordType:'random',key:`seed|${seed.loai||''}|${seed.doiTuong||''}|${seed.gieoNam||''}`,source:'seeds',kind:'Hạt nhân quả',name:`${SEED_NAMES[seed.loai]||seed.loai||'Nhân quả'}${npc?.ten?' — '+npc.ten:''}`,slot:seed.slot||null,startYear:N(seed.tuNam)?+seed.tuNam:null,endYear:N(seed.denNam)?+seed.denNam:null,seededYear:N(seed.gieoNam)?+seed.gieoNam:null,state,target:seed.doiTuong||null})}return out.map(r=>{const validSlot=r.slot&&W.hasSlot(r.slot),travel=validSlot?+g.travelYears(r.slot):null,distance=validSlot?+g.distanceLi(r.slot):null,remaining=N(r.endYear)&&N(year)?r.endYear-year:null;return{...r,slot:validSlot?r.slot:null,travelYears:travel,distanceLi:distance,remainingYears:remaining,canArrive:remaining===null||travel===null?null:travel<=remaining}}).sort((a,b)=>(a.state==='expired'?1:0)-(b.state==='expired'?1:0)||(a.distanceLi??Infinity)-(b.distanceLi??Infinity)||(a.endYear??Infinity)-(b.endYear??Infinity))}

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
    Nin: [/\.qua_cua\|\|\w\.treo_thuong\|\|\w\.bien_co\|\|/, 'tiện ích ở một nơi'],
    H1:  [/\|ke\|\$\{\w\}\|\$\{\w\}`,\{sizeFactor:/, 'hàng trong tiệm'],
  };
  const REGEX_NAMES = {
    rn: [/function ([\w$]+)\(([\w$]+)\)\{return [\w$]+\[Math\.max\(0,Math\.min\([\w$]+,\2\)\)\]\}/, 'bảng cảnh giới'],
    fn: [/class ([\w$]+)\{constructor\(([\w$]+)\)\{this\.state=\2\}static fromSeed/, 'bộ số ngẫu nhiên'],
    No: [/const ([\w$]+)=\["Tạp dịch","Ngoại môn"/, 'tên cấp bậc tông môn'],
    E1: [/function ([\w$]+)\(([\w$]+),([\w$]+),([\w$]+),([\w$]+)=0\)\{return [\w$]+\(\2,\3,\4,[\w$]+\(\2,\3,"buy",\5\)\)\}/, 'giá mua'],
    gP: [/if\(!([\w$]+)\([\w$]+,[\w$]+\)\)throw new Error\("Nơi đó còn phủ mây/, 'vùng đã khám phá'],
  };

  // Hàm cho tính năng phụ: thiếu thì chỉ tính năng đó tắt, phần còn lại vẫn chạy.
  const ANCHORS_OPT = {
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
    kC: [/function ([\w$]+)\(([\w$]+),([\w$]+),([\w$]+)\)\{const [\w$]+=[\w$]+\(\2\);return\{mau:/, 'dựng kinh mạch'],
    IP: [/function ([\w$]+)\(([\w$]+),([\w$]+),([\w$]+),([\w$]+)=0\)\{return [\w$]+\(\2,\3,\4,\5,[\w$]+\(\2,\3,"sell",\5\)\)\}/, 'giá bán'],
  };

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
    const tag = document.querySelector('script[type=module][src*="/assets/index-"]');
    if (!tag) throw new Error('Không tìm thấy file code chính của game.');
    const url = tag.src, base = url.slice(0, url.lastIndexOf('/') + 1);
    progress('Đang tải code game…');
    let src = await (await fetch(url)).text();
    const names = {}, missing = [];
    for (const [k, [a, label]] of Object.entries(ANCHORS)) { const n = findFn(src, a); if (n) names[k] = n; else missing.push(label); }
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
    for (const [k, [a, label]] of Object.entries(ANCHORS_OPT)) { const n = findFn(src, a); if (n) names[k] = n; else optMissing.push(label); }
    for (const [k, [re, label]] of Object.entries(REGEX_OPT)) { const m = re.exec(src); if (m) names[k] = m[1]; else optMissing.push(label); }
    { const m = /,([\w$]+)=\(([\w$]+),([\w$]+),([\w$]+)\)=>\2\.world\.info\(\4\)\.capNen-[\w$]+\(\3\.nhanVat\),([\w$]+)=([\w$]+)=>[\w$]+\.find\(([\w$]+)=>\6<=\7\.max\)/.exec(src); if (m) { names.ua = m[1]; names.is = m[5]; } else optMissing.push('độ nguy hiểm'); }
    let PO = 30; { const m = /,PO=([\w$]+)[,;]/.exec(src); if (m) { const v = new RegExp('[,; ]' + m[1].replace(/\$/g, '\\$') + '=(\\d+(?:\\.\\d+)?)').exec(src); if (v) PO = +v[1]; } }
    if (missing.length) throw new Error('Game vừa cập nhật nên tool chưa nhận ra: ' + missing.join(', ') + '. Hãy chụp màn hình này gửi Claude để sửa tool.');
    // Đường dẫn tương đối → tuyệt đối (vì bản sao chạy từ blob:)
    src = src.replace(/from"\.\//g, 'from"' + base).replace(/import\("\.\//g, 'import("' + base);
    // Bản sao chạy từ blob: nên import.meta.url phải trỏ về file gốc của game
    src = src.replace(/import\.meta\.url/g, JSON.stringify(url));
    // Không cho bản sao khởi động lại giao diện game
    let ok1 = false, ok2 = false;
    src = src.replace(/((?:[\w$]+\(\);)*)const ([\w$]+)=[\w$]+\.createRoot\(document\.getElementById\("hud"\)\)/, (_, __, v) => { ok1 = true; return `const ${v}={render(){}}`; });
    src = src.replace(/(__tuTienReady:!0\}\)\})([\w$]+)\(\)\.catch\(/, (_, a) => { ok2 = true; return a + 'Promise.resolve().catch('; });
    if (!ok1 || !ok2) throw new Error('Game vừa đổi cách khởi động nên tool chưa chạy được. Hãy chụp màn hình này gửi Claude để sửa tool.');
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
    K.optMissing = optMissing; K.PO = PO;
    return K;
  }

  // ───────────────────────── 2. Tiện ích ─────────────────────────
  const G = () => window.game;
  const C = () => G().env.content;
  const clone = (x) => structuredClone(x);
  const sleep0 = () => new Promise((r) => setTimeout(r, 0));
  const pct = (x, d = 0) => (x * 100).toFixed(d).replace('.', ',') + '%';
  const num = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HE = { kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ', bang: 'Băng', loi: 'Lôi', phong: 'Phong', vo_sac: 'Vô sắc' };
  const heTen = (h) => HE[h] ?? h;
  const STAGE = ['Sơ', 'Trung', 'Hậu', 'ĐVM'];

  function ctx() {
    const K = S.core, st = G().state;
    const run = clone(st.run), meta = clone(st.meta), F = K.fn, o = new Map();
    run.rngKeys ??= {};
    return {
      ...G().env, run, meta, rng: new F(run.rng), enc: run.active, noticeLines: [],
      rngFor(r) {
        let u = o.get(r);
        if (!u) { const l = Object.hasOwn(run.rngKeys, r) ? run.rngKeys[r] : undefined; u = l === undefined ? F.fromSeed(`${run.seed}|rng|${r}`) : new F(l); o.set(r, u); }
        return u;
      },
    };
  }
  const nvNow = () => clone(G().state.run.nhanVat);
  const realmName = (i) => { try { return S.core.rn(i).ten; } catch { return 'Cảnh giới ' + i; } };
  const realmLabel = (cg, tc) => { try { return S.core.Qn(cg, tc); } catch { return realmName(cg); } };

  // ───────────────────────── 3. Mô phỏng trận ─────────────────────────
  const enemyRosterCache=new Map();
  function allGameEnemies(cg,tcP=0){
    const K=S.core,c=C(),MAX_BASE=30,key=`${K.bundle||'game'}|${cg}|${tcP}|peer-plus1|${c.enemies.size}|${MAX_BASE}`;
    if(enemyRosterCache.has(key))return enemyRosterCache.get(key);
    const all=[...c.enemies].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),picked=[];
    if(all.length<=MAX_BASE)picked.push(...all);else{
      const used=new Set();
      for(let i=0;i<MAX_BASE;i++){
        const at=Math.min(all.length-1,Math.floor(i*(all.length-1)/(MAX_BASE-1))),x=all[at];
        if(!used.has(x[0])){used.add(x[0]);picked.push(x)}
      }
    }
    const out=[],tc=Math.max(0,Math.min(3,Number(tcP)||0));
    for(const [id,def] of picked)for(const realm of [cg,cg+1]){
      try{const muc=def.muc&&def.muc!=='thuong'?def.muc:'thuong';out.push({id:`${id}|cg${realm}|tc${tc}`,baseId:id,realm,tc,muc,E:K.Ga({...def,canh_gioi:realm,tieu_canh_gioi:tc},c,{muc})})}catch{}
    }
    enemyRosterCache.set(key,out);return out
  }
  const benchEnemies=allGameEnemies;
  function fight(P, E) {
    try { return S.core.eJ(clone(P), clone(E), {}); } catch { return { thang: false, nHiep: 30, khiHuyetThapNhat: 0, stTa: 0 }; }
  }
  function enemyAt(def, cg, tc, muc) {
    return S.core.Ga({ ...def, canh_gioi: cg, tieu_canh_gioi: tc }, C(), muc ? { muc } : {});
  }

  // ───────────────────────── 4. Tối ưu kinh mạch ─────────────────────────

  const BUILD_TAGS={tu_do:[],kiem:['kiem'],the:['the'],phat:['phat'],ma:['ma','nghich'],doc:['doc','co'],hop_hoan:['hop_hoan'],thi:['thi'],quy:['quy'],ngu_thu:['ngu_thu','ngu_linh'],khoi_loi:['khoi_loi'],phu:['phu'],tran:['tran'],dan:['dan'],khi:['khi']};
  const TA_TAGS=['ma','nghich','thi','quy','doc','hop_hoan'];
  const TA_SCHOOLS=['ma','doc','hop_hoan','thi','quy'];
  const NL_SCHOOL={ngu_thu:'thu',khoi_loi:'khoi_loi',doc:'trung',thi:'thi',quy:'hon'};
  const NL_LABEL={thu:'thú',khoi_loi:'khôi lỗi',trung:'cổ trùng',thi:'thi khôi',hon:'quỷ hồn'};
  /* Phân loại đúng game (611/ye): Tâm=CP không chiêu · Đấu=CP có chiêu · PK=PK có chiêu · BV=PK không chiêu */
  function pieceCls(it){
    if(!it)return'bv';
    if(it.loai==='cong_phap')return it.chieu?'dau':'tam';
    return it.chieu?'pk':'bv';
  }
  function isTa(it){
    if(!it)return false;
    if(A(it.tag).some(t=>TA_TAGS.includes(t)))return true;
    if(A(it.tran_phai).some(t=>TA_TAGS.includes(t)))return true;
    if(it.ngu_linh&&['thi','hon'].includes(it.ngu_linh.loai))return true;
    return false;
  }
  function schoolMatchItem(school,it){
    if(!it||!school||school==='tu_do')return true;
    const tags=BUILD_TAGS[school]||[];
    const raw=[...A(it.tag),...A(it.tran_phai)];
    return tags.some(t=>raw.includes(t));
  }
  /* pathInfo: điều kiện bắt buộc theo phái (huuhoang) */
  function pathInfo(manh,R,nv){
    const school=S.pref?.school||'tu_do';
    const th=(R?.manh||[]).filter(m=>m&&m.thong);
    const Cc=C();
    const match=th.filter(m=>{const it=Cc.items.get(m.item);return schoolMatchItem(school,it)}).length;
    const openCells=A(nv?.kinhMach?.trangThai).filter(x=>x==='thong').length||Math.max(1,th.length);
    let taCells=0;
    for(const m of th){
      const it=Cc.items.get(m.item);
      if(!isTa(it))continue;
      taCells+=A(m.o).length||1;
    }
    const taRatio=taCells/Math.max(1,openCells);
    const req=[];
    if(school==='the'){
      const ok=th.some(m=>{const it=Cc.items.get(m.item);return it&&it.loai==='cong_phap'&&!it.chieu&&A(it.tag).includes('the')});
      req.push({ok,txt:'Tâm pháp luyện thể đang thông (bắt buộc để chiêu thể đánh bằng khí huyết)'});
    }
    if(TA_SCHOOLS.includes(school)){
      req.push({ok:taRatio>=1/3,txt:`Mảnh tà ≥ 1/3 ô đang thông để lưới ngả tà (hiện ${Math.round(taRatio*100)}%)`});
    }else if(school!=='tu_do'&&taCells>0){
      req.push({ok:taRatio<1/3,txt:`Giữ lưới chính đạo: mảnh tà dưới 1/3 ô (hiện ${Math.round(taRatio*100)}%)`});
    }
    if(NL_SCHOOL[school]){
      const loai=NL_SCHOOL[school];
      const slots=th.filter(m=>{const it=Cc.items.get(m.item);return it?.ngu_linh&&it.ngu_linh.loai===loai}).reduce((a,m)=>{const it=Cc.items.get(m.item);return a+(it?.ngu_linh?.o||0)},0);
      req.push({ok:slots>0,txt:`Công pháp mở ô ${NL_LABEL[loai]||loai} đang thông (hiện ${slots} ô)`});
    }
    if(school==='kiem'){
      const ok=th.some(m=>{const it=Cc.items.get(m.item);return it&&schoolMatchItem('kiem',it)&&it.chieu});
      req.push({ok,txt:'Có kiếm ra chiêu đang thông'});
    }
    return{school,match,thong:th.length,taRatio,taCells,openCells,req,miss:req.some(r=>!r.ok)};
  }
  /* pathWeight: 0 tắt · 1 ưu tiên · 2–3 ép mạnh (huuhoang PATH_W) */
  function pathScore(manh,R,nv){
    const school=S.pref?.school||'tu_do';
    const W={0:0,1:1,2:3,3:3}[Number(S.pref?.pathWeight??2)]??2;
    if(!W||school==='tu_do')return 0;
    const pi=pathInfo(manh,R,nv);
    let sc=40*pi.match;
    for(const r of pi.req)sc+=r.ok?120:-120;
    if(!TA_SCHOOLS.includes(school)){
      const Cc=C();
      const taN=(R?.manh||[]).filter(m=>m&&m.thong&&isTa(Cc.items.get(m.item))).length;
      sc-=8*taN;
    }
    return W*sc;
  }
  /* Tỉ lệ Tâm Pháp : Chiến Pháp trên ô đang thông (611 hbRatioPenalty) */
  function ratioShare(manh,R){
    const Cc=C();let tam=0,dau=0,pk=0,bv=0;
    for(let i=0;i<(manh||[]).length;i++){
      const p=manh[i],rm=R?.manh?.[i];if(!rm||!rm.thong)continue;
      const id=p?.m?.item||p?.item;const it=Cc.items.get(id);if(!it)continue;
      const cells=A(p.cells).length||A(rm.o).length||1;
      const cls=pieceCls(it);
      if(cls==='tam')tam+=cells;else if(cls==='dau')dau+=cells;else if(cls==='pk')pk+=cells;else bv+=cells;
    }
    const chien=dau+pk+bv,tot=tam+chien;
    return{tam,dau,pk,bv,chien,tot,pct:tot?tam/tot:0};
  }
  function ratioPenalty(manh,R){
    const t=S.pref?.ratioTarget;if(t==null||t===''||Number.isNaN(Number(t)))return 0;
    const target=Number(t);if(!(target>=0&&target<=1))return 0;
    const sh=ratioShare(manh,R);if(!sh.tot)return 0;
    /* HB_RATIO_W=22 mỗi ô lệch */
    return 22*Math.abs(sh.tam-target*sh.tot);
  }
  const ELEMENT_ROOT={loi:'moc',phong:'moc',bang:'thuy'};
  const rootElement=h=>ELEMENT_ROOT[h]||h;
  function itemElements(it){const hs=A(it?.he);return hs.length?hs.map(rootElement):['vo_sac']}
  function itemAlignment(it){
    if(!it)return'chinh';
    if(typeof isTa==='function'&&isTa(it))return'ta';
    const raw=[...A(it?.tag),...A(it?.tran_phai)].map(String);
    return raw.some(x=>['ma','nghich','quy','thi','ta','ta_dao','doc','hop_hoan'].includes(x))?'ta':'chinh';
  }
  function chosenElements(){
    const p=S.pref||{},subs=A(p.subs).filter(x=>x&&x!=='none'&&x!==p.mainElement).slice(0,5);
    return{main:p.mainElement||'auto',subs};
  }
  function preferenceScore(manh,mode){const p=S.pref||{},tags=BUILD_TAGS[p.school]||[],chosen=chosenElements(),Cc=C();let z=0;for(const q of manh){const it=Cc.items.get(q?.m?.item||q?.item);if(!it)continue;const raw=[...A(it.tag),...A(it.tran_phai)],hs=itemElements(it);if(tags.some(t=>raw.includes(t)))z+=mode==='danh'?85:mode==='tu'?45:60;if(chosen.main!=='auto'&&hs.includes(chosen.main))z+=mode==='danh'?18:12;for(const [i,h]of chosen.subs.entries())if(hs.includes(h))z+=Math.max(2,8-i);const align=itemAlignment(it);if(p.alignment&&p.alignment!=='auto')z+=align===p.alignment?14:-18}return z}
  function schoolStats(manh){const school=S.pref?.school||'tu_do';if(school==='tu_do')return{main:school,total:manh.length,matched:manh.length,need:0,deficit:0};let total=0,matched=0;for(const q of manh){const it=C().items.get(q?.m?.item||q?.item);if(!it)continue;total++;const tags=BUILD_TAGS[school]||[],raw=[...A(it.tag),...A(it.tran_phai)];if(tags.some(t=>raw.includes(t)))matched++}const need=total?Math.floor(total/2)+1:0;return{main:school,total,matched,need,deficit:Math.max(0,need-matched)}}
  function schoolDominanceScore(manh){const x=schoolStats(manh);return x.main==='tu_do'||x.total<2?0:x.deficit?-1e9*x.deficit:1200*x.matched}
  function ruleAudit(nv,R){const pieces=[];for(let i=0;i<A(nv.kinhMach?.manh).length;i++){const m=nv.kinhMach.manh[i],it=C().items.get(m.item),rm=A(R.manh)[i];if(!it)continue;pieces.push({id:m.item,name:it.ten,alignment:itemAlignment(it),elements:itemElements(it),connected:Boolean(rm?.thong),color:rm?.mau??1,generation:rm?.sinhKhac??1,intrinsic:rm?.noiTai??1,route:rm?.kinhLo??1,acupoint:rm?.huyet??1,isEvil:isTa(it)})}return{pieces,dead:pieces.filter(x=>!x.connected).length,evilActive:pieces.filter(x=>x.isEvil&&x.connected).length,evilTotal:pieces.filter(x=>x.isEvil).length}}
  function meridianQuality(R,P,mode){const live=(R.manh||[]).filter(Boolean),dead=live.filter(x=>!x.thong).length,connected=live.length-dead,heSo=live.reduce((a,x)=>a+(x.heSo||0),0),huyet=live.filter(x=>(x.huyet||1)>1).length,nghich=R.diemNghich||0,ll=P.linhLucMoiLuot||0,maxll=P.linhLucToiDa||ll*3,costs=(P.chieu||[]).filter(x=>x.dang&&x.phi>0).map(x=>x.phi),minCost=costs.length?Math.min(...costs):0,maxCost=costs.length?Math.max(...costs):0,castReady=!minCost||ll>=minCost,burstReady=!maxCost||maxll>=maxCost;let score=connected*3-dead*200000-nghich*(mode==='pha'?240:mode==='tu'?70:10);if(mode==='danh')score+=ll*4+(castReady?20:-300)+(burstReady?12:-120);return{score,dead,connected,heSo,huyet,nghich,ll,maxll,minCost,maxCost,castReady,burstReady}}
  function meridianAudit(nv,R,P){const Cc=C(),roles={tam:0,dau:0,phap:0,bao:0},pieces=[];for(let i=0;i<(nv.kinhMach.manh||[]).length;i++){const m=nv.kinhMach.manh[i],it=Cc.items.get(m.item),rm=(R.manh||[])[i];if(!it)continue;let role='Khác';if(it.loai==='cong_phap'){if(it.chieu){roles.dau++;role='Đấu pháp'}else{roles.tam++;role='Tâm pháp'}}else if(it.loai==='phap_khi'){if(it.chieu){roles.phap++;role='Pháp khí'}else{roles.bao++;role='Bảo vật'}}pieces.push({id:m.item,ten:it.ten,role,thong:!!rm?.thong,heSo:rm?.heSo||0,huyet:(rm?.huyet||1)>1,kinhLo:rm?.kinhLo||1,mau:rm?.mau||1,sinhKhac:rm?.sinhKhac||1,noiTai:rm?.noiTai||1})}return{roles,pieces,...meridianQuality(R,P,'danh')}}
  function makeEval(nv0,enemies,mode){const K=S.core,c=C(),cache=new Map();return manh=>{const key=mode+'|'+manh.map(p=>p.key).sort().join('|');if(cache.has(key))return cache.get(key);const nv=clone(nv0);nv.kinhMach.manh=manh.map(p=>({...p.m}));const R=K.Rt(nv,c),P=K.Vr(nv,c),mq=meridianQuality(R,P,mode),rules=ruleAudit(nv,R);let fightScore=0,wins=0;for(const{E}of enemies){const r=fight(P,E),hp=Math.max(0,Math.min(1,(r.khiHuyetThapNhat||0)/Math.max(1,P.khiHuyetToiDa))),dealt=Math.min(1,(r.stTa||0)*Math.max(1,r.nHiep||1)/Math.max(1,E.khiHuyetToiDa));if(r.thang){wins++;fightScore+=100+30*hp+50/Math.max(1,r.nHiep||1)}else fightScore+=45*dealt}const toc=R.biDong?.toc_do||0,dp=R.biDong?.dot_pha||0,ktm=R.biDong?.khang_tam_ma||0,nghich=mq.nghich||0,dead=rules.dead||0;let score=-dead*1e12;if(mode==='danh')score+=fightScore+mq.score+toc*120+dp*80-nghich*35;else if(mode==='tu')score+=fightScore*.08+toc*2500+dp*1800+ktm*420+mq.connected*25-nghich*260;else{const combat=Math.max(0,fightScore),cult=Math.max(0,toc*2200+dp*1200+ktm*240),floorPenalty=(wins<Math.max(1,Math.floor(enemies.length*.35))?-2e5:0)+(toc<=0?-15000:0);score+=combat*.55+cult*.45+mq.score+floorPenalty-nghich*110}score+=preferenceScore(manh,mode)+schoolDominanceScore(manh)+pathScore(manh,R,nv)-ratioPenalty(manh,R);const pi=pathInfo(manh,R,nv),share=ratioShare(manh,R);const out={s:score,wins,P,R,mq,rules,audit:meridianAudit(nv,R,P),school:schoolStats(manh),path:pi,share,enemyCount:enemies.length};cache.set(key,out);return out}}
  function buildCandidates(nv0) {
    const K = S.core, c = C();
    const school=S.pref?.school||'tu_do',pw=Number(S.pref?.pathWeight??2),strict=school!=='tu_do'&&pw>=2;
    const pool = Object.keys(nv0.tuiDo).filter((id) => {
      const it = c.items.get(id);
      if(!(it && (it.loai === 'cong_phap' || it.loai === 'phap_khi') && it.hinh && (it.canh_gioi ?? 0) <= nv0.canhGioi))return false;
      if(!strict)return true;
      /* huuhoang strict: giữ đồ khớp phái; chính đạo loại tà; luôn giữ tâm pháp (nối mạch) */
      if(schoolMatchItem(school,it))return true;
      if(!TA_SCHOOLS.includes(school)&&isTa(it))return false;
      return it.loai==='cong_phap'&&!it.chieu;
    });
    const g = K.xo(c, nv0), cand = {};
    for (const id of pool) {
      const it = c.items.get(id), seen = new Set(); cand[id] = [];
      for (let xoay = 0; xoay < 4; xoay++) for (let y = 0; y < g.cao; y++) for (let x = 0; x < g.rong; x++) {
        const m = { item: id, x, y, xoay };
        let err; try { err = K.Jh(nv0, c, m); } catch (e) { err = 'x'; }
        if (err) continue;
        const cells = K.al(g, m, it); if (!cells) continue;
        const key = id + ':' + [...cells].sort((a, b) => a - b).join(',');
        if (seen.has(key)) continue; seen.add(key);
        cand[id].push({ m, cells, key });
      }
    }
    return { cand, g };
  }

  // Xếp tham lam nhanh (giống nút tự đặt của game): lần lượt đặt món + vị trí làm tăng điểm nhiều nhất.
  async function greedy(nv0, mode) {
    const K = S.core, c = C(), { cand } = buildCandidates(nv0);
    const quick = (manh) => {
      const nv = clone(nv0); nv.kinhMach.manh = manh.map((p) => ({ ...p.m }));
      const R = K.Rt(nv, c);
      const uy = (R.chieu || []).reduce((a, x) => a + (x.uyLuc || x.uy || 0) / 10, 0);
      const toc = R.biDong.toc_do || 0, dp = R.biDong.dot_pha || 0;
      const w=mode==='tu'?[.35,190,120,.15]:mode==='can'?[1.05,90,55,.8]:[1.8,4,2,1.4];
      const thongAll = R.manh.every((m) => !m || m.thong);
      const P=K.Vr(nv,c),mq=meridianQuality(R,P,mode);if(mode==='can')return !thongAll?-1e15:w[0]*R.linhLuc+w[1]*toc+w[2]*dp+w[3]*uy+mq.score-mq.nghich*110+preferenceScore(manh,mode)+schoolDominanceScore(manh);return w[0]*R.linhLuc+w[1]*toc+w[2]*dp+w[3]*uy+mq.score+(thongAll?0:-1e9)+preferenceScore(manh,mode)+schoolDominanceScore(manh);
    };
    let cur = [], curS = quick(cur);
    for (let round = 0; round < 40; round++) {
      let best = null;
      const used = new Set(cur.flatMap((p) => p.cells));
      for (const id of Object.keys(cand)) {
        if (cur.some((p) => p.m.item === id)) continue;
        for (const cnd of cand[id]) {
          if (cnd.cells.some((x) => used.has(x))) continue;
          const v = quick([...cur, cnd]);
          if (!best || v > best.v) best = { v, cnd };
        }
      }
      if (!best || best.v <= curS + 1e-9) break;
      cur.push(best.cnd); curS = best.v;
      if (round % 3 === 0) await sleep0();
    }
    return cur.map((p) => ({ ...p.m }));
  }

  async function anneal({ nv0, mode, iters, init, onProg, label }) {
    const enemies = benchEnemies(nv0.canhGioi, nv0.tieuCanhGioi || 0);
    const ev = makeEval(nv0, enemies, mode);
    const { cand } = buildCandidates(nv0);
    const ids = Object.keys(cand).filter((k) => cand[k].length);
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const overlaps = (manh, c, skip = -1) => { const used = new Set(); manh.forEach((p, i) => { if (i !== skip) p.cells.forEach((x) => used.add(x)); }); return c.cells.some((x) => used.has(x)); };
    let cur = [];
    if (init) for (const m of init) { const c = (cand[m.item] || []).find((c) => c.m.x === m.x && c.m.y === m.y && c.m.xoay === m.xoay); if (c && !overlaps(cur, c)) cur.push(c); }
    let curS = ev(cur).s, best = cur, bestS = curS;
    const T0 = init && init.length ? 10 : 40;
    for (let it = 0; it < iters; it++) {
      if (S.abort) break;
      if (it % 4 === 0) { onProg && onProg(it / iters, label); await sleep0(); }
      const T = Math.max(0.4, T0 * (1 - it / iters));
      const next = cur.slice(); const r = rnd();
      const free = () => ids.filter((id) => !next.some((p) => p.m.item === id));
      if (r < 0.4 || next.length === 0) { const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c)) continue; next.push(c); }
      else if (r < 0.6) next.splice(Math.floor(rnd() * next.length), 1);
      else if (r < 0.9) { const i = Math.floor(rnd() * next.length); const id = next[i].m.item; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c, i)) continue; next[i] = c; }
      else { const i = Math.floor(rnd() * next.length); const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c, i)) continue; next[i] = c; }
      const e = ev(next);
      if (e.s >= curS || rnd() < Math.exp((e.s - curS) / T)) { cur = next; curS = e.s; if (e.s > bestS) { best = next; bestS = e.s; } }
    }
    const e = ev(best);
    return{manh:best.map(p=>({...p.m})),score:e.s,wins:e.wins,n:enemies.length,P:e.P,R:e.R,mq:e.mq,audit:e.audit,school:e.school,path:e.path,rules:e.rules,share:e.share};
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
    return{manh:clone(nv.kinhMach.manh),score:e.s,wins:e.wins,n:enemies.length,P:e.P,R:e.R,mq:e.mq,audit:e.audit,school:e.school,path:e.path,rules:e.rules,share:e.share};
  }

  // ───────────────────────── 5. Vẽ kinh mạch ─────────────────────────
  const BASE = { thuy: ['#3f6fb5', '#5a8fd6', '#2c5592', '#6f9fd0'], bang: ['#5fb8c9', '#86cfdc', '#3e9db0'], vo_sac: ['#7d7a76', '#9a958e', '#5f5c58'], hoa: ['#c0392b', '#d9622b', '#a8321f'], tho: ['#8a6a2e', '#a07a3a', '#6e5524'], kim: ['#c9a227', '#8f7a2a', '#e0b84a', '#a8892c', '#d4a017'], moc: ['#3f8f4a', '#5aa865', '#2f6f38'], loi: ['#7a4fb5', '#9a6fd0'], phong: ['#3fa08f', '#5cbfae'] };
  const TINT = { thuy: '#cfdcef', bang: '#d3ecf0', vo_sac: '#dcd6cc', hoa: '#efc2b4', kim: '#f1e3b0', tho: '#e3d2b0', moc: '#cfe6c8', loi: '#ddd0ef', phong: '#cdebe5' };

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
    return `<img class="vk-img" src="${cv.toDataURL('image/png')}" alt="kinh mạch"><div class="vk-note">Chấm vàng = huyệt · 丹 = đan điền · × = ô tắc. Giữ tay lên ảnh để lưu.</div>${legend}`;
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
  async function optimizeOne(nv,mode,iters,onProg){await ensureCore();S.abort=false;const current=evalCurrent(nv,mode),nv0=clone(nv);nv0.kinhMach.manh=[];onProg?.(.01,'Xếp nền');const seed=await greedy(nv0,mode);const a=await anneal({nv0,mode,iters:Math.round(iters*.58),init:seed,onProg:f=>onProg?.(.04+f*.5,'Tối ưu')});const b=await anneal({nv0,mode,iters:Math.round(iters*.46),init:a.manh,onProg:f=>onProg?.(.54+f*.46,'Tinh chỉnh')});let best=stripDead(nv,[a,b].sort((x,y)=>y.score-x.score)[0],mode);if(current.score>=best.score&&!(current.R.manh||[]).some(x=>x&&!x.thong))best={...current,same:true};return{current,best,mode}}
  async function optimizeThree(pref,iters,onProg){S.pref=pref||{};S.abort=false;const nv=nvNow();if(S.pref.root&&S.pref.root!=='current'){/* linh căn là object runtime — không ghi đè bằng option UI giả */}if(S.pref.body&&S.pref.body!=='current'){if('theChat'in nv)nv.theChat=S.pref.body;else if('the_chat'in nv)nv.the_chat=S.pref.body;else nv.theChat=S.pref.body}const out={};for(const[i,mode]of['danh','tu','can'].entries()){out[mode]=await optimizeOne(nv,mode,iters,(f,l)=>onProg?.((i+f)/3,mode,l));if(S.abort)break}S.results=out;return out}
  function apply(mode,slot){const r=S.results?.[mode]?.best;return r?applyLayout(r.manh,slot):{ok:false,msg:'Chưa có kết quả.'}}
  function applyAll(){const n=(G().state.run.nhanVat.kinhMach.loadouts||[]).length||1;return[['danh',0],['tu',1],['can',2]].map(([m,i])=>i<n?apply(m,i):{ok:false,msg:`Chưa mở Bộ ${i+1}.`})}
  return{ensureCore,optimizeThree,apply,applyAll,stop:()=>S.abort=true,drawGrid,nvNow,get core(){return S.core},get results(){return S.results}};
})();

const p=document.createElement('section');p.id=ID;p.innerHTML=`<style>
/* ===== VKTool · cổ phong tối · mobile-first ===== */
#${ID}{
  position:fixed;inset:0;z-index:2147483647;width:100%;max-width:100%;height:100%;
  margin:0;background:#1a1612;color:#e6dcc8;
  border:0;border-radius:0;box-shadow:none;
  font:13px/1.35 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
  display:flex;flex-direction:column;overflow:hidden;
  -webkit-tap-highlight-color:transparent;
}
#${ID} *{box-sizing:border-box}
#${ID} button,#${ID} select,#${ID} input{font:inherit;color:inherit}
#${ID} button{
  border:1px solid #5c4a32;background:#2a221a;border-radius:6px;
  padding:6px 8px;cursor:pointer;line-height:1.2;min-height:32px;color:#e6dcc8;
}
#${ID} button:active{background:#352b22}
#${ID} .red{background:#8b2e24;color:#f5ebe0;border-color:#a33d32}
#${ID} .ghost{background:#241e18;border-color:#5c4a32;color:#d4c4a8}
#${ID} .danger{background:#6b1f1a;color:#f0d0c8;border-color:#8b2e24}
#${ID} select,#${ID} input[type="search"],#${ID} input:not([type]),#${ID} input[type="text"]{
  border:1px solid #5c4a32;background:#14110e;border-radius:6px;padding:6px 8px;
  min-height:32px;width:100%;color:#e6dcc8;
}
#${ID} select option{background:#1a1612;color:#e6dcc8}
#${ID} label{display:flex;flex-direction:column;gap:3px;font-size:11px;color:#a89878}

#${ID} header{
  display:flex;align-items:center;gap:6px;padding:6px 8px;
  background:#14110e;border-bottom:1px solid #3d3226;flex:none;
}
#${ID} .brand{flex:1;min-width:0}
#${ID} h2{margin:0;color:#d4a574;font-size:14px;font-weight:700;line-height:1.2}
#${ID} .brand>span{display:block;color:#8a7a62;font-size:11px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#${ID} .header-actions{display:flex;gap:4px;flex:none}
#${ID} .header-button{min-height:30px;padding:4px 8px;font-size:12px}

#${ID} .tabs{
  display:flex;gap:3px;padding:4px 6px 0;overflow-x:auto;overflow-y:hidden;
  min-height:0;background:#14110e;border-bottom:1px solid #3d3226;flex:none;
  -webkit-overflow-scrolling:touch;scrollbar-width:none;
}
#${ID} .tabs::-webkit-scrollbar{display:none}
#${ID} .tab{
  flex:0 0 auto;white-space:nowrap;border-radius:6px 6px 0 0;border:1px solid #3d3226;border-bottom:0;
  padding:5px 8px;min-height:28px;font-size:12px;background:#221c16;color:#b8a88c;
}
#${ID} .tab.on{background:#8b2e24;color:#f5ebe0;border-color:#a33d32}
#${ID} .tab.treasure-alert{position:relative}
#${ID} .tab.treasure-alert:after{
  content:'!';position:absolute;right:1px;top:0;width:12px;height:12px;border-radius:50%;
  background:#c45c4a;color:#1a1612;font:700 9px/12px Arial;text-align:center;
}

#${ID} .tools,#${ID} .item-tools{
  display:flex;gap:6px;align-items:center;flex-wrap:wrap;
  padding:6px 8px;border-bottom:1px solid #3d3226;background:#1e1914;flex:none;
}
#${ID} .sum{
  padding:4px 8px;color:#a89878;font-size:11px;line-height:1.3;
  border-bottom:1px solid #3d3226;background:#1e1914;flex:none;
}
#${ID} .head{display:none}

#${ID} .list{
  flex:1;overflow:auto;-webkit-overflow-scrolling:touch;
  padding:0 6px 8px;overscroll-behavior:contain;background:#1a1612;
}
#${ID} article{
  display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-items:start;
  padding:7px 2px;border-bottom:1px solid #2e261e;
}
#${ID} article>.travel{text-align:right;min-width:64px}
#${ID} article>.travel strong{display:block;font-size:12px;color:#d4a574}
#${ID} article>.travel span{display:block;font-size:10px;color:#8a7a62}
#${ID} article>div:last-child{
  grid-column:1/-1;display:flex;flex-wrap:wrap;gap:4px;
}
#${ID} article>div:last-child button{flex:1 1 auto;min-width:0;font-size:12px;padding:5px 6px;min-height:30px}
#${ID} .name{font-weight:700;font-size:13px;color:#f0e6d4;line-height:1.25}
#${ID} .sub{color:#9a8a72;font-size:11px;margin-top:2px;line-height:1.3}
#${ID} .gain{color:#8aab6a;font-size:11px;margin-top:2px}
#${ID} .risk{color:#d09080;font-size:11px;margin-top:2px}
#${ID} .tags{display:flex;flex-wrap:wrap;gap:3px;margin:3px 0}
#${ID} .tag{
  font-size:10px;border-radius:4px;padding:1px 5px;line-height:1.4;
  background:#2a221a;color:#c4b498;border:1px solid #4a3c2c;
}
#${ID} .tag.good{background:#1e2a18;color:#9ccc7a;border-color:#3d5a30}
#${ID} .tag.bad{background:#2a1816;color:#e09080;border-color:#5a3028}
#${ID} .tag.warn{background:#2a2416;color:#d4b060;border-color:#5a4a28}
#${ID} .safe{color:#7cb86a;font-weight:700}
#${ID} .fight{color:#d4a050;font-weight:700}
#${ID} .danger{color:#e07060;font-weight:700}

#${ID} .section-title{
  margin:8px 0 4px;padding:3px 0;font-size:11px;font-weight:700;
  color:#d4a574;border-bottom:1px solid #3d3226;letter-spacing:.02em;
}
#${ID} .section-card,#${ID} .build-card{
  display:block;padding:8px;margin:6px 0;border:1px solid #3d3226;
  border-radius:8px;background:#1e1914;
}
#${ID} .section-card .name,#${ID} .build-card .name{font-size:13px;margin-bottom:4px;color:#f0e6d4}
#${ID} .control-grid{
  display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0;
}
#${ID} .build-controls{
  display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0;
}
#${ID} .build-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
#${ID} .build-actions button,#${ID} .build-actions select{flex:1 1 40%;min-width:0}
#${ID} .build-progress{height:4px;background:#2a221a;border-radius:2px;margin:6px 0;overflow:hidden}
#${ID} .build-progress>i{display:block;height:100%;width:0;background:#8b2e24}
#${ID} .build-stats{
  display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:6px 0;text-align:center;
}
#${ID} .build-stats span{background:#241e18;border-radius:4px;padding:4px 2px;font-size:10px;color:#9a8a72;border:1px solid #3d3226}
#${ID} .build-stats b{display:block;font-size:12px;color:#e6dcc8;margin-top:1px}
#${ID} .build-grid{max-width:100%;height:auto;margin:4px 0;border-radius:4px;border:1px solid #3d3226}
#${ID} details{margin-top:4px}
#${ID} details>summary{
  cursor:pointer;font-size:11px;color:#a89878;padding:4px 0;list-style:none;
}
#${ID} details>summary::-webkit-details-marker{display:none}
#${ID} .option-row{
  display:flex;justify-content:space-between;gap:6px;padding:3px 0;
  border-top:1px dashed #2e261e;font-size:11px;color:#b8a88c;
}

#${ID} .item-search-row{display:flex;gap:4px;width:100%;align-items:center}
#${ID} .search-box{position:relative;flex:1;min-width:0}
#${ID} .search-box input{padding-right:28px}
#${ID} .search-clear{
  position:absolute;right:2px;top:50%;transform:translateY(-50%);
  border:0;background:transparent;min-height:28px;width:28px;padding:0;font-size:16px;color:#8a7a62;
}
#${ID} .filter-toggle{flex:none;font-size:12px}
#${ID} .active-filters{display:flex;flex-wrap:wrap;gap:3px;width:100%}
#${ID} .metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:4px 0}
#${ID} .metric-grid>div{background:#241e18;border-radius:4px;padding:5px 6px;font-size:11px;border:1px solid #3d3226;color:#a89878}
#${ID} .metric-grid b{display:block;font-size:13px;color:#e6dcc8}
#${ID} .empty-state{text-align:center;color:#8a7a62;padding:16px 8px;font-size:12px;border:1px dashed #3d3226;border-radius:8px;margin:8px 0}

#${ID} .bounty-group{margin:6px 0;border:1px solid #3d3226;border-radius:8px;background:#1e1914;overflow:hidden}
#${ID} .bounty-group>summary{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:8px;list-style:none;font-size:12px;color:#e6dcc8}
#${ID} .bounty-group>summary small{display:block;margin-top:2px;color:#8a7a62;font-weight:400;font-size:10px}
#${ID} .bounty-group-body{padding:0 8px 6px}
#${ID} .bounty-job{padding:6px 0;border-top:1px solid #2e261e;font-size:12px}
#${ID} .inline-actions{display:flex;flex-wrap:wrap;gap:4px}
#${ID} .inline-actions button{flex:1 1 auto;min-height:30px}

#${BID}{
  position:fixed;right:10px;bottom:10px;z-index:2147483647;
  width:48px;height:48px;border:1.5px solid #d4a574;border-radius:50%;
  background:#6b221c;color:#f5ebe0;box-shadow:0 3px 12px #000a;
  font:700 11px/1 Arial;padding:0;
}

#${ID} .list,#${ID} article,#${ID} .build-card,#${ID} .section-card,#${ID} .name,#${ID} .sub{min-width:0;max-width:100%}
#${ID} img,#${ID} svg,#${ID} canvas,#${ID} .build-grid{max-width:100%;height:auto}
#${ID} header{padding-top:max(6px,env(safe-area-inset-top));padding-left:max(8px,env(safe-area-inset-left));padding-right:max(8px,env(safe-area-inset-right))}
#${ID} .list{padding-bottom:max(8px,env(safe-area-inset-bottom));padding-left:max(6px,env(safe-area-inset-left));padding-right:max(6px,env(safe-area-inset-right))}
@media(max-width:480px){
  #${ID}{font-size:12px}
  #${ID} .control-grid,#${ID} .build-controls,#${ID} .metric-grid{grid-template-columns:1fr}
  #${ID} .build-stats{grid-template-columns:repeat(2,1fr)}
  #${ID} .tab{padding:4px 7px;font-size:11px}
  #${ID} article{grid-template-columns:1fr}
  #${ID} article>.travel{text-align:left}
}
@media(min-width:1100px) and (pointer:fine){
  #${ID}{
    left:50%;top:12px;right:auto;bottom:12px;
    width:min(820px,calc(100vw - 24px));height:auto;max-height:calc(100dvh - 24px);
    margin:0;transform:translateX(-50%);
    border:1px solid #5c4a32;border-radius:10px;
    box-shadow:0 8px 28px #000a;
  }
  #${ID} header{padding:7px 10px}
  #${ID} h2{font-size:15px}
  #${ID} .head{
    display:grid;grid-template-columns:1fr 72px 120px;gap:8px;
    padding:4px 8px;color:#d4a574;font-weight:700;font-size:11px;
    border-bottom:1px solid #3d3226;background:#14110e;
  }
  #${ID} article{grid-template-columns:1fr 72px 120px}
  #${ID} article>div:last-child{grid-column:auto;display:block}
  #${ID} article>div:last-child button{width:100%;margin-top:3px}
  #${ID} .control-grid,#${ID} .build-controls{grid-template-columns:repeat(3,1fr)}
  #${ID} .build-stats{grid-template-columns:repeat(6,1fr)}
  #${ID} .mobile-only{display:none}
}
@media(prefers-reduced-motion:reduce){
  #${ID} .tab.treasure-alert:after{animation:none}
}
.wide{display:none}
#${ID} .mobile-only{display:none}
</style><header><div class="brand"><h2>Vạn Kiếp Trợ Thủ <small style="font-size:10px;font-weight:700;padding:2px 5px;border:1px solid #b5a27f;border-radius:999px;vertical-align:middle">${BUILD}</small></h2><span>Theo dõi sự kiện, nhiệm vụ và vật phẩm</span></div><div class="header-actions"><button id="mobile-size" class="ghost header-button mobile-only" title="Đổi kích thước cửa sổ" aria-label="Đổi kích thước cửa sổ">Phóng</button><button id="hide" class="ghost header-button" title="Thu gọn cửa sổ" aria-label="Thu gọn trợ thủ">Ẩn</button></div></header><nav class="tabs"></nav><div class="tools item-tools" id="item-tools" style="display:none"><div class="item-search-row"><div class="search-box"><input id="item-search" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" aria-label="Tìm vật phẩm" placeholder="Nhập tên vật phẩm..."><button type="button" id="item-search-clear" class="search-clear" aria-label="Xóa từ khóa">×</button></div><button type="button" id="item-filter-toggle" class="filter-toggle" aria-expanded="false" aria-controls="item-filter-drawer">Bộ lọc <b id="filter-count">0</b></button></div><div class="active-filters" id="active-filters" aria-live="polite"></div><div class="item-filter-drawer" id="item-filter-drawer"><label>Nhóm<select id="item-type"><option value="all">Tất cả nhóm</option></select></label><label>Cấp độ<select id="item-grade"><option value="all">Tất cả cấp độ</option></select></label><label>Hệ<select id="item-element"><option value="all">Tất cả hệ</option></select></label><label>Trường phái<select id="item-school"><option value="all">Tất cả trường phái</option></select></label><div class="filter-actions"><button type="button" id="item-filter-reset" class="reset-filter">Xóa bộ lọc</button><button type="button" id="item-filter-done" class="red filter-done">Xong</button></div></div></div><div class="sum"></div><div class="head"><span>Thông tin</span><span>Hành trình</span><span>Đánh giá & thao tác</span></div><div class="list"></div>`;document.documentElement.appendChild(p);const b=document.createElement('button');b.id=BID;b.textContent='Mở trợ thủ';b.setAttribute('aria-label','Mở Vạn Kiếp Trợ Thủ');b.style.display='none';document.documentElement.appendChild(b);
const defs=[['maptasks','Nhiệm vụ bản đồ'],['treasure','Dị bảo'],['breakthrough','Đột phá & thọ'],['bounties','Treo thưởng'],['people','Nhân mạch'],['sect','Tông môn'],['items','Vật phẩm'],['build','Build & Kinh mạch']],nav=p.querySelector('.tabs'),list=p.querySelector('.list'),sum=p.querySelector('.sum'),itemSearch=p.querySelector('#item-search'),itemType=p.querySelector('#item-type'),itemGrade=p.querySelector('#item-grade'),itemElement=p.querySelector('#item-element'),itemSchool=p.querySelector('#item-school'),itemTools=p.querySelector('#item-tools'),itemFilterToggle=p.querySelector('#item-filter-toggle'),itemSearchClear=p.querySelector('#item-search-clear'),itemFilterDrawer=p.querySelector('#item-filter-drawer'),filterCount=p.querySelector('#filter-count'),activeFilters=p.querySelector('#active-filters'),head=p.querySelector('.head');let tab=sessionStorage.getItem('veh3-tab')||'maptasks',rows=[],places=[],randoms=[],quests=[],people=[],peopleQuery='',peopleLife='all',peopleGender='all',peopleWhere='all',peopleRelation='all',sectQuery='',sectState='active',sectTier='all',refreshTimer=null,refreshing=false,refreshQueued=false;if(!defs.some(x=>x[0]===tab))tab='maptasks';nav.innerHTML=defs.map(([x,n])=>`<button class="tab ${x===tab?'on':''}" data-t="${x}">${n}</button>`).join('');itemType.innerHTML+=[...new Set([...C.items.values()].map(x=>x.loai||'khac'))].sort().map(x=>`<option value="${E(x)}">${E(TYPE_NAMES[x]||x)}</option>`).join('');itemGrade.innerHTML+=[...new Set([...C.items.values()].map(x=>x.pham_cap).filter(N))].sort((a,b)=>a-b).map(x=>`<option value="${x}">${E(GRADE_NAMES[x]||('Cấp '+x))}</option>`).join('');itemElement.innerHTML+=[...new Set([...C.items.values()].flatMap(x=>A(x.he)))].sort().map(x=>`<option value="${E(x)}">${E(ELEMENT_NAMES[x]||x)}</option>`).join('');itemSchool.innerHTML+=Object.entries(SCHOOL_GROUPS).filter(([k])=>[...C.items.values()].some(r=>itemSchoolGroups(r).includes(k))).map(([k,v])=>`<option value="${E(k)}">${E(v.ten)}</option>`).join('');function updateTabCounts(){const activeTreasures=rows.filter(r=>r.groups?.has?.('treasure')&&(r.source==='Dị bảo đang xuất hiện'||r.status==='active'||r.active?.length));const counts={maptasks:mapTaskRecords().length,treasure:rows.filter(r=>r.groups.has('treasure')).length,breakthrough:1,bounties:quests.filter(r=>r.source==='Treo thưởng'&&r.status==='active').length,people:people.length,sect:sectDirectoryRecords().length,items:C.items.size,build:3};nav.querySelectorAll('[data-t]').forEach(x=>{const d=defs.find(y=>y[0]===x.dataset.t);x.innerHTML=`<span>${E(d?.[1]||x.dataset.t)}</span><b>${F(counts[x.dataset.t]||0)}</b>`;const alert=x.dataset.t==='treasure'&&activeTreasures.length>0;x.classList.toggle('treasure-alert',alert);if(alert){x.title=`Có ${activeTreasures.length} Dị Bảo đang xuất hiện`;x.setAttribute('aria-label',x.title)}else{x.removeAttribute('title');x.removeAttribute('aria-label')}})}
function strength(r){if(!r.meta.combat.length)return['Không phải đánh','safe'];const q=preview(r);if(q){if(q.tuTran)return['Dự kiến tử trận','danger'];if(q.thang)return[`Thắng dự kiến${N(q.nHiep)?` · ${q.nHiep} hiệp`:''}`,'safe'];return['Thua dự kiến','danger']}const foes=[...new Set(r.meta.combat.map(x=>x.ten))].slice(0,2).join(', ');return[`${r.meta.mandatory?'Bắt buộc':'Có nhánh'} chiến đấu${foes?` · ${foes}`:''}`,'fight']}
function sorter(a,b){const ac=Boolean(a.x.catalog),bc=Boolean(b.x.catalog);if(ac!==bc)return ac?1:-1;const af=a.remain===null||a.remain>0&&a.travel<=a.remain,bf=b.remain===null||b.remain>0&&b.travel<=b.remain;if(af!==bf)return af?-1:1;return a.travel-b.travel||a.dist-b.dist||((a.remain??Infinity)-(b.remain??Infinity))}
function compactItemSources(sources){const groups=new Map();for(const source of sources){const text=sourceText(source),cut=text.indexOf(':'),label=cut>=0?text.slice(0,cut):'Nguồn',name=cut>=0?text.slice(cut+1).trim():text;if(!groups.has(label))groups.set(label,new Set());groups.get(label).add(name)}return[...groups].map(([label,names])=>`${label}: ${[...names].join(' · ')}`)}
function renderItems(){const q=norm(itemSearch.value);itemSearchClear.classList.toggle('show',!!q);const type=itemType.value,grade=itemGrade.value,element=itemElement.value,school=itemSchool.value,chosen=[[itemType,'Nhóm'],[itemGrade,'Cấp'],[itemElement,'Hệ'],[itemSchool,'Phái']].filter(([x])=>x.value!=='all');filterCount.textContent=chosen.length;filterCount.style.display=chosen.length?'inline-flex':'none';activeFilters.innerHTML=chosen.map(([x,n])=>`<span>${E(n)}: ${E(x.selectedOptions[0]?.textContent||'')}</span>`).join('');if(!q&&!chosen.length){sum.textContent='Nhập tên, công dụng hoặc chọn bộ lọc để bắt đầu tìm';list.innerHTML='<p class="empty-items">Có thể tìm không dấu: thọ, đột phá, chữa thương, khai thông, truyền tống…</p>';return}const matched=itemIndex.filter(x=>(type==='all'||(x.record.loai||'khac')===type)&&(grade==='all'||String(x.record.pham_cap)===grade)&&(element==='all'||A(x.record.he).includes(element))&&(school==='all'||itemSchoolGroups(x.record).includes(school))&&(!q||x.search.includes(q)));matched.sort((a,b)=>(Number(itemInventoryIndex.has(b.id))-Number(itemInventoryIndex.has(a.id)))||ITEM_CATEGORY_ORDER.indexOf(a.category)-ITEM_CATEGORY_ORDER.indexOf(b.category)||T(a.record.ten).localeCompare(T(b.record.ten),'vi'));sum.textContent=`${matched.length}/${C.items.size} vật phẩm · tìm theo dữ liệu công dụng trong game`;const groups=new Map();for(const x of matched){if(!groups.has(x.category))groups.set(x.category,[]);groups.get(x.category).push(x)}const cats=[...groups.keys()].sort((a,b)=>ITEM_CATEGORY_ORDER.indexOf(a)-ITEM_CATEGORY_ORDER.indexOf(b));list.innerHTML=cats.map(cat=>`<details class="item-group" ${q?'open':''} data-cat="${E(cat)}"><summary>${E(cat)} · ${groups.get(cat).length}</summary><div class="item-group-body"></div></details>`).join('')||'<p>Không tìm thấy vật phẩm phù hợp.</p>';list.querySelectorAll('.item-group').forEach(el=>{const fill=()=>{if(el.dataset.done)return;el.dataset.done='1';const xs=groups.get(el.dataset.cat)||[];el.querySelector('.item-group-body').innerHTML=xs.slice(0,80).map(x=>{const r=x.record,places=itemInventoryIndex.get(x.id)||[],owned=places.filter(p=>p.kind==='owned'),learned=places.filter(p=>p.kind==='learned'),market=places.filter(p=>p.kind==='market'),pending=places.filter(p=>p.kind==='pending');return`<article class="item-card" data-item="${E(x.id)}"><div class="name">${E(r.ten||x.id)}</div><div class="tags"><span class="tag">${E(TYPE_NAMES[r.loai]||r.loai||'Khác')}</span><span class="tag grade-${E(r.pham_cap??0)}">${E(GRADE_NAMES[r.pham_cap]||('Cấp '+(r.pham_cap??'?')))}</span><span class="tag">Cảnh giới ${E(r.canh_gioi??'?')}</span>${A(r.he).map(h=>`<span class="tag">Hệ ${E(ELEMENT_NAMES[h]||h)}</span>`).join('')}${itemSchoolGroups(r).map(m=>`<span class="tag">${E(SCHOOL_GROUPS[m]?.ten||m)}</span>`).join('')}${owned.length?'<span class="tag good">Đang sở hữu</span>':learned.length?'<span class="tag good">Đã lĩnh ngộ</span>':''}</div>${x.game.map(t=>`<div class="sub">${E(t)}</div>`).join('')}${r.mo_ta?`<div class="sub">${E(r.mo_ta)}</div>`:''}${r.goi_y?`<div class="sub"><strong>Gợi ý:</strong> ${E(r.goi_y)}</div>`:''}${x.notes.length?`<div class="risk">${E(x.notes.join(' · '))}</div>`:''}<div class="gain"><strong>Đang có:</strong> ${owned.length?owned.map(p=>`${E(p.label)} ×${F(p.qty)}`).join(' · '):'Không có'}${learned.length?' · '+learned.map(p=>E(p.label)).join(' · '):''}</div>${market.length?`<div class="sub"><strong>Đấu giá:</strong> ${market.map(p=>E(p.label)).join(' · ')}</div>`:''}${pending.length?`<div class="sub"><strong>Đơn đã đặt:</strong> ${pending.map(p=>E(p.label)).join(' · ')}</div>`:''}<div class="inline-actions"><button type="button" class="red add-item-act" data-id="${E(x.id)}">Thêm vào túi</button></div><details><summary class="item-source-act" data-id="${E(x.id)}">Nguồn nhận (sự kiện, rơi, cửa hàng…)</summary><div class="item-source-box sub">Chạm để quét nguồn. Việc này không chạy trong lúc nhập tìm kiếm.</div></details></article>`}).join('')+(xs.length>80?`<p>Hiển thị 80/${xs.length} mục trong nhóm. Hãy nhập thêm từ khóa.</p>`:'')};if(el.open)fill();el.addEventListener('toggle',()=>el.open&&fill())})}
function mapRewardHint(enc){if(!enc)return[];const out=new Set(),s=JSON.stringify([enc.choices,enc.scenes,enc.effects]);if(/"linh_thach"/.test(s))out.add('Linh thạch');if(/"tu_vi"/.test(s))out.add('Tu vi');if(/"cong_hien"/.test(s))out.add('Cống hiến');for(const m of s.matchAll(/"(?:add_item|roi_quy)"\s*:\s*(?:\{"id"\s*:\s*)?"(item\.[a-z0-9_]+)"/g))out.add(C.items.get(m[1])?.ten||m[1]);return[...out].slice(0,4)}
function slotDanger(slot){let info;try{info=W.info(slot)}catch{return{rank:1,label:'Chưa rõ'}}const self=Number(Runtime.character()?.canhGioi??0),base=Number(info?.capNen??info?.canhGioi??self),d=base-self;if(d>=2)return{rank:3,label:'Tử địa'};if(d>=1)return{rank:2,label:'Nguy hiểm'};if(d<=-1)return{rank:0,label:'An toàn'};return{rank:1,label:'Ngang sức'}}
const SAFE_STEP=29.1;let routeOverlay=null,lastSafeRoute=null;
function routeSafe(target,opts={}){
  const start=Runtime.currentSlot();
  if(!start||!target||!W.hasSlot(start)||!W.hasSlot(target))return null;
  if(start===target){
    const s=W.slot(start);if(!s)return null;
    return{path:[s],len:0,target,same:true};
  }
  const preferLand=opts.preferLand!==false;
  let land=null;try{land=W.tho(start)}catch{}
  const allSlots=A(W.slots).filter(s=>s&&s.id!=null&&!s.an);
  const buildNodes=(sameLand)=>{
    if(!sameLand||land==null)return allSlots.slice();
    return allSlots.filter(s=>{try{return W.tho(s.id)===land}catch{return true}});
  };
  const dijkstra=(nodes,step)=>{
    const idx=new Map();
    for(let i=0;i<nodes.length;i++)idx.set(nodes[i].id,i);
    if(!idx.has(start)||!idx.has(target))return null;
    const n=nodes.length,dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),done=new Uint8Array(n);
    const si=idx.get(start),ti=idx.get(target);dist[si]=0;
    for(;;){
      let u=-1,best=Infinity;
      for(let i=0;i<n;i++)if(!done[i]&&dist[i]<best){best=dist[i];u=i}
      if(u<0||u===ti)break;done[u]=1;const a=nodes[u];
      for(let v=0;v<n;v++){
        if(done[v])continue;
        const d=Math.hypot(a.x-nodes[v].x,a.y-nodes[v].y);
        if(d>step||d<=0)continue;
        const danger=slotDanger(nodes[v].id).rank;
        const w=d+2+(v===ti?0:danger===3?40:danger===2?12:0);
        if(dist[u]+w<dist[v]){dist[v]=dist[u]+w;prev[v]=u}
      }
    }
    if(!Number.isFinite(dist[ti]))return null;
    const path=[];for(let v=ti;v>=0;v=prev[v]){path.push(nodes[v]);if(v===si)break}
    path.reverse();
    if(path[0]?.id!==start||path[path.length-1]?.id!==target)return null;
    let len=0;for(let i=1;i<path.length;i++)len+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);
    return{path,len,target};
  };
  /* Thử nhiều bước + ưu tiên cùng vùng đất, rồi nới lỏng nếu không nối được */
  const steps=[SAFE_STEP,42,60,90,130,200];
  for(const sameLand of (preferLand?[true,false]:[false])){
    const nodes=buildNodes(sameLand);
    if(nodes.length<2)continue;
    for(const step of steps){
      const hit=dijkstra(nodes,step);
      if(hit)return hit;
    }
  }
  /* Fallback cuối: đường thẳng qua vài điểm trung gian trên cùng tập slot gần nhất */
  try{
    const a=W.slot(start),b=W.slot(target);if(!a||!b)return null;
    const mid=[];
    const samples=6;
    for(let i=1;i<samples;i++){
      const t=i/samples,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
      let best=null,bd=Infinity;
      for(const s of allSlots){if(s.id===start||s.id===target)continue;const d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=s}}
      if(best&&(!mid.length||mid[mid.length-1].id!==best.id))mid.push(best);
    }
    const path=[a,...mid,b];
    let len=0;for(let i=1;i<path.length;i++)len+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);
    return{path,len,target,approx:true};
  }catch{return null}
}

function mapWorldRoot(){const m=window.map,cam=m?.cam;return m?.app?.stage?.children?.find?.(x=>x?.scale&&x?.position&&Math.abs((x.scale.x||0)-(cam?.scale||0))<1e-6)||null}
let routeOverlayCleanup=null,activeSafeRoute=null,routeAtTarget=false,routeEncounterSeen=false;
function clearRouteDrawing(){try{routeOverlayCleanup?.()}catch{}routeOverlayCleanup=null;try{routeOverlay?.parent?.removeChild?.(routeOverlay);routeOverlay?.destroy?.({children:true})}catch{}routeOverlay=null;document.getElementById('vk-route-svg')?.remove()}
function clearRouteOverlay(){clearRouteDrawing();activeSafeRoute=null;lastSafeRoute=null;routeAtTarget=false;routeEncounterSeen=false;sessionStorage.removeItem('vk-safe-route')}
function routeUiBusy(run=Runtime.run()){return Boolean(run?.active||run?.tran||run?.bienCo)}
function drawRouteSvg(route){
  const m=window.map,root=mapWorldRoot(),cam=m?.cam;if(!root||!cam||!route?.path?.length)return false;
  let Graphics=window.PIXI?.Graphics;
  if(!Graphics){const stack=[...(m?.app?.stage?.children||[])];while(stack.length&&!Graphics){const x=stack.pop();if(x?.lineStyle&&x?.moveTo&&x?.lineTo||x?.stroke&&x?.moveTo)Graphics=x.constructor;stack.push(...(x?.children||[]))}}
  if(!Graphics)return false;
  let gr;try{gr=new Graphics()}catch{return false}
  gr.name='vk-safe-route-map-only';gr.eventMode='none';gr.interactive=false;gr.alpha=1;
  try{root.addChild(gr)}catch{return false}
  routeOverlay=gr;
  const t0=performance.now();
  const COL_LINE=0xffffff, COL_LINE_EDGE=0x1c1917, COL_STOP=0xef4444, COL_DEST=0xf97316;
  const seg=(x1,y1,x2,y2,w,color,alpha)=>{
    try{
      if(typeof gr.stroke==='function'&&typeof gr.setStrokeStyle==='function'){
        gr.moveTo(x1,y1);gr.lineTo(x2,y2);gr.stroke({width:w,color,alpha,pixelLine:false,cap:'round',join:'round'});
      }else if(typeof gr.lineStyle==='function'){
        gr.lineStyle(w,color,alpha,1,true);gr.moveTo(x1,y1);gr.lineTo(x2,y2);
      }else if(typeof gr.stroke==='function'){
        gr.moveTo(x1,y1);gr.lineTo(x2,y2);gr.stroke({width:w,color,alpha});
      }
    }catch{}
  };
  const ring=(x,y,r,w,color,alpha)=>{
    if(alpha<=0.01||r<=0)return;
    try{
      if(typeof gr.stroke==='function'&&typeof gr.circle==='function'){
        gr.circle(x,y,r);gr.stroke({width:w,color,alpha});
      }else if(typeof gr.lineStyle==='function'){
        gr.lineStyle(w,color,alpha);gr.beginFill(color,0);gr.drawCircle(x,y,r);gr.endFill();
      }
    }catch{}
  };
  const softGlow=(x,y,r,color,alpha)=>{
    /* đĩa fill mờ — tạo cảm giác glow mạnh hơn chỉ có stroke */
    if(alpha<=0.01||r<=0)return;
    try{
      if(typeof gr.circle==='function'&&typeof gr.fill==='function'){
        gr.circle(x,y,r);gr.fill({color,alpha});
      }else{
        gr.lineStyle?.(0,color,0);gr.beginFill?.(color,alpha);gr.drawCircle?.(x,y,r);gr.endFill?.();
      }
    }catch{}
  };
  const dot=(x,y,r,color,alpha)=>{
    try{
      if(typeof gr.circle==='function'&&typeof gr.fill==='function'){
        gr.circle(x,y,r);gr.fill({color,alpha});
      }else{
        gr.lineStyle?.(0,color,0);gr.beginFill?.(color,alpha);gr.drawCircle?.(x,y,r);gr.endFill?.();
      }
    }catch{}
  };
  const render=()=>{
    if(!gr?.parent||routeUiBusy())return;
    const scale=Math.max(.001,Number(cam.scale)||1);
    const path=route.path;if(!path?.length)return;
    const pulse=((performance.now()-t0)%1200)/1200;
    try{gr.clear?.()}catch{try{gr.clear()}catch{}}
    try{
      const lw=1.05/scale, edge=1.7/scale, dash=16/scale, gap=8/scale;
      for(let i=1;i<path.length;i++){
        const a=path[i-1],z=path[i],dx=z.x-a.x,dy=z.y-a.y,len=Math.hypot(dx,dy);if(len<=0)continue;
        for(let d=0;d<len;d+=dash+gap){
          const d2=Math.min(len,d+dash);
          const x1=a.x+dx*d/len,y1=a.y+dy*d/len,x2=a.x+dx*d2/len,y2=a.y+dy*d2/len;
          seg(x1,y1,x2,y2,edge,COL_LINE_EDGE,.28);
          seg(x1,y1,x2,y2,lw,COL_LINE,.92);
        }
      }
      const marks=[];
      const minGap=28;
      let lastMark=null;
      for(let i=1;i<path.length-1;i++){
        const q=path[i];
        if(lastMark&&Math.hypot(q.x-lastMark.x,q.y-lastMark.y)<minGap)continue;
        marks.push({q,dest:false});lastMark=q;
      }
      marks.push({q:path[path.length-1],dest:true});
      for(const {q,dest} of marks){
        const col=dest?COL_DEST:COL_STOP;
        /* glow nền mềm (fill) — mạnh hơn ở tâm, lan ra ngoài */
        const glowR=(dest?18:14)/scale;
        softGlow(q.x,q.y,glowR*1.15,col,0.10+0.06*(1-pulse));
        softGlow(q.x,q.y,glowR*0.7,col,0.18+0.08*(1-pulse));
        softGlow(q.x,q.y,glowR*0.35,col,0.28+0.1*(1-pulse));
        /* lõi sáng */
        const core=(dest?3.2:2.2)/scale;
        softGlow(q.x,q.y,core*2.2,0xffffff,0.35);
        dot(q.x,q.y,core,col,1);
        dot(q.x,q.y,core*0.45,0xffffff,0.9);
        /* vòng stroke cố định */
        const baseR=(dest?12:9)/scale;
        ring(q.x,q.y,baseR,(dest?1.6:1.25)/scale,col,0.85);
        ring(q.x,q.y,baseR*1.55,(dest?1.2:1)/scale,col,0.45);
        /* ripple tỏa mạnh: 2 vòng chạy ra ngoài */
        const p1=pulse, p2=(pulse+0.5)%1;
        for(const p of [p1,p2]){
          const rr=baseR*(1.2+2.4*p);
          const aa=(dest?0.7:0.55)*(1-p)*(1-p);
          ring(q.x,q.y,rr,(dest?1.8:1.4)/scale,col,aa);
        }
      }
    }catch(err){console.warn('[VKTool] draw route',err);clearRouteDrawing()}
  };
  let raf=0,alive=true;const frame=()=>{if(!alive)return;render();raf=requestAnimationFrame(frame)};frame();
  routeOverlayCleanup=()=>{alive=false;cancelAnimationFrame(raf);try{gr.parent?.removeChild(gr);gr.destroy?.()}catch{}if(routeOverlay===gr)routeOverlay=null};
  return true
}

function drawRouteOverlay(route){clearRouteDrawing();if(!route?.path?.length||routeUiBusy())return false;return drawRouteSvg(route)}
function persistSafeRoute(){if(activeSafeRoute)sessionStorage.setItem('vk-safe-route',JSON.stringify({target:activeSafeRoute.target,steps:activeSafeRoute.path.map(x=>x.id),atTarget:routeAtTarget,encounterSeen:routeEncounterSeen,task:activeSafeRoute.task||null}))}
function restoreSafeRoute(){if(activeSafeRoute)return activeSafeRoute;try{const x=JSON.parse(sessionStorage.getItem('vk-safe-route')||'null');if(!x?.target||!Array.isArray(x.steps)||!W.hasSlot(x.target))return null;const path=x.steps.filter(id=>W.hasSlot(id)).map(id=>W.slot(id));if(!path.length)return null;activeSafeRoute={target:x.target,path,len:0,task:x.task||null};lastSafeRoute=activeSafeRoute;routeAtTarget=Boolean(x.atTarget);routeEncounterSeen=Boolean(x.encounterSeen);return activeSafeRoute}catch{return null}}
function mapTaskRouteAlive(task,run=Runtime.run()){if(!task)return true;if(!run||!task.slot||!W.hasSlot(task.slot))return false;const node=run.nodes?.[task.slot];if(task.type==='encounter')return!!node&&!node.viec&&node.encounter===task.encounter;if(task.type==='place')return!!node&&!node.viec&&mapSlotAvailable(task.slot,run,run.nam,task.typeId);return false}
function syncSafeRoute(run=Runtime.run()){const route=restoreSafeRoute();if(!route)return;if(route.task&&!mapTaskRouteAlive(route.task,run)){clearRouteOverlay();return}const current=run?.viTri,busy=routeUiBusy(run);if(current===route.target){routeAtTarget=true;if(busy)routeEncounterSeen=true;persistSafeRoute();clearRouteDrawing();if(!busy&&(routeEncounterSeen||!route.task))clearRouteOverlay();return}const hit=route.path.findIndex(x=>x.id===current);if(hit>0){route.path=route.path.slice(hit);routeAtTarget=false;routeEncounterSeen=false;persistSafeRoute();clearRouteDrawing()}if(busy){clearRouteDrawing();return}if(route.path.length>1&&!routeOverlay&&!document.getElementById('vk-route-svg'))drawRouteOverlay(route)}
function showSafeRoute(slot,task=null,opts={}){
  /* opts.focus: 'start' | 'target' | 'none' — mặc định 'start' (vị trí nhân vật) */
  const focusMode=opts.focus||'start';
  const route=routeSafe(slot);
  if(!route){console.warn('[VKTool] routeSafe null',{slot,start:Runtime.currentSlot()});return false}
  clearRouteOverlay();
  route.task=task||null;
  activeSafeRoute=route;lastSafeRoute=route;
  routeAtTarget=Runtime.currentSlot()===slot;
  routeEncounterSeen=false;
  persistSafeRoute();
  let focusOk=true;
  if(focusMode==='target'&&slot&&W.hasSlot(slot))focusOk=focusMap(slot);
  else if(focusMode==='start'){const here=Runtime.currentSlot();if(here&&W.hasSlot(here))focusOk=focusMap(here)}
  const drawn=drawRouteOverlay(route);
  if(!drawn){
    /* Đường đã tính được nhưng overlay PIXI chưa sẵn — vẫn coi là thành công, thử lại sau */
    setTimeout(()=>{if(activeSafeRoute===route)drawRouteOverlay(route)},180);
    setTimeout(()=>{if(activeSafeRoute===route)drawRouteOverlay(route)},500);
  }
  setTimeout(()=>hide(),120);
  console.info(`[VKTool] Đường an toàn: ${route.path.length} điểm · focus=${focusMode} · vẽ=${drawn?'ok':'retry'} · approx=${!!route.approx}`);
  return true;
}
function isTreasureEncounter(id){const e=C.encounters?.get?.(id);return TREASURE_GUIDE.has(id)||Boolean(e?.mat_bi||e?.matBi||e?.kind==='di_bao'||A(e?.tags?.tinh_chat).includes('di_bao'))}
function mapSlotAvailable(slot,run=g.state.run,year=run?.nam,typeId=''){const chosen=run?.noiChon?.[slot];if(!chosen)return true;if(N(chosen.biDiet)&&N(year)&&+chosen.biDiet<=+year)return false;if(typeId!=='bi_canh'&&N(chosen.moLai)&&N(year)&&+chosen.moLai>+year)return false;return true}
function mapTaskRecords(){return TickCache.get("mapTaskRecords",__raw_mapTaskRecords)}
function mapTaskOpen(slot,run,year,typeId=''){
  /* Chỉ hiện mục đang mở trên bản đồ: có node, chưa bị diệt, không nằm trong thời gian khóa mở lại. */
  if(!slot||!W.hasSlot(slot))return false;
  const node=run?.nodes?.[slot]||run?.nodes?.[String(slot)];
  if(!node||typeof node!=='object')return false;
  if(node.viec)return false; /* node gắn nhiệm vụ/treo thưởng → tab khác */
  const chosen=run?.noiChon?.[slot];
  if(chosen){
    if(N(chosen.biDiet)&&N(year)&&+chosen.biDiet<=+year)return false;
    if(N(chosen.moLai)&&N(year)&&+chosen.moLai>+year)return false; /* chưa mở / đang khóa */
  }
  return true;
}
function mapTaskDetail(slot){
  let info=null;try{info=W.info(slot)}catch{}
  const ten=info?.ten||info?.diaDanh?.ten||slot;
  const loai=placeType(info)||null;
  const country=info?.quocGia||null;
  const terrain=A(info?.diaHinh);
  const clan=info?.tocYeu? (YEU_TOC[info.tocYeu]||info.tocYeu):null;
  const base=N(info?.capNen)?+info.capNen:null;
  return{ten,loai,country,terrain,clan,base,info};
}
function __raw_mapTaskRecords(){
  const run=g.state.run||{},now=Number(run.nam)||0,out=[],seen=new Set();
  const specialSlots=new Set((places||[]).map(r=>r.slot));

  /* 1) Sự kiện runtime trên nodes (không gồm dị bảo / catalog / tông môn / treo thưởng) */
  for(const row of rows||[]){
    if(!row?.groups?.has?.('mapevent'))continue;
    if(row.x?.catalog)continue; /* chưa xuất hiện */
    if(isTreasureEncounter(row.enc))continue;
    if(specialSlots.has(row.slot))continue; /* sẽ gom ở nhóm địa điểm đặc biệt */
    if(!mapTaskOpen(row.slot,run,now))continue;
    const node=Runtime.node(row.slot);
    if(!node||node.encounter!==row.enc)continue;
    const expires=N(node.hetHanNam)?Number(node.hetHanNam):(N(row.expires)?Number(row.expires):null);
    if(expires!==null&&expires<=now)continue; /* đã hết hạn */
    const key=`encounter|${row.slot}|${row.enc}`;
    if(seen.has(key))continue;seen.add(key);
    const travel=N(row.travel)?+row.travel:+g.travelYears(row.slot);
    const distance=N(row.dist)?+row.dist:+g.distanceLi(row.slot);
    const remaining=expires===null?null:expires-now;
    const canArrive=remaining===null||!N(travel)?true:travel<=remaining;
    const detail=mapTaskDetail(row.slot);
    const combat=row.meta?.combat||[];
    out.push({
      key,kind:'Sự kiện bản đồ',typeId:'su_kien',name:T(row.x?.ten||row.e?.ten||row.enc),
      slot:row.slot,placeName:detail.ten,travel,distance,remaining,expires,
      canArrive,state:canArrive?'feasible':'unreachable',
      row,enc:row.enc,rewards:mapRewardHint(row.e),danger:slotDanger(row.slot),
      combatCount:combat.length,combatNames:[...new Set(combat.map(x=>x.ten))].slice(0,3),
      mandatory:Boolean(row.meta?.mandatory),detail,
      source:row.src||'Sự kiện trên bản đồ',
      routeTask:{type:'encounter',slot:row.slot,encounter:row.enc}
    });
  }

  /* 2) Địa điểm đặc biệt đang có node: bí cảnh, di tích, sào huyệt, khoáng mạch */
  for(const r of places||[]){
    if(!mapTaskOpen(r.slot,run,now,r.typeId))continue;
    const node=Runtime.node(r.slot);
    if(!node)continue;
    const expires=N(node.hetHanNam)?Number(node.hetHanNam):(N(r.expiryYear)?Number(r.expiryYear):null);
    if(expires!==null&&expires<=now)continue;
    const key=`place|${r.slot}`;
    if(seen.has(key))continue;seen.add(key);
    const travel=N(r.travelYears)?+r.travelYears:+g.travelYears(r.slot);
    const distance=N(r.distanceLi)?+r.distanceLi:+g.distanceLi(r.slot);
    const remaining=expires===null?null:expires-now;
    const canArrive=remaining===null||!N(travel)?true:travel<=remaining;
    const detail=mapTaskDetail(r.slot);
    const eventRewards=[];
    for(const ev of A(r.events)){
      const enc=C.encounters?.get?.(ev.id);
      for(const x of mapRewardHint(enc))eventRewards.push(x);
    }
    out.push({
      key,kind:r.type||'Địa điểm đặc biệt',typeId:r.typeId||'',name:r.name,
      slot:r.slot,placeName:detail.ten,travel,distance,remaining,expires,
      canArrive,state:canArrive?'feasible':'unreachable',
      place:r,enc:null,rewards:[...new Set(eventRewards)].slice(0,4),danger:slotDanger(r.slot),
      combatCount:0,combatNames:[],mandatory:false,detail,
      beastClan:r.beastClanName||detail.clan||null,
      baseLevel:N(r.baseLevel)?+r.baseLevel:detail.base,
      discovered:Boolean(r.discovered),
      placeEvents:A(r.events).map(ev=>ev.ten||ev.id).slice(0,4),
      source:'Địa điểm đặc biệt',
      routeTask:{type:'place',slot:r.slot,typeId:r.typeId}
    });
  }

  /* Sắp xếp: gần → xa; cùng khoảng cách thì còn hạn gấp hơn trước; không đến kịp xếp cuối */
  return out.sort((a,b)=>{
    const ua=a.state==='unreachable'?1:0,ub=b.state==='unreachable'?1:0;
    if(ua!==ub)return ua-ub;
    const ta=N(a.travel)?+a.travel:Infinity,tb=N(b.travel)?+b.travel:Infinity;
    if(ta!==tb)return ta-tb;
    const da=N(a.distance)?+a.distance:Infinity,db=N(b.distance)?+b.distance:Infinity;
    if(da!==db)return da-db;
    const ra=a.remaining===null||a.remaining===undefined?Infinity:+a.remaining;
    const rb=b.remaining===null||b.remaining===undefined?Infinity:+b.remaining;
    if(ra!==rb)return ra-rb;
    return String(a.name||'').localeCompare(String(b.name||''),'vi');
  });
}
function renderMapTasks(){
  const tasks=mapTaskRecords().filter(t=>t.state!=='expired');
  const feasible=tasks.filter(t=>t.state!=='unreachable').length;
  const urgent=tasks.filter(t=>N(t.remaining)&&t.remaining<0.5).length;
  sum.textContent=`${tasks.length} mục đang mở trên bản đồ · ${feasible} đến kịp · ${urgent?urgent+' sắp hết hạn · ':''}gần → xa, hạn gấp trước · ẩn hết hạn & chưa mở · không gồm Tông Môn / Treo thưởng / Dị bảo`;
  list.innerHTML=tasks.map(task=>{
    const tags=[];
    tags.push(task.kind||'Sự kiện');
    if(task.danger?.label)tags.push(task.danger.label);
    if(task.discovered===false)tags.push('Chưa khám phá');
    if(task.beastClan)tags.push(task.beastClan);
    if(N(task.baseLevel))tags.push('Cấp nền '+F(task.baseLevel));
    if(task.row){
      const q=preview(task.row);
      if(!task.combatCount)tags.push('Không cần chiến đấu');
      else if(!q)tags.push(task.mandatory?'Bắt buộc chiến đấu':'Có chiến đấu');
      else if(q.tuTran)tags.push('Tử địa');
      else if(q.thang&&q.ketQua?.thuongThe)tags.push('Thắng · có thể bị thương');
      else if(q.thang)tags.push('Dễ thắng');
      else tags.push('Khó thắng');
    }
    if(N(task.remaining)){
      if(task.remaining<0)tags.push('Đã hết hạn');
      else if(task.state==='unreachable')tags.push('Không đến kịp');
      else if(task.remaining<0.25)tags.push('Sắp hết · còn '+fmtDuration(task.remaining));
      else tags.push('Còn '+fmtDuration(task.remaining));
    }else tags.push('Không giới hạn thời gian');
    const tagCls=t=>{
      if(t==='Không đến kịp'||t==='Tử địa'||t==='Đã hết hạn'||t.startsWith('Sắp hết'))return'bad';
      if(t==='An toàn'||t==='Dễ thắng'||t==='Không cần chiến đấu')return'good';
      if(t==='Nguy hiểm'||t==='Khó thắng'||t.startsWith('Thắng ·'))return'warn';
      return'';
    };
    const subParts=[task.placeName&&task.placeName!==task.name?task.placeName:null,task.source,N(task.distance)?fmtDistance(task.distance):null].filter(Boolean);
    const extra=[];
    if(task.combatNames?.length)extra.push('Địch: '+task.combatNames.join(', '));
    if(task.placeEvents?.length)extra.push('Sự kiện tại chỗ: '+task.placeEvents.join(', '));
    if(task.detail?.country)extra.push('Quốc gia: '+task.detail.country);
    if(task.detail?.terrain?.length)extra.push('Địa hình: '+task.detail.terrain.join(', '));
    if(N(task.remaining)&&N(task.travel)&&task.canArrive){
      const slack=task.remaining-task.travel;
      if(slack>=0)extra.push('Đến nơi còn khoảng '+fmtDuration(slack));
    }
    return`<article data-map-task="${E(task.key)}" data-slot="${E(task.slot||'')}" class="${task.state==='unreachable'?'is-unreachable':''}"><div><div class="name">${E(task.name)}</div><div class="sub">${E(subParts.join(' · '))}</div><div class="tags">${tags.map(x=>`<span class="tag ${tagCls(x)}">${E(x)}</span>`).join('')}</div>${extra.length?`<div class="sub">${E(extra.join(' · '))}</div>`:''}${task.rewards?.length?`<div class="gain">Có thể được: ${E(task.rewards.join(' · '))}</div>`:''}${task.state==='unreachable'?`<div class="risk">Thời gian đi (${fmtDuration(task.travel)}) dài hơn hạn còn lại (${fmtDuration(task.remaining)}). Có thể hết hạn trước khi tới.</div>`:''}</div><div class="travel">${N(task.travel)?`<strong>${fmtDuration(task.travel)}</strong><span>${fmtDistance(task.distance)}</span>`:'<strong>—</strong><span>chưa rõ</span>'}</div><div><button class="red map-focus-act">Xem đích + đường</button><button class="ghost map-safe-route-act">Đường từ vị trí đứng</button></div></article>`;
  }).join('')||'<p><strong>Không có mục nào đang mở trên bản đồ.</strong><br>Chỉ hiện sự kiện / bí cảnh / di tích / sào huyệt / khoáng mạch đã xuất hiện, còn hạn và không bị khóa mở lại. Treo thưởng, tông môn và dị bảo nằm ở tab riêng.</p>';
}
function renderPeopleBase(){
  const alive=people.filter(x=>x.lifeState==='Còn sống').length;
  const visible=people.filter(x=>x.location.source==='node').length;
  const meet=people.filter(x=>x.canMeet).length;
  const dead=people.length-alive;
  sum.textContent=`${people.length} nhân mạch · ${meet} có thể gặp ngay · ${visible} đang xuất hiện · ${alive} còn sống · ${dead} đã khuất · gần → xa`;
  list.innerHTML=people.map(person=>{
    const tags=[person.lifeState,person.gender,person.relation,`Hảo cảm ${F(person.affection)}`];
    if(person.debt)tags.push(`Nợ ${F(person.debt)}`);
    if(person.romance)tags.push('Có tình ý');
    if(person.canMeet)tags.push('Có thể gặp mặt');
    if(person.location.source==='node')tags.push('Đang xuất hiện');
    else if(person.location.source==='companion')tags.push('Đồng hành');
    else if(person.location.confidence==='history')tags.push('Vị trí cũ');
    if(N(person.remaining)&&person.remaining>=0)tags.push('Còn '+fmtDuration(person.remaining));
    const tagCls=t=>{
      if(t==='Đã khuất')return'bad';
      if(t==='Có thể gặp mặt'||t==='Đang xuất hiện'||t==='Đồng hành')return'good';
      if(t==='Vị trí cũ')return'warn';
      return'';
    };
    const sub=[person.placeName,person.location.note,person.faction?('Thế lực: '+person.faction):null].filter(Boolean).join(' · ');
    const extra=[];
    if(person.giftLikeName||person.giftLike){
      const gname=person.giftLikeName||person.giftLike;
      extra.push(person.giftOwned>0?`Sở thích quà: ${gname} · đang có ${person.giftOwned} loại trong túi`:`Sở thích quà: ${gname}`);
    }
    if(person.seen)extra.push(`Gặp gần nhất: ${N(person.seen.year)?'năm '+F(person.seen.year):'?'}${person.seen.slot?' · '+safePlaceName(person.seen.slot):''}`);
    if(person.home&&W.hasSlot(person.home))extra.push('Nhà: '+safePlaceName(person.home));
    if(person.hometown&&W.hasSlot(person.hometown))extra.push('Quê: '+safePlaceName(person.hometown));
    const acts=person.interactions.filter(x=>x!=='Có thể gặp mặt');
    let buttons='';
    if(person.slot&&person.lifeState==='Còn sống'){
      buttons=`<button class="red person-focus-act">Xem đích + đường</button><button class="ghost person-route-act">Đường từ vị trí đứng</button>`;
    }
    if(person.giftLikeName||person.giftLike)buttons+=`<button class="ghost person-gift-act">Tìm quà phù hợp</button>`;
    return`<article data-person="${E(person.key)}" data-slot="${E(person.slot||'')}"><div><div class="name">${E(person.name)}</div><div class="sub">${E(sub||'Chưa rõ tung tích')}</div><div class="tags">${tags.map(x=>`<span class="tag ${tagCls(x)}">${E(x)}</span>`).join('')}</div>${acts.length?`<div class="sub">Tương tác: ${E(acts.join(' · '))}</div>`:''}${extra.map(x=>`<div class="sub">${E(x)}</div>`).join('')}</div><div class="travel">${N(person.travel)?`<strong>${fmtDuration(person.travel)}</strong><span>${fmtDistance(person.distance)}</span>`:'<strong>—</strong><span>chưa rõ vị trí</span>'}</div><div>${buttons}</div></article>`;
  }).join('')||'<p>Chưa có Nhân mạch đã gặp / có quan hệ.</p>';
}

function sectDirectoryRecords(run=g.state.run){
  const out=[],now=Number(run?.nam)||0;
  for(const slot of W.slots||[]){
    let info;try{info=W.info(slot.id)}catch{continue}
    const place=info?.diaDanh;if(place?.loai!=='tong_mon')continue;
    const chosen=run?.noiChon?.[slot.id]||{};
    const destroyed=N(chosen.biDiet)&&+chosen.biDiet<=now;
    const travel=+g.travelYears(slot.id),distance=+g.distanceLi(slot.id);
    const joined=run?.tongMon?.slot===slot.id||run?.flags?.mon_phai===slot.id;
    const alignRaw=place.chinh_ma??place.chinhMa??place.dao??null;
    const alignment=alignRaw==='ma'||alignRaw==='ta'||alignRaw===1?'Ma đạo':alignRaw==='chinh'||alignRaw==='chính'||alignRaw===0?'Chính đạo':alignRaw?T(String(alignRaw)):null;
    const school=T(place.phai||place.school||'');
    const tier=T(place.tang||place.tier||'tông môn').replaceAll('_',' ');
    const country=info?.quocGia||place.quocGia||null;
    const he=A(place.he||info?.he);
    out.push({
      key:`sect|${slot.id}`,slot:slot.id,name:T(place.ten||info?.ten||slot.id),
      tier,school,alignment,country,he,joined,destroyed,travel,distance,
      baseLevel:N(info?.capNen)?+info.capNen:N(place.capNen)?+place.capNen:null,
      discovered:A(run?.daKhamPha).includes(slot.id),
      destroyedYear:N(chosen.biDiet)?+chosen.biDiet:null,
      raw:place,info
    });
  }
  return out.sort((a,b)=>(a.destroyed?1:0)-(b.destroyed?1:0)||(a.joined?-1:0)-(b.joined?-1:0)||(a.travel??Infinity)-(b.travel??Infinity)||(a.distance??Infinity)-(b.distance??Infinity)||a.name.localeCompare(b.name,'vi'));
}

function playerSectProfile(run=g.state.run){
  const membership=run?.tongMon||Runtime.character()?.tongMon||null;
  const slot=membership?.slot||run?.flags?.mon_phai||null;
  const record=slot?sectDirectoryRecords(run).find(x=>x.slot===slot):null;
  const nv=Runtime.character()||{};
  const rank=T(membership?.capBac||membership?.cap_bac||membership?.factionRank||membership?.rank||membership?.danhPhan||nv.capBacTongMon||'').replaceAll('_',' ');
  const school=T(membership?.phai||membership?.loai||record?.school||'');
  return{
    membership,slot,record,school,
    contribution:N(membership?.congHien)?+membership.congHien:N(nv?.congHien)?+nv.congHien:null,
    rank,trial:Boolean(membership?.trial||membership?.thuThach),
    joined:Boolean(slot&&record&&!record.destroyed)
  };
}

function renderSectBase(){
  const run=g.state.run,profile=playerSectProfile(run),directory=sectDirectoryRecords(run);
  const accepted=quests.filter(r=>r.status==='active'&&r.source==='Nhiệm vụ đã nhận').sort((a,b)=>(a.travelYears??Infinity)-(b.travelYears??Infinity)||(a.distanceLi??Infinity)-(b.distanceLi??Infinity));
  const slips=hallOpen()?quests.filter(r=>r.source==='Ngọc giản tông môn'&&r.status==='active').sort((a,b)=>(a.travelYears??Infinity)-(b.travelYears??Infinity)):[];
  const activeN=directory.filter(x=>!x.destroyed).length;
  sum.textContent=`${directory.length} tông môn · ${activeN} đang tồn tại · ${profile.joined?'đã gia nhập '+(profile.record?.name||''):'chưa gia nhập'} · gần → xa`;
  const questCard=(r,acceptedMode)=>`<article data-quest="${E(r.key)}"><div><div class="name">${E(r.name)}</div><div class="tags"><span class="tag">${acceptedMode?'Đã nhận':'Ngọc giản'}</span>${N(r.remainingYears)?`<span class="tag ${r.remainingYears<=0?'bad':r.canArrive===false?'warn':'good'}">${r.remainingYears<=0?'Đã hết hạn':r.canArrive===false?'Không đến kịp':`Còn ${fmtDuration(r.remainingYears)}`}</span>`:''}</div>${N(r.contribution)?`<div class="gain">${F(r.contribution)} cống hiến</div>`:''}</div><div class="travel">${N(r.travelYears)?`<strong>${fmtDuration(r.travelYears)}</strong><span>${fmtDistance(r.distanceLi)}</span>`:'<strong>—</strong><span>vị trí</span>'}</div><div>${r.slot?'<button class="red quest-act">Xem nơi làm</button>':''}</div></article>`;
  const sectCard=r=>{
    const tags=[r.tier];
    if(r.school)tags.push('Phái '+r.school);
    if(r.alignment)tags.push(r.alignment);
    if(r.country)tags.push(r.country);
    if(N(r.baseLevel))tags.push('Cấp nền '+F(r.baseLevel));
    if(r.joined)tags.push('Tông môn hiện tại');
    if(r.destroyed)tags.push('Đã bị tiêu diệt');
    else tags.push('Đang tồn tại');
    if(r.discovered===false)tags.push('Chưa khám phá');
    const tagCls=t=>t==='Tông môn hiện tại'||t==='Đang tồn tại'?'good':t==='Đã bị tiêu diệt'?'bad':t==='Ma đạo'?'warn':'';
    const sub=[r.he?.length?('Hệ: '+r.he.join(', ')):null,r.destroyed&&N(r.destroyedYear)?('Diệt năm '+F(r.destroyedYear)):null].filter(Boolean).join(' · ');
    return`<article data-sect-slot="${E(r.slot)}"><div><div class="name">${E(r.name)}</div><div class="tags">${tags.map(x=>`<span class="tag ${tagCls(x)}">${E(x)}</span>`).join('')}</div>${sub?`<div class="sub">${E(sub)}</div>`:''}</div><div class="travel"><strong>${fmtDuration(r.travel)}</strong><span>${fmtDistance(r.distance)}</span></div><div>${!r.destroyed?`<button class="red sect-focus-act">Xem đích + đường</button><button class="ghost sect-route-act">Đường từ vị trí đứng</button>`:''}</div></article>`;
  };
  const profileHtml=profile.joined
    ?`<div class="tags"><span class="tag good">${E(profile.record?.name||profile.slot)}</span>${profile.rank?`<span class="tag">${E(profile.rank)}</span>`:''}${profile.school?`<span class="tag">Phái ${E(profile.school)}</span>`:''}${N(profile.contribution)?`<span class="tag">${F(profile.contribution)} cống hiến</span>`:''}${profile.trial?'<span class="tag warn">Đang thử thách</span>':''}${profile.record?.alignment?`<span class="tag">${E(profile.record.alignment)}</span>`:''}</div>${profile.record?`<div class="sub">${E([profile.record.country,N(profile.record.travel)?('cách '+fmtDuration(profile.record.travel)):null].filter(Boolean).join(' · '))}</div><div>${!profile.record.destroyed?`<button class="red sect-focus-act" data-slot="${E(profile.slot)}">Xem đích + đường</button><button class="ghost sect-route-act" data-slot="${E(profile.slot)}">Đường từ vị trí đứng</button>`:''}</div>`:''}`
    :'<div class="sub">Nhân vật chưa gia nhập tông môn.</div>';
  list.innerHTML=`<article class="section-card" data-sect-slot="${E(profile.slot||'')}"><div class="name">Tông môn của nhân vật</div>${profileHtml}</article><div class="section-title">Danh bạ tông môn · gần → xa</div>${directory.map(sectCard).join('')||'<p>Không tìm thấy tông môn trên bản đồ.</p>'}<div class="section-title">Nhiệm vụ đã nhận</div>${accepted.map(r=>questCard(r,true)).join('')||'<p>Chưa có nhiệm vụ đã nhận.</p>'}<div class="section-title">Ngọc giản tại Điện nhiệm vụ</div>${hallOpen()?(slips.map(r=>questCard(r,false)).join('')||'<p>Điện đang mở nhưng chưa đọc được Ngọc giản.</p>'):'<p>Mở Điện nhiệm vụ để đọc Ngọc giản. Ngọc giản đầy đủ nằm ở tab Treo Thưởng.</p>'}`;
}

let breakthroughToken=0,bountyBusy=false,bountyCache=null,bountyCacheSig='',bountyScanSeq=0,bountyConsumed=new Set();try{const saved=JSON.parse(sessionStorage.getItem('vk-bounty-plan')||'null');if(Array.isArray(saved?.rows))bountyCache=saved.rows;if(Array.isArray(saved?.consumed))bountyConsumed=new Set(saved.consumed)}catch{}
const safePlaceName=slot=>{if(!slot||!W.hasSlot(slot))return slot||'Chưa rõ';try{return W.info(slot)?.ten||slot}catch{return slot}};
function runtimeSignature(){const run=Runtime.run(),nv=Runtime.character(),km=nv.kinhMach||{};return JSON.stringify([Math.floor(Number(run.nam)||0),run.viTri,nv.canhGioi,nv.tieuCanhGioi,km.activeLoadout,km.manh,nv.trangBi,run.tongMon?.slot,A(run.viecNhan).map(x=>[x.id,x.enc,x.slot,x.hetHanNam])])}
function invalidateBountyCache(){bountyCache=null;bountyCacheSig='';bountyConsumed.clear();bountyScanSeq++;sessionStorage.removeItem('vk-bounty-plan')}
function bountyWorkKey(r){const v=r?.v||r||{};return String(v.id||`${v.enc||''}|${v.slot||''}|${r?.board||''}`)}
function persistBountyPlan(){try{sessionStorage.setItem('vk-bounty-plan',JSON.stringify({rows:A(bountyCache),consumed:[...bountyConsumed]}))}catch{}}
function syncBountyPlan(run=Runtime.run()){for(const work of A(run?.viecNhan))bountyConsumed.add(String(work.id||`${work.enc||''}|${work.slot||''}|`));if(bountyCache){bountyCache=bountyCache.filter(r=>!bountyConsumed.has(bountyWorkKey(r)));persistBountyPlan()}return bountyCache}

function coreContext(){const K=BuildEngine.core,run=structuredClone(g.state.run),meta=structuredClone(g.state.meta||{}),rng=new K.fn(run.rng),cache=new Map();run.rngKeys??={};return{...g.env,run,meta,rng,enc:run.active,noticeLines:[],rngFor(key){let x=cache.get(key);if(!x){const seed=Object.hasOwn(run.rngKeys,key)?run.rngKeys[key]:undefined;x=seed===undefined?K.fn.fromSeed(`${run.seed}|rng|${key}`):new K.fn(seed);cache.set(key,x)}return x}}}
function breakthroughPills(nextRealm){return[...C.items.values()].filter(it=>it.dot_pha&&(it.dot_pha.canh_gioi===undefined||it.dot_pha.canh_gioi===nextRealm)).sort((a,b)=>(b.dot_pha?.ti_le||0)-(a.dot_pha?.ti_le||0))}
async function renderBreakthrough(){const token=++breakthroughToken;itemTools.style.display='none';head.style.display='none';sum.textContent='Đang nạp phép tính đột phá và thọ nguyên từ lõi game…';list.innerHTML='<article class="section-card loading-card"><div class="loading-dot"></div><div><div class="name">Đang tính kế hoạch…</div><div class="sub">Lần mở đầu tiên có thể mất vài giây.</div></div></article>';try{await BuildEngine.ensureCore(m=>{if(token===breakthroughToken)sum.textContent=m});if(token!==breakthroughToken||tab!=='breakthrough')return;const K=BuildEngine.core,c=coreContext(),nv=c.run.nhanVat,life=K.ke?K.ke(nv):null,left=N(life)&&N(nv.tuoi)?life-nv.tuoi:null;let need=null,nextNeed=null,retreat=null,years=null,stagn=false;try{need=K.qw?.(c,{untilExhausted:true});nextNeed=K.qw?.(c,{nextMinorRealm:true})}catch{}try{retreat=K.to?.(c);if(retreat&&!retreat.chan&&N(retreat.tuViNam)&&retreat.tuViNam>0&&N(need)){years=need/retreat.tuViNam;try{stagn=K.Nb?.(c,retreat,{dan:[],danSo:{}},years)<need*.97}catch{}}}catch{}let base=null,options=[];try{const h=K.kR(c,{dan:[],thieuDot:0});base=h.tiLe;const usable=[...new Set(h.danDung||[])],burn=[0,...A(h.thieuDot).map((x,i)=>x.duoc?i+1:null).filter(Boolean)];const sets=[[],...usable.map(x=>[x])];for(let i=0;i<usable.length;i++)for(let j=i+1;j<usable.length;j++)sets.push([usable[i],usable[j]]);for(const dan of sets)for(const thieuDot of burn){try{const z=K.kR(coreContext(),{dan,thieuDot});options.push({dan,thieuDot,rate:z.tiLe,burn:thieuDot?A(h.thieuDot)[thieuDot-1]?.nam:null})}catch{}}options.sort((a,b)=>b.rate-a.rate)}catch{}const pills=breakthroughPills((nv.canhGioi||0)+1).slice(0,8),best=options[0],ok=years!==null&&left!==null?years<left-5:null;sum.textContent=`Thọ còn ${left===null?'?':F(left)} năm · ${N(need)?F(need)+' tu vi tới Đại viên mãn':'chưa đọc được tu vi thiếu'}`;list.innerHTML=`<article class="section-card"><div class="name">Kế hoạch tới Đại viên mãn</div><div class="metric-grid"><div>Tuổi / thọ<b>${F(nv.tuoi||0)} / ${life===null?'?':F(life)}</b></div><div>Thọ còn<b>${left===null?'?':fmtDuration(left)}</b></div><div>Tu vi còn thiếu<b>${N(need)?F(need):'?'}</b></div><div>Tới tiểu cảnh kế<b>${N(nextNeed)?F(nextNeed):'?'}</b></div><div>Tu vi mỗi năm tại đây<b>${N(retreat?.tuViNam)?F(retreat.tuViNam):'Không bế quan được'}</b></div><div>Thời gian cần<b>${years===null?'?':fmtDuration(years)}</b></div></div>${ok===null?'':`<div class="${ok?'gain':'risk'}"><strong>${ok?'Kịp':'Không kịp'}:</strong> ${ok?'còn dư thời gian an toàn':'thọ hiện tại không đủ nếu tiếp tục bế quan ở đây'}.</div>`}${retreat?.chan?`<div class="risk">Chỗ hiện tại không bế quan được: ${E(retreat.chan)}</div>`:''}${stagn?'<div class="risk">Lịch luyện có thể cạn giữa chừng; nên xen kẽ đi đánh hoặc đi xa.</div>':''}</article><article class="section-card"><div class="name">Phương án đột phá</div><div class="sub">Không dùng gì: <strong>${base===null?'?':F(base*100)+'%'}</strong></div>${best?`<div class="gain"><strong>Tốt nhất trong đồ đang dùng được:</strong> ${best.dan.length?best.dan.map(id=>E(C.items.get(id)?.ten||id)).join(' + '):'Không dùng đan'}${best.thieuDot?` · đốt ${best.thieuDot} nấc thọ${N(best.burn)?' (−'+F(best.burn)+' năm)':''}`:''} → <strong>${F(best.rate*100)}%</strong></div>`:'<div class="sub">Chưa tính được tổ hợp hiện tại.</div>'}<details><summary>Xem các phương án tốt</summary>${options.slice(0,10).map(x=>`<div class="sub option-row">${x.dan.length?x.dan.map(id=>E(C.items.get(id)?.ten||id)).join(' + '):'Không đan'}${x.thieuDot?' · đốt '+x.thieuDot+' nấc':''}<strong>${F(x.rate*100)}%</strong></div>`).join('')}</details></article><article class="section-card"><div class="name">Đan nên chuẩn bị cho cảnh giới kế</div>${pills.map(it=>`<div class="sub option-row"><span><strong>${E(it.ten)}</strong> · +${F((it.dot_pha?.ti_le||0)*100)}%</span>${inventoryState(it.id).owned?'<span class="safe">Đang có</span>':'<span>Chưa có</span>'}</div>`).join('')||'<div class="sub">Không tìm thấy đan phù hợp.</div>'}</article>`}catch(err){console.error(err);if(token===breakthroughToken){sum.textContent='Không thể tính Đột phá & thọ';list.innerHTML=`<article class="section-card"><div class="risk">${E(err?.message||err)}</div></article>`}}}
function bountyThreat(encId,slot,vars,year){const K=BuildEngine.core;if(!K?.Uen)return null;const def=C.encounters.get(encId);if(!def)return null;const out=[],seen=new Set(),choices=[...A(def.choices),...Object.values(def.scenes||{}).flatMap(s=>A(s?.choices))];for(const ch of choices)for(const ef of A(ch?.effects))if(ef?.combat!==undefined){try{const c=coreContext();c.run.nam=year;c.enc={id:encId,slot,vars:{...(vars||{})},nodeFlags:{}};c.noi=slot;const r=K.Uen(c,ef.combat,ef),key=r&&`${r.enemy||''}|${r.realm||''}|${r.level||''}`;if(r&&!seen.has(key)){seen.add(key);out.push(r)}}catch{}}return out}
function threatLabel(th){if(th===null)return['Chưa đoán được','warn'];if(!th.length)return['Không cần đánh','good'];const rank={an_toan:3,ngang_suc:2,hiem:1,tu_dia:0,unknown:1.5},worst=th.reduce((a,b)=>(rank[b.level]??1.5)<(rank[a.level]??1.5)?b:a),names={an_toan:'Thắng chắc',ngang_suc:'Thắng, có thể bị thương',hiem:'Khó thắng',tu_dia:'Tử địa',unknown:'Không đoán được'};return[names[worst.level]||worst.level,worst.level==='an_toan'?'good':worst.level==='ngang_suc'?'warn':'bad']}
async function scanBountyBoards(maxYears=1.2,withSect=true,onProgress=()=>{}){await BuildEngine.ensureCore();const seq=++bountyScanSeq,K=BuildEngine.core;if(!K.Rrn)throw new Error('Bản game hiện tại chưa nhận diện được hàm bảng treo thưởng.');const base=coreContext(),run=base.run,sectSlot=withSect?run.tongMon?.slot:null,slots=A(W.slots).filter(s=>!s.an&&s.id!==sectSlot).map(s=>{let y=Infinity;try{y=+g.travelYears(s.id)}catch{}return{slot:s.id,y}}).filter(x=>x.y<=maxYears).sort((a,b)=>a.y-b.y),jobs=slots.map(x=>({...x,kind:'thanh_tran'}));if(sectSlot){let y=Infinity;try{y=+g.travelYears(sectSlot)}catch{}if(y<=maxYears)jobs.unshift({slot:sectSlot,y,kind:'tong_mon'})}const raw=[];for(let i=0;i<jobs.length;i++){if(seq!==bountyScanSeq)throw new Error('Đã dừng lần quét cũ.');const j=jobs[i],c=coreContext();c.run.nam=run.nam+j.y;let found=[];try{found=K.Rrn(c,j.slot,j.kind)||[]}catch{continue}for(const v of found){if(!v?.slot||!W.hasSlot(v.slot))continue;let y2=Infinity;try{const c2=coreContext();c2.run.viTri=j.slot;y2=K.mf?+K.mf(c2,v.slot):+g.travelYears(v.slot)}catch{}if(!N(y2))continue;raw.push({board:j.slot,boardTravel:j.y,kind:j.kind,v,targetTravel:y2,th:null})}if(i%6===0){onProgress(.5*i/Math.max(1,jobs.length),`Đang xem bảng ${i+1}/${jobs.length}`);await new Promise(r=>setTimeout(r,0))}}const viable=raw.filter(r=>!N(r.v.han)||r.targetTravel<=r.v.han).concat(raw.filter(r=>N(r.v.han)&&r.targetTravel>r.v.han));for(let i=0;i<viable.length;i++){if(seq!==bountyScanSeq)throw new Error('Đã dừng lần quét cũ.');const r=viable[i];r.th=bountyThreat(r.v.enc,r.v.slot,r.v.vars,run.nam+r.boardTravel+r.targetTravel);if(i%3===0){onProgress(.5+.5*i/Math.max(1,viable.length),`Đang đánh giá ${i+1}/${viable.length} việc`);await new Promise(x=>setTimeout(x,0))}}onProgress(1,'Hoàn tất');return viable}
function renderBountyRows(data){syncBountyPlan();const onlyWin=Boolean(p.querySelector('#bounty-win')?.checked),filtered=A(data).filter(r=>!bountyConsumed.has(bountyWorkKey(r))).filter(r=>!onlyWin||['good','warn'].includes(threatLabel(r.th)[1])),groups=new Map(),box=p.querySelector('#bounty-results');if(!box)return;for(const r of filtered){if(!groups.has(r.board))groups.set(r.board,[]);groups.get(r.board).push(r)}box.innerHTML=[...groups].sort((a,b)=>a[1][0].boardTravel-b[1][0].boardTravel).map(([board,xs])=>`<details class="bounty-group" open><summary><span><strong>${E(safePlaceName(board))}</strong><small>${fmtDuration(xs[0].boardTravel)} · ${xs.length} nhiệm vụ${xs.length>=3?' · có thể nhận 3':''}</small></span><button class="red bounty-receive-map" data-slot="${E(board)}">Xem đường đến nơi nhận</button></summary><div class="bounty-group-body">${xs.sort((a,b)=>{const rank={good:0,warn:1,bad:2};return rank[threatLabel(a.th)[1]]-rank[threatLabel(b.th)[1]]}).map(r=>{const [label,cls]=threatLabel(r.th),late=N(r.v.han)&&r.targetTravel>r.v.han;return`<div class="bounty-job"><strong>${E(cleanPrivateText(r.v.ten||r.v.id||r.v.enc||'Treo thưởng'))}</strong><div class="tags"><span class="tag ${cls}">${E(label)}</span>${late?'<span class="tag bad">Không kịp hạn</span>':''}</div><div class="sub">Làm tại ${E(safePlaceName(r.v.slot))} · ${fmtDuration(r.targetTravel)}${N(r.v.han)?' · hạn '+fmtDuration(r.v.han):''}</div><div class="gain">${N(r.v.thuong)?F(r.v.thuong)+' linh thạch':''}${N(r.v.congHien)?' · '+F(r.v.congHien)+' cống hiến':''}</div></div>`}).join('')}</div></details>`).join('')||'<div class="empty-state"><strong>Không có việc phù hợp</strong></div>'}
function renderBounties(){itemTools.style.display='none';head.style.display='none';syncBountyPlan();const taken=quests.filter(r=>r.status==='active'&&r.source==='Nhiệm vụ đã nhận');sum.textContent=`${taken.length} việc đang nhận · ${bountyCache?bountyCache.length+' việc còn lại từ lần quét đã lưu':'chưa có kế hoạch quét đã lưu'}`;list.innerHTML=`<article class="section-card"><div class="name">Đã nhận</div>${taken.map(r=>`<div class="sub option-row"><span><strong>${E(r.name)}</strong> · ${N(r.remainingYears)?'còn '+fmtDuration(r.remainingYears):'không rõ hạn'}</span>${r.slot?`<button class="red bounty-work-map" data-slot="${E(r.slot)}">Xem đường đến nơi làm</button>`:''}</div>`).join('')||'<div class="sub">Chưa nhận việc nào.</div>'}</article><article class="section-card bounty-controls"><div class="name">Bảng treo thưởng quanh đây</div><div class="control-grid"><label>Bán kính<select id="bounty-range"><option value="0.6">6 tháng đường</option><option value="1.2" selected>1,2 năm đường</option><option value="2.5">2,5 năm đường</option></select></label><label class="check-row"><input type="checkbox" id="bounty-sect" checked>Gồm bảng sư môn</label><label class="check-row"><input type="checkbox" id="bounty-win">Chỉ việc thắng được</label></div><div class="inline-actions"><button class="red" id="bounty-scan">Quét bảng</button><button class="ghost" id="bounty-stop" ${bountyBusy?'':'disabled'}>Dừng</button></div><div class="scan-status sub" id="bounty-status">${bountyCache?'Đang dùng kết quả hợp lệ gần nhất.':'Chưa quét bảng.'}</div></article><div id="bounty-results"></div>`;if(bountyCache)renderBountyRows(bountyCache);p.querySelector('#bounty-win').onchange=()=>bountyCache&&renderBountyRows(bountyCache);p.querySelector('#bounty-stop').onclick=()=>{bountyScanSeq++;bountyBusy=false;const st=p.querySelector('#bounty-status');if(st)st.textContent='Đã dừng quét.'};p.querySelector('#bounty-scan').onclick=async e=>{if(bountyBusy)return;const btn=e.currentTarget,stop=p.querySelector('#bounty-stop'),st=p.querySelector('#bounty-status');bountyBusy=true;btn.disabled=true;stop.disabled=false;btn.textContent='Đang quét…';try{const result=await scanBountyBoards(+p.querySelector('#bounty-range').value,p.querySelector('#bounty-sect').checked,(f,msg)=>{if(st){st.textContent=`${msg} · ${Math.round(f*100)}%`;st.style.setProperty('--scan',`${Math.round(f*100)}%`)}});bountyCache=result;bountyCacheSig='saved';bountyConsumed.clear();syncBountyPlan();persistBountyPlan();if(tab==='bounties'){sum.textContent=`${result.length} việc tìm thấy · sắp theo khả năng thắng và hiệu quả phần thưởng`;renderBountyRows(result)}}catch(err){if(!String(err?.message||err).includes('Đã dừng'))alert('Lỗi quét treo thưởng: '+(err?.message||err))}finally{bountyBusy=false;if(btn?.isConnected){btn.disabled=false;btn.textContent='Quét bảng';stop.disabled=true}}}}
const BUILD_ELEMENTS=[['auto','Tự động (theo linh căn)'],['kim','Kim'],['moc','Mộc'],['thuy','Thủy'],['hoa','Hỏa'],['tho','Thổ'],['bang','Băng'],['loi','Lôi'],['phong','Phong'],['vo_sac','Vô sắc']];
/* Phái theo chính/tà — khớp BUILD_TAGS trong BuildEngine */
const CHINH_PATHS=[['tu_do','Tự do'],['kiem','Kiếm tu'],['the','Thể tu'],['phat','Phật tu'],['ngu_thu','Ngự thú'],['khoi_loi','Khôi lỗi'],['phu','Phù'],['tran','Trận'],['dan','Đan'],['khi','Luyện bảo']];
const TA_PATHS=[['tu_do','Tự do (tà)'],['ma','Ma / Nghịch'],['doc','Độc / Cổ'],['hop_hoan','Hợp hoan'],['thi','Luyện thi'],['quy','Quỷ']];
const ALL_PATHS=[...CHINH_PATHS,...TA_PATHS.filter(([k])=>k!=='tu_do')];
let buildState={busy:false,results:null,pref:{root:'current',body:'current',mainElement:'auto',subs:[],school:'tu_do',alignment:'chinh',pathWeight:2,ratioTarget:0.5},iters:500};
function buildOptions(a,v){return a.map(([k,n])=>`<option value="${k}" ${String(k)===String(v)?'selected':''}>${n}</option>`).join('')}
function pathsForAlignment(al){
  if(al==='ta')return TA_PATHS;
  if(al==='chinh')return CHINH_PATHS;
  return ALL_PATHS;
}
function detectBuildTraits(){
  const nv=Runtime.character()||{};
  const lc=nv.linhCan??nv.linh_can??null;
  const bodyId=nv.theChat??nv.the_chat??null;
  const he=A(lc&&lc.he);
  return{
    linhCanLabel:linhCanLabel(lc)||'—',
    theChatLabel:theChatLabel(bodyId)||'—',
    heList:he,
    heLabel:he.map(h=>GAME_HE_TEN[h]||ELEMENT_NAMES[h]||h).join(', ')||'—',
    mainGuess:he[0]||'auto'
  };
}
/* Bảng tên lấy trực tiếp từ source game (wN, tt trong bundle) — không bịa */
const GAME_LINH_CAN_PHAM={
  vo:'Vô linh căn',
  tap:'Tạp linh căn',
  song:'Song linh căn',
  thien:'Thiên linh căn',
  bien_di:'Biến dị linh căn'
};
const GAME_HE_TEN={
  kim:'Kim',moc:'Mộc',thuy:'Thủy',hoa:'Hỏa',tho:'Thổ',
  loi:'Lôi',bang:'Băng',phong:'Phong',vo_sac:'Vô sắc'
};
function contentMap(...names){
  for(const n of names){
    const col=C?.[n];
    if(col instanceof Map&&col.size)return col;
    if(col&&typeof col==='object'&&!Array.isArray(col)){
      const keys=Object.keys(col);
      if(keys.length&&keys.some(k=>col[k]&&typeof col[k]==='object'&&(col[k].ten||col[k].id)))return col;
    }
  }
  return null;
}
function contentGet(col,id){
  if(!col||id==null||id==='')return null;
  if(col instanceof Map){
    if(col.has(id))return col.get(id);
    const s=String(id);
    if(col.has(s))return col.get(s);
    return null;
  }
  if(typeof col==='object')return col[id]??col[String(id)]??null;
  return null;
}
function gameItemTen(rec,fallbackId){
  if(rec==null)return'';
  if(typeof rec==='string')return T(rec);
  if(typeof rec==='object'){
    if(typeof rec.ten==='string'&&rec.ten)return T(rec.ten);
  }
  return fallbackId!=null?String(fallbackId):'';
}
/* nv.linhCan = {pham, he[]} — content KHÔNG có Map linhCan (đã xác nhận dump) */
function linhCanLabel(lc){
  if(lc==null||lc==='')return'';
  if(typeof lc==='string'||typeof lc==='number'){
    const k=String(lc);
    return GAME_LINH_CAN_PHAM[k]||k;
  }
  if(typeof lc!=='object')return'';
  const phamKey=lc.pham!=null?String(lc.pham):'';
  const phamTen=GAME_LINH_CAN_PHAM[phamKey]||(phamKey||'');
  const he=A(lc.he).map(h=>GAME_HE_TEN[h]||ELEMENT_NAMES[h]||h).filter(Boolean);
  if(phamTen&&he.length)return`${phamTen} (${he.join(', ')})`;
  if(phamTen)return phamTen;
  if(he.length)return he.join(', ');
  return'';
}
/* nv.theChat = id string → content.theChat.get(id).ten */
function theChatLabel(id){
  if(id==null||id==='')return'';
  if(typeof id==='object'){
    if(typeof id.ten==='string'&&id.ten)return T(id.ten);
    id=id.id||id.key||'';
  }
  const col=contentMap('theChat','the_chat');
  const rec=contentGet(col,id);
  const ten=gameItemTen(rec,null);
  return ten||String(id);
}
function runtimeTraitOptions(kind){
  const nv=Runtime.character()||{};
  if(kind==='root'){
    const lc=nv.linhCan??nv.linh_can??null;
    const label=linhCanLabel(lc);
    return[['current',label?`Hiện tại · ${label}`:'Theo nhân vật hiện tại (chưa có linh căn)']];
  }
  const cur=nv.theChat??nv.the_chat??null;
  const curId=typeof cur==='object'&&cur?(cur.id||cur.key||''):cur;
  const curName=theChatLabel(cur);
  const out=[['current',curName?`Hiện tại · ${curName}`:'Theo nhân vật hiện tại']];
  const col=contentMap('theChat','the_chat');
  if(col instanceof Map){
    for(const[id,rec]of col){
      if(String(id)===String(curId))continue;
      const ten=gameItemTen(rec,null);
      if(ten)out.push([String(id),ten]);
    }
  }else if(col){
    for(const[id,rec]of Object.entries(col)){
      if(String(id)===String(curId))continue;
      const ten=gameItemTen(rec,null);
      if(ten)out.push([String(id),ten]);
    }
  }
  return out;
}
function alignmentPaths(){return[['auto','Theo phái đã chọn'],['chinh','Chính phái'],['ta','Tà phái']]}
function buildCard(mode,title,slot,r){
  if(!r)return'';
  const b=r.best,c=r.current,R=b.R||{},P=b.P||{},delta=(b.score||0)-(c.score||0);
  const rules=b.rules||{},pieces=A(rules.pieces);
  const gen=pieces.filter(x=>N(x.generation)&&x.generation>1).length;
  const conflict=pieces.filter(x=>N(x.generation)&&x.generation<1).length;
  const path=b.path||{},share=b.share||{},audit=b.audit||{},roles=audit.roles||{};
  let grid='';
  try{grid=BuildEngine.drawGrid(BuildEngine.nvNow(),b.manh).replace('class="vk-img"','class="build-grid"')}catch{}
  const pathTags=[];
  if(path.school&&path.school!=='tu_do'){
    pathTags.push(`Phái khớp ${path.match||0}/${path.thong||0}`);
    for(const req of A(path.req))pathTags.push((req.ok?'✓ ':'✗ ')+req.txt);
  }
  if(share.tot){
    const pct=Math.round((share.pct||0)*100);
    pathTags.push(`Tâm ${share.tam||0} · Chiến ${share.chien||0} (${pct}% tâm)`);
  }
  const roleLine=[roles.tam!=null?`Tâm pháp ${roles.tam||0}`:null,roles.dau!=null?`Đấu pháp ${roles.dau||0}`:null,roles.phap!=null?`Pháp khí ${roles.phap||0}`:null,roles.bao!=null?`Bảo vật ${roles.bao||0}`:null].filter(Boolean).join(' · ');
  const tagCls=t=>{
    if(String(t).startsWith('✓'))return'good';
    if(String(t).startsWith('✗'))return'bad';
    return'';
  };
  return`<article class="build-card"><div class="name">${E(title)}</div><div class="sub">Gợi ý mặc định: Bộ ${slot+1} (bạn chọn bộ bên dưới)</div><div class="tags"><span class="tag ${delta>0?'good':''}">${b.same?'Cách hiện tại đã tốt':'Tăng '+F(delta)+' điểm'}</span><span class="tag">${b.wins}/${b.n} trận</span><span class="tag ${(rules.dead||0)?'bad':'good'}">${rules.dead||0} đứt mạch</span><span class="tag">Sinh ${gen} · khắc ${conflict}</span>${rules.evilTotal?`<span class="tag ${rules.evilActive===rules.evilTotal?'good':'warn'}">Tà ${rules.evilActive}/${rules.evilTotal} thông</span>`:''}${pathTags.map(x=>`<span class="tag ${tagCls(x)}">${E(x)}</span>`).join('')}</div><div class="build-stats"><span>Tu luyện<br><b>+${F((R.biDong?.toc_do||0)*100)}%</b></span><span>Đột phá<br><b>+${F((R.biDong?.dot_pha||0)*100)}%</b></span><span>Linh lực/lượt<br><b>${F(P.linhLucMoiLuot||0)}</b></span><span>Điểm nghịch<br><b>${R.diemNghich||0}</b></span><span>Thông mạch<br><b>${b.mq?.connected||0}/${b.manh.length}</b></span><span>Khí huyết<br><b>${F(P.khiHuyetToiDa||0)}</b></span></div>${roleLine?`<div class="sub">Cơ cấu món: ${E(roleLine)}${N(path.taRatio)?` · Tỉ lệ tà ~${F(path.taRatio*100)}%`:''}</div>`:''}${grid}<div class="build-actions"><span class="sub" style="width:100%;margin:0">Xếp vào bộ kinh mạch trong game:</span><button class="red apply-build" data-mode="${E(mode)}" data-slot="0">Bộ 1</button><button class="apply-build" data-mode="${E(mode)}" data-slot="1">Bộ 2</button><button class="apply-build" data-mode="${E(mode)}" data-slot="2">Bộ 3</button></div><details><summary>Kiểm toán mảnh theo lõi game</summary>${pieces.map(x=>`<div class="sub option-row"><span>${E(x.name)} · ${E((x.elements||[]).map(e=>ELEMENT_NAMES[e]||e).join('/')||'')}${x.isEvil?' · tà':''}</span><span>${x.connected?'Thông':'Đứt'} · sinh-khắc ×${F(x.generation||1)} · huyệt ×${F(x.acupoint||1)}</span></div>`).join('')||'<div class="sub">Không có mảnh.</div>'}</details></article>`;
}

function renderBuild(){
  itemTools.style.display='none';
  head.style.display='none';
  const det=detectBuildTraits();
  const al=buildState.pref.alignment||'chinh';
  const pathList=pathsForAlignment(al);
  /* Nếu school hiện tại không thuộc alignment → về tu_do */
  if(!pathList.some(([k])=>k===buildState.pref.school))buildState.pref.school='tu_do';
  const subOptions=BUILD_ELEMENTS.filter(([k])=>k!=='auto'&&!buildState.pref.subs.includes(k)&&k!==buildState.pref.mainElement);
  const nLo=(()=>{try{return(Runtime.character()?.kinhMach?.loadouts||[]).length||1}catch{return 1}})();
  sum.textContent=`Linh căn: ${det.linhCanLabel} · Thể: ${det.theChatLabel} · Hệ: ${det.heLabel} · Bộ KM mở: ${nLo}`;
  list.innerHTML=`<article class="build-card">
<div class="name">Build & Kinh mạch</div>
<div class="sub">Rule thông mạch / hệ số theo lõi game (Rt). Tự nhận linh căn · thể chất · hệ từ save; chỉnh lại nếu cần.</div>

<div class="section-title">1. Nhân vật (tự nhận)</div>
<div class="metric-grid">
  <div>Linh căn<br><b>${E(det.linhCanLabel)}</b></div>
  <div>Thể chất<br><b>${E(det.theChatLabel)}</b></div>
  <div>Hệ linh căn<br><b>${E(det.heLabel)}</b></div>
  <div>Bộ KM đã mở<br><b>${nLo}/3</b></div>
</div>
<div class="build-controls">
  <label>Linh căn (mô phỏng)<select id="build-root">${buildOptions(runtimeTraitOptions('root'),buildState.pref.root)}</select></label>
  <label>Thể chất (mô phỏng)<select id="build-body">${buildOptions(runtimeTraitOptions('body'),buildState.pref.body)}</select></label>
  <label>Hệ chính<select id="build-main-element">${buildOptions(BUILD_ELEMENTS,buildState.pref.mainElement)}</select></label>
</div>
<div class="name" style="margin-top:8px;font-size:12px">Hệ phụ · tối đa 5</div>
<div class="tags" id="build-subs">${buildState.pref.subs.map((h,i)=>`<span class="tag">${E(GAME_HE_TEN[h]||ELEMENT_NAMES[h]||h)} <button type="button" class="remove-sub" data-i="${i}" style="border:0;background:0;color:inherit;padding:0 2px;min-height:0;cursor:pointer">×</button></span>`).join('')||'<span class="sub">Chưa chọn</span>'}
${subOptions.length?`<select id="build-sub-add">${buildOptions(subOptions,'')}</select><button type="button" id="build-add-sub">Thêm</button>`:''}</div>

<div class="section-title">2. Lối tu</div>
<div class="build-controls">
  <label>Chính / Tà<select id="build-alignment">
    <option value="chinh" ${al==='chinh'?'selected':''}>Chính đạo</option>
    <option value="ta" ${al==='ta'?'selected':''}>Tà đạo</option>
  </select></label>
  <label>Lối phái<select id="build-path">${buildOptions(pathList,buildState.pref.school)}</select></label>
  <label>Ép phái<select id="build-path-w">
    <option value="1" ${Number(buildState.pref.pathWeight)===1?'selected':''}>Ưu tiên</option>
    <option value="2" ${Number(buildState.pref.pathWeight)===2?'selected':''}>Ép mạnh</option>
    <option value="3" ${Number(buildState.pref.pathWeight)===3?'selected':''}>Ép + lọc túi</option>
    <option value="0" ${Number(buildState.pref.pathWeight)===0?'selected':''}>Không ép</option>
  </select></label>
  <label>Tâm : Chiến<select id="build-ratio">
    <option value="0.5" ${Number(buildState.pref.ratioTarget)===0.5?'selected':''}>5 : 5</option>
    <option value="0.6" ${Number(buildState.pref.ratioTarget)===0.6?'selected':''}>6 : 4</option>
    <option value="0.4" ${Number(buildState.pref.ratioTarget)===0.4?'selected':''}>4 : 6</option>
    <option value="" ${buildState.pref.ratioTarget===''||buildState.pref.ratioTarget==null?'selected':''}>Không ép</option>
  </select></label>
</div>

<div class="section-title">3. Mức tính & chạy</div>
<div class="build-controls">
  <label>Mức<select id="build-it">
    <option value="250" ${buildState.iters===250?'selected':''}>Nhanh</option>
    <option value="500" ${buildState.iters===500?'selected':''}>Cân bằng</option>
    <option value="900" ${buildState.iters===900?'selected':''}>Tính kỹ</option>
  </select></label>
</div>
<div class="build-actions">
  <button class="red" id="build-go" ${buildState.busy?'disabled':''}>${buildState.busy?'Đang tính…':'Phân tích và sắp xếp'}</button>
  <button id="build-stop" ${buildState.busy?'':'disabled'}>Dừng</button>
  ${buildState.results?`<button id="build-all" class="red">Tự xếp cả 3 bộ (1←Đánh · 2←Tu · 3←Cân)</button>`:''}
</div>
<div class="build-progress"><i id="build-bar" style="width:${buildState.busy?0:0}%"></i></div>
<div class="sub" id="build-msg">${BuildEngine.core?'Lõi game sẵn sàng — bấm Phân tích.':'Lần đầu sẽ nhận diện lõi Rt/Vr/eJ của game.'}</div>
</article>
${buildState.results?buildCard('danh','1. Đánh (chiến đấu)',0,buildState.results.danh)+buildCard('tu','2. Tu luyện & Bế quan',1,buildState.results.tu)+buildCard('can','3. Cân bằng (Đánh + Tu)',2,buildState.results.can):''}`;

  const readPref=()=>{
    const rv=list.querySelector('#build-ratio')?.value;
    const nextAl=list.querySelector('#build-alignment')?.value||'chinh';
    buildState.pref={
      ...buildState.pref,
      root:list.querySelector('#build-root')?.value||'current',
      body:list.querySelector('#build-body')?.value||'current',
      mainElement:list.querySelector('#build-main-element')?.value||'auto',
      school:list.querySelector('#build-path')?.value||'tu_do',
      alignment:nextAl,
      pathWeight:+(list.querySelector('#build-path-w')?.value||2),
      ratioTarget:rv===''||rv==null?null:+rv
    };
  };

  list.querySelector('#build-alignment')?.addEventListener('change',()=>{
    readPref();
    /* Đổi chính/tà → reset school về tu_do trong list mới */
    buildState.pref.school='tu_do';
    renderBuild();
  });
  list.querySelector('#build-add-sub')?.addEventListener('click',()=>{
    readPref();
    const h=list.querySelector('#build-sub-add')?.value;
    if(h&&buildState.pref.subs.length<5&&!buildState.pref.subs.includes(h)&&h!==buildState.pref.mainElement)buildState.pref.subs.push(h);
    renderBuild();
  });
  list.querySelectorAll('.remove-sub').forEach(x=>x.onclick=()=>{buildState.pref.subs.splice(+x.dataset.i,1);renderBuild()});
  list.querySelector('#build-go').onclick=async()=>{
    readPref();
    buildState.iters=+(list.querySelector('#build-it')?.value||500);
    buildState.busy=true;renderBuild();
    const msg=list.querySelector('#build-msg'),bar=list.querySelector('#build-bar');
    try{
      await BuildEngine.ensureCore(x=>{if(msg)msg.textContent=x});
      buildState.results=await BuildEngine.optimizeThree(buildState.pref,buildState.iters,(f,m,l)=>{
        if(bar)bar.style.width=Math.round(f*100)+'%';
        if(msg)msg.textContent=`${m==='danh'?'Đánh':m==='tu'?'Tu luyện & Bế quan':'Cân bằng'} · ${l} · ${Math.round(f*100)}%`;
      });
    }catch(e){
      console.error(e);
      alert('Lỗi Build: '+(e?.message||e));
    }finally{
      buildState.busy=false;renderBuild();
    }
  };
  list.querySelector('#build-stop').onclick=()=>BuildEngine.stop();
  list.querySelector('#build-all')?.addEventListener('click',()=>{
    const rs=BuildEngine.applyAll();
    alert(rs.map((x,i)=>`Bộ ${i+1}: ${x.msg}`).join('\\n'));
    refresh();
  });
  list.querySelectorAll('.apply-build').forEach(x=>x.onclick=()=>{
    const r=BuildEngine.apply(x.dataset.mode,+x.dataset.slot);
    alert(r.msg);
    refresh();
  });
}
function renderPeople(){renderPeopleBase();const relations=[...new Set(people.map(x=>x.relation).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));list.insertAdjacentHTML('afterbegin',`<article class="section-card"><div class="control-grid"><label>Tìm kiếm<input id="people-search" value="${E(peopleQuery)}" placeholder="Tên, quan hệ, vị trí, sở thích"></label><label>Trạng thái<select id="people-life"><option value="all">Tất cả</option><option value="Còn sống" ${peopleLife==='Còn sống'?'selected':''}>Còn sống</option><option value="Đã khuất" ${peopleLife==='Đã khuất'?'selected':''}>Đã khuất</option></select></label><label>Giới tính<select id="people-gender"><option value="all">Tất cả</option><option value="Nam" ${peopleGender==='Nam'?'selected':''}>Nam</option><option value="Nữ" ${peopleGender==='Nữ'?'selected':''}>Nữ</option><option value="Chưa rõ" ${peopleGender==='Chưa rõ'?'selected':''}>Chưa rõ</option></select></label><label>Vị trí<select id="people-where"><option value="all">Tất cả</option><option value="near" ${peopleWhere==='near'?'selected':''}>Có thể tương tác ngay</option><option value="runtime" ${peopleWhere==='runtime'?'selected':''}>Đang xuất hiện</option><option value="known" ${peopleWhere==='known'?'selected':''}>Có vị trí</option><option value="unknown" ${peopleWhere==='unknown'?'selected':''}>Chưa rõ tung tích</option></select></label><label>Quan hệ<select id="people-relation"><option value="all">Tất cả</option>${relations.map(x=>`<option value="${E(x)}" ${peopleRelation===x?'selected':''}>${E(x)}</option>`).join('')}</select></label></div><button class="ghost" id="people-reset">Xóa bộ lọc</button></article>`);const apply=()=>{const q=norm(peopleQuery);let shown=0;list.querySelectorAll('article[data-person]').forEach(el=>{const r=people.find(x=>x.key===el.dataset.person),ok=r&&(!q||norm([r.name,r.relation,r.gender,r.location.note,r.giftLikeName,r.giftLike].join(' ')).includes(q))&&(peopleLife==='all'||r.lifeState===peopleLife)&&(peopleGender==='all'||r.gender===peopleGender)&&(peopleWhere==='all'||peopleWhere==='near'&&r.interactions.includes('Có thể gặp mặt')||peopleWhere==='runtime'&&r.location.source==='node'||peopleWhere==='known'&&!!r.slot||peopleWhere==='unknown'&&!r.slot)&&(peopleRelation==='all'||r.relation===peopleRelation);el.style.display=ok?'':'none';if(ok)shown++});sum.textContent=`${shown}/${people.length} nhân mạch · ưu tiên có thể tương tác, sau đó gần đến xa`};apply();const search=list.querySelector('#people-search');search.oninput=()=>{peopleQuery=search.value;apply()};for(const [id,set]of[['#people-life',v=>peopleLife=v],['#people-gender',v=>peopleGender=v],['#people-where',v=>peopleWhere=v],['#people-relation',v=>peopleRelation=v]])list.querySelector(id).onchange=e=>{set(e.target.value);apply()};list.querySelector('#people-reset').onclick=()=>{peopleQuery='';peopleLife=peopleGender=peopleWhere=peopleRelation='all';renderPeople()}}
function renderSect(){renderSectBase();const directory=sectDirectoryRecords(),tiers=[...new Set(directory.map(x=>x.tier))].sort((a,b)=>a.localeCompare(b,'vi'));const title=[...list.querySelectorAll('.section-title')].find(x=>x.textContent.includes('Danh bạ tông môn'));title?.insertAdjacentHTML('beforebegin',`<article class="section-card"><div class="control-grid"><label>Tìm kiếm<input id="sect-search" value="${E(sectQuery)}" placeholder="Tên tông môn, tầng, phái"></label><label>Trạng thái<select id="sect-state"><option value="active" ${sectState==='active'?'selected':''}>Đang tồn tại</option><option value="all" ${sectState==='all'?'selected':''}>Tất cả</option><option value="joined" ${sectState==='joined'?'selected':''}>Tông môn hiện tại</option><option value="destroyed" ${sectState==='destroyed'?'selected':''}>Đã bị tiêu diệt</option></select></label><label>Quy mô<select id="sect-tier"><option value="all">Tất cả</option>${tiers.map(x=>`<option value="${E(x)}" ${sectTier===x?'selected':''}>${E(x)}</option>`).join('')}</select></label></div><button class="ghost" id="sect-reset">Xóa bộ lọc</button></article>`);const apply=()=>{const q=norm(sectQuery);let shown=0;list.querySelectorAll('article[data-sect-slot]').forEach(el=>{const r=directory.find(x=>x.slot===el.dataset.sectSlot),ok=r&&(!q||norm([r.name,r.tier,r.school,r.alignment,r.country].join(' ')).includes(q))&&(sectState==='all'||sectState==='active'&&!r.destroyed||sectState==='destroyed'&&r.destroyed||sectState==='joined'&&r.joined)&&(sectTier==='all'||r.tier===sectTier);el.style.display=ok?'':'none';if(ok)shown++});sum.textContent=`${shown}/${directory.length} tông môn · gần đến xa`};apply();const search=list.querySelector('#sect-search');search.oninput=()=>{sectQuery=search.value;apply()};list.querySelector('#sect-state').onchange=e=>{sectState=e.target.value;apply()};list.querySelector('#sect-tier').onchange=e=>{sectTier=e.target.value;apply()};list.querySelector('#sect-reset').onclick=()=>{sectQuery='';sectState='active';sectTier='all';renderSect()}}
function treasureRecords(){return TickCache.get("treasureRecords",__raw_treasureRecords)}
function treasureResolveSlot(guide){
  if(guide?.diaDanh&&W.hasSlot(guide.diaDanh))return guide.diaDanh;
  const ten=guide?.dia?.ten||null;
  if(ten){
    const hit=nearestSlot(info=>info?.ten===ten||info?.diaDanh?.ten===ten);
    if(hit)return hit;
  }
  if(guide?.tocYeu){
    const hit=nearestSlot(info=>info?.tocYeu===guide.tocYeu);
    if(hit)return hit;
  }
  const x=guide?.dia?.x,y=guide?.dia?.y;
  if(N(x)&&N(y)){
    let best=null,bd=Infinity;
    for(const sl of W.slots||[]){
      if(sl.an||!W.hasSlot(sl.id))continue;
      const d=Math.hypot((sl.x||0)-x,(sl.y||0)-y);
      if(d<bd){bd=d;best=sl.id}
    }
    if(best&&bd<80)return best;
  }
  return null;
}
function treasureScanSave(run=Runtime.run(),meta=g.state?.meta){
  /* Quét flag di_bao_xong_*, relics[], history.namCuoi — cùng hướng với tab Dị Bảo của bản 611 */
  const flags=new Set(),relics=new Set(),history=new Map();
  const visit=(o,d)=>{
    if(!o||typeof o!=='object'||d>8)return;
    if(Array.isArray(o)){if(o.length<8000)for(const x of o)visit(x,d+1);return}
    for(const[k,v]of Object.entries(o)){
      if(typeof k==='string'&&k.startsWith('di_bao_xong_'))flags.add(k.slice('di_bao_xong_'.length));
      if(Array.isArray(v)&&(k==='relics'||k==='newRelics')){
        for(const r of v)if(typeof r==='string'&&r.startsWith('item.'))relics.add(r);
      }else if(v&&typeof v==='object'&&!Array.isArray(v)&&N(v.namCuoi)){
        history.set(k,v);
      }
    }
    for(const v of Object.values(o))visit(v,d+1);
  };
  try{visit(run,0)}catch{}
  try{if(meta)visit(meta,0)}catch{}
  return{flags,relics,history};
}
function treasureOwned(itemId,scan,inventory){
  if(!itemId)return false;
  if(inventory?.owned)return true;
  if(scan?.relics?.has(itemId))return true;
  const short=itemId.replace(/^item\./,'');
  if(scan?.flags?.has(short)||scan?.flags?.has(itemId))return true;
  return false;
}
const TREASURE_STAT_VI={than_thuc:'Thần thức',ngo_tinh:'Ngộ tính',dao_tam:'Đạo tâm',khi_van:'Khí vận',can_cot:'Căn cốt',than_phap:'Thân pháp'};
function treasureCheckLabel(chk){
  if(!chk)return null;
  return String(chk).replace(/^[a-z_]+/,m=>TREASURE_STAT_VI[m]||m);
}
function treasureItemMeta(itemId){
  const it=itemId?C.items?.get?.(itemId):null;if(!it)return null;
  const loai=TYPE_NAMES[it.loai]||it.loai||null;
  const pham=GRADE_NAMES[it.pham_cap||it.phamCap]||null;
  const gia=N(it.gia)?+it.gia:null;
  const bd=it.theo_kiep||it.theoKiep?'Có':(it.bi_dong||it.biDong)?'Bị động':null;
  return{ten:it.ten,loai,pham,gia,bd,he:A(it.he)};
}
function __raw_treasureRecords(){
  const now=Number(Runtime.run()?.nam)||0,run=Runtime.run()||{},nv=Runtime.character()||{};
  const scan=treasureScanSave(run,g.state?.meta);
  const selfRealm=Number(nv.canhGioi??nv.canh_gioi??0);
  const out=[];

  for(const[eventId,guide]of TREASURE_GUIDE){
    const enc=C.encounters?.get?.(eventId)||null;
    const itemId=guide?.relic||null;
    const inventory=itemId?inventoryState(itemId):null;
    const owned=treasureOwned(itemId,scan,inventory);
    const randomLoot=!itemId;
    const meta=treasureItemMeta(itemId);
    const gate=guide?.gate||null;
    const gateOk=!gate||!N(gate[0])||selfRealm>=Number(gate[0]);
    const hc=N(guide?.hoiChieu)?Number(guide.hoiChieu):null;
    const hist=scan.history.get(eventId)||scan.history.get(String(eventId))||null;
    let cdLeft=null;
    if(hist&&hc!=null&&N(hist.namCuoi)&&now<Number(hist.namCuoi)+hc){
      cdLeft=Number(hist.namCuoi)+hc-now;
    }

    const nodes=activeEncounterSlots(eventId)
      .filter(x=>W.hasSlot(x.slot))
      .filter(x=>{
        const node=run.nodes?.[x.slot];
        if(node?.viec)return false;
        if(x.expires!==null&&x.expires<=now)return false;
        return true;
      });

    const base={
      eventId,itemId,itemName:T(meta?.ten||guide?.ten||eventId),
      eventName:T(enc?.ten||guide?.ten||eventId),
      owned,inventory,guide,enc,randomLoot,meta,gate,gateOk,cdLeft,
      checkLabel:treasureCheckLabel(guide?.check),
      chance:N(guide?.chance)?Number(guide.chance):null,
      hoiChieu:hc,baoVe:guide?.baoVe||null,noi:guide?.noi||null
    };

    if(owned&&!nodes.length){
      out.push({...base,key:`owned|${eventId}`,group:'owned',slot:null,travel:null,distance:null,remaining:null,expires:null,canArrive:null,state:'owned',confidence:enc?'content':'guide',placeName:null,routeTask:null});
      continue;
    }
    if(nodes.length){
      for(const x of nodes){
        const travel=+g.travelYears(x.slot),distance=+g.distanceLi(x.slot);
        const remaining=x.expires===null?null:x.expires-now;
        const canArrive=remaining===null||!N(travel)?true:travel<=remaining;
        out.push({...base,key:`runtime|${eventId}|${x.slot}`,group:'runtime',slot:x.slot,travel,distance,remaining,expires:x.expires,canArrive,state:canArrive?'feasible':'unreachable',confidence:'runtime',placeName:safePlaceName(x.slot),routeTask:{type:'encounter',slot:x.slot,encounter:eventId}});
      }
      continue;
    }
    if(cdLeft!=null){
      const slot=treasureResolveSlot(guide);
      out.push({...base,key:`cd|${eventId}`,group:'cooldown',slot,travel:slot?+g.travelYears(slot):null,distance:slot?+g.distanceLi(slot):null,remaining:cdLeft,expires:null,canArrive:null,state:'cooldown',confidence:enc?'content':'guide',placeName:slot?safePlaceName(slot):(guide?.dia?.ten||null),routeTask:null});
      continue;
    }
    if(!gateOk){
      const slot=treasureResolveSlot(guide);
      out.push({...base,key:`lock|${eventId}`,group:'locked',slot,travel:slot?+g.travelYears(slot):null,distance:slot?+g.distanceLi(slot):null,remaining:null,expires:null,canArrive:null,state:'locked',confidence:enc?'content':'guide',placeName:slot?safePlaceName(slot):(guide?.dia?.ten||null),routeTask:null});
      continue;
    }
    const slot=treasureResolveSlot(guide);
    const travel=slot?+g.travelYears(slot):null,distance=slot?+g.distanceLi(slot):null;
    out.push({...base,key:`catalog|${eventId}`,group:randomLoot?'random':'possible',slot,travel,distance,remaining:null,expires:null,canArrive:null,state:'catalog',confidence:enc?'content':'guide',placeName:slot?safePlaceName(slot):(guide?.dia?.ten||null),routeTask:slot?{type:'encounter',slot,encounter:eventId}:null});
  }

  for(const state of specialTreasureStates()){
    const item=C.items?.get?.(state.itemId),special=SPECIAL_TREASURES.get(state.itemId);
    const inv=state.inventory,owned=treasureOwned(state.itemId,scan,inv);
    out.push({key:`special|${state.itemId}`,group:owned?'owned':'hint',eventId:null,itemId:state.itemId,itemName:T(item?.ten||state.itemId),eventName:T(special?.hint||'Nguồn nhận đặc biệt'),owned,inventory:inv,slot:null,travel:null,distance:null,remaining:null,expires:null,canArrive:null,state:owned?'owned':'hint',guide:special,confidence:state.confidence,randomLoot:false,sources:state.sources,placeName:null,routeTask:null,meta:treasureItemMeta(state.itemId),gate:null,gateOk:true,cdLeft:null,checkLabel:null,chance:null,hoiChieu:null,baoVe:null,noi:null});
  }

  const rank={runtime:0,possible:1,random:2,cooldown:3,locked:4,hint:5,owned:6};
  return out.sort((a,b)=>{
    const ra=rank[a.group]??9,rb=rank[b.group]??9;if(ra!==rb)return ra-rb;
    if(a.group==='runtime'){
      const ua=a.state==='unreachable'?1:0,ub=b.state==='unreachable'?1:0;if(ua!==ub)return ua-ub;
      const ta=N(a.travel)?+a.travel:Infinity,tb=N(b.travel)?+b.travel:Infinity;if(ta!==tb)return ta-tb;
      const da=N(a.distance)?+a.distance:Infinity,db=N(b.distance)?+b.distance:Infinity;if(da!==db)return da-db;
      const ma=a.remaining==null?Infinity:+a.remaining,mb=b.remaining==null?Infinity:+b.remaining;if(ma!==mb)return ma-mb;
    }else if(a.group==='cooldown'){
      return (a.remaining??Infinity)-(b.remaining??Infinity);
    }else{
      const ta=N(a.travel)?+a.travel:Infinity,tb=N(b.travel)?+b.travel:Infinity;if(ta!==tb)return ta-tb;
    }
    return String(a.itemName||'').localeCompare(String(b.itemName||''),'vi');
  });
}
function treasureStateLabel(r){
  if(r.group==='runtime')return r.owned?'Đang xuất hiện · đã sở hữu':'Đang xuất hiện';
  if(r.group==='owned')return'Đã nhận';
  if(r.group==='possible')return'Đủ điều kiện · chưa xuất hiện';
  if(r.group==='random')return'Loot ngẫu nhiên';
  if(r.group==='cooldown')return'Chờ hồi chiêu';
  if(r.group==='locked')return'Chưa đủ cảnh giới';
  if(r.group==='hint')return'Nguồn gợi ý';
  return'Chưa xác định';
}
function renderTreasures(){
  const records=treasureRecords();
  const runtime=records.filter(x=>x.group==='runtime');
  const ownedN=records.filter(x=>x.owned).length;
  const totalUnique=new Set(records.map(x=>x.itemId||x.eventId).filter(Boolean)).size;
  const feasible=runtime.filter(x=>x.state!=='unreachable').length;
  sum.textContent=`Đã nhận ${ownedN}/${totalUnique} · ${runtime.length} đang trên bản đồ (${feasible} đến kịp) · gần → xa · ẩn hết hạn · có hồi chiêu & khóa cảnh giới`;
  list.innerHTML=records.map(r=>{
    const tags=[treasureStateLabel(r)];
    if(r.confidence==='runtime')tags.push('Runtime');
    else if(r.confidence==='content')tags.push('Content');
    else if(r.confidence==='guide')tags.push('Registry');
    if(r.randomLoot)tags.push('Không bảo vật cố định');
    if(r.meta?.loai)tags.push(r.meta.loai);
    if(r.meta?.pham)tags.push(r.meta.pham);
    if(N(r.remaining)&&r.group==='runtime'){
      if(r.state==='unreachable')tags.push('Không đến kịp');
      else if(r.remaining<0.25)tags.push('Sắp hết · còn '+fmtDuration(r.remaining));
      else tags.push('Còn '+fmtDuration(r.remaining));
    }
    if(r.group==='cooldown'&&N(r.remaining))tags.push('Còn '+fmtDuration(r.remaining));
    if(N(r.chance))tags.push('Tỉ lệ '+F(r.chance*100)+'%');
    if(N(r.hoiChieu))tags.push('Hồi chiêu '+F(r.hoiChieu)+' năm');
    if(r.gate)tags.push('Cần CG '+r.gate.join('–'));
    const req=[];
    if(r.checkLabel)req.push('Kiểm định: '+r.checkLabel);
    if(r.baoVe)req.push('Canh giữ: '+r.baoVe.ten+(N(r.baoVe.cg)?' · CG '+r.baoVe.cg:''));
    if(N(r.meta?.gia))req.push('Giá ~'+F(r.meta.gia));
    if(r.meta?.bd)req.push('Theo hồn/bị động: '+r.meta.bd);
    const place=r.placeName||(r.slot?safePlaceName(r.slot):null)||r.guide?.dia?.ten||null;
    const sub=[r.eventName,place,r.noi?('Địa hình: '+r.noi):null].filter(Boolean).join(' · ');
    const extra=[];
    if(N(r.remaining)&&N(r.travel)&&r.canArrive&&r.group==='runtime')extra.push('Đến nơi còn khoảng '+fmtDuration(r.remaining-r.travel));
    if(r.inventory?.locations?.length)extra.push('Đang giữ: '+r.inventory.locations.map(x=>x.label).join(', '));
    const tagCls=t=>{
      if(t==='Đang xuất hiện'||t.startsWith('Đang xuất hiện')||t.startsWith('Đủ điều kiện'))return'good';
      if(t==='Đã nhận')return'good';
      if(t==='Không đến kịp'||t.startsWith('Sắp hết')||t==='Chờ hồi chiêu'||t==='Chưa đủ cảnh giới')return'bad';
      if(t==='Loot ngẫu nhiên')return'warn';
      return'';
    };
    let actions='';
    if(r.group==='runtime'&&r.slot){
      actions=`<button class="red treasure-focus-act">Xem đích + đường</button><button class="ghost treasure-route-act">Đường từ vị trí đứng</button>`;
    }else if(r.slot&&(r.group==='possible'||r.group==='random'||r.group==='locked'||r.group==='cooldown')){
      actions=`<button class="ghost treasure-location-act">Xem vị trí</button>`;
    }
    const note=r.group==='possible'?'<div class="risk">Chưa có node runtime. Đủ điều kiện theo registry nhưng game chưa gieo sự kiện trên bản đồ.</div>'
      :r.group==='random'?'<div class="risk">Sự kiện loot ngẫu nhiên — không gắn một bảo vật cố định (theo ghi chú content/611).</div>'
      :r.group==='cooldown'?`<div class="risk">Đã gặp gần đây. Hồi chiêu còn ${fmtDuration(r.remaining)}.</div>`
      :r.group==='locked'?`<div class="risk">Cảnh giới hiện tại chưa đạt mốc ${r.gate?r.gate[0]:'?'}. </div>`
      :r.group==='hint'?`<div class="risk">${E(r.guide?.hint||r.guide?.evidence||'Chỉ rơi từ boss / nguồn đặc biệt — không có encounter cố định.')}</div>`
      :r.state==='unreachable'?`<div class="risk">Thời gian đi (${fmtDuration(r.travel)}) dài hơn hạn còn lại (${fmtDuration(r.remaining)}).</div>`
      :'';
    return`<article data-treasure="${E(r.key)}" data-slot="${E(r.slot||'')}"><div><div class="name">${E(r.itemName)}</div><div class="sub">${E(sub)}</div><div class="tags">${tags.map(x=>`<span class="tag ${tagCls(x)}">${E(x)}</span>`).join('')}</div>${req.length?`<div class="sub">${E(req.join(' · '))}</div>`:''}${extra.length?`<div class="sub">${E(extra.join(' · '))}</div>`:''}${note}</div><div class="travel">${N(r.travel)?`<strong>${fmtDuration(r.travel)}</strong><span>${fmtDistance(r.distance)}</span>`:'<strong>—</strong><span>không có node</span>'}</div><div>${actions}</div></article>`;
  }).join('')||'<p>Không tìm thấy dữ liệu Dị bảo.</p>';
}

function render(){const itemMode=tab==='items';itemTools.style.display=itemMode?'flex':'none';head.style.display=itemMode?'none':'';if(itemMode)return renderItems();if(tab==='build')return renderBuild();if(tab==='breakthrough')return void renderBreakthrough();if(tab==='bounties')return renderBounties();if(tab==='maptasks')return renderMapTasks();if(tab==='treasure')return renderTreasures();if(tab==='people')return renderPeople();if(tab==='sect')return renderSect();const run=g.state.run,seen=A(run.daKhamPha);const a=rows.filter(r=>r.groups.has(tab)).sort(sorter);sum.textContent=`${a.length} mục · gần nhất trước · mục không đến kịp nằm cuối · năm ${F(run.nam)} · ${W.info(run.viTri).ten}${lastScan?` · vừa quét lúc ${lastScan.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:''}`;list.innerHTML=a.map(r=>{const pow=strength(r),sts=[...r.tags,seen.includes(r.slot)?'Đã khám phá':'Chưa khám phá'];if(r.x.catalog)sts.unshift('Chưa xuất hiện');else sts.unshift('Đang xuất hiện');if(r.rare){sts.unshift(r.x.catalog?'Chưa xuất hiện':'Dị bảo đang xuất hiện');if(r.x.catalog)sts.unshift('Có thể xuất hiện tại đây');if(r.rare.chance.length)sts.push('Tỉ lệ '+r.rare.chance.map(x=>F(x*100)+'%').join('/'));else if(N(r.rare.guide?.chance))sts.push('Khả năng xuất hiện khoảng '+F(r.rare.guide.chance*100)+'%');if(r.rare.cooldown)sts.push('Có thể thử lại sau '+F(r.rare.cooldown)+' năm');if(r.rare.guide?.baoVe)sts.push('Bảo vệ: '+r.rare.guide.baoVe.ten+' · cảnh giới '+r.rare.guide.baoVe.cg);if(r.rare.guide?.check)sts.push('Yêu cầu: '+r.rare.guide.check)}if(r.expires!==null)sts.push(r.remain>0?'Đến kịp':'Không kịp');const gain=[...r.meta.gain];if(r.x.rareItem?.length)for(const id of r.x.rareItem)gain.unshift(C.items.get(id)?.ten||id);for(let i=gain.length-1;i>=0;i--)if(gain.indexOf(gain[i])!==i)gain.splice(i,1);if(N(r.x.congHien))gain.push(`${F(r.x.congHien)} cống hiến`);if(r.rare?.items?.length)for(const id of r.rare.items)gain.unshift(C.items.get(id)?.ten||id);const risk=[...r.meta.risk],time=r.expires===null?'':r.remain>0?`Còn ${fmtDuration(r.remain)} khi đến`:`Trễ ${fmtDuration(-r.remain)}`,cls=r.remain===null?'':r.remain<=0?'bad':r.remain<.25?'warn':'good',act=r.src==='Ngọc giản tông môn'?'Nhận nhiệm vụ':r.x.catalog?'Xem địa điểm':'Xem trên bản đồ';return`<article data-k="${E([r.slot,r.x.id||'',r.src].join('|'))}"><div><div class="name">${E(T(r.x.ten||r.e.ten||r.enc))}</div><div class="tags">${sts.map(x=>`<span class="tag ${x==='Đến kịp'?'good':x==='Không kịp'?'bad':''}">${E(x)}</span>`).join('')}${time?`<span class="tag ${cls}">${E(time)}</span>`:''}</div><div class="sub">${E(r.info.ten)} · ${E(r.src)} · ${fmtDistance(r.dist)}</div>${r.x.catalog?'<div class="risk">Chưa xuất hiện trong runtime. Địa điểm này chỉ là gợi ý từ catalog game.</div>':''}<div class="sub">${E(repeat(r))}</div>${r.rare?.checks?.length?`<div class="sub">Yêu cầu: ${E(r.rare.checks.map(x=>x.stat+' '+x.difficulty).join(', '))}</div>`:''}<div class="gain">Có thể được: ${E(gain.join(', ')||'Chưa xác định')}</div>${risk.length?`<div class="risk">Có thể mất: ${E(risk.join(', '))}</div>`:''}</div><div class="travel"><strong>${fmtDuration(r.travel)}</strong><span>${fmtDistance(r.dist)}</span></div><div><div class="${pow[1]}">${E(pow[0])}</div><button class="red act">${act}</button></div></article>`}).join('')||(tab==='treasure'?'<p><strong>Không tìm thấy địa điểm dị bảo phù hợp trong bản đồ hiện tại.</strong></p>':'<p>Không có mục phù hợp.</p>')}
let lastScan=null;function refresh(){if(refreshing){refreshQueued=true;return}refreshing=true;try{TickCache.begin((typeof runtimeSignature==='function'?runtimeSignature():null)||(String(g.state.run?.nam)+'|'+g.state.run?.viTri+'|'+Object.keys(g.state.run?.nodes||{}).length));if(hallOpen())syncSect();rows=addRows();places=collectPlaceRecords();randoms=collectRandomRecords();quests=collectQuestRecords();people=collectPeopleRecords();itemInventoryIndex=inventorySnapshot();lastScan=new Date();updateTabCounts();render()}finally{refreshing=false;if(refreshQueued){refreshQueued=false;scheduleRefresh(40)}}}function scheduleRefresh(delay=90){clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,Math.max(0,delay))}function hide(){savePos?.();p.style.display='none';b.style.display='block'}function show(){b.style.display='none';p.style.display='flex';dockPanel?.();render();if(pendingRefresh)scheduleRefresh(0)}
p.addEventListener('pointerdown',e=>{if(e.target.closest('button,select,input'))e.stopPropagation()});p.addEventListener('pointerup',e=>{if(e.target.closest('button,select,input'))e.stopPropagation()});p.addEventListener('touchend',e=>{if(e.target.closest('button,select,input'))e.stopPropagation()},{passive:true});nav.onclick=e=>{const x=e.target.closest('[data-t]');if(!x)return;tab=x.dataset.t;sessionStorage.setItem('veh3-tab',tab);nav.querySelectorAll('.tab').forEach(y=>y.classList.toggle('on',y===x));render()};[itemType,itemGrade,itemElement,itemSchool].forEach(x=>x.onchange=render);let itemInputTimer=null;itemSearch.oninput=()=>{clearTimeout(itemInputTimer);itemInputTimer=setTimeout(render,250)};itemSearchClear.onclick=()=>{itemSearch.value='';itemSearch.focus();render()};itemFilterToggle.onclick=()=>{const open=itemFilterDrawer.classList.toggle('open');itemFilterToggle.setAttribute('aria-expanded',String(open))};p.querySelector('#item-filter-reset').onclick=()=>{[itemType,itemGrade,itemElement,itemSchool].forEach(x=>x.value='all');render()};p.querySelector('#item-filter-done').onclick=()=>{itemFilterDrawer.classList.remove('open');itemFilterToggle.setAttribute('aria-expanded','false');itemSearch.focus()};const phoneLayout=()=>matchMedia('(max-width:1099px),(pointer:coarse)').matches;const isMobile=phoneLayout;const posKey='vktool-mobile-pos',launcherKey='vktool-launcher-pos';let mobileMax=true;const clamp=(v,a,z)=>Math.max(a,Math.min(z,v));function dockPanel(){if(!phoneLayout()){p.style.left=p.style.top=p.style.right=p.style.bottom=p.style.width=p.style.height=p.style.maxWidth=p.style.margin=p.style.transform='';return}const vv=window.visualViewport;const left=vv?vv.offsetLeft:0,top=vv?vv.offsetTop:0,w=vv?vv.width:innerWidth,h=vv?vv.height:innerHeight;p.style.position='fixed';p.style.left=left+'px';p.style.top=top+'px';p.style.right='auto';p.style.bottom='auto';p.style.width=Math.max(1,Math.round(w))+'px';p.style.height=Math.max(1,Math.round(h))+'px';p.style.maxWidth='none';p.style.margin='0';p.style.transform='none';p.classList.add('mobile-max');mobileMax=true}function applySavedPos(){dockPanel()}function envTop(){return 0}function savePos(){if(!isMobile()||mobileMax)return;const r=p.getBoundingClientRect();sessionStorage.setItem(posKey,JSON.stringify({x:Math.round(r.left),y:Math.round(r.top)}))}function toggleMobileSize(){if(!isMobile())return;mobileMax=!mobileMax;p.classList.toggle('mobile-max',mobileMax);const bt=p.querySelector('#mobile-size');bt.textContent=mobileMax?'Thu':'Phóng';bt.setAttribute('aria-label',mobileMax?'Thu nhỏ cửa sổ':'Phóng to cửa sổ');if(!mobileMax)requestAnimationFrame(applySavedPos)}function makeDraggable(el,handle,key,isPanel){let drag=null,moved=false,suppressTimer=null;const down=e=>{if(e.button!==0||(isPanel&&e.target.closest('button,input,select,summary,a'))||(!isPanel&&e.target.closest('input,select,summary,a'))||(isPanel&&(!isMobile()||mobileMax)))return;const r=el.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top,w:r.width,h:r.height};moved=false;el.classList.add('dragging');handle.setPointerCapture?.(e.pointerId);e.preventDefault()},move=e=>{if(!drag||e.pointerId!==drag.id)return;const x=clamp(e.clientX-drag.dx,0,Math.max(0,innerWidth-drag.w)),y=clamp(e.clientY-drag.dy,0,Math.max(0,innerHeight-drag.h));el.style.left=x+'px';el.style.top=y+'px';if(!isPanel){el.style.right='auto';el.style.bottom='auto'}moved=true;e.preventDefault()},end=e=>{if(!drag||e.pointerId!==drag.id)return;el.classList.remove('dragging');try{handle.releasePointerCapture?.(e.pointerId)}catch{}if(moved){const r=el.getBoundingClientRect();sessionStorage.setItem(key,JSON.stringify({x:Math.round(r.left),y:Math.round(r.top)}));el.dataset.suppressClick='1';clearTimeout(suppressTimer);suppressTimer=setTimeout(()=>delete el.dataset.suppressClick,80)}drag=null};handle.addEventListener('pointerdown',down);handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);return()=>{clearTimeout(suppressTimer);for(const[type,listener]of[['pointerdown',down],['pointermove',move],['pointerup',end],['pointercancel',end]])handle.removeEventListener(type,listener)}}const cleanupPanelDrag=makeDraggable(p,p.querySelector('header'),posKey,true),cleanupLauncherDrag=makeDraggable(b,b,launcherKey,false);const oldLauncherClick=show;b.onclick=e=>{if(b.dataset.suppressClick)return;e?.preventDefault?.();oldLauncherClick()};p.querySelector('#mobile-size').onclick=toggleMobileSize;p.querySelector('#hide').onclick=hide;const onResize=()=>dockPanel();addEventListener('resize',onResize);addEventListener('orientationchange',()=>setTimeout(dockPanel,80));window.visualViewport?.addEventListener('resize',dockPanel);window.visualViewport?.addEventListener('scroll',dockPanel);requestAnimationFrame(()=>{dockPanel();try{const o=JSON.parse(sessionStorage.getItem(launcherKey)||'null');if(o){const r=b.getBoundingClientRect();b.style.left=clamp(o.x,0,Math.max(0,innerWidth-r.width))+'px';b.style.top=clamp(o.y,0,Math.max(0,innerHeight-r.height))+'px';b.style.right='auto';b.style.bottom='auto'}}catch{}});
p.onclick=e=>{if(e.target.classList.contains('bounty-receive-map')||e.target.classList.contains('bounty-work-map')){e.preventDefault();e.stopPropagation();const slot=e.target.dataset.slot;if(!slot||!W.hasSlot(slot))return alert('Vị trí treo thưởng không còn hợp lệ.');const ok=showSafeRoute(slot);setTimeout(()=>{if(ok)hide();else alert('Không thể đặt tâm bản đồ vào vị trí này.')},120);return}if(e.target.classList.contains('add-item-act')){e.preventDefault();e.stopPropagation();const id=e.target.dataset.id;const r=grantBagItem(id);alert(r.msg);if(r.ok)refresh();return}if(e.target.classList.contains('item-source-act')){e.preventDefault();e.stopPropagation();const id=e.target.dataset.id,box=e.target.parentElement?.querySelector('.item-source-box');if(!id||!box)return;box.textContent='Đang quét nguồn…';setTimeout(()=>{const lines=compactItemSources(buildItemSources([id]).get(id)||[]);box.innerHTML=lines.map(x=>'• '+E(x)).join('<br>')||'Chưa tìm thấy nguồn rõ ràng.'},0);return}if(e.target.classList.contains('treasure-focus-act')||e.target.classList.contains('treasure-route-act')||e.target.classList.contains('treasure-location-act')){e.preventDefault();e.stopPropagation();const key=e.target.closest('article')?.dataset.treasure,r=treasureRecords().find(x=>x.key===key),slot=r?.slot;if(!r||!slot||!W.hasSlot(slot))return alert('Vị trí Dị bảo không còn hợp lệ.');if(e.target.classList.contains('treasure-focus-act')){if(!showSafeRoute(slot,r.routeTask,{focus:'target'}))alert('Không tìm được tuyến đường tới Dị bảo.');return}if(e.target.classList.contains('treasure-route-act')){if(r.group!=='runtime')return alert('Dị bảo chưa xuất hiện trong runtime.');if(!showSafeRoute(slot,r.routeTask,{focus:'start'}))alert('Không tìm được đường an toàn.');return}/* location-act: chỉ focus vị trí catalog */clearRouteOverlay();const ok=focusMap(slot);if(ok)setTimeout(hide,120);else alert('Không thể lia bản đồ tới vị trí Dị bảo.');return}if(e.target.classList.contains('map-focus-act')||e.target.classList.contains('map-safe-route-act')){e.preventDefault();e.stopPropagation();const key=e.target.closest('article')?.dataset.mapTask,task=mapTaskRecords().find(x=>x.key===key),slot=task?.slot;if(!task||!slot||!W.hasSlot(slot))return alert('Mục tiêu bản đồ không còn tồn tại.');if(task.routeTask&&!mapTaskRouteAlive(task.routeTask))return alert('Mục tiêu bản đồ không còn tồn tại.');if(e.target.classList.contains('map-focus-act')){/* Vẽ đường an toàn + focus điểm đích */if(!showSafeRoute(slot,task.routeTask,{focus:'target'}))alert('Không tìm được tuyến đường tới mục tiêu (có thể hai điểm không nối được trên bản đồ).');return}/* Đường an toàn: vẽ đường + focus vị trí nhân vật đang đứng */if(!showSafeRoute(slot,task.routeTask,{focus:'start'}))alert('Không tìm được tuyến đường an toàn tới mục tiêu.');return}if(e.target.classList.contains('safe-route-act')){e.preventDefault();e.stopPropagation();const slot=e.target.closest('article')?.dataset.slot;if(slot&&!showSafeRoute(slot))alert('Không tìm được tuyến đường an toàn.');return}if(e.target.classList.contains('quest-act')){e.preventDefault();e.stopPropagation();const key=e.target.closest('article')?.dataset.quest,quest=quests.find(x=>x.key===key),slot=quest?.slot;if(!slot||!W.hasSlot(slot))return alert('Vị trí nhiệm vụ không còn hợp lệ.');const ok=focusMap(slot);if(ok)setTimeout(hide,120);else alert('Không thể lia bản đồ tới nhiệm vụ.');return}if(e.target.classList.contains('gift-act')){e.preventDefault();e.stopPropagation();const key=e.target.closest('article')?.dataset.person,person=people.find(x=>x.key===key);if(!person?.giftLike||!person.giftKnown)return;tab='items';sessionStorage.setItem('veh3-tab',tab);nav.querySelectorAll('.tab').forEach(button=>button.classList.toggle('on',button.dataset.t===tab));const exact=['dan_duoc','phap_khi','cong_phap','phu_luc'].includes(person.giftLike);itemType.value=exact&&[...itemType.options].some(option=>option.value===person.giftLike)?person.giftLike:'all';itemSearch.value=exact?'':person.giftLikeName||person.giftLike;render();return}if(e.target.classList.contains('sect-focus-act')||e.target.classList.contains('sect-route-act')){e.preventDefault();e.stopPropagation();const slot=e.target.closest('article')?.dataset.sectSlot||e.target.dataset.slot;const r=slot?sectDirectoryRecords().find(x=>x.slot===slot):null;if(!r||r.destroyed||!W.hasSlot(slot))return alert('Tông môn không còn vị trí hoạt động hợp lệ.');if(e.target.classList.contains('sect-route-act')){if(!showSafeRoute(slot,null,{focus:'start'}))alert('Không tìm được đường an toàn tới tông môn.');return}if(!showSafeRoute(slot,null,{focus:'target'}))alert('Không tìm được đường tới tông môn.');return}if(e.target.classList.contains('person-focus-act')||e.target.classList.contains('person-route-act')||e.target.classList.contains('person-gift-act')){e.preventDefault();e.stopPropagation();const key=e.target.closest('article')?.dataset.person,person=collectPeopleRecords().find(x=>x.key===key);if(!person)return alert('Thông tin Nhân mạch không còn hợp lệ.');if(e.target.classList.contains('person-gift-act')){tab='items';sessionStorage.setItem('veh3-tab',tab);nav.querySelectorAll('.tab').forEach(y=>y.classList.toggle('on',y.dataset.t===tab));const exact=['dan_duoc','phap_khi','cong_phap','phu_luc'].includes(person.giftLike);itemType.value=exact&&[...itemType.options].some(option=>option.value===person.giftLike)?person.giftLike:'all';itemSearch.value=exact?'':person.giftLikeName||person.giftLike||'';render();return}const slot=person.slot;if(person.lifeState!=='Còn sống'||!slot||!W.hasSlot(slot))return alert('Người này không có vị trí hoạt động hợp lệ.');if(e.target.classList.contains('person-route-act')){if(!showSafeRoute(slot,null,{focus:'start'}))alert('Không tìm được đường an toàn.');return}if(!showSafeRoute(slot,null,{focus:'target'}))alert('Không tìm được đường tới Nhân mạch.');return}
if(e.target.classList.contains('random-act')){e.preventDefault();e.stopPropagation();const key=e.target.closest('article')?.dataset.random,r=randoms.find(x=>x.key===key),slot=r?.slot;if(!slot||!W.hasSlot(slot))return alert('Vị trí sự kiện không còn hợp lệ.');const ok=showSafeRoute(slot,null,{focus:'target'});setTimeout(()=>{if(ok)hide();else alert('Không thể đặt tâm bản đồ vào sự kiện.')},180);return}
if(e.target.classList.contains('place-act')){e.preventDefault();e.stopPropagation();const slot=e.target.closest('article')?.dataset.place;if(!slot||!W.hasSlot(slot))return alert('Địa điểm không còn hợp lệ.');const ok=showSafeRoute(slot,null,{focus:'target'});setTimeout(()=>{if(ok)hide();else alert('Không thể đặt tâm bản đồ vào địa điểm.')},180);return}
if(!e.target.classList.contains('act'))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const art=e.target.closest('article'),key=art.dataset.k,r=rows.find(x=>[x.slot,x.x.id||'',x.src].join('|')===key);if(!r)return;if(r.src==='Ngọc giản tông môn'){if(!g.state.run.tongMon)return alert('Nhân vật chưa gia nhập tông môn.');if(!hallOpen())return alert('Hãy mở Điện nhiệm vụ → Xem ngọc giản nhiệm vụ để nhận.');g.nhanViec(r.x.id);setTimeout(refresh,120);return}if(!W.hasSlot(r.slot))return alert('Địa điểm không còn hợp lệ.');const ok=showSafeRoute(r.slot,null,{focus:'target'});setTimeout(()=>{if(ok)hide();else alert('Không thể đặt tâm bản đồ vào mục tiêu.')},180)};
let syncTimer=null,lastSect='';const autoSync=()=>{clearTimeout(syncTimer);syncTimer=setTimeout(()=>{if(!hallOpen())return;const list=syncSect(),sig=list.map(x=>x.id).join('|');if(list.length&&sig!==lastSect){lastSect=sig;scheduleRefresh(40)}},120)};const observer=new MutationObserver(autoSync);observer.observe(document.body,{childList:true,subtree:true});autoSync();let pendingRefresh=false;const unsub=g.store.subscribe((n,o)=>{if(n.run!==o.run&&document.getElementById(ID)){syncSafeRoute(n.run);syncBountyPlan(n.run);autoSync();if(p.style.display==='none')pendingRefresh=true;else scheduleRefresh(80)}});const originalShow=show;show=()=>{originalShow();pendingRefresh=false};window.__VK_EVENT_HUNTER__={version:V,buildId:BUILD,loadedAt:new Date().toISOString(),Runtime,evalCondition,inventoryLocations,inventoryState,encounterAvailability,treasureState,treasureStates,acquisitionState,specialTreasureStates,allTreasureStates,activeEncounterSlots,mapEventType,placeType,placeRecord,collectPlaceRecords,placeTimeState,collectRandomRecords,questRecord,collectQuestRecords,npcLocation,collectPeopleRecords,giftItemMatch,giftItems,BuildEngine,routeSafe,drawRouteOverlay,clearRouteOverlay,itemCategory,itemGameData,capabilities:{mobileLayout:true,draggableMobile:true,runtimeAdapter:true,conditionEngine:true,treasureGuide:true,questModel:true,peopleModel:true,peopleRenderer:true,giftItemLink:true,itemSearch:true,safeRoute:true,mapRouteOverlay:true,sectDirectory:true,tickCache:true,treasureStatusModel:true,peopleSectOptimize:true},refresh,show,hide,close:()=>{try{unsub();observer.disconnect();removeEventListener('resize',onResize);cleanupPanelDrag();cleanupLauncherDrag();clearTimeout(syncTimer);clearTimeout(refreshTimer);clearTimeout(itemInputTimer);clearRouteOverlay();BuildEngine.stop();TickCache.clear()}catch{}p.remove();b.remove()}};console.info(`[VKTool] Đã nạp ${BUILD}. Kiểm tra: __VK_EVENT_HUNTER__.buildId`);refresh();syncSafeRoute();
})();
