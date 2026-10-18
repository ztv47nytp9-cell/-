/* Shared workflow helpers. Existing LocalStorage keys and records remain compatible. */
const workflowLocks=new Set();
function recordStateLabel(record){return record.status==="pending"?(record.type==="사고"?"진행 중":"재고 미반영"):(record.type==="사고"?"종결":"반영 완료");}
function outstandingEquipmentRows(id=""){
  return (state.records||[]).filter(record=>record.status!=="pending"&&["출고","긴급","사고"].includes(record.flow)).flatMap(record=>(record.equipmentItems||[]).map((item,index)=>({record,item,index,remaining:Math.max(0,Number(item.qty||0)-Number(item.returnedQty||0))}))).filter(row=>row.remaining>0&&(!id||row.item.id===id));
}
function equipmentAvailability(item){const using=outstandingEquipmentRows(item?.id).reduce((sum,row)=>sum+row.remaining,0),total=Number(item?.qty||0);return {total,using,available:Math.max(0,total-using)};}
function equipmentAvailabilityText(item){const {total,using,available}=equipmentAvailability(item);return `보유 ${total} · 사용 중 ${using} · 사용 가능 ${available}대${item.archived?" · 보관 처리":""}`;}
function openOutstandingEquipment(id=""){
  const rows=outstandingEquipmentRows(id);
  openEntryModal(`${entryHeader("미반납 장비", "이 기기 기록 기준 · 기록을 눌러 반납 처리")}<div class="list-card">${rows.map(row=>`<button class="list-row" data-outstanding-record="${esc(row.record.id)}" type="button"><div><div class="row-title">${esc(row.item.name)} · ${row.remaining}대</div><div class="row-sub">${esc(row.record.title)} · ${fmtDate(row.record.date)} · ${esc(row.item.place||row.record.warehouse||"미지정")}</div></div><div class="chev">›</div></button>`).join("")||'<div class="emptybox">미반납 장비 없음</div>'}</div>`);
  document.querySelectorAll("[data-outstanding-record]").forEach(button=>button.addEventListener("click",()=>{closeEntryModal();openDetail(button.dataset.outstandingRecord);}));
}
function activeMaterials(selected=""){return catalog.filter(item=>!item.archived||item.name===selected);}
function activeEquipment(selected=""){return (state.equipment||[]).filter(item=>!item.archived||item.id===selected);}
function archiveButtonHtml(kind,item){return `<button class="btn secondary" id="archiveResource" type="button">${item.archived?"다시 사용":"사용 종료 · 보관 처리"}</button><div class="row-sub">${item.archived?"선택 목록에서 숨김 · 재고·이력 유지":"보관 처리 후에도 재고·이력 유지"}</div>`;}
function bindArchiveResource(kind,id,after){
  document.getElementById("archiveResource")?.addEventListener("click",()=>runWorkflow("archive-resource",async()=>{
    const item=kind==="material"?itemOf(id):state.equipment.find(row=>row.id===id);if(!item)return;
    const next=!item.archived;
    const qty=kind==="material"?warehouses.reduce((sum,place)=>sum+Number(state.stock[place]?.[item.name]||0),0):Number(item.qty||0);
    const quantity=kind==="material"?materialQtyText(qty,item.unit,item):`${qty}대`;
    if(!await askConfirm(next?"사용 종료 · 보관 처리":"다시 사용",next?`${item.name} · 현재 ${quantity} 보유\n보관 처리 후에도 전체 재고 합계에 계속 포함됩니다. 신규 선택에서만 숨기며 기존 이력은 유지합니다.`:`${item.name}을 선택 목록에 다시 표시할까요?`,next?"보관 처리":"다시 사용"))return;
    const before=JSON.stringify(state);item.archived=next;item.updatedAt=new Date().toISOString();
    if(!saveStateTransaction(before,"보관 상태 저장 실패 · 기존 상태 유지"))return;
    after();showFeedback("success",next?"보관 처리됨 · 재고·이력 유지":"선택 목록에 다시 표시됩니다");
  }));
}
function openArchivedResources(){
  const materials=catalog.filter(item=>item.archived),gear=state.equipment.filter(item=>item.archived);
  openEntryModal(`${entryHeader("보관 처리한 품목","상세에서 다시 사용할 수 있습니다")}<div class="list-card">${materials.map(item=>`<button class="list-row" data-archived-material="${esc(item.name)}" type="button">자재 · ${esc(item.name)}</button>`).join("")}${gear.map(item=>`<button class="list-row" data-archived-equipment="${esc(item.id)}" type="button">장비 · ${esc(item.name)} · ${esc(item.place)}</button>`).join("")}${!materials.length&&!gear.length?'<div class="emptybox">보관 처리한 품목 없음</div>':""}</div>`);
  document.querySelectorAll("[data-archived-material]").forEach(button=>button.addEventListener("click",()=>openAllMaterialDetail(button.dataset.archivedMaterial)));
  document.querySelectorAll("[data-archived-equipment]").forEach(button=>button.addEventListener("click",()=>{closeEntryModal();openEquipment(button.dataset.archivedEquipment);}));
}
function attachResourceTools(equipment=false){
  const toolbar=document.getElementById("manageCategories")?.parentElement;if(!toolbar||document.getElementById("resourceManagement"))return;
  const management=document.createElement("details");management.id="resourceManagement";management.className="resource-management";management.open=resourceSelectionMode;
  const summary=document.createElement("summary");summary.textContent="관리";management.append(summary);
  const actions=document.createElement("div");actions.className="btn-row";management.append(actions);
  ["toggleResourceSelection","manageCategories"].forEach(id=>{const button=document.getElementById(id);if(button)actions.append(button);});
  if(equipment){const button=document.createElement("button");button.className="btn secondary compact";button.id="outstandingEquipment";button.textContent="미반납";button.onclick=()=>openOutstandingEquipment();toolbar.append(button);}
  const button=document.createElement("button");button.className="btn gray compact";button.id="archivedResources";button.textContent="보관 품목";button.onclick=openArchivedResources;actions.append(button);toolbar.append(management);
}
function attachEquipmentAvailabilityRows(){
  document.querySelectorAll("[data-all-equipment],[data-equip]").forEach(button=>{
    if(button.querySelector(".equipment-available"))return;
    const item=state.equipment.find(row=>row.id===(button.dataset.allEquipment||button.dataset.equip));if(!item)return;
    const line=document.createElement("div");line.className="row-sub equipment-available";line.textContent=equipmentAvailabilityText(item);button.querySelector(".row-title")?.parentElement.append(line);
  });
}
function recordDuplicateSignature(record){
  const flow=record.status==="pending"?(record.pendingFlow||"출고"):record.flow;
  const title=record.status==="pending"&&record.officialTitle===false?"":String(record.title||"").trim();
  const items=(record.items||[]).map(item=>[item.name,itemWarehouse(item,record.warehouse),Number(item.qty||0)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const gear=(record.equipmentItems||[]).map(item=>[item.id,Number(item.qty||0)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify([record.date,title,record.type,flow,record.targetWarehouse||"",items,gear,items.length||gear.length?"":record.memo||""]);
}
function mergeBundleRows(rows,key){const map=new Map();rows.forEach(row=>{const current=map.get(row[key]);if(current)current.qty+=Number(row.qty);else map.set(row[key],{...row,qty:Number(row.qty)});});return [...map.values()];}
function resourceBundles(){
  return (Array.isArray(state.resourceBundles)?state.resourceBundles:[]).filter(row=>row&&typeof row.id==="string"&&typeof row.name==="string").map(row=>({...row,items:mergeBundleRows((Array.isArray(row.items)?row.items:[]).filter(item=>item&&typeof item.name==="string"&&Number.isFinite(Number(item.qty))&&Number(item.qty)>0),"name"),equipmentItems:mergeBundleRows((Array.isArray(row.equipmentItems)?row.equipmentItems:[]).filter(item=>item&&typeof item.id==="string"&&Number.isInteger(Number(item.qty))&&Number(item.qty)>0),"id")}));
}
function attachBundleButton(){
  const summary=document.getElementById("registerDraftSummary");if(!summary||document.getElementById("resourceBundles"))return;
  const button=document.createElement("button");button.id="resourceBundles";button.className="btn secondary";button.type="button";button.textContent="자주 쓰는 품목 묶음";button.onclick=openResourceBundles;summary.before(button);
}
function bundlePreviewRows(bundle){
  const materials=bundle.items.map(row=>{const item=itemOf(row.name);return `<li>${esc(row.name)} · ${esc(item?materialQtyText(row.qty,item.unit,item):Number(row.qty))}${!item?" · 목록에 없음":item.archived?" · 보관 처리":""}</li>`;});
  const equipment=bundle.equipmentItems.map(row=>{const item=state.equipment.find(gear=>gear.id===row.id);return `<li>${esc(item?.name||row.name||"장비")} · ${row.qty}대 · ${esc(item?.place||"목록에 없음")}${item?.archived?" · 보관 처리":""}</li>`;});
  return materials.concat(equipment).join("");
}
function openResourceBundles(){
  captureRegisterDraft();
  openEntryModal(`${entryHeader("품목 묶음","이 기기의 빠른 입력용 · 재고는 저장 후 반영")}<div class="list-card">${resourceBundles().map(bundle=>`<div class="bundle-card"><div class="row-title">${esc(bundle.name)}</div><details class="bundle-preview"><summary>자재 ${bundle.items.length} · 장비 ${bundle.equipmentItems.length} · 구성 보기</summary><ul>${bundlePreviewRows(bundle)}</ul></details><div class="btn-row"><button class="btn secondary compact" data-use-bundle="${esc(bundle.id)}" type="button">추가</button><button class="btn secondary compact" data-edit-bundle="${esc(bundle.id)}" type="button">수정</button><button class="btn gray compact" data-delete-bundle="${esc(bundle.id)}" type="button">삭제</button></div></div>`).join("")||'<div class="emptybox">저장한 묶음 없음</div>'}</div><details class="field-card"><summary>현재 품목으로 묶음 저장</summary><div class="form"><label>묶음 이름<input id="bundleName" maxlength="40" placeholder="예: 항내 방제 기본품목"></label><button class="btn secondary" id="saveBundle" type="button">묶음 저장</button></div></details>`);
  document.getElementById("saveBundle").onclick=()=>runWorkflow("bundle-save",async()=>{
    const name=document.getElementById("bundleName").value.trim();
    if(!name){showFeedback("info","묶음 이름을 입력해주세요");return;}
    const items=draftItems.filter(item=>Number(item.qty)>0).map(item=>({name:item.name,qty:Number(item.qty)}));
    const equipmentItems=draftEquipmentItems.filter(item=>Number(item.qty)>0).map(item=>({id:item.id,name:item.name,qty:Number(item.qty)}));
    if(!items.length&&!equipmentItems.length){showFeedback("info","등록 화면에서 품목과 수량을 먼저 입력해주세요");return;}
    if(items.some(item=>!itemOf(item.name)||finiteQuantity(item.qty,itemOf(item.name).unit)===null)||equipmentItems.some(item=>finiteQuantity(item.qty,"대")===null)){showFeedback("error","품목 수량을 확인해주세요");return;}
    const existing=resourceBundles().find(bundle=>bundle.name===name);
    if(existing&&!await askConfirm("묶음 교체",`${name} 묶음을 현재 품목으로 바꿀까요?`,"교체"))return;
    const before=JSON.stringify(state),bundle={id:existing?.id||uid(),name,items,equipmentItems};
    state.resourceBundles=resourceBundles().filter(row=>row.id!==bundle.id).concat(bundle);
    if(!saveStateTransaction(before,"묶음 저장 실패 · 입력 유지"))return;
    openResourceBundles();showFeedback("success","묶음 저장 · 업무 재고는 그대로");
  });
  document.querySelectorAll("[data-use-bundle]").forEach(button=>button.onclick=()=>applyResourceBundle(button.dataset.useBundle));
  document.querySelectorAll("[data-edit-bundle]").forEach(button=>button.onclick=()=>openBundleEditor(button.dataset.editBundle));
  document.querySelectorAll("[data-delete-bundle]").forEach(button=>button.onclick=()=>runWorkflow("bundle-delete",async()=>{
    if(!await askConfirm("묶음 삭제","빠른 입력용 묶음만 삭제합니다. 업무 기록과 재고는 유지됩니다.","삭제"))return;
    const before=JSON.stringify(state);state.resourceBundles=resourceBundles().filter(row=>row.id!==button.dataset.deleteBundle);
    if(saveStateTransaction(before)){openResourceBundles();showFeedback("success","묶음 삭제");}
  }));
}
function applyResourceBundle(id,mode="ask"){
  const bundle=resourceBundles().find(row=>row.id===id);if(!bundle)return;
  if(!bundle.items.length&&!bundle.equipmentItems.length){showFeedback("info","묶음에 품목이 없습니다 · 다시 저장해주세요");return;}
  if(bundle.items.some(row=>itemOf(row.name)&&finiteQuantity(row.qty,itemOf(row.name).unit)===null)||bundle.equipmentItems.some(row=>finiteQuantity(row.qty,"대")===null)){showFeedback("error","묶음 수량을 확인해주세요");return;}
  const missing=[...(bundle.items||[]).filter(row=>!itemOf(row.name)||itemOf(row.name).archived).map(row=>row.name),...(bundle.equipmentItems||[]).filter(row=>!state.equipment.some(item=>item.id===row.id&&!item.archived)).map(row=>row.name)];
  if(missing.length){showFeedback("error",`사용할 수 없는 묶음 품목: ${missing.join(", ")} · 묶음을 다시 저장해주세요`);return;}
  const warehouse=document.getElementById("recWarehouse").value;
  if(registerMode==="normal"&&registerFlow==="이송"&&(bundle.equipmentItems||[]).some(row=>state.equipment.find(item=>item.id===row.id)?.place!==warehouse)){showFeedback("info","묶음 장비의 보관장소를 출발 보관과 맞춰주세요");return;}
  const repeated=bundle.items.some(row=>draftItems.some(entry=>entry.name===row.name&&itemWarehouse(entry,warehouse)===warehouse))||bundle.equipmentItems.some(row=>draftEquipmentItems.some(entry=>entry.id===row.id));
  if(repeated&&mode==="ask"){
    openEntryModal(`${entryHeader("이미 추가한 품목 있음","같은 장소의 자재·같은 장비만 비교합니다")}<div class="confirm-message">현재 수량 유지는 기존 줄의 수량을 바꾸지 않고 새 품목만 추가합니다. 추가 합산은 기존 수량에 묶음 수량을 더합니다.</div><div class="form"><button class="btn primary" id="bundleKeepQuantity" type="button">현재 수량 유지</button><button class="btn secondary" id="bundleAddQuantity" type="button">추가 합산</button><button class="btn gray" id="bundleCancelApply" type="button">취소</button></div>`);
    const revision=entryModalRevision;
    const accept=choice=>{if(revision===entryModalRevision)runWorkflow("bundle-apply",()=>applyResourceBundle(id,choice));};
    document.getElementById("bundleKeepQuantity").onclick=()=>accept("keep");document.getElementById("bundleAddQuantity").onclick=()=>accept("add");document.getElementById("bundleCancelApply").onclick=openResourceBundles;return;
  }
  bundle.items.forEach(row=>{const item=itemOf(row.name),existing=draftItems.find(entry=>entry.name===row.name&&itemWarehouse(entry,warehouse)===warehouse);if(existing){if(mode==="add")existing.qty=Number(existing.qty||0)+row.qty;}else draftItems.push({name:item.name,cat:item.cat,unit:item.unit,kind:item.kind,qty:row.qty,warehouse});});
  bundle.equipmentItems.forEach(row=>{const item=state.equipment.find(entry=>entry.id===row.id),existing=draftEquipmentItems.find(entry=>entry.id===row.id);if(existing){if(mode==="add")existing.qty=Number(existing.qty||0)+row.qty;}else draftEquipmentItems.push({id:item.id,name:item.name,cat:item.cat,qty:row.qty,place:item.place,spec:item.spec||""});});
  closeEntryModal();renderItems();renderEquipmentItems();scheduleRegisterDraft();updateRegisterDraftSummary();updateStockAfterPreview();showFeedback("success","묶음 추가 · 장소와 수량을 확인해주세요");
}
function openBundleEditor(id){
  const original=resourceBundles().find(row=>row.id===id);if(!original)return;
  const draft=JSON.parse(JSON.stringify(original)),baseline=JSON.stringify(original);
  const render=()=>{
    openEntryModal(`${entryHeader("묶음 수정","재고·등록 중 내용은 바뀌지 않습니다")}<div class="form"><button class="btn gray compact" id="bundleEditorBack" type="button">‹ 묶음 목록</button><label>묶음 이름<input id="editBundleName" maxlength="40" value="${esc(draft.name)}"></label><div class="section-title">자재</div>${draft.items.map((row,index)=>`<div class="item-box"><label>자재<select data-bundle-material="${index}"><option value="">선택해주세요</option>${row.name&&!itemOf(row.name)?`<option value="${esc(row.name)}" selected>${esc(row.name)} · 목록에 없음</option>`:""}${activeMaterials(row.name).map(item=>`<option value="${esc(item.name)}" ${row.name===item.name?"selected":""}>${esc(item.name)}${item.archived?" · 보관 처리":""}</option>`).join("")}</select></label><label>수량 (${esc(itemOf(row.name)?.unit||"단위 미지정")})<input data-bundle-material-qty="${index}" type="number" inputmode="decimal" min="0" step="any" value="${esc(row.qty)}"></label><button class="btn gray compact" data-remove-bundle-material="${index}" type="button">제외</button></div>`).join("")}<button class="btn secondary" id="addBundleMaterial" type="button">+ 자재</button><div class="section-title">장비</div>${draft.equipmentItems.map((row,index)=>`<div class="item-box"><label>장비<select data-bundle-equipment="${index}"><option value="">선택해주세요</option>${row.id&&!state.equipment.some(item=>item.id===row.id)?`<option value="${esc(row.id)}" selected>${esc(row.name||"장비")} · 목록에 없음</option>`:""}${activeEquipment(row.id).map(item=>`<option value="${esc(item.id)}" ${row.id===item.id?"selected":""}>${esc(item.name)} · ${esc(item.place)}${item.archived?" · 보관 처리":""}</option>`).join("")}</select></label><label>수량 (대)<input data-bundle-equipment-qty="${index}" type="number" inputmode="numeric" min="1" step="1" value="${esc(row.qty)}"></label><button class="btn gray compact" data-remove-bundle-equipment="${index}" type="button">제외</button></div>`).join("")}<button class="btn secondary" id="addBundleEquipment" type="button">+ 장비</button><button class="btn primary" id="saveBundleEdit" type="button">수정 저장</button></div>`);
    document.getElementById("saveBundleEdit").classList.add("sticky-action");
    document.getElementById("saveBundleEdit").closest(".form").classList.add("bundle-editor");
    const collect=()=>{draft.name=document.getElementById("editBundleName").value;draft.items=draft.items.map((row,i)=>({...row,name:document.querySelector(`[data-bundle-material="${i}"]`).value,qty:document.querySelector(`[data-bundle-material-qty="${i}"]`).value}));draft.equipmentItems=draft.equipmentItems.map((row,i)=>({...row,id:document.querySelector(`[data-bundle-equipment="${i}"]`).value,qty:document.querySelector(`[data-bundle-equipment-qty="${i}"]`).value}));};
    const signature=()=>{collect();return JSON.stringify({...draft,items:draft.items.map(row=>({...row,qty:Number(row.qty)})),equipmentItems:draft.equipmentItems.map(row=>({...row,qty:Number(row.qty)}))});};
    entryExtraDirtyCheck=()=>Boolean(document.getElementById("editBundleName"))&&signature()!==baseline;
    document.getElementById("bundleEditorBack").onclick=async()=>{if(entryExtraDirtyCheck?.()&&!await askConfirm("수정 중인 묶음","저장하지 않고 목록으로 돌아갈까요?","돌아가기"))return;openResourceBundles();};
    document.getElementById("addBundleMaterial").onclick=()=>{collect();draft.items.push({name:"",qty:""});render();};
    document.getElementById("addBundleEquipment").onclick=()=>{collect();draft.equipmentItems.push({id:"",name:"",qty:""});render();};
    document.querySelectorAll("[data-remove-bundle-material]").forEach(button=>button.onclick=()=>{collect();draft.items.splice(Number(button.dataset.removeBundleMaterial),1);render();});
    document.querySelectorAll("[data-remove-bundle-equipment]").forEach(button=>button.onclick=()=>{collect();draft.equipmentItems.splice(Number(button.dataset.removeBundleEquipment),1);render();});
    document.querySelectorAll("[data-bundle-material]").forEach(select=>select.onchange=()=>{collect();render();});
    document.getElementById("saveBundleEdit").onclick=()=>runWorkflow("bundle-edit",async()=>{
      collect();const name=draft.name.trim();if(!name){showFeedback("error","묶음 이름을 입력해주세요");return;}
      if(resourceBundles().some(row=>row.id!==id&&row.name===name)){showFeedback("error","같은 이름의 묶음이 있습니다");return;}
      if(!draft.items.length&&!draft.equipmentItems.length){showFeedback("error","품목을 한 개 이상 추가해주세요");return;}
      if(draft.items.some(row=>!itemOf(row.name)||finiteQuantity(row.qty,itemOf(row.name).unit)===null||Number(row.qty)<=0)||draft.equipmentItems.some(row=>!state.equipment.some(item=>item.id===row.id)||finiteQuantity(row.qty,"대")===null||Number(row.qty)<=0)){showFeedback("error","품목과 수량을 확인해주세요 · 빈칸·음수·소수 개수는 저장할 수 없습니다");return;}
      const next={...draft,name,items:mergeBundleRows(draft.items,"name"),equipmentItems:mergeBundleRows(draft.equipmentItems,"id").map(row=>({...row,name:state.equipment.find(item=>item.id===row.id).name}))};
      if(!resourceBundles().some(row=>row.id===id)){showFeedback("error","원래 묶음이 없어 저장할 수 없습니다");return;}
      const before=JSON.stringify(state);state.resourceBundles=resourceBundles().map(row=>row.id===id?next:row);
      if(!saveStateTransaction(before,"묶음 수정 저장 실패 · 입력 유지"))return;
      openResourceBundles();showFeedback("success","묶음 수정 저장 · 재고는 그대로");
    });
  };render();
}
function recordReportText(record){
  const flow=record.status==="pending"?(record.pendingFlow||"출고"):record.flow;
  const direction=flow==="출고"?"출고 · 재고 차감":flow==="입고"?"입고 · 재고 증가":flow==="이송"?"이송 · 보관장소 이동":flow==="재고수정"?"재고수정":flow||"기록";
  const lines=["Victor 사건·업무 요약",record.title,`${fmtDate(record.date)} ${record.time||""} · ${record.type} · ${recordStateLabel(record)}`,`처리: ${record.status==="pending"?"예정 ":""}${direction}`,record.status==="pending"?"재고 미반영 · 계속 수정 가능":"재고 반영된 기록",record.location?.detail?`사고 위치: ${record.location.detail}`:"","", "자재"];
  (record.items||[]).forEach(item=>{
    const balance=Number.isFinite(item.before)&&Number.isFinite(item.after)?`${materialQtyText(item.before,item.unit,item)} → ${materialQtyText(item.after,item.unit,item)}`:"미기록";
    const quantity=flow==="재고수정"?`재고 ${balance}`:`${record.status==="pending"?"예정 ":""}${flow==="입고"?"+":flow==="출고"?"-":""}${materialQtyText(item.qty,item.unit,item)}${record.status!=="pending"&&balance!=="미기록"?` · 재고 ${balance}`:""}`;
    lines.push(`- ${item.name} · ${itemWarehouse(item,record.warehouse)}${flow==="이송"?" → "+(item.targetWarehouse||record.targetWarehouse||"미지정"):""} · ${quantity}`);
    if(item.locationCorrection)lines.push(`  장소 정정 시 재고: ${materialQtyText(item.locationCorrection.before,item.unit,item)} → ${materialQtyText(item.locationCorrection.after,item.unit,item)}`);
  });
  if(!(record.items||[]).length)lines.push("없음");lines.push("","장비");
  (record.equipmentItems||[]).forEach(item=>{const usage=record.status!=="pending"&&["출고","사고","긴급"].includes(record.flow),returned=Math.min(Number(item.qty||0),Number(item.returnedQty||0));lines.push(`- ${item.name} · ${item.fromPlace||item.place||record.warehouse||"미지정"}${record.flow==="이송"?" → "+(item.toPlace||record.targetWarehouse||"미지정"):""} · ${Number(item.qty||0)}대${usage?` · 반납 ${returned} · 미반납 ${Math.max(0,Number(item.qty||0)-returned)}대`:""}`);});
  if(!(record.equipmentItems||[]).length)lines.push("없음");lines.push("","메모",record.memo||"없음");return lines.filter(line=>line!==null).join("\n");
}
function openRecordReport(id){
  const record=state.records.find(row=>row.id===id);if(!record)return;
  const text=recordReportText(record);
  openEntryModal(`${entryHeader("보고용 요약","이 기록의 자재·장비·메모")}<div class="form"><label>요약<textarea id="recordReportText" rows="14" readonly>${esc(text)}</textarea></label><div class="btn-row"><button class="btn secondary" id="copyRecordReport" type="button">복사</button><button class="btn secondary" id="printRecordReport" type="button">인쇄</button></div></div>`);
  document.getElementById("copyRecordReport").onclick=async()=>{try{await navigator.clipboard.writeText(text);showFeedback("success","요약 복사 완료");}catch(_){const input=document.getElementById("recordReportText");input.focus();input.select();showFeedback("info","요약을 선택했습니다 · 길게 눌러 복사해주세요");}};
  document.getElementById("printRecordReport").onclick=()=>{document.getElementById("victorPrintReport")?.remove();const root=document.createElement("pre");root.id="victorPrintReport";root.textContent=text;document.body.append(root);const cleanup=()=>root.remove();window.addEventListener("afterprint",cleanup,{once:true});try{window.print();}catch(_){cleanup();showFeedback("info","이 기기에서는 인쇄를 지원하지 않습니다 · 복사를 이용해주세요");}};
}
function attachRecordExtras(id){
  if(page!=="history"||view.dataset.recordId!==id||!document.getElementById("deleteRecord")||document.getElementById("recordReport"))return;
  const button=document.createElement("button");button.id="recordReport";button.className="btn secondary";button.type="button";button.textContent="보고용 요약";button.onclick=()=>{if(pendingFormDirty()){showFeedback("info","변경 내용을 저장한 뒤 요약을 열어주세요");return;}openRecordReport(id);};
  document.getElementById("backHist")?.after(button);
}
const pendingRowDrafts=new Map();
function pendingDisplayRecord(record){
  const draft=pendingRowDrafts.get(record.id);
  if(draft&&draft.base===JSON.stringify([record.items,record.equipmentItems]))return {...record,items:draft.items,equipmentItems:draft.equipmentItems};
  pendingRowDrafts.delete(record.id);return record;
}
function pendingBalanceText(entry){
  if(entry.locationCorrection){const change=entry.locationCorrection;return `장소 정정 시 ${materialQtyText(change.before,entry.unit,entry)} → ${materialQtyText(change.after,entry.unit,entry)}`;}
  return entry.before!==undefined?`${materialQtyText(entry.before,entry.unit,entry)} → ${materialQtyText(entry.after,entry.unit,entry)}`:"";
}
// Compare business data, ignoring presentation preferences and save metadata.
function businessFingerprint(source){
  try{
    const data=normalize(JSON.parse(JSON.stringify(source)));
    ["ui","savedAt","appBuild","schemaVersion"].forEach(key=>delete data[key]);
    const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==="object"?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
    return JSON.stringify(ordered(data));
  }finally{refreshGlobals(state);}
}
function finishGuardedSafetyPoint(key){
  try{const point=JSON.parse(localStorage.getItem(key)||"null");if(!point?.state)return;point.expected=businessFingerprint(state);localStorage.setItem(key,JSON.stringify(point));}
  catch(_){showFeedback("info","안전 확인을 저장하지 못했습니다 · 되돌리기는 보류됩니다");}
}
function guardedPointStatus(point){
  if(!point?.state)return {allowed:false,label:"없음",reason:"되돌릴 내역이 없습니다"};
  if(!point.expected)return {allowed:false,label:"안전 확인 필요",reason:"이전 버전의 되돌리기 자료입니다 · 안전 복구에서 확인해주세요"};
  try{
    if(point.expected!==businessFingerprint(state))return {allowed:false,label:"이후 작업 있음 · 되돌리기 제한",reason:"이후 저장한 자료가 있어 되돌리기를 막았습니다 · 현재 자료 유지"};
    return {allowed:true,label:"되돌리기 가능",reason:"적용 전 상태로 되돌릴 수 있습니다"};
  }catch(_){return {allowed:false,label:"안전 확인 필요",reason:"자료를 확인할 수 없어 되돌리기를 보류했습니다"};}
}
function canRestoreGuardedPoint(point){const status=guardedPointStatus(point);if(!status.allowed)showFeedback("info",status.reason);return status.allowed;}
function updateUndoAvailability(){
  let point=null;try{point=JSON.parse(localStorage.getItem("victor_bulk_safety_0_19_0l")||"null");}catch(_){}
  const status=guardedPointStatus(point);
  ["bulkUndoBtn","pageBulkUndoBtn"].forEach(id=>{const button=document.getElementById(id);if(button){button.disabled=!status.allowed;button.title=status.reason;button.innerHTML=`대량변경 되돌리기 <span class="undo-availability">${esc(status.label)}</span>`;}});
}
function backupReminderStatus(now=Date.now()){
  const since=dateMs(state.lastBackup)||0,snoozed=Number(state.ui?.backupReminderSnoozedUntil||0);
  const entries=[...(state.records||[]),...(state.memos||[])];
  const count=entries.filter(row=>{const updated=Math.max(...[row.createdAt,row.updatedAt,row.editedAt,row.appliedAt].map(value=>dateMs(value)||0));return !since||updated>since;}).length;
  return {count,visible:count>=20&&snoozed<=now};
}
function backupReminderHtml(){const status=backupReminderStatus();return status.visible?`<div class="backup-reminder" id="backupReminder"><div><strong>기기 자료 ${status.count}건 · 백업 권장</strong><div class="row-sub">사건·메모는 자원 공유에 포함되지 않습니다.</div></div><div class="btn-row"><button class="btn secondary compact" id="backupReminderNow" type="button">전체 백업</button><button class="btn gray compact" id="backupReminderLater" type="button">나중에</button></div></div>`:"";}
function bindBackupReminder(){
  document.getElementById("backupReminderNow")?.addEventListener("click",()=>runWorkflow("backup-reminder",backup));
  document.getElementById("backupReminderLater")?.addEventListener("click",()=>{const before=JSON.stringify(state);state.ui=state.ui||{};state.ui.backupReminderSnoozedUntil=Date.now()+7*24*60*60*1000;if(saveStateTransaction(before,"백업 안내 설정 저장 실패"))document.getElementById("backupReminder")?.remove();});
}
const memoDraftMemory=new Map();
function memoDraftKey(id){return "victor_memo_draft_v1:"+(id||"new");}
function memoDraftFor(id){try{return JSON.parse(sessionStorage.getItem(memoDraftKey(id))||"null")||memoDraftMemory.get(id||"new")||null;}catch(_){return memoDraftMemory.get(id||"new")||null;}}
function captureMemoDraft(){
  if(page!=="memo"||!document.getElementById("memoBody"))return;
  const draft={date:document.getElementById("memoDate").value,title:document.getElementById("memoTitle").value,body:document.getElementById("memoBody").value};
  memoDraftMemory.set(editingMemoId||"new",draft);
  try{sessionStorage.setItem(memoDraftKey(editingMemoId),JSON.stringify(draft));}catch(_){showFeedback("info","메모 초안을 기기에 보관하지 못했습니다 · 나가기 전에 저장해주세요");}
}
function clearMemoDraft(id){memoDraftMemory.delete(id||"new");try{sessionStorage.removeItem(memoDraftKey(id));}catch(_){};}
function splitResourceKey(key){const index=key.indexOf(":");return [key.slice(0,index),key.slice(index+1)];}
function equipmentUseConflict(entries,excludeId=""){
  const outstanding=new Map();
  (state.records||[]).filter(record=>record.id!==excludeId&&record.status!=="pending"&&["출고","긴급","사고"].includes(record.flow)).forEach(record=>(record.equipmentItems||[]).forEach(item=>outstanding.set(item.id,(outstanding.get(item.id)||0)+Math.max(0,Number(item.qty||0)-Number(item.returnedQty||0)))));
  const totals=new Map();entries.forEach(item=>totals.set(item.id,(totals.get(item.id)||0)+Number(item.qty||0)));
  for(const [id,qty] of totals){const gear=state.equipment.find(item=>item.id===id),using=outstanding.get(id)||0;if(gear&&qty>Math.max(0,Number(gear.qty||0)-using))return `${gear.name} · 미반납 ${using}대, 추가 사용 가능 ${Math.max(0,Number(gear.qty||0)-using)}대 · 기존 기록의 반납을 먼저 처리해주세요`;}
  return "";
}
function clearAllHistoryFilters(){historyPlaceFilter="all";historyTypeFilter="all";historySearchQuery="";historyDateFilter="all";historyFlowFilter="all";historyCustomFrom="";historyCustomTo="";renderHistory();}
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
    state.resourceBundles=resourceBundles().map(bundle=>({...bundle,items:bundle.items.map(entry=>entry.name===name?{...entry,name:nextName}:entry)}));
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
  const reset=document.getElementById("clearHistoryFilter");if(reset)reset.onclick=clearAllHistoryFilters;
  if(historyDateFilter==="custom"&&historyCustomFrom&&historyCustomTo&&historyCustomFrom>historyCustomTo)count.textContent="시작일과 종료일을 확인해주세요";
}
let pendingFormBaseline="",pendingFormRecordId="";
let currentUpdateRegistration=null;
let entryFormBaseline="";
let entryExtraDirtyCheck=null;
function entryFormFingerprint(){return JSON.stringify([...document.querySelectorAll('#entryDialog input:not([type=search]),#entryDialog select,#entryDialog textarea')].map(input=>[input.id,input.value,input.checked]));}
async function requestEntryClose(){
  if(modalConfirmResolver){closeEntryModal();return;}
  if(entryExtraDirtyCheck?.()||(entryFormBaseline&&entryFormFingerprint()!==entryFormBaseline)){if(!await askConfirm("작성 중 내용 있음","저장하지 않은 입력을 닫을까요?","닫기"))return;}
  closeEntryModal();
}
function attachRecordTimeTools(){
  const input=document.getElementById("recTime"),date=document.getElementById("recDate");if(!input||!date)return;
  const button=document.createElement("button");button.type="button";button.className="btn secondary compact";button.textContent="현재 시각";
  button.addEventListener("click",()=>{date.value=todayISO();input.value=localTimeNow();scheduleRegisterDraft();});input.closest("details")?.append(button);
}
function validRestoreData(raw){return Boolean(raw&&typeof raw==="object"&&!Array.isArray(raw)&&Array.isArray(raw.warehouses)&&Array.isArray(raw.catalog)&&raw.stock&&typeof raw.stock==="object"&&Array.isArray(raw.records));}
function validateSharedSnapshot(snapshot){
  const fail=detail=>{throw new Error(`공유자료 형식 오류 · ${detail}`);};
  if(!snapshot||snapshot.kind!=="victor-resource-share")fail("Victor 자료가 아닙니다");
  if(snapshot.formatVersion!==undefined&&(!Number.isInteger(snapshot.formatVersion)||snapshot.formatVersion<1||snapshot.formatVersion>1))fail("지원하지 않는 형식입니다 · 앱 업데이트를 확인해주세요");
  const unsafe=new Set(["__proto__","constructor","prototype"]),seen=new WeakSet();
  const walk=(value,depth=0)=>{if(!value||typeof value!=="object")return;if(depth>64||seen.has(value))fail("자료 구조를 확인해주세요");seen.add(value);Object.keys(value).forEach(key=>{if(unsafe.has(key))fail("사용할 수 없는 항목명입니다");walk(value[key],depth+1);});seen.delete(value);};walk(snapshot);
  const object=value=>value&&typeof value==="object"&&!Array.isArray(value);
  const name=value=>typeof value==="string"&&value.trim()===value&&value.length>0&&!unsafe.has(value);
  const quantity=(value,unit="")=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=Number.MAX_SAFE_INTEGER&&(!integerUnit(unit)||Number.isSafeInteger(value));
  if(!snapshot.resourceState){
    if(!Array.isArray(snapshot.materials)||!Array.isArray(snapshot.equipment))fail("자재·장비 목록이 없습니다");
    const rows=new Set();snapshot.materials.forEach(item=>{if(!object(item)||!name(item.name)||!name(item.warehouse)||!quantity(item.qty,item.unit||"개"))fail("자재 수량 또는 보관장소를 확인해주세요");const key=JSON.stringify([item.warehouse,item.name]);if(rows.has(key))fail("중복 자재가 있습니다");rows.add(key);});
    snapshot.equipment.forEach(item=>{if(!object(item)||!name(item.name)||!name(item.warehouse)||!quantity(item.qty,"대"))fail("장비 수량 또는 보관장소를 확인해주세요");});
  }
  const resource=resourceStateFromSnapshot(snapshot);
  if(!object(resource)||!Array.isArray(resource.warehouses)||!resource.warehouses.length||!resource.warehouses.every(name)||new Set(resource.warehouses).size!==resource.warehouses.length)fail("보관장소 목록을 확인해주세요");
  if(!Array.isArray(resource.catalog)||!Array.isArray(resource.equipment)||!object(resource.stock))fail("자재·장비·재고 구조를 확인해주세요");
  if(!resource.catalog.length&&!resource.equipment.length)fail("자재·장비 항목이 없습니다");
  const places=new Set(resource.warehouses),names=new Set(),ids=new Set();
  resource.catalog.forEach(item=>{if(!object(item)||!name(item.name)||names.has(item.name))fail("자재명이 없거나 중복됩니다");names.add(item.name);});
  resource.warehouses.forEach(place=>{const bucket=resource.stock[place];if(!object(bucket))fail("창고 재고가 누락되었습니다");resource.catalog.forEach(item=>{if(!Object.prototype.hasOwnProperty.call(bucket,item.name)||!quantity(bucket[item.name],item.unit||"개"))fail(`${place} · ${item.name} 수량을 확인해주세요`);});});
  Object.keys(resource.stock).forEach(place=>{if(!places.has(place)||Object.keys(resource.stock[place]||{}).some(key=>!names.has(key)))fail("목록과 재고 항목이 다릅니다");});
  resource.equipment.forEach(item=>{if(!object(item)||!name(item.id)||ids.has(item.id)||!name(item.name)||!places.has(item.place)||(item.qty!==undefined&&!quantity(item.qty,"대")))fail("장비 식별값·수량·보관장소를 확인해주세요");ids.add(item.id);});
  if(resource.assetOps!==undefined){if(!object(resource.assetOps))fail("차량·함정 관리자료를 확인해주세요");Object.values(resource.assetOps).forEach(op=>{if(!object(op))fail("차량·함정 관리자료를 확인해주세요");["distanceBase","mileageBase","hoursBase","portHoursBase","starboardHoursBase","fuelBase"].forEach(key=>{if(op[key]!==undefined&&!quantity(op[key]))fail("차량·함정 누적값을 확인해주세요");});["logs","fuelLogs","maintenance"].forEach(key=>{if(op[key]!==undefined&&!Array.isArray(op[key]))fail("차량·함정 이력을 확인해주세요");});});}
  return resource;
}
function recordResourcesPresent(record){
  return (record.items||[]).every(item=>itemOf(item.name)&&warehouses.includes(itemWarehouse(item,record.warehouse))&&(record.flow!=="이송"||warehouses.includes(item.targetWarehouse||record.targetWarehouse)))&&(record.equipmentItems||[]).every(entry=>state.equipment.some(item=>item.id===entry.id)&&(!entry.toEquipmentId||state.equipment.some(item=>item.id===entry.toEquipmentId)));
}
function canReverseRecord(record){
  if(record.status==="pending")return true;
  if(!recordResourcesPresent(record))return false;
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
  if(entry.kind==="warehouse")return !warehouses.includes(entry.data.name)&&!state.survey?.active;
  if(entry.kind==="equipment")return !state.equipment.some(item=>item.id===entry.data.id)&&warehouses.includes(entry.data.place);
  if(entry.kind==="material")return !itemOf(entry.data.item.name)&&Object.entries(entry.data.stock||{}).every(([place,qty])=>warehouses.includes(place)||Number(qty)===0);
  if(entry.kind!=="record")return true;
  const record=entry.data;if(state.records.some(item=>item.id===record.id))return false;
  if(record.status==="pending")return true;
  if(!recordResourcesPresent(record))return false;
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
  if(!Number.isFinite(quantity)||quantity<0||quantity>Number.MAX_SAFE_INTEGER)return null;
  return integerUnit(unit)?(Number.isSafeInteger(quantity)?quantity:null):quantity;
}

// Decimal input arithmetic without fixed decimal-place rounding. Existing IEEE
// cancellation noise is treated as zero only at the operands' machine precision.
function addQuantities(left,right){
  const a=Number(left||0),b=Number(right||0);
  if(!Number.isFinite(a)||!Number.isFinite(b))return a+b;
  let result;
  if(typeof BigInt!=="function")result=Number((a+b).toPrecision(15));
  else{
    const ten=BigInt(10),parse=value=>{const [mantissa,exp="0"]=String(value).toLowerCase().split("e"),negative=mantissa.startsWith("-"),parts=mantissa.replace(/^[+-]/,"").split("."),digits=parts.join(""),scale=(parts[1]||"").length-Number(exp);let units=BigInt(digits)*(negative?BigInt(-1):BigInt(1));if(scale<0)units*=ten**BigInt(-scale);return {units,scale:Math.max(0,scale)};};
    const x=parse(a),y=parse(b),scale=Math.max(x.scale,y.scale),sum=x.units*ten**BigInt(scale-x.scale)+y.units*ten**BigInt(scale-y.scale),negative=sum<BigInt(0),digits=(negative?-sum:sum).toString().padStart(scale+1,"0");
    result=Number(`${negative?"-":""}${scale?digits.slice(0,-scale)+"."+digits.slice(-scale):digits}`);
  }
  return a&&b&&Math.sign(a)!==Math.sign(b)&&Math.abs(result)<=Math.max(Math.abs(a),Math.abs(b))*Number.EPSILON*4?0:result;
}

function registerNumbersValid(){
  const material=draftItems.findIndex(item=>finiteQuantity(item.qty,item.unit,true)===null),equipment=draftEquipmentItems.findIndex(item=>finiteQuantity(item.qty,"대",true)===null);
  if(material>=0)return fieldError(`[data-qty="${material}"]`,"0 이상 수량을 입력해주세요 · 개·대·세트는 정수");
  if(equipment>=0)return fieldError(`[data-equipment-qty="${equipment}"]`,"장비 수량은 0 이상의 정수로 입력해주세요");
  return true;
}

function pendingFormDirty(){
  const record=state.records.find(row=>row.id===pendingFormRecordId);
  return Boolean(record&&document.getElementById("pendingTitle")&&pendingFormBaseline&&JSON.stringify(collectPendingForm(record))!==pendingFormBaseline);
}
function rememberPendingForm(record){pendingFormRecordId=record.id;pendingFormBaseline=JSON.stringify(collectPendingForm(record));}
async function protectNavigation(proceed){
  captureMemoDraft();
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
  return `<div class="home-status-grid"><button id="homeStockAttention" type="button"><strong>${catalog.filter(item=>stockLevel(item).label==="부족").length}</strong><span>부족 품목</span></button><button id="homePendingList" type="button"><strong>${events.length}</strong><span>진행·미반영</span></button><button id="homeResourceKinds" type="button"><strong>${catalog.length}</strong><span>자원 품목</span></button></div>
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
  const freshItem=item=>{const copy={...item};["locationCorrection","returned","damaged","before","after","diff","targetBefore","targetAfter","targetDiff","returnedQty","returnHistory","sourceSnapshot","transferMode","toEquipmentId","beforeQty","afterQty","fromPlace","toPlace"].forEach(key=>delete copy[key]);return copy;};
  const draft={mode:record.status==="pending"?"quick":"normal",flow,type:record.type||"기타",date:todayISO(),time:localTimeNow(),title:`${record.title} (복사)`,warehouse:record.warehouse,targetWarehouse:record.targetWarehouse||"",memo:record.memo||"",locationType:record.location?.type||"",locationDetail:record.location?.detail||"",items:(record.items||[]).map(freshItem),equipmentItems:(record.equipmentItems||[]).map(freshItem)};
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
    return (resources.length?resources:[{}]).map(item=>[record.id,record.date,record.time||"",record.flow,record.type,record.title,recordStateLabel(record),itemWarehouse(item,record.warehouse),item.targetWarehouse||record.targetWarehouse||"",item.name||"",item.qty??"",item.unit||"",record.memo,item.resourceKind||""]);
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
