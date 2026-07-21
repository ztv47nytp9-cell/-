let state = loadState();
let page = "home";
let selectedWarehouse = null;
let draftItems = [];
let draftEquipmentItems = [];
let editingId = null;
let registerMode = "normal";
let registerFlow = "출고";
let warehouseTab = "material";
let warehouseViewMode = "warehouses";
let allResourceQuery = "";
let allResourceCategory = "all";
let allResourceWarehouse = "all";
let historyFilter = "all";
let historyDateFilter = "all";
let historyFlowFilter = "all";
let historyCustomFrom = "";
let historyCustomTo = "";
let homeActivityTab = "history";
let editingMemoId = null;
let restoringNavigation = false;
let globalSearchQuery = "";
let maintenanceDraftParts = [];
let sharedSnapshot = null;
let materialSortMode = "name";
let equipmentSortMode = "name";
let resourceSelectionMode = false;
let selectedResources = new Set();
let techniqueQuery = "";
let modalConfirmResolver = null;
let menuHistoryOpen = false;
let cloudShareNotice = null;
let cloudShareCheckInFlight = false;
let lastCloudShareCheckAt = 0;
let lockedMenuScrollY = 0;
let scrollLockReasons = new Set();
let lockedTouchY = 0;
let pageTouchY = 0;
let menuCloseTimer = null;
let appInfoCloseTimer = null;
const REGISTER_DRAFT_KEY = "victor_register_draft_0_19_0j";
const CLOUD_SHARE_CONFIG_KEY = "victor_cloud_share_config_0_19_0m";
const CLOUD_SHARE_META_KEY = "victor_cloud_share_meta_0_19_0m";
const CLOUD_APPLY_SAFETY_KEY = "victor_cloud_apply_safety_0_19_0m";
const CLOUD_UPLOAD_PIN_HASH_KEY = "victor_cloud_upload_pin_hash_0_19_0m";
const THEME_MODE_KEY = "victor_theme_mode_0_19_0m";
const DEVICE_ID_KEY = "victor_device_id_0_19_0m";
const DEFAULT_CLOUD_SHARE_CONFIG = {
  url:"https://vzwzkeqxkqlrctylspxz.supabase.co",
  key:"sb_publishable_8X3VXnF63hNSUzYf14lDfg_IBj-PD72",
  siteId:"victor-main",
  title:"Victor 자원현황"
};
let registerDraftTimer = null;
let registerFormDraft = null;
let pendingRegisterDraft = null;
let themeRefreshTimer = null;
const stockEditReasons = ["재고조사","오기입 수정","폐기","파손","전산 수정","기타"];
const LOCATION_TYPES = ["항포구","해상","선박명","기타 위치"];
const EVIDENCE_FIELDS = [
  {key:"oilSheen",label:"유막",options:["확인 안함","있음","없음"]},
  {key:"smell",label:"냄새",options:["확인 안함","있음","없음"]},
  {key:"outlet",label:"배출구",options:["확인 안함","확인","미확인"]},
  {key:"sample",label:"시료 채취",options:["해당 없음","채취","미채취"]},
  {key:"statement",label:"관계자 진술",options:["확인 안함","확보","미확보"]}
];
const RESPONSE_TECH_ITEMS = [
  {id:"flooded-vessel",title:"침수선박",tags:["침수","기관실","빌지","선박"],summary:"선박 내부로 해수가 유입되어 연료·윤활유·빌지수가 외부로 나올 가능성이 있는 상황",check:["선명·위치·침수 구역","연료탱크·윤활유·빌지 상태","배수 작업 여부와 배출수 색상","방제자원 접근 가능 여부"],initial:["현장 안전 확보와 관계기관 상황 공유","오염 가능 배출구·배수 방향 확인","필요 시 오일펜스·흡착재 준비","배수 전후 사진과 배출수 상태 기록"],evidence:["선박 외관, 침수부, 배출구, 수면 유막","배수 시작·종료 시각","조치 전후 비교 사진"],resources:["오일펜스","유흡착재","폐흡착재 임시보관 용기","기름채취병"],report:["상황 발생 위치와 시간","배수 여부","오염 발견 여부","사용 자재와 회수량"],memo:"직원 검토용 초안입니다. 실제 문구는 내부 지침 기준으로 다듬어야 합니다."},
  {id:"sunken-vessel",title:"침몰선박",tags:["침몰","잔존유","인양","장기관리"],summary:"선박이 수면 아래로 침몰해 잔존유 유출 가능성과 장기 감시가 필요한 상황",check:["침몰 위치·수심·선종","잔존 연료 추정량","유출 흔적과 확산 방향","인양·봉쇄 가능성"],initial:["초기 유막 확인과 확산 방향 기록","필요 시 주변 해역 방제자원 배치 검토","잔존유 제거 또는 인양 관련 협의사항 기록","반복 순찰·관찰 지점 설정"],evidence:["위치도, 유막 범위, 항공/해상 사진","주변 양식장·민감해역 여부","일자별 유출 변화"],resources:["오일펜스","유흡착재","방제정","드론/촬영 장비","기름채취병"],report:["침몰선박 기본정보","유출 여부와 확산 범위","관계기관 협의사항","향후 감시 계획"],memo:"장기화될 수 있으므로 시간대별 기록 구조가 중요합니다."},
  {id:"bilge-discharge",title:"빌지 배출 의심",tags:["빌지","배출","기관실","유성혼합물"],summary:"선박에서 빌지 또는 유성혼합물이 바다로 배출된 것으로 의심되는 상황",check:["배출 위치와 배출구","배출수 색상·냄새·유막","기관실 빌지 상태","선박 작업·운항 이력"],initial:["배출 중이면 즉시 중단 요청","수면 유막과 배출구 사진 확보","필요 시 시료 채취와 흡착 조치","선장·기관장 진술 및 작업내용 기록"],evidence:["배출구 근접 사진","수면 유막 사진","기관실 빌지 상태","시료 채취 위치"],resources:["기름채취병","유흡착재","폐기물 봉투/용기","기록 양식"],report:["배출 추정 시각","배출량 추정 근거","조치내용","시료·사진 확보 여부"],memo:"증거 확보 흐름을 명확히 만드는 게 핵심입니다."},
  {id:"smoke-soot",title:"매연·검댕",tags:["매연","검댕","대기오염","선박"],summary:"선박에서 과다 매연, 검댕, 그을음 등이 발생해 민원 또는 오염 우려가 있는 상황",check:["발생 선박과 위치","발생 시간·지속시간","연기 색상과 방향","주변 민원·피해 여부"],initial:["사진·영상으로 발생 상태 기록","선박 작업상태와 연료 사용 여부 확인","반복 발생 여부 확인","필요 시 관계부서 공유"],evidence:["동영상, 연기 색상, 시간 표시 사진","민원 내용","선박 작업상황"],resources:["촬영 장비","민원 기록","선박 확인 자료"],report:["발생 시간대","연기 형태","선박 확인 결과","후속 조치 필요 여부"],memo:"해양오염과 대기·기관 점검 영역이 겹칠 수 있어 분류 기준 검토가 필요합니다."},
  {id:"paint",title:"페인트·도장작업",tags:["페인트","도장","분진","폐도료"],summary:"선박 도장작업 중 페인트, 분진, 폐도료가 해상으로 유입될 우려가 있는 상황",check:["작업 위치와 작업 방식","비산·낙하 방지 조치","폐도료·폐자재 보관상태","해상 유입 흔적"],initial:["작업 중 오염 가능성 확인","방지막·받침 등 예방조치 여부 기록","해상 유입 시 확산 방지와 회수 검토","폐기물 보관·처리 흐름 확인"],evidence:["작업 전경, 방지막, 해상 낙하물","폐도료 보관상태","작업자 진술"],resources:["뜰채/회수도구","폐기물 봉투/용기","흡착재","촬영 장비"],report:["작업 내용","유입 여부","회수량","재발 방지 조치"],memo:"현장 작업 관리 기준을 직원 의견으로 보강하면 좋습니다."},
  {id:"waste",title:"폐기물 투기·유출",tags:["폐기물","투기","부유물","폐흡착재"],summary:"폐기물, 폐흡착재, 작업 부산물 등이 해상 또는 항포구에 유입된 상황",check:["폐기물 종류와 양","발생원 추정","해상 유입 여부","회수·보관 가능 여부"],initial:["확산 전 사진·위치 기록","안전하게 회수 가능한지 판단","회수 후 임시보관과 처리 경로 확인","발생원 조사 필요사항 정리"],evidence:["폐기물 형태, 위치, 수량","라벨·표식·선박명 등 단서","회수 전후 사진"],resources:["수거망","폐기물 봉투/용기","장갑","집게","차량"],report:["폐기물 종류","회수량","처리 경로","발생원 확인 여부"],memo:"처리 경로와 보관 장소까지 한 화면에 넣을지 검토 필요합니다."},
  {id:"oil-sheen",title:"유막·기름 유출",tags:["유막","기름","유출","방제"],summary:"수면에 유막 또는 기름 흔적이 확인되어 확산 방지와 원인 확인이 필요한 상황",check:["유막 범위와 색상","조류·풍향·확산 방향","주변 선박·시설","시료 채취 필요 여부"],initial:["유막 범위 사진과 위치 기록","확산 가능성이 크면 오일펜스·흡착재 검토","원인 선박·시설 확인","회수량과 사용 자재 기록"],evidence:["전체 범위 사진, 근접 사진","위치·시간·기상","시료 채취 정보"],resources:["오일펜스","유흡착재","방제정","기름채취병","폐기물 용기"],report:["유출 추정 원인","확산 범위","방제 조치","회수량"],memo:"현재 앱의 자재·장비 사용기록과 가장 잘 연결되는 상황입니다."}
];

const view = document.getElementById("view");

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function fmtDate(s){
  if(!s) return "";
  const [y,m,d] = s.split("-");
  return `${y}.${m}.${d}`;
}

function dateMs(value){
  if(!value) return 0;
  const text=String(value);
  const parsed=/^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T23:59:59+09:00`) : new Date(text);
  const time=parsed.getTime();
  return Number.isFinite(time) ? time : 0;
}

function koreaDateParts(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return null;
  const parts=Object.fromEntries(new Intl.DateTimeFormat("ko-KR",{
    timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
  }).formatToParts(date).map(part=>[part.type,part.value]));
  return parts;
}

function monthStartISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}

function yesterdayISO(){
  const d = new Date();
  d.setDate(d.getDate()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function qtyText(q,u){
  return `${Number(q).toLocaleString("ko-KR",{maximumFractionDigits:1})} ${u}`;
}

function materialQtyText(q,u,item){
  const base=qtyText(q,u),n=Number(q||0);
  return u==="L" && isDispersant(item) && n>0 && n%18===0 ? `${n.toLocaleString("ko-KR",{maximumFractionDigits:1})}L · ${n/18}캔` : base;
}

function readThemeMode(){
  try{return localStorage.getItem(THEME_MODE_KEY) || "light";}catch(_){return "light";}
}

function isNightTime(){
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
}

function resolveThemeMode(mode=readThemeMode()){
  if(mode === "dark") return "dark";
  if(mode === "system") return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  if(mode === "auto") return isNightTime() ? "dark" : "light";
  return "light";
}

function applyThemeMode(mode=readThemeMode()){
  const resolved = resolveThemeMode(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  document.getElementById("themeColorMeta")?.setAttribute("content", resolved === "dark" ? "#152232" : "#1565C0");
  document.getElementById("appleStatusBarMeta")?.setAttribute("content", resolved === "dark" ? "black-translucent" : "default");
}

function saveThemeMode(mode){
  try{localStorage.setItem(THEME_MODE_KEY,mode);}catch(_){}
  applyThemeMode(mode);
  const labels={light:"밝게",dark:"어둡게",system:"기기 설정",auto:"야간 자동"};
  showFeedback("success",`화면 설정: ${labels[mode] || "밝게"}`);
}

function startThemeWatcher(){
  clearInterval(themeRefreshTimer);
  themeRefreshTimer = setInterval(()=>applyThemeMode(), 5 * 60 * 1000);
  window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change",()=>applyThemeMode());
}

function isMeaningfulRegisterDraft(draft){
  if(!draft) return false;
  if((draft.items || []).length || (draft.equipmentItems || []).length) return true;
  if(String(draft.memo || "").trim()) return true;
  if(String(draft.locationDetail || "").trim()) return true;
  if(draft.mode === "normal" && String(draft.title || "").trim()) return true;
  return false;
}
function readRegisterDraft(){try{const draft=JSON.parse(localStorage.getItem(REGISTER_DRAFT_KEY)||"null");return isMeaningfulRegisterDraft(draft)?draft:null;}catch(_){return null;}}
function clearRegisterDraft(){clearTimeout(registerDraftTimer);registerFormDraft=null;pendingRegisterDraft=null;try{localStorage.removeItem(REGISTER_DRAFT_KEY);}catch(_){}}
function captureRegisterDraft(){
  if(page!=="register")return;
  const value=id=>document.getElementById(id)?.value||"";
  const evidence=Object.fromEntries(EVIDENCE_FIELDS.map(field=>[field.key,value(`evidence_${field.key}`)]));
  registerFormDraft={mode:registerMode,flow:registerFlow,type:value("recType"),warehouse:value("recWarehouse"),date:value("recDate"),title:value("recTitle"),locationType:value("recLocationType"),locationDetail:value("recLocationDetail"),memo:value("recMemo"),evidence,items:draftItems.map(item=>({...item})),equipmentItems:draftEquipmentItems.map(item=>({...item})),savedAt:new Date().toISOString()};
  if(!isMeaningfulRegisterDraft(registerFormDraft)){try{localStorage.removeItem(REGISTER_DRAFT_KEY);}catch(_){};registerFormDraft=null;return;}
  try{localStorage.setItem(REGISTER_DRAFT_KEY,JSON.stringify(registerFormDraft));}catch(error){console.warn("[Victor] 작성 중 기록 저장 실패",error);}
}
function scheduleRegisterDraft(){clearTimeout(registerDraftTimer);registerDraftTimer=setTimeout(captureRegisterDraft,700);}

function integerUnit(unit){ return ["개","대","세트"].includes(unit); }
function isDispersant(item){ return String(item?.cat || "").includes("유처리제") || String(item?.name || "").includes("유처리제"); }

function collapsedGroups(){state.ui=state.ui||{};state.ui.collapsedGroups=state.ui.collapsedGroups||{};return state.ui.collapsedGroups;}
function groupKey(scope,name){return `${scope}:${name}`;}
function groupedSection(scope,name,count,content,forceOpen=false){const collapsed=!forceOpen&&Boolean(collapsedGroups()[groupKey(scope,name)]);return `<section class="group-section ${collapsed?"collapsed":""}"><button class="group-heading ${scope==="history"?"history-group-heading":""}" data-group-toggle="${esc(groupKey(scope,name))}" type="button"><span>${esc(name)} <small>${count}</small></span><span>${collapsed?"›":"⌄"}</span></button><div class="group-content">${content}</div></section>`;}
function bindGroupedSections(rerender){view.querySelectorAll("[data-group-toggle]").forEach(button=>button.addEventListener("click",()=>{const key=button.dataset.groupToggle;collapsedGroups()[key]=!collapsedGroups()[key];save();rerender();}));view.querySelectorAll("[data-groups-all]").forEach(button=>button.addEventListener("click",event=>{const keys=[...view.querySelectorAll("[data-group-toggle]")].map(toggle=>toggle.dataset.groupToggle),collapse=event.currentTarget.dataset.groupsAll==="collapse";keys.forEach(key=>collapsedGroups()[key]=collapse);save();rerender();}));}
function groupToolbar(sortMode,scope){return `<div class="group-toolbar"><label>정렬<select data-group-sort="${scope}"><option value="name" ${sortMode==="name"?"selected":""}>이름순</option><option value="qty" ${sortMode==="qty"?"selected":""}>수량순</option><option value="recent" ${sortMode==="recent"?"selected":""}>최근 수정순</option></select></label><button class="btn gray compact" data-groups-all="expand" type="button">전체 펼치기</button><button class="btn gray compact" data-groups-all="collapse" type="button">전체 접기</button></div>`;}
function isTodayChanged(item){return String(item.updatedAt||item.updated||"").slice(0,10)===todayISO();}

function currentNavigationState(extra={}){
  const nav={page};
  if(page==="warehouse"){
    nav.view=warehouseViewMode;
    if(selectedWarehouse){nav.warehouse=selectedWarehouse;nav.tab=warehouseTab;}
  }
  if(page==="register"){nav.mode=registerMode;nav.flow=registerFlow;}
  if(page==="memo"&&editingMemoId)nav.memoId=editingMemoId;
  return {...nav,...extra};
}

function showSnack(msg,type="info"){
  const s = document.getElementById("snackbar");
  if(!s) return;
  s.textContent = msg;
  s.classList.remove("success","warning","error","info");
  s.classList.add("show",type);
  clearTimeout(window.__snackTimer);
  window.__snackTimer = setTimeout(() => s.classList.remove("show"), 1800);
}

function showUndoSnack(msg,stateSnapshot,onRestored){
  const snackbar=document.getElementById("snackbar"); if(!snackbar) return;
  snackbar.classList.remove("success","warning","error","info"); snackbar.classList.add("show","info");
  snackbar.innerHTML=`<span>${esc(msg)}</span><button id="undoSnack" type="button">실행 취소</button>`;
  clearTimeout(window.__snackTimer);
  document.getElementById("undoSnack")?.addEventListener("click",()=>{
    try{ state=normalize(JSON.parse(stateSnapshot)); save(); refreshGlobals(state); snackbar.classList.remove("show"); snackbar.textContent=""; if(onRestored) onRestored(); showFeedback("success","삭제를 되돌렸습니다"); }catch(error){ showFeedback("error","되돌리지 못했습니다"); }
  });
  window.__snackTimer=setTimeout(()=>{snackbar.classList.remove("show"); snackbar.textContent="";},5000);
}

function showFeedback(type,msg){
  showSnack(msg,type);
}

function backupLabel(){
  if(!state.lastBackup) return "데이터 백업 · 아직 없음";
  const date = new Date(state.lastBackup);
  if(Number.isNaN(date.getTime())) return "데이터 백업";
  return `데이터 백업 · ${date.getMonth()+1}.${date.getDate()}`;
}

function updateBackupLabel(){
  const button = document.getElementById("backupBtn");
  if(button) button.textContent = backupLabel();
}

function scrollToTop(){
  try{ window.scrollTo({top:0,left:0,behavior:"instant"}); }catch(e){ try{ window.scrollTo(0,0); }catch(_){} }
}

function updateBottomNav(){
  document.querySelectorAll(".nav").forEach(button => button.classList.toggle("active", button.dataset.page === page));
}

function pushNavigationState(nav){
  if(restoringNavigation) return;
  try{ window.history.pushState({victor:true,...nav}, ""); }catch(e){}
}

function replaceNavigationState(nav){
  if(restoringNavigation) return;
  try{ window.history.replaceState({victor:true,...nav}, ""); }catch(e){}
}


function setPage(next, options={}){
  page = next;
  selectedWarehouse = null;
  editingId = null;
  if(next !== "register") registerMode = "normal";
  if(next === "warehouse") warehouseViewMode = "warehouses";
  if(next !== "memo") editingMemoId = null;
  updateBottomNav();
  render();
  scrollToTop();
  if(options.push !== false) pushNavigationState({page:next});
}

function setHead(){
  const h = document.getElementById("headTitle");
  const date = new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",weekday:"short"});
  if(page === "home") h.innerHTML = `<div class="logo-block"><div class="logo-main">VICTOR</div><div class="logo-sub">Marine Pollution Response</div><div class="logo-ko">방제자원 관리 시스템</div></div>`;
  if(page === "warehouse") h.innerHTML = `<div class="page-title">보관</div><div class="date">전체 보관 장소 ${warehouses.length}개</div>`;
  if(page === "register") h.innerHTML = `<div class="page-title">${registerMode === "quick" ? "긴급기록" : "등록"}</div><div class="date">${registerMode === "quick" ? "현장 사용량 임시 저장" : "평상시 출고·입고 기록"}</div>`;
  if(page === "history") h.innerHTML = `<div class="page-title">이력</div><div class="date">출고·입고·긴급기록</div>`;
  if(page === "memo") h.innerHTML = `<div class="page-title">메모</div><div class="date">일자별 메모 관리</div>`;
  if(page === "technique") h.innerHTML = `<div class="page-title">방제기술</div><div class="date">상황별 조치요령 초안</div>`;
}
function render(){
  setHead();
  if(page === "home") renderHome();
  if(page === "warehouse") renderWarehouse();
  if(page === "register") renderRegister();
  if(page === "history") renderHistory();
  if(page === "memo") renderMemo();
  if(page === "technique") renderTechniqueInfo();
}

function lowStockCount(){
  return 0;
}

function getRecent(n=3){
  return [...state.records].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id)).slice(0,n);
}

function recordRow(r){
  const cls = r.status === "pending" ? "red" : (r.type === "사고" ? "blue" : (r.type.includes("지급") ? "green" : "orange"));
  const statusText = r.status === "pending" ? "미반영" : r.type;
  return `<button class="list-row" data-detail="${r.id}" type="button">
    <div>
      <div><span class="badge ${cls}">${esc(statusText)}</span></div>
      <div class="row-title" style="margin-top:7px">${esc(r.title)}</div>
      <div class="row-sub">${fmtDate(r.date)} | ${r.warehouse ? esc(r.warehouse) : "보관 미지정"}</div>
    </div>
    <div class="chev">›</div>
  </button>`;
}

function pendingRecords(){
  return state.records.filter(r => r.status === "pending");
}

function doneRecords(){
  return state.records.filter(r => r.status !== "pending");
}


function totalByMatcher(matcher){
  return warehouses.reduce((sum,w) => {
    const bucket = state.stock[w] || {};
    return sum + catalog.filter(i => matcher(i)).reduce((a,i) => a + Number(bucket[i.name] || 0), 0);
  }, 0);
}

function totalStorageSummary(){
  const absorbent = totalByMatcher(i => i.cat.includes("유흡착재") || i.name.includes("흡착재") || i.name.includes("부착재"));
  const boom = totalByMatcher(i => i.cat.includes("오일펜스") || i.name.includes("오일펜스"));
  const dispersant = totalByMatcher(i => i.name.includes("유처리제") || i.cat.includes("유처리제"));
  return {absorbent, boom, dispersant};
}

function storageSummaryCard(clickable=false){
  const s = totalStorageSummary();
  const tag = clickable ? "button" : "div";
  return `<${tag} class="summary-card${clickable ? " summary-link" : ""}" ${clickable ? 'id="homeStorageSummary" type="button"' : ""}>
    <div class="section-title">전체 보관량</div>
    <div class="summary-grid">
      <div class="summary-pill"><div class="summary-label">흡착재</div><div class="summary-value">${Number(s.absorbent).toLocaleString("ko-KR")}kg</div></div>
      <div class="summary-pill"><div class="summary-label">오일펜스</div><div class="summary-value">${Number(s.boom).toLocaleString("ko-KR")}m</div></div>
      <div class="summary-pill"><div class="summary-label">유처리제</div><div class="summary-value">${materialQtyText(s.dispersant,"L",{name:"유처리제"})}</div></div>
    </div>
  </${tag}>`;
}

function ensureWarehouse(name){
  name = String(name || "").trim();
  if(!name) return false;
  if(!state.warehouses.includes(name)){
    state.warehouses.push(name);
    state.stock[name] = {};
    state.catalog.forEach(i => state.stock[name][i.name] = 0);
    state.warehouseInfos[name] = {memo:"", updated:""};
    refreshGlobals(state);
    save();
  }
  return true;
}

function ensureCatalogItem(item){
  if(!item || !item.name) return false;
  if(!state.catalog.some(x => x.name === item.name)){
    state.catalog.push(item);
    state.warehouses.forEach(w => {
      if(!state.stock[w]) state.stock[w] = {};
      state.stock[w][item.name] = 0;
    });
    refreshGlobals(state);
    save();
  }
  return true;
}

function stockAvailable(warehouse, items){
  return items.every(it => (state.stock[warehouse]?.[it.name] || 0) >= Number(it.qty || 0));
}

function stockShortageMessage(warehouse,items){
  const shortage = items.map(item => ({...item,lack:Math.max(0,Number(item.qty || 0)-Number(state.stock[warehouse]?.[item.name] || 0))})).find(item => item.lack > 0);
  return shortage ? `${shortage.name} ${materialQtyText(shortage.lack,shortage.unit,shortage)} 부족` : "재고가 부족합니다";
}

function applyStock(warehouse, items, flow){
  items.forEach(it => {
    if(!state.stock[warehouse]) state.stock[warehouse] = {};
    if(!(it.name in state.stock[warehouse])) state.stock[warehouse][it.name] = 0;
    if(flow === "입고") state.stock[warehouse][it.name] += Number(it.qty || 0);
    else state.stock[warehouse][it.name] -= Number(it.qty || 0);
  });
}

function stockChangeItems(warehouse, items, flow){
  return (items || []).map(item => {
    const before = Number(state.stock[warehouse]?.[item.name] || 0);
    const diff = flow === "입고" ? Number(item.qty || 0) : -Number(item.qty || 0);
    return {...item,before,after:before+diff,diff};
  });
}

function reverseStock(warehouse, items, flow){
  items.forEach(it => {
    if(!state.stock[warehouse]) state.stock[warehouse] = {};
    if(!(it.name in state.stock[warehouse])) state.stock[warehouse][it.name] = 0;
    if(flow === "입고") state.stock[warehouse][it.name] -= Number(it.qty || 0);
    else state.stock[warehouse][it.name] += Number(it.qty || 0);
  });
}

function createFlowRecord({flow,type,title,date,warehouse,memo,items,equipmentItems=[],checklist=[],targetWarehouse="",status="done",sourceId=null,quick=false,officialTitle=true,createdAt=null,appliedAt=null,location=null,evidence=null}){
  return {
    id:uid(), flow, type, title, date, warehouse, memo, status, sourceId, quick, officialTitle,
    createdAt:createdAt || new Date().toISOString(), appliedAt, targetWarehouse, checklist, location, evidence,
    items:items.map(x=>({...x})), equipmentItems:equipmentItems.map(x=>({...x}))
  };
}

function recentMemos(n=3){
  return [...state.memos].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id)).slice(0,n);
}

function startHomeRegister(mode,flow="출고"){
  const saved=readRegisterDraft();
  pendingRegisterDraft=saved;
  registerFormDraft=null;
  draftItems = [];
  draftEquipmentItems = [];
  registerMode = mode;
  registerFlow = flow;
  page = "register";
  selectedWarehouse = null;
  editingId = null;
  updateBottomNav();
  render();
  pushNavigationState({page:"register",mode,flow});
}

function homeActivityHtml(){
  if(homeActivityTab === "memo"){
    const memos = recentMemos(3);
    return memos.length ? memos.map(memo => `
      <button class="list-row" data-home-memo="${memo.id}" type="button">
        <div><div class="row-title">${esc(memo.title)}</div><div class="row-sub">${fmtDate(memo.date)} · ${esc((memo.body || "").slice(0,55))}</div></div><div class="chev">›</div>
      </button>`).join("") : `<div class="emptybox">아직 메모가 없습니다.</div>`;
  }
  const recent = getRecent(3);
  return recent.length ? recent.map(recordRow).join("") : `<div class="emptybox">아직 기록이 없습니다.</div>`;
}

function readCloudShareMeta(){
  try{return JSON.parse(localStorage.getItem(CLOUD_SHARE_META_KEY)||"{}")||{};}catch(_){return {};}
}

function saveCloudShareMeta(patch){
  try{localStorage.setItem(CLOUD_SHARE_META_KEY,JSON.stringify({...readCloudShareMeta(),...patch}));}catch(error){console.warn("[Victor] 클라우드 메타 저장 실패",error);}
}

function readCloudUploadPinHash(){
  try{return localStorage.getItem(CLOUD_UPLOAD_PIN_HASH_KEY)||"";}catch(_){return "";}
}

function saveCloudUploadPinHash(hash){
  try{
    const value=String(hash||"");
    if(value)localStorage.setItem(CLOUD_UPLOAD_PIN_HASH_KEY,value);
    else localStorage.removeItem(CLOUD_UPLOAD_PIN_HASH_KEY);
  }catch(error){
    console.warn("[Victor] 올리기 PIN 저장 실패",error);
    showFeedback("error","PIN 설정을 저장하지 못했습니다");
  }
}

function currentCloudUploadPinHash(){
  return readCloudUploadPinHash() || readCloudShareMeta().uploadPinHash || "";
}

async function syncCloudUploadPinFromLatest(){
  if(currentCloudUploadPinHash()) return true;
  try{
    const snapshot=await fetchLatestCloudShareSnapshot();
    const pinHash=typeof snapshot?.uploadPinHash==="string"?snapshot.uploadPinHash:"";
    if(!pinHash) return false;
    saveCloudUploadPinHash(pinHash);
    saveCloudShareMeta({uploadPinHash:pinHash,uploadPinUpdatedAt:snapshot.uploadPinUpdatedAt || ""});
    return true;
  }catch(error){
    console.warn("[Victor] 클라우드 PIN 동기화 실패",error);
    return false;
  }
}

async function hashUploadPin(pin){
  const value=String(pin||"").trim();
  if(!/^\d{4}$/.test(value)) throw new Error("PIN은 숫자 4자리로 입력해주세요");
  const source=`victor-upload-pin:${value}`;
  if(window.crypto?.subtle && window.TextEncoder){
    const data=new TextEncoder().encode(source);
    const hash=await crypto.subtle.digest("SHA-256",data);
    return Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,"0")).join("");
  }
  let hash=2166136261;
  for(const ch of source){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return `fallback-${(hash>>>0).toString(16)}`;
}

async function verifyCloudUploadPin(pin){
  const hash=currentCloudUploadPinHash();
  if(!hash) return false;
  try{return await hashUploadPin(pin)===hash;}catch(_){return false;}
}

function bindPinNumberInput(id){
  const input=document.getElementById(id);
  if(!input)return;
  input.addEventListener("input",()=>{input.value=String(input.value||"").replace(/\D/g,"").slice(0,4);});
}

function victorDeviceId(){
  try{
    let id=localStorage.getItem(DEVICE_ID_KEY);
    if(!id){id=`dev-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36).slice(-4)}`;localStorage.setItem(DEVICE_ID_KEY,id);}
    return id;
  }catch(_){return "dev-local";}
}

function victorDeviceLabel(){
  const ua=navigator.userAgent||"";
  const kind=/iPhone|iPad/i.test(ua)?"iPhone/iPad":/Android/i.test(ua)?"Android":/Windows/i.test(ua)?"Windows PC":/Macintosh/i.test(ua)?"Mac":"기기";
  return `${kind} · ${victorDeviceId().slice(-4)}`;
}

function readCloudApplySafetyPoint(){
  try{return JSON.parse(localStorage.getItem(CLOUD_APPLY_SAFETY_KEY)||"null");}catch(_){return null;}
}

function createCloudApplySafetyPoint(snapshot){
  try{
    localStorage.setItem(CLOUD_APPLY_SAFETY_KEY,JSON.stringify({
      label:"공유자료 가져오기 전",
      createdAt:new Date().toISOString(),
      cloudAt:snapshot?.cloudUpdatedAt || snapshot?.cloudSharedAt || snapshot?.createdAt || "",
      state:stripStoredPhotos(JSON.parse(JSON.stringify(state)))
    }));
    return true;
  }catch(error){
    showFeedback("error","공유 적용 전 안전지점을 만들지 못했습니다");
    return false;
  }
}

async function restoreCloudApplySafetyPoint(){
  const point=readCloudApplySafetyPoint();
  if(!point?.state){showFeedback("info","되돌릴 공유 적용 내역이 없습니다");return;}
  if(!await askConfirm("공유 적용 되돌리기",`${fmtDateTime(point.createdAt)} 적용 전 상태로 되돌릴까요?`,"되돌리기",true))return;
  state=normalize(point.state);
  save();
  localStorage.removeItem(CLOUD_APPLY_SAFETY_KEY);
  saveCloudShareMeta({lastAppliedAt:null,lastAppliedSource:null,lastAppliedCloudAt:null});
  refreshGlobals(state);
  page="home";
  updateBottomNav();
  render();
  scrollToTop();
  showFeedback("success","공유자료 가져오기를 되돌렸습니다");
}

function fmtDateTime(value){
  if(!value) return "없음";
  const text=String(value);
  if(/^\d{4}-\d{2}-\d{2}$/.test(text)) return fmtDate(text);
  const parts=koreaDateParts(text);
  if(!parts) return "없음";
  const today=koreaDateParts(new Date());
  const sameDay=today && parts.year===today.year && parts.month===today.month && parts.day===today.day;
  return `${sameDay?"오늘":`${Number(parts.month)}.${Number(parts.day)}`} ${parts.hour}:${parts.minute}`;
}

function fmtShareTime(value){
  const text=fmtDateTime(value);
  return text==="없음" ? "기록 없음" : text;
}

function cloudShareStatusHtml(){
  const meta=readCloudShareMeta();
  const upload=fmtShareTime(meta.lastUploadedAt);
  const applied=fmtShareTime(meta.lastAppliedAt);
  const safety=readCloudApplySafetyPoint();
  return `<div class="cloud-share-status"><span>올림 기록 ${esc(upload)}</span><span>가져옴 기록 ${esc(applied)}</span></div>${safety?`<button class="cloud-undo-btn" id="undoCloudApply" type="button">방금 적용 되돌리기</button>`:""}`;
}

function cloudShareNoticeHtml(){
  if(!cloudShareNotice) return "";
  const summary=cloudShareNotice.summary || {};
  const tone=cloudShareNotice.kind==="new" ? "new" : "same";
  const text=cloudShareNotice.kind==="new" ? "새 공유자료 있음" : "공유자료 최신 상태";
  return `<div class="cloud-notice ${tone}">
    <div><strong>${text}</strong><span>${esc(fmtDateTime(summary.date))} · 보관 ${Number(summary.warehouses||0)}곳 · 자재 ${Number(summary.materials||0)}종 · 장비 ${Number(summary.equipment||0)}개</span></div>
    ${cloudShareNotice.kind==="new"?`<button class="btn primary compact" id="applyCloudNotice" type="button">적용하기</button>`:`<button class="btn gray compact" id="checkCloudNotice" type="button">다시 확인</button>`}
  </div>`;
}

function renderHome(){
  const pending = pendingRecords().length;
  view.innerHTML = `
    ${storageSummaryCard(true)}
    <div class="card global-search-card">
      <input class="search" id="globalSearch" value="${esc(globalSearchQuery)}" placeholder="자재·장비·창고 통합 찾기" aria-label="통합 찾기">
      <div id="globalSearchResults"></div>
    </div>
    <div class="home-quick card">
      <div class="section-title">바로 등록</div>
      <div class="home-quick-grid">
        <button class="quick-action emergency" id="homeQuickEmergency" type="button"><span>🚨</span><strong>긴급기록</strong></button>
        <button class="quick-action" id="homeQuickOut" type="button"><span>↗</span><strong>출고</strong></button>
        <button class="quick-action" id="homeQuickIn" type="button"><span>↙</span><strong>입고</strong></button>
      </div>
    </div>
    <div class="card">
      <div class="section-title">자주 쓰는 기능</div>
      <div class="home-tool-grid">
        <button id="homeAllResources" type="button"><span>📦</span><strong>자재·장비</strong></button>
        <button id="homeShareResources" type="button"><span>☁️</span><strong>자원 공유</strong></button>
        <button id="homePending" type="button"><span>🚨</span><strong>미반영 ${pending}건</strong></button>
        <button id="homeMemoShortcut" type="button"><span>📝</span><strong>새 메모</strong></button>
      </div>
    </div>
    <div class="section-head"><div class="section-title">최근 활동</div><button class="link-btn" id="goActivityAll">전체보기 ›</button></div>
    <div class="activity-tabs"><button class="${homeActivityTab === "history" ? "active" : ""}" id="homeActivityHistory" type="button">이력</button><button class="${homeActivityTab === "memo" ? "active" : ""}" id="homeActivityMemo" type="button">메모</button></div>
    ${homeActivityTab === "memo" ? `<button class="btn primary" id="homeNewMemo" type="button" style="width:100%;margin-bottom:10px">+ 새 메모 작성</button>` : ""}
    <div class="list-card">${homeActivityHtml()}</div>
  `;
  document.getElementById("globalSearch")?.addEventListener("input", event => { globalSearchQuery=event.target.value; renderGlobalSearchResults(); });
  renderGlobalSearchResults();
  document.getElementById("homeQuickEmergency")?.addEventListener("click", () => startHomeRegister("quick"));
  document.getElementById("homeQuickOut")?.addEventListener("click", () => startHomeRegister("normal","출고"));
  document.getElementById("homeQuickIn")?.addEventListener("click", () => startHomeRegister("normal","입고"));
  document.getElementById("homeStorageSummary")?.addEventListener("click", () => openStorageView("materials"));
  document.getElementById("homeAllResources")?.addEventListener("click", () => openStorageView("materials"));
  document.getElementById("homeShareResources")?.addEventListener("click", openCloudShareActions);
  document.getElementById("homePending")?.addEventListener("click", () => { historyFilter = "pending"; historyDateFilter = "all"; historyFlowFilter = "all"; setPage("history"); });
  document.getElementById("homeMemoShortcut")?.addEventListener("click", () => { editingMemoId=null; setPage("memo"); });
  document.getElementById("homeActivityHistory")?.addEventListener("click", () => { homeActivityTab="history"; renderHome(); });
  document.getElementById("homeActivityMemo")?.addEventListener("click", () => { homeActivityTab="memo"; renderHome(); });
  document.getElementById("goActivityAll")?.addEventListener("click", () => { if(homeActivityTab === "memo") setPage("memo"); else { historyFilter="all"; setPage("history"); } });
  document.getElementById("homeNewMemo")?.addEventListener("click", () => { editingMemoId=null; setPage("memo"); });
  view.querySelectorAll("[data-detail]").forEach(button => button.addEventListener("click", () => openDetail(button.dataset.detail)));
  view.querySelectorAll("[data-home-memo]").forEach(button => button.addEventListener("click", () => { editingMemoId=button.dataset.homeMemo; page="memo"; updateBottomNav(); render(); pushNavigationState({page:"memo",memoId:editingMemoId}); }));
  checkCloudShareNotice({silent:true});
}

function openStorageView(mode){
  page="warehouse";
  selectedWarehouse=null;
  warehouseViewMode=mode;
  updateBottomNav();
  render();
  scrollToTop();
  pushNavigationState({page:"warehouse",view:mode});
}

function globalSearchRows(){
  const query = globalSearchQuery.trim().toLowerCase();
  if(!query) return [];
  const rows = [];
  warehouses.forEach(name => {
    const memo = state.warehouseInfos?.[name]?.memo || "";
    if([name,memo].join(" ").toLowerCase().includes(query)) rows.push({kind:"warehouse",id:name,title:name,sub:"창고"});
  });
  catalog.forEach(item => {
    if([item.name,item.spec,item.memo,item.cat].join(" ").toLowerCase().includes(query)) rows.push({kind:"material",id:item.name,title:item.name,sub:`자재 · ${item.spec || item.cat}`});
  });
  (state.equipment || []).forEach(item => {
    if(equipmentSearchText(item).includes(query)) rows.push({kind:"equipment",id:item.id,title:item.name,sub:`장비 · ${item.place || "보관 미지정"}`});
  });
  return rows.slice(0,8);
}

function renderGlobalSearchResults(){
  const target = document.getElementById("globalSearchResults");
  if(!target) return;
  const rows = globalSearchRows();
  if(!globalSearchQuery.trim()){
    target.innerHTML = `<div class="global-search-hint">이름·규격·메모·창고명으로 찾을 수 있습니다.</div>`;
    return;
  }
  target.innerHTML = rows.length ? `<div class="global-search-list">${rows.map(row => `<button class="list-row" data-global-kind="${row.kind}" data-global-id="${esc(row.id)}" type="button"><div><div class="row-title">${esc(row.title)}</div><div class="row-sub">${esc(row.sub)}</div></div><div class="chev">›</div></button>`).join("")}</div>` : `<div class="global-search-hint">검색 결과가 없습니다.</div>`;
  target.querySelectorAll("[data-global-kind]").forEach(button => button.addEventListener("click", () => {
    const kind = button.dataset.globalKind;
    const id = button.dataset.globalId;
    globalSearchQuery = "";
    if(kind === "warehouse"){
      page="warehouse"; warehouseViewMode="warehouses"; selectedWarehouse=id; warehouseTab="material"; updateBottomNav(); render(); scrollToTop(); pushNavigationState({page:"warehouse",warehouse:id,tab:"material"});
    }else if(kind === "material"){
      page="warehouse"; warehouseViewMode="materials"; selectedWarehouse=null; updateBottomNav(); render(); scrollToTop(); openAllMaterialDetail(id); pushNavigationState({page:"warehouse",view:"materials"});
    }else openEquipment(id);
  }));
}

function warehouseSummary(w){
  const materialCount = catalog.filter(i => (state.stock[w]?.[i.name] || 0) > 0).length;
  const equipmentCount = (state.equipment || []).filter(item => item.place === w && Number(item.qty || 0) > 0).length;
  return {materialCount,equipmentCount};
}

function whIcon(){
  return "🏢";
}

function warehouseViewSwitcher(){
  return `<div class="storage-view-switch-space"><div class="storage-view-switch">
    <button data-storage-view="warehouses" class="${warehouseViewMode === "warehouses" ? "active" : ""}" type="button">창고별 보기</button>
    <button data-storage-view="materials" class="${warehouseViewMode === "materials" ? "active" : ""}" type="button">전체 자재</button>
    <button data-storage-view="equipment" class="${warehouseViewMode === "equipment" ? "active" : ""}" type="button">전체 장비</button>
    <button data-storage-view="hns" class="${warehouseViewMode === "hns" ? "active" : ""}" type="button">HNS</button>
  </div></div>`;
}

function warehouseActions(place=""){
  return "";
}

function bindWarehouseActions(place=""){
  document.getElementById("transferMaterial")?.addEventListener("click", openMaterialTransferForm);
}

function bindWarehouseViewSwitcher(){
  view.querySelectorAll("[data-storage-view]").forEach(button => button.addEventListener("click", () => {
    resourceSelectionMode=false;
    selectedResources.clear();
    warehouseViewMode = button.dataset.storageView;
    selectedWarehouse = null;
    allResourceQuery = "";
    allResourceCategory = "all";
    allResourceWarehouse = "all";
    renderWarehouse();
    replaceNavigationState({page:"warehouse",view:warehouseViewMode});
  }));
}

function resourceFilterControls(categories,placeholder){
  return `<div class="resource-filters">
    <input class="search" id="allResourceSearch" value="${esc(allResourceQuery)}" placeholder="${esc(placeholder)}">
    <div class="history-filter-grid">
      <label>카테고리<select id="allResourceCategory"><option value="all">전체 카테고리</option>${categories.map(cat => `<option value="${esc(cat)}" ${allResourceCategory === cat ? "selected" : ""}>${esc(cat)}</option>`).join("")}</select></label>
      <label>보관창고<select id="allResourceWarehouse"><option value="all">전체 창고</option>${warehouses.map(name => `<option value="${esc(name)}" ${allResourceWarehouse === name ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label>
    </div>
  </div>`;
}

function bindResourceFilters(renderList){
  document.getElementById("allResourceSearch")?.addEventListener("input", event => { allResourceQuery=event.target.value; renderList(); });
  document.getElementById("allResourceCategory")?.addEventListener("change", event => { allResourceCategory=event.target.value; renderList(); });
  document.getElementById("allResourceWarehouse")?.addEventListener("change", event => { allResourceWarehouse=event.target.value; renderList(); });
}

function bindResourceGroupControls(renderList){
  document.querySelector("[data-group-sort]")?.addEventListener("change",event=>{if(warehouseViewMode==="materials")materialSortMode=event.target.value;else equipmentSortMode=event.target.value;renderList();});
  document.getElementById("toggleResourceSelection")?.addEventListener("click",()=>{resourceSelectionMode=!resourceSelectionMode;if(!resourceSelectionMode)selectedResources.clear();renderWarehouse();});
  document.getElementById("manageCategories")?.addEventListener("click",()=>openCategoryManager(warehouseViewMode==="materials"?"material":"equipment"));
}

function createBulkSafetyPoint(label){try{const copy=JSON.parse(JSON.stringify(state));if(copy.ui)delete copy.ui.bulkUndo;localStorage.setItem("victor_bulk_safety_0_19_0l",JSON.stringify({label,createdAt:new Date().toISOString(),state:copy}));return true;}catch(error){showFeedback("error","안전지점을 만들지 못했습니다");return false;}}
async function restoreBulkSafetyPoint(){closeMenu();try{const point=JSON.parse(localStorage.getItem("victor_bulk_safety_0_19_0l")||"null");if(!point?.state){showFeedback("info","되돌릴 대량변경이 없습니다");return;}if(!await askConfirm("대량변경 되돌리기",`${point.label} 이전 상태로 되돌릴까요?`,"되돌리기",true))return;state=normalize(point.state);save();localStorage.removeItem("victor_bulk_safety_0_19_0l");showFeedback("success","대량변경을 되돌렸습니다");setPage("warehouse");}catch(error){showFeedback("error","안전지점을 복원하지 못했습니다");}}
function renderBulkResourceActions(){const target=document.getElementById("bulkResourceActions");if(!target)return;const count=selectedResources.size;target.innerHTML=resourceSelectionMode?`<div class="bulk-bar"><strong>${count}개 선택</strong><button class="btn secondary compact" id="bulkCategory" type="button" ${count?"":"disabled"}>분류 변경</button><button class="btn secondary compact" id="bulkMove" type="button" ${count?"":"disabled"}>창고 이동</button></div>`:"";document.getElementById("bulkCategory")?.addEventListener("click",openBulkCategoryChange);document.getElementById("bulkMove")?.addEventListener("click",openBulkMove);}

function openBulkCategoryChange(){const material=[...selectedResources].some(key=>key.startsWith("material:")),options=material?cats:equipmentCategories;openEntryModal(`${entryHeader("선택 항목 분류 변경",`${selectedResources.size}개 항목`)}<div class="form"><label>새 분류<select id="bulkCategoryTarget">${options.map(cat=>`<option>${esc(cat)}</option>`).join("")}</select></label><button class="btn primary" id="applyBulkCategory" type="button">변경</button></div>`);document.getElementById("applyBulkCategory")?.addEventListener("click",async()=>{const target=document.getElementById("bulkCategoryTarget").value;if(!await askConfirm("분류 변경",`${selectedResources.size}개 항목을 ${target}(으)로 변경할까요?`,"변경"))return;if(!createBulkSafetyPoint("분류 일괄 변경"))return;selectedResources.forEach(key=>{const [kind,id]=key.split(":");if(kind==="material"){const item=itemOf(id);if(item){item.cat=target;item.updatedAt=new Date().toISOString();state.records.forEach(record=>(record.items||[]).forEach(entry=>{if(entry.name===id)entry.cat=target;}));}}else{const item=state.equipment.find(row=>row.id===id);if(item){item.cat=target;item.updatedAt=new Date().toISOString();}}});save();selectedResources.clear();resourceSelectionMode=false;closeEntryModal();showFeedback("success","분류 변경 완료");renderWarehouse();});}

function openBulkMove(){openEntryModal(`${entryHeader("선택 항목 창고 이동",`${selectedResources.size}개 항목`)}<div class="form"><label>출발 창고<select id="bulkMoveFrom">${warehouses.map(name=>`<option>${esc(name)}</option>`).join("")}</select></label><label>도착 창고<select id="bulkMoveTo">${warehouses.map((name,index)=>`<option ${index===1?"selected":""}>${esc(name)}</option>`).join("")}</select></label><div class="callout">자재는 출발 창고의 현재 수량 전부를 이동하고, 장비는 보관창고를 변경합니다.</div><button class="btn primary" id="applyBulkMove" type="button">이동</button></div>`);document.getElementById("applyBulkMove")?.addEventListener("click",async()=>{const from=document.getElementById("bulkMoveFrom").value,to=document.getElementById("bulkMoveTo").value;if(from===to){showFeedback("error","출발·도착 창고를 다르게 선택해주세요");return;}if(!await askConfirm("일괄 이동",`${selectedResources.size}개 항목을 ${to}(으)로 이동할까요?`,"이동"))return;if(!createBulkSafetyPoint("선택 항목 일괄 이동"))return;selectedResources.forEach(key=>{const [kind,id]=key.split(":");if(kind==="material"){const qty=Number(state.stock[from]?.[id]||0);if(qty>0){state.stock[from][id]=0;state.stock[to][id]=Number(state.stock[to]?.[id]||0)+qty;}}else{const item=state.equipment.find(row=>row.id===id);if(item){item.moves=item.moves||[];item.moves.push({id:uid(),date:todayISO(),from:item.place,to,memo:"선택 모드 일괄 이동",createdAt:new Date().toISOString()});item.place=to;item.updatedAt=new Date().toISOString();}}});save();selectedResources.clear();resourceSelectionMode=false;closeEntryModal();showFeedback("success","일괄 이동 완료");renderWarehouse();});}

function openCategoryManager(kind){
  const list=kind==="material"?cats:equipmentCategories;
  openEntryModal(`${entryHeader("분류명 변경·병합",kind==="material"?"자재 분류":"장비 분류")}<div class="form"><label>기존 분류<select id="categorySource">${list.map(cat=>`<option>${esc(cat)}</option>`).join("")}</select></label><label>새 분류명 또는 병합할 분류<input id="categoryTarget" placeholder="새 분류명"></label><div class="callout" id="categoryImpact"></div><button class="btn primary" id="applyCategoryRename" type="button">변경·병합</button></div>`);
  const update=()=>{const source=document.getElementById("categorySource").value,count=kind==="material"?catalog.filter(item=>item.cat===source).length:state.equipment.filter(item=>item.cat===source).length;document.getElementById("categoryImpact").textContent=`${source}에 포함된 ${count}개 항목과 연결된 과거 이력의 분류명이 함께 변경됩니다.`;};
  update();document.getElementById("categorySource").onchange=update;
  document.getElementById("applyCategoryRename").onclick=async()=>{const source=document.getElementById("categorySource").value,target=document.getElementById("categoryTarget").value.trim();if(!target){showFeedback("error","새 분류명을 입력해주세요");return;}if(source===target){showFeedback("info","같은 분류명입니다");return;}if(!await askConfirm("분류 변경",`${source}를 ${target}(으)로 변경하거나 병합할까요?`,"변경"))return;if(!createBulkSafetyPoint("분류명 변경·병합"))return;if(kind==="material"){catalog.filter(item=>item.cat===source).forEach(item=>{item.cat=target;item.updatedAt=new Date().toISOString();});state.records.forEach(record=>(record.items||[]).forEach(entry=>{if(entry.cat===source)entry.cat=target;}));}else{state.equipment.filter(item=>item.cat===source).forEach(item=>{item.cat=target;item.updatedAt=new Date().toISOString();});state.equipmentCategories=state.equipmentCategories||[];if(!state.equipmentCategories.includes(target))state.equipmentCategories.push(target);}save();closeEntryModal();showFeedback("success","분류 변경 완료");renderWarehouse();};
}

function renderAllMaterialsView(){
  return `${resourceFilterControls(cats,"자재명·규격·메모 검색")}${groupToolbar(materialSortMode,"materials")}<div class="btn-row"><button class="btn secondary compact" id="toggleResourceSelection" type="button">${resourceSelectionMode?"선택 종료":"선택 모드"}</button><button class="btn secondary compact" id="manageCategories" type="button">분류 관리</button></div><div class="filter-result resource-result" id="allMaterialCount"></div><div id="allMaterialList"></div><div id="bulkResourceActions"></div>`;
}

function renderAllMaterialList(){
  const target = document.getElementById("allMaterialList");
  if(!target) return;
  const query = allResourceQuery.trim().toLowerCase();
  const selectedWarehouses = allResourceWarehouse === "all" ? warehouses : [allResourceWarehouse];
  let rows = catalog.filter(item => {
    if(allResourceCategory !== "all" && item.cat !== allResourceCategory) return false;
    return !query || [item.name,item.spec,item.memo,item.cat].join(" ").toLowerCase().includes(query);
  }).map(item => {
    const total = selectedWarehouses.reduce((sum,name) => sum + Number(state.stock[name]?.[item.name] || 0),0);
    const locations = selectedWarehouses.filter(name => Number(state.stock[name]?.[item.name] || 0) > 0);
    return {...item,total,locations};
  });
  rows.sort((a,b)=>materialSortMode==="qty"?b.total-a.total:materialSortMode==="recent"?String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")):a.name.localeCompare(b.name,"ko"));
  document.getElementById("allMaterialCount").textContent = `검색 결과 ${rows.length}종`;
  const forceOpen=Boolean(query);target.innerHTML=rows.length?cats.map(cat=>{const grouped=rows.filter(item=>item.cat===cat);if(!grouped.length)return "";const content=grouped.map(item=>`<div class="list-row ${item.total===0?"zero-stock":""}">${resourceSelectionMode?`<input class="resource-check" data-select-material="${esc(item.name)}" type="checkbox" ${selectedResources.has(`material:${item.name}`)?"checked":""}>`:""}<button class="row-main" data-all-material="${esc(item.name)}" type="button"><div><div class="row-title">${esc(item.name)}${isTodayChanged(item)?` <span class="today-chip">오늘 수정</span>`:""}</div><div class="row-sub">${item.spec?esc(item.spec)+" · ":""}${item.locations.length?esc(item.locations.slice(0,2).join(", "))+(item.locations.length>2?` 외 ${item.locations.length-2}곳`:""):"보유 창고 없음"}</div></div><div class="stock-qty">${materialQtyText(item.total,item.unit,item)}</div></button></div>`).join("");return groupedSection("materials",cat,`${grouped.length}종`,content,forceOpen);}).join(""):`<div class="emptybox">검색 결과가 없습니다.</div>`;
  bindGroupedSections(renderAllMaterialList);target.querySelectorAll("[data-all-material]").forEach(button=>button.addEventListener("click",()=>{if(!resourceSelectionMode)openAllMaterialDetail(button.dataset.allMaterial);}));target.querySelectorAll("[data-select-material]").forEach(input=>input.addEventListener("change",()=>{const key=`material:${input.dataset.selectMaterial}`;input.checked?selectedResources.add(key):selectedResources.delete(key);renderBulkResourceActions();}));renderBulkResourceActions();
}

function openAllMaterialDetail(name){
  const item = itemOf(name);
  if(!item) return;
  const timeline=[...state.records].filter(record=>(record.items||[]).some(entry=>entry.name===name)).sort((a,b)=>(b.date+b.createdAt).localeCompare(a.date+a.createdAt)).slice(0,20);
  openEntryModal(`
    ${entryHeader(item.name,"전체 자재 상세")}
    <div class="card compact-card"><div class="row-sub">카테고리</div><div class="row-title">${esc(item.cat)}</div><div class="row-sub">규격 ${esc(item.spec || "없음")} · 단위 ${esc(item.unit)}</div>${item.memo ? `<div class="callout" style="margin-top:10px">${esc(item.memo)}</div>` : ""}</div>
    <div class="list-card">${warehouses.map(name => `<button class="list-row" data-material-warehouse="${esc(name)}" type="button"><div><div class="row-title">${esc(name)}</div></div><div class="stock-qty">${materialQtyText(state.stock[name]?.[item.name] || 0,item.unit,item)}</div></button>`).join("")}</div>
    <button class="btn secondary" id="editMaterialInfo" type="button" style="width:100%;margin-top:10px">자재 정보·분류 수정</button><div class="card"><div class="section-title">재고 변동 타임라인</div>${timeline.map(record=>{const entry=record.items.find(row=>row.name===name),sign=record.flow==="입고"?"+":record.flow==="출고"||record.flow==="긴급"?"-":"";return `<div class="stock-line"><div><div class="stock-name">${fmtDate(record.date)} · ${esc(record.title)}</div><div class="stock-spec">${esc(record.warehouse||"창고 미지정")} · ${esc(record.flow)}</div></div><div class="stock-qty">${entry.before!==undefined?`${materialQtyText(entry.before,entry.unit,entry)} → ${materialQtyText(entry.after,entry.unit,entry)}`:`${sign}${materialQtyText(entry.qty,entry.unit,entry)}`}</div></div>`;}).join("")||`<div class="emptybox">변동 이력이 없습니다.</div>`}</div><button class="btn danger" id="deleteMaterial" type="button" style="width:100%">자재를 임시 보관함으로 이동</button>`);
  document.querySelectorAll("[data-material-warehouse]").forEach(button => button.addEventListener("click", () => { closeEntryModal(); warehouseViewMode="warehouses"; selectedWarehouse=button.dataset.materialWarehouse; warehouseTab="material"; renderWarehouse(); pushNavigationState({page:"warehouse",warehouse:selectedWarehouse,tab:"material"}); }));
  document.getElementById("editMaterialInfo")?.addEventListener("click",()=>openMaterialInfoForm(item.name));
  document.getElementById("deleteMaterial")?.addEventListener("click",async()=>{if(!await askConfirm("자재 삭제",`${item.name}과 현재 재고를 임시 보관함으로 이동할까요?`,"이동",true))return;const stock={};warehouses.forEach(warehouse=>{stock[warehouse]=Number(state.stock[warehouse]?.[item.name]||0);delete state.stock[warehouse]?.[item.name];});state.trash=state.trash||[];state.trash.push({id:uid(),kind:"material",data:{item:JSON.parse(JSON.stringify(item)),stock},deletedAt:new Date().toISOString()});state.catalog=state.catalog.filter(row=>row.name!==item.name);save();closeEntryModal();showFeedback("success","자재를 임시 보관함으로 이동했습니다");renderAllMaterialList();});
}

function openMaterialInfoForm(name){const item=itemOf(name);if(!item)return;openEntryModal(`${entryHeader("자재 정보·분류 수정",item.name)}<div class="form"><label>품목명<input id="materialEditName" value="${esc(item.name)}"></label><label>분류<select id="materialEditCategory">${cats.map(cat=>`<option ${cat===item.cat?"selected":""}>${esc(cat)}</option>`).join("")}</select></label><label>규격<input id="materialEditSpec" value="${esc(item.spec||"")}"></label><label>메모<textarea id="materialEditMemo">${esc(item.memo||"")}</textarea></label><button class="btn primary" id="saveMaterialInfo" type="button">저장</button></div>`);document.getElementById("saveMaterialInfo")?.addEventListener("click",()=>{const nextName=document.getElementById("materialEditName").value.trim(),cat=document.getElementById("materialEditCategory").value;if(!nextName){showFeedback("error","품목명을 입력해주세요");return;}if(catalog.some(row=>row!==item&&row.name===nextName)){showFeedback("error","같은 이름의 자재가 이미 있습니다");return;}const oldName=item.name;Object.assign(item,{name:nextName,cat,spec:document.getElementById("materialEditSpec").value.trim(),memo:document.getElementById("materialEditMemo").value.trim(),updatedAt:new Date().toISOString()});if(oldName!==nextName)warehouses.forEach(warehouse=>{state.stock[warehouse][nextName]=Number(state.stock[warehouse]?.[oldName]||0);delete state.stock[warehouse][oldName];});state.records.forEach(record=>(record.items||[]).forEach(entry=>{if(entry.name===oldName){entry.name=nextName;entry.cat=cat;}}));save();closeEntryModal();showFeedback("success","자재 정보 저장 완료");renderAllMaterialList();});}

function renderAllEquipmentView(){
  return `${resourceFilterControls(equipmentCategories,"장비명·규격·모델명·메모·창고 검색")}${groupToolbar(equipmentSortMode,"equipment")}<div class="btn-row"><button class="btn secondary compact" id="toggleResourceSelection" type="button">${resourceSelectionMode?"선택 종료":"선택 모드"}</button><button class="btn secondary compact" id="manageCategories" type="button">분류 관리</button></div><div class="filter-result resource-result" id="allEquipmentCount"></div><div id="allEquipmentList"></div><div id="bulkResourceActions"></div>`;
}

function equipmentSearchText(item){
  return [item.name,item.spec,item.model,item.memo,item.place,item.cat,item.detail,item.etc,item.battery,item.fuel].join(" ").toLowerCase();
}

function renderAllEquipmentList(){
  const target = document.getElementById("allEquipmentList");
  if(!target) return;
  const query = allResourceQuery.trim().toLowerCase();
  const rows = (state.equipment || []).filter(item => {
    if(allResourceCategory !== "all" && item.cat !== allResourceCategory) return false;
    if(allResourceWarehouse !== "all" && item.place !== allResourceWarehouse) return false;
    return !query || equipmentSearchText(item).includes(query);
  }).sort((a,b)=>equipmentSortMode==="qty"?Number(b.qty||0)-Number(a.qty||0):equipmentSortMode==="recent"?String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")):a.name.localeCompare(b.name,"ko"));
  document.getElementById("allEquipmentCount").textContent = `검색 결과 ${rows.length}건`;
  const forceOpen=Boolean(query);target.innerHTML=rows.length?equipmentCategories.map(cat=>{const grouped=rows.filter(item=>(item.cat||"기타장비")===cat);if(!grouped.length)return "";const content=grouped.map(item=>`<div class="list-row ${Number(item.qty||0)===0?"zero-stock":""}">${resourceSelectionMode?`<input class="resource-check" data-select-equipment="${item.id}" type="checkbox" ${selectedResources.has(`equipment:${item.id}`)?"checked":""}>`:""}<button class="row-main" data-all-equipment="${item.id}" type="button"><div><div class="row-title">${esc(item.name)}${isTodayChanged(item)?` <span class="today-chip">오늘 수정</span>`:""}</div><div class="row-sub">${esc(item.spec||item.detail||item.model||"규격 없음")} · ${esc(item.place||"보관 미지정")}${item.memo||item.etc?" · "+esc(item.memo||item.etc):""}</div></div><div class="stock-qty">${Number(item.qty??1)}개</div></button></div>`).join("");return groupedSection("equipment",cat,`${grouped.length}건`,content,forceOpen);}).join(""):`<div class="emptybox">검색 결과가 없습니다.</div>`;
  bindGroupedSections(renderAllEquipmentList);target.querySelectorAll("[data-all-equipment]").forEach(button=>button.addEventListener("click",()=>{if(!resourceSelectionMode)openEquipment(button.dataset.allEquipment);}));target.querySelectorAll("[data-select-equipment]").forEach(input=>input.addEventListener("change",()=>{const key=`equipment:${input.dataset.selectEquipment}`;input.checked?selectedResources.add(key):selectedResources.delete(key);renderBulkResourceActions();}));renderBulkResourceActions();
}

function renderHnsView(){
  return `<div class="card">
    <div class="section-title">HNS</div>
    <div class="emptybox">HNS 자료는 정식 자료를 받은 뒤 별도로 구성합니다.<br>검수 전 물질별 대응정보는 표시하지 않습니다.</div>
  </div>`;
}

function techniqueSearchText(item){
  return [item.title,item.summary,item.memo,...(item.tags||[]),...(item.check||[]),...(item.initial||[]),...(item.evidence||[]),...(item.resources||[]),...(item.report||[])].join(" ").toLowerCase();
}

function filteredTechniqueItems(){
  const query=techniqueQuery.trim().toLowerCase();
  return RESPONSE_TECH_ITEMS.filter(item=>!query || techniqueSearchText(item).includes(query)).sort((a,b)=>a.title.localeCompare(b.title,"ko"));
}

function techniqueCard(item){
  return `<button class="tech-card" data-tech-id="${esc(item.id)}" type="button">
    <div>
      <div class="row-title">${esc(item.title)}</div>
      <div class="row-sub">${esc(item.summary)}</div>
      <div class="tech-tags">${(item.tags||[]).slice(0,4).map(tag=>`<span>${esc(tag)}</span>`).join("")}</div>
    </div>
    <div class="chev">›</div>
  </button>`;
}

function renderTechniqueResults(){
  const items=filteredTechniqueItems();
  const result=document.getElementById("techniqueResult");
  const list=document.getElementById("techniqueList");
  if(result)result.textContent=techniqueQuery.trim()?`검색 결과 ${items.length}건`:`상황별 초안 ${items.length}건`;
  if(list)list.innerHTML=items.map(techniqueCard).join("") || `<div class="emptybox">검색 결과가 없습니다.</div>`;
  list?.querySelectorAll("[data-tech-id]").forEach(button=>button.addEventListener("click",()=>openTechniqueDetail(button.dataset.techId)));
}

function renderTechniqueInfo(){
  const items=filteredTechniqueItems();
  view.innerHTML=`
    <button class="back" id="techniqueBack" type="button">‹ 홈으로</button>
    <div class="card tech-hero">
      <div class="section-title">방제기술</div>
      <div class="row-sub">침수선박, 빌지 배출, 매연, 폐기물처럼 현장에서 자주 마주치는 상황별 조치사항을 정리하는 공간입니다.</div>
      <div class="callout" style="margin-top:12px">직원 검토용 초안입니다. 실제 조치 문구는 내부 지침·관련 법령·책자 기준으로 보완하세요.</div>
    </div>
    <div class="card">
      <input class="search" id="techniqueSearch" value="${esc(techniqueQuery)}" placeholder="상황 · 조치 · 자재 검색">
      <div class="filter-result" id="techniqueResult">${techniqueQuery.trim()?`검색 결과 ${items.length}건`:`상황별 초안 ${items.length}건`}</div>
      <div class="tech-list" id="techniqueList">${items.map(techniqueCard).join("") || `<div class="emptybox">검색 결과가 없습니다.</div>`}</div>
    </div>
    <div class="card">
      <div class="section-title">정리 방식</div>
      <div class="row-sub">직원 의견을 받아 항목을 줄이거나 늘리고, 책자·내부자료 문구를 확인한 뒤 확정본으로 바꾸면 됩니다.</div>
    </div>`;
  document.getElementById("techniqueBack")?.addEventListener("click",()=>setPage("home"));
  document.getElementById("techniqueSearch")?.addEventListener("input",event=>{techniqueQuery=event.target.value;renderTechniqueResults();});
  renderTechniqueResults();
}

function techList(title,items){
  return `<div class="tech-detail-section"><div class="section-title">${esc(title)}</div><ul>${(items||[]).map(row=>`<li>${esc(row)}</li>`).join("")}</ul></div>`;
}

function openTechniqueDetail(id){
  const item=RESPONSE_TECH_ITEMS.find(row=>row.id===id);
  if(!item)return;
  openEntryModal(`${entryHeader(item.title,"방제기술 초안")}
    <div class="callout">직원 검토용 초안입니다. 현장 확정 지침으로 사용하기 전에 내부 기준으로 문구를 확인하세요.</div>
    <div class="card compact-card"><div class="row-sub">상황 개요</div><div class="row-title">${esc(item.summary)}</div><div class="tech-tags" style="margin-top:10px">${(item.tags||[]).map(tag=>`<span>${esc(tag)}</span>`).join("")}</div></div>
    ${techList("확인할 사항",item.check)}
    ${techList("초동 조치",item.initial)}
    ${techList("사진·증거 확보",item.evidence)}
    ${techList("필요 자재·장비",item.resources)}
    ${techList("보고·기록 사항",item.report)}
    <div class="tech-detail-section"><div class="section-title">메모</div><p>${esc(item.memo)}</p></div>`);
}

function renderWarehouseGroupList(){
  const order=["창고","파출소","함정","차량","기타"];
  return `<div class="group-toolbar"><button class="btn gray compact" data-groups-all="expand" type="button">전체 펼치기</button><button class="btn gray compact" data-groups-all="collapse" type="button">전체 접기</button></div>`+order.map(kind=>{const names=warehouses.filter(name=>warehouseKind(name)===kind).sort((a,b)=>a.localeCompare(b,"ko"));if(!names.length)return "";const rows=names.map(name=>{const summary=warehouseSummary(name),info=state.warehouseInfos[name]||{};return `<button class="list-row" data-wh="${esc(name)}" type="button"><div><div class="row-title">${esc(name)}</div><div class="row-sub">자재 ${summary.materialCount}종 · 장비 ${summary.equipmentCount}종${info.memo?" · 메모 있음":""}</div></div><div class="chev">›</div></button>`;}).join("");return groupedSection("warehouses",kind==="차량"?"지휘차량":kind,`${names.length}곳`,`<div class="list-card">${rows}</div>`);}).join("")+`<button class="btn secondary" id="addWarehouseInline" type="button" style="width:100%;margin-top:10px">+ 신규 보관장소 추가</button>`;
}

function renderWarehouse(){
  if(!selectedWarehouse){
    const body = warehouseViewMode === "materials" ? renderAllMaterialsView() : warehouseViewMode === "equipment" ? renderAllEquipmentView() : warehouseViewMode === "hns" ? renderHnsView() : renderWarehouseGroupList();
    view.innerHTML = warehouseViewSwitcher() + warehouseActions() + body;
    bindWarehouseViewSwitcher();
    bindWarehouseActions();
    if(warehouseViewMode === "materials"){
      bindResourceFilters(renderAllMaterialList);
      bindResourceGroupControls(renderAllMaterialList);
      renderAllMaterialList();
    }else if(warehouseViewMode === "equipment"){
      bindResourceFilters(renderAllEquipmentList);
      bindResourceGroupControls(renderAllEquipmentList);
      renderAllEquipmentList();
    }else if(warehouseViewMode === "hns"){
      // HNS 정식 자료 입력 전 준비 화면입니다.
    }else{
      bindGroupedSections(renderWarehouse);
      view.querySelectorAll("[data-wh]").forEach(button => button.addEventListener("click", () => { selectedWarehouse=button.dataset.wh; warehouseTab="material"; renderWarehouse(); pushNavigationState({page:"warehouse",warehouse:selectedWarehouse,tab:warehouseTab}); }));
      document.getElementById("addWarehouseInline")?.addEventListener("click", addWarehouse);
    }
    return;
  }

  warehouseViewMode = "warehouses";
  const info = state.warehouseInfos[selectedWarehouse] || {};
  view.innerHTML = warehouseViewSwitcher() + warehouseActions(selectedWarehouse) + `
    <button class="back" id="backWh" type="button">‹ 보관</button>
    <div class="card"><div class="section-title">${esc(selectedWarehouse)}</div><div class="row-sub">📌 중요 메모</div><div class="memo-box">${info.memo ? esc(info.memo) : "등록된 메모가 없습니다."}</div>${warehouseFieldMemoHtml(info)}<button class="btn secondary" id="editInfo" type="button" style="width:100%;margin-top:12px">메모 수정</button></div>
    ${typeof renderOps === "function" ? renderOps(selectedWarehouse) : ""}
    <div class="card"><div class="tabbar"><button class="tabbtn ${warehouseTab === "material" ? "active" : ""}" id="tabMaterial" type="button">자재</button><button class="tabbtn ${warehouseTab === "equipment" ? "active" : ""}" id="tabEquipment" type="button">장비</button></div>
    ${warehouseTab === "material" ? `${groupToolbar(materialSortMode,"warehouse-material")}<input class="search" id="stockSearch" placeholder="자재 검색"><div id="stockList"></div><button class="btn secondary" id="addMaterialInline" type="button" style="width:100%;margin-top:12px">+ 신규 추가</button>` : renderWarehouseEquipment(selectedWarehouse)}</div>`;
  bindWarehouseViewSwitcher();
  bindWarehouseActions(selectedWarehouse);
  document.getElementById("backWh")?.addEventListener("click", () => window.history.back());
  document.getElementById("editInfo")?.addEventListener("click", () => editWarehouseInfo(selectedWarehouse));
  document.getElementById("tabMaterial")?.addEventListener("click", () => { warehouseTab="material"; renderWarehouse(); replaceNavigationState({page:"warehouse",warehouse:selectedWarehouse,tab:warehouseTab}); });
  document.getElementById("tabEquipment")?.addEventListener("click", () => { warehouseTab="equipment"; renderWarehouse(); replaceNavigationState({page:"warehouse",warehouse:selectedWarehouse,tab:warehouseTab}); });
  const baseBtn = document.getElementById("editOpBase"); if(baseBtn) baseBtn.addEventListener("click", () => editOpBase(selectedWarehouse));
  const opBtn = document.getElementById("addOpLog"); if(opBtn) opBtn.addEventListener("click", () => addOpLog(selectedWarehouse));
  document.getElementById("addAssetMaintenance")?.addEventListener("click",()=>openAssetMaintenanceForm(selectedWarehouse));
  document.getElementById("openVesselHistory")?.addEventListener("click",()=>openVesselHistory(selectedWarehouse));
  bindOpLogActions(selectedWarehouse);
  bindAssetMaintenanceActions(selectedWarehouse);
  if(warehouseTab === "material"){
    document.querySelector('[data-group-sort="warehouse-material"]')?.addEventListener("change",event=>{materialSortMode=event.target.value;renderStockList();});
    document.getElementById("stockSearch")?.addEventListener("input", renderStockList);
    document.getElementById("addMaterialInline")?.addEventListener("click", addMaterialChoice);
    renderStockList();
  }else{
    bindGroupedSections(renderWarehouse);
    document.querySelector('[data-group-sort="warehouse-equipment"]')?.addEventListener("change",event=>{equipmentSortMode=event.target.value;renderWarehouse();});
    document.getElementById("addEquip")?.addEventListener("click", addEquipmentChoice);
    view.querySelectorAll("[data-equip]").forEach(button => button.addEventListener("click", () => openEquipment(button.dataset.equip)));
  }
}

function renderWarehouseEquipment(place){
  const list=(state.equipment||[]).filter(item=>item.place===place);const groups=equipmentCategories.map(cat=>{const rows=list.filter(item=>(item.cat||"기타장비")===cat).sort((a,b)=>equipmentSortMode==="qty"?Number(b.qty||0)-Number(a.qty||0):equipmentSortMode==="recent"?String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")):a.name.localeCompare(b.name,"ko"));if(!rows.length)return"";return groupedSection(`warehouse-equipment-${place}`,cat,`${rows.length}건`,rows.map(item=>`<button class="list-row ${Number(item.qty||0)===0?"zero-stock":""}" data-equip="${item.id}" type="button"><div><div class="row-title">${esc(item.name)}${isTodayChanged(item)?` <span class="today-chip">오늘 수정</span>`:""}</div><div class="row-sub">${esc(item.spec||item.detail||"규격 없음")} · ${Number(item.qty??1)}개${item.memo||item.etc?" · "+esc(item.memo||item.etc):""}</div></div><div class="chev">›</div></button>`).join(""));}).join("");return `<div>${groupToolbar(equipmentSortMode,"warehouse-equipment")}${groups||`<div class="emptybox">이 보관 장소에 등록된 장비가 없습니다.</div>`}<button class="btn secondary" id="addEquip" type="button" style="width:100%;margin-top:12px">+ 신규 추가</button></div>`;
}

function warehouseFieldMemoHtml(info={}){
  const rows=[
    ["출입 방법",info.access],
    ["열쇠 위치",info.keyNote],
    ["특이사항",info.special],
    ["연락 메모",info.contactMemo]
  ].filter(([,value])=>String(value||"").trim());
  return rows.length?`<div class="detail-grid" style="margin-top:12px">${rows.map(([label,value])=>`<div class="detail-row"><div class="detail-label">${esc(label)}</div><div class="detail-value">${esc(value)}</div></div>`).join("")}</div>`:"";
}

function editWarehouseInfo(w){
  const info = state.warehouseInfos[w] || {memo:"",updated:""};
  openEntryModal(`${entryHeader("보관장소 정보 수정",w)}<div class="form"><label>보관장소명<input id="warehouseNameEdit" value="${esc(w)}" placeholder="보관장소명을 입력하세요"></label><label>유형<select id="warehouseKindEdit">${["창고","차량","함정","파출소","기타"].map(kind=>`<option ${kind===warehouseKind(w)?"selected":""}>${kind}</option>`).join("")}</select></label><div class="callout">${esc(warehouseImpactText(w))}</div><label>중요 메모<textarea id="warehouseMemo" placeholder="보관장소 특이사항을 입력하세요">${esc(info.memo || "")}</textarea></label><div class="form-grid2"><label>출입 방법<input id="warehouseAccess" value="${esc(info.access || "")}" placeholder="예: 담당자 확인 후 출입"></label><label>열쇠 위치<input id="warehouseKeyNote" value="${esc(info.keyNote || "")}" placeholder="민감정보는 주의"></label></div><label>특이사항<textarea id="warehouseSpecial" placeholder="보관장소 구조, 주의사항 등">${esc(info.special || "")}</textarea></label><label>연락 메모<input id="warehouseContactMemo" value="${esc(info.contactMemo || "")}" placeholder="예: 담당부서, 연락 참고"></label><button class="btn primary" id="saveWarehouseMemo" type="button">저장</button></div>`);
  document.getElementById("saveWarehouseMemo")?.addEventListener("click", async () => {
    const nextName=document.getElementById("warehouseNameEdit").value.trim();
    const kind=document.getElementById("warehouseKindEdit").value;
    const memo=document.getElementById("warehouseMemo").value.trim();
    const fieldMemo={access:document.getElementById("warehouseAccess")?.value.trim()||"",keyNote:document.getElementById("warehouseKeyNote")?.value.trim()||"",special:document.getElementById("warehouseSpecial")?.value.trim()||"",contactMemo:document.getElementById("warehouseContactMemo")?.value.trim()||""};
    if(!nextName){showFeedback("error","보관장소명을 입력해주세요");return;}
    if(nextName!==w && warehouses.includes(nextName)){showFeedback("error","이미 있는 보관장소명입니다");return;}
    if(nextName!==w && !await askConfirm("창고명 변경 영향",`${warehouseImpactText(w)}\n\n${w} → ${nextName}(으)로 변경할까요?`,"변경"))return;
    renameWarehouse(w,nextName,{kind,memo,...fieldMemo});
    selectedWarehouse=nextName;
    save(); closeEntryModal(); showFeedback("success","보관장소 정보 저장"); renderWarehouse();
  });
}

function warehouseImpactText(name){
  const materialCount=catalog.filter(item=>Number(state.stock[name]?.[item.name]||0)>0).length;
  const equipmentCount=(state.equipment||[]).filter(item=>item.place===name).length;
  const recordCount=(state.records||[]).filter(record=>record.warehouse===name||record.targetWarehouse===name||(record.equipmentItems||[]).some(item=>item.place===name)).length;
  const opsCount=state.assetOps?.[name]?.logs?.length||0;
  return `연결된 자료: 자재 ${materialCount}종 · 장비 ${equipmentCount}개 · 이력 ${recordCount}건${opsCount?` · 운항/운행 ${opsCount}건`:""}`;
}

function renameWarehouse(oldName,newName,{kind,memo,access,keyNote,special,contactMemo}={}){
  if(!oldName || !newName) return;
  if(oldName!==newName){
    state.warehouses=(state.warehouses||[]).map(name=>name===oldName?newName:name);
    if(state.stock?.[oldName]){state.stock[newName]=state.stock[oldName];delete state.stock[oldName];}
    (state.equipment||[]).forEach(item=>{if(item.place===oldName)item.place=newName;(item.moves||[]).forEach(move=>{if(move.from===oldName)move.from=newName;if(move.to===oldName)move.to=newName;});});
    (state.records||[]).forEach(record=>{if(record.warehouse===oldName)record.warehouse=newName;if(record.targetWarehouse===oldName)record.targetWarehouse=newName;(record.equipmentItems||[]).forEach(item=>{if(item.place===oldName)item.place=newName;});});
    state.warehouseInfos=state.warehouseInfos||{};
    state.warehouseKinds=state.warehouseKinds||{};
    state.assetOps=state.assetOps||{};
    state.warehouseInfos[newName]=state.warehouseInfos[oldName]||{};
    state.warehouseKinds[newName]=state.warehouseKinds[oldName]||warehouseKind(oldName);
    if(state.assetOps[oldName]){state.assetOps[newName]=state.assetOps[oldName];delete state.assetOps[oldName];}
    delete state.warehouseInfos[oldName];
    delete state.warehouseKinds[oldName];
  }
  state.warehouseKinds=state.warehouseKinds||{};
  state.warehouseInfos=state.warehouseInfos||{};
  state.assetOps=state.assetOps||{};
  state.warehouseKinds[newName]=kind||state.warehouseKinds[newName]||warehouseKind(newName);
  const previous=state.warehouseInfos[newName]||{};
  state.warehouseInfos[newName]={memo:memo??previous.memo??"",access:access??previous.access??"",keyNote:keyNote??previous.keyNote??"",special:special??previous.special??"",contactMemo:contactMemo??previous.contactMemo??"",updated:todayISO()};
  if(state.warehouseKinds[newName]==="차량"&&!state.assetOps[newName])state.assetOps[newName]={distanceBase:0,logs:[],maintenance:[],counterMode:"absolute"};
  if(state.warehouseKinds[newName]==="함정"&&!state.assetOps[newName])state.assetOps[newName]={mileageBase:0,hoursBase:0,portHoursBase:0,starboardHoursBase:0,engineSplitMode:"dual",fuelBase:0,logs:[],maintenance:[],counterMode:"absolute"};
}

function renderStockList(){
  const q = (document.getElementById("stockSearch")?.value || "").trim();
  const el = document.getElementById("stockList");
  state.ui=state.ui||{};
  const showZero=Boolean(state.ui.showZeroStockInWarehouse);
  const hiddenZeroCount=catalog.filter(item=>Number(state.stock[selectedWarehouse]?.[item.name]||0)===0).length;
  const html = cats.map(cat => {
    const items = catalog.filter(i => i.cat === cat && (showZero || Number(state.stock[selectedWarehouse]?.[i.name]||0)>0) && (!q || i.name.includes(q) || cat.includes(q)));
    if(!items.length) return "";
    const sorted=items.sort((a,b)=>materialSortMode==="qty"?Number(state.stock[selectedWarehouse]?.[b.name]||0)-Number(state.stock[selectedWarehouse]?.[a.name]||0):materialSortMode==="recent"?String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")):a.name.localeCompare(b.name,"ko"));return groupedSection(`warehouse-material-${selectedWarehouse}`,cat,`${items.length}종`,sorted.map(i => `
      <button class="stock-line ${Number(state.stock[selectedWarehouse]?.[i.name]||0)===0?"zero-stock":""}" data-stock="${esc(i.name)}" type="button">
        <div>
          <div class="stock-name">${esc(i.name)}${isTodayChanged(i)?` <span class="today-chip">오늘 수정</span>`:""}</div>
          <div class="stock-spec">${i.spec ? esc(i.spec)+" · " : ""}${i.kind === "returnable" ? "출고/회수품" : "소모품"} · 단위 ${esc(i.unit)}</div>
        </div>
        <div class="stock-qty">${materialQtyText(state.stock[selectedWarehouse][i.name], i.unit,i)}</div>
      </button>`).join(""),Boolean(q));
  }).join("");
  el.innerHTML = `<button class="btn gray compact" id="toggleZeroStock" type="button" style="margin:0 0 8px">${showZero?"0재고 숨기기":`숨긴 0재고 보기 ${hiddenZeroCount}종`}</button>` + (html || `<div class="emptybox">검색 결과가 없습니다.</div>`);
  bindGroupedSections(renderStockList);
  document.getElementById("toggleZeroStock")?.addEventListener("click",()=>{state.ui=state.ui||{};state.ui.showZeroStockInWarehouse=!showZero;save();renderStockList();});
  el.querySelectorAll("[data-stock]").forEach(b => b.addEventListener("click", () => editStock(b.dataset.stock)));
}

function editStock(name){
  const item = itemOf(name);
  const cur = Number(state.stock[selectedWarehouse][name] || 0);
  const integerOnly = ["개","대","세트"].includes(item.unit);
  openEntryModal(`${entryHeader("자재 수량 수정",`${selectedWarehouse} · ${name}`)}
    <div class="callout">현재 수량 ${materialQtyText(cur,item.unit,item)}</div><div class="form">
      <label>변경 수량 (${esc(item.unit)})<input id="stockNewQty" class="big-input" type="number" inputmode="decimal" min="0" step="${integerOnly ? "1" : "0.1"}" value="${cur===0?"":cur}"></label>
      <div class="qty-quick"><button type="button" data-stock-add="-1">-1</button><button type="button" data-stock-add="1">+1</button><button type="button" data-stock-add="5">+5</button><button type="button" data-stock-add="10">+10</button></div>
      <label>변경 사유<select id="stockReason">${stockEditReasons.map(reason => `<option value="${esc(reason)}">${esc(reason)}</option>`).join("")}</select></label>
      <label>메모<textarea id="stockMemo" placeholder="필요한 경우 입력하세요"></textarea></label>
      <button class="btn primary sticky-save" id="saveStockEdit" type="button">수량 수정 저장</button>
    </div>`);
  document.querySelectorAll("[data-stock-add]").forEach(button => button.addEventListener("click", () => {
    const input=document.getElementById("stockNewQty"); input.value=String(Math.max(0,Number(input.value || 0)+Number(button.dataset.stockAdd)));
  }));
  document.getElementById("saveStockEdit")?.addEventListener("click", () => {
    let num=Number(document.getElementById("stockNewQty").value);
    if(integerOnly) num=Math.round(num);
    if(!Number.isFinite(num) || num<0){ showFeedback("error","올바른 수량을 입력해주세요"); return; }
    if(num===cur){ showFeedback("info","변경된 수량이 없습니다"); return; }
    const reason=document.getElementById("stockReason").value;
    const memo=document.getElementById("stockMemo").value.trim();
    const diff=num-cur;
    state.stock[selectedWarehouse][name]=num;
    item.updatedAt=new Date().toISOString();
    state.records.push({id:uid(),flow:"재고수정",type:"재고수정",title:`${name} 재고수정`,date:todayISO(),warehouse:selectedWarehouse,memo:`변경사유: ${reason}${memo ? "\n"+memo : ""}`,status:"done",sourceId:null,equipmentItems:[],createdAt:new Date().toISOString(),items:[{cat:item.cat,name,qty:Math.abs(diff),unit:item.unit,kind:item.kind,before:cur,after:num,diff}]});
    save(); closeEntryModal(); showFeedback("success",`재고수정 · ${name} ${materialQtyText(cur,item.unit,item)} → ${materialQtyText(num,item.unit,item)}`); renderStockList();
  });
}


function nowQuickTitle(){
  const d = new Date();
  return `긴급 기록 ${d.getMonth()+1}.${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function quickRecordCard(){
  return `<div class="callout">긴급기록은 사고 현장에서 사용한 자재와 장비를 빠르게 남기는 임시 기록입니다. 자재는 나중에 재고에 반영하고 장비는 사용이력으로 보관합니다.</div>`;
}

function applyRegisterDraft(saved){
  if(!saved)return;
  registerFormDraft=saved;
  pendingRegisterDraft=null;
  draftItems=saved.items||[];
  draftEquipmentItems=saved.equipmentItems||[];
  registerMode=saved.mode||registerMode;
  registerFlow=saved.flow||registerFlow;
}

function renderRegister(){
  if(!registerFormDraft&&!pendingRegisterDraft) pendingRegisterDraft=readRegisterDraft();
  draftItems = draftItems.length ? draftItems : [];
  view.innerHTML = `
    ${pendingRegisterDraft&&!registerFormDraft ? `<div class="callout">작성 중 기록 있음 <div class="btn-row" style="margin-top:8px"><button class="btn secondary compact" id="loadRegisterDraft" type="button">불러오기</button><button class="btn gray compact" id="discardRegisterDraft" type="button">새로 시작</button></div></div>` : ""}
    <div class="choice-grid">
      <button class="choice-card ${registerMode === "normal" ? "active" : ""}" id="modeNormal" type="button">
        <div><div class="choice-title">일반등록</div><div class="choice-sub">평상시 자재 출고·입고를 기록하고 재고에 즉시 반영합니다.</div></div>
      </button>
      <button class="choice-card danger ${registerMode === "quick" ? "active" : ""}" id="modeQuick" type="button">
        <div><div class="choice-title">🚨 긴급기록</div><div class="choice-sub">사고 현장에서 사용량만 빠르게 저장합니다. 재고는 나중에 반영합니다.</div></div><div class="choice-icon">›</div>
      </button>
    </div>
    ${registerMode === "quick" ? quickRecordCard() : ""}
    <div class="form">
      ${registerMode === "normal" ? `
        <div class="flow-grid">
          <button class="flow-btn ${registerFlow === "출고" ? "active" : ""}" id="flowOut" type="button">출고</button>
          <button class="flow-btn ${registerFlow === "입고" ? "active" : ""}" id="flowIn" type="button">입고</button>
        </div>
        <label>종류<select id="recType">${types.map(t=>`<option value="${t}">${t}</option>`).join("")}</select></label>
        <label>보관<select id="recWarehouse">${warehouses.map(w=>`<option value="${esc(w)}">${esc(w)}</option>`).join("")}</select></label>
        <label>날짜<input id="recDate" type="date" value="${todayISO()}"></label>
        <label>제목<input id="recTitle" placeholder="제목을 입력하세요"></label>
      ` : `
        <input id="recType" type="hidden" value="사고">
        <input id="recWarehouse" type="hidden" value="">
        <input id="recDate" type="hidden" value="${todayISO()}">
        <input id="recTitle" type="hidden" value="${nowQuickTitle()}">
      `}
      ${registerMode === "normal" ? `<div class="field-card">
        <div class="section-title" style="font-size:16px">사고·작업 위치</div>
        <div class="location-grid">
          <label>구분<select id="recLocationType">${LOCATION_TYPES.map(type=>`<option value="${esc(type)}">${esc(type)}</option>`).join("")}</select></label>
          <label>세부 위치<input id="recLocationDetail" placeholder="예: 장승포항, ○○호, 홍도 남방"></label>
        </div>
      </div>
      <div class="field-card">
        <div class="section-title" style="font-size:16px">현장 확인사항</div>
        <div class="evidence-grid">${EVIDENCE_FIELDS.map(field=>`<label>${esc(field.label)}<select id="evidence_${esc(field.key)}">${field.options.map(option=>`<option value="${esc(option)}">${esc(option)}</option>`).join("")}</select></label>`).join("")}</div>
      </div>` : ""}
      <div>
        <div class="section-head" style="margin:5px 0 8px">
          <div class="section-title" style="font-size:16px">${registerMode === "quick" ? "사용 내역" : registerFlow}</div>
          <div class="btn-row"><button class="btn secondary compact" id="addItem" type="button">자재 선택</button><button class="btn secondary compact" id="addEquipmentItem" type="button">장비 선택</button><button class="btn secondary compact" id="addHnsItem" type="button">HNS</button></div>
        </div>
        <div id="itemArea"></div>
        <div id="equipmentItemArea"></div>
        <div id="hnsItemArea">${registerMode==="normal"?`<div class="hns-register-card"><div><strong>HNS</strong><span>${registerFlow} 자료 연결 준비 중</span></div><button class="btn gray compact" id="openHnsGuide" type="button">안내</button></div>`:""}</div>
        <div id="stockAfterPreview"></div>
      </div>
      <label>메모<textarea id="recMemo" placeholder="${registerMode === "quick" ? "현장 메모를 간단히 입력하세요" : "메모를 입력하세요"}"></textarea></label>
      <button class="btn primary" id="saveRecord" type="button">${registerMode === "quick" ? "미반영으로 저장" : registerFlow + " 저장"}</button>
    </div>
  `;
  document.getElementById("modeNormal")?.addEventListener("click", () => { registerMode = "normal"; renderRegister(); setHead(); });
  document.getElementById("modeQuick")?.addEventListener("click", () => { registerMode = "quick"; renderRegister(); setHead(); });
  const outBtn = document.getElementById("flowOut");
  if(outBtn) outBtn.addEventListener("click", () => { registerFlow = "출고"; renderRegister(); });
  const inBtn = document.getElementById("flowIn");
  if(inBtn) inBtn.addEventListener("click", () => { registerFlow = "입고"; draftEquipmentItems=[]; renderRegister(); });
  document.getElementById("addItem")?.addEventListener("click", addDraftItem);
  document.getElementById("addEquipmentItem")?.addEventListener("click", addDraftEquipmentItem);
  document.getElementById("addHnsItem")?.addEventListener("click", openHnsRegisterGuide);
  document.getElementById("openHnsGuide")?.addEventListener("click", openHnsRegisterGuide);
  document.getElementById("saveRecord")?.addEventListener("click", saveRecord);
  document.getElementById("loadRegisterDraft")?.addEventListener("click",()=>{applyRegisterDraft(pendingRegisterDraft||readRegisterDraft());renderRegister();setHead();showSnack("작성 중 기록을 불러왔습니다");});
  document.getElementById("discardRegisterDraft")?.addEventListener("click",()=>{clearRegisterDraft();draftItems=[];draftEquipmentItems=[];renderRegister();});
  document.getElementById("recWarehouse")?.addEventListener("change",()=>{renderItems();updateStockAfterPreview();});
  renderItems();
  renderEquipmentItems();
  updateStockAfterPreview();
  if(registerFormDraft){[["recType","type"],["recWarehouse","warehouse"],["recDate","date"],["recTitle","title"],["recMemo","memo"]].forEach(([id,key])=>{const input=document.getElementById(id);if(input&&registerFormDraft[key]!==undefined)input.value=registerFormDraft[key];});}
  if(registerFormDraft && registerMode === "normal"){
    [["recLocationType","locationType"],["recLocationDetail","locationDetail"]].forEach(([id,key])=>{const input=document.getElementById(id);if(input&&registerFormDraft[key]!==undefined)input.value=registerFormDraft[key];});
    EVIDENCE_FIELDS.forEach(field=>{const input=document.getElementById(`evidence_${field.key}`);if(input&&registerFormDraft.evidence?.[field.key]!==undefined)input.value=registerFormDraft.evidence[field.key];});
  }
  view.querySelectorAll("input,select,textarea").forEach(input=>{input.addEventListener("input",scheduleRegisterDraft);input.addEventListener("change",scheduleRegisterDraft);});
}

function openHnsRegisterGuide(){
  showFeedback("info","HNS 자료는 별도 목록을 받은 뒤 입고·출고에 연결합니다");
}

function collectRegisterLocation(){
  const type=document.getElementById("recLocationType")?.value || "";
  const detail=document.getElementById("recLocationDetail")?.value.trim() || "";
  return detail ? {type,detail} : null;
}

function collectRegisterEvidence(){
  const values=Object.fromEntries(EVIDENCE_FIELDS.map(field=>[field.key,document.getElementById(`evidence_${field.key}`)?.value || field.options[0]]));
  return Object.values(values).some(value=>value && !["확인 안함","해당 없음"].includes(value)) ? values : null;
}

function updateStockAfterPreview(){
  const target=document.getElementById("stockAfterPreview");if(!target)return;
  if(registerMode!=="normal"||registerFlow!=="출고"){target.innerHTML="";return;}
  const warehouse=document.getElementById("recWarehouse")?.value||"";
  const rows=draftItems.filter(item=>Number(item.qty)>0).map(item=>{const before=Number(state.stock[warehouse]?.[item.name]||0),after=before-Number(item.qty||0);return `<div class="row-sub">${esc(item.name)} · ${materialQtyText(before,item.unit,item)} → <strong class="${after<0?"danger-text":""}">${materialQtyText(after,item.unit,item)}</strong></div>`;});
  target.innerHTML=rows.length?`<div class="callout"><strong>출고 후 예상 잔량</strong>${rows.join("")}</div>`:"";
}

function mergeDuplicateDraftItems({notify=false}={}){
  const seen = new Map();
  let merged = false;
  draftItems.forEach(item => {
    if(!item?.name) return;
    if(seen.has(item.name)){
      const target = seen.get(item.name);
      target.qty = Number(target.qty || 0) + Number(item.qty || 0);
      merged = true;
    }else{
      seen.set(item.name,{...item});
    }
  });
  if(merged){
    draftItems = [...seen.values()];
    scheduleRegisterDraft();
    if(notify) showFeedback("info","같은 자재는 기존 줄에 합쳤습니다");
  }
  return merged;
}

function addDraftItem(){
  const f = catalog[0];
  draftItems.push({cat:f.cat,name:f.name,qty:"",unit:f.unit,kind:f.kind});
  mergeDuplicateDraftItems({notify:true});
  renderItems();
}

function addDraftEquipmentItem(){
  const equipment=(state.equipment || [])[0];
  if(!equipment){ showFeedback("info","등록된 장비가 없습니다"); return; }
  draftEquipmentItems.push({id:equipment.id,name:equipment.name,cat:equipment.cat || "기타장비",qty:"",place:equipment.place,spec:equipment.spec || equipment.detail || "",model:equipment.model || ""});
  renderEquipmentItems();
}

function equipmentRegisterLabel(equipment){
  const spec=equipment.spec || equipment.detail || "규격 미입력";
  const model=equipment.model && equipment.model!==spec ? ` · ${equipment.model}` : "";
  return `${equipment.name} · ${spec}${model} · ${equipment.place || "보관 미지정"}`;
}

function renderEquipmentItems(){
  const area=document.getElementById("equipmentItemArea");
  if(!area) return;
  if(!draftEquipmentItems.length){ area.innerHTML=""; return; }
  area.innerHTML=`<div class="group-title">${registerMode==="normal"&&registerFlow==="입고"?"입고 장비":"사용 장비"}</div>`+draftEquipmentItems.map((item,index) => {
    const selected=state.equipment.find(e=>e.id===item.id) || state.equipment[0];
    const selectedCategory=selected?.cat || item.cat || "기타장비";
    const categories=[...new Set((state.equipment || []).map(e=>e.cat || "기타장비"))].sort((a,b)=>a.localeCompare(b,"ko"));
    const categoryEquipment=(state.equipment || []).filter(e=>(e.cat || "기타장비")===selectedCategory).sort((a,b)=>equipmentRegisterLabel(a).localeCompare(equipmentRegisterLabel(b),"ko"));
    return `<div class="item-box"><div class="form">
      <label>장비 종류<select data-equipment-category="${index}">${categories.map(cat=>`<option value="${esc(cat)}" ${cat===selectedCategory?"selected":""}>${esc(cat)}</option>`).join("")}</select></label>
      <label>장비 선택<select data-equipment-name="${index}">${categoryEquipment.map(e=>`<option value="${e.id}" ${e.id===item.id?"selected":""}>${esc(equipmentRegisterLabel(e))}</option>`).join("")}</select></label>
      <div class="row-sub">${esc(selected?.cat || "분류 미지정")} · 규격 ${esc(selected?.spec || selected?.detail || "미입력")} · 모델 ${esc(selected?.model || "미입력")} · ${esc(selected?.place || "보관 미지정")}${selected?.memo || selected?.etc ? ` · ${esc(selected.memo || selected.etc)}` : ""}</div>
      <label>${registerMode==="normal"&&registerFlow==="입고"?"입고":"사용"} 수량 (등록 ${Number(selected?.qty || 0)}대)<input type="number" inputmode="numeric" min="1" step="1" data-equipment-qty="${index}" value="${item.qty ?? ""}"></label>
      <button class="btn gray" data-equipment-remove="${index}" type="button">삭제</button>
    </div></div>`;
  }).join("");
  area.querySelectorAll("[data-equipment-category]").forEach(select=>select.addEventListener("change",()=>{
    const index=Number(select.dataset.equipmentCategory);const equipment=(state.equipment || []).filter(e=>(e.cat || "기타장비")===select.value).sort((a,b)=>equipmentRegisterLabel(a).localeCompare(equipmentRegisterLabel(b),"ko"))[0];if(!equipment)return;
    draftEquipmentItems[index]={id:equipment.id,name:equipment.name,cat:equipment.cat || "기타장비",qty:draftEquipmentItems[index].qty || "",place:equipment.place,spec:equipment.spec || equipment.detail || "",model:equipment.model || ""};renderEquipmentItems();
  }));
  area.querySelectorAll("[data-equipment-name]").forEach(select=>select.addEventListener("change",()=>{
    const index=Number(select.dataset.equipmentName); const equipment=state.equipment.find(e=>e.id===select.value);
    draftEquipmentItems[index]={id:equipment.id,name:equipment.name,cat:equipment.cat || "기타장비",qty:draftEquipmentItems[index].qty || "",place:equipment.place,spec:equipment.spec || equipment.detail || "",model:equipment.model || ""}; renderEquipmentItems();
  }));
  area.querySelectorAll("[data-equipment-qty]").forEach(input=>input.addEventListener("input",()=>{ draftEquipmentItems[Number(input.dataset.equipmentQty)].qty=input.value===""?"":Math.max(0,Math.round(Number(input.value || 0)));scheduleRegisterDraft(); }));
  area.querySelectorAll("[data-equipment-remove]").forEach(button=>button.addEventListener("click",()=>{ draftEquipmentItems.splice(Number(button.dataset.equipmentRemove),1);scheduleRegisterDraft();renderEquipmentItems(); }));
}

function registerStockInfo(item){
  const selected=document.getElementById("recWarehouse")?.value||"";
  if(registerMode!=="normal"||!selected)return null;
  return {label:`${selected} 현재 재고`,qty:Number(state.stock[selected]?.[item.name]||0)};
}

function renderItems(){
  const area = document.getElementById("itemArea");
  if(!draftItems.length){
    area.innerHTML = `<div class="emptybox">추가된 자재가 없습니다.</div>`;
    return;
  }
  area.innerHTML = draftItems.map((it,idx) => {const current=registerStockInfo(it);return `
    <div class="item-box">
      <div class="form">
        <label>분류<select data-cat="${idx}">${cats.map(c=>`<option value="${c}" ${it.cat===c?"selected":""}>${c}</option>`).join("")}</select></label>
        <label>자재<select data-name="${idx}">${catalog.filter(x=>x.cat===it.cat).map(x=>`<option value="${x.name}" ${it.name===x.name?"selected":""}>${x.name}</option>`).join("")}</select></label>
        <label>수량 (${esc(it.unit)})<input type="number" inputmode="${integerUnit(it.unit)?"numeric":"decimal"}" min="0" step="${integerUnit(it.unit)?"1":"0.1"}" data-qty="${idx}" value="${it.qty ?? ""}"></label>
        ${current?`<div class="register-stock-now"><span>${esc(current.label)}</span><strong>${materialQtyText(current.qty,it.unit,it)}</strong></div>`:""}
        ${isDispersant(it)?`<div class="can-converter"><label>18L 캔 수<input type="number" inputmode="numeric" min="0" step="1" data-can-qty="${idx}" value="${it.qty && Number(it.qty)%18===0?Number(it.qty)/18:""}" placeholder="캔 개수"></label><div data-can-result="${idx}">${it.qty?`${Number(it.qty)/18}캔 = ${Number(it.qty)}L`:"캔 수를 입력하면 리터로 환산됩니다"}</div></div>`:""}
        <div class="qty-quick" aria-label="수량 빠른 입력"><button type="button" data-qty-add="1" data-qty-index="${idx}">+1</button><button type="button" data-qty-add="5" data-qty-index="${idx}">+5</button><button type="button" data-qty-add="10" data-qty-index="${idx}">+10</button><button type="button" data-qty-clear="${idx}">초기화</button></div>
        <button class="btn gray" data-remove="${idx}" type="button">삭제</button>
      </div>
    </div>
  `;}).join("");
  area.querySelectorAll("[data-cat]").forEach(s => s.addEventListener("change", () => {
    const idx = Number(s.dataset.cat);
    const f = catalog.find(x => x.cat === s.value);
    draftItems[idx] = {cat:f.cat,name:f.name,qty:draftItems[idx].qty || "",unit:f.unit,kind:f.kind};
    renderItems();
  }));
  area.querySelectorAll("[data-name]").forEach(s => s.addEventListener("change", () => {
    const idx = Number(s.dataset.name);
    const f = itemOf(s.value);
    draftItems[idx].cat = f.cat;
    draftItems[idx].name = f.name;
    draftItems[idx].unit = f.unit;
    draftItems[idx].kind = f.kind;
    mergeDuplicateDraftItems({notify:true});
    renderItems();
  }));
  area.querySelectorAll("[data-qty]").forEach(i => i.addEventListener("input", () => {
    let val = String(i.value || "").replace(/[^0-9.]/g,"");
    const parts = val.split(".");
    if(parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
    if(val.length > 1 && val[0] === "0" && val[1] !== ".") val = String(Number(val));
    i.value = val;
    draftItems[Number(i.dataset.qty)].qty = val === "" ? "" : Number(val);
    scheduleRegisterDraft();
    updateStockAfterPreview();
  }));
  area.querySelectorAll("[data-can-qty]").forEach(input=>input.addEventListener("input",()=>{const index=Number(input.dataset.canQty),cans=Math.max(0,Math.round(Number(input.value||0))),liters=cans*18;draftItems[index].qty=liters;const qtyInput=area.querySelector(`[data-qty="${index}"]`);if(qtyInput)qtyInput.value=liters||"";const result=area.querySelector(`[data-can-result="${index}"]`);if(result)result.textContent=`${cans}캔 = ${liters}L`;}));
  area.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => {
    draftItems.splice(Number(b.dataset.remove), 1);
    scheduleRegisterDraft();
    renderItems();
  }));
  area.querySelectorAll("[data-qty-add]").forEach(button => button.addEventListener("click", () => {
    const idx = Number(button.dataset.qtyIndex);
    draftItems[idx].qty = Number(draftItems[idx].qty || 0) + Number(button.dataset.qtyAdd || 0);
    scheduleRegisterDraft();
    renderItems();
  }));
  area.querySelectorAll("[data-qty-clear]").forEach(button => button.addEventListener("click", () => {
    draftItems[Number(button.dataset.qtyClear)].qty = "";
    scheduleRegisterDraft();
    renderItems();
  }));
}

async function saveRecord(){
  const type = document.getElementById("recType").value;
  const warehouse = document.getElementById("recWarehouse").value;
  const date = document.getElementById("recDate").value || todayISO();
  const title = document.getElementById("recTitle").value.trim();
  const memo = document.getElementById("recMemo").value.trim();
  const location=collectRegisterLocation();
  const evidence=collectRegisterEvidence();
  mergeDuplicateDraftItems();
  const items = draftItems.map(x => ({...x, qty:integerUnit(x.unit)?Math.round(Number(x.qty || 0)):Number(x.qty || 0)})).filter(x => x.qty > 0);
  const equipmentItems = draftEquipmentItems.map(x => ({...x,qty:Math.round(Number(x.qty || 0))})).filter(x=>x.qty>0);
  const checklist=[];

  if(registerMode === "normal" && !title){ showSnack("제목을 입력해주세요"); return; }
  if(!items.length && !equipmentItems.length){ showSnack("자재 또는 장비를 추가해주세요"); return; }
  const invalidEquipment=equipmentItems.find(entry=>entry.qty>Number(state.equipment.find(item=>item.id===entry.id)?.qty || 0));
  if(invalidEquipment){ showFeedback("error",`${invalidEquipment.name} ${registerFlow==="입고"?"반납":"사용"}수량이 보유수량보다 많습니다`); return; }
  const unusuallyLarge=items.find(entry=>{const current=Number(state.stock[warehouse]?.[entry.name]||0);return entry.qty>=100&&entry.qty>Math.max(100,current*1.5);});
  if(unusuallyLarge&&!await askConfirm("큰 수량 확인",`${unusuallyLarge.name} ${materialQtyText(unusuallyLarge.qty,unusuallyLarge.unit,unusuallyLarge)}을 저장할까요?`,"계속 저장"))return;
  const signature=items.map(item=>item.name).sort().join("|")+"/"+equipmentItems.map(item=>item.id).sort().join("|");
  const duplicate=[...state.records].reverse().slice(0,10).find(record=>record.date===date&&record.title===title&&(record.items||[]).map(item=>item.name).sort().join("|")+"/"+(record.equipmentItems||[]).map(item=>item.id).sort().join("|")===signature);
  if(duplicate&&!await askConfirm("중복 등록 확인","같은 날짜·제목·품목의 기록이 이미 있습니다. 그래도 저장할까요?","중복 저장"))return;
  const saveButton=document.getElementById("saveRecord");

  if(registerMode === "quick"){
    if(saveButton) saveButton.disabled=true;
    state.records.push(createFlowRecord({
      flow:"긴급", type:"사고", warehouse:"", date, title:title || nowQuickTitle(), memo, status:"pending",
      quick:true, officialTitle:false, createdAt:new Date().toISOString(), items, equipmentItems, checklist
    }));
    draftItems = [];
    draftEquipmentItems = [];
    clearRegisterDraft();
    save();
    showSnack(`긴급기록 저장 · ${summarizeItems(items,equipmentItems,"긴급")}`);
    historyFilter = "pending";
    setPage("history");
    return;
  }

  if(registerFlow === "출고" && !stockAvailable(warehouse, items)){
    showFeedback("error",stockShortageMessage(warehouse,items));
    return;
  }

  if(saveButton) saveButton.disabled=true;

  const changedItems = stockChangeItems(warehouse, items, registerFlow);
  applyStock(warehouse, items, registerFlow);
  state.records.push(createFlowRecord({
    flow:registerFlow, type, warehouse, date, title, memo, status:"done", items:changedItems, equipmentItems, checklist, location, evidence
  }));

  draftItems = [];
  draftEquipmentItems = [];
  clearRegisterDraft();
  save();
  showSnack(`${registerFlow} 저장 · ${summarizeItems(changedItems,equipmentItems,registerFlow)}`);
  historyFilter = "done";
  setPage("history");
}

function summarizeItems(items,equipmentItems=[],flow=""){ 
  const parts=(items || []).slice(0,2).map(i => {
    if(i.before !== undefined && i.after !== undefined) return `${i.name} ${materialQtyText(i.before,i.unit,i)} → ${materialQtyText(i.after,i.unit,i)}`;
    return `${i.name} ${materialQtyText(i.qty,i.unit,i)}`;
  });
  (equipmentItems || []).slice(0,Math.max(0,2-parts.length)).forEach(item=>parts.push(`${item.name} ${item.qty}대 ${flow==="입고"?"반납":"사용"}`));
  const total=(items || []).length+(equipmentItems || []).length;
  return (parts.join(" · ") || "품목 없음")+(total>parts.length?` 외 ${total-parts.length}건`:"");
}

function historyDateGroups(records){
  const groups = {};
  records.forEach(r => {
    const d = r.date || todayISO();
    if(!groups[d]) groups[d] = [];
    groups[d].push(r);
  });
  return Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(d => ({date:d, records:groups[d]}));
}

function historyDateMatches(record){
  if(historyDateFilter === "all") return true;
  if(historyDateFilter === "today") return record.date === todayISO();
  if(historyDateFilter === "yesterday") return record.date === yesterdayISO();
  if(historyDateFilter === "month") return record.date >= monthStartISO() && record.date <= todayISO();
  if(historyDateFilter === "custom"){
    if(historyCustomFrom && record.date < historyCustomFrom) return false;
    if(historyCustomTo && record.date > historyCustomTo) return false;
    return true;
  }
  const days = historyDateFilter === "7" ? 7 : 30;
  const start = new Date();
  start.setHours(0,0,0,0);
  start.setDate(start.getDate() - (days - 1));
  const date = new Date(`${record.date}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date >= start;
}

function historyFlowMatches(record){
  if(historyFlowFilter === "all") return true;
  if(historyFlowFilter === "긴급") return Boolean(record.quick || record.status === "pending");
  return record.flow === historyFlowFilter;
}

function renderHistory(){
  const all = [...state.records].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  const counts = {all:all.length,pending:all.filter(r=>r.status === "pending").length,done:all.filter(r=>r.status !== "pending").length};
  let filtered = all.filter(record => historyFilter === "all" ? true : (historyFilter === "pending" ? record.status === "pending" : record.status !== "pending"));
  filtered = filtered.filter(record => historyDateMatches(record) && historyFlowMatches(record));
  view.innerHTML = `
    <div class="history-tabs">
      <button class="history-tab ${historyFilter === "all" ? "active" : ""}" data-hfilter="all" type="button">전체 ${counts.all}</button>
      <button class="history-tab ${historyFilter === "pending" ? "active" : ""}" data-hfilter="pending" type="button">미반영 ${counts.pending}</button>
      <button class="history-tab ${historyFilter === "done" ? "active" : ""}" data-hfilter="done" type="button">완료 ${counts.done}</button>
    </div>
    <div class="history-date-buttons">
      ${["all","today","yesterday","month","custom"].map(key=>`<button class="${historyDateFilter===key?"active":""}" data-history-date="${key}" type="button">${key==="all"?"전체":key==="today"?"오늘":key==="yesterday"?"어제":key==="month"?"이번 달":"직접 선택"}</button>`).join("")}
    </div>
    ${historyDateFilter==="custom"?`<div class="history-filter-grid compact-filter"><label>시작일<input id="historyCustomFrom" type="date" value="${esc(historyCustomFrom)}"></label><label>종료일<input id="historyCustomTo" type="date" value="${esc(historyCustomTo)}"></label></div>`:""}
    <div class="history-filter-grid">
      <label>종류<select id="historyFlowFilter"><option value="all" ${historyFlowFilter === "all" ? "selected" : ""}>전체 종류</option><option value="출고" ${historyFlowFilter === "출고" ? "selected" : ""}>출고</option><option value="입고" ${historyFlowFilter === "입고" ? "selected" : ""}>입고</option><option value="이송" ${historyFlowFilter === "이송" ? "selected" : ""}>창고 간 이동</option><option value="재고수정" ${historyFlowFilter === "재고수정" ? "selected" : ""}>재고수정</option><option value="긴급" ${historyFlowFilter === "긴급" ? "selected" : ""}>긴급기록</option></select></label>
    </div>
    <input class="search" id="histSearch" placeholder="제목·창고·자재·장비 검색">
    <div class="filter-result">검색 결과 ${filtered.length}건 ${historyDateFilter !== "all" || historyFlowFilter !== "all" ? `<button class="link-btn" id="clearHistoryFilter" type="button">필터 초기화</button>` : ""}</div>
    <div id="histList">${renderHistoryListHtml(filtered)}</div>
  `;
  view.querySelectorAll("[data-hfilter]").forEach(button => button.addEventListener("click", () => { historyFilter=button.dataset.hfilter; renderHistory(); }));
  view.querySelectorAll("[data-history-date]").forEach(button=>button.addEventListener("click",()=>{historyDateFilter=button.dataset.historyDate;if(historyDateFilter==="custom"&&!historyCustomFrom&&!historyCustomTo){historyCustomFrom=monthStartISO();historyCustomTo=todayISO();}renderHistory();}));
  document.getElementById("historyCustomFrom")?.addEventListener("change",event=>{historyCustomFrom=event.target.value;renderHistory();});
  document.getElementById("historyCustomTo")?.addEventListener("change",event=>{historyCustomTo=event.target.value;renderHistory();});
  document.getElementById("historyFlowFilter")?.addEventListener("change", event => { historyFlowFilter=event.target.value; renderHistory(); });
  document.getElementById("clearHistoryFilter")?.addEventListener("click", () => { historyDateFilter="all"; historyFlowFilter="all"; historyCustomFrom=""; historyCustomTo=""; renderHistory(); });
  document.getElementById("histSearch")?.addEventListener("input", () => {
    const query = document.getElementById("histSearch").value.trim();
    const searched = filtered.filter(record => !query || [record.title,record.type,record.flow,record.warehouse,record.memo,record.location?.type,record.location?.detail,...Object.values(record.evidence||{}),...record.items.map(item=>item.name),...(record.equipmentItems || []).map(item=>item.name)].join(" ").includes(query));
    document.getElementById("histList").innerHTML = renderHistoryListHtml(searched);
    bindGroupedSections(renderHistory);
    bindHistoryRows();
  });
  bindGroupedSections(renderHistory);
  bindHistoryRows();
}

function renderHistoryListHtml(records){
  if(!records.length) return `<div class="emptybox">기록이 없습니다.</div>`;
  const defs=["처리 필요","자재 입·출고","장비 사용·반납","재고실사·재고수정","창고 간 이동","기타 기록"];
  const typeOf=r=>r.status==="pending"?"처리 필요":r.flow==="재고수정"?"재고실사·재고수정":r.flow==="이송"?"창고 간 이동":(r.equipmentItems||[]).length?"장비 사용·반납":["입고","출고","긴급"].includes(r.flow)?"자재 입·출고":"기타 기록";
  return defs.map(type=>{const typeRows=records.filter(record=>typeOf(record)===type);if(!typeRows.length)return"";const content=historyDateGroups(typeRows).map(g=>`<div class="history-date-label">${fmtDate(g.date)}</div><div class="list-card">${g.records.map(r => `
        <button class="list-row" data-detail="${r.id}" type="button">
          <div>
            <div><span class="badge ${r.status === "pending" ? "red" : (r.flow === "입고" ? "green" : r.flow === "재고수정" ? "orange" : "blue")}">${r.status === "pending" ? "미반영" : esc(r.flow || r.type)}</span></div>
            <div class="row-title" style="margin-top:7px">${esc(r.title)}</div>
            <div class="row-sub">${r.warehouse ? esc(r.warehouse) : "보관 미지정"} · ${esc(summarizeItems(r.items,r.equipmentItems,r.flow))}</div>
          </div>
          <div class="chev">›</div>
        </button>
      `).join("")}</div>`).join("");return groupedSection("history",type,`${typeRows.length}건`,content);}).join("");
}

function bindHistoryRows(){
  view.querySelectorAll("[data-detail]").forEach(b => b.addEventListener("click", () => openDetail(b.dataset.detail)));
}

function recordFieldSummary(r){
  const location=r.location?.detail?`<div class="detail-row"><div class="detail-label">사고·작업 위치</div><div class="detail-value">${esc(r.location.type||"위치")} · ${esc(r.location.detail)}</div></div>`:"";
  const evidence=r.evidence||{};
  const evidenceRows=EVIDENCE_FIELDS.map(field=>({label:field.label,value:evidence[field.key]})).filter(row=>row.value&&!["확인 안함","해당 없음"].includes(row.value));
  const evidenceHtml=evidenceRows.length?`<div class="detail-row"><div class="detail-label">현장 확인사항</div><div class="detail-value">${evidenceRows.map(row=>`${esc(row.label)} ${esc(row.value)}`).join(" · ")}</div></div>`:"";
  return location||evidenceHtml?`<div class="detail-grid">${location}${evidenceHtml}</div>`:"";
}

function pendingRecordForm(r){
  const officialTitle = r.officialTitle ? r.title : "";
  const location=r.location||{};
  const evidence=r.evidence||{};
  return `<div class="card">
      <div><span class="badge red">미반영</span></div>
      <div class="section-title" style="margin-top:10px">긴급기록 사후보완</div>
      <div class="row-sub">현장에서 저장한 기록입니다. 내용을 확인한 뒤 재고에 반영하세요.</div>
      <div class="form" style="margin-top:14px">
        <label>사고명·정식 제목<input id="pendingTitle" value="${esc(officialTitle)}" placeholder="예: ○○항 유류유출 방제"></label>
        <label>보관장소<select id="pendingWarehouse"><option value="">나중에 지정</option>${warehouses.map(w => `<option value="${esc(w)}" ${r.warehouse === w ? "selected" : ""}>${esc(w)}</option>`).join("")}</select></label>
        <label>발생일<input id="pendingDate" type="date" value="${esc(r.date || todayISO())}"></label>
        <div class="location-grid"><label>위치 구분<select id="pendingLocationType">${LOCATION_TYPES.map(type=>`<option value="${esc(type)}" ${location.type===type?"selected":""}>${esc(type)}</option>`).join("")}</select></label><label>세부 위치<input id="pendingLocationDetail" value="${esc(location.detail||"")}" placeholder="예: 장승포항, ○○호"></label></div>
        <div class="evidence-grid">${EVIDENCE_FIELDS.map(field=>`<label>${esc(field.label)}<select id="pendingEvidence_${esc(field.key)}">${field.options.map(option=>`<option value="${esc(option)}" ${evidence[field.key]===option?"selected":""}>${esc(option)}</option>`).join("")}</select></label>`).join("")}</div>
        <label>현장 메모<textarea id="pendingMemo" placeholder="현장 상황이나 특이사항">${esc(r.memo || "")}</textarea></label>
      </div>
    </div>
    <div class="card">
      <div class="section-head"><div class="section-title">사용 자재</div><button class="btn secondary" id="addPendingItem" type="button">+ 자재 추가</button></div>
      <div class="form">
        ${r.items.map((item,index) => `
          <div class="item-box">
            <label>자재<select id="pendingName${index}">${catalog.map(c => `<option value="${esc(c.name)}" ${c.name === item.name ? "selected" : ""}>${esc(c.cat)} · ${esc(c.name)}</option>`).join("")}</select></label>
            <label>사용량<input id="pendingQty${index}" type="number" inputmode="decimal" min="0" step="0.1" value="${Number(item.qty || 0)}"></label>
            <button class="btn gray" data-remove-pending="${index}" type="button">이 자재 삭제</button>
          </div>
        `).join("")}
      </div>
    </div>
    ${(r.equipmentItems || []).length ? `<div class="card"><div class="section-title">사용 장비</div><div class="form">${r.equipmentItems.map((item,index)=>`<div class="item-box"><label>장비<select id="pendingEquipment${index}">${state.equipment.map(e=>`<option value="${e.id}" ${e.id===item.id?"selected":""}>${esc(e.name)} · ${esc(e.place)}</option>`).join("")}</select></label><label>사용 수량<input id="pendingEquipmentQty${index}" type="number" inputmode="numeric" min="1" step="1" value="${Number(item.qty || 1)}"></label></div>`).join("")}</div></div>` : ""}
    <button class="btn secondary" id="savePending" type="button" style="width:100%;margin-bottom:9px">수정 내용 저장</button>
    <button class="btn primary" id="applyPending" type="button" style="width:100%;margin-bottom:9px">저장 후 재고 반영 확정</button>`;
}

function collectPendingForm(r){
  const items = r.items.map((original,index) => {
    const selectedName = document.getElementById(`pendingName${index}`)?.value || original.name;
    const catalogItem = itemOf(selectedName) || original;
    const qty = Number(document.getElementById(`pendingQty${index}`)?.value || 0);
    return {
      cat:catalogItem.cat || original.cat,
      name:catalogItem.name || selectedName,
      qty:Number.isFinite(qty) ? qty : 0,
      unit:catalogItem.unit || original.unit,
      kind:catalogItem.kind || original.kind
    };
  }).filter(item => item.qty > 0);

  return {
    title:document.getElementById("pendingTitle")?.value.trim() || "",
    warehouse:document.getElementById("pendingWarehouse")?.value || "",
    date:document.getElementById("pendingDate")?.value || todayISO(),
    memo:document.getElementById("pendingMemo")?.value.trim() || "",
    location:(document.getElementById("pendingLocationDetail")?.value.trim() || "") ? {type:document.getElementById("pendingLocationType")?.value || "",detail:document.getElementById("pendingLocationDetail")?.value.trim() || ""} : null,
    evidence:(()=>{const values=Object.fromEntries(EVIDENCE_FIELDS.map(field=>[field.key,document.getElementById(`pendingEvidence_${field.key}`)?.value || field.options[0]]));return Object.values(values).some(value=>value&&!["확인 안함","해당 없음"].includes(value))?values:null;})(),
    items,
    equipmentItems:(r.equipmentItems || []).map((original,index)=>{
      const equipment=state.equipment.find(item=>item.id===document.getElementById(`pendingEquipment${index}`)?.value) || state.equipment.find(item=>item.id===original.id) || original;
      return {id:equipment.id,name:equipment.name,qty:Math.max(1,Math.round(Number(document.getElementById(`pendingEquipmentQty${index}`)?.value || original.qty || 1))),place:equipment.place,spec:equipment.spec || equipment.detail || ""};
    })
  };
}

async function savePendingEdits(id, shouldApply=false, silent=false){
  const r = state.records.find(x => x.id === id);
  if(!r || r.status !== "pending") return false;
  const form = collectPendingForm(r);
  if(!form.items.length && !form.equipmentItems.length){ showSnack("자재 또는 장비를 한 개 이상 남겨주세요"); return false; }

  r.title = form.title || (r.officialTitle ? nowQuickTitle() : r.title || nowQuickTitle());
  r.officialTitle = Boolean(form.title);
  r.warehouse = form.warehouse;
  r.date = form.date;
  r.memo = form.memo;
  r.location = form.location;
  r.evidence = form.evidence;
  r.items = form.items;
  r.equipmentItems = form.equipmentItems;
  r.quick = true;

  if(!shouldApply){
    save();
    if(!silent){
      showSnack("미반영 기록 수정 완료");
      openDetail(id,{push:false,remember:false});
    }
    return true;
  }

  if(!r.officialTitle){ showSnack("재고 반영 전에 사고명을 입력해주세요"); return false; }
  if(r.items.length && !r.warehouse){ showSnack("재고를 차감할 보관장소를 선택해주세요"); return false; }
  if(!stockAvailable(r.warehouse, r.items)){
    showFeedback("error",stockShortageMessage(r.warehouse,r.items));
    return false;
  }
  if(!await askConfirm("재고 반영 확인",`${r.warehouse || "지정 창고"} 재고에서 사용 자재를 차감하고 완료 처리할까요?`,"재고 반영")) return false;

  const stockBefore = Object.fromEntries(r.items.map(item => [item.name, Number(state.stock[r.warehouse]?.[item.name] || 0)]));
  const previous = {status:r.status, flow:r.flow, appliedAt:r.appliedAt};
  applyStock(r.warehouse, r.items, "출고");
  r.status = "done";
  r.flow = "출고";
  r.appliedAt = new Date().toISOString();
  try{
    save();
  }catch(error){
    Object.entries(stockBefore).forEach(([name,qty]) => { state.stock[r.warehouse][name] = qty; });
    Object.assign(r, previous);
    throw error;
  }
  showSnack("재고 반영 완료");
  openDetail(id,{push:false,remember:false});
  return true;
}

async function addPendingItemToRecord(id){
  const r = state.records.find(x => x.id === id);
  if(!r || r.status !== "pending") return;
  if(!await savePendingEdits(id,false,true)) return;
  const first = catalog[0];
  r.items.push({cat:first.cat,name:first.name,qty:1,unit:first.unit,kind:first.kind});
  save();
  openDetail(id,{push:false,remember:false});
}

async function removePendingItemFromRecord(id,index){
  const r = state.records.find(x => x.id === id);
  if(!r || r.status !== "pending") return;
  if(r.items.length <= 1 && !(r.equipmentItems || []).length){ showSnack("자재 또는 장비를 한 개 이상 남겨주세요"); return; }
  if(!await savePendingEdits(id,false,true)) return;
  r.items.splice(index,1);
  save();
  openDetail(id,{push:false,remember:false});
}

function openDetail(id, options={}){
  const r = state.records.find(x => x.id === id);
  if(!r) return;
  page = "history";
  if(options.push !== false) pushNavigationState({page:"history",recordId:r.id});
  updateBottomNav();
  setHead();

  if(r.status === "pending"){
    view.innerHTML = `
      <button class="back" id="backHist" type="button">‹ 이력</button>
      ${pendingRecordForm(r)}
      <button class="btn danger detail-delete-btn" id="deleteRecord" type="button">미반영 기록 삭제</button>`;
    document.getElementById("backHist")?.addEventListener("click", () => window.history.back());
    document.getElementById("savePending")?.addEventListener("click", () => savePendingEdits(id,false));
    document.getElementById("applyPending")?.addEventListener("click", () => savePendingEdits(id,true));
    document.getElementById("addPendingItem")?.addEventListener("click", () => addPendingItemToRecord(id));
    view.querySelectorAll("[data-remove-pending]").forEach(button => button.addEventListener("click", () => removePendingItemFromRecord(id, Number(button.dataset.removePending))));
    document.getElementById("deleteRecord")?.addEventListener("click", async () => {
      if(!await askConfirm("미반영 기록 삭제","재고에는 영향이 없습니다.","삭제",true)) return;
      const undoState=JSON.stringify(state);
      state.trash=state.trash||[];state.trash.push({id:uid(),kind:"record",data:JSON.parse(JSON.stringify(r)),deletedAt:new Date().toISOString()});
      state.records = state.records.filter(x => x.id !== id);
      save();
      setPage("history");
      showUndoSnack("미반영 기록 삭제",undoState,()=>{historyFilter="all";setPage("history");});
    });
    return;
  }

  view.innerHTML = `
    <button class="back" id="backHist" type="button">‹ 이력</button>
    <div class="card">
      <span class="badge ${r.flow === "입고" ? "green" : r.flow === "재고수정" ? "orange" : "blue"}">${r.quick ? "긴급기록 반영완료" : esc(r.flow || r.type)}</span>
      <div class="section-title" style="margin-top:10px">${esc(r.title)}</div>
      <div class="row-sub">${fmtDate(r.date)} · ${r.warehouse ? esc(r.warehouse) : "보관 미지정"}</div>
      ${r.appliedAt ? `<div class="row-sub">반영시각 ${esc(new Date(r.appliedAt).toLocaleString("ko-KR"))}</div>` : ""}
      ${recordFieldSummary(r)}
      ${r.memo ? `<div class="callout" style="margin-top:12px">${esc(r.memo)}</div>` : ""}
    </div>
    ${r.items.length ? `<div class="card"><div class="section-title">${r.flow === "입고" ? "입고 자재" : r.flow === "이송" ? "이송 자재" : "사용 자재"}</div>${r.items.map(i => `<div class="stock-line"><div><div class="stock-name">${esc(i.name)}</div><div class="stock-spec">${esc(i.cat)}${i.before !== undefined ? " · " + materialQtyText(i.before,i.unit,i) + " → " + materialQtyText(i.after,i.unit,i) : ""}</div></div><div class="stock-qty">${i.before !== undefined ? (i.diff > 0 ? "+" : "") + materialQtyText(i.diff,i.unit,i) : materialQtyText(i.qty,i.unit,i)}</div></div>`).join("")}</div>` : ""}
    ${(r.equipmentItems || []).length ? `<div class="card"><div class="section-title">${r.flow==="입고"?"입고 장비":"사용 장비"}</div>${r.equipmentItems.map((item,index)=>{const returned=Math.min(Number(item.qty||0),Number(item.returnedQty||0)),using=Number(item.qty||0)-returned;return `<div class="stock-line"><button class="plain-button" data-used-equipment="${item.id}" type="button"><div class="stock-name">${esc(item.name)}</div><div class="stock-spec">${esc(item.place || "보관 미지정")} · ${r.flow==="입고"?`입고 ${Number(item.qty||0)}대`:`사용 중 ${using}대 · 반납 ${returned}대`}</div></button>${r.flow==="입고"?"":`<button class="btn secondary compact" data-return-equipment="${index}" type="button">부분 반납</button>`}</div>`;}).join("")}</div>` : ""}
    <button class="btn danger detail-delete-btn" id="deleteRecord" type="button">삭제</button>`;
  document.getElementById("backHist")?.addEventListener("click", () => window.history.back());
  view.querySelectorAll("[data-used-equipment]").forEach(button=>button.addEventListener("click",()=>openEquipment(button.dataset.usedEquipment)));
  view.querySelectorAll("[data-return-equipment]").forEach(button=>button.addEventListener("click",()=>openPartialReturn(r.id,Number(button.dataset.returnEquipment))));
  document.getElementById("deleteRecord")?.addEventListener("click", async () => {
    if(!await askConfirm("기록 삭제","기록을 삭제하고 재고를 이전 상태로 복구할까요?","삭제 및 복구",true)) return;
    const undoState=JSON.stringify(state);
    state.trash=state.trash||[];state.trash.push({id:uid(),kind:"record",data:JSON.parse(JSON.stringify(r)),deletedAt:new Date().toISOString()});
    if(r.flow === "재고수정"){
      r.items.forEach(i => { if(i.before !== undefined) state.stock[r.warehouse][i.name] = Number(i.before); });
    }else if(r.flow === "이송" && r.targetWarehouse){
      reverseStock(r.warehouse,r.items,"출고");
      reverseStock(r.targetWarehouse,r.items,"입고");
    }else if(r.flow !== "긴급"){
      reverseStock(r.warehouse, r.items, r.flow || "출고");
    }
    state.records = state.records.filter(x => x.id !== id);
    save();
    setPage("history");
    showUndoSnack("기록 삭제 및 재고 복구",undoState,()=>setPage("history"));
  });
}

function openPartialReturn(recordId,index){
  const record=state.records.find(item=>item.id===recordId),entry=record?.equipmentItems?.[index];if(!entry)return;const returned=Number(entry.returnedQty||0),remaining=Math.max(0,Number(entry.qty||0)-returned);
  openEntryModal(`${entryHeader("장비 부분 반납",entry.name)}<div class="form"><div class="callout">현재 사용 중 ${remaining}대 · 기존 반납 ${returned}대</div><label>이번 반납 수량<input id="partialReturnQty" type="number" inputmode="numeric" min="0" max="${remaining}" value="${remaining}"></label><label>반납 메모<textarea id="partialReturnMemo"></textarea></label><button class="btn primary" id="savePartialReturn" type="button">반납 기록</button></div>`);
  document.getElementById("savePartialReturn")?.addEventListener("click",()=>{const qty=Math.round(Number(document.getElementById("partialReturnQty").value||0));if(qty<=0||qty>remaining){showFeedback("error","반납 수량을 확인해주세요");return;}entry.returnedQty=returned+qty;entry.returnHistory=entry.returnHistory||[];entry.returnHistory.push({id:uid(),date:todayISO(),qty,memo:document.getElementById("partialReturnMemo").value.trim(),createdAt:new Date().toISOString()});save();closeEntryModal();showFeedback("success","장비 반납을 기록했습니다");openDetail(recordId,{push:false,remember:false});});
}

function openTrash(){
  closeMenu();const cutoff=Date.now()-30*86400000;state.trash=(state.trash||[]).filter(item=>new Date(item.deletedAt).getTime()>=cutoff);const items=[...state.trash].sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt));
  openEntryModal(`${entryHeader("임시 보관함","삭제 자료는 이 기기의 백업에도 포함됩니다")}<div class="list-card">${items.map(item=>`<div class="list-row"><div><div class="row-title">${esc(item.data?.title||item.data?.name||"삭제 자료")}</div><div class="row-sub">${item.kind==="record"?"이력":"자료"} · ${new Date(item.deletedAt).toLocaleString("ko-KR")}</div></div><button class="btn secondary compact" data-trash-restore="${item.id}" type="button">복원</button></div>`).join("")||`<div class="emptybox">임시 보관 자료가 없습니다.</div>`}</div>`);
  document.querySelectorAll("[data-trash-restore]").forEach(button=>button.onclick=async()=>{const entry=state.trash.find(item=>item.id===button.dataset.trashRestore);if(!entry||!await askConfirm("자료 복원","삭제했던 자료를 다시 복원할까요?","복원"))return;
    if(entry.kind==="record"){const record=entry.data;if(record.status!=="pending"){if(record.flow==="재고수정")record.items.forEach(item=>state.stock[record.warehouse][item.name]=Number(item.after||0));else if(record.flow==="이송"&&record.targetWarehouse){applyStock(record.warehouse,record.items,"출고");applyStock(record.targetWarehouse,record.items,"입고");}else if(record.flow!=="긴급")applyStock(record.warehouse,record.items,record.flow||"출고");}state.records.push(record);}
    else if(entry.kind==="equipment")state.equipment.push(entry.data);
    else if(entry.kind==="material"){state.catalog.push(entry.data.item);Object.entries(entry.data.stock||{}).forEach(([warehouse,qty])=>{if(state.stock[warehouse])state.stock[warehouse][entry.data.item.name]=Number(qty||0);});}
    state.trash=state.trash.filter(item=>item.id!==entry.id);save();closeEntryModal();showFeedback("success","자료를 복원했습니다");});
}

function renderMemo(){
  const sorted = [...state.memos].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  const editing = editingMemoId ? state.memos.find(memo => memo.id === editingMemoId) : null;
  if(editingMemoId && !editing) editingMemoId = null;
  view.innerHTML = `
    <button class="back" id="backMemoHome" type="button">‹ 홈</button>
    <div class="card">
      <div class="section-title">${editing ? "메모 수정" : "메모 작성"}</div>
      <div class="form">
        <label>일자<input id="memoDate" type="date" value="${esc(editing?.date || todayISO())}"></label>
        <label>제목<input id="memoTitle" value="${esc(editing?.title || "")}" placeholder="예: 보관 점검 특이사항"></label>
        <label>내용<textarea id="memoBody" placeholder="메모 내용을 입력하세요">${esc(editing?.body || "")}</textarea></label>
        <div class="entry-actions">${editing ? `<button class="btn gray" id="cancelMemoEdit" type="button">취소</button>` : `<button class="btn gray" id="clearMemoForm" type="button">비우기</button>`}<button class="btn primary" id="saveMemo" type="button">${editing ? "수정 저장" : "메모 저장"}</button></div>
      </div>
    </div>
    <div class="section-head"><div class="section-title">일자별 메모</div><div class="row-sub">${sorted.length}건</div></div>
    <div class="list-card">${sorted.length ? sorted.map(memo => `
      <div class="list-row memo-row">
        <button class="memo-main" data-memo-edit="${memo.id}" type="button"><div class="row-title">${esc(memo.title)}</div><div class="row-sub">${fmtDate(memo.date)} · ${esc((memo.body || "").slice(0,60))}</div></button>
        <button class="btn danger compact" data-memo-del="${memo.id}" type="button">삭제</button>
      </div>`).join("") : `<div class="emptybox">아직 메모가 없습니다.</div>`}</div>
  `;
  document.getElementById("backMemoHome")?.addEventListener("click", () => window.history.back());
  document.getElementById("saveMemo")?.addEventListener("click", saveMemo);
  document.getElementById("cancelMemoEdit")?.addEventListener("click", () => { editingMemoId=null; renderMemo(); });
  document.getElementById("clearMemoForm")?.addEventListener("click", () => { document.getElementById("memoTitle").value=""; document.getElementById("memoBody").value=""; });
  view.querySelectorAll("[data-memo-edit]").forEach(button => button.addEventListener("click", () => { editingMemoId=button.dataset.memoEdit; renderMemo(); }));
  view.querySelectorAll("[data-memo-del]").forEach(button => button.addEventListener("click", async () => {
    if(!await askConfirm("메모 삭제","선택한 메모를 삭제할까요?","삭제",true)) return;
    const undoState=JSON.stringify(state);
    state.memos = state.memos.filter(memo => memo.id !== button.dataset.memoDel);
    if(editingMemoId === button.dataset.memoDel) editingMemoId = null;
    save();
    renderMemo();
    showUndoSnack("메모 삭제",undoState,renderMemo);
  }));
}

function saveMemo(){
  const date = document.getElementById("memoDate").value || todayISO();
  const title = document.getElementById("memoTitle").value.trim() || "메모";
  const body = document.getElementById("memoBody").value.trim();
  if(!body){ showSnack("메모 내용을 입력해주세요"); return; }
  const existing = editingMemoId ? state.memos.find(memo => memo.id === editingMemoId) : null;
  if(existing){
    Object.assign(existing,{date,title,body,updatedAt:new Date().toISOString()});
  }else{
    state.memos.push({id:uid(),date,title,body,createdAt:new Date().toISOString(),updatedAt:null});
  }
  save();
  const message = existing ? "메모 수정 완료" : "메모 저장";
  editingMemoId = null;
  showSnack(message);
  renderMemo();
}

function backup(){
  const payload = {...stripStoredPhotos(JSON.parse(JSON.stringify(state))), backupVersion: VERSION, backupDate: new Date().toISOString()};
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `victor_backup_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  state.lastBackup = new Date().toISOString();
  save();
  updateBackupLabel();
  showSnack("백업 완료");
}

function restoreFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      state = normalize(JSON.parse(reader.result));
      save();
      showSnack("복원 완료");
      render();
    }catch(e){
      showSnack("복원 실패");
    }
  };
  reader.readAsText(file);
}

async function resetAll(){
  if(!await askConfirm("전체 초기화","모든 재고, 이력, 메모가 삭제됩니다. 먼저 데이터 백업을 권장합니다.","계속",true)) return;
  if(!await askConfirm("최종 확인","정말 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.","전체 초기화",true)) return;
  state = defaultState();
  save();
  showSnack("초기화 완료");
  render();
}


function surveyItems(){
  const arr = [];
  warehouses.forEach(w => catalog.forEach(i => arr.push({warehouse:w,name:i.name,cat:i.cat,unit:i.unit})));
  return arr;
}

async function startSurvey(){
  const items = surveyItems();
  if(state.survey && state.survey.active){
    const keep = await askConfirm("재고조사 이어하기",`진행상황 ${(state.survey.index||0)+1} / ${items.length}에서 이어서 진행할까요?`,"이어서 진행");
    if(!keep) state.survey = null;
  }
  if(!state.survey || !state.survey.active){
    state.survey = {active:true,index:0,startedAt:new Date().toISOString(),values:{}};
  }
  save();
  renderSurvey();
}

function renderSurvey(){
  page = "survey";
  document.querySelectorAll(".nav").forEach(b => b.classList.remove("active"));
  document.getElementById("headTitle").innerHTML = `<div class="page-title">재고조사</div><div class="date">실사 수량 입력</div>`;
  const items = surveyItems();
  const idx = Math.min(state.survey?.index || 0, items.length - 1);
  const it = items[idx];
  const key = it.warehouse + "|" + it.name;
  const cur = (state.stock[it.warehouse] && state.stock[it.warehouse][it.name]) || 0;
  const saved = state.survey.values[key];
  const doneCount = Object.keys(state.survey.values || {}).length;
  const pct = Math.round((doneCount / items.length) * 100);
  view.innerHTML = `
    <button class="back" id="exitSurvey" type="button">‹ 나가기</button>
    <div class="card">
      <div class="section-title">재고조사</div>
      <div class="row-sub">${doneCount} / ${items.length} · ${pct}%</div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="card">
      <div><span class="badge blue">${esc(it.warehouse)}</span></div>
      <div class="row-title" style="font-size:22px;margin-top:12px">${esc(it.name)}</div>
      <div class="row-sub">${esc(it.cat)} · 현재 재고 ${materialQtyText(cur,it.unit,it)}</div>
      <label style="display:block;margin-top:18px">실사 수량 (${esc(it.unit)})
        <input class="big-input" id="surveyQty" inputmode="decimal" type="number" min="0" step="0.1" value="${saved ?? ""}" placeholder="미입력 시 0">
      </label>
      <div class="row-sub" id="surveyDiff" style="text-align:center;margin-top:10px"></div>
    </div>
    <div class="btn-row" style="display:grid;grid-template-columns:1fr 1fr">
      <button class="btn gray" id="surveyPrev" type="button">이전</button>
      <button class="btn primary" id="surveyNext" type="button">다음</button>
    </div>
    <button class="btn secondary" id="surveyReview" type="button" style="width:100%;margin-top:10px">변경사항 검토</button>
  `;
  const input = document.getElementById("surveyQty");
  const diff = document.getElementById("surveyDiff");
  function clean(){
    let val = String(input.value || "").replace(/[^0-9.]/g,"");
    const parts = val.split(".");
    if(parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
    if(val.length > 1 && val[0] === "0" && val[1] !== ".") val = String(Number(val));
    input.value = val;
    if(val === "") diff.textContent = "미입력 시 0으로 저장";
    else {
      const n = Number(val || 0);
      diff.textContent = n === cur ? "변경 없음" : `변경: ${materialQtyText(cur,it.unit,it)} → ${materialQtyText(n,it.unit,it)}`;
    }
  }
  function saveSurveyValue(move=true){
    clean();
    if(input.value === "") input.value = "0";
    state.survey.values[key] = Number(input.value);
    save();
    showSnack("저장되었습니다");
    if(move && idx < items.length - 1){
      state.survey.index = idx + 1;
      save();
      renderSurvey();
    }
  }
  input.addEventListener("input", clean);
  document.getElementById("surveyPrev")?.addEventListener("click", () => { state.survey.index = Math.max(0,idx-1); save(); renderSurvey(); });
  document.getElementById("surveyNext")?.addEventListener("click", () => saveSurveyValue(true));
  document.getElementById("surveyReview")?.addEventListener("click", renderSurveyReview);
  document.getElementById("exitSurvey")?.addEventListener("click", async () => { if(await askConfirm("재고조사 나가기","진행상황은 저장됩니다.","나가기")) setPage("home"); });
  clean();
  input.focus();
}

function renderSurveyReview(){
  const items = surveyItems();
  const vals = state.survey?.values || {};
  const changed = [];
  const missing = [];
  items.forEach(it => {
    const key = it.warehouse + "|" + it.name;
    if(!(key in vals)){ missing.push(it); return; }
    const cur = (state.stock[it.warehouse] && state.stock[it.warehouse][it.name]) || 0;
    const val = Number(vals[key]);
    if(cur !== val) changed.push({...it,cur,val});
  });
  view.innerHTML = `
    <button class="back" id="backSurvey" type="button">‹ 재고조사</button>
    <div class="card">
      <div class="section-title">변경사항 검토</div>
      <div class="grid2">
        <div class="metric" style="height:82px"><div><div class="metric-label">변경</div><div class="metric-value">${changed.length}개</div></div></div>
        <div class="metric" style="height:82px"><div><div class="metric-label">미입력</div><div class="metric-value">${missing.length}개</div></div></div>
      </div>
    </div>
    <div class="list-card">
      ${changed.length ? changed.map(x => `<div class="list-row"><div><div class="row-title">${esc(x.name)}</div><div class="row-sub">${esc(x.warehouse)} · ${materialQtyText(x.cur,x.unit,x)} → ${materialQtyText(x.val,x.unit,x)}</div></div></div>`).join("") : `<div class="emptybox">변경된 품목이 없습니다.</div>`}
    </div>
    ${missing.length ? `<div class="callout">미입력 품목 ${missing.length}개는 0으로 반영됩니다.</div>` : ""}
    <div class="card"><label>담당 메모<textarea id="surveyReviewMemo" placeholder="실사 특이사항 또는 담당 메모"></textarea></label></div>
    <button class="btn primary" id="applySurvey" type="button" style="width:100%;margin-top:10px">재고 반영</button>
    <button class="btn gray" id="cancelSurvey" type="button" style="width:100%;margin-top:10px">취소</button>
  `;
  document.getElementById("backSurvey")?.addEventListener("click", renderSurvey);
  document.getElementById("cancelSurvey")?.addEventListener("click", () => setPage("home"));
  document.getElementById("applySurvey")?.addEventListener("click", async () => {
    if(!await askConfirm("재고조사 반영","검토한 실사 수량으로 재고를 반영할까요?","재고 반영")) return;
    const changes=[];
    const summaryValues=items.map(it=>{const key=it.warehouse+"|"+it.name;return {...it,before:Number(state.stock[it.warehouse]?.[it.name]||0),after:key in vals?Number(vals[key]):0};});
    items.forEach(it => {
      const key = it.warehouse + "|" + it.name;
      const val = key in vals ? Number(vals[key]) : 0;
      const before = state.stock[it.warehouse][it.name] || 0;
      state.stock[it.warehouse][it.name] = val;
      if(before !== val){
        changes.push({warehouse:it.warehouse,name:it.name,before,after:val});
        state.logs.push({id:uid(),date:todayISO(),type:"재고조사",warehouse:it.warehouse,item:it.name,before,after:val,createdAt:new Date().toISOString()});
      }
    });
    const summary={date:todayISO(),checked:items.length,zeroCount:summaryValues.filter(it=>Number(it.after||0)===0).length,changedCount:changes.length,memo:document.getElementById("surveyReviewMemo")?.value.trim()||""};
    state.survey = {active:false,index:0,values:{},done:true,endedAt:new Date().toISOString(),lastApplied:{appliedAt:new Date().toISOString(),changes,summary},lastSummary:summary};
    save();
    showSnack("재고조사 반영 완료");
    renderSurveySummary(summary);
  });
}

function openFastSurveySetup(){
  const catsNow=[...new Set(catalog.map(item=>item.cat))];
  openEntryModal(`${entryHeader("초기 재고실사","조사 범위를 선택하세요")}<div class="form"><label>창고<select id="fastSurveyWarehouse"><option value="all">전체 창고</option>${warehouses.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join("")}</select></label><label>분류<select id="fastSurveyCategory"><option value="all">전체 분류</option>${catsNow.map(cat=>`<option value="${esc(cat)}">${esc(cat)}</option>`).join("")}</select></label><button class="btn primary" id="startFastSurvey" type="button">실사 시작</button></div>`);
  document.getElementById("startFastSurvey")?.addEventListener("click",()=>{state.survey={active:true,index:0,startedAt:new Date().toISOString(),values:{},scope:{warehouse:document.getElementById("fastSurveyWarehouse").value,category:document.getElementById("fastSurveyCategory").value}};save();closeEntryModal();renderFastSurvey();});
}
async function restartFastSurvey(){if(!await askConfirm("재고실사 다시 시작","현재 진행 내용은 지우고 조사 범위 선택부터 다시 시작할까요?","다시 시작",true))return;state.survey={active:false,index:0,values:{},lastApplied:state.survey?.lastApplied||null};save();openFastSurveySetup();}
function fastSurveyItems(){const scope=state.survey?.scope||{warehouse:"all",category:"all"};return warehouses.filter(w=>scope.warehouse==="all"||w===scope.warehouse).flatMap(w=>catalog.filter(i=>scope.category==="all"||i.cat===scope.category).map(i=>({warehouse:w,name:i.name,cat:i.cat,unit:i.unit})));}
function renderFastSurvey(){
  page="survey";const items=fastSurveyItems(),idx=Math.min(state.survey?.index||0,Math.max(0,items.length-1)),it=items[idx];if(!it){showFeedback("info","선택 범위에 품목이 없습니다");setPage("home");return;}const key=`${it.warehouse}|${it.name}`,cur=Number(state.stock[it.warehouse]?.[it.name]||0),saved=state.survey.values[key];document.getElementById("headTitle").innerHTML=`<div class="page-title">신속 재고실사</div><div class="date">${idx+1} / ${items.length}</div>`;view.innerHTML=`<button class="back" id="exitFastSurvey" type="button">‹ 홈</button><div class="card"><span class="badge blue">${esc(it.warehouse)}</span><div class="section-title" style="margin-top:10px">${esc(it.name)}</div><div class="row-sub">${esc(it.cat)} · 기록 수량 ${qtyText(cur,it.unit)}</div><label>실사 수량<input class="big-input" id="fastSurveyQty" type="number" inputmode="decimal" min="0" value="${saved??""}" placeholder="변경할 때만 입력"></label><div class="survey-fast-actions two"><button class="btn gray" id="surveyZero" type="button">0</button><button class="btn primary" id="surveyDirect" type="button">직접 입력</button></div></div><div class="entry-actions"><button class="btn gray" id="fastPrev" type="button">이전</button><button class="btn primary" id="fastNext" type="button">다음</button></div><button class="btn secondary" id="fastBatch" type="button" style="width:100%;margin-top:9px">여러 품목 한 번에 입력</button><button class="btn secondary" id="fastReview" type="button" style="width:100%;margin-top:9px">차이 검토</button>`;
  const commit=value=>{state.survey.values[key]=Number(value);state.survey.index=Math.min(idx+1,items.length-1);save();if(idx===items.length-1)renderFastSurveyReview();else renderFastSurvey();};
  document.getElementById("surveyZero").onclick=()=>commit(0);document.getElementById("surveyDirect").onclick=()=>document.getElementById("fastSurveyQty").focus();document.getElementById("fastNext").onclick=()=>{const input=document.getElementById("fastSurveyQty");commit(input.value===""?cur:input.value);};document.getElementById("fastPrev").onclick=()=>{state.survey.index=Math.max(0,idx-1);save();renderFastSurvey();};document.getElementById("fastBatch").onclick=renderFastSurveyBatch;document.getElementById("fastReview").onclick=renderFastSurveyReview;document.getElementById("exitFastSurvey").onclick=()=>setPage("home");
}
function renderFastSurveyBatch(){const items=fastSurveyItems(),start=Math.floor((state.survey.index||0)/12)*12,rows=items.slice(start,start+12);view.innerHTML=`<button class="back" id="batchBack" type="button">‹ 한 품목씩</button><div class="card"><div class="section-title">일괄 재고입력</div>${rows.map((it,n)=>`<div class="batch-row"><div><strong>${esc(it.name)}</strong><div class="row-sub">${esc(it.warehouse)} · 기록 ${qtyText(state.stock[it.warehouse]?.[it.name]||0,it.unit)}</div></div><input data-batch="${n}" type="number" inputmode="decimal" min="0" value="${state.survey.values[`${it.warehouse}|${it.name}`]??""}" placeholder="변경할 때만 입력"></div>`).join("")}</div><button class="btn primary" id="batchSave" type="button" style="width:100%">저장 후 다음 묶음</button>`;document.getElementById("batchBack").onclick=renderFastSurvey;document.getElementById("batchSave").onclick=()=>{rows.forEach((it,n)=>{const input=document.querySelector(`[data-batch="${n}"]`),current=Number(state.stock[it.warehouse]?.[it.name]||0);state.survey.values[`${it.warehouse}|${it.name}`]=input.value===""?current:Number(input.value);});state.survey.index=Math.min(start+12,items.length-1);save();start+12>=items.length?renderFastSurveyReview():renderFastSurveyBatch();};}
function renderSurveySummary(summary){
  page="survey";
  document.getElementById("headTitle").innerHTML=`<div class="page-title">실사 완료</div><div class="date">${fmtDate(summary.date || todayISO())}</div>`;
  view.innerHTML=`<div class="card"><div class="section-title">재고실사 완료 요약</div><div class="summary-grid"><div class="summary-pill"><div class="summary-label">확인 품목</div><div class="summary-value">${Number(summary.checked||0).toLocaleString("ko-KR")}건</div></div><div class="summary-pill"><div class="summary-label">0재고</div><div class="summary-value">${Number(summary.zeroCount||0).toLocaleString("ko-KR")}건</div></div><div class="summary-pill"><div class="summary-label">변동</div><div class="summary-value">${Number(summary.changedCount||0).toLocaleString("ko-KR")}건</div></div></div>${summary.memo?`<div class="callout" style="margin-top:12px">${esc(summary.memo)}</div>`:""}</div><div class="card"><div class="section-title">다음 작업</div><div class="row-sub">필요하면 이력에서 재고수정 기록을 확인하고, 문제가 있으면 점3개 메뉴의 실사 반영 취소를 사용할 수 있습니다.</div></div><button class="btn primary" id="surveySummaryHome" type="button" style="width:100%">홈으로</button>`;
  document.getElementById("surveySummaryHome")?.addEventListener("click",()=>setPage("home"));
}

function renderFastSurveyReview(){const items=fastSurveyItems();items.forEach(it=>{const key=`${it.warehouse}|${it.name}`;if(!(key in state.survey.values))state.survey.values[key]=Number(state.stock[it.warehouse]?.[it.name]||0);});save();const reviewed=items.map(it=>({...it,before:Number(state.stock[it.warehouse]?.[it.name]||0),after:Number(state.survey.values[`${it.warehouse}|${it.name}`])}));const changed=reviewed.filter(it=>it.before!==it.after);const zeroCount=reviewed.filter(it=>Number(it.after||0)===0).length;view.innerHTML=`<button class="back" id="reviewBack" type="button">‹ 실사</button><div class="card"><div class="section-title">차이 ${changed.length}건</div>${changed.map(it=>`<div class="stock-line"><div><div class="stock-name">${esc(it.name)}</div><div class="stock-spec">${esc(it.warehouse)}</div></div><div class="stock-qty">${qtyText(it.before,it.unit)} → ${qtyText(it.after,it.unit)}</div></div>`).join("")||`<div class="emptybox">변경사항이 없습니다.</div>`}</div><div class="card"><label>담당 메모<textarea id="surveyApplyMemo" placeholder="실사 특이사항 또는 담당 메모"></textarea></label></div><button class="btn primary" id="applyFastSurvey" type="button" style="width:100%">선택 범위 재고 반영</button>`;document.getElementById("reviewBack").onclick=renderFastSurvey;document.getElementById("applyFastSurvey").onclick=async()=>{if(!await askConfirm("재고 반영",`선택 범위의 변경 ${changed.length}건을 반영할까요?`,"반영"))return;const summary={date:todayISO(),checked:items.length,zeroCount,changedCount:changed.length,memo:document.getElementById("surveyApplyMemo")?.value.trim()||""};const lastApplied={appliedAt:new Date().toISOString(),changes:changed.map(it=>({warehouse:it.warehouse,name:it.name,before:it.before,after:it.after})),summary};items.forEach(it=>{const key=`${it.warehouse}|${it.name}`;state.stock[it.warehouse][it.name]=Number(state.survey.values[key]);});state.survey={active:false,index:0,values:{},done:true,endedAt:new Date().toISOString(),lastApplied,lastSummary:summary};save();showFeedback("success","재고실사 반영 완료");renderSurveySummary(summary);};}

async function undoLastSurvey(){const applied=state.survey?.lastApplied;if(!applied?.changes?.length)return;if(!await askConfirm("실사 반영 취소",`${applied.changes.length}개 품목을 실사 전 수량으로 되돌릴까요?`,"되돌리기",true))return;applied.changes.forEach(change=>{if(state.stock[change.warehouse])state.stock[change.warehouse][change.name]=Number(change.before||0);});state.survey.lastApplied=null;save();showFeedback("success","직전 실사 반영을 취소했습니다");renderHome();}

function warehouseKind(place){return state.warehouseKinds?.[place]||(place==="방제지휘차량"?"차량":place==="소형방제정"?"함정":"기타");}
function isVehiclePlace(place){return warehouseKind(place)==="차량";}
function isVesselPlace(place){return warehouseKind(place)==="함정";}

function opTotal(place,field){
  const op = state.assetOps?.[place] || {};
  if(isVehiclePlace(place) && field === "distance") return Number(op.distanceBase || 0);
  if(isVesselPlace(place) && field === "mileage") return Number(op.mileageBase || 0);
  if(isVesselPlace(place) && field === "portHours") return Number(op.portHoursBase ?? op.hoursBase ?? 0);
  if(isVesselPlace(place) && field === "starboardHours") return Number(op.starboardHoursBase ?? op.hoursBase ?? 0);
  return 0;
}
function vehicleMonthlyDistance(place){const month=todayISO().slice(0,7);return (state.assetOps?.[place]?.logs||[]).filter(log=>String(log.date||"").slice(0,7)===month).reduce((sum,log)=>sum+Number(log.diff??log.distance??0),0);}

function vesselFuelTotals(place){const now=todayISO(),month=now.slice(0,7),year=now.slice(0,4),logs=state.assetOps?.[place]?.logs||[];return {month:logs.filter(log=>String(log.date||"").slice(0,7)===month).reduce((sum,log)=>sum+Number(log.fuel||0),0),year:logs.filter(log=>String(log.date||"").slice(0,4)===year).reduce((sum,log)=>sum+Number(log.fuel||0),0)};}
function vesselMonthlyMileage(place){const month=todayISO().slice(0,7);return (state.assetOps?.[place]?.logs||[]).filter(log=>String(log.date||"").slice(0,7)===month).reduce((sum,log)=>sum+Number(log.mileageDiff||0),0);}
const vesselActivities=["출입검사","선외검사","방제훈련","방제조치","기타"];
function logActivityCounts(log){const counts={};vesselActivities.forEach(activity=>counts[activity]=Math.max(0,Math.round(Number(log.activityCounts?.[activity]||0))));if(!log.activityCounts&&log.activity)counts[log.activity]=Math.max(1,counts[log.activity]||0);return counts;}
function readActivityCounts(prefix){const counts={};vesselActivities.forEach((activity,index)=>counts[activity]=Math.max(0,Math.round(Number(document.getElementById(`${prefix}${index}`)?.value||0))));return counts;}
function activityInputs(prefix,counts={}){return `<div class="group-title">활동 횟수</div><div class="activity-count-grid">${vesselActivities.map((activity,index)=>`<label>${activity}<input id="${prefix}${index}" type="number" inputmode="numeric" min="0" step="1" value="${Number(counts[activity]||0)||""}" placeholder="0"></label>`).join("")}</div>`;}
function activityCountText(log){const counts=logActivityCounts(log);return vesselActivities.filter(activity=>counts[activity]>0).map(activity=>`${activity} ${counts[activity]}회`).join(" · ")||"활동 0회";}
function logHasActivity(log,activity){return activity==="all"||logActivityCounts(log)[activity]>0;}
function vesselMonthlySummary(place,month=todayISO().slice(0,7)){const logs=(state.assetOps?.[place]?.logs||[]).filter(log=>String(log.date||"").slice(0,7)===month),activities={};vesselActivities.forEach(activity=>activities[activity]=0);logs.forEach(log=>{const counts=logActivityCounts(log);vesselActivities.forEach(activity=>activities[activity]+=counts[activity]);});return {logs,count:logs.length,mileage:logs.reduce((sum,log)=>sum+Number(log.mileageDiff||0),0),port:logs.reduce((sum,log)=>sum+Number(log.portDiff||0),0),starboard:logs.reduce((sum,log)=>sum+Number(log.starboardDiff||0),0),fuel:logs.reduce((sum,log)=>sum+Number(log.fuel||0),0),activities};}

function renderOps(place){
  if(!isVehiclePlace(place)&&!isVesselPlace(place)) return "";
  if(isVehiclePlace(place)){
    return `<div class="card"><div class="section-title">차량 관리</div>
      <div class="metric" style="height:82px"><div><div class="metric-label">누적 주행거리</div><div class="metric-value">${opTotal(place,"distance")}km</div><div class="row-sub">이번 달 ${vehicleMonthlyDistance(place)}km</div></div></div>
      <div class="btn-row" style="display:grid;grid-template-columns:1fr 1fr;margin-top:12px">
        <button class="btn secondary" id="editOpBase" type="button">초기거리설정</button>
        <button class="btn primary" id="addOpLog" type="button">주행 기록</button>
      </div>
      <button class="btn secondary" id="addAssetMaintenance" type="button" style="width:100%;margin-top:9px">+ 정비이력 추가</button>
      <div class="section-title" style="margin-top:16px">최근 이력</div>${recentOpRows(place)}
      <div class="section-title" style="margin-top:16px">정비이력</div>${assetMaintenanceRows(place)}
    </div>`;
  }
  const fuelTotals=vesselFuelTotals(place);
  const monthly=vesselMonthlySummary(place);
  return `<div class="card"><div class="section-title">${esc(place)} 관리</div>
    <div class="grid2">
      <div class="metric" style="height:82px"><div><div class="metric-label">누적 마일수</div><div class="metric-value">${opTotal(place,"mileage")}NM</div><div class="row-sub">이번 달 ${vesselMonthlyMileage(place)}NM</div></div></div>
      <div class="metric" style="height:82px"><div><div class="metric-label">좌현 엔진</div><div class="metric-value">${opTotal(place,"portHours")}h</div></div></div>
      <div class="metric" style="height:82px"><div><div class="metric-label">우현 엔진</div><div class="metric-value">${opTotal(place,"starboardHours")}h</div></div></div>
      <div class="metric" style="height:82px"><div><div class="metric-label">이번 달 연료유</div><div class="metric-value">${fuelTotals.month}L</div><div class="row-sub">올해 ${fuelTotals.year}L</div></div></div>
    </div>
    <div class="callout"><strong>이번 달 운항 요약</strong><br>${monthly.count}회 · ${monthly.mileage}NM · 좌현 ${monthly.port}h · 우현 ${monthly.starboard}h · 연료유 ${monthly.fuel}L<br>${vesselActivities.map(activity=>`${activity} ${monthly.activities[activity]||0}회`).join(" · ")}</div>
    <div class="btn-row" style="display:grid;grid-template-columns:1fr 1fr;margin-top:12px">
        <button class="btn secondary" id="editOpBase" type="button">초기시간설정</button>
        <button class="btn primary" id="addOpLog" type="button">운항 기록</button>
    </div>
    <button class="btn secondary" id="addAssetMaintenance" type="button" style="width:100%;margin-top:9px">+ 정비이력 추가</button>
    <div class="section-title" style="margin-top:16px">최근 이력</div>${recentOpRows(place)}
    <button class="btn gray" id="openVesselHistory" type="button" style="width:100%;margin-top:9px">전체 운항이력·검색</button>
    <div class="section-title" style="margin-top:16px">정비이력</div>${assetMaintenanceRows(place)}
  </div>`;
}

function editOpBase(place){
  const vehicle=isVehiclePlace(place);
  openEntryModal(`${entryHeader(vehicle?"초기거리 설정":"초기 운항계기 설정",place)}<div class="form">${vehicle?`<label>계기판 누적거리(km)<input id="opBaseDistance" type="number" inputmode="decimal" min="0" value="${opTotal(place,"distance")}"></label>`:`<label>누적 마일수(NM)<input id="opBaseMileage" type="number" inputmode="decimal" min="0" value="${opTotal(place,"mileage")}"></label><label>좌현 엔진 누적시간(h)<input id="opBasePortHours" type="number" inputmode="decimal" min="0" value="${opTotal(place,"portHours")}"></label><label>우현 엔진 누적시간(h)<input id="opBaseStarboardHours" type="number" inputmode="decimal" min="0" value="${opTotal(place,"starboardHours")}"></label>`}<button class="btn primary" id="saveOpBase" type="button">덮어쓰기 저장</button></div>`);
  document.getElementById("saveOpBase")?.addEventListener("click",()=>{
    if(vehicle){ const value=Number(document.getElementById("opBaseDistance").value); if(!Number.isFinite(value)||value<0){showFeedback("error","올바른 숫자를 입력해주세요");return;} state.assetOps[place].distanceBase=value; }
    else{ const mileage=Number(document.getElementById("opBaseMileage").value),port=Number(document.getElementById("opBasePortHours").value),starboard=Number(document.getElementById("opBaseStarboardHours").value);if(!Number.isFinite(mileage)||mileage<0||!Number.isFinite(port)||port<0||!Number.isFinite(starboard)||starboard<0){showFeedback("error","마일수와 좌·우 엔진 시간을 확인해주세요");return;}state.assetOps[place].mileageBase=mileage;state.assetOps[place].portHoursBase=port;state.assetOps[place].starboardHoursBase=starboard;state.assetOps[place].engineSplitMode="dual"; }
    save(); closeEntryModal(); showFeedback("success","초기값 저장"); renderWarehouse();
  });
}

function addOpLog(place){
  const vehicle=isVehiclePlace(place);
  openEntryModal(`${entryHeader(vehicle?"주행 기록":"운항 기록",place)}<div class="form"><label>날짜<input id="opLogDate" type="date" value="${todayISO()}"></label>${vehicle?`<label>계기판 누적거리(km)<input id="opLogDistance" type="number" inputmode="decimal" min="0" value="" placeholder="현재 ${opTotal(place,"distance")}km"></label>`:`${activityInputs("opLogActivity",{})}<label>운항자<input id="opLogOperator" placeholder="운항자 이름"></label><label>동승자<input id="opLogPassengers" placeholder="여러 명은 쉼표로 구분"></label><label>활동 해역<input id="opLogArea" placeholder="예: 통영항 인근"></label><div class="grid2"><label>출항지<input id="opLogDeparture" placeholder="출항지"></label><label>도착지<input id="opLogArrival" placeholder="도착지"></label></div><label>누적 마일수(NM)<input id="opLogMileage" type="number" inputmode="decimal" min="0" value="" placeholder="현재 ${opTotal(place,"mileage")}NM"></label><label>좌현 엔진 누적시간(h)<input id="opLogPortHours" type="number" inputmode="decimal" min="0" value="" placeholder="현재 ${opTotal(place,"portHours")}h"></label><label>우현 엔진 누적시간(h)<input id="opLogStarboardHours" type="number" inputmode="decimal" min="0" value="" placeholder="현재 ${opTotal(place,"starboardHours")}h"></label><label>연료유 소모량(L)<input id="opLogFuel" type="number" inputmode="decimal" min="0" value="" placeholder="이번 운항 소모량"></label>`}<label>메모<textarea id="opLogMemo"></textarea></label><button class="btn primary" id="saveOpLog" type="button">저장</button></div>`);
  document.getElementById("saveOpLog")?.addEventListener("click",()=>{
    const common={id:uid(),date:document.getElementById("opLogDate").value || todayISO(),memo:document.getElementById("opLogMemo").value.trim(),createdAt:new Date().toISOString()};
    if(vehicle){const input=document.getElementById("opLogDistance"),before=opTotal(place,"distance"),after=Number(input.value);if(input.value===""||!Number.isFinite(after)||after<before){showFeedback("error","현재 계기판 누적거리를 입력해주세요");return;}state.assetOps[place].distanceBase=after;state.assetOps[place].logs.push({...common,before,after,diff:after-before});}
    else{const mileageInput=document.getElementById("opLogMileage"),portInput=document.getElementById("opLogPortHours"),starboardInput=document.getElementById("opLogStarboardHours"),activityCounts=readActivityCounts("opLogActivity"),operator=document.getElementById("opLogOperator").value.trim(),passengers=document.getElementById("opLogPassengers").value.trim(),area=document.getElementById("opLogArea").value.trim(),departure=document.getElementById("opLogDeparture").value.trim(),arrival=document.getElementById("opLogArrival").value.trim(),mileageBefore=opTotal(place,"mileage"),portBefore=opTotal(place,"portHours"),starboardBefore=opTotal(place,"starboardHours"),mileageAfter=Number(mileageInput.value),portAfter=Number(portInput.value),starboardAfter=Number(starboardInput.value),fuel=Number(document.getElementById("opLogFuel").value||0);if(mileageInput.value===""||portInput.value===""||starboardInput.value===""||!Number.isFinite(mileageAfter)||mileageAfter<mileageBefore||!Number.isFinite(portAfter)||portAfter<portBefore||!Number.isFinite(starboardAfter)||starboardAfter<starboardBefore||!Number.isFinite(fuel)||fuel<0){showFeedback("error","마일수·좌우 엔진시간·연료유 소모량을 확인해주세요");return;}state.assetOps[place].mileageBase=mileageAfter;state.assetOps[place].portHoursBase=portAfter;state.assetOps[place].starboardHoursBase=starboardAfter;state.assetOps[place].engineSplitMode="dual";state.assetOps[place].logs.push({...common,activityCounts,operator,passengers,area,departure,arrival,mileageBefore,mileageAfter,mileageDiff:mileageAfter-mileageBefore,portBefore,portAfter,portDiff:portAfter-portBefore,starboardBefore,starboardAfter,starboardDiff:starboardAfter-starboardBefore,fuel});}
    save(); closeEntryModal(); showFeedback("success","일일 이력 저장"); renderWarehouse();
  });
}

function recentOpRows(place){
  const logs = [...((state.assetOps?.[place]?.logs) || [])].slice(-5).reverse();
  if(!logs.length) return `<div class="emptybox">아직 일일 이력이 없습니다.</div>`;
  const allLogs=state.assetOps?.[place]?.logs||[],latestId=allLogs.length?allLogs[allLogs.length-1].id:null;
  return logs.map(l=>{const dual=l.portAfter!==undefined&&l.starboardAfter!==undefined,editable=l.after!==undefined||dual;const mileage=l.mileageAfter!==undefined?`마일 ${Number(l.mileageBefore||0)} → ${Number(l.mileageAfter)}NM · `:"";const text=dual?`${mileage}좌현 ${Number(l.portBefore||0)} → ${Number(l.portAfter)}h · 우현 ${Number(l.starboardBefore||0)} → ${Number(l.starboardAfter)}h`:l.after!==undefined?`${Number(l.before||0)} → ${Number(l.after)} · +${Number(l.diff||0)}${isVehiclePlace(place)?"km":"h"}`:(isVehiclePlace(place)?`기존 이력 +${Number(l.distance||0)}km`:`기존 단일시간 이력 +${Number(l.hours||0)}h`);const crew=isVesselPlace(place)&&l.operator?` · 운항자 ${esc(l.operator)}${l.passengers?` · 동승 ${esc(l.passengers)}`:""}`:"";const route=isVesselPlace(place)?`${l.area?` · 해역 ${esc(l.area)}`:""}${l.departure||l.arrival?` · ${esc(l.departure||"미입력")} → ${esc(l.arrival||"미입력")}`:""}`:"";return `<div class="list-row"><div><div class="row-title">${esc(l.date||"")}${isVesselPlace(place)?` <span class="badge blue">${esc(activityCountText(l))}</span>`:""}</div><div class="row-sub">${text}${isVesselPlace(place)&&Number(l.fuel||0)>0?` · 연료유 ${Number(l.fuel)}L`:""}${crew}${route}${l.memo?` · ${esc(l.memo)}`:""}</div>${l.id===latestId&&editable?`<div class="btn-row" style="margin-top:7px"><button class="btn gray compact" data-op-edit="${l.id}" type="button">수정</button><button class="btn danger compact" data-op-delete="${l.id}" type="button">삭제</button></div>`:""}</div></div>`;}).join("");
}

function bindOpLogActions(place){
  view.querySelector("[data-op-edit]")?.addEventListener("click",event=>editLatestOpLog(place,event.currentTarget.dataset.opEdit));
  view.querySelector("[data-op-delete]")?.addEventListener("click",async event=>{const op=state.assetOps?.[place],log=op?.logs?.length?op.logs[op.logs.length-1]:null;if(!log||log.id!==event.currentTarget.dataset.opDelete)return;if(!await askConfirm("최근 이력 삭제","최근 기록을 삭제하고 누적값을 이전 값으로 되돌릴까요?","삭제",true))return;if(isVehiclePlace(place))op.distanceBase=Number(log.before||0);else{op.mileageBase=Number(log.mileageBefore??op.mileageBase??0);op.portHoursBase=Number(log.portBefore??log.before??op.portHoursBase??0);op.starboardHoursBase=Number(log.starboardBefore??log.before??op.starboardHoursBase??0);}op.logs.pop();save();showFeedback("success","최근 이력 삭제 완료");renderWarehouse();});
}

function openVesselHistory(place){const month=todayISO().slice(0,7);openEntryModal(`${entryHeader("전체 운항이력",place)}<div class="form"><div class="history-filter-grid"><label>시작일<input id="vesselHistoryFrom" type="date" value="${month}-01"></label><label>종료일<input id="vesselHistoryTo" type="date" value="${todayISO()}"></label></div><label>활동<select id="vesselHistoryActivity"><option value="all">전체 활동</option>${vesselActivities.map(activity=>`<option>${activity}</option>`).join("")}</select></label></div><div id="vesselHistorySummary" class="callout"></div><div id="vesselHistoryList"></div>`);const update=()=>{const from=document.getElementById("vesselHistoryFrom").value,to=document.getElementById("vesselHistoryTo").value,activity=document.getElementById("vesselHistoryActivity").value;const logs=[...(state.assetOps?.[place]?.logs||[])].filter(log=>(!from||log.date>=from)&&(!to||log.date<=to)&&logHasActivity(log,activity)).sort((a,b)=>(b.date+b.createdAt).localeCompare(a.date+a.createdAt));const mileage=logs.reduce((sum,log)=>sum+Number(log.mileageDiff||0),0),port=logs.reduce((sum,log)=>sum+Number(log.portDiff||0),0),starboard=logs.reduce((sum,log)=>sum+Number(log.starboardDiff||0),0),fuel=logs.reduce((sum,log)=>sum+Number(log.fuel||0),0);document.getElementById("vesselHistorySummary").innerHTML=`<strong>검색 결과 ${logs.length}회</strong><br>${mileage}NM · 좌현 ${port}h · 우현 ${starboard}h · 연료유 ${fuel}L`;document.getElementById("vesselHistoryList").innerHTML=logs.map(log=>`<div class="history-box"><div><span class="badge blue">${esc(activityCountText(log))}</span></div><div class="row-title" style="margin-top:7px">${fmtDate(log.date)}${log.operator?` · 운항자 ${esc(log.operator)}`:""}</div><div class="row-sub">${Number(log.mileageDiff||0)}NM · 좌현 ${Number(log.portDiff||0)}h · 우현 ${Number(log.starboardDiff||0)}h · 연료유 ${Number(log.fuel||0)}L</div>${log.area?`<div class="row-sub">활동 해역 ${esc(log.area)}</div>`:""}${log.departure||log.arrival?`<div class="row-sub">${esc(log.departure||"미입력")} → ${esc(log.arrival||"미입력")}</div>`:""}${log.passengers?`<div class="row-sub">동승자 ${esc(log.passengers)}</div>`:""}${log.memo?`<div class="row-sub">${esc(log.memo)}</div>`:""}</div>`).join("")||`<div class="emptybox">조건에 맞는 운항이력이 없습니다.</div>`;};["vesselHistoryFrom","vesselHistoryTo","vesselHistoryActivity"].forEach(id=>document.getElementById(id)?.addEventListener("change",update));update();}

function assetMaintenanceRows(place){const rows=[...(state.assetOps?.[place]?.maintenance||[])].sort((a,b)=>(b.date+b.createdAt).localeCompare(a.date+a.createdAt)).slice(0,20);if(!rows.length)return `<div class="emptybox">등록된 정비이력이 없습니다.</div>`;return rows.map(log=>`<div class="history-box"><div><span class="badge orange">${esc(log.type||"정비")}</span></div><div class="row-title" style="margin-top:7px">${esc(log.content||"정비 기록")}</div><div class="row-sub">${fmtDate(log.date)}${log.parts?` · 부속품 ${esc(log.parts)}`:""}${Number(log.cost||0)>0?` · ${Number(log.cost).toLocaleString("ko-KR")}원`:""}</div>${log.memo?`<div class="row-sub">${esc(log.memo)}</div>`:""}<div class="btn-row" style="margin-top:8px"><button class="btn gray compact" data-asset-maint-edit="${log.id}" type="button">수정</button><button class="btn danger compact" data-asset-maint-delete="${log.id}" type="button">삭제</button></div></div>`).join("");}

function openAssetMaintenanceForm(place,id=""){const op=state.assetOps?.[place];if(!op)return;op.maintenance=op.maintenance||[];const existing=op.maintenance.find(log=>log.id===id);openEntryModal(`${entryHeader(existing?"정비이력 수정":"정비이력 추가",place)}<div class="form"><label>정비일<input id="assetMaintDate" type="date" value="${esc(existing?.date||todayISO())}"></label><label>정비 구분<select id="assetMaintType">${["정기점검","수리","부속품 교체","오일·소모품","기타"].map(type=>`<option ${type===(existing?.type||"정기점검")?"selected":""}>${type}</option>`).join("")}</select></label><label>정비 내용<input id="assetMaintContent" value="${esc(existing?.content||"")}" placeholder="점검·수리한 내용을 입력하세요"></label><label>부속품·교체품<input id="assetMaintParts" value="${esc(existing?.parts||"")}" placeholder="없으면 비워두세요"></label><label>비용(원)<input id="assetMaintCost" type="number" inputmode="numeric" min="0" value="${Number(existing?.cost||0)||""}" placeholder="선택 입력"></label><label>메모<textarea id="assetMaintMemo">${esc(existing?.memo||"")}</textarea></label><button class="btn primary" id="saveAssetMaintenance" type="button">저장</button></div>`);document.getElementById("saveAssetMaintenance")?.addEventListener("click",()=>{const content=document.getElementById("assetMaintContent").value.trim(),cost=Number(document.getElementById("assetMaintCost").value||0);if(!content){showFeedback("error","정비 내용을 입력해주세요");return;}if(!Number.isFinite(cost)||cost<0){showFeedback("error","비용을 확인해주세요");return;}const data={date:document.getElementById("assetMaintDate").value||todayISO(),type:document.getElementById("assetMaintType").value,content,parts:document.getElementById("assetMaintParts").value.trim(),cost,memo:document.getElementById("assetMaintMemo").value.trim(),updatedAt:new Date().toISOString()};if(existing)Object.assign(existing,data);else op.maintenance.push({id:uid(),...data,createdAt:new Date().toISOString()});save();closeEntryModal();showFeedback("success","정비이력 저장");renderWarehouse();});}

function bindAssetMaintenanceActions(place){view.querySelectorAll("[data-asset-maint-edit]").forEach(button=>button.addEventListener("click",()=>openAssetMaintenanceForm(place,button.dataset.assetMaintEdit)));view.querySelectorAll("[data-asset-maint-delete]").forEach(button=>button.addEventListener("click",async()=>{const op=state.assetOps?.[place],log=op?.maintenance?.find(item=>item.id===button.dataset.assetMaintDelete);if(!log)return;if(!await askConfirm("정비이력 삭제",`${log.date} 정비이력을 삭제할까요?`,"삭제",true))return;op.maintenance=op.maintenance.filter(item=>item.id!==log.id);save();showFeedback("success","정비이력 삭제 완료");renderWarehouse();}));}

function editLatestOpLog(place,logId){
  const op=state.assetOps?.[place],log=op?.logs?.length?op.logs[op.logs.length-1]:null;if(!log||log.id!==logId)return;const vehicle=isVehiclePlace(place);
  const mileageBefore=Number(log.mileageBefore??0),mileageAfter=Number(log.mileageAfter??op.mileageBase??0),portBefore=Number(log.portBefore??log.before??0),starboardBefore=Number(log.starboardBefore??log.before??0),portAfter=Number(log.portAfter??log.after??op.portHoursBase??0),starboardAfter=Number(log.starboardAfter??log.after??op.starboardHoursBase??0);
  openEntryModal(`${entryHeader(vehicle?"최근 주행기록 수정":"최근 운항기록 수정",place)}<div class="form"><label>날짜<input id="editOpDate" type="date" value="${esc(log.date||todayISO())}"></label>${vehicle?`<div class="callout">이전 누적값 ${Number(log.before||0)}km</div><label>현재 누적거리(km)<input id="editOpAfter" type="number" inputmode="decimal" min="${Number(log.before||0)}" value="${Number(log.after||0)}"></label>`:`${activityInputs("editOpActivity",logActivityCounts(log))}<label>운항자<input id="editOpOperator" value="${esc(log.operator||"")}"></label><label>동승자<input id="editOpPassengers" value="${esc(log.passengers||"")}"></label><label>활동 해역<input id="editOpArea" value="${esc(log.area||"")}"></label><div class="grid2"><label>출항지<input id="editOpDeparture" value="${esc(log.departure||"")}"></label><label>도착지<input id="editOpArrival" value="${esc(log.arrival||"")}"></label></div><label>누적 마일수(NM)<input id="editOpMileageAfter" type="number" inputmode="decimal" min="${mileageBefore}" value="${mileageAfter}"></label><label>좌현 엔진 누적시간(h)<input id="editOpPortAfter" type="number" inputmode="decimal" min="${portBefore}" value="${portAfter}"></label><label>우현 엔진 누적시간(h)<input id="editOpStarboardAfter" type="number" inputmode="decimal" min="${starboardBefore}" value="${starboardAfter}"></label><label>연료유 소모량(L)<input id="editOpFuel" type="number" inputmode="decimal" min="0" value="${Number(log.fuel||0)}"></label>`}<label>메모<textarea id="editOpMemo">${esc(log.memo||"")}</textarea></label><button class="btn primary" id="saveOpEdit" type="button">수정 저장</button></div>`);
  document.getElementById("saveOpEdit")?.addEventListener("click",()=>{log.date=document.getElementById("editOpDate").value||todayISO();log.memo=document.getElementById("editOpMemo").value.trim();if(vehicle){const before=Number(log.before||0),after=Number(document.getElementById("editOpAfter").value);if(!Number.isFinite(after)||after<before){showFeedback("error","누적거리를 확인해주세요");return;}log.after=after;log.diff=after-before;op.distanceBase=after;}else{const activityCounts=readActivityCounts("editOpActivity"),operator=document.getElementById("editOpOperator").value.trim(),passengers=document.getElementById("editOpPassengers").value.trim(),area=document.getElementById("editOpArea").value.trim(),departure=document.getElementById("editOpDeparture").value.trim(),arrival=document.getElementById("editOpArrival").value.trim(),nextMileage=Number(document.getElementById("editOpMileageAfter").value),nextPort=Number(document.getElementById("editOpPortAfter").value),nextStarboard=Number(document.getElementById("editOpStarboardAfter").value),fuel=Number(document.getElementById("editOpFuel").value||0);if(!Number.isFinite(nextMileage)||nextMileage<mileageBefore||!Number.isFinite(nextPort)||nextPort<portBefore||!Number.isFinite(nextStarboard)||nextStarboard<starboardBefore||!Number.isFinite(fuel)||fuel<0){showFeedback("error","마일수·좌우 엔진시간·연료유 소모량을 확인해주세요");return;}Object.assign(log,{activityCounts,operator,passengers,area,departure,arrival,mileageBefore,mileageAfter:nextMileage,mileageDiff:nextMileage-mileageBefore,portBefore,portAfter:nextPort,portDiff:nextPort-portBefore,starboardBefore,starboardAfter:nextStarboard,starboardDiff:nextStarboard-starboardBefore,fuel});delete log.activity;delete log.before;delete log.after;delete log.diff;op.mileageBase=nextMileage;op.portHoursBase=nextPort;op.starboardHoursBase=nextStarboard;op.engineSplitMode="dual";}save();closeEntryModal();showFeedback("success","최근 이력 수정 완료");renderWarehouse();});
}

function renderEquipment(){ return ""; }

function openEquipment(id, options={}){
  const item = state.equipment.find(equipment => equipment.id === id);
  if(!item) return;
  if(!selectedWarehouse) selectedWarehouse = item.place || warehouses[0];
  page = "equipmentDetail";
  if(options.push !== false) pushNavigationState({page:"equipmentDetail",equipmentId:item.id});
  updateBottomNav();
  document.getElementById("headTitle").innerHTML = `<div class="page-title">장비 상세</div><div class="date">${esc(item.name)}</div>`;
  const legacy = [item.model ? `모델 ${item.model}` : "",item.battery ? `배터리 ${item.battery}` : "",item.fuel ? `연료 ${item.fuel}` : "",item.status && item.status !== "정상" ? `상태 ${item.status}` : ""].filter(Boolean);
  const usage=[...state.records].filter(record=>(record.equipmentItems || []).some(entry=>entry.id===item.id)).sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  const maintenance=[...(item.maintenance || [])].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  const accessories=[...(item.accessories || [])].sort((a,b)=>a.name.localeCompare(b.name,"ko"));
  const moves=[...(item.moves || [])].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  view.innerHTML = `
    <button class="back" id="backEquip" type="button">‹ 장비</button>
    <div class="card resource-detail-card">
      <div><span class="badge blue">${esc(item.cat || "기타장비")}</span></div>
      <div class="section-title" style="margin-top:10px">${esc(item.name)}</div>
      <div class="detail-grid">
        <div><span>규격</span><strong>${esc(item.spec || item.detail || "미입력")}</strong></div>
        <div><span>수량</span><strong>${Number(item.qty ?? 1)}개</strong></div>
        <div><span>보관창고</span><strong>${esc(item.place || "미지정")}</strong></div>
      </div>
      ${item.memo || item.etc ? `<div class="callout" style="margin-top:12px">${esc(item.memo || item.etc)}</div>` : ""}
      ${legacy.length ? `<div class="row-sub" style="margin-top:10px">기존 정보 · ${esc(legacy.join(" · "))}</div>` : ""}
      <button class="btn primary" id="editSimpleEquipment" type="button" style="width:100%;margin-top:14px">정보 수정</button>
    </div>
    <div class="card"><div class="section-head" style="margin:0 0 10px"><div class="section-title">현재 부속품</div><button class="btn secondary compact" id="addAccessory" type="button">+ 부속품</button></div>
      ${accessories.length ? accessories.map(part=>`<div class="stock-line"><div><div class="stock-name">${esc(part.name)}</div><div class="stock-spec"><span class="badge blue">${esc(part.status||"예비 보유")}</span> · ${esc(part.memo || "메모 없음")}</div></div><div><div class="stock-qty">${Number(part.qty)}개</div><div class="btn-row" style="margin-top:6px"><button class="btn gray compact" data-accessory-edit="${part.id}" type="button">수정</button><button class="btn danger compact" data-accessory-delete="${part.id}" type="button">삭제</button></div></div></div>`).join("") : `<div class="emptybox">현재 등록된 부속품이 없습니다.</div>`}
    </div>
    <div class="card"><div class="section-head" style="margin:0 0 10px"><div class="section-title">관리이력</div><button class="btn secondary compact" id="addMaintenance" type="button">+ 이력 추가</button></div>
      ${maintenance.length ? maintenance.map(log=>`<div class="history-box"><div><span class="badge orange">${esc(log.type)}</span></div><div class="row-title" style="margin-top:7px">${esc(log.content || "관리 기록")}</div><div class="row-sub">${fmtDate(log.date)}${log.parts.length ? ` · ${esc(log.parts.map(part=>`${part.name} ${part.qty}개`).join(", "))}` : ""}</div>${log.memo?`<div class="row-sub">${esc(log.memo)}</div>`:""}<div class="btn-row" style="margin-top:9px"><button class="btn gray compact" data-maint-edit="${log.id}" type="button">수정</button><button class="btn danger compact" data-maint-delete="${log.id}" type="button">삭제</button></div></div>`).join("") : `<div class="emptybox">등록된 관리이력이 없습니다.</div>`}
    </div>
    <div class="card"><div class="section-title">사용이력</div>${usage.length ? usage.map(record=>{const entry=record.equipmentItems.find(e=>e.id===item.id);return `<button class="stock-line" data-usage-record="${record.id}" type="button"><div><div class="stock-name">${esc(record.title)}</div><div class="stock-spec">${fmtDate(record.date)} · ${esc(record.type)}</div></div><div class="stock-qty">${Number(entry.qty)}대</div></button>`;}).join("") : `<div class="emptybox">등록된 사용이력이 없습니다.</div>`}</div>
    <div class="card"><div class="section-title">이동이력</div>${moves.length ? moves.map(move=>`<div class="stock-line"><div><div class="stock-name">${esc(move.from)} → ${esc(move.to)}</div><div class="stock-spec">${fmtDate(move.date)}${move.memo?` · ${esc(move.memo)}`:""}</div></div></div>`).join("") : `<div class="emptybox">등록된 이동이력이 없습니다.</div>`}</div>`;
  document.getElementById("backEquip")?.addEventListener("click", () => window.history.back());
  document.getElementById("editSimpleEquipment")?.addEventListener("click", () => simpleResourceForm("equipment",item));
  document.getElementById("addMaintenance")?.addEventListener("click",()=>openMaintenanceForm(item.id));
  document.getElementById("addAccessory")?.addEventListener("click",()=>openAccessoryForm(item.id));
  view.querySelectorAll("[data-accessory-edit]").forEach(button=>button.addEventListener("click",()=>openAccessoryForm(item.id,button.dataset.accessoryEdit)));
  view.querySelectorAll("[data-accessory-delete]").forEach(button=>button.addEventListener("click",async()=>{if(!await askConfirm("부속품 삭제","현재 부속품 목록에서 삭제할까요?","삭제",true))return;item.accessories=(item.accessories||[]).filter(part=>part.id!==button.dataset.accessoryDelete);save();openEquipment(item.id,{push:false,remember:false});showFeedback("success","부속품 삭제 완료");}));
  view.querySelectorAll("[data-maint-edit]").forEach(button=>button.addEventListener("click",()=>openMaintenanceForm(item.id,button.dataset.maintEdit)));
  view.querySelectorAll("[data-maint-delete]").forEach(button=>button.addEventListener("click",async()=>{ if(!await askConfirm("관리이력 삭제","선택한 관리이력을 삭제할까요?","삭제",true)) return; const undoState=JSON.stringify(state); item.maintenance=item.maintenance.filter(log=>log.id!==button.dataset.maintDelete); save(); openEquipment(item.id,{push:false,remember:false}); showUndoSnack("관리이력 삭제",undoState,()=>openEquipment(item.id,{push:false,remember:false})); }));
  view.querySelectorAll("[data-usage-record]").forEach(button=>button.addEventListener("click",()=>openDetail(button.dataset.usageRecord)));
}

function openAccessoryForm(equipmentId,accessoryId=null){
  const equipment=state.equipment.find(item=>item.id===equipmentId);if(!equipment)return;
  const existing=(equipment.accessories||[]).find(part=>part.id===accessoryId);
  openEntryModal(`${entryHeader(existing?"부속품 수정":"부속품 추가",equipment.name)}<div class="form"><label>부속품명<input id="accessoryName" value="${esc(existing?.name||"")}" placeholder="부속품명을 입력하세요"></label><label>수량<input id="accessoryQty" type="number" inputmode="numeric" min="0" step="1" value="${Number(existing?.qty??1)}"></label><label>상태<select id="accessoryStatus">${["장착 중","예비 보유","수리 중"].map(status=>`<option ${status===(existing?.status||"예비 보유")?"selected":""}>${status}</option>`).join("")}</select></label><label>메모<textarea id="accessoryMemo" placeholder="장착 위치나 상태 등">${esc(existing?.memo||"")}</textarea></label><button class="btn primary" id="saveAccessory" type="button">저장</button></div>`);
  document.getElementById("saveAccessory")?.addEventListener("click",()=>{const name=document.getElementById("accessoryName").value.trim(),qty=Math.max(0,Math.round(Number(document.getElementById("accessoryQty").value||0)));if(!name){showFeedback("error","부속품명을 입력해주세요");return;}const part={id:accessoryId||uid(),name,qty,status:document.getElementById("accessoryStatus").value,memo:document.getElementById("accessoryMemo").value.trim(),updatedAt:new Date().toISOString()};equipment.accessories=equipment.accessories||[];const index=equipment.accessories.findIndex(item=>item.id===accessoryId);if(index>=0)equipment.accessories[index]=part;else equipment.accessories.push(part);save();closeEntryModal();showFeedback("success","부속품 저장 완료");openEquipment(equipmentId,{push:false,remember:false});});
}

function openMaintenanceForm(equipmentId,logId=null){
  const equipment=state.equipment.find(item=>item.id===equipmentId); if(!equipment) return;
  const existing=(equipment.maintenance || []).find(log=>log.id===logId);
  maintenanceDraftParts=existing?.parts?.map(part=>({...part})) || [];
  openEntryModal(`${entryHeader(existing?"관리이력 수정":"관리이력 추가",equipment.name)}<div class="form">
    <label>구분<select id="maintenanceType">${["수리","정비","부속품 추가","부속품 교체","기타"].map(type=>`<option value="${type}" ${existing?.type===type?"selected":""}>${type}</option>`).join("")}</select></label>
    <label>날짜<input id="maintenanceDate" type="date" value="${esc(existing?.date || todayISO())}"></label>
    <label>작업 내용<textarea id="maintenanceContent" placeholder="작업 내용을 입력하세요">${esc(existing?.content || "")}</textarea></label>
    <div><div class="section-head" style="margin:4px 0"><div class="section-title" style="font-size:16px">부속품</div><button class="btn secondary compact" id="addMaintenancePart" type="button">+ 부속품 추가</button></div><div id="maintenanceParts"></div></div>
    <label>메모<textarea id="maintenanceMemo" placeholder="특이사항을 입력하세요">${esc(existing?.memo || "")}</textarea></label>
    <button class="btn primary sticky-save" id="saveMaintenance" type="button">저장</button></div>`);
  renderMaintenanceParts();
  document.getElementById("addMaintenancePart")?.addEventListener("click",()=>{ maintenanceDraftParts.push({name:"",qty:1}); renderMaintenanceParts(); });
  document.getElementById("saveMaintenance")?.addEventListener("click",()=>saveMaintenance(equipmentId,logId));
}

function renderMaintenanceParts(){
  const target=document.getElementById("maintenanceParts"); if(!target) return;
  target.innerHTML=maintenanceDraftParts.length?maintenanceDraftParts.map((part,index)=>`<div class="part-row"><input data-part-name="${index}" value="${esc(part.name)}" placeholder="부속품명"><input data-part-qty="${index}" type="number" inputmode="numeric" min="1" step="1" value="${Number(part.qty || 1)}" aria-label="부속품 수량"><button class="btn gray compact" data-part-remove="${index}" type="button">삭제</button></div>`).join(""):`<div class="global-search-hint">추가된 부속품이 없습니다.</div>`;
  target.querySelectorAll("[data-part-name]").forEach(input=>input.addEventListener("input",()=>maintenanceDraftParts[Number(input.dataset.partName)].name=input.value));
  target.querySelectorAll("[data-part-qty]").forEach(input=>input.addEventListener("input",()=>maintenanceDraftParts[Number(input.dataset.partQty)].qty=Math.max(1,Math.round(Number(input.value || 1)))));
  target.querySelectorAll("[data-part-remove]").forEach(button=>button.addEventListener("click",()=>{ maintenanceDraftParts.splice(Number(button.dataset.partRemove),1); renderMaintenanceParts(); }));
}

function saveMaintenance(equipmentId,logId=null){
  const equipment=state.equipment.find(item=>item.id===equipmentId); if(!equipment) return;
  const content=document.getElementById("maintenanceContent").value.trim();
  if(!content){ showFeedback("error","작업 내용을 입력해주세요"); return; }
  const log={id:logId || uid(),type:document.getElementById("maintenanceType").value,date:document.getElementById("maintenanceDate").value || todayISO(),content,memo:document.getElementById("maintenanceMemo").value.trim(),photo:"",parts:maintenanceDraftParts.map(part=>({name:part.name.trim(),qty:Math.max(1,Math.round(Number(part.qty || 1)))})).filter(part=>part.name),createdAt:new Date().toISOString()};
  equipment.maintenance=equipment.maintenance || [];
  const index=equipment.maintenance.findIndex(item=>item.id===logId);
  if(index>=0) equipment.maintenance[index]={...equipment.maintenance[index],...log}; else equipment.maintenance.push(log);
  save(); closeEntryModal(); showFeedback("success","관리이력 저장 완료"); openEquipment(equipmentId,{push:false,remember:false});
}

function addWarehouse(){
  openEntryModal(`${entryHeader("신규 보관장소 추가","유형과 이름을 선택합니다")}<div class="form"><label>유형<select id="newWarehouseKind">${["창고","차량","함정","파출소","기타"].map(kind=>`<option>${kind}</option>`).join("")}</select></label><label><span id="newWarehouseLabel">창고명</span><input id="newWarehouseName" placeholder="이름을 입력하세요"></label><button class="btn primary" id="saveNewWarehouse" type="button">추가</button></div>`);
  document.getElementById("newWarehouseKind")?.addEventListener("change",event=>{document.getElementById("newWarehouseLabel").textContent=`${event.target.value}명`;});
  document.getElementById("saveNewWarehouse")?.addEventListener("click", () => {
    const name=document.getElementById("newWarehouseName").value.trim();
    const kind=document.getElementById("newWarehouseKind").value;
    if(!name){ showFeedback("error",`${kind}명을 입력해주세요`); return; }
    if(state.warehouses.includes(name)){ showFeedback("error","이미 있는 창고입니다"); return; }
    ensureWarehouse(name);state.warehouseKinds=state.warehouseKinds||{};state.warehouseKinds[name]=kind;if(kind==="차량")state.assetOps[name]={distanceBase:0,logs:[],maintenance:[],counterMode:"absolute"};if(kind==="함정")state.assetOps[name]={mileageBase:0,hoursBase:0,portHoursBase:0,starboardHoursBase:0,engineSplitMode:"dual",fuelBase:0,logs:[],maintenance:[],counterMode:"absolute"};save();closeEntryModal();showFeedback("success",`${kind} 추가 완료`);if(page==="warehouse") renderWarehouse();
  });
}

function openEntryModal(html){
  document.getElementById("entryDialog").innerHTML = html;
  lockPageScroll("entry");
  document.getElementById("entryModal").classList.add("show");
  document.getElementById("closeEntryModal")?.addEventListener("click", closeEntryModal);
}

function closeEntryModal(){
  if(modalConfirmResolver){ const resolve=modalConfirmResolver; modalConfirmResolver=null; resolve(false); }
  document.getElementById("entryModal").classList.remove("show");
  document.getElementById("entryDialog").innerHTML = "";
  unlockPageScroll("entry");
}

function askConfirm(title,message,confirmText="확인",danger=false){
  return new Promise(resolve=>{
    modalConfirmResolver=resolve;
    openEntryModal(`${entryHeader(title,"내용을 확인해주세요")}<div class="confirm-message">${esc(message)}</div><div class="entry-actions"><button class="btn gray" id="cancelConfirm" type="button">취소</button><button class="btn ${danger?"solid-danger":"primary"}" id="acceptConfirm" type="button">${esc(confirmText)}</button></div>`);
    const finish=value=>{ const resolver=modalConfirmResolver; modalConfirmResolver=null; document.getElementById("entryModal").classList.remove("show"); document.getElementById("entryDialog").innerHTML=""; unlockPageScroll("entry"); if(resolver) resolver(value); };
    document.getElementById("cancelConfirm")?.addEventListener("click",()=>finish(false));
    document.getElementById("acceptConfirm")?.addEventListener("click",()=>finish(true));
  });
}

function requestUploadPin(title="올리기 PIN 확인",subtitle="내 자료 올리기 권한 확인"){
  return new Promise(resolve=>{
    modalConfirmResolver=value=>resolve(value===false?null:value);
    openEntryModal(`${entryHeader(title,subtitle)}
      <div class="form">
        <label>PIN<input id="uploadPinInput" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="숫자 4자리"></label>
        <div class="entry-actions"><button class="btn gray" id="cancelUploadPin" type="button">취소</button><button class="btn primary" id="acceptUploadPin" type="button">확인</button></div>
      </div>`);
    const finish=value=>{
      const resolver=modalConfirmResolver;
      modalConfirmResolver=null;
      document.getElementById("entryModal").classList.remove("show");
      document.getElementById("entryDialog").innerHTML="";
      unlockPageScroll("entry");
      if(resolver)resolver(value);
    };
    document.getElementById("cancelUploadPin")?.addEventListener("click",()=>finish(null));
    document.getElementById("acceptUploadPin")?.addEventListener("click",()=>finish(document.getElementById("uploadPinInput")?.value||""));
    bindPinNumberInput("uploadPinInput");
    document.getElementById("uploadPinInput")?.focus();
  });
}

function entryHeader(title,subtitle){
  return `<div class="entry-modal-head"><div><div class="dialog-title" style="text-align:left;margin:0">${esc(title)}</div><div class="row-sub">${esc(subtitle)}</div></div><button class="entry-close" id="closeEntryModal" type="button" aria-label="닫기">×</button></div>`;
}

function simpleResourceForm(kind,existing=null){
  const isEquipment = kind === "equipment";
  const currentWarehouse = existing?.place || selectedWarehouse || warehouses[0];
  openEntryModal(`
    ${entryHeader(existing ? `${isEquipment ? "장비" : "자재"} 수정` : `${isEquipment ? "장비" : "자재"} 빠른 등록`,currentWarehouse)}
    <div class="form entry-form simple-resource-form">
      <label>품목명<input id="resourceName" value="${esc(existing?.name || "")}" placeholder="품목명을 입력하세요"></label>
      ${isEquipment?`<label>장비 분류<select id="resourceCategory">${equipmentCategories.map(cat=>`<option ${cat===(existing?.cat||"기타장비")?"selected":""}>${esc(cat)}</option>`).join("")}</select></label>`:`<label>자재 분류<select id="resourceCategory">${cats.map(cat=>`<option ${cat===(existing?.cat||"기타")?"selected":""}>${esc(cat)}</option>`).join("")}</select></label>`}
      <label>규격<input id="resourceSpec" value="${esc(existing?.spec || existing?.detail || "")}" placeholder="규격·모델명을 입력하세요"></label>
      <label>수량<input id="resourceQty" type="number" inputmode="decimal" min="0" step="0.1" value="${Number(existing?.qty || (isEquipment ? 1 : 0))||""}"></label>
      <label>보관창고<select id="resourceWarehouse">${warehouses.map(name => `<option value="${esc(name)}" ${name === currentWarehouse ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label>
      <label>메모<textarea id="resourceMemo" placeholder="필요한 내용만 간단히 입력하세요">${esc(existing?.memo || existing?.etc || "")}</textarea></label>
      <button class="btn primary" id="saveSimpleResource" type="button">저장</button>
    </div>`);
  document.getElementById("saveSimpleResource")?.addEventListener("click", () => saveSimpleResource(kind,existing?.id || null));
}

function addMaterialChoice(){ openResourceAddChoice("material"); }
function addEquipmentChoice(){ openResourceAddChoice("equipment"); }

function openResourceAddChoice(kind){
  const label=kind==="material"?"자재":"장비";
  openEntryModal(`${entryHeader(`${label} 추가`,selectedWarehouse || "보관장소")}
    <div class="entry-actions">
      <button class="btn secondary" id="addExistingResource" type="button">기존 목록에서 추가</button>
      <button class="btn primary" id="addNewResource" type="button">새로 등록</button>
    </div>
    <div class="global-search-hint">자주 쓰는 품목은 기존 목록에서 빠르게 추가하고, 목록에 없을 때만 새로 등록하세요.</div>`);
  document.getElementById("addExistingResource")?.addEventListener("click",()=>kind==="material"?openExistingMaterialAdd():openExistingEquipmentAdd());
  document.getElementById("addNewResource")?.addEventListener("click",()=>simpleResourceForm(kind));
}

function materialRecentScore(name){
  let score=0;
  (state.records||[]).forEach((record,index)=>{
    if((record.items||[]).some(item=>item.name===name))score=Math.max(score,dateMs(record.createdAt||record.date)||index+1);
  });
  return score;
}

function equipmentRecentScore(equipment){
  let score=dateMs(equipment?.updatedAt)||0;
  (state.records||[]).forEach((record,index)=>{
    if((record.equipmentItems||[]).some(item=>item.id===equipment.id||item.name===equipment.name))score=Math.max(score,dateMs(record.createdAt||record.date)||index+1);
  });
  return score;
}

function openExistingMaterialAdd(){
  const place=selectedWarehouse || warehouses[0];
  const sortedCatalog=[...catalog].sort((a,b)=>materialRecentScore(b.name)-materialRecentScore(a.name)||a.name.localeCompare(b.name,"ko"));
  const sortedCats=[...cats].sort((a,b)=>Math.max(0,...sortedCatalog.filter(item=>item.cat===b).map(item=>materialRecentScore(item.name)))-Math.max(0,...sortedCatalog.filter(item=>item.cat===a).map(item=>materialRecentScore(item.name)))||a.localeCompare(b,"ko"));
  const firstCat=sortedCats[0] || "";
  openEntryModal(`${entryHeader("기존 자재 추가",place)}
    <div class="form">
      <label>분류<select id="existingMaterialCat">${sortedCats.map(cat=>`<option>${esc(cat)}</option>`).join("")}</select></label>
      <label>자재<select id="existingMaterialName"></select></label>
      <label>추가 수량<input id="existingMaterialQty" type="number" inputmode="decimal" min="0" step="0.1" placeholder="수량"></label>
      <button class="btn primary" id="saveExistingMaterial" type="button">추가</button>
    </div>`);
  const renderNames=()=>{
    const cat=document.getElementById("existingMaterialCat")?.value || firstCat;
    const rows=sortedCatalog.filter(item=>item.cat===cat);
    const select=document.getElementById("existingMaterialName");
    if(select)select.innerHTML=rows.map(item=>`<option value="${esc(item.name)}">${esc(item.name)} · ${esc(item.spec||item.unit||"")}</option>`).join("");
  };
  document.getElementById("existingMaterialCat")?.addEventListener("change",renderNames);
  renderNames();
  document.getElementById("saveExistingMaterial")?.addEventListener("click",()=>{
    const name=document.getElementById("existingMaterialName")?.value || "";
    const item=itemOf(name);
    const qty=Number(document.getElementById("existingMaterialQty")?.value || 0);
    if(!item){showFeedback("error","자재를 선택해주세요");return;}
    if(!Number.isFinite(qty)||qty<=0){showFeedback("error","추가 수량을 입력해주세요");return;}
    const before=Number(state.stock[place]?.[name]||0),after=before+qty;
    if(!state.stock[place])state.stock[place]={};
    state.stock[place][name]=after;
    state.records.push({id:uid(),flow:"재고수정",type:"재고수정",title:`${name} 기존목록 추가`,date:todayISO(),warehouse:place,memo:"변경사유: 기존 자재 목록에서 추가",status:"done",sourceId:null,items:[{cat:item.cat,name,qty,unit:item.unit,kind:item.kind,before,after,diff:qty}]});
    save();closeEntryModal();showFeedback("success","기존 자재 추가 완료");renderWarehouse();
  });
}

function openExistingEquipmentAdd(){
  const place=selectedWarehouse || warehouses[0];
  const templates=[...new Map((state.equipment||[]).map(item=>[`${item.cat}|${item.name}|${item.spec||item.detail||""}|${item.model||""}`,item])).values()].sort((a,b)=>equipmentRecentScore(b)-equipmentRecentScore(a)||equipmentRegisterLabel(a).localeCompare(equipmentRegisterLabel(b),"ko"));
  const sortedEquipmentCats=[...equipmentCategories].sort((a,b)=>Math.max(0,...templates.filter(item=>(item.cat||"기타장비")===b).map(equipmentRecentScore))-Math.max(0,...templates.filter(item=>(item.cat||"기타장비")===a).map(equipmentRecentScore))||a.localeCompare(b,"ko"));
  const firstCat=sortedEquipmentCats.find(cat=>templates.some(item=>(item.cat||"기타장비")===cat)) || sortedEquipmentCats[0] || "";
  if(!templates.length){simpleResourceForm("equipment");showFeedback("info","등록된 장비 목록이 없어 새로 등록합니다");return;}
  openEntryModal(`${entryHeader("기존 장비 추가",place)}
    <div class="form">
      <label>장비 분류<select id="existingEquipmentCat">${sortedEquipmentCats.map(cat=>`<option ${cat===firstCat?"selected":""}>${esc(cat)}</option>`).join("")}</select></label>
      <label>장비<select id="existingEquipmentName"></select></label>
      <label>수량<input id="existingEquipmentQty" type="number" inputmode="numeric" min="1" step="1" value="1"></label>
      <button class="btn primary" id="saveExistingEquipment" type="button">추가</button>
    </div>`);
  const renderNames=()=>{
    const cat=document.getElementById("existingEquipmentCat")?.value || firstCat;
    const rows=templates.filter(item=>(item.cat||"기타장비")===cat);
    const select=document.getElementById("existingEquipmentName");
    if(select)select.innerHTML=rows.map(item=>`<option value="${esc(item.id)}">${esc(item.name)} · ${esc(item.spec||item.detail||item.model||"규격 없음")}</option>`).join("");
  };
  document.getElementById("existingEquipmentCat")?.addEventListener("change",renderNames);
  renderNames();
  document.getElementById("saveExistingEquipment")?.addEventListener("click",()=>{
    const source=templates.find(item=>item.id===document.getElementById("existingEquipmentName")?.value);
    const qty=Math.max(1,Math.round(Number(document.getElementById("existingEquipmentQty")?.value||1)));
    if(!source){showFeedback("error","장비를 선택해주세요");return;}
    if(state.equipment.some(item=>item.name===source.name&&item.place===place&&String(item.spec||item.detail||"")===String(source.spec||source.detail||""))){showFeedback("error","이 창고에 같은 장비가 이미 있습니다");return;}
    state.equipment.push({id:uid(),cat:source.cat||"기타장비",name:source.name,spec:source.spec||source.detail||"",detail:source.detail||source.spec||"",model:source.model||source.spec||source.detail||"",qty,place,memo:source.memo||source.etc||"",etc:source.etc||source.memo||"",photo:"",photos:[],battery:source.battery||"",fuel:source.fuel||"",status:"정상",maintenance:[],moves:[],updatedAt:new Date().toISOString()});
    save();closeEntryModal();showFeedback("success","기존 장비 추가 완료");renderWarehouse();
  });
}

function saveSimpleResource(kind,id=null){
  const name = document.getElementById("resourceName")?.value.trim() || "";
  const spec = document.getElementById("resourceSpec")?.value.trim() || "";
  const qty = Number(document.getElementById("resourceQty")?.value || 0);
  const place = document.getElementById("resourceWarehouse")?.value || warehouses[0];
  const memo = document.getElementById("resourceMemo")?.value.trim() || "";
  const category=document.getElementById("resourceCategory")?.value||(kind==="material"?"기타":"기타장비");
  if(!name){ showFeedback("error","품목명을 입력해주세요"); return; }
  if(!Number.isFinite(qty) || qty < 0){ showFeedback("error","수량을 확인해주세요"); return; }
  if(kind === "material"){
    if(state.catalog.some(item => item.name === name)){ showFeedback("error","이미 등록된 자재명입니다"); return; }
    const item = {cat:category,name,unit:"개",spec,kind:"consume",memo,photo:"",updatedAt:new Date().toISOString()};
    ensureCatalogItem(item);
    if(!state.stock[place]) state.stock[place] = {};
    state.stock[place][name] = qty;
    if(qty > 0) state.records.push({id:uid(),flow:"재고수정",type:"재고수정",title:`${name} 초기재고 등록`,date:todayISO(),warehouse:place,memo:memo ? `변경사유: 신규 자재 등록\\n${memo}` : "변경사유: 신규 자재 등록",status:"done",sourceId:null,items:[{cat:item.cat,name,qty,unit:item.unit,kind:item.kind,before:0,after:qty,diff:qty}]});
  }else{
    const equipment = id ? state.equipment.find(item => item.id === id) : null;
    if(!equipment && state.equipment.some(item => item.name === name && item.place === place)){ showFeedback("error","이 창고에 같은 장비명이 있습니다"); return; }
    if(equipment){
      const previousPlace=equipment.place;
      Object.assign(equipment,{cat:category,name,spec,detail:spec,model:equipment.model || spec,qty,place,memo,etc:memo,photo:"",photos:[],updatedAt:new Date().toISOString()});
      equipment.maintenance=equipment.maintenance || [];
      equipment.moves=equipment.moves || [];
      if(previousPlace && previousPlace!==place) equipment.moves.push({id:uid(),date:todayISO(),from:previousPlace,to:place,memo:"장비 정보 수정에서 보관창고 변경",createdAt:new Date().toISOString()});
    }else{
      state.equipment.push({id:uid(),cat:category,name,spec,detail:spec,model:spec,qty,place,memo,etc:memo,photo:"",photos:[],battery:"",fuel:"",status:"정상",maintenance:[],moves:[],updatedAt:new Date().toISOString()});
    }
  }
  save();
  closeEntryModal();
  selectedWarehouse = place;
  warehouseViewMode = "warehouses";
  warehouseTab = kind === "material" ? "material" : "equipment";
  renderWarehouse();
  showFeedback("success",`${kind === "material" ? "자재" : "장비"} 저장 완료`);
}

function openMaterialTransferForm(){
  openEntryModal(`${entryHeader("창고 간 자재 이동","한 번의 기록으로 양쪽 재고에 반영합니다")}<div class="form">
    <label>출발 창고<select id="transferFrom">${warehouses.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join("")}</select></label>
    <label>도착 창고<select id="transferTo">${warehouses.map((name,index)=>`<option value="${esc(name)}" ${index===1?"selected":""}>${esc(name)}</option>`).join("")}</select></label>
    <label>자재<select id="transferItem">${catalog.map(item=>`<option value="${esc(item.name)}">${esc(item.cat)} · ${esc(item.name)}</option>`).join("")}</select></label>
    <label>수량<input id="transferQty" type="number" inputmode="decimal" min="0" step="0.1" placeholder="이동 수량"></label>
    <label>날짜<input id="transferDate" type="date" value="${todayISO()}"></label>
    <label>메모<textarea id="transferMemo" placeholder="필요한 경우 입력하세요"></textarea></label>
    <button class="btn primary sticky-save" id="saveMaterialTransfer" type="button">이동 저장</button></div>`);
  document.getElementById("saveMaterialTransfer")?.addEventListener("click",saveMaterialTransfer);
}

function saveMaterialTransfer(){
  const from=document.getElementById("transferFrom").value,to=document.getElementById("transferTo").value,name=document.getElementById("transferItem").value;
  const item=itemOf(name),qty=Number(document.getElementById("transferQty").value || 0),date=document.getElementById("transferDate").value || todayISO(),memo=document.getElementById("transferMemo").value.trim();
  if(from===to){ showFeedback("error","출발 창고와 도착 창고를 다르게 선택해주세요"); return; }
  if(!Number.isFinite(qty)||qty<=0){ showFeedback("error","이동 수량을 입력해주세요"); return; }
  if(Number(state.stock[from]?.[name] || 0)<qty){ showFeedback("error",`${name} ${materialQtyText(qty-Number(state.stock[from]?.[name] || 0),item.unit,item)} 부족`); return; }
  applyStock(from,[{...item,qty}],"출고"); applyStock(to,[{...item,qty}],"입고");
  state.records.push(createFlowRecord({flow:"이송",type:"이송",title:`${name} 창고 간 이동`,date,warehouse:from,targetWarehouse:to,memo,items:[{...item,qty}],equipmentItems:[],status:"done"}));
  save(); closeEntryModal(); showFeedback("success",`${from} → ${to} 이동 완료`); renderWarehouse();
}

function buildCloudResourceState(){
  return stripStoredPhotos(JSON.parse(JSON.stringify({
    warehouses:state.warehouses || [],
    catalog:state.catalog || [],
    stock:state.stock || {},
    warehouseInfos:state.warehouseInfos || {},
    warehouseKinds:state.warehouseKinds || {},
    equipment:state.equipment || [],
    equipmentCategories:state.equipmentCategories || [],
    assetOps:state.assetOps || {},
    logs:state.logs || []
  })));
}

function buildResourceSnapshot(place=""){
  const selectedWarehouses=place?[place]:[...warehouses];
  const cloudMeta=readCloudShareMeta();
  return {
    kind:"victor-resource-share",formatVersion:1,appVersion:VERSION,createdAt:new Date().toISOString(),scope:place || "전체",
    createdBy:victorDeviceLabel(),
    createdDeviceId:victorDeviceId(),
    uploadPinHash:currentCloudUploadPinHash(),
    uploadPinUpdatedAt:cloudMeta.uploadPinUpdatedAt || "",
    resourceState:place?"":buildCloudResourceState(),
    warehouses:selectedWarehouses,
    materials:selectedWarehouses.flatMap(warehouse=>catalog.map(item=>({warehouse,name:item.name,cat:item.cat,spec:item.spec || "",qty:Number(state.stock[warehouse]?.[item.name] || 0),unit:item.unit,memo:item.memo || ""}))),
    equipment:(state.equipment || []).filter(item=>!place || item.place===place).map(item=>({id:item.id,name:item.name,cat:item.cat || "기타장비",spec:item.spec || item.detail || "",model:item.model || "",qty:Number(item.qty || 0),warehouse:item.place || "",memo:item.memo || item.etc || "",maintenanceCount:(item.maintenance || []).length}))
  };
}

function snapshotSummary(snapshot){
  const resource=resourceStateFromSnapshot(snapshot);
  const materials=Array.isArray(snapshot?.materials)?snapshot.materials:[];
  const equipment=Array.isArray(snapshot?.equipment)?snapshot.equipment:[];
  const materialNames=new Set(materials.map(item=>item.name).filter(Boolean));
  const warehouseNames=new Set([...(resource?.warehouses || []),...(snapshot?.warehouses || [])].filter(Boolean));
  return {
    date:snapshot?.cloudUpdatedAt || snapshot?.cloudSharedAt || snapshot?.createdAt || "",
    warehouses:warehouseNames.size,
    materials:materialNames.size || (resource?.catalog || []).length,
    equipment:equipment.length || (resource?.equipment || []).length,
    title:snapshot?.title || "Victor 자원현황",
    device:snapshot?.cloudUploadedBy || snapshot?.createdBy || "기록 없음"
  };
}

function snapshotTotalQuantity(snapshot){
  const materialQty=(Array.isArray(snapshot?.materials)?snapshot.materials:[]).reduce((sum,item)=>sum+Math.max(0,Number(item.qty||0)),0);
  const equipmentQty=(Array.isArray(snapshot?.equipment)?snapshot.equipment:[]).reduce((sum,item)=>sum+Math.max(0,Number(item.qty||0)),0);
  return materialQty + equipmentQty;
}

function latestLocalResourceAt(){
  const dates=[];
  const add=value=>{if(value && dateMs(value))dates.push(value);};
  (state.catalog||[]).forEach(item=>add(item.updatedAt));
  (state.equipment||[]).forEach(item=>{
    add(item.updatedAt);
    (item.maintenance||[]).forEach(log=>add(log.createdAt||log.date));
    (item.moves||[]).forEach(log=>add(log.createdAt||log.date));
  });
  Object.values(state.warehouseInfos||{}).forEach(info=>add(info.updated));
  Object.values(state.assetOps||{}).forEach(asset=>{
    (asset.logs||[]).forEach(log=>add(log.createdAt||log.date));
    (asset.maintenance||[]).forEach(log=>add(log.createdAt||log.date));
  });
  (state.records||[]).forEach(record=>add(record.createdAt||record.date));
  return dates.sort((a,b)=>dateMs(b)-dateMs(a))[0] || "";
}

function cloudSnapshotTime(snapshot){
  return snapshot?.cloudUpdatedAt || snapshot?.cloudSharedAt || snapshot?.createdAt || "";
}

function cloudStatusLabel(latest){
  if(!latest) return "아직 확인 안 됨";
  const cloudTime=dateMs(cloudSnapshotTime(latest));
  const localTime=dateMs(latestLocalResourceAt() || readCloudShareMeta().lastUploadedAt || readCloudShareMeta().lastAppliedAt);
  if(!Number.isFinite(cloudTime) || !cloudTime) return "아직 확인 안 됨";
  if(!Number.isFinite(localTime) || !localTime) return "클라우드 자료가 최신";
  if(cloudTime > localTime + 1000) return "클라우드 자료가 최신";
  if(localTime > cloudTime + 1000) return "내 자료가 최신";
  return "이미 최신";
}

function materialQtyMap(resource){
  const map=new Map();
  (resource?.warehouses||[]).forEach(warehouse=>{
    (resource?.catalog||[]).forEach(item=>{
      map.set(`${warehouse}|||${item.name}`,Number(resource?.stock?.[warehouse]?.[item.name]||0));
    });
  });
  return map;
}

function equipmentCompareMap(resource){
  const map=new Map();
  (resource?.equipment||[]).forEach(item=>{
    const key=item.id || `${item.name}|||${item.place||item.warehouse||""}|||${item.spec||item.detail||item.model||""}`;
    map.set(key,JSON.stringify({name:item.name||"",cat:item.cat||"",spec:item.spec||item.detail||"",model:item.model||"",qty:Number(item.qty||0),place:item.place||item.warehouse||"",memo:item.memo||item.etc||""}));
  });
  return map;
}

function resourceStateWithLocalWarehouses(resource){
  const merged=JSON.parse(JSON.stringify(resource || {}));
  merged.warehouses=Array.isArray(merged.warehouses)?merged.warehouses:[];
  merged.catalog=Array.isArray(merged.catalog)?merged.catalog:[];
  merged.stock=merged.stock && typeof merged.stock==="object" && !Array.isArray(merged.stock) ? merged.stock : {};
  merged.warehouseInfos=merged.warehouseInfos && typeof merged.warehouseInfos==="object" && !Array.isArray(merged.warehouseInfos) ? merged.warehouseInfos : {};
  merged.warehouseKinds=merged.warehouseKinds && typeof merged.warehouseKinds==="object" && !Array.isArray(merged.warehouseKinds) ? merged.warehouseKinds : {};
  merged.assetOps=merged.assetOps && typeof merged.assetOps==="object" && !Array.isArray(merged.assetOps) ? merged.assetOps : {};
  merged.equipment=Array.isArray(merged.equipment)?merged.equipment:[];
  const known=new Set(merged.warehouses);
  const carried=new Set();
  (state.warehouses||[]).forEach(name=>{
    if(!name || known.has(name)) return;
    known.add(name);
    carried.add(name);
    merged.warehouses.push(name);
    merged.stock[name]={};
    merged.catalog.forEach(item=>{merged.stock[name][item.name]=Number(state.stock?.[name]?.[item.name]||0);});
    merged.warehouseInfos[name]=state.warehouseInfos?.[name] || {memo:"",updated:""};
    merged.warehouseKinds[name]=state.warehouseKinds?.[name] || warehouseKind(name);
    if(state.assetOps?.[name]) merged.assetOps[name]=state.assetOps[name];
  });
  if(carried.size){
    const nextEquipmentIds=new Set(merged.equipment.map(item=>item.id).filter(Boolean));
    (state.equipment||[]).forEach(item=>{
      if(!carried.has(item.place) || nextEquipmentIds.has(item.id)) return;
      merged.equipment.push(JSON.parse(JSON.stringify(item)));
    });
  }
  return merged;
}

function compareSharedSnapshot(snapshot){
  const current=buildCloudResourceState();
  const next=resourceStateWithLocalWarehouses(resourceStateFromSnapshot(snapshot));
  const currentWarehouses=new Set(current.warehouses||[]);
  const nextWarehouses=new Set(next.warehouses||[]);
  const addedWarehouses=[...nextWarehouses].filter(name=>!currentWarehouses.has(name));
  const removedWarehouses=[...currentWarehouses].filter(name=>!nextWarehouses.has(name));
  const currentMaterials=materialQtyMap(current);
  const nextMaterials=materialQtyMap(next);
  const materialKeys=new Set([...currentMaterials.keys(),...nextMaterials.keys()]);
  let materialQtyChanges=0;
  materialKeys.forEach(key=>{if(Number(currentMaterials.get(key)||0)!==Number(nextMaterials.get(key)||0))materialQtyChanges++;});
  const currentEquipment=equipmentCompareMap(current);
  const nextEquipment=equipmentCompareMap(next);
  const equipmentKeys=new Set([...currentEquipment.keys(),...nextEquipment.keys()]);
  let equipmentChanges=0;
  equipmentKeys.forEach(key=>{if((currentEquipment.get(key)||"")!==(nextEquipment.get(key)||""))equipmentChanges++;});
  return {addedWarehouses,removedWarehouses,materialQtyChanges,equipmentChanges,next};
}

function shareApplyPreviewText(snapshot){
  const summary=snapshotSummary(snapshot);
  const changes=compareSharedSnapshot(snapshot);
  return [
    `자료: ${summary.title}`,
    `공유 기준: ${fmtDateTime(summary.date)}`,
    `새로 생기는 보관장소: ${changes.addedWarehouses.length}곳${changes.addedWarehouses.length?` (${changes.addedWarehouses.slice(0,3).join(", ")}${changes.addedWarehouses.length>3?" 외":""})`:""}`,
    `없어지는 보관장소: ${changes.removedWarehouses.length}곳${changes.removedWarehouses.length?` (${changes.removedWarehouses.slice(0,3).join(", ")}${changes.removedWarehouses.length>3?" 외":""})`:""}`,
    `수량이 바뀌는 자재: ${changes.materialQtyChanges}건`,
    `바뀌는 장비: ${changes.equipmentChanges}건`,
    "유지됨: 기존 이력, 메모",
    "적용 전 자동 안전지점이 생성됩니다."
  ].join("\n") + snapshotCautionText(snapshot);
}

function uploadWarningLines(snapshot,latest=null){
  const warnings=[];
  const summary=snapshotSummary(snapshot);
  if(snapshotTotalQuantity(snapshot)===0)warnings.push("총 보관량이 0입니다.");
  if(latest){
    const latestSummary=snapshotSummary(latest);
    if(latestSummary.materials>0 && summary.materials<Math.max(3,Math.floor(latestSummary.materials*0.5)))warnings.push("자재 종류가 기존 클라우드 자료보다 크게 적습니다.");
    if(latestSummary.equipment>0 && summary.equipment<Math.floor(latestSummary.equipment*0.5))warnings.push("장비 수가 기존 클라우드 자료보다 크게 적습니다.");
    const cloudTime=dateMs(cloudSnapshotTime(latest));
    const localTime=dateMs(latestLocalResourceAt());
    if(cloudTime && (!localTime || cloudTime>localTime+1000))warnings.push("클라우드 자료가 내 자료보다 최신일 수 있습니다.");
  }
  return warnings;
}

function uploadPreviewText(snapshot,latest=null){
  const summary=snapshotSummary(snapshot);
  const latestSummary=latest?snapshotSummary(latest):null;
  const warnings=uploadWarningLines(snapshot,latest);
  return [
    `공유자료: ${cloudReadConfig().title}`,
    `올릴 기준: ${fmtDateTime(snapshot.createdAt)}`,
    `보관장소: ${summary.warehouses}곳`,
    `자재: ${summary.materials}종`,
    `장비: ${summary.equipment}개`,
    `총 보관량: ${snapshotTotalQuantity(snapshot).toLocaleString("ko-KR")}`,
    latestSummary?`현재 클라우드: ${fmtDateTime(latestSummary.date)} · 자재 ${latestSummary.materials}종 · 장비 ${latestSummary.equipment}개`:"현재 클라우드: 자료 없음 또는 미확인",
    warnings.length?`주의: ${warnings.join(" / ")}`:"주의: 특별한 이상 없음",
    "이 작업은 다른 기기의 공유자료를 바꿉니다."
  ].join("\n");
}

function snapshotCautionText(snapshot){
  const meta=readCloudShareMeta();
  const incoming=snapshot?.cloudUpdatedAt || snapshot?.cloudSharedAt || snapshot?.createdAt || "";
  const previous=meta.lastAppliedCloudAt || "";
  if(incoming && previous && dateMs(incoming) < dateMs(previous)){
    return "\n주의: 이전에 적용한 공유자료보다 오래된 자료일 수 있습니다.";
  }
  return "";
}

function snapshotSummaryText(snapshot,{includeCaution=false}={}){
  const summary=snapshotSummary(snapshot);
  return [
    `자료: ${summary.title}`,
    `공유 기준: ${fmtDateTime(summary.date)}`,
    `보관장소: ${summary.warehouses}곳`,
    `자재: ${summary.materials}종`,
    `장비: ${summary.equipment}개`,
    "기존 이력과 메모는 유지됩니다."
  ].join("\n") + (includeCaution ? snapshotCautionText(snapshot) : "");
}

function resourceStateFromSnapshot(snapshot){
  if(snapshot?.resourceState && typeof snapshot.resourceState==="object") return snapshot.resourceState;
  const sourceWarehouses=[...(snapshot?.warehouses || []),...(snapshot?.materials || []).map(item=>item.warehouse),...(snapshot?.equipment || []).map(item=>item.warehouse)].filter(Boolean);
  const nextWarehouses=[...new Set(sourceWarehouses)];
  const materialMap=new Map();
  (snapshot?.materials || []).forEach(item=>{
    if(!item?.name) return;
    if(!materialMap.has(item.name)) materialMap.set(item.name,{cat:item.cat || "기타",name:item.name,unit:item.unit || "개",spec:item.spec || "",kind:item.kind || "consume",memo:item.memo || ""});
  });
  const nextCatalog=[...materialMap.values()];
  const nextStock={};
  nextWarehouses.forEach(warehouse=>{nextStock[warehouse]={};nextCatalog.forEach(item=>nextStock[warehouse][item.name]=0);});
  (snapshot?.materials || []).forEach(item=>{if(item?.warehouse&&item?.name){nextStock[item.warehouse]=nextStock[item.warehouse]||{};nextStock[item.warehouse][item.name]=Number(item.qty||0);}});
  const nextEquipment=(snapshot?.equipment || []).map(item=>({
    id:item.id || uid(),
    cat:item.cat || "기타장비",
    name:item.name || "장비",
    spec:item.spec || item.model || "",
    detail:item.spec || item.model || "",
    model:item.model || item.spec || "",
    qty:Number(item.qty || 0),
    place:item.warehouse || "",
    memo:item.memo || "",
    etc:item.memo || "",
    status:"정상",
    maintenance:[],
    moves:[]
  }));
  return {
    warehouses:nextWarehouses,
    catalog:nextCatalog,
    stock:nextStock,
    warehouseInfos:Object.fromEntries(nextWarehouses.map(name=>[name,{memo:"",updated:""}])),
    warehouseKinds:Object.fromEntries(nextWarehouses.map(name=>[name,name==="방제지휘차량"?"차량":name==="소형방제정"?"함정":"창고"])),
    equipment:nextEquipment,
    equipmentCategories:[...new Set(nextEquipment.map(item=>item.cat || "기타장비"))],
    assetOps:{},
    logs:[]
  };
}

async function applySharedSnapshot(snapshot,source="공유자료"){
  if(snapshot?.kind!=="victor-resource-share")throw new Error("공유자료 형식 오류");
  const next=resourceStateWithLocalWarehouses(resourceStateFromSnapshot(snapshot));
  if(!next?.warehouses?.length)throw new Error("적용할 보관 자료가 없습니다");
  if(!await askConfirm(`${source} 적용 미리보기`,`${shareApplyPreviewText(snapshot)}\n\n현재 앱의 보관·자재·장비 내용이 이 자료로 바뀝니다.\n계속할까요?`,"적용"))return false;
  if(!createCloudApplySafetyPoint(snapshot))return false;
  state=normalize({
    ...state,
    warehouses:next.warehouses,
    catalog:next.catalog,
    stock:next.stock,
    warehouseInfos:next.warehouseInfos || {},
    warehouseKinds:next.warehouseKinds || {},
    equipment:next.equipment || [],
    equipmentCategories:next.equipmentCategories || [],
    assetOps:next.assetOps || {},
    logs:next.logs || []
  });
  save();
  refreshGlobals(state);
  sharedSnapshot=null;
  page="home";
  updateBottomNav();
  render();
  scrollToTop();
  const pinPatch={};
  if(Object.prototype.hasOwnProperty.call(snapshot,"uploadPinHash")){
    const pinHash=typeof snapshot.uploadPinHash==="string"?snapshot.uploadPinHash:"";
    saveCloudUploadPinHash(pinHash);
    pinPatch.uploadPinHash=pinHash;
    pinPatch.uploadPinUpdatedAt=snapshot.uploadPinUpdatedAt || "";
  }
  saveCloudShareMeta({lastAppliedAt:new Date().toISOString(),lastAppliedSource:source,lastAppliedCloudAt:snapshot?.cloudUpdatedAt || snapshot?.cloudSharedAt || snapshot?.createdAt || "",lastAppliedDeviceName:victorDeviceLabel(),lastAppliedFromDevice:snapshot?.cloudUploadedBy || snapshot?.createdBy || "",...pinPatch});
  cloudShareNotice=null;
  showFeedback("success","공유자료를 현재 앱에 적용했습니다");
  return true;
}

function downloadBlob(blob,filename){
  const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download=filename; link.click(); setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}

async function shareResourceSnapshot(place=""){
  const snapshot=buildResourceSnapshot(place);
  const filename=`victor_resource_${place?place.replace(/[^가-힣A-Za-z0-9_-]/g,"_"):"all"}_${todayISO()}.json`;
  const file=new File([JSON.stringify(snapshot,null,2)],filename,{type:"application/json"});
  try{
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
      await navigator.share({title:`Victor 자원현황 · ${snapshot.scope}`,text:`${snapshot.scope} 자재·장비 현황 (${todayISO()})`,files:[file]});
      showFeedback("success","공유파일 생성 완료"); return;
    }
  }catch(error){ if(error?.name==="AbortError") return; }
  downloadBlob(file,filename); showFeedback("info","공유파일을 저장했습니다");
}

function loadSharedResourceFile(file){
  if(!file) return;
  const reader=new FileReader();
  reader.onload=async()=>{
    try{
      const data=JSON.parse(reader.result);
      if(data?.kind!=="victor-resource-share" || !Array.isArray(data.materials) || !Array.isArray(data.equipment)) throw new Error("형식 오류");
      await applySharedSnapshot(data,"받은 자료");
    }catch(error){ showFeedback("error","올바른 Victor 공유자료가 아닙니다"); }
  };
  reader.onerror=()=>showFeedback("error","공유자료를 읽지 못했습니다");
  reader.readAsText(file);
}

function readCloudShareConfig(){
  try{return JSON.parse(localStorage.getItem(CLOUD_SHARE_CONFIG_KEY)||"{}")||{};}catch(_){return {};}
}

function normalizeCloudUrl(url){
  return String(url||"")
    .trim()
    .replace(/\/rest\/v1\/?$/i,"")
    .replace(/\/+$/,"");
}

function cloudErrorMessage(error){
  const raw=String(error?.message||error||"");
  const message=raw.toLowerCase();
  if(message.includes("공유자료 형식"))return "클라우드 자료 형식이 맞지 않습니다. 다시 내 자료 올리기를 해주세요";
  if(message.includes("401")||message.includes("invalid api key")||message.includes("jwt"))return "키가 맞지 않습니다. Publishable key 전체를 다시 복사해주세요";
  if(message.includes("404")||message.includes("resource_snapshots"))return "테이블 이름(resource_snapshots) 또는 Supabase URL을 확인해주세요";
  if(message.includes("403")||message.includes("permission")||message.includes("row-level")||message.includes("rls"))return "RLS 정책을 확인해주세요";
  if(message.includes("failed to fetch")||message.includes("network")||message.includes("cors"))return "네트워크 또는 Supabase URL을 확인해주세요";
  return raw ? `클라우드 오류: ${raw.slice(0,90)}` : "클라우드 요청에 실패했습니다";
}

function cloudShareConfig(){
  const config=readCloudShareConfig();
  return {
    url:normalizeCloudUrl(config.url),
    key:String(config.key||"").trim(),
    siteId:String(config.siteId||"victor-main").trim()||"victor-main",
    title:String(config.title||"Victor 자원현황").trim()||"Victor 자원현황"
  };
}

function cloudReadConfig(){
  const saved=cloudShareConfig();
  return cloudShareReady(saved)?saved:{...DEFAULT_CLOUD_SHARE_CONFIG};
}

function cloudWriteReady(config=cloudShareConfig()){
  return cloudShareReady(config);
}

function cloudShareReady(config=cloudShareConfig()){return Boolean(config.url&&config.key&&config.siteId);}

function openCloudShareSettings(){
  const config=cloudShareConfig();
  openEntryModal(`${entryHeader("공유 연결 설정","Supabase 읽기 전용 공유판")}
    <div class="form">
      <div class="callout">기본 공유 연결값은 앱에 들어 있어 바로 올리기·가져오기를 사용할 수 있습니다. 값이 바뀌었을 때만 수정하세요. Secret key는 절대 넣지 마세요.</div>
      <label>Supabase URL<input id="cloudShareUrl" inputmode="url" placeholder="https://xxxx.supabase.co" value="${esc(config.url)}"></label>
      <label>Publishable key<textarea id="cloudShareKey" placeholder="sb_publishable_...">${esc(config.key)}</textarea></label>
      <label>공유 ID(site_id)<input id="cloudShareSiteId" placeholder="victor-main" value="${esc(config.siteId)}"></label>
      <label>공유 제목<input id="cloudShareTitle" placeholder="Victor 자원현황" value="${esc(config.title)}"></label>
      <div class="entry-actions"><button class="btn gray" id="testCloudShare" type="button">연결 테스트</button><button class="btn primary" id="saveCloudShareSettings" type="button">설정 저장</button></div>
    </div>`);
  document.getElementById("saveCloudShareSettings")?.addEventListener("click",()=>saveCloudShareSettings(true));
  document.getElementById("testCloudShare")?.addEventListener("click",async()=>{if(saveCloudShareSettings(false))await testCloudShareConnection();});
}

function saveCloudShareSettings(close=false){
  const config={
    url:normalizeCloudUrl(document.getElementById("cloudShareUrl")?.value),
    key:String(document.getElementById("cloudShareKey")?.value||"").trim(),
    siteId:String(document.getElementById("cloudShareSiteId")?.value||"victor-main").trim()||"victor-main",
    title:String(document.getElementById("cloudShareTitle")?.value||"Victor 자원현황").trim()||"Victor 자원현황"
  };
  if(!config.url||!config.key){showFeedback("error","URL과 Publishable key를 입력해주세요");return false;}
  if(!/^https:\/\/.+\.supabase\.co$/i.test(config.url)){showFeedback("warning","Supabase URL 형식을 확인해주세요");return false;}
  try{localStorage.setItem(CLOUD_SHARE_CONFIG_KEY,JSON.stringify(config));}catch(error){showFeedback("error","설정을 저장하지 못했습니다");return false;}
  showFeedback("success","공유 연결 설정 저장 완료");
  if(close)closeEntryModal();
  return true;
}

function openUploadPinSettings(){
  const hasPin=Boolean(currentCloudUploadPinHash());
  openEntryModal(`${entryHeader("올리기 PIN 설정",hasPin?"기존 PIN 확인 후 변경합니다":"최초 1회 PIN을 등록합니다")}
    <div class="form">
      <div class="callout">PIN은 내 자료 올리기 실수 방지용입니다. 공유자료 가져오기는 PIN 없이 가능하고, PIN 설정은 다음 내 자료 올리기 때 다른 기기에도 공유됩니다.</div>
      ${hasPin?`<label>현재 PIN<input id="currentUploadPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="현재 PIN 4자리"></label>`:""}
      <label>새 PIN<input id="newUploadPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="숫자 4자리"></label>
      <label>새 PIN 확인<input id="newUploadPin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="한 번 더 입력"></label>
      <button class="btn primary" id="saveUploadPin" type="button">${hasPin?"PIN 변경":"PIN 등록"}</button>
      ${hasPin?`<button class="btn danger" id="clearUploadPin" type="button">PIN 해제</button>`:""}
    </div>`);
  bindPinNumberInput("currentUploadPin");
  bindPinNumberInput("newUploadPin");
  bindPinNumberInput("newUploadPin2");
  document.getElementById("saveUploadPin")?.addEventListener("click",async()=>{
    try{
      if(hasPin && !await verifyCloudUploadPin(document.getElementById("currentUploadPin")?.value||"")){showFeedback("error","현재 PIN이 맞지 않습니다");return;}
      const next=document.getElementById("newUploadPin")?.value||"";
      const next2=document.getElementById("newUploadPin2")?.value||"";
      if(next!==next2){showFeedback("error","새 PIN 확인이 다릅니다");return;}
      const hash=await hashUploadPin(next);
      const updatedAt=new Date().toISOString();
      saveCloudUploadPinHash(hash);
      saveCloudShareMeta({uploadPinHash:hash,uploadPinUpdatedAt:updatedAt});
      closeEntryModal();
      showFeedback("success",hasPin?"PIN 변경 완료 · 다음 올리기 때 공유됩니다":"PIN 등록 완료 · 이제 클라우드 올리기가 가능합니다");
    }catch(error){showFeedback("error",error.message || "PIN 설정을 확인해주세요");}
  });
  document.getElementById("clearUploadPin")?.addEventListener("click",async()=>{
    if(!await verifyCloudUploadPin(document.getElementById("currentUploadPin")?.value||"")){showFeedback("error","현재 PIN이 맞지 않습니다");return;}
    const updatedAt=new Date().toISOString();
    saveCloudUploadPinHash("");
    saveCloudShareMeta({uploadPinHash:"",uploadPinUpdatedAt:updatedAt});
    closeEntryModal();
    showFeedback("success","PIN 해제 완료 · 다음 올리기 때 공유됩니다");
  });
}

function cloudDashboardHtml(latest=null,{loading=false,error=""}={}){
  const meta=readCloudShareMeta();
  const config=cloudReadConfig();
  const localSnapshot=buildResourceSnapshot();
  const localSummary=snapshotSummary(localSnapshot);
  const cloudSummary=latest?snapshotSummary(latest):null;
  const safety=readCloudApplySafetyPoint();
  const status=loading?"클라우드 확인 중":error?"확인 실패":cloudStatusLabel(latest);
  const statusTitle=loading?"확인 중":error?"확인 실패":status==="클라우드 자료가 최신"?"새 자료 있음":status==="내 자료가 최신"?"올리기 가능":status==="이미 최신"?"최신 상태":"확인 필요";
  const statusHint=status==="클라우드 자료가 최신"?"공유자료 가져오기를 누르면 반영됩니다":status==="내 자료가 최신"?"내 자료 올리기를 누르면 공유됩니다":status==="이미 최신"?"지금은 따로 할 작업이 없습니다":statusTitle;
  const cloudLine=cloudSummary?`공유자료 ${cloudSummary.materials}종 · 장비 ${cloudSummary.equipment}개`:(loading?"공유자료 확인 중":"공유자료 없음");
  const localLine=`내 자료 ${localSummary.materials}종 · 장비 ${localSummary.equipment}개`;
  return `${entryHeader("자원 공유","공유자료 상태를 확인합니다")}
    <div class="form">
      <div class="share-status-card ${latest?"ready":""}">
        <div class="share-status-label">${esc(config.title)}</div>
        <div class="share-status-title">${esc(statusTitle)}</div>
        <div class="share-status-brief">${esc(statusHint)}</div>
        <div class="share-mini-summary"><span>${esc(localLine)}</span><span>${esc(cloudLine)}</span></div>
      </div>
      ${error?`<div class="callout">클라우드 확인 실패: ${esc(error)}</div>`:""}
      <div class="cloud-main-actions">
        <button class="btn primary" id="cloudApplyNow" type="button">공유자료 가져오기</button>
        <button class="btn secondary" id="cloudUploadNow" type="button">내 자료 올리기</button>
      </div>
      ${safety?`<button class="btn danger" id="cloudUndoNow" type="button">방금 적용 되돌리기</button>`:""}
      <div class="cloud-sub-actions">
        <button class="btn gray" id="cloudRefreshNow" type="button">최신자료 확인</button>
        <button class="btn gray" id="cloudPinNow" type="button">PIN</button>
        <button class="btn gray" id="cloudSettingsNow" type="button">연결</button>
      </div>
      <details class="cloud-detail-fold">
        <summary>상세 정보</summary>
        <div class="cloud-action-summary">
          <span><strong>내 자료</strong><br>${esc(fmtShareTime(latestLocalResourceAt() || localSnapshot.createdAt))}</span>
          <span><strong>공유 자료</strong><br>${esc(cloudSummary?fmtShareTime(cloudSummary.date):loading?"확인 중":"자료 없음")}</span>
          <span><strong>올림</strong><br>${esc(fmtShareTime(meta.lastUploadedAt))}</span>
          <span><strong>가져옴</strong><br>${esc(fmtShareTime(meta.lastAppliedAt))}</span>
          <span><strong>올린 기기</strong><br>${esc(cloudSummary?.device || meta.lastUploadedDeviceName || "기록 없음")}</span>
          <span><strong>적용 기기</strong><br>${esc(meta.lastAppliedDeviceName || "기록 없음")}</span>
          <span><strong>PIN</strong><br>${currentCloudUploadPinHash()?"설정됨":"미설정"}</span>
          <span><strong>되돌리기</strong><br>${safety?`${esc(fmtShareTime(safety.createdAt))} 가능`:"없음"}</span>
        </div>
      </details>
    </div>`;
}

function bindCloudDashboard(){
  document.getElementById("cloudApplyNow")?.addEventListener("click",()=>{closeEntryModal();loadCloudShareSnapshot();});
  document.getElementById("cloudUploadNow")?.addEventListener("click",()=>{closeEntryModal();uploadCloudShareSnapshot();});
  document.getElementById("cloudUndoNow")?.addEventListener("click",()=>{closeEntryModal();restoreCloudApplySafetyPoint();});
  document.getElementById("cloudRefreshNow")?.addEventListener("click",()=>refreshCloudShareWithPopup());
  document.getElementById("cloudPinNow")?.addEventListener("click",()=>openUploadPinSettings());
  document.getElementById("cloudSettingsNow")?.addEventListener("click",()=>openCloudShareSettings());
}

function openCloudShareActions(force=false){
  const known=cloudShareNotice?.snapshot || null;
  openEntryModal(cloudDashboardHtml(known,{loading:!known}));
  bindCloudDashboard();
  fetchLatestCloudShareSnapshot().then(snapshot=>{
    if(snapshot){
      cloudShareNotice={kind:isCloudSnapshotNewer(snapshot)?"new":"same",summary:snapshotSummary(snapshot),snapshot};
    }
    openEntryModal(cloudDashboardHtml(snapshot));
    bindCloudDashboard();
  }).catch(error=>{
    console.warn("[Victor] 공유 현황 확인 실패",error);
    openEntryModal(cloudDashboardHtml(known,{error:cloudErrorMessage(error)}));
    bindCloudDashboard();
  });
}

async function refreshCloudShareWithPopup(){
  try{
    openEntryModal(cloudDashboardHtml(cloudShareNotice?.snapshot||null,{loading:true}));
    bindCloudDashboard();
    const snapshot=await fetchLatestCloudShareSnapshot();
    if(!snapshot){
      cloudShareNotice=null;
      openEntryModal(cloudDashboardHtml(null));
      bindCloudDashboard();
      showFeedback("info","아직 클라우드에 공유자료가 없습니다");
      return;
    }
    const kind=isCloudSnapshotNewer(snapshot)?"new":"same";
    cloudShareNotice={kind,summary:snapshotSummary(snapshot),snapshot};
    openEntryModal(cloudDashboardHtml(snapshot));
    bindCloudDashboard();
    const summary=snapshotSummary(snapshot);
    showFeedback(kind==="new"?"info":"success",kind==="new"?`새 공유자료 있음 · ${fmtDateTime(summary.date)}`:`이미 최신자료입니다 · ${fmtDateTime(summary.date)}`);
  }catch(error){
    console.warn("[Victor] 최신자료 확인 실패",error);
    openEntryModal(cloudDashboardHtml(cloudShareNotice?.snapshot||null,{error:cloudErrorMessage(error)}));
    bindCloudDashboard();
    showFeedback("error",`${cloudErrorMessage(error)} · 기존 자료는 유지됩니다`);
  }
}

async function supabaseRest(path,options={}){
  const {cloudConfig,...fetchOptions}=options;
  const config=cloudConfig || cloudShareConfig();
  if(!cloudShareReady(config))throw new Error("공유 연결 설정이 필요합니다");
  const response=await fetch(`${config.url}/rest/v1/${path}`,{
    ...fetchOptions,
    headers:{apikey:config.key,...(fetchOptions.headers||{})}
  });
  const text=await response.text().catch(()=>"");
  if(!response.ok)throw new Error(`Supabase ${response.status}: ${text||response.statusText}`);
  if(response.status===204 || !text.trim())return null;
  try{return JSON.parse(text);}catch(error){throw new Error(`Supabase 응답 해석 실패: ${error.message}`);}
}

async function testCloudShareConnection(){
  try{await supabaseRest("resource_snapshots?select=id&limit=1",{cloudConfig:cloudShareConfig()});showFeedback("success","Supabase 연결 성공");}
  catch(error){console.warn("[Victor] Supabase 연결 실패",error);showFeedback("error",cloudErrorMessage(error));}
}

async function fetchLatestCloudShareSnapshot(){
  const config=cloudReadConfig();
  const rows=await supabaseRest("resource_snapshots?select=*&limit=50",{cloudConfig:config});
  if(!rows?.length) return null;
  const candidates=rows
    .filter(item=>String(item?.site_id||"")===config.siteId && item?.snapshot?.kind==="victor-resource-share")
    .sort((a,b)=>dateMs(b.updated_at||b.created_at)-dateMs(a.updated_at||a.created_at));
  const row=candidates[0];
  if(!row)throw new Error(`공유자료 형식 오류 · 받은 자료 ${rows.length}건`);
  const snapshot=row.snapshot || {};
  return {
    ...snapshot,
    materials:Array.isArray(snapshot.materials)?snapshot.materials:[],
    equipment:Array.isArray(snapshot.equipment)?snapshot.equipment:[],
    title:row.title||snapshot.title,
    createdAt:snapshot.createdAt||row.updated_at||row.created_at,
    cloudUpdatedAt:row.updated_at||row.created_at
  };
}

function isCloudSnapshotNewer(snapshot){
  const meta=readCloudShareMeta();
  const incoming=dateMs(snapshot?.cloudUpdatedAt || snapshot?.cloudSharedAt || snapshot?.createdAt);
  const applied=dateMs(meta.lastAppliedCloudAt);
  const uploaded=dateMs(meta.lastUploadedAt);
  const known=Math.max(applied||0,uploaded||0);
  return Number.isFinite(incoming) && incoming > known + 1000;
}

async function checkCloudShareNotice({force=false,notify=false,silent=false}={}){
  const now=Date.now();
  if(cloudShareCheckInFlight || (!force && now-lastCloudShareCheckAt<120000)) return;
  cloudShareCheckInFlight=true;
  lastCloudShareCheckAt=now;
  try{
    const snapshot=await fetchLatestCloudShareSnapshot();
    if(!snapshot){cloudShareNotice=null;if(notify)showFeedback("info","아직 클라우드 공유자료가 없습니다");return;}
    const summary=snapshotSummary(snapshot);
    const kind=isCloudSnapshotNewer(snapshot) ? "new" : "same";
    const previous=JSON.stringify(cloudShareNotice);
    cloudShareNotice={kind,summary,snapshot};
    if(notify) showFeedback(kind==="new"?"info":"success",kind==="new"?"새 공유자료가 있습니다":"이미 최신 공유자료입니다");
    if(page==="home" && previous!==JSON.stringify(cloudShareNotice)) renderHome();
  }catch(error){
    console.warn("[Victor] 클라우드 공유 확인 실패",error);
    if(!silent) showFeedback("error",cloudErrorMessage(error));
  }finally{
    cloudShareCheckInFlight=false;
  }
}

async function uploadCloudShareSnapshot(){
  closeMenu();
  const config=cloudReadConfig();
  if(!cloudShareReady(config)){openCloudShareSettings();showFeedback("info","클라우드 설정을 확인해주세요");return;}
  try{
    if(!currentCloudUploadPinHash()){
      const synced=await syncCloudUploadPinFromLatest();
      if(synced) showFeedback("info","클라우드 PIN 설정을 불러왔습니다");
    }
    if(!currentCloudUploadPinHash()){
      openUploadPinSettings();
      showFeedback("info","먼저 올리기 PIN을 설정해주세요");
      return;
    }
    const snapshot=buildResourceSnapshot();
    snapshot.cloudSharedAt=new Date().toISOString();
    snapshot.cloudUploadedBy=victorDeviceLabel();
    snapshot.cloudUploadedDeviceId=victorDeviceId();
    if(snapshotTotalQuantity(snapshot)===0){
      showFeedback("error","총 보관량이 0이라 내 자료 올리기를 막았습니다");
      return;
    }
    let latest=null;
    try{latest=await fetchLatestCloudShareSnapshot();}catch(error){console.warn("[Victor] 기존 클라우드 자료 확인 실패",error);}
    const warnings=uploadWarningLines(snapshot,latest);
    if(!await askConfirm("내 자료 올리기 확인",`${uploadPreviewText(snapshot,latest)}\n\n현재 내 보관 현황을 클라우드 공유자료로 올릴까요?`,"다음"))return;
    if(warnings.length && !await askConfirm("주의사항 재확인",`${warnings.join("\n")}\n\n그래도 계속 올릴까요?`,"계속"))return;
    const pin=await requestUploadPin();
    if(pin===null)return;
    if(!await verifyCloudUploadPin(pin)){showFeedback("error","PIN이 맞지 않습니다");return;}
    const payload={site_id:config.siteId,title:config.title,snapshot,updated_at:new Date().toISOString()};
    const existing=await supabaseRest(`resource_snapshots?select=id&site_id=eq.${encodeURIComponent(config.siteId)}&order=updated_at.desc&limit=1`,{cloudConfig:config});
    if(existing?.[0]?.id){
      await supabaseRest(`resource_snapshots?id=eq.${encodeURIComponent(existing[0].id)}`,{cloudConfig:config,method:"PATCH",headers:{"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(payload)});
    }else{
      await supabaseRest("resource_snapshots",{cloudConfig:config,method:"POST",headers:{"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(payload)});
    }
    saveCloudShareMeta({lastUploadedAt:snapshot.cloudSharedAt,lastUploadedSiteId:config.siteId,lastUploadedDeviceName:victorDeviceLabel()});
    cloudShareNotice={kind:"same",summary:snapshotSummary(snapshot),snapshot};
    showFeedback("success","클라우드에 올렸습니다 · 다른 기기에서 바로 적용 가능");
    if(page==="home") renderHome();
  }catch(error){console.warn("[Victor] 클라우드 공유 업로드 실패",error);showFeedback("error",cloudErrorMessage(error));}
}

async function loadCloudShareSnapshot(){
  closeMenu();
  try{
    const sharedSnapshot=await fetchLatestCloudShareSnapshot();
    if(!sharedSnapshot){showFeedback("info","아직 클라우드 공유자료가 없습니다");return;}
    await applySharedSnapshot(sharedSnapshot,"클라우드 공유자료");
  }catch(error){console.warn("[Victor] 클라우드 공유 조회 실패",error);showFeedback("error",cloudErrorMessage(error));}
}

async function refreshVictorAppCache(){
  closeMenu();
  showFeedback("info","앱만 새로고침합니다 · 저장자료 유지");
  try{
    if("serviceWorker" in navigator){
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if("caches" in window){
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith("victor-")).map(key => caches.delete(key)));
    }
  }finally{
    setTimeout(()=>location.reload(),250);
  }
}

function bindGlobal(){
  document.addEventListener("touchstart",event=>{
    lockedTouchY = event.touches?.[0]?.clientY || 0;
    pageTouchY = lockedTouchY;
  },{passive:true});
  document.addEventListener("touchmove",preventPageRubberBand,{passive:false});
  document.addEventListener("touchmove",preventLockedBackgroundScroll,{passive:false});
  document.addEventListener("focusin",event=>{
    const input=event.target;
    if(input?.matches?.('input[type="number"]')&&Number(input.value)===0)input.value="";
    if(input?.matches?.("input, textarea, select")){
      document.body.classList.add("keyboard-open");
      lockPageScroll("input");
    }
  });
  document.addEventListener("focusout",event=>{
    if(event.target?.matches?.("input, textarea, select"))setTimeout(()=>{document.body.classList.remove("keyboard-open");unlockPageScroll("input");},120);
  });
  document.querySelectorAll(".nav").forEach(b => b.addEventListener("click", () => setPage(b.dataset.page)));

  document.getElementById("moreBtn")?.addEventListener("click", () => openMenu());

  document.addEventListener("click", e => {
    const menu = document.getElementById("moreMenu");
    const btn = document.getElementById("moreBtn");
    if(e.target === menu || (!menu.contains(e.target) && !btn.contains(e.target))) closeMenu();
  });

  const menu = document.getElementById("moreMenu");
  const menuSheet = menu?.querySelector(".menu-sheet");
  let menuDragStartY = 0;
  let menuDragDistance = 0;
  let menuDragging = false;
  let menuPotentialDrag = false;
  menuSheet?.addEventListener("touchstart", event => {
    if(!menu.classList.contains("show")) return;
    menuPotentialDrag = menuSheet.scrollTop <= 0;
    menuDragging = false;
    menuDragStartY = event.touches[0].clientY;
    menuDragDistance = 0;
  }, {passive:true});
  menuSheet?.addEventListener("touchmove", event => {
    if(!menuPotentialDrag) return;
    const distance = event.touches[0].clientY - menuDragStartY;
    if(distance <= 0 || menuSheet.scrollTop > 0) return;
    if(distance < 7 && !menuDragging) return;
    event.preventDefault();
    menuDragging = true;
    menuDragDistance = Math.max(0, distance);
    menuSheet.classList.add("dragging");
    if(menuDragDistance > 0){
      menuSheet.style.transform = `translateY(${menuDragDistance}px)`;
    }
  }, {passive:false});
  menuSheet?.addEventListener("touchend", () => {
    if(!menuPotentialDrag) return;
    menuPotentialDrag = false;
    if(!menuDragging) return;
    menuDragging = false;
    menuSheet.classList.remove("dragging");
    if(menuDragDistance > 74) closeMenu();
    else resetMenuMotion();
  }, {passive:true});

  document.getElementById("backupBtn")?.addEventListener("click", () => { closeMenu(); backup(); });
  updateBackupLabel();
  document.getElementById("restoreBtn")?.addEventListener("click", () => { closeMenu(); document.getElementById("restoreFile").click(); });
  document.getElementById("restoreFile")?.addEventListener("change", e => { if(e.target.files[0]) restoreFile(e.target.files[0]); });
  document.getElementById("shareResourcesBtn")?.addEventListener("click",()=>{closeMenu();shareResourceSnapshot();});
  document.getElementById("openSharedResourcesBtn")?.addEventListener("click",()=>{closeMenu();const input=document.getElementById("sharedResourceFile");input.value="";input.click();});
  document.getElementById("cloudShareMenuBtn")?.addEventListener("click",()=>{closeMenu();openCloudShareActions();});
  document.getElementById("techniqueMenuBtn")?.addEventListener("click",()=>{closeMenu();setPage("technique");});
  document.getElementById("sharedResourceFile")?.addEventListener("change",event=>{const file=event.target.files?.[0];if(file)loadSharedResourceFile(file);});
  document.getElementById("resetBtn")?.addEventListener("click", () => { closeMenu(); resetAll(); });
  document.getElementById("trashBtn")?.addEventListener("click",openTrash);
  document.getElementById("bulkUndoBtn")?.addEventListener("click",restoreBulkSafetyPoint);
  document.getElementById("surveyUndoBtn")?.addEventListener("click",()=>{closeMenu();undoLastSurvey();});
  document.getElementById("fastSurveyMenuBtn")?.addEventListener("click",()=>{closeMenu();state.survey?.active?renderFastSurvey():openFastSurveySetup();});
  document.getElementById("themeSettingsBtn")?.addEventListener("click",()=>{closeMenu();openThemeSettings();});
  document.getElementById("appInfoBtn")?.addEventListener("click", () => {
    closeMenu();
    openAppInfoModal();
  });
  document.getElementById("refreshAppBtn")?.addEventListener("click",refreshVictorAppCache);
  document.getElementById("closeAppInfo")?.addEventListener("click", closeAppInfoModal);
  document.getElementById("appInfoModal")?.addEventListener("click", event => {
    if(event.target.id === "appInfoModal") closeAppInfoModal();
  });
  bindAppInfoDrag();
  document.getElementById("entryModal")?.addEventListener("click", event => {
    if(event.target.id === "entryModal") closeEntryModal();
  });

  window.addEventListener("popstate", event => restoreNavigation(event.state || {page:"home"}));

  let lastTouchEnd = 0;
  document.addEventListener("touchend", e => {
    const now = Date.now();
    if(now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, {passive:false});
  document.addEventListener("dragstart", event => event.preventDefault());
}

function openThemeSettings(){
  const current=readThemeMode();
  openEntryModal(`${entryHeader("화면 설정","부드럽고 빠르게 보기 좋게 조정합니다")}
    <div class="form">
      <label>화면 모드<select id="themeModeSelect">
        <option value="light" ${current==="light"?"selected":""}>밝게</option>
        <option value="dark" ${current==="dark"?"selected":""}>어둡게</option>
        <option value="system" ${current==="system"?"selected":""}>기기 설정 따라가기</option>
        <option value="auto" ${current==="auto"?"selected":""}>야간 자동 전환</option>
      </select></label>
      <div class="callout">야간 자동은 18시부터 06시까지 어두운 화면으로 전환합니다. 기본값은 현장 시인성을 위해 밝게입니다.</div>
      <button class="btn primary" id="saveThemeMode" type="button">저장</button>
    </div>`);
  document.getElementById("saveThemeMode")?.addEventListener("click",()=>{
    saveThemeMode(document.getElementById("themeModeSelect")?.value || "light");
    closeEntryModal();
  });
}

function openAppInfoModal(){
  const modal=document.getElementById("appInfoModal");
  if(!modal)return;
  clearTimeout(appInfoCloseTimer);
  modal.classList.remove("closing");
  lockPageScroll("appInfo");
  modal.classList.add("show");
}

function closeAppInfoModal(){
  const modal=document.getElementById("appInfoModal");
  if(!modal)return;
  resetAppInfoMotion();
  if(modal.classList.contains("show")){
    clearTimeout(appInfoCloseTimer);
    modal.classList.add("closing");
    modal.classList.remove("show");
    appInfoCloseTimer=setTimeout(()=>{modal.classList.remove("closing");unlockPageScroll("appInfo");},340);
  }else{
    unlockPageScroll("appInfo");
  }
}

function bindAppInfoDrag(){
  const modal=document.getElementById("appInfoModal");
  const dialog=modal?.querySelector(".dialog");
  if(!modal||!dialog||dialog.dataset.dragBound==="1")return;
  dialog.dataset.dragBound="1";
  let startY=0,distance=0,dragging=false;
  dialog.addEventListener("touchstart",event=>{
    if(!modal.classList.contains("show")||dialog.scrollTop>0)return;
    dragging=true;
    startY=event.touches[0].clientY;
    distance=0;
    dialog.classList.add("dragging");
  },{passive:true});
  dialog.addEventListener("touchmove",event=>{
    if(!dragging)return;
    distance=Math.max(0,event.touches[0].clientY-startY);
    if(distance>0){
      dialog.style.transform=`translateY(${distance}px)`;
      modal.style.backgroundColor=`rgba(16,24,40,${Math.max(.12,.32-distance/700)})`;
    }
  },{passive:true});
  dialog.addEventListener("touchend",()=>{
    if(!dragging)return;
    dragging=false;
    dialog.classList.remove("dragging");
    if(distance>74)closeAppInfoModal();
    else resetAppInfoMotion();
  },{passive:true});
}

function resetAppInfoMotion(){
  const modal=document.getElementById("appInfoModal");
  const dialog=modal?.querySelector(".dialog");
  if(dialog){
    dialog.classList.remove("dragging");
    dialog.style.transform="";
  }
  if(modal)modal.style.backgroundColor="";
}

function openMenu(push=true){
  const menu=document.getElementById("moreMenu");
  if(!menu) return;
  clearTimeout(menuCloseTimer);
  menu.classList.remove("closing");
  if(menu.classList.contains("show")) return;
  lockMenuBackground();
  requestAnimationFrame(()=>menu.classList.add("show"));
  if(push && !restoringNavigation){
    menuHistoryOpen=true;
    pushNavigationState(currentNavigationState({menu:true}));
  }
}

function closeMenu(fromPop=false){
  const menu=document.getElementById("moreMenu");
  resetMenuMotion();
  if(menu && menu.classList.contains("show")){
    clearTimeout(menuCloseTimer);
    menu.classList.add("closing");
    menu.classList.remove("show");
    menuCloseTimer=setTimeout(()=>{
      menu.classList.remove("closing");
      unlockMenuBackground();
    },340);
  }else{
    unlockMenuBackground();
  }
  menuHistoryOpen=false;
}

function lockMenuBackground(){
  lockPageScroll("menu");
}

function unlockMenuBackground(){
  unlockPageScroll("menu");
}

function lockPageScroll(reason="app"){
  if(reason) scrollLockReasons.add(reason);
  if(document.body.classList.contains("menu-open")) return;
  lockedMenuScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.top = `-${lockedMenuScrollY}px`;
  document.documentElement.classList.add("scroll-locked");
  document.body.classList.add("menu-open");
}

function unlockPageScroll(reason="app"){
  if(reason) scrollLockReasons.delete(reason);
  if(scrollLockReasons.size) return;
  if(!document.body.classList.contains("menu-open")) return;
  document.body.classList.remove("menu-open");
  document.documentElement.classList.remove("scroll-locked");
  document.body.style.top = "";
  window.scrollTo(0, lockedMenuScrollY || 0);
  lockedMenuScrollY = 0;
}

function preventLockedBackgroundScroll(event){
  if(!document.body.classList.contains("menu-open")) return;
  const container=event.target?.closest?.(".menu.show .menu-sheet,.modal.show .dialog");
  if(!container){
    event.preventDefault();
    return;
  }
  if(event.touches?.length !== 1) return;
  const currentY=event.touches[0].clientY;
  const deltaY=currentY-lockedTouchY;
  lockedTouchY=currentY;
  const canScroll=container.scrollHeight>container.clientHeight+1;
  if(!canScroll){
    event.preventDefault();
    return;
  }
  const atTop=container.scrollTop<=0;
  const atBottom=container.scrollTop+container.clientHeight>=container.scrollHeight-1;
  if((atTop&&deltaY>0)||(atBottom&&deltaY<0)) event.preventDefault();
}

function preventPageRubberBand(event){
  if(document.body.classList.contains("menu-open")) return;
  if(event.touches?.length !== 1) return;
  const target=event.target;
  if(target?.closest?.(".menu.show,.modal.show")) return;
  const currentY=event.touches[0].clientY;
  const deltaY=currentY-pageTouchY;
  pageTouchY=currentY;
  const root=document.scrollingElement || document.documentElement;
  const top=window.scrollY || root.scrollTop || 0;
  const max=Math.max(0, root.scrollHeight - window.innerHeight);
  if((top<=0 && deltaY>0) || (top>=max-1 && deltaY<0)){
    event.preventDefault();
  }
}

function resetMenuMotion(){
  const menu=document.getElementById("moreMenu");
  const sheet=menu?.querySelector(".menu-sheet");
  if(sheet){
    sheet.classList.remove("dragging");
    sheet.style.transform="";
  }
  if(menu) menu.style.backgroundColor="";
}

function restoreNavigation(nav){
  restoringNavigation = true;
  try{
    if(nav?.menu){
      openMenu(false);
      menuHistoryOpen=true;
      return;
    }
    closeMenu(true);
    document.getElementById("entryModal")?.classList.remove("show");
    closeAppInfoModal();
    if(nav?.recordId && state.records.some(record => record.id === nav.recordId)){
      openDetail(nav.recordId,{push:false,remember:false});
      return;
    }
    if(nav?.equipmentId && state.equipment.some(item => item.id === nav.equipmentId)){
      openEquipment(nav.equipmentId,{push:false,remember:false});
      return;
    }
    page = nav?.page || "home";
    selectedWarehouse = null;
    editingMemoId = nav?.memoId || null;
    if(page === "warehouse"){
      warehouseViewMode = ["materials","equipment","hns"].includes(nav?.view) ? nav.view : "warehouses";
      if(nav?.warehouse && warehouses.includes(nav.warehouse)){
        selectedWarehouse = nav.warehouse;
        warehouseTab = nav.tab === "equipment" ? "equipment" : "material";
      }
    }
    if(page === "register"){
      registerMode = nav.mode === "quick" ? "quick" : "normal";
      registerFlow = nav.flow === "입고" ? "입고" : "출고";
    }
    updateBottomNav();
    render();
  }finally{
    restoringNavigation = false;
  }
}

let appStarted = false;

function hideSplash(){
  document.getElementById("splash")?.classList.add("hide");
}

function showStartupError(error){
  console.error("[Victor] 시작 실패", error);
  hideSplash();
  const message = error?.message || "알 수 없는 오류";
  view.innerHTML = `
    <div class="card startup-error">
      <div class="section-title">앱을 안전하게 시작하지 못했습니다.</div>
      <div class="row-sub" style="margin-top:8px">저장된 데이터는 삭제되지 않았습니다.</div>
      <div class="error-message">${esc(message)}</div>
      <button class="btn primary" id="retryApp" type="button" style="width:100%;margin-top:14px">다시 시작</button>
      <button class="btn secondary" id="refreshAppCache" type="button" style="width:100%;margin-top:10px">앱 캐시 새로 받기</button>
    </div>`;
  document.getElementById("retryApp")?.addEventListener("click", () => location.reload());
  document.getElementById("refreshAppCache")?.addEventListener("click", refreshVictorAppCache);
}

function lockPortraitOrientation(){
  try{
    const orientation = screen?.orientation;
    if(orientation?.lock) orientation.lock("portrait-primary").catch(() => orientation.lock("portrait").catch(() => {}));
  }catch(error){
    // iOS PWA 등 미지원 환경에서는 조용히 무시한다.
  }
}

function init(){
  // 렌더링 오류가 발생해도 시작 화면이 영구적으로 남지 않게 먼저 안전 타이머를 건다.
  setTimeout(hideSplash, 1800);
  lockPortraitOrientation();

  window.addEventListener("error", event => {
    if(!appStarted) showStartupError(event.error || new Error(event.message));
    else showSnack("처리 중 오류가 발생했습니다");
  });
  window.addEventListener("unhandledrejection", event => {
    if(!appStarted) showStartupError(event.reason);
    else showSnack("처리 중 오류가 발생했습니다");
  });

  try{
    applyThemeMode();
    startThemeWatcher();
    bindGlobal();
    render();
    replaceNavigationState({page:"home"});
    appStarted = true;
    setTimeout(hideSplash, 500);
  }catch(error){
    showStartupError(error);
  }

  if("serviceWorker" in navigator){
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=0190m70")
        .then(registration => registration.update())
        .catch(error => console.warn("[Victor] 오프라인 캐시 등록 실패", error));
    });
  }
}

init();



