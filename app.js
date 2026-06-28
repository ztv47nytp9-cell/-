let state = loadState();
let page = "home";
let selectedWarehouse = null;
let draftItems = [];
let editingId = null;
let registerMode = "normal";
let registerFlow = "출고";
let warehouseTab = "material";
let historyFilter = "all";
let historyDateFilter = "all";
let historyFlowFilter = "all";
let homeActivityTab = "history";
let editingMemoId = null;
let restoringNavigation = false;
const stockEditReasons = ["재고조사","오기입 수정","폐기","파손","전산 수정","기타"];

const view = document.getElementById("view");

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function fmtDate(s){
  if(!s) return "";
  const [y,m,d] = s.split("-");
  return `${y}.${m}.${d}`;
}

function qtyText(q,u){
  return `${Number(q).toLocaleString("ko-KR",{maximumFractionDigits:1})} ${u}`;
}

function vibrate(pattern=12){
  if(state.settings?.haptics === false) return;
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}

function hapticTap(){ vibrate(8); }
function hapticSuccess(){ vibrate(24); }
function hapticError(){ vibrate([45,35,45]); }


function showSnack(msg){
  const s = document.getElementById("snackbar");
  s.textContent = msg;
  s.classList.add("show");
  clearTimeout(window.__snackTimer);
  window.__snackTimer = setTimeout(() => s.classList.remove("show"), 1200);
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
  if(next !== "memo") editingMemoId = null;
  updateBottomNav();
  render();
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
}
function render(){
  setHead();
  if(page === "home") renderHome();
  if(page === "warehouse") renderWarehouse();
  if(page === "register") renderRegister();
  if(page === "history") renderHistory();
  if(page === "memo") renderMemo();
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

function storageSummaryCard(){
  const s = totalStorageSummary();
  return `<div class="summary-card">
    <div class="section-title">전체 보관량</div>
    <div class="summary-grid">
      <div class="summary-pill"><div class="summary-label">흡착재</div><div class="summary-value">${Number(s.absorbent).toLocaleString("ko-KR")}kg</div></div>
      <div class="summary-pill"><div class="summary-label">오일펜스</div><div class="summary-value">${Number(s.boom).toLocaleString("ko-KR")}m</div></div>
      <div class="summary-pill"><div class="summary-label">유처리제</div><div class="summary-value">${Number(s.dispersant).toLocaleString("ko-KR")}L</div></div>
    </div>
  </div>`;
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

function applyStock(warehouse, items, flow){
  items.forEach(it => {
    if(!state.stock[warehouse]) state.stock[warehouse] = {};
    if(!(it.name in state.stock[warehouse])) state.stock[warehouse][it.name] = 0;
    if(flow === "입고") state.stock[warehouse][it.name] += Number(it.qty || 0);
    else state.stock[warehouse][it.name] -= Number(it.qty || 0);
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

function createFlowRecord({flow,type,title,date,warehouse,memo,items,status="done",sourceId=null,quick=false,officialTitle=true,createdAt=null,appliedAt=null}){
  return {
    id:uid(), flow, type, title, date, warehouse, memo, status, sourceId, quick, officialTitle,
    createdAt:createdAt || new Date().toISOString(), appliedAt, items:items.map(x=>({...x}))
  };
}

function todayWorkSummary(){
  const today = todayISO();
  const records = state.records.filter(record => record.date === today);
  return {
    out:records.filter(record => record.status === "done" && record.flow === "출고").length,
    in:records.filter(record => record.status === "done" && record.flow === "입고").length,
    edit:records.filter(record => record.status === "done" && record.flow === "재고수정").length
  };
}

function recentMemos(n=3){
  return [...state.memos].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id)).slice(0,n);
}

function rememberLastVisit(visit){
  state.ui = state.ui || {lastVisit:null};
  state.ui.lastVisit = {...visit, updatedAt:new Date().toISOString()};
  try{ save(); }catch(e){}
}

function lastVisitText(){
  const visit = state.ui?.lastVisit;
  if(!visit) return "";
  if(visit.kind === "warehouse") return `${visit.name} · ${visit.tab === "equipment" ? "장비" : "자재"}`;
  if(visit.kind === "equipment") return `장비 · ${visit.name}`;
  if(visit.kind === "record") return `이력 · ${visit.title}`;
  return "";
}

function continueLastVisit(){
  const visit = state.ui?.lastVisit;
  if(!visit) return;
  if(visit.kind === "warehouse" && warehouses.includes(visit.name)){
    page = "warehouse";
    selectedWarehouse = visit.name;
    warehouseTab = visit.tab === "equipment" ? "equipment" : "material";
    updateBottomNav();
    render();
    pushNavigationState({page:"warehouse",warehouse:selectedWarehouse,tab:warehouseTab});
    return;
  }
  if(visit.kind === "equipment" && state.equipment.some(item => item.id === visit.id)){
    openEquipment(visit.id);
    return;
  }
  if(visit.kind === "record" && state.records.some(record => record.id === visit.id)){
    openDetail(visit.id);
    return;
  }
  state.ui.lastVisit = null;
  save();
  showSnack("이어갈 작업을 찾지 못했습니다");
  renderHome();
}

function startHomeRegister(mode,flow="출고"){
  draftItems = [];
  registerMode = mode;
  registerFlow = flow;
  page = "register";
  selectedWarehouse = null;
  editingId = null;
  updateBottomNav();
  render();
  pushNavigationState({page:"register",mode,flow});
}

function openTodayHistory(flow){
  historyFilter = "all";
  historyDateFilter = "today";
  historyFlowFilter = flow;
  setPage("history");
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

function renderHome(){
  const pending = pendingRecords().length;
  const today = todayWorkSummary();
  const lastVisit = lastVisitText();
  view.innerHTML = `
    <div class="home-quick card">
      <div class="section-title">바로 등록</div>
      <div class="home-quick-grid">
        <button class="quick-action emergency" id="homeQuickEmergency" type="button"><span>🚨</span><strong>긴급기록</strong></button>
        <button class="quick-action" id="homeQuickOut" type="button"><span>↗</span><strong>출고</strong></button>
        <button class="quick-action" id="homeQuickIn" type="button"><span>↙</span><strong>입고</strong></button>
      </div>
    </div>
    <div class="card today-card">
      <div class="section-title">오늘의 업무</div>
      <div class="today-grid">
        <button data-today-flow="출고" type="button"><span>출고</span><strong>${today.out}건</strong></button>
        <button data-today-flow="입고" type="button"><span>입고</span><strong>${today.in}건</strong></button>
        <button data-today-flow="재고수정" type="button"><span>수정</span><strong>${today.edit}건</strong></button>
      </div>
    </div>
    ${lastVisit ? `<button class="continue-card" id="continueLastVisit" type="button"><div><div class="metric-label">최근 방문 이어가기</div><div class="row-title">${esc(lastVisit)}</div></div><div class="chev">›</div></button>` : ""}
    <div class="grid2">
      <button class="card metric dash-card" id="dashPending" type="button"><div class="iconbox">🚨</div><div><div class="metric-label">미반영 긴급기록</div><div class="metric-value">${pending}건</div></div><div class="chev">›</div></button>
      <button class="card metric dash-card" id="dashWarehouse" type="button"><div class="iconbox">🏢</div><div><div class="metric-label">보관</div><div class="metric-value">${warehouses.length}개</div></div><div class="chev">›</div></button>
      <button class="card metric dash-card" id="dashCatalog" type="button"><div class="iconbox">📋</div><div><div class="metric-label">관리품목</div><div class="metric-value">${catalog.length}종</div></div><div class="chev">›</div></button>
      <button class="card metric dash-card" id="dashHistory" type="button"><div class="iconbox">📚</div><div><div class="metric-label">등록이력</div><div class="metric-value">${state.records.length}건</div></div><div class="chev">›</div></button>
    </div>
    <div class="section-head"><div class="section-title">최근 활동</div><button class="link-btn" id="goActivityAll">전체보기 ›</button></div>
    <div class="activity-tabs"><button class="${homeActivityTab === "history" ? "active" : ""}" id="homeActivityHistory" type="button">이력</button><button class="${homeActivityTab === "memo" ? "active" : ""}" id="homeActivityMemo" type="button">메모</button></div>
    <div class="list-card">${homeActivityHtml()}</div>
    ${homeActivityTab === "memo" ? `<button class="btn secondary" id="homeNewMemo" type="button" style="width:100%">+ 새 메모</button>` : ""}
  `;
  document.getElementById("homeQuickEmergency")?.addEventListener("click", () => startHomeRegister("quick"));
  document.getElementById("homeQuickOut")?.addEventListener("click", () => startHomeRegister("normal","출고"));
  document.getElementById("homeQuickIn")?.addEventListener("click", () => startHomeRegister("normal","입고"));
  view.querySelectorAll("[data-today-flow]").forEach(button => button.addEventListener("click", () => openTodayHistory(button.dataset.todayFlow)));
  document.getElementById("continueLastVisit")?.addEventListener("click", continueLastVisit);
  document.getElementById("dashPending")?.addEventListener("click", () => { historyFilter = "pending"; historyDateFilter = "all"; historyFlowFilter = "all"; setPage("history"); });
  document.getElementById("dashWarehouse")?.addEventListener("click", () => setPage("warehouse"));
  document.getElementById("dashCatalog")?.addEventListener("click", () => { page="warehouse"; selectedWarehouse=warehouses[0]; warehouseTab="material"; updateBottomNav(); render(); pushNavigationState({page:"warehouse",warehouse:selectedWarehouse,tab:warehouseTab}); });
  document.getElementById("dashHistory")?.addEventListener("click", () => { historyFilter="all"; historyDateFilter="all"; historyFlowFilter="all"; setPage("history"); });
  document.getElementById("homeActivityHistory")?.addEventListener("click", () => { homeActivityTab="history"; renderHome(); });
  document.getElementById("homeActivityMemo")?.addEventListener("click", () => { homeActivityTab="memo"; renderHome(); });
  document.getElementById("goActivityAll")?.addEventListener("click", () => { if(homeActivityTab === "memo") setPage("memo"); else { historyFilter="all"; setPage("history"); } });
  document.getElementById("homeNewMemo")?.addEventListener("click", () => { editingMemoId=null; setPage("memo"); });
  view.querySelectorAll("[data-detail]").forEach(button => button.addEventListener("click", () => openDetail(button.dataset.detail)));
  view.querySelectorAll("[data-home-memo]").forEach(button => button.addEventListener("click", () => { editingMemoId=button.dataset.homeMemo; page="memo"; updateBottomNav(); render(); pushNavigationState({page:"memo",memoId:editingMemoId}); }));
}

function warehouseSummary(w){
  const count = catalog.filter(i => (state.stock[w]?.[i.name] || 0) > 0).length;
  const totalKg = catalog.filter(i => i.unit === "kg").reduce((a,i) => a + (state.stock[w]?.[i.name] || 0), 0);
  return {count,totalKg};
}

function whIcon(){
  return "🏢";
}

function renderWarehouse(){
  if(!selectedWarehouse){
    view.innerHTML = `${storageSummaryCard()}<div class="list-card">
      ${warehouses.map(w => {
        const s = warehouseSummary(w);
        const info = state.warehouseInfos[w] || {};
        return `<button class="list-row" data-wh="${esc(w)}" type="button">
          <div>
            <div class="row-title">${esc(w)}</div>
            <div class="row-sub">관리품목 ${s.count}종 · 총 보유량 ${Number(s.totalKg).toLocaleString("ko-KR")}kg${info.memo ? " · 메모 있음" : ""}</div>
          </div>
          <div class="chev">›</div>
        </button>`;
      }).join("")}
    </div>
    <button class="btn secondary" id="addWarehouseInline" type="button" style="width:100%;margin-top:10px">+ 신규 창고 추가</button>`;
    view.querySelectorAll("[data-wh]").forEach(button => button.addEventListener("click", () => {
      selectedWarehouse = button.dataset.wh;
      warehouseTab = "material";
      rememberLastVisit({kind:"warehouse",name:selectedWarehouse,tab:warehouseTab});
      renderWarehouse();
      pushNavigationState({page:"warehouse",warehouse:selectedWarehouse,tab:warehouseTab});
    }));
    document.getElementById("addWarehouseInline")?.addEventListener("click", addWarehouse);
    return;
  }

  const info = state.warehouseInfos[selectedWarehouse] || {};
  view.innerHTML = `
    <button class="back" id="backWh" type="button">‹ 보관</button>
    <div class="card">
      <div class="section-title">${esc(selectedWarehouse)}</div>
      <div class="row-sub">📌 중요 메모</div>
      <div class="memo-box">${info.memo ? esc(info.memo) : "등록된 메모가 없습니다."}</div>
      <button class="btn secondary" id="editInfo" type="button" style="width:100%;margin-top:12px">메모 수정</button>
    </div>
    ${typeof renderOps === "function" ? renderOps(selectedWarehouse) : ""}
    <div class="card">
      <div class="tabbar">
        <button class="tabbtn ${warehouseTab === "material" ? "active" : ""}" id="tabMaterial" type="button">자재</button>
        <button class="tabbtn ${warehouseTab === "equipment" ? "active" : ""}" id="tabEquipment" type="button">장비</button>
      </div>
      ${warehouseTab === "material" ? `<input class="search" id="stockSearch" placeholder="자재 검색"><div id="stockList"></div><button class="btn secondary" id="addMaterialInline" type="button" style="width:100%;margin-top:12px">+ 신규 추가</button>` : renderWarehouseEquipment(selectedWarehouse)}
    </div>
  `;
  document.getElementById("backWh")?.addEventListener("click", () => window.history.back());
  document.getElementById("editInfo")?.addEventListener("click", () => editWarehouseInfo(selectedWarehouse));
  document.getElementById("tabMaterial")?.addEventListener("click", () => { warehouseTab="material"; rememberLastVisit({kind:"warehouse",name:selectedWarehouse,tab:warehouseTab}); renderWarehouse(); replaceNavigationState({page:"warehouse",warehouse:selectedWarehouse,tab:warehouseTab}); });
  document.getElementById("tabEquipment")?.addEventListener("click", () => { warehouseTab="equipment"; rememberLastVisit({kind:"warehouse",name:selectedWarehouse,tab:warehouseTab}); renderWarehouse(); replaceNavigationState({page:"warehouse",warehouse:selectedWarehouse,tab:warehouseTab}); });

  const baseBtn = document.getElementById("editOpBase");
  if(baseBtn) baseBtn.addEventListener("click", () => editOpBase(selectedWarehouse));
  const opBtn = document.getElementById("addOpLog");
  if(opBtn) opBtn.addEventListener("click", () => addOpLog(selectedWarehouse));

  if(warehouseTab === "material"){
    document.getElementById("stockSearch")?.addEventListener("input", renderStockList);
    document.getElementById("addMaterialInline")?.addEventListener("click", addMaterialChoice);
    renderStockList();
  }else{
    const addEquipBtn = document.getElementById("addEquip");
    if(addEquipBtn) addEquipBtn.addEventListener("click", addEquipmentChoice);
    view.querySelectorAll("[data-equip]").forEach(b => b.addEventListener("click", () => openEquipment(b.dataset.equip)));
  }
}

function renderWarehouseEquipment(place){
  const list = (state.equipment || []).filter(e => e.place === place);
  return `<div>
    <div class="list-card">${list.length ? list.map(e => `<button class="list-row" data-equip="${e.id}" type="button"><div><div class="row-title">${esc(e.cat)} · ${esc(e.name)}</div><div class="row-sub">${e.detail ? esc(e.detail) + " · " : ""}${esc(e.status)}${e.battery ? " · 배터리 " + esc(e.battery) : ""}${e.fuel ? " · 연료 " + esc(e.fuel) : ""}${e.etc ? " · " + esc(e.etc) : ""}</div></div><div class="chev">›</div></button>`).join("") : `<div class="emptybox">이 보관 장소에 등록된 장비가 없습니다.</div>`}</div>
    <button class="btn secondary" id="addEquip" type="button" style="width:100%;margin-top:12px">+ 신규 추가</button>
  </div>`;
}

function editWarehouseInfo(w){
  const info = state.warehouseInfos[w] || {memo:"",updated:""};
  const memo = prompt(`${w}\n중요 메모`, info.memo || "");
  if(memo === null) return;
  state.warehouseInfos[w] = {memo, updated: todayISO()};
  save();
  showSnack("보관 메모 저장");
  renderWarehouse();
}

function renderStockList(){
  const q = (document.getElementById("stockSearch")?.value || "").trim();
  const el = document.getElementById("stockList");
  const html = cats.map(cat => {
    const items = catalog.filter(i => i.cat === cat && (!q || i.name.includes(q) || cat.includes(q)));
    if(!items.length) return "";
    return `<div class="group-title">${cat}</div>${items.map(i => `
      <button class="stock-line" data-stock="${esc(i.name)}" type="button">
        <div>
          <div class="stock-name">${esc(i.name)}</div>
          <div class="stock-spec">${i.spec ? esc(i.spec)+" · " : ""}${i.kind === "returnable" ? "출고/회수품" : "소모품"} · 단위 ${esc(i.unit)}</div>
        </div>
        <div class="stock-qty">${qtyText(state.stock[selectedWarehouse][i.name], i.unit)}</div>
      </button>`).join("")}`;
  }).join("");
  el.innerHTML = html || `<div class="emptybox">검색 결과가 없습니다.</div>`;
  el.querySelectorAll("[data-stock]").forEach(b => b.addEventListener("click", () => editStock(b.dataset.stock)));
}

function editStock(name){
  const item = itemOf(name);
  const cur = Number(state.stock[selectedWarehouse][name] || 0);
  const val = prompt(`${name}\n현재 ${qtyText(cur,item.unit)}\n변경 후 수량`, cur);
  if(val === null) return;
  const num = Number(val);
  if(Number.isNaN(num) || num < 0){ showSnack("올바른 수량을 입력해주세요"); return; }
  if(num === cur){ showSnack("변경된 수량이 없습니다"); return; }

  const reason = prompt(`변경사유\n${stockEditReasons.join(" / ")}`, "재고조사");
  if(reason === null) return;
  const finalReason = stockEditReasons.includes(reason) ? reason : (reason.trim() || "기타");
  const memo = prompt("메모", "") || "";
  const diff = num - cur;

  state.stock[selectedWarehouse][name] = num;
  state.records.push({
    id: uid(), flow: "재고수정", type: "재고수정", title: `${name} 재고수정`, date: todayISO(),
    warehouse: selectedWarehouse, memo: `변경사유: ${finalReason}${memo ? "\n" + memo : ""}`, status: "done", sourceId: null,
    items: [{cat: item.cat, name, qty: Math.abs(diff), unit: item.unit, kind: item.kind, before: cur, after: num, diff}]
  });

  save();
  showSnack(`재고수정 이력 생성 (${diff > 0 ? "+" : ""}${diff}${item.unit})`);
  renderStockList();
}


function nowQuickTitle(){
  const d = new Date();
  return `긴급 기록 ${d.getMonth()+1}.${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function quickRecordCard(){
  return `<div class="callout">긴급기록은 사고 현장에서 자재 사용량만 빠르게 남기는 임시 기록입니다. 저장 후 이력에서 보관 장소와 제목을 정해 재고에 반영합니다.</div>`;
}


function renderRegister(){
  draftItems = draftItems.length ? draftItems : [];
  view.innerHTML = `
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
      <div>
        <div class="section-head" style="margin:5px 0 8px">
          <div class="section-title" style="font-size:16px">${registerMode === "quick" ? "사용 자재" : registerFlow + " 자재"}</div>
          <button class="btn secondary" id="addItem" type="button">+ 자재 추가</button>
        </div>
        <div id="itemArea"></div>
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
  if(inBtn) inBtn.addEventListener("click", () => { registerFlow = "입고"; renderRegister(); });
  document.getElementById("addItem")?.addEventListener("click", addDraftItem);
  document.getElementById("saveRecord")?.addEventListener("click", saveRecord);
  renderItems();
}

function addDraftItem(){
  const f = catalog[0];
  draftItems.push({cat:f.cat,name:f.name,qty:"",unit:f.unit,kind:f.kind});
  renderItems();
}

function renderItems(){
  const area = document.getElementById("itemArea");
  if(!draftItems.length){
    area.innerHTML = `<div class="emptybox">추가된 자재가 없습니다.</div>`;
    return;
  }
  area.innerHTML = draftItems.map((it,idx) => `
    <div class="item-box">
      <div class="form">
        <label>분류<select data-cat="${idx}">${cats.map(c=>`<option value="${c}" ${it.cat===c?"selected":""}>${c}</option>`).join("")}</select></label>
        <label>자재<select data-name="${idx}">${catalog.filter(x=>x.cat===it.cat).map(x=>`<option value="${x.name}" ${it.name===x.name?"selected":""}>${x.name}</option>`).join("")}</select></label>
        <label>출고량 (${esc(it.unit)})<input type="number" inputmode="decimal" min="0" step="0.1" data-qty="${idx}" value="${it.qty ?? ""}"></label>
        <button class="btn gray" data-remove="${idx}" type="button">삭제</button>
      </div>
    </div>
  `).join("");
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
    renderItems();
  }));
  area.querySelectorAll("[data-qty]").forEach(i => i.addEventListener("input", () => {
    let val = String(i.value || "").replace(/[^0-9.]/g,"");
    const parts = val.split(".");
    if(parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
    if(val.length > 1 && val[0] === "0" && val[1] !== ".") val = String(Number(val));
    i.value = val;
    draftItems[Number(i.dataset.qty)].qty = val === "" ? "" : Number(val);
  }));
  area.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => {
    draftItems.splice(Number(b.dataset.remove), 1);
    renderItems();
  }));
}

function saveRecord(){
  const type = document.getElementById("recType").value;
  const warehouse = document.getElementById("recWarehouse").value;
  const date = document.getElementById("recDate").value || todayISO();
  const title = document.getElementById("recTitle").value.trim();
  const memo = document.getElementById("recMemo").value.trim();
  const items = draftItems.map(x => ({...x, qty:Number(x.qty || 0)})).filter(x => x.qty > 0);

  if(registerMode === "normal" && !title){ showSnack("제목을 입력해주세요"); return; }
  if(!items.length){ showSnack(registerMode === "quick" ? "사용 자재를 추가해주세요" : "자재를 추가해주세요"); return; }

  if(registerMode === "quick"){
    state.records.push(createFlowRecord({
      flow:"긴급", type:"사고", warehouse:"", date, title:title || nowQuickTitle(), memo, status:"pending",
      quick:true, officialTitle:false, createdAt:new Date().toISOString(), items
    }));
    draftItems = [];
    save();
    showSnack("긴급기록 저장(미반영)");
    vibrate(20);
    historyFilter = "pending";
    setPage("history");
    return;
  }

  if(registerFlow === "출고" && !stockAvailable(warehouse, items)){
    showSnack("재고가 부족합니다");
    vibrate(80);
    return;
  }

  applyStock(warehouse, items, registerFlow);
  state.records.push(createFlowRecord({
    flow:registerFlow, type, warehouse, date, title, memo, status:"done", items
  }));

  draftItems = [];
  save();
  showSnack(`${registerFlow} 저장`);
  vibrate(20);
  historyFilter = "done";
  setPage("history");
}

function summarizeItems(items){
  if(!items || !items.length) return "자재 없음";
  return items.slice(0,2).map(i => {
    if(i.before !== undefined && i.after !== undefined) return `${i.name} ${qtyText(i.before,i.unit)} → ${qtyText(i.after,i.unit)}`;
    return `${i.name} ${qtyText(i.qty,i.unit)}`;
  }).join(" · ") + (items.length > 2 ? ` 외 ${items.length-2}건` : "");
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
    <div class="history-filter-grid">
      <label>기간<select id="historyDateFilter"><option value="all" ${historyDateFilter === "all" ? "selected" : ""}>전체 기간</option><option value="today" ${historyDateFilter === "today" ? "selected" : ""}>오늘</option><option value="7" ${historyDateFilter === "7" ? "selected" : ""}>최근 7일</option><option value="30" ${historyDateFilter === "30" ? "selected" : ""}>최근 30일</option></select></label>
      <label>종류<select id="historyFlowFilter"><option value="all" ${historyFlowFilter === "all" ? "selected" : ""}>전체 종류</option><option value="출고" ${historyFlowFilter === "출고" ? "selected" : ""}>출고</option><option value="입고" ${historyFlowFilter === "입고" ? "selected" : ""}>입고</option><option value="재고수정" ${historyFlowFilter === "재고수정" ? "selected" : ""}>재고수정</option><option value="긴급" ${historyFlowFilter === "긴급" ? "selected" : ""}>긴급기록</option></select></label>
    </div>
    <input class="search" id="histSearch" placeholder="제목·창고·자재 검색">
    <div class="filter-result">검색 결과 ${filtered.length}건 ${historyDateFilter !== "all" || historyFlowFilter !== "all" ? `<button class="link-btn" id="clearHistoryFilter" type="button">필터 초기화</button>` : ""}</div>
    <div id="histList">${renderHistoryListHtml(filtered)}</div>
  `;
  view.querySelectorAll("[data-hfilter]").forEach(button => button.addEventListener("click", () => { historyFilter=button.dataset.hfilter; renderHistory(); }));
  document.getElementById("historyDateFilter")?.addEventListener("change", event => { historyDateFilter=event.target.value; renderHistory(); });
  document.getElementById("historyFlowFilter")?.addEventListener("change", event => { historyFlowFilter=event.target.value; renderHistory(); });
  document.getElementById("clearHistoryFilter")?.addEventListener("click", () => { historyDateFilter="all"; historyFlowFilter="all"; renderHistory(); });
  document.getElementById("histSearch")?.addEventListener("input", () => {
    const query = document.getElementById("histSearch").value.trim();
    const searched = filtered.filter(record => !query || [record.title,record.type,record.flow,record.warehouse,record.memo,...record.items.map(item=>item.name)].join(" ").includes(query));
    document.getElementById("histList").innerHTML = renderHistoryListHtml(searched);
    bindHistoryRows();
  });
  bindHistoryRows();
}

function renderHistoryListHtml(records){
  if(!records.length) return `<div class="emptybox">기록이 없습니다.</div>`;
  return historyDateGroups(records).map(g => `
    <div class="group-title">${fmtDate(g.date)}</div>
    <div class="list-card">
      ${g.records.map(r => `
        <button class="list-row" data-detail="${r.id}" type="button">
          <div>
            <div><span class="badge ${r.status === "pending" ? "red" : (r.flow === "입고" ? "green" : r.flow === "재고수정" ? "orange" : "blue")}">${r.status === "pending" ? "미반영" : esc(r.flow || r.type)}</span></div>
            <div class="row-title" style="margin-top:7px">${esc(r.title)}</div>
            <div class="row-sub">${r.warehouse ? esc(r.warehouse) : "보관 미지정"} · ${esc(summarizeItems(r.items))}</div>
          </div>
          <div class="chev">›</div>
        </button>
      `).join("")}
    </div>
  `).join("");
}

function bindHistoryRows(){
  view.querySelectorAll("[data-detail]").forEach(b => b.addEventListener("click", () => openDetail(b.dataset.detail)));
}


function pendingRecordForm(r){
  const officialTitle = r.officialTitle ? r.title : "";
  return `<div class="card">
      <div><span class="badge red">미반영</span></div>
      <div class="section-title" style="margin-top:10px">긴급기록 사후보완</div>
      <div class="row-sub">현장에서 저장한 기록입니다. 내용을 확인한 뒤 재고에 반영하세요.</div>
      <div class="form" style="margin-top:14px">
        <label>사고명·정식 제목<input id="pendingTitle" value="${esc(officialTitle)}" placeholder="예: ○○항 유류유출 방제"></label>
        <label>보관장소<select id="pendingWarehouse"><option value="">나중에 지정</option>${warehouses.map(w => `<option value="${esc(w)}" ${r.warehouse === w ? "selected" : ""}>${esc(w)}</option>`).join("")}</select></label>
        <label>발생일<input id="pendingDate" type="date" value="${esc(r.date || todayISO())}"></label>
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
    items
  };
}

function savePendingEdits(id, shouldApply=false, silent=false){
  const r = state.records.find(x => x.id === id);
  if(!r || r.status !== "pending") return false;
  const form = collectPendingForm(r);
  if(!form.items.length){ showSnack("사용 자재를 한 개 이상 남겨주세요"); return false; }

  r.title = form.title || (r.officialTitle ? nowQuickTitle() : r.title || nowQuickTitle());
  r.officialTitle = Boolean(form.title);
  r.warehouse = form.warehouse;
  r.date = form.date;
  r.memo = form.memo;
  r.items = form.items;
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
  if(!r.warehouse){ showSnack("재고를 차감할 보관장소를 선택해주세요"); return false; }
  if(!stockAvailable(r.warehouse, r.items)){
    showSnack("재고가 부족해서 반영할 수 없습니다");
    vibrate(80);
    return false;
  }
  if(!confirm(`${r.warehouse} 재고에서 사용 자재를 차감하고 완료 처리할까요?`)) return false;

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
  vibrate(20);
  openDetail(id,{push:false,remember:false});
  return true;
}

function addPendingItemToRecord(id){
  const r = state.records.find(x => x.id === id);
  if(!r || r.status !== "pending") return;
  if(!savePendingEdits(id,false,true)) return;
  const first = catalog[0];
  r.items.push({cat:first.cat,name:first.name,qty:1,unit:first.unit,kind:first.kind});
  save();
  openDetail(id,{push:false,remember:false});
}

function removePendingItemFromRecord(id,index){
  const r = state.records.find(x => x.id === id);
  if(!r || r.status !== "pending") return;
  if(r.items.length <= 1){ showSnack("자재를 한 개 이상 남겨주세요"); return; }
  if(!savePendingEdits(id,false,true)) return;
  r.items.splice(index,1);
  save();
  openDetail(id,{push:false,remember:false});
}

function openDetail(id, options={}){
  const r = state.records.find(x => x.id === id);
  if(!r) return;
  page = "history";
  if(options.remember !== false) rememberLastVisit({kind:"record",id:r.id,title:r.title});
  if(options.push !== false) pushNavigationState({page:"history",recordId:r.id});
  updateBottomNav();
  setHead();

  if(r.status === "pending"){
    view.innerHTML = `
      <button class="back" id="backHist" type="button">‹ 이력</button>
      ${pendingRecordForm(r)}
      <button class="btn danger" id="deleteRecord" type="button" style="width:100%">미반영 기록 삭제</button>`;
    document.getElementById("backHist")?.addEventListener("click", () => window.history.back());
    document.getElementById("savePending")?.addEventListener("click", () => savePendingEdits(id,false));
    document.getElementById("applyPending")?.addEventListener("click", () => savePendingEdits(id,true));
    document.getElementById("addPendingItem")?.addEventListener("click", () => addPendingItemToRecord(id));
    view.querySelectorAll("[data-remove-pending]").forEach(button => button.addEventListener("click", () => removePendingItemFromRecord(id, Number(button.dataset.removePending))));
    document.getElementById("deleteRecord")?.addEventListener("click", () => {
      if(!confirm("미반영 기록을 삭제할까요? 재고에는 영향이 없습니다.")) return;
      state.records = state.records.filter(x => x.id !== id);
      save();
      showSnack("미반영 기록이 삭제되었습니다");
      setPage("history");
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
      ${r.memo ? `<div class="callout" style="margin-top:12px">${esc(r.memo)}</div>` : ""}
    </div>
    <div class="card">
      <div class="section-title">${r.flow === "입고" ? "입고 자재" : "출고 자재"}</div>
      ${r.items.map(i => `<div class="stock-line"><div><div class="stock-name">${esc(i.name)}</div><div class="stock-spec">${esc(i.cat)}${i.before !== undefined ? " · " + qtyText(i.before,i.unit) + " → " + qtyText(i.after,i.unit) : ""}</div></div><div class="stock-qty">${i.before !== undefined ? (i.diff > 0 ? "+" : "") + qtyText(i.diff,i.unit) : qtyText(i.qty,i.unit)}</div></div>`).join("")}
    </div>
    <button class="btn danger" id="deleteRecord" type="button" style="width:100%">삭제</button>`;
  document.getElementById("backHist")?.addEventListener("click", () => window.history.back());
  document.getElementById("deleteRecord")?.addEventListener("click", () => {
    if(!confirm("기록을 삭제하고 재고를 이전 상태로 복구할까요?")) return;
    if(r.flow === "재고수정"){
      r.items.forEach(i => { if(i.before !== undefined) state.stock[r.warehouse][i.name] = Number(i.before); });
    }else if(r.flow !== "긴급"){
      reverseStock(r.warehouse, r.items, r.flow || "출고");
    }
    state.records = state.records.filter(x => x.id !== id);
    save();
    showSnack("삭제 및 재고 복구 완료");
    setPage("history");
  });
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
  view.querySelectorAll("[data-memo-del]").forEach(button => button.addEventListener("click", () => {
    if(!confirm("메모를 삭제할까요?")) return;
    state.memos = state.memos.filter(memo => memo.id !== button.dataset.memoDel);
    if(editingMemoId === button.dataset.memoDel) editingMemoId = null;
    save();
    hapticSuccess();
    renderMemo();
  }));
}

function saveMemo(){
  const date = document.getElementById("memoDate").value || todayISO();
  const title = document.getElementById("memoTitle").value.trim() || "메모";
  const body = document.getElementById("memoBody").value.trim();
  if(!body){ showSnack("메모 내용을 입력해주세요"); hapticError(); return; }
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
  hapticSuccess();
  renderMemo();
}

function backup(){
  const payload = {...state, backupVersion: VERSION, backupDate: new Date().toISOString()};
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `victor_backup_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  state.lastBackup = new Date().toISOString();
  save();
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

function resetAll(){
  if(!confirm("모든 재고, 이력, 메모가 삭제됩니다. 계속할까요?")) return;
  if(!confirm("정말 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
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

function startSurvey(){
  const items = surveyItems();
  if(state.survey && state.survey.active){
    const keep = confirm(`진행 중인 재고조사가 있습니다.\n${(state.survey.index||0)+1} / ${items.length}\n\n이어서 진행할까요?`);
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
      <div class="row-sub">${esc(it.cat)} · 현재 재고 ${qtyText(cur,it.unit)}</div>
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
      diff.textContent = n === cur ? "변경 없음" : `변경: ${qtyText(cur,it.unit)} → ${qtyText(n,it.unit)}`;
    }
  }
  function saveSurveyValue(move=true){
    clean();
    if(input.value === "") input.value = "0";
    state.survey.values[key] = Number(input.value);
    save();
    showSnack("저장되었습니다");
    vibrate(20);
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
  document.getElementById("exitSurvey")?.addEventListener("click", () => { if(confirm("재고조사를 중단하고 나가시겠습니까? 진행상황은 저장됩니다.")) setPage("home"); });
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
      ${changed.length ? changed.map(x => `<div class="list-row"><div><div class="row-title">${esc(x.name)}</div><div class="row-sub">${esc(x.warehouse)} · ${qtyText(x.cur,x.unit)} → ${qtyText(x.val,x.unit)}</div></div></div>`).join("") : `<div class="emptybox">변경된 품목이 없습니다.</div>`}
    </div>
    ${missing.length ? `<div class="callout">미입력 품목 ${missing.length}개는 0으로 반영됩니다.</div>` : ""}
    <button class="btn primary" id="applySurvey" type="button" style="width:100%;margin-top:10px">재고 반영</button>
    <button class="btn gray" id="cancelSurvey" type="button" style="width:100%;margin-top:10px">취소</button>
  `;
  document.getElementById("backSurvey")?.addEventListener("click", renderSurvey);
  document.getElementById("cancelSurvey")?.addEventListener("click", () => setPage("home"));
  document.getElementById("applySurvey")?.addEventListener("click", () => {
    if(!confirm("검토한 실사 수량으로 재고를 반영할까요?")) return;
    items.forEach(it => {
      const key = it.warehouse + "|" + it.name;
      const val = key in vals ? Number(vals[key]) : 0;
      const before = state.stock[it.warehouse][it.name] || 0;
      state.stock[it.warehouse][it.name] = val;
      if(before !== val){
        state.logs.push({id:uid(),date:todayISO(),type:"재고조사",warehouse:it.warehouse,item:it.name,before,after:val,createdAt:new Date().toISOString()});
      }
    });
    state.survey = {active:false,index:0,values:{},done:true,endedAt:new Date().toISOString()};
    save();
    showSnack("재고조사 반영 완료");
    setPage("home");
  });
}

function opTotal(place,field){
  const op = state.assetOps?.[place] || {};
  const logs = Array.isArray(op.logs) ? op.logs : [];
  if(place === "방제지휘차량" && field === "distance") return (op.distanceBase || 0) + logs.reduce((a,l)=>a+Number(l.distance||0),0);
  if(place === "소형방제정" && field === "hours") return (op.hoursBase || 0) + logs.reduce((a,l)=>a+Number(l.hours||0),0);
  if(place === "소형방제정" && field === "fuel") return (op.fuelBase || 0) + logs.reduce((a,l)=>a+Number(l.fuel||0),0);
  return 0;
}

function renderOps(place){
  if(!["방제지휘차량","소형방제정"].includes(place)) return "";
  if(place === "방제지휘차량"){
    return `<div class="card"><div class="section-title">차량 관리</div>
      <div class="metric" style="height:82px"><div><div class="metric-label">누적 주행거리</div><div class="metric-value">${opTotal(place,"distance")}km</div></div></div>
      <div class="btn-row" style="display:grid;grid-template-columns:1fr 1fr;margin-top:12px">
        <button class="btn secondary" id="editOpBase" type="button">초기값</button>
        <button class="btn primary" id="addOpLog" type="button">일일 기록</button>
      </div>
      <div class="section-title" style="margin-top:16px">최근 이력</div>${recentOpRows(place)}
    </div>`;
  }
  return `<div class="card"><div class="section-title">소형방제정 관리</div>
    <div class="grid2">
      <div class="metric" style="height:82px"><div><div class="metric-label">누적 구동시간</div><div class="metric-value">${opTotal(place,"hours")}h</div></div></div>
      <div class="metric" style="height:82px"><div><div class="metric-label">누적 연료소모</div><div class="metric-value">${opTotal(place,"fuel")}L</div></div></div>
    </div>
    <div class="btn-row" style="display:grid;grid-template-columns:1fr 1fr;margin-top:12px">
      <button class="btn secondary" id="editOpBase" type="button">초기값</button>
      <button class="btn primary" id="addOpLog" type="button">일일 기록</button>
    </div>
    <div class="section-title" style="margin-top:16px">최근 이력</div>${recentOpRows(place)}
  </div>`;
}

function editOpBase(place){
  if(place === "방제지휘차량"){
    const v = prompt("방제지휘차량 초기 누적 주행거리(km)", state.assetOps[place].distanceBase || 0);
    if(v === null) return;
    const n = Number(v);
    if(Number.isNaN(n) || n < 0){ showSnack("올바른 숫자를 입력해주세요"); return; }
    state.assetOps[place].distanceBase = n;
  }else{
    const h = prompt("소형방제정 초기 누적 구동시간(h)", state.assetOps[place].hoursBase || 0);
    if(h === null) return;
    const hn = Number(h);
    if(Number.isNaN(hn) || hn < 0){ showSnack("올바른 숫자를 입력해주세요"); return; }
    const f = prompt("소형방제정 초기 누적 연료소모량(L)", state.assetOps[place].fuelBase || 0);
    if(f === null) return;
    const fn = Number(f);
    if(Number.isNaN(fn) || fn < 0){ showSnack("올바른 숫자를 입력해주세요"); return; }
    state.assetOps[place].hoursBase = hn;
    state.assetOps[place].fuelBase = fn;
  }
  save();
  showSnack("초기값 저장");
  renderWarehouse();
}

function addOpLog(place){
  if(place === "방제지휘차량"){
    const d = prompt("일일 주행거리(km)", 0);
    if(d === null) return;
    const dn = Number(d);
    if(Number.isNaN(dn) || dn < 0){ showSnack("올바른 주행거리를 입력해주세요"); return; }
    const memo = prompt("메모", "") || "";
    state.assetOps[place].logs.push({id:uid(),date:todayISO(),distance:dn,memo,createdAt:new Date().toISOString()});
  }else{
    const h = prompt("일일 구동시간(h)", 0);
    if(h === null) return;
    const hn = Number(h);
    if(Number.isNaN(hn) || hn < 0){ showSnack("올바른 구동시간을 입력해주세요"); return; }
    const f = prompt("일일 연료소모량(L)", 0);
    if(f === null) return;
    const fn = Number(f);
    if(Number.isNaN(fn) || fn < 0){ showSnack("올바른 연료소모량을 입력해주세요"); return; }
    const memo = prompt("메모", "") || "";
    state.assetOps[place].logs.push({id:uid(),date:todayISO(),hours:hn,fuel:fn,memo,createdAt:new Date().toISOString()});
  }
  save();
  showSnack("일일 이력 저장");
  renderWarehouse();
}

function recentOpRows(place){
  const logs = [...((state.assetOps?.[place]?.logs) || [])].slice(-5).reverse();
  if(!logs.length) return `<div class="emptybox">아직 일일 이력이 없습니다.</div>`;
  return logs.map(l => `<div class="list-row"><div><div class="row-title">${esc(l.date || "")}</div><div class="row-sub">${place==="방제지휘차량" ? `${Number(l.distance||0)}km` : `${Number(l.hours||0)}h · ${Number(l.fuel||0)}L`}${l.memo ? ` · ${esc(l.memo)}` : ""}</div></div></div>`).join("");
}

function renderEquipment(){ return ""; }

function openEquipment(id, options={}){
  const e = state.equipment.find(x => x.id === id);
  if(!e) return;
  if(!selectedWarehouse) selectedWarehouse = e.place || warehouses[0];
  page = "equipmentDetail";
  if(options.remember !== false) rememberLastVisit({kind:"equipment",id:e.id,name:e.name});
  if(options.push !== false) pushNavigationState({page:"equipmentDetail",equipmentId:e.id});
  updateBottomNav();
  document.getElementById("headTitle").innerHTML = `<div class="page-title">장비 상세</div><div class="date">${esc(e.name)}</div>`;
  view.innerHTML = `
    <button class="back" id="backEquip" type="button">‹ 장비</button>
    <div class="card">
      <div class="section-title">${esc(e.name)}</div>
      <div class="inline-form">
        <div class="inline-field"><label>분류</label><input id="eqCat" value="${esc(e.cat || "")}"></div>
        <div class="inline-field"><label>장비명</label><input id="eqName" value="${esc(e.name || "")}"></div>
        <div class="inline-field"><label>세부사항</label><textarea id="eqDetail">${esc(e.detail || e.spec || "")}</textarea></div>
        <div class="inline-field"><label>보관장소</label><input id="eqPlace" value="${esc(e.place || e.warehouse || "")}"></div>
        <div class="inline-field"><label>배터리</label><input id="eqBattery" value="${esc(e.battery || "")}"></div>
        <div class="inline-field"><label>연료유</label><input id="eqFuel" value="${esc(e.fuel || "")}"></div>
        <div class="inline-field"><label>기타사항</label><textarea id="eqEtc">${esc(e.etc || e.memo || "")}</textarea></div>
        <div class="inline-field"><label>상태</label><input id="eqStatus" value="${esc(e.status || "정상")}"></div>
      </div>
      <button class="btn primary" id="saveEquip" type="button" style="width:100%;margin-top:14px">저장</button>
    </div>
  `;
  document.getElementById("backEquip")?.addEventListener("click", () => window.history.back());
  document.getElementById("saveEquip")?.addEventListener("click", () => saveEquipmentInline(id));
}

function saveEquipmentInline(id){
  const e = state.equipment.find(x => x.id === id);
  if(!e) return;
  const place = document.getElementById("eqPlace").value.trim() || warehouses[0];
  if(typeof ensureWarehouse === "function") ensureWarehouse(place);
  Object.assign(e, {
    cat: document.getElementById("eqCat").value.trim() || "기타장비",
    name: document.getElementById("eqName").value.trim() || "장비",
    detail: document.getElementById("eqDetail").value.trim(),
    place,
    battery: document.getElementById("eqBattery").value.trim(),
    fuel: document.getElementById("eqFuel").value.trim(),
    etc: document.getElementById("eqEtc").value.trim(),
    status: document.getElementById("eqStatus").value.trim() || "정상"
  });
  save();
  showSnack("장비 저장");
  openEquipment(id,{push:false,remember:false});
}



function editEquipment(id){
  const e = state.equipment.find(x => x.id === id);
  if(!e) return;
  const name = prompt("장비명", e.name);
  if(name === null) return;
  const cat = prompt(`분류`, e.cat || "기타장비");
  if(cat === null) return;
  const detail = prompt("세부사항", e.detail || e.spec || "");
  if(detail === null) return;
  const place = prompt("보관 위치", e.place || e.warehouse || warehouses[0]);
  if(place === null) return;
  if(typeof ensureWarehouse === "function") ensureWarehouse(place);
  const battery = prompt("배터리", e.battery || "");
  if(battery === null) return;
  const fuel = prompt("연료유/용량", e.fuel || "");
  if(fuel === null) return;
  const etc = prompt("기타사항", e.etc || e.memo || "");
  if(etc === null) return;
  const status = prompt("상태", e.status || "정상");
  if(status === null) return;
  Object.assign(e, {
    name:name||"장비",
    cat:cat||"기타장비",
    detail,
    place:place||warehouses[0],
    battery,
    fuel,
    etc,
    status:status||"정상"
  });
  save();
  showSnack("장비 저장");
  openEquipment(id,{push:false,remember:false});
}





function addWarehouse(){
  const name = prompt("추가할 창고명", "");
  if(!name) return;
  if(state.warehouses.includes(name)){ showSnack("이미 있는 창고입니다"); return; }
  ensureWarehouse(name);
  showSnack("창고 추가 완료");
  if(page === "warehouse") renderWarehouse();
}

function openEntryModal(html){
  document.getElementById("entryDialog").innerHTML = html;
  document.getElementById("entryModal").classList.add("show");
  document.getElementById("closeEntryModal")?.addEventListener("click", closeEntryModal);
}

function closeEntryModal(){
  document.getElementById("entryModal").classList.remove("show");
  document.getElementById("entryDialog").innerHTML = "";
}

function entryHeader(title,subtitle){
  return `<div class="entry-modal-head"><div><div class="dialog-title" style="text-align:left;margin:0">${esc(title)}</div><div class="row-sub">${esc(subtitle)}</div></div><button class="entry-close" id="closeEntryModal" type="button" aria-label="닫기">×</button></div>`;
}

function addMaterialChoice(){
  openEntryModal(`
    ${entryHeader("자재 신규 추가", selectedWarehouse || "보관장소")}
    <div class="entry-choice-list">
      <button class="choice-card" id="chooseAddMaterial" type="button"><div><div class="choice-title">📦 자재 추가</div><div class="choice-sub">기존 자재목록에 새 품목을 등록합니다.</div></div><div class="choice-icon">›</div></button>
      <button class="choice-card" id="chooseAddMaterialCategory" type="button"><div><div class="choice-title">📁 자재목록 추가</div><div class="choice-sub">새 분류와 첫 자재를 함께 등록합니다.</div></div><div class="choice-icon">›</div></button>
    </div>`);
  document.getElementById("chooseAddMaterial")?.addEventListener("click", () => showMaterialForm());
  document.getElementById("chooseAddMaterialCategory")?.addEventListener("click", showMaterialCategoryForm);
}

function showMaterialForm(preselectedCategory=""){
  const selectedCategory = cats.includes(preselectedCategory) ? preselectedCategory : (cats[0] || "기타");
  openEntryModal(`
    ${entryHeader("자재 추가", selectedWarehouse || "보관장소")}
    <div class="form entry-form">
      <label>자재목록<select id="newMaterialCat">${cats.map(cat => `<option value="${esc(cat)}" ${cat === selectedCategory ? "selected" : ""}>${esc(cat)}</option>`).join("")}</select></label>
      <label>자재명<input id="newMaterialName" placeholder="예: 소형 유흡착재"></label>
      <div class="form-grid2"><label>단위<input id="newMaterialUnit" value="개" placeholder="kg, L, m, 개"></label><label>초기 수량<input id="newMaterialQty" type="number" inputmode="decimal" min="0" step="0.1" value="0"></label></div>
      <label>규격·세부사항<input id="newMaterialSpec" placeholder="예: 10kg/1BOX"></label>
      <label>관리 구분<select id="newMaterialKind"><option value="consume">소모품</option><option value="returnable">출고·회수품</option></select></label>
      <div class="entry-actions"><button class="btn gray" id="backMaterialChoice" type="button">이전</button><button class="btn primary" id="saveNewMaterial" type="button">자재 저장</button></div>
    </div>`);
  document.getElementById("backMaterialChoice")?.addEventListener("click", addMaterialChoice);
  document.getElementById("saveNewMaterial")?.addEventListener("click", saveMaterialFromForm);
}

function showMaterialCategoryForm(){
  openEntryModal(`
    ${entryHeader("자재목록 추가", selectedWarehouse || "보관장소")}
    <div class="callout">빈 목록은 만들 수 없어 첫 자재를 함께 등록합니다.</div>
    <div class="form entry-form">
      <label>새 자재목록 이름<input id="newCategoryName" placeholder="예: 유류이송 부속품"></label>
      <label>첫 자재명<input id="newCategoryItem" placeholder="예: 내유호스"></label>
      <div class="form-grid2"><label>단위<input id="newCategoryUnit" value="개"></label><label>초기 수량<input id="newCategoryQty" type="number" inputmode="decimal" min="0" step="0.1" value="0"></label></div>
      <label>관리 구분<select id="newCategoryKind"><option value="consume">소모품</option><option value="returnable">출고·회수품</option></select></label>
      <div class="entry-actions"><button class="btn gray" id="backMaterialChoice" type="button">이전</button><button class="btn primary" id="saveNewCategory" type="button">목록과 자재 저장</button></div>
    </div>`);
  document.getElementById("backMaterialChoice")?.addEventListener("click", addMaterialChoice);
  document.getElementById("saveNewCategory")?.addEventListener("click", saveMaterialCategoryFromForm);
}

function validInitialQty(id){
  const value = Number(document.getElementById(id)?.value || 0);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function addInitialStockRecord(item,qty){
  if(!qty || !selectedWarehouse) return;
  state.stock[selectedWarehouse][item.name] = qty;
  state.records.push({
    id:uid(), flow:"재고수정", type:"재고수정", title:`${item.name} 초기재고 등록`, date:todayISO(),
    warehouse:selectedWarehouse, memo:"변경사유: 신규 자재 등록", status:"done", sourceId:null,
    items:[{cat:item.cat,name:item.name,qty,unit:item.unit,kind:item.kind,before:0,after:qty,diff:qty}]
  });
}

function saveMaterialFromForm(){
  const cat = document.getElementById("newMaterialCat")?.value || cats[0] || "기타";
  const name = document.getElementById("newMaterialName")?.value.trim() || "";
  const unit = document.getElementById("newMaterialUnit")?.value.trim() || "개";
  const spec = document.getElementById("newMaterialSpec")?.value.trim() || "";
  const kind = document.getElementById("newMaterialKind")?.value === "returnable" ? "returnable" : "consume";
  const qty = validInitialQty("newMaterialQty");
  if(!name){ showSnack("자재명을 입력해주세요"); return; }
  if(state.catalog.some(item => item.name === name)){ showSnack("이미 등록된 자재명입니다"); return; }
  if(qty === null){ showSnack("초기 수량을 확인해주세요"); return; }
  const item = {cat,name,unit,spec,kind};
  ensureCatalogItem(item);
  addInitialStockRecord(item,qty);
  save();
  closeEntryModal();
  warehouseTab = "material";
  renderWarehouse();
  showSnack("자재 추가 완료");
}

function saveMaterialCategoryFromForm(){
  const cat = document.getElementById("newCategoryName")?.value.trim() || "";
  const name = document.getElementById("newCategoryItem")?.value.trim() || "";
  const unit = document.getElementById("newCategoryUnit")?.value.trim() || "개";
  const kind = document.getElementById("newCategoryKind")?.value === "returnable" ? "returnable" : "consume";
  const qty = validInitialQty("newCategoryQty");
  if(!cat){ showSnack("자재목록 이름을 입력해주세요"); return; }
  if(cats.includes(cat)){ showSnack("이미 있는 자재목록입니다"); return; }
  if(!name){ showSnack("첫 자재명을 입력해주세요"); return; }
  if(state.catalog.some(item => item.name === name)){ showSnack("이미 등록된 자재명입니다"); return; }
  if(qty === null){ showSnack("초기 수량을 확인해주세요"); return; }
  const item = {cat,name,unit,spec:"",kind};
  ensureCatalogItem(item);
  addInitialStockRecord(item,qty);
  save();
  closeEntryModal();
  warehouseTab = "material";
  renderWarehouse();
  showSnack("자재목록과 첫 자재 추가 완료");
}

function addEquipmentChoice(){
  openEntryModal(`
    ${entryHeader("장비 신규 추가", selectedWarehouse || "보관장소")}
    <div class="entry-choice-list">
      <button class="choice-card" id="chooseAddEquipment" type="button"><div><div class="choice-title">🛠️ 장비 추가</div><div class="choice-sub">현재 보관장소에 새 장비를 등록합니다.</div></div><div class="choice-icon">›</div></button>
      <button class="choice-card" id="chooseAddEquipmentCategory" type="button"><div><div class="choice-title">📁 장비목록 추가</div><div class="choice-sub">새 장비 분류를 만든 뒤 장비를 등록합니다.</div></div><div class="choice-icon">›</div></button>
    </div>`);
  document.getElementById("chooseAddEquipment")?.addEventListener("click", () => showEquipmentForm());
  document.getElementById("chooseAddEquipmentCategory")?.addEventListener("click", showEquipmentCategoryForm);
}

function showEquipmentForm(preselectedCategory=""){
  const selectedCategory = equipmentCategories.includes(preselectedCategory) ? preselectedCategory : (equipmentCategories[0] || "기타장비");
  openEntryModal(`
    ${entryHeader("장비 추가", selectedWarehouse || "보관장소")}
    <div class="form entry-form">
      <label>장비목록<select id="newEquipmentCat">${equipmentCategories.map(cat => `<option value="${esc(cat)}" ${cat === selectedCategory ? "selected" : ""}>${esc(cat)}</option>`).join("")}</select></label>
      <label>장비명<input id="newEquipmentName" placeholder="예: 고압세척기 1호"></label>
      <label>세부사항<input id="newEquipmentDetail" placeholder="모델명·구성품"></label>
      <div class="form-grid2"><label>배터리<input id="newEquipmentBattery" placeholder="예: 12V 45Ah"></label><label>연료유·용량<input id="newEquipmentFuel" placeholder="예: 경유 20L"></label></div>
      <label>기타사항<textarea id="newEquipmentEtc" placeholder="점검사항이나 특이사항"></textarea></label>
      <label>상태<select id="newEquipmentStatus"><option value="정상">정상</option><option value="점검필요">점검필요</option><option value="수리중">수리중</option><option value="사용불가">사용불가</option></select></label>
      <div class="entry-actions"><button class="btn gray" id="backEquipmentChoice" type="button">이전</button><button class="btn primary" id="saveNewEquipment" type="button">장비 저장</button></div>
    </div>`);
  document.getElementById("backEquipmentChoice")?.addEventListener("click", addEquipmentChoice);
  document.getElementById("saveNewEquipment")?.addEventListener("click", saveEquipmentFromForm);
}

function showEquipmentCategoryForm(){
  openEntryModal(`
    ${entryHeader("장비목록 추가", selectedWarehouse || "보관장소")}
    <div class="form entry-form">
      <label>새 장비목록 이름<input id="newEquipmentCategory" placeholder="예: 방폭 장비"></label>
      <div class="entry-actions"><button class="btn gray" id="backEquipmentChoice" type="button">이전</button><button class="btn primary" id="saveEquipmentCategory" type="button">목록 저장 후 장비 추가</button></div>
    </div>`);
  document.getElementById("backEquipmentChoice")?.addEventListener("click", addEquipmentChoice);
  document.getElementById("saveEquipmentCategory")?.addEventListener("click", saveEquipmentCategoryFromForm);
}

function saveEquipmentCategoryFromForm(){
  const name = document.getElementById("newEquipmentCategory")?.value.trim() || "";
  if(!name){ showSnack("장비목록 이름을 입력해주세요"); return; }
  if(equipmentCategories.includes(name)){ showSnack("이미 있는 장비목록입니다"); return; }
  state.equipmentCategories = [...new Set([...(state.equipmentCategories || []), name])];
  refreshGlobals(state);
  save();
  showSnack("장비목록 추가 완료");
  showEquipmentForm(name);
}

function saveEquipmentFromForm(){
  const cat = document.getElementById("newEquipmentCat")?.value || "기타장비";
  const name = document.getElementById("newEquipmentName")?.value.trim() || "";
  const detail = document.getElementById("newEquipmentDetail")?.value.trim() || "";
  const battery = document.getElementById("newEquipmentBattery")?.value.trim() || "";
  const fuel = document.getElementById("newEquipmentFuel")?.value.trim() || "";
  const etc = document.getElementById("newEquipmentEtc")?.value.trim() || "";
  const status = document.getElementById("newEquipmentStatus")?.value || "정상";
  if(!name){ showSnack("장비명을 입력해주세요"); return; }
  if(state.equipment.some(item => item.name === name && item.place === selectedWarehouse)){ showSnack("이 보관장소에 같은 장비명이 있습니다"); return; }
  state.equipment.push({id:uid(),cat,name,detail,place:selectedWarehouse || warehouses[0],battery,fuel,etc,status});
  save();
  closeEntryModal();
  warehouseTab = "equipment";
  renderWarehouse();
  showSnack("장비 추가 완료");
}

function bindGlobal(){
  document.querySelectorAll(".nav").forEach(b => b.addEventListener("click", () => setPage(b.dataset.page)));

  document.getElementById("moreBtn")?.addEventListener("click", () => {
    document.getElementById("moreMenu").classList.toggle("show");
  });

  document.addEventListener("click", e => {
    const menu = document.getElementById("moreMenu");
    const btn = document.getElementById("moreBtn");
    if(!menu.contains(e.target) && !btn.contains(e.target)) menu.classList.remove("show");
  });

  document.getElementById("backupBtn")?.addEventListener("click", () => { closeMenu(); backup(); });
  document.getElementById("restoreBtn")?.addEventListener("click", () => { closeMenu(); document.getElementById("restoreFile").click(); });
  document.getElementById("restoreFile")?.addEventListener("change", e => { if(e.target.files[0]) restoreFile(e.target.files[0]); });
  document.getElementById("resetBtn")?.addEventListener("click", () => { closeMenu(); resetAll(); });
  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    closeMenu();
    const toggle = document.getElementById("hapticsToggle");
    if(toggle) toggle.checked = state.settings?.haptics !== false;
    document.getElementById("settingsModal").classList.add("show");
  });
  document.getElementById("hapticsToggle")?.addEventListener("change", event => {
    state.settings = state.settings || {};
    state.settings.haptics = event.target.checked;
    save();
    if(event.target.checked) hapticSuccess();
    showSnack(event.target.checked ? "햅틱 반응 켜짐" : "햅틱 반응 꺼짐");
  });
  document.getElementById("closeSettings")?.addEventListener("click", () => document.getElementById("settingsModal").classList.remove("show"));
  document.getElementById("settingsModal")?.addEventListener("click", event => { if(event.target.id === "settingsModal") event.currentTarget.classList.remove("show"); });

  document.getElementById("appInfoBtn")?.addEventListener("click", () => {
    closeMenu();
    document.getElementById("appInfoModal").classList.add("show");
  });
  document.getElementById("closeAppInfo")?.addEventListener("click", () => document.getElementById("appInfoModal").classList.remove("show"));
  document.getElementById("appInfoModal")?.addEventListener("click", event => {
    if(event.target.id === "appInfoModal") event.currentTarget.classList.remove("show");
  });
  document.getElementById("entryModal")?.addEventListener("click", event => {
    if(event.target.id === "entryModal") closeEntryModal();
  });

  document.addEventListener("click", event => { if(event.target.closest?.("button")) hapticTap(); }, {capture:true});
  window.addEventListener("popstate", event => restoreNavigation(event.state || {page:"home"}));

  let lastTouchEnd = 0;
  document.addEventListener("touchend", e => {
    const now = Date.now();
    if(now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, {passive:false});
}

function closeMenu(){
  document.getElementById("moreMenu").classList.remove("show");
}

function restoreNavigation(nav){
  restoringNavigation = true;
  try{
    document.getElementById("entryModal")?.classList.remove("show");
    document.getElementById("appInfoModal")?.classList.remove("show");
    document.getElementById("settingsModal")?.classList.remove("show");
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
    if(page === "warehouse" && nav?.warehouse && warehouses.includes(nav.warehouse)){
      selectedWarehouse = nav.warehouse;
      warehouseTab = nav.tab === "equipment" ? "equipment" : "material";
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
  document.getElementById("refreshAppCache")?.addEventListener("click", async () => {
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
      location.reload();
    }
  });
}

function init(){
  // 렌더링 오류가 발생해도 시작 화면이 영구적으로 남지 않게 먼저 안전 타이머를 건다.
  setTimeout(hideSplash, 1800);

  window.addEventListener("error", event => {
    if(!appStarted) showStartupError(event.error || new Error(event.message));
    else showSnack("처리 중 오류가 발생했습니다");
  });
  window.addEventListener("unhandledrejection", event => {
    if(!appStarted) showStartupError(event.reason);
    else showSnack("처리 중 오류가 발생했습니다");
  });

  try{
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
      navigator.serviceWorker.register("./sw.js?v=0190e")
        .then(registration => registration.update())
        .catch(error => console.warn("[Victor] 오프라인 캐시 등록 실패", error));
    });
  }
}

init();
