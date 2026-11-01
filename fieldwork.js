/* Additive field-work corrections. No data initialization or external requests. */
function equipmentServiceState(item){
  const total=finiteQuantity(item?.qty,"대");
  if(total===null)return {blocked:true,unavailable:0,reason:"보유 수량 확인 필요"};
  if(Object.prototype.hasOwnProperty.call(item||{},"unavailableQty")){
    const qty=finiteQuantity(item.unavailableQty,"대");
    return qty===null||qty>total?{blocked:true,unavailable:0,reason:"운용 불가 수량 확인 필요"}:{blocked:false,unavailable:qty,reason:qty?`운용 불가 ${qty}대`:""};
  }
  const status=String(item?.status||"").replace(/\s/g,"");
  return ["고장","수리중","정비중","사용불가","운용불가","폐기대기","분실"].includes(status)?{blocked:true,unavailable:0,reason:"운용 상태 확인 필요"}:{blocked:false,unavailable:0,reason:""};
}
function equipmentWorkStatusHtml(item){const service=equipmentServiceState(item);return service.blocked||service.unavailable?`<div class="stock-review-notice">${esc(service.reason)} · 보유 수량은 유지됩니다.</div>`:"";}
function attachEquipmentWorkStatus(id){
  if(view.dataset.equipmentId!==id||document.getElementById("equipmentService"))return;
  const anchor=document.getElementById("editSimpleEquipment");if(!anchor)return;
  const button=document.createElement("button");button.id="equipmentService";button.className="btn secondary";button.type="button";button.textContent="운용상태·사용 불가 수량";button.onclick=()=>openEquipmentService(id);anchor.after(button);
}
function openEquipmentService(id){
  const item=state.equipment.find(row=>row.id===id);if(!item)return;
  const expected=JSON.stringify(state),service=equipmentServiceState(item),using=equipmentAvailability(item).using;
  openEntryModal(`${entryHeader("장비 운용상태",item.name)}<div class="form"><div class="callout">보유 ${Number(item.qty)}대 · 사용 중 ${using}대<br>보관 중 고장·정비 등으로 사용할 수 없는 수량을 입력합니다. 출고 중 수량과 중복 입력하지 마세요.${service.blocked?`<br>${esc(item.status||service.reason)} · 수량 확인 전 신규 사용은 보류됩니다.`:""}</div><label>운용 불가 수량(대)<input id="serviceQty" type="number" inputmode="numeric" min="0" step="1" value="${service.blocked?"":service.unavailable}"></label><label>사유·메모<input id="serviceReason" placeholder="예: 펌프 1대 수리 중"></label><button class="btn primary" id="saveService" type="button">운용상태 저장</button></div>`);
  document.getElementById("saveService").onclick=()=>commitEquipmentService(id,document.getElementById("serviceQty").value,document.getElementById("serviceReason").value,expected);
}
async function commitEquipmentService(id,value,reason,expected){
  return runWorkflow(`service:${id}`,async()=>{
    const item=state.equipment.find(row=>row.id===id),qty=finiteQuantity(value,"대");
    if(!item||JSON.stringify(state)!==expected){showFeedback("warning","자료가 바뀌었습니다 · 다시 열어주세요");return false;}
    if(qty===null||qty>Math.max(0,Number(item.qty)-equipmentAvailability(item).using)){showFeedback("error","보관 중 수량 이내의 정수를 입력해주세요");return false;}
    if(!String(reason||"").trim()){fieldError("#serviceReason","운용상태 변경 사유를 입력해주세요");return false;}
    if(!await askConfirm("운용상태 변경",`${item.name}\n운용 불가 ${qty}대 · 보유 수량은 유지\n${reason}`,"저장"))return false;
    if(JSON.stringify(state)!==expected){showFeedback("warning","확인 중 자료가 바뀌었습니다");return false;}
    item.serviceHistory=[...(item.serviceHistory||[]),{id:uid(),at:new Date().toISOString(),before:{status:item.status,unavailableQty:item.unavailableQty??null},after:qty,reason:String(reason).trim()}];
    item.unavailableQty=qty;item.status=qty?"일부 운용 불가":"정상";item.updatedAt=new Date().toISOString();
    if(!saveStateTransaction(expected,"운용상태 저장 실패 · 기존 상태 유지"))return false;
    closeEntryModal();openEquipment(id,{push:false});showFeedback("success","운용상태 저장 · 보유 수량 유지");return true;
  });
}
function returnHistoryHtml(item){
  const rows=Array.isArray(item.returnHistory)?item.returnHistory:[];
  return rows.length?`<details class="change-history return-history"><summary>반납 내역 ${rows.length}건</summary>${rows.map(row=>`<div class="change-history-row"><strong>${esc(fmtDateTime(row.createdAt||row.date))} · ${esc(row.qty)}대</strong>${row.memo?`<div>${esc(row.memo)}</div>`:""}</div>`).join("")}</details>`:"";
}
function quantityCorrections(sourceId,index){return state.records.filter(row=>row.status!=="pending"&&row.quantityCorrection?.sourceId===sourceId&&(index===undefined||row.quantityCorrection.itemIndex===index));}
function effectiveRecordQuantity(record,index){const rows=quantityCorrections(record.id,index);return rows.length?rows[rows.length-1].quantityCorrection.toQty:Number(record.items?.[index]?.qty);}
function quantityCorrectionBlock(record){
  if(quantityCorrections(record.id).length)return "연결된 수량 정정 기록이 있습니다 · 최근 정정부터 확인해주세요";
  const q=record.quantityCorrection;if(!q)return "";
  const rows=quantityCorrections(q.sourceId,q.itemIndex);return rows.at(-1)?.id!==record.id?"이후 수량 정정이 있습니다 · 최근 정정부터 확인해주세요":"";
}
function quantityCorrectionRestorable(record){
  const q=record.quantityCorrection;if(!q)return true;
  const source=state.records.find(row=>row.id===q.sourceId);
  return Boolean(source&&source.status!=="pending"&&source.items?.[q.itemIndex]&&effectiveRecordQuantity(source,q.itemIndex)===q.fromQty);
}
function quantityCorrectionPlan(sourceId,index,value){
  const record=state.records.find(row=>row.id===sourceId),item=record?.items?.[index];
  if(!record||record.status==="pending"||record.quantityCorrection||!["입고","출고","긴급","사고","이송"].includes(record.flow)||!item||!itemOf(item.name))throw Error("수량 정정 대상 기록·품목을 확인해주세요");
  if(record.flow==="긴급"||item.unit!==itemOf(item.name).unit)throw Error("기존 재고 반영 방식·단위를 먼저 확인해주세요");
  const fromQty=effectiveRecordQuantity(record,index),toQty=finiteQuantity(value,item.unit);
  if(!Number.isFinite(fromQty)||fromQty<0||toQty===null||toQty===fromQty)throw Error("변경할 올바른 수량을 입력해주세요");
  const place=itemWarehouse(item,record.warehouse),delta=addQuantities(toQty,-fromQty),effects=new Map();
  const add=(warehouse,diff)=>{if(!warehouses.includes(warehouse)||!Object.hasOwn(state.stock[warehouse]||{},item.name))throw Error("연결된 보관장소·재고를 확인해주세요");effects.set(warehouse,addQuantities(effects.get(warehouse)||0,diff));};
  if(record.flow==="이송"){add(place,-delta);add(item.targetWarehouse||record.targetWarehouse,delta);}else add(place,record.flow==="입고"?delta:-delta);
  const changes=[...effects].filter(([,diff])=>diff!==0).map(([warehouse,diff])=>{const before=finiteQuantity(state.stock[warehouse][item.name],item.unit),after=before===null?null:addQuantities(before,diff);if(after===null||finiteQuantity(after,item.unit)===null)throw Error("정정 후 재고가 음수 또는 유효하지 않은 수량이 됩니다");return {name:item.name,cat:item.cat,unit:item.unit,warehouse,before,after,diff,qty:Math.abs(diff)};});
  if(!changes.length)throw Error("재고 변동이 없는 정정입니다");
  return {record,item,fromQty,toQty,changes};
}
function correctionChangesText(changes){return changes.map(row=>`${row.warehouse} · ${row.name}: ${qtyText(row.before,row.unit)} → ${qtyText(row.after,row.unit)}`).join("\n");}
function openQuantityCorrection(sourceId,index){
  const record=state.records.find(row=>row.id===sourceId),item=record?.items?.[index];if(!item)return;
  const expected=JSON.stringify(state);
  openEntryModal(`${entryHeader("기록 수량 정정",item.name)}<div class="form"><div class="callout">원 기록과 이후 이력은 보존합니다.<br>현재 정정 기준 ${qtyText(effectiveRecordQuantity(record,index),item.unit)}</div><label>정정 후 기록 수량 (${esc(item.unit)})<input id="correctionQty" type="number" min="0" step="${integerUnit(item.unit)?1:"any"}" inputmode="${integerUnit(item.unit)?"numeric":"decimal"}" value="${effectiveRecordQuantity(record,index)}"></label><label>정정 사유<textarea id="correctionReason"></textarea></label><div class="callout correction-preview" id="correctionPreview" role="status"></div><button class="btn primary" id="saveQuantityCorrection" type="button">정정 내용 확인</button></div>`);
  const preview=()=>{try{document.getElementById("correctionPreview").textContent=correctionChangesText(quantityCorrectionPlan(sourceId,index,document.getElementById("correctionQty").value).changes);}catch(error){document.getElementById("correctionPreview").textContent=error.message;}};
  document.getElementById("correctionQty").oninput=preview;preview();
  document.getElementById("saveQuantityCorrection").onclick=()=>commitQuantityCorrection(sourceId,index,document.getElementById("correctionQty").value,document.getElementById("correctionReason").value,expected);
}
async function commitQuantityCorrection(sourceId,index,value,reason,expected){
  return runWorkflow(`quantity-correction:${sourceId}`,async()=>{
    if(!String(reason||"").trim()){fieldError("#correctionReason","정정 사유를 입력해주세요");return false;}
    if(JSON.stringify(state)!==expected){showFeedback("warning","자료가 바뀌었습니다 · 다시 열어주세요");return false;}
    let plan;try{plan=quantityCorrectionPlan(sourceId,index,value);}catch(error){showFeedback("error",error.message);return false;}
    if(!await askConfirm("수량 정정 반영",`${plan.item.name} · ${qtyText(plan.fromQty,plan.item.unit)} → ${qtyText(plan.toQty,plan.item.unit)}\n${correctionChangesText(plan.changes)}\n사유: ${reason}\n원 기록은 보존하고 차이만 반영합니다.`,"정정 반영"))return false;
    if(JSON.stringify(state)!==expected){showFeedback("warning","확인 중 자료가 바뀌었습니다");return false;}
    if(!createSafetyPoint("수량 정정 전",JSON.parse(expected))){showFeedback("error","안전지점 저장 실패 · 정정 보류");return false;}
    const at=new Date().toISOString();
    plan.changes.forEach(row=>state.stock[row.warehouse][row.name]=row.after);
    state.records.push({id:uid(),flow:"재고수정",type:"수량정정",status:"done",title:`수량 정정 · ${plan.record.title}`,date:todayISO(),createdAt:at,updatedAt:at,warehouse:plan.changes[0].warehouse,memo:String(reason).trim(),sourceId,equipmentItems:[],items:plan.changes,quantityCorrection:{sourceId,itemIndex:index,fromQty:plan.fromQty,toQty:plan.toQty,reason:String(reason).trim()}});
    if(!saveStateTransaction(expected,"수량 정정 저장 실패 · 기록과 재고 유지"))return false;
    closeEntryModal();openDetail(sourceId,{push:false});showFeedback("success","수량 정정 반영 · 원 기록 보존");return true;
  });
}
function quantityCorrectionHistoryHtml(record){
  const rows=quantityCorrections(record.id);
  return rows.length?`<div class="card"><div class="section-title">수량 정정 내역</div>${rows.map(row=>`<div class="change-history-row"><strong>${esc(record.items[row.quantityCorrection.itemIndex]?.name||"품목")} · ${row.quantityCorrection.fromQty} → ${row.quantityCorrection.toQty}</strong><div>${esc(row.memo)}</div><small>${esc(fmtDateTime(row.createdAt))}</small><button class="btn secondary compact" data-quantity-correction-record="${esc(row.id)}" type="button">정정 기록 보기</button></div>`).join("")}</div>`:"";
}
function recordDeletionImpact(record){
  if(record.status==="pending")return "재고에는 영향이 없습니다.";
  const effects=new Map(),units=new Map();
  const add=(place,item,diff)=>{const key=JSON.stringify([place,item.name]);effects.set(key,addQuantities(effects.get(key)||0,diff));units.set(key,item.unit);};
  (record.items||[]).forEach(item=>{const place=itemWarehouse(item,record.warehouse),qty=Number(item.qty||0);if(record.flow==="재고수정")add(place,item,Number(item.before)-Number(item.after));else if(record.flow==="입고")add(place,item,-qty);else if(record.flow==="이송"){add(place,item,qty);add(item.targetWarehouse||record.targetWarehouse,item,-qty);}else if(record.flow!=="긴급")add(place,item,qty);});
  const rows=[...effects].map(([key,diff])=>{const [place,name]=JSON.parse(key),before=Number(state.stock[place]?.[name]);return Number.isFinite(before)&&Number.isFinite(diff)?`${place} · ${name}: ${qtyText(before,units.get(key))} → ${qtyText(addQuantities(before,diff),units.get(key))}`:`${place} · ${name}: 연결 수량 확인 필요`;});
  (record.equipmentItems||[]).forEach(item=>{if(record.flow==="이송")rows.push(`${item.name} ${item.qty}대 · ${item.toPlace||record.targetWarehouse} → ${item.fromPlace||item.place||record.warehouse} 이송 취소`);else if(["출고","사고","긴급"].includes(record.flow))rows.push(`${item.name} · 미반납 ${Math.max(0,Number(item.qty||0)-Number(item.returnedQty||0))}대 사용 기록 해제`);});
  return rows.length?`삭제하면 다음 재고·사용 기록을 되돌립니다.\n${rows.join("\n")}\n과거 기록 연결에 따라 삭제가 보류될 수 있습니다.`:"보유 재고 수량은 바뀌지 않습니다.";
}
function effectiveOpLogs(place){
  const op=state.assetOps?.[place]||{},logs=(Array.isArray(op.logs)?op.logs:[]).map(row=>({...row}));
  const allowed=new Set(["before","after","diff","mileageBefore","mileageAfter","mileageDiff","portBefore","portAfter","portDiff","starboardBefore","starboardAfter","starboardDiff","fuel"]);
  for(const correction of Array.isArray(op.operationCorrections)?op.operationCorrections:[])for(const patch of Array.isArray(correction?.patches)?correction.patches:[]){const log=logs.find(row=>row.id===patch?.logId);if(log)for(const [key,value] of Object.entries(patch.after||{}))if(allowed.has(key)&&finiteQuantity(value)!==null)log[key]=Number(value);}
  return logs;
}
function operationLogHasCorrection(place,id){return (state.assetOps?.[place]?.operationCorrections||[]).some(row=>(row.patches||[]).some(patch=>patch.logId===id));}
function operationCorrectionPlan(place,logId,values){
  const op=state.assetOps?.[place],logs=effectiveOpLogs(place),index=logs.findIndex(row=>row.id===logId),vehicle=isVehiclePlace(place);
  if(!op||index<0||new Set(logs.map(row=>row.id)).size!==logs.length)throw Error("정정할 운행기록 연결을 확인해주세요");
  const log=logs[index],next=logs[index+1],patches=new Map(),counters={};
  const change=(row,key,value)=>{let patch=patches.get(row.id);if(!patch){patch={logId:row.id,before:{},after:{}};patches.set(row.id,patch);}if(Number(row[key])!==value){patch.before[key]=row[key];patch.after[key]=value;}};
  const fields=vehicle?[["before","after","diff","distanceBase","누적거리(km)"]]:[["mileageBefore","mileageAfter","mileageDiff","mileageBase","누적 마일(NM)"],["portBefore","portAfter","portDiff","portHoursBase","좌현(h)"],["starboardBefore","starboardAfter","starboardDiff","starboardHoursBase","우현(h)"]];
  for(const [beforeKey,afterKey,diffKey,base,label] of fields){
    const before=finiteQuantity(log[beforeKey]),old=finiteQuantity(log[afterKey]),value=finiteQuantity(values[afterKey]);
    if(before===null||old===null||value===null||value<before)throw Error(`${label}: 이전 누적값 이상으로 입력해주세요`);
    if(next){const nextBefore=finiteQuantity(next[beforeKey]),nextAfter=finiteQuantity(next[afterKey]);if(nextBefore===null||nextAfter===null||nextAfter<nextBefore||value>nextAfter||value>nextBefore&&nextBefore!==old)throw Error(`${label}: 다음 기록과 누적값이 충돌합니다`);if(nextBefore===old){change(next,beforeKey,value);change(next,diffKey,addQuantities(nextAfter,-value));}}
    else{if(Number(op[base])!==old)throw Error(`${label}: 현재 계기값이 달라 정정을 보류합니다`);counters[base]=value;}
    change(log,afterKey,value);change(log,diffKey,addQuantities(value,-before));
  }
if(!vehicle){const old=finiteQuantity(log.fuel??0),fuel=finiteQuantity(values.fuel);if(old===null||fuel===null)throw Error("연료 소모량을 확인해주세요");if(old!==fuel&&(op.fuelLogs||[]).some(row=>row.before!==undefined&&row.after!==undefined&&(!log.createdAt||!row.createdAt||Date.parse(row.createdAt)>=Date.parse(log.createdAt))))throw Error("이후 연료 재고수정이 있습니다 · 소모량은 유지하고 연료 재고를 별도로 확인해주세요");const current=finiteQuantity(op.fuelBase),after=current===null?null:addQuantities(current,addQuantities(old,-fuel));if(after===null||finiteQuantity(after)===null)throw Error("정정 후 연료 재고가 부족합니다");change(log,"fuel",fuel);counters.fuelBase=after;}
  const list=[...patches.values()].filter(patch=>Object.keys(patch.after).length);if(!list.length)throw Error("변경된 계기값·소모량이 없습니다");
  const labels={before:"출발 누적km",after:"도착 누적km",diff:"운행km",mileageBefore:"출항 누적NM",mileageAfter:"입항 누적NM",mileageDiff:"운항NM",portBefore:"좌현 시작h",portAfter:"좌현 누적h",portDiff:"좌현 사용h",starboardBefore:"우현 시작h",starboardAfter:"우현 누적h",starboardDiff:"우현 사용h",fuel:"연료 소모L"};
  return {patches:list,counters,summary:list.map(patch=>`${logs.find(row=>row.id===patch.logId).date||"기록"} · ${Object.keys(patch.after).map(key=>`${labels[key]||key}: ${patch.before[key]} → ${patch.after[key]}`).join(", ")}`).join("\n")};
}
function openOperationCorrectionPicker(place){
  const logs=effectiveOpLogs(place);
  openEntryModal(`${entryHeader("운행기록 정정",place)}<div class="form"><label>기록 찾기<input id="operationCorrectionSearch" type="search" placeholder="날짜·목적·메모 검색"></label><div class="list-card">${logs.slice().reverse().map(log=>`<button class="list-row" data-correct-operation="${esc(log.id)}" type="button"><span>${esc(fmtDate(log.date))} · ${esc(log.purpose||log.memo||"운행기록")}<small class="row-sub">${isVehiclePlace(place)?`${Number(log.before)} → ${Number(log.after)}km`:`${Number(log.mileageBefore)} → ${Number(log.mileageAfter)}NM`}</small></span></button>`).join("")||'<div class="emptybox">정정할 기록 없음</div>'}</div><div id="operationCorrectionNoMatch" class="emptybox" hidden>일치하는 기록 없음</div></div>`);
  document.getElementById("operationCorrectionSearch").oninput=event=>{const query=event.target.value.trim().toLocaleLowerCase("ko-KR");let count=0;document.querySelectorAll("[data-correct-operation]").forEach(button=>{button.hidden=!button.textContent.toLocaleLowerCase("ko-KR").includes(query);if(!button.hidden)count++;});document.getElementById("operationCorrectionNoMatch").hidden=count>0||!logs.length;};
  document.querySelectorAll("[data-correct-operation]").forEach(button=>button.onclick=()=>openOperationCorrection(place,button.dataset.correctOperation));
}
function openOperationCorrection(place,logId){
  const log=effectiveOpLogs(place).find(row=>row.id===logId);if(!log)return;
  const expected=JSON.stringify(state),fields=isVehiclePlace(place)?[["after","누적거리(km)"]]:[["mileageAfter","누적 마일(NM)"],["portAfter","좌현 누적(h)"],["starboardAfter","우현 누적(h)"],["fuel","연료 소모(L)"]];
  openEntryModal(`${entryHeader("과거 운행기록 정정",`${place} · ${fmtDate(log.date)}`)}<div class="form"><div class="callout">원 기록을 보존하고 정정 이력을 남깁니다. 연결된 다음 기록의 시작값과 사용량도 검토합니다.</div>${fields.map(([key,label])=>`<label>${label}<input id="correctOp-${key}" type="number" inputmode="decimal" min="0" step="any" value="${Number(log[key]??0)}"></label>`).join("")}<label>정정 사유<textarea id="operationCorrectionReason"></textarea></label><div class="callout correction-preview" id="operationCorrectionPreview"></div><button class="btn primary" id="saveOperationCorrection" type="button">정정 내용 확인</button></div>`);
  const values=()=>Object.fromEntries(fields.map(([key])=>[key,document.getElementById(`correctOp-${key}`).value]));
  const preview=()=>{try{document.getElementById("operationCorrectionPreview").textContent=operationCorrectionPlan(place,logId,values()).summary;}catch(error){document.getElementById("operationCorrectionPreview").textContent=error.message;}};
  fields.forEach(([key])=>document.getElementById(`correctOp-${key}`).oninput=preview);preview();
  document.getElementById("saveOperationCorrection").onclick=()=>commitOperationCorrection(place,logId,values(),document.getElementById("operationCorrectionReason").value,expected);
}
async function commitOperationCorrection(place,logId,values,reason,expected){
  return runWorkflow(`operation-correction:${place}`,async()=>{
    if(!String(reason||"").trim()){fieldError("#operationCorrectionReason","정정 사유를 입력해주세요");return false;}
    if(JSON.stringify(state)!==expected){showFeedback("warning","자료가 바뀌었습니다 · 다시 열어주세요");return false;}
    let plan;try{plan=operationCorrectionPlan(place,logId,values);}catch(error){showFeedback("error",error.message);return false;}
    if(!await askConfirm("운행기록 정정",`${plan.summary}\n사유: ${reason}\n원 기록은 보존됩니다.`,"정정 반영"))return false;
    if(JSON.stringify(state)!==expected){showFeedback("warning","확인 중 자료가 바뀌었습니다");return false;}
    if(!createSafetyPoint("운행기록 정정 전",JSON.parse(expected))){showFeedback("error","안전지점 저장 실패 · 정정 보류");return false;}
    const op=state.assetOps[place],at=new Date().toISOString();op.operationCorrections=[...(op.operationCorrections||[]),{id:uid(),logId,date:todayISO(),createdAt:at,reason:String(reason).trim(),patches:plan.patches,summary:plan.summary}];Object.assign(op,plan.counters);op.updatedAt=at;
    if(!saveStateTransaction(expected,"운행 정정 저장 실패 · 기존 기록·계기값 유지"))return false;
    closeEntryModal();openAssetHistory(place);showFeedback("success","운행기록 정정 · 원 기록 보존");return true;
  });
}
