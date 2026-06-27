let state = loadState();
let page = "home";
let selectedWarehouse = null;
let draftItems = [];
let editingId = null;

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
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  render();
}

function setHead(){
  const h = document.getElementById("headTitle");
  const date = new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",weekday:"short"});
  if(page === "home") h.innerHTML = `<div class="title">Victor</div><div class="date">${date}</div>`;
  if(page === "warehouse") h.innerHTML = `<div class="page-title">보관</div><div class="date">전체 보관 장소 ${warehouses.length}개</div>`;
  if(page === "register") h.innerHTML = `<div class="page-title">등록</div><div class="date">자재 출고 기록을 등록합니다.</div>`;
  if(page === "history") h.innerHTML = `<div class="page-title">이력</div><div class="date">등록된 기록을 조회합니다.</div>`;
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

function renderHome(){
  const pending = state.records.filter(r => r.status === "pending").length;
  const recent = getRecent(3);
  view.innerHTML = `
    <div class="grid2">
      <div class="card metric"><div class="iconbox">!</div><div><div class="metric-label">미반영</div><div class="metric-value">${pending}건</div></div></div>
      <div class="card metric"><div class="iconbox">□</div><div><div class="metric-label">보관</div><div class="metric-value">${warehouses.length}개</div></div></div>
      <div class="card metric"><div class="iconbox">▱</div><div><div class="metric-label">관리품목</div><div class="metric-value">${catalog.length}종</div></div></div>
      <div class="card metric"><div class="iconbox">✓</div><div><div class="metric-label">버전</div><div class="metric-value" style="font-size:18px">0.18.1</div></div></div>
    </div>
    <div class="card"><div class="section-title">재고조사</div><div class="row-sub">초기 재고 입력과 정기 재고조사를 같은 화면에서 진행합니다.</div><button class="btn primary" id="startSurveyHome" type="button" style="width:100%;margin-top:12px">재고조사 시작</button></div>
    <div class="section-head"><div class="section-title">최근 기록</div><button class="link-btn" id="goHistory">더보기 ›</button></div>
    <div class="list-card">${recent.length ? recent.map(recordRow).join("") : `<div class="emptybox">아직 기록이 없습니다.</div>`}</div>
  `;
  document.getElementById("goHistory").addEventListener("click", () => setPage("history"));
  document.getElementById("startSurveyHome")?.addEventListener("click", startSurvey);
  view.querySelectorAll("[data-detail]").forEach(b => b.addEventListener("click", () => openDetail(b.dataset.detail)));
}

function warehouseSummary(w){
  const count = catalog.filter(i => (state.stock[w]?.[i.name] || 0) > 0).length;
  const totalKg = catalog.filter(i => i.unit === "kg").reduce((a,i) => a + (state.stock[w]?.[i.name] || 0), 0);
  return {count,totalKg};
}

function renderWarehouse(){
  if(!selectedWarehouse){
    view.innerHTML = `<div class="list-card">
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
    </div>`;
    view.querySelectorAll("[data-wh]").forEach(b => b.addEventListener("click", () => {
      selectedWarehouse = b.dataset.wh;
      renderWarehouse();
    }));
    return;
  }

  const info = state.warehouseInfos[selectedWarehouse] || {};
  view.innerHTML = `
    <button class="back" id="backWh" type="button">‹ 보관</button>
    <div class="card">
      <div class="section-title">${esc(selectedWarehouse)}</div>
      <div class="row-sub">위치 ${esc(info.location || "-")} · 담당 ${esc(info.manager || "-")} · 연락처 ${esc(info.phone || "-")}</div>
      <button class="btn secondary" id="editInfo" type="button" style="width:100%;margin-top:12px">보관 정보 수정</button>
    </div>
    ${renderOps(selectedWarehouse)}
    <input class="search" id="stockSearch" placeholder="자재 검색">
    <div class="card" id="stockList"></div>
    ${renderEquipment()}
  `;
  document.getElementById("backWh").addEventListener("click", () => { selectedWarehouse = null; renderWarehouse(); });
  document.getElementById("editInfo").addEventListener("click", () => editWarehouseInfo(selectedWarehouse));
  document.getElementById("stockSearch").addEventListener("input", renderStockList);
  const baseBtn = document.getElementById("editOpBase");
  if(baseBtn) baseBtn.addEventListener("click", () => editOpBase(selectedWarehouse));
  const opBtn = document.getElementById("addOpLog");
  if(opBtn) opBtn.addEventListener("click", () => addOpLog(selectedWarehouse));
  const addEquipBtn = document.getElementById("addEquip");
  if(addEquipBtn) addEquipBtn.addEventListener("click", addEquipment);
  view.querySelectorAll("[data-equip]").forEach(b => b.addEventListener("click", () => openEquipment(b.dataset.equip)));
  renderStockList();
}

function editWarehouseInfo(w){
  const info = state.warehouseInfos[w] || {location:"",manager:"",phone:"",email:"",memo:"",updated:""};
  const location = prompt(`${w}\n위치`, info.location || "");
  if(location === null) return;
  const manager = prompt(`${w}\n담당자`, info.manager || "");
  if(manager === null) return;
  const phone = prompt(`${w}\n연락처`, info.phone || "");
  if(phone === null) return;
  const email = prompt(`${w}\n이메일`, info.email || "");
  if(email === null) return;
  const memo = prompt(`${w}\n비고/메모`, info.memo || "");
  if(memo === null) return;
  state.warehouseInfos[w] = {...info, location, manager, phone, email, memo, updated: todayISO()};
  save();
  showSnack("보관 정보 저장");
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
  const cur = state.stock[selectedWarehouse][name] || 0;
  const val = prompt(`${name}\n현재 ${qtyText(cur,item.unit)}\n수정할 수량`, cur);
  if(val === null) return;
  const num = Number(val);
  if(Number.isNaN(num) || num < 0){ showSnack("올바른 수량을 입력해주세요"); return; }
  state.stock[selectedWarehouse][name] = num;
  save();
  renderStockList();
}

function renderRegister(){
  draftItems = draftItems.length ? draftItems : [];
  view.innerHTML = `
    <div class="form">
      <label>종류<select id="recType">${types.map(t=>`<option value="${t}">${t}</option>`).join("")}</select></label>
      <label>보관<select id="recWarehouse">${warehouses.map(w=>`<option value="${esc(w)}">${esc(w)}</option>`).join("")}</select></label>
      <label>날짜<input id="recDate" type="date" value="${todayISO()}"></label>
      <label>제목<input id="recTitle" placeholder="제목을 입력하세요"></label>
      <div>
        <div class="section-head" style="margin:5px 0 8px">
          <div class="section-title" style="font-size:16px">출고 자재</div>
          <button class="btn secondary" id="addItem" type="button">+ 자재 추가</button>
        </div>
        <div id="itemArea"></div>
      </div>
      <label>메모<textarea id="recMemo" placeholder="메모를 입력하세요"></textarea></label>
      <button class="btn primary" id="saveRecord" type="button">기록 저장</button>
    </div>
  `;
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

  if(!title){ showSnack("제목을 입력해주세요"); return; }
  if(!items.length){ showSnack("출고 자재를 추가해주세요"); return; }

  const ok = items.every(it => (state.stock[warehouse][it.name] || 0) >= it.qty);
  if(!ok){ showSnack("재고가 부족합니다"); vibrate(80); return; }

  items.forEach(it => state.stock[warehouse][it.name] -= it.qty);

  state.records.push({id:uid(), type, warehouse, date, title, memo, status:"done", items});
  draftItems = [];
  save();
  showSnack("저장되었습니다");
  vibrate(20);
  setPage("history");
}

function renderHistory(){
  const records = [...state.records].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  view.innerHTML = `
    <input class="search" id="histSearch" placeholder="검색">
    <div class="list-card" id="histList">${records.length ? records.map(recordRow).join("") : `<div class="emptybox">기록이 없습니다.</div>`}</div>
  `;
  document.getElementById("histSearch").addEventListener("input", () => {
    const q = document.getElementById("histSearch").value.trim();
    const filtered = records.filter(r => !q || [r.title,r.type,r.warehouse,r.memo,...r.items.map(i=>i.name)].join(" ").includes(q));
    document.getElementById("histList").innerHTML = filtered.length ? filtered.map(recordRow).join("") : `<div class="emptybox">검색 결과가 없습니다.</div>`;
    bindHistoryRows();
  });
  bindHistoryRows();
}

function bindHistoryRows(){
  view.querySelectorAll("[data-detail]").forEach(b => b.addEventListener("click", () => openDetail(b.dataset.detail)));
}

function openDetail(id){
  const r = state.records.find(x => x.id === id);
  if(!r) return;
  page = "history";
  setHead();
  view.innerHTML = `
    <button class="back" id="backHist" type="button">‹ 이력</button>
    <div class="card">
      <span class="badge blue">${esc(r.type)}</span>
      <div class="section-title" style="margin-top:10px">${esc(r.title)}</div>
      <div class="row-sub">${fmtDate(r.date)} · ${esc(r.warehouse)}</div>
      ${r.memo ? `<div class="callout" style="margin-top:12px">${esc(r.memo)}</div>` : ""}
    </div>
    <div class="card">
      <div class="section-title">출고 자재</div>
      ${r.items.map(i => `<div class="stock-line"><div><div class="stock-name">${esc(i.name)}</div><div class="stock-spec">${esc(i.cat)}</div></div><div class="stock-qty">${qtyText(i.qty,i.unit)}</div></div>`).join("")}
    </div>
    <button class="btn danger" id="deleteRecord" type="button" style="width:100%">삭제</button>
  `;
  document.getElementById("backHist").addEventListener("click", () => setPage("history"));
  document.getElementById("deleteRecord").addEventListener("click", () => {
    if(!confirm("기록을 삭제하고 재고를 복구할까요?")) return;
    r.items.forEach(i => state.stock[r.warehouse][i.name] += i.qty);
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

function renderEquipment(){
  const list = state.equipment || [];
  return `<div class="card"><div class="section-title">장비관리</div><div class="row-sub">장비 분류, 보관 위치, 상태를 관리합니다.</div><button class="btn primary" id="addEquip" type="button" style="width:100%;margin-top:12px">장비 추가</button></div>
  <div class="list-card">${list.length ? list.map(e => `<button class="list-row" data-equip="${e.id}" type="button"><div><div class="row-title">${esc(e.name)}</div><div class="row-sub">${esc(e.cat)} · ${esc(e.place)} · ${esc(e.status)}${e.memo ? " · 메모 있음" : ""}</div></div><div class="chev">›</div></button>`).join("") : `<div class="emptybox">등록된 장비가 없습니다.</div>`}</div>`;
}

function openEquipment(id){
  const e = state.equipment.find(x => x.id === id);
  if(!e) return;
  const name = prompt("장비명", e.name);
  if(name === null) return;
  const cat = prompt(`분류\n${equipmentCategories.join(", ")}`, e.cat);
  if(cat === null) return;
  const place = prompt("보관 위치", e.place);
  if(place === null) return;
  const status = prompt("상태", e.status);
  if(status === null) return;
  const memo = prompt("메모", e.memo || "");
  if(memo === null) return;
  Object.assign(e, {name:name||"장비", cat:cat||"기타장비", place:place||warehouses[0], status:status||"정상", memo});
  save();
  showSnack("장비 저장");
  renderWarehouse();
}

function addEquipment(){
  const name = prompt("장비명", "");
  if(!name) return;
  const cat = prompt(`분류\n${equipmentCategories.join(", ")}`, "기타장비") || "기타장비";
  const place = prompt("보관 위치", selectedWarehouse || warehouses[0]) || (selectedWarehouse || warehouses[0]);
  const status = prompt("상태", "정상") || "정상";
  const memo = prompt("메모", "") || "";
  state.equipment.push({id:uid(),cat,name,place,status,memo});
  save();
  showSnack("장비 추가");
  renderWarehouse();
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

  document.getElementById("backupBtn").addEventListener("click", () => { closeMenu(); backup(); });
  document.getElementById("restoreBtn").addEventListener("click", () => { closeMenu(); document.getElementById("restoreFile").click(); });
  document.getElementById("restoreFile").addEventListener("change", e => { if(e.target.files[0]) restoreFile(e.target.files[0]); });
  document.getElementById("resetBtn").addEventListener("click", () => { closeMenu(); resetAll(); });
  document.getElementById("updateBtn").addEventListener("click", () => { closeMenu(); document.getElementById("updateModal").classList.add("show"); });
  document.getElementById("closeUpdate").addEventListener("click", () => document.getElementById("updateModal").classList.remove("show"));
  document.getElementById("appInfoBtn").addEventListener("click", () => {
    closeMenu();
    alert(`Victor\n방제자원 관리 시스템\n\nVersion 0.18.1\n\nBy\n통영해양경찰서 주무관 정홍준`);
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
