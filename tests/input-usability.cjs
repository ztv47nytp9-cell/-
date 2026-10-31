// Production functions with small DOM fixtures; no browser profile or external requests.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const slice=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to));
function element(dataset={}){return {dataset,value:'',handlers:{},writes:0,html:'',set innerHTML(value){this.writes++;this.html=value;},get innerHTML(){return this.html;},addEventListener(type,handler){this.handlers[type]=handler;}};}
function fixture(){
  const qty=element({qty:'0'}),name=element({name:'0'}),cat=element({cat:'0'}),warehouse=element({itemWarehouse:'0'}),remove=element({remove:'0'}),clear=element({qtyClear:'0'}),plus=[1,5,10].map(n=>element({qtyIndex:'0',qtyAdd:String(n)})),cans=element({canQty:'0'}),result=element(),area=element(),equipmentArea=element(),summary=element(),preview=element();
  const nodes={'[data-cat]':[cat],'[data-name]':[name],'[data-item-warehouse]':[warehouse],'[data-qty]':[qty],'[data-can-qty]':[cans],'[data-remove]':[remove],'[data-qty-add]':plus,'[data-qty-clear]':[clear]};
  area.querySelectorAll=selector=>nodes[selector]||[];
  area.querySelector=selector=>selector==='[data-qty="0"]'?qty:selector==='[data-can-qty="0"]'?cans:selector==='[data-can-result="0"]'?result:null;
  equipmentArea.querySelectorAll=()=>[];
  let schedules=0;
  const frames=[],stock={A:{흡착재:20,유처리제:180},B:{흡착재:8,유처리제:36}},catalog=[{name:'흡착재',cat:'유흡착재',unit:'kg'},{name:'유처리제',cat:'유처리제',unit:'L'}];
  const elements={itemArea:area,equipmentItemArea:equipmentArea,registerDraftSummary:summary,stockAfterPreview:preview,recWarehouse:{value:'A'}};
  const context=vm.createContext({Number,String,Math,JSON,Set,Map,Boolean,
    draftItems:[{...catalog[0],warehouse:'A',qty:2}],draftEquipmentItems:[],state:{stock,equipment:[],records:[]},warehouses:['A','B'],cats:['유흡착재','유처리제'],registerMode:'normal',registerFlow:'출고',page:'register',
    document:{getElementById:id=>elements[id],querySelector:()=>null},requestAnimationFrame:fn=>frames.push(fn),motionReduced:()=>false,
    esc:value=>String(value??''),activeMaterials:()=>catalog,itemOf:value=>catalog.find(row=>row.name===value),itemWarehouse:(item,fallback)=>item.warehouse||fallback,
    integerUnit:unit=>['개','대','세트'].includes(unit),isDispersant:item=>item.name==='유처리제',materialQtyText:(qty,unit)=>qty+unit,
    recordStockIssues:()=>[],addQuantities:(a,b)=>Number((Number(a)+Number(b)).toPrecision(14)),scheduleRegisterDraft:()=>schedules++,showFeedback:()=>{},mergeDuplicateDraftItems:()=>false,
    renderResourceEmptyAction:()=>{},refreshResourceLocations:()=>{}});
  vm.runInContext(slice('function registerDraftProgress(','function registerPendingContinueHtml(')+slice('function updateRegisterDraftSummary(','function transferTargetOptions(')+slice('function updateStockAfterPreview(','function mergeDuplicateDraftItems(')+slice('function registerStockInfo(','async function saveRecord(')+slice('function renderEquipmentItems(','function registerStockInfo(')+slice('function historyStatusMatches(','function renderBaseHistory('),context);
  return {context,area,equipmentArea,qty,name,cat,warehouse,remove,clear,plus,cans,result,summary,preview,elements,frames,catalog,schedules:()=>schedules};
}
let passed=0;
function test(name,run){run();passed++;console.log('PASS '+name);}
test('mixed units show item progress, never an invented sum',()=>{const f=fixture(),c=f.context;c.draftItems=[{qty:10,unit:'kg'},{qty:20,unit:'m'},{qty:36,unit:'L'}];c.draftEquipmentItems=[{qty:2}];assert.equal(JSON.stringify(c.registerDraftProgress()),JSON.stringify({materialRows:3,equipmentRows:1,total:4,ready:4,remaining:0}));assert.match(c.registerDraftSummaryHtml(),/수량 입력 4\/4품목/);assert.doesNotMatch(c.registerDraftSummaryHtml(),/수량 66|저장 제외/);});
test('empty quantity and zero are identified as excluded',()=>{const c=fixture().context;c.draftItems=[{qty:''},{qty:0},{qty:3}];c.draftEquipmentItems=[{qty:''}];assert.equal(c.registerDraftProgress().remaining,3);assert.match(c.registerDraftSummaryHtml(),/수량 없는 3품목은 저장 제외/);});
test('no rows keep summary empty',()=>{const c=fixture().context;c.draftItems=[];assert.equal(c.registerDraftSummaryHtml(),'');});
for(const [position,delta] of [[0,1],[1,5],[2,10]])test('quick +'+delta+' updates input and preview without rebuilding row',()=>{const f=fixture();f.context.renderItems();const count=f.area.writes;f.plus[position].handlers.click();assert.equal(f.context.draftItems[0].qty,2+delta);assert.equal(f.qty.value,2+delta);assert.equal(f.area.writes,count);assert.match(f.preview.innerHTML,new RegExp((18-delta)+'kg'));assert.equal(f.schedules(),1);});
test('repeated quick taps preserve the same controls',()=>{const f=fixture();f.context.renderItems();const count=f.area.writes;for(let n=0;n<10;n++)f.plus[0].handlers.click();assert.equal(f.context.draftItems[0].qty,12);assert.equal(f.area.writes,count);assert.equal(f.schedules(),10);});
test('clear refreshes preview and does not replace row',()=>{const f=fixture();f.context.renderItems();const count=f.area.writes;f.clear.handlers.click();assert.equal(f.qty.value,'');assert.equal(f.preview.innerHTML,'');assert.equal(f.area.writes,count);assert.match(f.summary.innerHTML,/1품목은 저장 제외/);});
test('litre input updates can conversion without removing decimal typing',()=>{const f=fixture();f.context.draftItems=[{...f.catalog[1],warehouse:'A',qty:36}];f.context.renderItems();f.qty.value='18.';f.qty.handlers.input();assert.equal(f.qty.value,'18.');assert.equal(f.context.draftItems[0].qty,18);assert.equal(f.cans.value,1);assert.match(f.result.textContent,/1캔 = 18L/);});
test('quick increment refreshes can conversion too',()=>{const f=fixture();f.context.draftItems=[{...f.catalog[1],warehouse:'A',qty:17}];f.context.renderItems();f.plus[0].handlers.click();assert.equal(f.cans.value,1);assert.match(f.result.textContent,/18L/);});
test('changing material immediately refreshes stock preview and draft',()=>{const f=fixture();f.context.renderItems();f.name.value='유처리제';f.name.handlers.change();assert.equal(f.context.draftItems[0].name,'유처리제');assert.match(f.preview.innerHTML,/178L/);assert.equal(f.schedules(),1);});
test('changing source updates row preview, not all item sources',()=>{const f=fixture();f.context.renderItems();f.warehouse.value='B';f.warehouse.handlers.change();assert.equal(f.context.draftItems[0].warehouse,'B');assert.match(f.preview.innerHTML,/6kg/);assert.equal(f.context.state.stock.A.흡착재,20);assert.equal(f.context.state.stock.B.흡착재,8);});
test('removing last material clears stale stock preview',()=>{const f=fixture();f.context.renderItems();assert.ok(f.preview.innerHTML);f.remove.handlers.click();assert.equal(f.context.draftItems.length,0);assert.equal(f.preview.innerHTML,'');assert.equal(f.summary.innerHTML,'');});
test('just rendering empty registration never schedules overwriting an old draft',()=>{const f=fixture();f.context.draftItems=[];f.context.renderItems();f.context.renderEquipmentItems();assert.equal(f.schedules(),0);});
test('rendering existing material rows alone never captures draft',()=>{const f=fixture();f.context.renderItems();assert.equal(f.schedules(),0);assert.match(f.area.innerHTML,/이 줄 빼기/);assert.doesNotMatch(f.area.innerHTML,/자재 삭제/);});
for(const status of ['all','pending','review','done'])test('history status '+status+' is stable while filtering search',()=>{const c=fixture().context,records=[{id:'pending',status:'pending'},{id:'review',status:'pending',stockReview:true},{id:'done',status:'done'}];c.historyFilter=status;const ids=records.filter(r=>c.historyStatusMatches(r)).map(r=>r.id);assert.deepEqual(ids,status==='all'?['pending','review','done']:status==='pending'?['pending']:status==='review'?['review']:['done']);});
test('history active filters are explicit, whitespace query is empty',()=>{const c=fixture().context;Object.assign(c,{historyFilter:'all',historyDateFilter:'all',historyFlowFilter:'all',historyPlaceFilter:'all',historyTypeFilter:'all',historySearchQuery:'  '});assert.equal(c.historyViewFiltersActive(),false);c.historyFilter='review';assert.equal(c.historyViewFiltersActive(),true);c.historyFilter='all';c.historySearchQuery='흡착';assert.equal(c.historyViewFiltersActive(),true);});
test('history initial results and typed results use identical status predicate',()=>{const render=slice('function renderBaseHistory(','function baseHistoryListHtml(');assert.equal((render.match(/historyStatusMatches\(record\)/g)||[]).length,2);});
test('filtered empty state offers whole history, genuine empty state offers registration',()=>{const f=fixture(),c=f.context;Object.assign(c,{historyFilter:'all',historyDateFilter:'all',historyFlowFilter:'all',historyPlaceFilter:'all',historyTypeFilter:'all',historySearchQuery:''});vm.runInContext(slice('function baseHistoryListHtml(','function bindHistoryRows('),c);assert.match(c.baseHistoryListHtml([]),/emptyHistoryRegister/);c.state.records=[{id:'synthetic'}];assert.match(c.baseHistoryListHtml([]),/emptyHistoryReset/);assert.doesNotMatch(c.baseHistoryListHtml([]),/emptyHistoryRegister/);});
for(const mode of ['normal','quick'])for(const flow of ['출고','입고','이송'])test(mode+' '+flow+' quantity updates never mutate inventory',()=>{const f=fixture(),c=f.context;c.registerMode=mode;c.registerFlow=flow;const before=JSON.stringify(c.state);c.renderItems();f.plus[0].handlers.click();f.clear.handlers.click();assert.equal(JSON.stringify(c.state),before);});
test('new row reveal does not open keyboard and ignores detached rows',()=>{const f=fixture(),c=f.context,row={isConnected:true,focus:()=>row.focused=true,scrollIntoView:options=>row.scroll=options};c.document.querySelector=()=>({closest:()=>row});c.revealRegisterRow('[data-name="0"]');assert.equal(row.focused,undefined);f.frames.shift()();assert.equal(row.focused,true);assert.equal(row.scroll.behavior,'smooth');row.focused=false;row.isConnected=false;c.revealRegisterRow('ignored');f.frames.shift()();assert.equal(row.focused,false);});
test('new row reveal respects reduced motion and leaving registration',()=>{const f=fixture(),c=f.context,row={isConnected:true,focus:()=>{},scrollIntoView:options=>row.scroll=options};c.document.querySelector=()=>({closest:()=>row});c.motionReduced=()=>true;c.revealRegisterRow('row');f.frames.shift()();assert.equal(row.scroll.behavior,'instant');c.page='home';row.scroll=null;c.revealRegisterRow('row');f.frames.shift()();assert.equal(row.scroll,null);});
test('search Enter respects IME composition and does not save a form',()=>{assert.match(source,/event\.key==="Enter"&&!event\.isComposing/);assert.match(source,/event\.preventDefault\(\);input\.blur\(\)/);});
function locationFixture(pending=false){
  const f=fixture(),c=f.context,label={hint:null,querySelector:()=>label.hint,append:node=>label.hint=node},select={id:pending?'pendingName0':'',dataset:{name:'0'},value:'흡착재',options:[{value:'흡착재'},{value:'유처리제'}],matches:selector=>!pending&&['select[data-name]','[data-name]'].includes(selector),closest:()=>label};
  c.document.querySelectorAll=()=>[select];c.document.createElement=()=>({});const oldGet=c.document.getElementById;c.document.getElementById=id=>id==='pendingItemWarehouse0'?{value:'B'}:oldGet(id);
  Object.assign(c,{placeLabel:value=>value,queueMicrotask:()=>{},scheduleInputVisibility:()=>{}});
  vm.runInContext(slice('function materialLocationLabel(','function bindGlobal('),c);
  return {...f,label,select};
}
test('inline material picker shows names, not repeated location and stock',()=>{const f=locationFixture();f.context.refreshResourceLocations();assert.equal(f.select.options[0].textContent,'흡착재');assert.equal(f.label.hint,null);});
test('inline material removes stale duplicated hint',()=>{const f=locationFixture();let removed=false;f.label.hint={remove:()=>removed=true};f.context.refreshResourceLocations();assert.equal(removed,true);});
test('inline picker keeps archived resource warning',()=>{const f=locationFixture();f.catalog[0].archived=true;f.context.refreshResourceLocations();assert.match(f.select.options[0].textContent,/보관 처리/);});
test('pending record picker preserves full source and quantity hints',()=>{const f=locationFixture(true);f.context.page='history';f.context.refreshResourceLocations();assert.equal(f.select.options[0].textContent,'B · 흡착재 · 8kg');assert.match(f.label.hint.textContent,/저장위치: B · 현재 8kg/);});
function equipmentFixture(){
  const f=fixture(),c=f.context,gear={id:'gear',name:'시험 장비',cat:'기타장비',place:'A',qty:3},qty=element({equipmentQty:'0'}),remove=element({equipmentRemove:'0'}),name=element({equipmentName:'0'});
  c.state.equipment=[gear];c.draftEquipmentItems=[{...gear,qty:''}];
  Object.assign(c,{activeEquipment:()=>c.state.equipment,equipmentRegisterLabel:gear=>gear.name,equipmentAvailabilityText:gear=>`사용 가능 ${gear.qty}대`});
  f.equipmentArea.querySelectorAll=selector=>({'[data-equipment-qty]':[qty],'[data-equipment-remove]':[remove],'[data-equipment-name]':[name]})[selector]||[];
  return {...f,gear,gearQty:qty,gearRemove:remove,gearName:name};
}
test('equipment row clearly separates removing draft from deleting resource',()=>{const f=equipmentFixture();f.context.renderEquipmentItems();assert.match(f.equipmentArea.innerHTML,/등록에서 시험 장비 줄 빼기/);assert.match(f.equipmentArea.innerHTML,/placeholder="수량 입력"/);assert.doesNotMatch(f.equipmentArea.innerHTML,/장비 삭제/);assert.equal(f.schedules(),0);});
test('equipment quantity input keeps row intact and updates progress',()=>{const f=equipmentFixture();f.context.renderEquipmentItems();const writes=f.equipmentArea.writes;f.gearQty.value='2';f.gearQty.handlers.input();assert.equal(f.context.draftEquipmentItems[0].qty,'2');assert.equal(f.equipmentArea.writes,writes);assert.match(f.summary.innerHTML,/수량 입력 2\/2품목/);assert.equal(f.gear.qty,3);});
test('removing draft equipment keeps source equipment and stock unchanged',()=>{const f=equipmentFixture(),before=JSON.stringify(f.context.state);f.context.renderEquipmentItems();f.gearRemove.handlers.click();assert.equal(f.context.draftEquipmentItems.length,0);assert.equal(JSON.stringify(f.context.state),before);assert.match(f.summary.innerHTML,/수량 입력 1\/1품목/);});
(async()=>{
  for(const flow of ['출고','입고','이송']){
    const f=fixture(),c=f.context,quantity={},errors=[];c.registerFlow=flow;c.draftItems[0].qty='';
    Object.assign(f.elements,{recType:{value:'작업'},recDate:{value:'2026-10-21'},recTitle:{value:'테스트'},recMemo:{value:''}});
    Object.assign(c,{registerNumbersValid:()=>true,collectRegisterLocation:()=>null,collectRegisterEvidence:()=>null,fieldError:(input,message)=>errors.push({input,message})});
    c.document.querySelector=()=>quantity;
    vm.runInContext(slice('async function performSaveRecord(','function summarizeItems('),c);
    const before=JSON.stringify(c.state);await c.performSaveRecord();assert.equal(errors[0].input,quantity);assert.equal(errors[0].message,'수량을 입력해주세요');assert.equal(JSON.stringify(c.state),before);passed++;console.log('PASS '+flow+' save directs empty quantity to its field, without writing data');
  }
  test('failed save restores the current accident/training button label',()=>{assert.match(source,/const resetSaveButton=\(\)=>\{if\(saveButton\)\{saveButton\.disabled=false;updateRegisterTypeDependentUI\(\);\}\}/);});
  test('save button floats independently of summary, bundle button stays in normal flow',()=>{
    assert.match(source,/<div class="register-save-dock">\s*<div id="registerDraftSummary"[\s\S]*?<button class="btn primary" id="saveRecord"/);
    const css=fs.readFileSync(path.join(__dirname,'../interface.css'),'utf8');assert.match(css,/\.register-save-dock #saveRecord\{position:fixed/);assert.doesNotMatch(css,/\.context-back-dock\{/);
    assert.match(source,/surface\.querySelectorAll\("\.sticky-action,\.sticky-save,\.entry-actions,#saveRecord"\)/);
    const workflow=fs.readFileSync(path.join(__dirname,'../workflow.js'),'utf8');assert.match(workflow,/summary\.closest\("\.register-save-dock"\)\|\|summary\)\.before\(button\)/);
  });
  console.log(`DONE ${passed} isolated input usability checks; zero external requests`);
})().catch(error=>{console.error(error);process.exitCode=1;});
