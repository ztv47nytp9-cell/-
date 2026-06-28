let state = loadState();
let page = "home";
let selectedWarehouse = null;
let draftItems = [];
let editingId = null;
let registerMode = "normal";
let registerFlow = "출고";
let warehouseTab = "material";
let historyFilter = "all";
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

function vibrate(ms=20){
  try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){}
}

function showSnack(msg){
  const s = document.getElementById("snackbar");
  s.textContent = msg;
  s.classList.add("show");
  clearTimeout(window.__snackTimer);
  window.__snackTimer = setTimeout(() => s.classList.remove("show"), 1200);
}

function setPage(next){
  page = next;
  selectedWarehouse = null;
  editingId = null;
  registerMode = "normal";
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  setHead();
  render();
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
  page = "warehouse"; setHead(); renderWarehouse();
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


function pendingRecords(){ return state.records.filter(r => r.status === "pending"); }
function doneRecords(){ return state.records.filter(r => r.status !== "pending"); }

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

function createFlowRecord({flow,type,title,date,warehouse,memo,items,status="done",sourceId=null}){
  return {id:uid(), flow, type, title, date, warehouse, memo, status, sourceId, items:items.map(x=>({...x}))};
}

function renderHome(){
  const pending = pendingRecords().length;
  const recent = getRecent(3);
  view.innerHTML = `
    <div class="grid2">
      <button class="card metric dash-card" id="dashPending" type="button">
        <div class="iconbox">🚨</div><div><div class="metric-label">미반영 긴급기록</div><div class="metric-value">${pending}건</div></div><div class="chev">›</div>
      </button>
      <button class="card metric dash-card" id="dashWarehouse" type="button">
        <div class="iconbox">🏢</div><div><div class="metric-label">보관</div><div class="metric-value">${warehouses.length}개</div></div><div class="chev">›</div>
      </button>
      <button class="card metric dash-card" id="dashCatalog" type="button">
        <div class="iconbox">📋</div><div><div class="metric-label">관리품목</div><div class="metric-value">${catalog.length}종</div></div><div class="chev">›</div>
      </button>
      <button class="card metric dash-card" id="dashHistory" type="button">
        <div class="iconbox">📚</div><div><div class="metric-label">등록이력</div><div class="metric-value">${state.records.length}건</div></div><div class="chev">›</div>
      </button>
    </div>
    <div class="section-head"><div class="section-title">최근 기록</div><button class="link-btn" id="goHistory">더보기 ›</button></div>
    <div class="list-card">${recent.length ? recent.map(recordRow).join("") : `<div class="emptybox">아직 기록이 없습니다.</div>`}</div>
  `;
  document.getElementById("goHistory").addEventListener("click", () => { historyFilter = "all"; setPage("history"); });
  document.getElementById("dashPending").addEventListener("click", () => { historyFilter = "pending"; setPage("history"); });
  document.getElementById("dashWarehouse").addEventListener("click", () => setPage("warehouse"));
  document.getElementById("dashCatalog").addEventListener("click", () => { selectedWarehouse = warehouses[0]; warehouseTab = "material"; setPage("warehouse"); });
  document.getElementById("dashHistory").addEventListener("click", () => { historyFilter = "all"; setPage("history"); });
  view.querySelectorAll("[data-detail]").forEach(b => b.addEventListener("click", () => openDetail(b.dataset.detail)));
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
    view.querySelectorAll("[data-wh]").forEach(b => b.addEventListener("click", () => {
      selectedWarehouse = b.dataset.wh;
      warehouseTab = "material";
      renderWarehouse();
    }));
    document.getElementById("addWarehouseInline").addEventListener("click", addWarehouse);
    return;
  }

  const info = state.warehouseInfos[selectedWarehouse] || {};
  view.innerHTML = `
    <button class="back" id="backWh" type="button">‹ 보관</button>
    <div class="card">
      <div class="section-title">${esc(selectedWarehouse)}</div>
      <div class="row-sub">📌 중요 메모</div>
      <div class="memo-box">${info.memo ? esc(info.memo) : "등록된 메모가 없습니다."}</div>
      <button class="btn secondary" id="editInfo" type="button" style="width:100%;margin-top:12px">보관 메모 수정</button>
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
  document.getElementById("backWh").addEventListener("click", () => { selectedWarehouse = null; renderWarehouse(); });
  document.getElementById("editInfo").addEventListener("click", () => editWarehouseInfo(selectedWarehouse));
  document.getElementById("tabMaterial").addEventListener("click", () => { warehouseTab = "material"; renderWarehouse(); });
  document.getElementById("tabEquipment").addEventListener("click", () => { warehouseTab = "equipment"; renderWarehouse(); });

  const baseBtn = document.getElementById("editOpBase");
  if(baseBtn) baseBtn.addEventListener("click", () => editOpBase(selectedWarehouse));
  const opBtn = document.getElementById("addOpLog");
  if(opBtn) opBtn.addEventListener("click", () => addOpLog(selectedWarehouse));

  if(warehouseTab === "material"){
    document.getElementById("stockSearch").addEventListener("input", renderStockList);
    document.getElementById("addMaterialInline").addEventListener("click", addMaterialChoice);
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

function createFlowRecord({flow,type,title,date,warehouse,memo,items,status="done",sourceId=null}){
  return {id:uid(), flow, type, title, date, warehouse, memo, status, sourceId, items:items.map(x=>({...x}))};
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
  document.getElementById("modeNormal").addEventListener("click", () => { registerMode = "normal"; renderRegister(); setHead(); });
  document.getElementById("modeQuick").addEventListener("click", () => { registerMode = "quick"; renderRegister(); setHead(); });
  const outBtn = document.getElementById("flowOut");
  if(outBtn) outBtn.addEventListener("click", () => { registerFlow = "출고"; renderRegister(); });
  const inBtn = document.getElementById("flowIn");
  if(inBtn) inBtn.addEventListener("click", () => { registerFlow = "입고"; renderRegister(); });
  document.getElementById("addItem").addEventListener("click", addDraftItem);
  document.getElementById("saveRecord").addEventListener("click", saveRecord);
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
      flow:"긴급", type:"사고", warehouse:"", date, title:title || nowQuickTitle(), memo, status:"pending", items
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

function renderHistory(){
  const all = [...state.records].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  const counts = {
    all: all.length,
    pending: all.filter(r => r.status === "pending").length,
    done: all.filter(r => r.status !== "pending").length
  };
  const filtered = all.filter(r => historyFilter === "all" ? true : (historyFilter === "pending" ? r.status === "pending" : r.status !== "pending"));
  view.innerHTML = `
    <div class="history-tabs">
      <button class="history-tab ${historyFilter === "all" ? "active" : ""}" data-hfilter="all" type="button">전체 ${counts.all}</button>
      <button class="history-tab ${historyFilter === "pending" ? "active" : ""}" data-hfilter="pending" type="button">미반영 ${counts.pending}</button>
      <button class="history-tab ${historyFilter === "done" ? "active" : ""}" data-hfilter="done" type="button">완료 ${counts.done}</button>
    </div>
    <input class="search" id="histSearch" placeholder="검색">
    <div id="histList">${renderHistoryListHtml(filtered)}</div>
  `;
  view.querySelectorAll("[data-hfilter]").forEach(b => b.addEventListener("click", () => { historyFilter = b.dataset.hfilter; renderHistory(); }));
  document.getElementById("histSearch").addEventListener("input", () => {
    const q = document.getElementById("histSearch").value.trim();
    const searched = filtered.filter(r => !q || [r.title,r.type,r.flow,r.warehouse,r.memo,...r.items.map(i=>i.name)].join(" ").includes(q));
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


function applyPendingRecord(id){
  const r = state.records.find(x => x.id === id);
  if(!r || r.status !== "pending") return;
  const warehouse = prompt("재고를 차감할 보관 장소", warehouses[0]);
  if(warehouse === null) return;
  if(!warehouses.includes(warehouse)){ showSnack("등록된 보관 장소가 아닙니다"); return; }
  const title = prompt("사고명 또는 정식 기록 제목", r.title || nowQuickTitle());
  if(title === null) return;

  if(!stockAvailable(warehouse, r.items)){
    showSnack("재고가 부족해서 반영할 수 없습니다");
    vibrate(80);
    return;
  }

  applyStock(warehouse, r.items, "출고");
  state.records.push(createFlowRecord({
    flow:"출고", type:"사고", warehouse, date:todayISO(), title:title.trim() || r.title || nowQuickTitle(),
    memo:`긴급기록 반영: ${r.title}${r.memo ? "\n" + r.memo : ""}`, status:"done", sourceId:r.id, items:r.items
  }));

  r.warehouse = warehouse;
  r.title = title.trim() || r.title || nowQuickTitle();
  r.status = "done";
  r.flow = "긴급";
  save();
  showSnack("재고 반영 및 출고이력 생성 완료");
  vibrate(20);
  openDetail(id);
}

function openDetail(id){
  const r = state.records.find(x => x.id === id);
  if(!r) return;
  page = "history";
  setHead();
  view.innerHTML = `
    <button class="back" id="backHist" type="button">‹ 이력</button>
    <div class="card">
      <span class="badge ${r.status === "pending" ? "red" : (r.flow === "입고" ? "green" : "blue")}">${r.status === "pending" ? "미반영" : esc(r.flow || r.type)}</span>
      <div class="section-title" style="margin-top:10px">${esc(r.title)}</div>
      <div class="row-sub">${fmtDate(r.date)} · ${r.warehouse ? esc(r.warehouse) : "보관 미지정"}</div>
      ${r.memo ? `<div class="callout" style="margin-top:12px">${esc(r.memo)}</div>` : ""}
    </div>
    <div class="card">
      <div class="section-title">출고 자재</div>
      ${r.items.map(i => `<div class="stock-line"><div><div class="stock-name">${esc(i.name)}</div><div class="stock-spec">${esc(i.cat)}${i.before !== undefined ? " · " + qtyText(i.before,i.unit) + " → " + qtyText(i.after,i.unit) : ""}</div></div><div class="stock-qty">${i.before !== undefined ? (i.diff > 0 ? "+" : "") + qtyText(i.diff,i.unit) : qtyText(i.qty,i.unit)}</div></div>`).join("")}
    </div>
    ${r.status === "pending" ? `<button class="btn primary" id="applyPending" type="button" style="width:100%;margin-bottom:9px">재고 반영</button>` : ""}
    <button class="btn danger" id="deleteRecord" type="button" style="width:100%">삭제</button>
  `;
  document.getElementById("backHist").addEventListener("click", () => setPage("history"));
  const applyBtn = document.getElementById("applyPending");
  if(applyBtn) applyBtn.addEventListener("click", () => applyPendingRecord(id));
  document.getElementById("deleteRecord").addEventListener("click", () => {
    if(!confirm(r.status === "pending" ? "미반영 기록을 삭제할까요?" : "기록을 삭제하고 재고를 복구할까요?")) return;
    if(r.status === "done" && r.flow === "재고수정"){
      r.items.forEach(i => { if(i.before !== undefined) state.stock[r.warehouse][i.name] = Number(i.before); });
    }else if(r.status === "done" && r.flow !== "긴급"){
      reverseStock(r.warehouse, r.items, r.flow || "출고");
    }
    state.records = state.records.filter(x => x.id !== id);
    save();
    showSnack("삭제되었습니다");
    setPage("history");
  });
}

function renderMemo(){
  const sorted = [...state.memos].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  view.innerHTML = `
    <div class="card">
      <div class="section-title">메모 작성</div>
      <div class="form">
        <label>일자<input id="memoDate" type="date" value="${todayISO()}"></label>
        <label>제목<input id="memoTitle" placeholder="예: 보관 점검 특이사항"></label>
        <label>내용<textarea id="memoBody" placeholder="메모 내용을 입력하세요"></textarea></label>
        <button class="btn primary" id="saveMemo" type="button">메모 저장</button>
      </div>
    </div>
    <div class="section-head"><div class="section-title">일자별 메모</div></div>
    <div class="list-card">${sorted.length ? sorted.map(m => `
      <div class="list-row">
        <div>
          <div class="row-title">${esc(m.title)}</div>
          <div class="row-sub">${fmtDate(m.date)} · ${esc((m.body || "").slice(0,60))}</div>
        </div>
        <button class="btn danger" data-memo-del="${m.id}" type="button">삭제</button>
      </div>
    `).join("") : `<div class="emptybox">아직 메모가 없습니다.</div>`}</div>
  `;
  document.getElementById("saveMemo").addEventListener("click", saveMemo);
  view.querySelectorAll("[data-memo-del]").forEach(b => b.addEventListener("click", () => {
    if(!confirm("메모를 삭제할까요?")) return;
    state.memos = state.memos.filter(x => x.id !== b.dataset.memoDel);
    save();
    renderMemo();
  }));
}

function saveMemo(){
  const date = document.getElementById("memoDate").value || todayISO();
  const title = document.getElementById("memoTitle").value.trim() || "메모";
  const body = document.getElementById("memoBody").value.trim();
  if(!body){ showSnack("메모 내용을 입력해주세요"); return; }
  state.memos.push({id:uid(), date, title, body, createdAt:new Date().toISOString()});
  save();
  showSnack("메모 저장");
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
  document.getElementById("surveyPrev").addEventListener("click", () => { state.survey.index = Math.max(0,idx-1); save(); renderSurvey(); });
  document.getElementById("surveyNext").addEventListener("click", () => saveSurveyValue(true));
  document.getElementById("surveyReview").addEventListener("click", renderSurveyReview);
  document.getElementById("exitSurvey").addEventListener("click", () => { if(confirm("재고조사를 중단하고 나가시겠습니까? 진행상황은 저장됩니다.")) setPage("home"); });
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
  document.getElementById("backSurvey").addEventListener("click", renderSurvey);
  document.getElementById("cancelSurvey").addEventListener("click", () => setPage("home"));
  document.getElementById("applySurvey").addEventListener("click", () => {
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

function openEquipment(id){
  const e = state.equipment.find(x => x.id === id);
  if(!e) return;
  const name = prompt("장비명", e.name);
  if(name === null) return;
  const cat = prompt(`분류\n${equipmentCategories.join(", ")}`, e.cat);
  if(cat === null) return;
  const detail = prompt("세부사항", e.detail || "");
  if(detail === null) return;
  const place = prompt("보관 위치", e.place);
  if(place === null) return;
  ensureWarehouse(place);
  const battery = prompt("배터리", e.battery || "");
  if(battery === null) return;
  const fuel = prompt("연료유/용량", e.fuel || "");
  if(fuel === null) return;
  const etc = prompt("기타사항", e.etc || "");
  if(etc === null) return;
  const status = prompt("상태", e.status);
  if(status === null) return;
  Object.assign(e, {name:name||"장비", cat:cat||"기타장비", detail, place:place||warehouses[0], battery, fuel, etc, status:status||"정상"});
  save();
  showSnack("장비 저장");
  renderWarehouse();
}

function addEquipment(){
  const name = prompt("장비명", "");
  if(!name) return;
  const cat = prompt(`분류\n${equipmentCategories.join(", ")}`, equipmentCategories[0] || "기타장비") || "기타장비";
  const detail = prompt("세부사항", "") || "";
  const place = prompt("보관 위치", selectedWarehouse || warehouses[0]) || (selectedWarehouse || warehouses[0]);
  ensureWarehouse(place);
  const battery = prompt("배터리", "") || "";
  const fuel = prompt("연료유/용량", "") || "";
  const etc = prompt("기타사항", "") || "";
  const status = prompt("상태", "정상") || "정상";
  state.equipment.push({id:uid(),cat,name,detail,place,battery,fuel,etc,status});
  save();
  showSnack("장비 추가");
  page = "warehouse"; setHead(); renderWarehouse();
}


function openManageSettings(){
  closeMenu();
  page = "settings";
  document.getElementById("headTitle").innerHTML = `<div class="page-title">설정</div><div class="date">앱 관리</div>`;
  document.querySelectorAll(".nav").forEach(b => b.classList.remove("active"));
  view.innerHTML = `
    <div class="settings-list">
      <button class="settings-btn" id="settingsBackup" type="button">데이터 백업<span>현재 데이터를 JSON 파일로 저장합니다.</span></button>
      <button class="settings-btn" id="settingsRestore" type="button">데이터 복원<span>백업 파일을 불러와 데이터를 복원합니다.</span></button>
      <button class="settings-btn" id="settingsHelp" type="button">업데이트 내역<span>버전별 변경사항을 확인합니다.</span></button>
      <button class="settings-btn" id="settingsInfo" type="button">앱 정보<span>Victor 버전 및 개발자 정보를 확인합니다.</span></button>
      <button class="settings-btn" id="settingsReset" type="button">전체 초기화<span>모든 저장 데이터를 삭제합니다.</span></button>
    </div>
  `;
  document.getElementById("settingsBackup").addEventListener("click", backup);
  document.getElementById("settingsRestore").addEventListener("click", () => document.getElementById("restoreInput").click());
  document.getElementById("settingsHelp").addEventListener("click", openHelp);
  document.getElementById("settingsInfo").addEventListener("click", showInfo);
  document.getElementById("settingsReset").addEventListener("click", hardReset);
}


function addWarehouse(){
  const name = prompt("추가할 창고명", "");
  if(!name) return;
  if(state.warehouses.includes(name)){ showSnack("이미 있는 창고입니다"); return; }
  ensureWarehouse(name);
  showSnack("창고 추가 완료");
  openManageSettings();
}

function addCategory(){
  const name = prompt("추가할 자재목록/분류명", "");
  if(!name) return;
  if(cats.includes(name)){ showSnack("이미 있는 분류입니다"); return; }
  const itemName = prompt("분류를 생성하기 위한 첫 자재명을 입력하세요\n예: 예비 품목", `${name} 품목`);
  if(!itemName) return;
  const unit = prompt("단위", "개") || "개";
  ensureCatalogItem({cat:name,name:itemName,unit,spec:"",kind:"consume"});
  showSnack("자재목록 추가 완료");
  openManageSettings();
}

function addMaterial(){
  const cat = prompt(`분류명\n현재 분류: ${cats.join(", ")}`, cats[0] || "기타");
  if(!cat) return;
  const name = prompt("자재명", "");
  if(!name) return;
  if(state.catalog.some(x => x.name === name)){ showSnack("이미 있는 자재입니다"); return; }
  const unit = prompt("단위", "개") || "개";
  const spec = prompt("세부사항", "") || "";
  const kindInput = prompt("구분\n소모품: 1 / 회수품: 2", "1");
  const kind = kindInput === "2" ? "returnable" : "consume";
  ensureCatalogItem({cat,name,unit,spec,kind});
  showSnack("자재 추가 완료");
  openManageSettings();
}

function addEquipmentFromManage(){
  const name = prompt("장비명", "");
  if(!name) return;
  const cat = prompt(`분류\n${equipmentCategories.join(", ")}`, equipmentCategories[0] || "기타장비") || "기타장비";
  const detail = prompt("세부사항", "") || "";
  const place = prompt(`보관장소\n${warehouses.join(", ")}`, warehouses[0]) || warehouses[0];
  ensureWarehouse(place);
  const battery = prompt("배터리", "") || "";
  const fuel = prompt("연료유/용량", "") || "";
  const etc = prompt("기타사항", "") || "";
  const status = prompt("상태", "정상") || "정상";
  state.equipment.push({id:uid(),cat,name,detail,place,battery,fuel,etc,status});
  save();
  showSnack("장비 추가 완료");
  openManageSettings();
}


function addWarehouse(){
  const name = prompt("추가할 창고명", "");
  if(!name) return;
  if(state.warehouses.includes(name)){ showSnack("이미 있는 창고입니다"); return; }
  ensureWarehouse(name);
  showSnack("창고 추가 완료");
  page = "warehouse"; setHead(); renderWarehouse();
}

function addMaterialChoice(){ openAddMaterialChoice(); }


function addEquipmentChoice(){ openAddEquipmentChoice(); }


function addCategory(){
  const name = prompt("추가할 자재목록/분류명", "");
  if(!name) return;
  if(cats.includes(name)){ showSnack("이미 있는 분류입니다"); return; }
  const itemName = prompt("분류를 생성하기 위한 첫 자재명을 입력하세요", `${name} 품목`);
  if(!itemName) return;
  const unit = prompt("단위", "개") || "개";
  ensureCatalogItem({cat:name,name:itemName,unit,spec:"",kind:"consume"});
  showSnack("자재목록 추가 완료");
  page = "warehouse"; setHead(); renderWarehouse();
}

function addMaterial(){
  const cat = prompt(`분류명\n현재 분류: ${cats.join(", ")}`, cats[0] || "기타");
  if(!cat) return;
  const name = prompt("자재명", "");
  if(!name) return;
  if(state.catalog.some(x => x.name === name)){ showSnack("이미 있는 자재입니다"); return; }
  const unit = prompt("단위", "개") || "개";
  const spec = prompt("세부사항", "") || "";
  const kindInput = prompt("구분\n소모품: 1 / 회수품: 2", "1");
  const kind = kindInput === "2" ? "returnable" : "consume";
  ensureCatalogItem({cat,name,unit,spec,kind});
  showSnack("자재 추가 완료");
  page = "warehouse"; setHead(); renderWarehouse();
}

function addEquipmentCategory(){
  const name = prompt("추가할 장비목록/분류명", "");
  if(!name) return;
  if(!equipmentCategories.includes(name)) equipmentCategories.push(name);
  showSnack("장비목록 추가 완료");
  page = "warehouse"; setHead(); renderWarehouse();
}

function addEquipment(){
  const name = prompt("장비명", "");
  if(!name) return;
  const cat = prompt(`분류\n${equipmentCategories.join(", ")}`, equipmentCategories[0] || "기타장비") || "기타장비";
  const detail = prompt("세부사항", "") || "";
  const place = prompt("보관 위치", selectedWarehouse || warehouses[0]) || (selectedWarehouse || warehouses[0]);
  ensureWarehouse(place);
  const battery = prompt("배터리", "") || "";
  const fuel = prompt("연료유/용량", "") || "";
  const etc = prompt("기타사항", "") || "";
  const status = prompt("상태", "정상") || "정상";
  state.equipment.push({id:uid(),cat,name,detail,place,battery,fuel,etc,status});
  save();
  showSnack("장비 추가 완료");
  page = "warehouse"; setHead(); renderWarehouse();
}

function openAddMaterialChoice(){
  page = "addMaterialChoice";
  document.getElementById("headTitle").innerHTML = `<div class="page-title">자재 신규 추가</div><div class="date">추가할 항목을 선택하세요</div>`;
  view.innerHTML = `
    <button class="back" id="backAddMat" type="button">‹ 보관</button>
    <div class="add-choice-wrap">
      <button class="add-choice" id="choiceCategory" type="button">
        <div><strong>자재목록 추가</strong><span>유흡착재, 유처리제, 오일펜스 같은 분류를 추가합니다.</span></div><div class="chev">›</div>
      </button>
      <button class="add-choice" id="choiceMaterial" type="button">
        <div><strong>자재 추가</strong><span>매트형 유흡착재처럼 실제 품목을 추가합니다.</span></div><div class="chev">›</div>
      </button>
    </div>
  `;
  document.getElementById("backAddMat").addEventListener("click", () => { page = "warehouse"; setHead(); renderWarehouse(); });
  document.getElementById("choiceCategory").addEventListener("click", addCategory);
  document.getElementById("choiceMaterial").addEventListener("click", addMaterial);
}

function openAddEquipmentChoice(){
  page = "addEquipmentChoice";
  document.getElementById("headTitle").innerHTML = `<div class="page-title">장비 신규 추가</div><div class="date">추가할 항목을 선택하세요</div>`;
  view.innerHTML = `
    <button class="back" id="backAddEq" type="button">‹ 보관</button>
    <div class="add-choice-wrap">
      <button class="add-choice" id="choiceEquipCategory" type="button">
        <div><strong>장비목록 추가</strong><span>유회수기, 발전기, 세척기 같은 장비 분류를 추가합니다.</span></div><div class="chev">›</div>
      </button>
      <button class="add-choice" id="choiceEquipment" type="button">
        <div><strong>장비 추가</strong><span>komara 20k처럼 실제 장비를 추가합니다.</span></div><div class="chev">›</div>
      </button>
    </div>
  `;
  document.getElementById("backAddEq").addEventListener("click", () => { page = "warehouse"; setHead(); renderWarehouse(); });
  document.getElementById("choiceEquipCategory").addEventListener("click", addEquipmentCategory);
  document.getElementById("choiceEquipment").addEventListener("click", addEquipment);
}


function bindGlobal(){
  document.querySelectorAll(".nav").forEach(b => b.addEventListener("click", () => setPage(b.dataset.page)));

  document.getElementById("moreBtn").addEventListener("click", () => {
    document.getElementById("moreMenu").classList.toggle("show");
  });

  document.addEventListener("click", e => {
    const menu = document.getElementById("moreMenu");
    const btn = document.getElementById("moreBtn");
    if(!menu.contains(e.target) && !btn.contains(e.target)) menu.classList.remove("show");
  });

  document.getElementById("manageBtn")?.addEventListener("click", openManageSettings);
  document.getElementById("backupBtn").addEventListener("click", () => { closeMenu(); backup(); });
  document.getElementById("restoreBtn").addEventListener("click", () => { closeMenu(); document.getElementById("restoreFile").click(); });
  document.getElementById("restoreFile").addEventListener("change", e => { if(e.target.files[0]) restoreFile(e.target.files[0]); });
  document.getElementById("resetBtn").addEventListener("click", () => { closeMenu(); resetAll(); });
  document.getElementById("updateBtn").addEventListener("click", () => { closeMenu(); document.getElementById("updateModal").classList.add("show"); });
  document.getElementById("closeUpdate").addEventListener("click", () => document.getElementById("updateModal").classList.remove("show"));
  document.getElementById("appInfoBtn").addEventListener("click", () => {
    closeMenu();
    alert(`Victor\n방제자원 관리 시스템\n\nVersion 0.18.7aa\n\nBy\n통영해양경찰서 주무관 정홍준`);
  });

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

function init(){
  bindGlobal();
  render();
  setTimeout(() => document.getElementById("splash").classList.add("hide"), 500);
  if("serviceWorker" in navigator){
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
}

init();
