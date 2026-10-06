/* Shared workflow helpers. Existing LocalStorage keys and records remain compatible. */
const workflowLocks=new Set();
function openMaterialInfoForm(name){
  const item=itemOf(name);if(!item)return;
  openEntryModal(`${entryHeader("자재 정보·분류 수정",name)}<div class="form"><label>품목명<input id="materialEditName" value="${esc(name)}"></label><label>분류<select id="materialEditCategory">${cats.map(cat=>`<option ${cat===item.cat?"selected":""}>${esc(cat)}</option>`).join("")}</select></label><label>규격<input id="materialEditSpec" value="${esc(item.spec||"")}"></label><label>최소수량 (전체 재고 기준 · 선택)<input id="materialMinimum" type="number" inputmode="decimal" min="0" value="${Number(item.minStock||0)}"></label><label>메모<textarea id="materialEditMemo">${esc(item.memo||"")}</textarea></label><button class="btn primary" id="saveMaterialInfo" type="button">저장</button></div>`);
  document.getElementById("saveMaterialInfo").addEventListener("click",()=>runWorkflow(`material:${name}`,async()=>{
    const current=itemOf(name),value=id=>document.getElementById(id).value,nextName=value("materialEditName").trim(),cat=value("materialEditCategory"),minimum=finiteQuantity(value("materialMinimum"),current.unit,true);
    if(!nextName||catalog.some(row=>row!==current&&row.name===nextName)){showFeedback("error",!nextName?"품목명을 입력해주세요":"같은 이름의 자재가 있습니다");return;}
    if(minimum===null){showFeedback("error","최소수량을 확인해주세요");return;}
    const before=JSON.stringify(state);
    Object.assign(current,{name:nextName,cat,minStock:minimum,spec:value("materialEditSpec").trim(),memo:value("materialEditMemo").trim(),updatedAt:new Date().toISOString()});
    if(name!==nextName)warehouses.forEach(place=>{state.stock[place][nextName]=Number(state.stock[place]?.[name]||0);delete state.stock[place][name];});
    state.records.forEach(record=>(record.items||[]).forEach(entry=>{if(entry.name===name){entry.name=nextName;entry.cat=cat;}}));
    if(!saveStateTransaction(before,"자재정보 저장 실패 · 입력은 유지됩니다"))return;
    closeEntryModal();if(page==="warehouse")renderWarehouse();else render();showUndoSnack("자재 정보 저장",before,render);
  }));
}
let historyPlaceFilter="all",historyTypeFilter="all",historyLimit=40,historyRenderRecords=[];
let historySignature="";
function renderHistoryListHtml(records){
  const signature=JSON.stringify([historySearchQuery,historyFilter,historyFlowFilter,historyDateFilter,historyCustomFrom,historyCustomTo,historyPlaceFilter,historyTypeFilter]);
  if(signature!==historySignature){historySignature=signature;historyLimit=40;}
  historyRenderRecords=records;
  return baseHistoryListHtml(records.slice(0,historyLimit))+(records.length>historyLimit?`<button class="btn secondary" id="historyMore" type="button" style="width:100%">더보기 · ${Math.min(historyLimit,records.length)} / ${records.length}건</button>`:"");
}
function renderHistory(){
  const previousFold=document.getElementById("historyFilters");
  if(previousFold)historyFiltersOpen=previousFold.open;
  renderBaseHistory();
  const grid=document.querySelector(".history-filter-grid:not(.compact-filter)");if(!grid)return;
  grid.insertAdjacentHTML("beforeend",`<label>장소<select id="historyPlaceFilter"><option value="all">전체 장소</option>${warehouses.map(place=>`<option value="${esc(place)}" ${place===historyPlaceFilter?"selected":""}>${esc(placeLabel(place))}</option>`).join("")}</select></label><label>사고·훈련<select id="historyTypeFilter"><option value="all">전체 구분</option>${["사고","훈련","작업","기타"].map(type=>`<option ${type===historyTypeFilter?"selected":""}>${type}</option>`).join("")}</select></label>`);
  document.getElementById("historyPlaceFilter").addEventListener("change",event=>{historyPlaceFilter=event.target.value;renderHistory();});
  document.getElementById("historyTypeFilter").addEventListener("change",event=>{historyTypeFilter=event.target.value;renderHistory();});
  const count=document.getElementById("historyResultCount");
  if((historyPlaceFilter!=="all"||historyTypeFilter!=="all"||historySearchQuery)&&!document.getElementById("clearHistoryFilter"))count.insertAdjacentHTML("beforeend",'<button class="link-btn" id="clearHistoryFilter" type="button">필터 초기화</button>');
  document.getElementById("clearHistoryFilter")?.addEventListener("click",()=>{historyPlaceFilter="all";historyTypeFilter="all";historySearchQuery="";historyDateFilter="all";historyFlowFilter="all";renderHistory();},true);
  if(historyDateFilter==="custom"&&historyCustomFrom&&historyCustomTo&&historyCustomFrom>historyCustomTo)count.textContent="시작일과 종료일을 확인해주세요";
}
let pendingFormBaseline="",pendingFormRecordId="";
let currentUpdateRegistration=null;
let entryFormBaseline="";
function entryFormFingerprint(){return JSON.stringify([...document.querySelectorAll('#entryDialog input:not([type=search]),#entryDialog select,#entryDialog textarea')].map(input=>[input.id,input.value,input.checked]));}
async function requestEntryClose(){
  if(modalConfirmResolver){closeEntryModal();return;}
  if(entryFormBaseline&&entryFormFingerprint()!==entryFormBaseline){if(!await askConfirm("작성 중 내용 있음","저장하지 않은 입력을 닫을까요?","닫기"))return;}
  closeEntryModal();
}
function attachRecordTimeTools(){
  const input=document.getElementById("recTime"),date=document.getElementById("recDate");if(!input||!date)return;
  const button=document.createElement("button");button.type="button";button.className="btn secondary compact";button.textContent="현재 시각";
  button.addEventListener("click",()=>{date.value=todayISO();input.value=localTimeNow();scheduleRegisterDraft();});input.closest("details")?.append(button);
}
function validRestoreData(raw){return Boolean(raw&&typeof raw==="object"&&!Array.isArray(raw)&&Array.isArray(raw.warehouses)&&Array.isArray(raw.catalog)&&raw.stock&&typeof raw.stock==="object"&&Array.isArray(raw.records));}
function canReverseRecord(record){
  if(record.status==="pending")return true;
  const items=record.items||[];
  if(record.flow==="재고수정")return items.every(item=>Number(state.stock[itemWarehouse(item,record.warehouse)]?.[item.name]||0)===Number(item.after));
  if(record.flow==="입고"&&!stockAvailable(record.warehouse,items))return false;
  if(record.flow==="이송"){
    if(!stockAvailable(record.targetWarehouse,items.map(item=>({...item,warehouse:item.targetWarehouse||record.targetWarehouse}))))return false;
    return (record.equipmentItems||[]).every(entry=>{const target=state.equipment.find(item=>item.id===(entry.toEquipmentId||entry.id));return target&&target.place===(entry.toPlace||record.targetWarehouse)&&Number(target.qty||0)>=Number(entry.qty||0);});
  }
  return true;
}
function canRestoreTrashEntry(entry){
  if(entry.kind==="equipment")return !state.equipment.some(item=>item.id===entry.data.id);
  if(entry.kind==="material")return !itemOf(entry.data.item.name);
  if(entry.kind!=="record")return true;
  const record=entry.data;if(state.records.some(item=>item.id===record.id))return false;
  if(record.status==="pending")return true;
  if(record.flow==="재고수정")return (record.items||[]).every(item=>Number(state.stock[itemWarehouse(item,record.warehouse)]?.[item.name]||0)===Number(item.before));
  if(["출고","이송"].includes(record.flow)&&!stockAvailable(record.warehouse,record.items||[]))return false;
  if(record.flow==="이송")return (record.equipmentItems||[]).every(entry=>{const equipment=state.equipment.find(item=>item.id===entry.id);return equipment?.place===(entry.fromPlace||record.warehouse)&&Number(equipment.qty||0)>=Number(entry.qty||0);});
  return true;
}

async function runWorkflow(key,operation){
  if(workflowLocks.has(key))return false;
  workflowLocks.add(key);
  try{return await operation();}catch(error){console.error("[Victor] 작업 실패",error);showFeedback("error",error.message||"작업을 완료하지 못했습니다 · 입력내용은 유지됩니다");return false;}finally{workflowLocks.delete(key);}
}

function localTimeNow(){return new Date().toLocaleTimeString("sv-SE",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit"});}
function recordedAt(date,time=localTimeNow()){return `${date}T${time}:00+09:00`;}
function placeLabel(place){
  const info=state.warehouseInfos?.[place]||{};
  return [info.office,place,info.detailLocation].filter(Boolean).join(" / ")||"보관 미지정";
}
function lastOutgoingHtml(name){
  const record=state.records.filter(row=>row.status!=="pending"&&row.flow==="출고"&&(row.items||[]).some(item=>item.name===name)).sort((a,b)=>dateMs(b.occurredAt||b.createdAt||b.date)-dateMs(a.occurredAt||a.createdAt||a.date))[0];
  if(!record)return "";const entries=record.items.filter(item=>item.name===name);return `<div class="row-sub">최근 출고 ${fmtDate(record.date)} · ${materialQtyText(entries.reduce((sum,item)=>sum+Number(item.qty||0),0),entries[0].unit,entries[0])}</div>`;
}
function assetPeriodSummary(rows){
  const driving=rows.filter(row=>row.kind==="주행"),sailing=rows.filter(row=>row.kind==="운항");const parts=[];
  const total=(items,field,fallback="")=>Number(items.reduce((sum,row)=>sum+Number(row.log[field]??(fallback?row.log[fallback]:0)??0),0).toFixed(2));
  if(driving.length)parts.push(`주행 ${total(driving,"diff","distance")}km`);
  if(sailing.length){parts.push(`운항 ${total(sailing,"mileageDiff")}NM`);parts.push(`좌현 ${total(sailing,"portDiff","hours")}h / 우현 ${total(sailing,"starboardDiff","hours")}h`);parts.push(`소모 ${total(sailing,"fuel")}L`);}
  return parts.length?" · "+parts.join(" · "):"";
}
function stockLevel(item,place=""){
  const qty=place?Number(state.stock[place]?.[item.name]||0):warehouses.reduce((total,name)=>total+Number(state.stock[name]?.[item.name]||0),0);
  const minimum=Number(place?(item.minimumByPlace?.[place]??0):(item.minStock??0));
  return {qty,minimum,label:minimum>0?(qty<minimum?"부족":qty<minimum*1.2?"주의":"정상"):"",tone:qty<minimum?"red":qty<minimum*1.2?"orange":"green"};
}
function stockBadge(item,place=""){const status=stockLevel(item,place);return status.label?`<span class="badge ${status.tone}">${status.label}</span>`:"";}
function finiteQuantity(value,unit="",allowEmpty=false){
  if(String(value??"").trim()==="")return allowEmpty?0:null;
  const quantity=Number(value);
  if(!Number.isFinite(quantity)||quantity<0)return null;
  return integerUnit(unit)?(Number.isInteger(quantity)?quantity:null):quantity;
}

function registerNumbersValid(){
  const invalid=draftItems.some(item=>finiteQuantity(item.qty,item.unit,true)===null)||draftEquipmentItems.some(item=>finiteQuantity(item.qty,"대",true)===null);
  if(invalid)showFeedback("error","수량은 0 이상으로 입력해주세요 · 개·대·세트는 정수만 가능합니다");
  return !invalid;
}

function pendingFormDirty(){
  const record=state.records.find(row=>row.id===pendingFormRecordId);
  return Boolean(record&&document.getElementById("pendingTitle")&&pendingFormBaseline&&JSON.stringify(collectPendingForm(record))!==pendingFormBaseline);
}
function rememberPendingForm(record){pendingFormRecordId=record.id;pendingFormBaseline=JSON.stringify(collectPendingForm(record));}
async function protectNavigation(proceed){
  if(workflowLocks.has("navigation"))return;
  if(pendingFormDirty()){
    await runWorkflow("navigation",async()=>{
      if(await askConfirm("작성 중 내용 있음","저장하지 않은 사건 변경이 있습니다. 저장하고 나갈까요?","저장하고 나가기")){
        if(await savePendingEdits(pendingFormRecordId,false,true))await proceed();
      }
    });
    return;
  }
  if(page==="register"&&document.getElementById("recTitle")){
    captureRegisterDraft();
    if(isMeaningfulRegisterDraft(registerFormDraft)){
      await runWorkflow("navigation",async()=>{if(await askConfirm("작성 중 내용 있음","입력 내용은 작성 중 기록으로 남겨둡니다. 화면을 나갈까요?","나가기"))await proceed();});
      return;
    }
  }
  return proceed();
}

function enhanceResourceSelects(root=document){
  root.querySelectorAll('select[data-name],select[data-equipment-name],select[id^="pendingName"],select[id^="pendingEquipment"],#registerMaterialName,#registerEquipmentName,#existingMaterialName,#existingEquipmentName').forEach(select=>{
    if(select.dataset.searchBound||select.options.length<8)return;
    select.dataset.searchBound="1";
    const input=document.createElement("input");
    input.type="search";input.className="resource-picker-search";input.placeholder="이름·위치 검색";input.autocomplete="off";
    input.setAttribute("aria-label","선택 목록 검색");
    select.before(input);
    input.addEventListener("input",()=>{
      const query=input.value.trim().toLocaleLowerCase("ko-KR");
      const options=[...select.options];
      options.forEach(option=>{option.hidden=Boolean(query&&!option.textContent.toLocaleLowerCase("ko-KR").includes(query)&&option.value!==select.value);});
      const matches=options.filter(option=>!query||option.textContent.toLocaleLowerCase("ko-KR").includes(query));
      input.setAttribute("aria-description",`${matches.length}개 일치`);
      let hint=select.parentElement.querySelector(".picker-match-count");
      if(!hint){hint=document.createElement("span");hint.className="picker-match-count";select.after(hint);}
      hint.textContent=query?`${matches.length}개 일치 · 현재 선택은 유지됩니다`:"";
    });
  });
}

function homeWorkSummaryHtml(){
  const events=pendingRecords();
  const recent=state.records.filter(record=>record.status!=="pending"&&record.flow==="출고").sort((a,b)=>dateMs(b.createdAt||b.date)-dateMs(a.createdAt||a.date))[0];
  const maintenance=Object.entries(state.assetOps||{}).flatMap(([place,asset])=>(asset.maintenance||[]).map(log=>({...log,place}))).sort((a,b)=>dateMs(b.updatedAt||b.createdAt||b.date)-dateMs(a.updatedAt||a.createdAt||a.date))[0];
  const operations=Object.entries(state.assetOps||{}).flatMap(([place,asset])=>(asset.logs||[]).map(log=>({...log,place}))).sort((a,b)=>dateMs(b.createdAt||b.date)-dateMs(a.createdAt||a.date))[0];
  return `<div class="home-status-grid"><button id="homeStockAttention" type="button"><strong>${catalog.filter(item=>stockLevel(item).label==="부족").length}</strong><span>부족 품목</span></button><button id="homePendingList" type="button"><strong>${events.length}</strong><span>미반영 기록</span></button><button id="homeResourceKinds" type="button"><strong>${catalog.length}</strong><span>자원 품목</span></button></div>
  <details class="home-work-recent"><summary>최근 업무</summary>${recent?`<button class="list-row" data-detail="${recent.id}" type="button"><div><div class="row-title">최근 출고 · ${esc(recent.title)}</div><div class="row-sub">${fmtDateTime(recent.occurredAt||recent.createdAt)}</div></div></button>`:`<div class="row-sub">출고 기록 없음</div>`}${maintenance?`<div class="stock-line"><div>최근 점검 · ${esc(maintenance.place)}<div class="row-sub">${esc(maintenance.content)} · ${fmtDate(maintenance.date)}</div></div></div>`:""}${operations?`<button class="list-row" data-home-asset="${esc(operations.place)}" type="button"><div><div class="row-title">최근 운행 · ${esc(operations.place)}</div><div class="row-sub">${fmtDate(operations.date)} · ${esc(operations.purpose||operations.memo||"기록 보기")}</div></div></button>`:""}</details>`;
}
function bindHomeWorkActions(){
  document.getElementById("homeEquipmentRecord")?.addEventListener("click",()=>openStorageView("equipment"));
  document.getElementById("homeStockAttention")?.addEventListener("click",openStockAttention);
  document.getElementById("homeResourceKinds")?.addEventListener("click",()=>openStorageView("materials"));
  document.getElementById("homePendingList")?.addEventListener("click",()=>{historyFilter="pending";historySearchQuery="";historyDateFilter="all";historyFlowFilter="all";historyPlaceFilter="all";historyTypeFilter="all";setPage("history");});
  document.querySelectorAll("[data-home-asset]").forEach(button=>button.addEventListener("click",()=>openAssetPlace(button.dataset.homeAsset)));
  document.getElementById("homeVehicleRecord")?.addEventListener("click",()=>chooseAssetRecord("차량"));
  document.getElementById("homeVesselRecord")?.addEventListener("click",()=>chooseAssetRecord("함정"));
}
function openAssetPlace(place){page="warehouse";warehouseViewMode="warehouses";selectedWarehouse=place;render();updateBottomNav();scrollToTop();pushNavigationState(currentNavigationState());}
function chooseAssetRecord(kind){
  const places=warehouses.filter(place=>warehouseKind(place)===kind);
  if(places.length===1){addOpLog(places[0]);return;}
  openEntryModal(`${entryHeader(kind==="차량"?"차량 기록":"방제정 기록","기록할 보관장소를 선택하세요")}<div class="list-card">${places.map(place=>`<button class="list-row" data-choose-asset="${esc(place)}" type="button">${esc(place)}</button>`).join("")||`<div class="emptybox">등록된 ${kind} 없음</div>`}</div>`);
  document.querySelectorAll("[data-choose-asset]").forEach(button=>button.addEventListener("click",()=>addOpLog(button.dataset.chooseAsset)));
}
function openStockAttention(){
  const rows=catalog.filter(item=>stockLevel(item).label==="부족");
  openEntryModal(`${entryHeader("재고 부족","설정한 최소수량 기준")}<div class="list-card">${rows.map(item=>`<button class="list-row" data-stock-attention="${esc(item.name)}" type="button"><div>${esc(item.name)}<div class="row-sub">현재 ${materialQtyText(stockLevel(item).qty,item.unit,item)} · 최소 ${stockLevel(item).minimum}${esc(item.unit)}</div></div>${stockBadge(item)}</button>`).join("")||`<div class="emptybox">부족 품목 없음 · 자재 정보에서 최소수량을 설정할 수 있습니다.</div>`}</div>`);
  document.querySelectorAll("[data-stock-attention]").forEach(button=>button.addEventListener("click",()=>openAllMaterialDetail(button.dataset.stockAttention)));
}
function copyRecordToRegister(record){
  const flow=["출고","입고","이송"].includes(record.flow)?record.flow:"출고";
  const draft={mode:record.status==="pending"?"quick":"normal",flow,type:record.type||"기타",date:todayISO(),time:localTimeNow(),title:`${record.title} (복사)`,warehouse:record.warehouse,targetWarehouse:record.targetWarehouse||"",memo:record.memo||"",locationType:record.location?.type||"",locationDetail:record.location?.detail||"",items:(record.items||[]).map(item=>({...item})),equipmentItems:(record.equipmentItems||[]).map(item=>({...item}))};
  applyRegisterDraft(draft);pendingRegisterDraft=null;setPage("register");showFeedback("info","새 기록으로 복사됨 · 수량과 장소를 확인해주세요");
}

function csvCell(value){
  let text=String(value??"");
  if(/^[=+\-@\t\r]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
function csvRows(kind){
  const inventories=()=>[["보관장소","세부위치","품목명","분류","단위","현재수량","최소수량"],...warehouses.flatMap(place=>catalog.map(item=>[place,state.warehouseInfos?.[place]?.detailLocation||"",item.name,item.cat,item.unit,Number(state.stock[place]?.[item.name]||0),item.minimumByPlace?.[place]??item.minStock??""]))];
  const records=()=>[["기록ID","날짜","시간","종류","사고/훈련","제목","상태","보관장소","도착장소","품목","수량","단위","메모","자원구분"],...state.records.flatMap(record=>{
    const resources=[...(record.items||[]).map(item=>({...item,resourceKind:"자재"})),...(record.equipmentItems||[]).map(item=>({...item,warehouse:item.place||record.warehouse,unit:"대",resourceKind:"장비"}))];
    return (resources.length?resources:[{}]).map(item=>[record.id,record.date,record.time||"",record.flow,record.type,record.title,record.status==="pending"?"미반영":"반영",itemWarehouse(item,record.warehouse),item.targetWarehouse||record.targetWarehouse||"",item.name||"",item.qty??"",item.unit||"",record.memo,item.resourceKind||""]);
  })];
  const equipment=()=>[["관리ID","관리번호","장비명","분류","보관장소","규격","수량","상태","메모"],...state.equipment.map(item=>[item.id,item.managementNo||item.managementNumber||"",item.name,item.cat,item.place,item.spec,item.qty,item.status,item.memo])];
  const operations=type=>[["보관장소","기록ID","날짜","출발시간","도착시간","출발누적km","도착누적km","운행거리km","마일NM","좌현시간h","우현시간h","연료소모L","목적","운전자/운항자","메모"],...warehouses.filter(place=>warehouseKind(place)===type).flatMap(place=>(state.assetOps?.[place]?.logs||[]).map(log=>[place,log.id,log.date,log.startTime||"",log.endTime||"",log.before??"",log.after??"",log.diff??log.distance??"",log.mileageDiff??"",log.portDiff??"",log.starboardDiff??"",log.fuel??"",log.purpose||"",log.driver||log.operator||"",log.memo||""]))];
  const maintenance=()=>[["관리ID","관리번호","장비명","보관장소","기록ID","날짜","구분","내용","담당자","메모"],...state.equipment.flatMap(item=>(item.maintenance||[]).map(log=>[item.id,item.managementNo||item.managementNumber||"",item.name,item.place,log.id,log.date,log.type||log.kind||"",log.content||log.title||"",log.operator||log.manager||"",log.memo||""]))];
  return kind==="inventory"?inventories():kind==="records"?records():kind==="equipment"?equipment():kind==="equipmentHistory"?maintenance():operations(kind==="vehicle"?"차량":"함정");
}
function openCsvExport(){
  openEntryModal(`${entryHeader("CSV 내보내기","조회·보고용 · 전체 복원은 JSON 백업을 사용하세요")}<div class="form"><label>내보낼 자료<select id="csvKind"><option value="inventory">자원 재고</option><option value="records">입·출고 / 사건 기록</option><option value="equipment">장비 목록</option><option value="equipmentHistory">장비 관리이력</option><option value="vehicle">차량 운행</option><option value="vessel">방제정 운항</option></select></label><button class="btn primary" id="exportCsv" type="button">파일 저장</button></div>`);
  document.getElementById("exportCsv").addEventListener("click",()=>{const kind=document.getElementById("csvKind").value;const rows=csvRows(kind);downloadBlob(new Blob(["\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),`victor_${kind}_${todayISO()}.csv`);showFeedback("success",`CSV 파일 생성 · ${rows.length-1}행`);});
}
function openSafetyPoints(){
  const points=readSafetyPoints();
  openEntryModal(`${entryHeader("자동 안전지점","업데이트·복원·초기화 전 최근 3개")}<div class="list-card">${points.map(point=>`<div class="list-row"><div><div class="row-title">${esc(point.label)}</div><div class="row-sub">${fmtDateTime(point.createdAt)} · 이력 ${(point.state.records||[]).length}건</div><button class="btn secondary compact" data-safety-download="${point.id}" type="button">백업 저장</button><button class="btn danger compact" data-safety-restore="${point.id}" type="button">복구</button></div></div>`).join("")||`<div class="emptybox">아직 안전지점 없음</div>`}</div>`);
  document.querySelectorAll("[data-safety-download]").forEach(button=>button.addEventListener("click",()=>{const point=points.find(row=>row.id===button.dataset.safetyDownload);downloadBlob(new Blob([JSON.stringify(point.state,null,2)],{type:"application/json"}),`victor_safe_${point.createdAt.slice(0,10)}.json`);}));
  document.querySelectorAll("[data-safety-restore]").forEach(button=>button.addEventListener("click",async()=>{
    const point=points.find(row=>row.id===button.dataset.safetyRestore);
    if(!validRestoreData(point?.state)||Number(point.state.schemaVersion||1)>SCHEMA_VERSION){showFeedback("error","현재 앱에서 안전하게 복구할 수 없는 저장형식입니다");return;}
    if(!await askConfirm("안전지점 복구",`${point.label} 상태로 전체 자료를 되돌릴까요? 현재 자료도 안전지점으로 남깁니다.`,"복구",true))return;
    if(!createSafetyPoint("안전지점 복구 전",state)){showFeedback("error","현재 자료를 보관할 공간이 없습니다");return;}
    const before=JSON.stringify(state);const issue=storageLoadIssue;storageLoadIssue="";state=normalize(point.state);
    if(!saveStateTransaction(before,"복구 자료를 저장하지 못했습니다")){storageLoadIssue=issue;return;}
    closeEntryModal();showFeedback("success","안전지점 복구 완료");setPage("home",{skipGuard:true});
  }));
}

function appVersionInfoHtml(){return `<div class="app-version-info"><strong>${esc(VERSION)} · ${APP_BUILD}</strong><span>저장형식 ${SCHEMA_VERSION} · 마지막 백업 ${fmtDateTime(state.lastBackup)}</span></div>`;}
function swRequest(type){return new Promise((resolve,reject)=>{const controller=navigator.serviceWorker?.controller;if(!controller){resolve(null);return;}const channel=new MessageChannel();const timer=setTimeout(()=>reject(new Error("업데이트 응답 시간이 초과했습니다")),5000);channel.port1.onmessage=event=>{clearTimeout(timer);resolve(event.data);};controller.postMessage({type},[channel.port2]);});}
async function applyAppUpdate(){
  return protectNavigation(()=>runWorkflow("update",async()=>{
    if(!navigator.onLine){showFeedback("info","업데이트는 인터넷 연결 후 가능합니다 · 기존 앱은 계속 사용할 수 있습니다");return;}
    captureRegisterDraft();
    if(!createSafetyPoint("앱 업데이트 전",state)){showFeedback("error","자료 안전지점을 만들지 못해 업데이트를 보류했습니다");return;}
    const registration=currentUpdateRegistration||await navigator.serviceWorker?.getRegistration();
    if(!registration?.waiting){showFeedback("info","현재 최신 버전입니다");return;}
    if(!await askConfirm("앱 업데이트","현재 자료를 안전지점에 보관했습니다. 새 버전을 적용할까요?","적용"))return;
    navigator.serviceWorker.addEventListener("controllerchange",()=>location.reload(),{once:true});
    registration.waiting.postMessage({type:"SKIP_WAITING"});
  }));
}
async function checkAppUpdate(){
  if(!("serviceWorker"in navigator)){showFeedback("info","이 환경은 오프라인 앱 업데이트를 지원하지 않습니다");return;}
  if(!navigator.onLine){showFeedback("info","인터넷 연결 후 업데이트를 확인해주세요");return;}
  try{const registration=currentUpdateRegistration||await navigator.serviceWorker.getRegistration();if(!registration){showFeedback("info","앱을 HTTPS 주소에서 다시 열어주세요");return;}await registration.update();if(registration.waiting){currentUpdateRegistration=registration;await applyAppUpdate();}else showFeedback("success","현재 버전에서 업데이트를 확인했습니다");}catch(error){showFeedback("error","업데이트 확인 실패 · 기존 앱과 자료를 유지합니다");}
}
async function rollbackAppVersion(){
  return protectNavigation(()=>runWorkflow("rollback",async()=>{
  if(!createSafetyPoint("앱 이전 버전 복구 전",state)){showFeedback("error","안전지점을 만들지 못했습니다");return;}
  const info=await swRequest("CACHE_INFO");if(!info?.previous){showFeedback("info","보관된 이전 앱 버전이 없습니다");return;}
  if(!info.previousUsable){showFeedback("info","이전 앱은 현재 저장형식을 보호하지 못해 복구를 막았습니다 · 원본 자료는 유지됩니다");return;}
  if(!await askConfirm("이전 앱 버전","자료는 유지하고 보관된 이전 실행파일을 사용할까요?","이전 버전 사용"))return;
  const result=await swRequest("USE_PREVIOUS_CACHE");if(result?.ok)location.reload();else showFeedback("error","이전 버전을 적용하지 못했습니다");
  }));
}
function bindUpdateRegistration(registration){
  currentUpdateRegistration=registration;
  const announce=()=>{if(registration.waiting){const banner=document.getElementById("appUpdateBanner");if(banner){banner.hidden=false;banner.querySelector("button").onclick=applyAppUpdate;}}};
  announce();registration.addEventListener("updatefound",()=>{const worker=registration.installing;worker?.addEventListener("statechange",()=>{if(worker.state==="installed")announce();});});
}
