// Isolated production logic; fake storage, no browser profile or cloud writes.
const vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,slice,copy,app,workflow,KEY}=require('./field-stability.cjs');
function setup(){
  const f=fixture(),c=f.c;
  Object.assign(c,{registerMode:'normal',registerFlow:'출고',page:'home',readRegisterDraft:()=>null,
    groupedSection:(scope,title,count,html)=>`<section data-title="${title}">${html}</section>`,
    fmtDate:v=>v,placeLabel:v=>v,materialQtyText:(n,u)=>n+u,warehouseKind:()=> '창고',warehouseImpactText:()=> '가상 영향 요약',
    scrollToTop(){},replaceNavigationState(){},bindGroupedSections(){},isTodayChanged:()=>false,
    showResourceBlock:(kind,id,message)=>f.messages.push({type:'blocked',message}),showLinkedWork(){}});
  vm.runInContext(slice(app,'function updateRegisterTypeDependentUI(','function collectRegisterEvidence(')+
    slice(app,'function summarizeItems(','function historyDateGroups(')+slice(app,'function historyDateGroups(','function historyDateMatches(')+
    slice(app,'function historyFlowMatches(','function historyStatusMatches(')+slice(app,'function baseHistoryListHtml(','function bindHistoryRows(')+
    slice(app,'function renderStockList(','function editStock(')+slice(app,'function recordMatchesResource(','function deleteManagedResource(')+
    slice(app,'function deleteManagedWarehouse(','\ninit();')+slice(app,'function restoreWarehouseTrashData(','function openTrash('),c);
  c.showResourceBlock=(kind,id,message)=>f.messages.push({type:'blocked',message});
  f.run('state.stock={"시험A":{},"시험B":{}};state.assetOps={};state.warehouseInfos={"시험A":{memo:"가상 메모"},"시험B":{}};state.warehouseKinds={"시험A":"창고","시험B":"창고"};lastPersistedStateSnapshot=JSON.stringify(state);');
  return f;
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
function record(overrides={}){return {id:'r',title:'가상 기록',date:'2026-10-26',status:'done',flow:'출고',warehouse:'시험A',items:[],equipmentItems:[],...overrides};}
(async()=>{
  await test('accident location survives switching kinds; non-accident collection stays null',()=>{
    const f=setup();Object.assign(f.elements,{recType:{value:'사고'},registerLocationCard:{style:{}},recLocationDetail:{value:'가상 항만'},recLocationType:{value:'항포구'},saveRecord:{}});
    f.c.updateRegisterTypeDependentUI();assert.equal(f.c.collectRegisterLocation().detail,'가상 항만');
    f.elements.recType.value='훈련';f.c.updateRegisterTypeDependentUI();assert.equal(f.c.collectRegisterLocation(),null);assert.equal(f.elements.registerLocationCard.style.display,'none');
    f.elements.recType.value='사고';f.c.updateRegisterTypeDependentUI();assert.equal(f.c.collectRegisterLocation().detail,'가상 항만');
  });
  for(const [name,row,expected] of [
    ['normal pending',record({status:'pending',flow:'사고'}),false],['normal stock review',record({status:'pending',stockReview:true}),false],
    ['quick pending',record({status:'pending',quick:true}),true],['quick done',record({quick:true}),true],['legacy emergency',record({flow:'긴급'}),true]
  ])await test('emergency filter '+name,()=>{const f=setup();f.c.historyFlowFilter='긴급';assert.equal(f.c.historyFlowMatches(row),expected);});
  for(const [name,row,expected] of [
    ['equipment-only',record({equipmentItems:[{id:'g',place:'시험B'}]}),'시험B'],
    ['mixed',record({items:[{name:'자재',warehouse:'시험A'}],equipmentItems:[{id:'g',place:'시험B'}]}),'시험A, 시험B'],
    ['legacy fallback',record({equipmentItems:[{id:'g'}]}),'시험A'],
    ['transfer',record({flow:'이송',targetWarehouse:'시험C',equipmentItems:[{id:'g',place:'시험C',fromPlace:'시험B',toPlace:'시험C'}]}),'시험B → 시험C']
  ])await test('record places '+name,()=>{const f=setup();assert.equal(f.c.recordWarehouseText(row),expected);});
  await test('equipment location filter and search do not use unrelated default warehouse',()=>{
    const f=setup(),r=record({equipmentItems:[{id:'g',place:'시험B'}]});Object.assign(f.c,{historyTypeFilter:'all',historyPlaceFilter:'시험A',historySearchQuery:''});
    assert.equal(f.c.historySearchMatches(r),false);f.c.historyPlaceFilter='시험B';assert.equal(f.c.historySearchMatches(r),true);f.c.historyPlaceFilter='all';assert.equal(f.c.historySearchMatches(r,'시험B'),true);
  });
  await test('deleted historical places remain filterable without recreating warehouses',()=>{
    const f=setup();f.state().records=[record({equipmentItems:[{id:'g',place:'삭제창고'}]})];const before=copy(f.state());
    const choices=copy(f.c.historyPlaceChoices());assert.ok(choices.some(row=>row.name==='삭제창고'&&row.label.includes('삭제된 보관장소')));assert.deepEqual(copy(f.state()),before);
  });
  await test('mixed records get own group and show real places separately',()=>{
    const f=setup(),r=record({items:[{name:'흡착재',qty:2,unit:'kg',warehouse:'시험A'}],equipmentItems:[{id:'g',name:'장비',qty:1,place:'시험B'}]});
    const html=f.c.baseHistoryListHtml([r]);assert.match(html,/data-title="자재·장비 함께 기록"/);assert.match(html,/record-place">시험A, 시험B/);assert.match(html,/record-resource-summary/);
  });
  for(const [query,showZero,expected] of [['',false,'보관 중인 자재가 없습니다'],['시험흡착재',false,'일치하는 1종은 0재고'],['없음',false,'조건에 맞는 자재가 없습니다'],['시험흡착재',true,'시험흡착재']])await test('stock empty state '+query+' '+showZero,()=>{
    const f=setup();f.c.selectedWarehouse='시험A';f.c.materialSortMode='name';f.state().ui={showZeroStockInWarehouse:showZero};
    f.elements.stockSearch={value:query};f.elements.stockList={innerHTML:'',querySelectorAll:()=>[]};f.elements.toggleZeroStock={addEventListener(){}};f.c.renderStockList();assert.ok(f.elements.stockList.innerHTML.includes(expected));
  });
  for(const [name,arrange,blocked] of [
    ['empty',()=>{},false],['past history',f=>f.state().records=[record()],false],
    ['zero gear',f=>f.state().equipment=[{id:'g',place:'시험A',qty:0}],false],['zero archived gear',f=>f.state().equipment=[{id:'g',place:'시험A',qty:0,archived:true}],false],
    ['positive gear',f=>f.state().equipment=[{id:'g',place:'시험A',qty:1}],true],['material stock',f=>f.state().stock.시험A.시험흡착재=1,true],
    ['negative stock',f=>f.state().stock.시험A.시험흡착재=-1,true],['fuel',f=>f.state().assetOps.시험A={fuelBase:3},true],
    ['unrelated survey',f=>f.state().survey={active:true,items:[{warehouse:'시험B'}]},false],['related survey',f=>f.state().survey={active:true,items:[{warehouse:'시험A'}]},true],
    ['unknown legacy survey',f=>f.state().survey={active:true},true],['empty pending title',f=>f.state().records=[record({status:'pending'})],false],
    ['empty draft title',f=>f.c.readRegisterDraft=()=>record({title:'작성 중'}),false],
    ['material pending',f=>f.state().records=[record({status:'pending',items:[{name:'시험흡착재',warehouse:'시험A',qty:1}]})],true],
    ['legacy unresolved pending equipment',f=>f.state().records=[record({status:'pending',equipmentItems:[{id:'missing',qty:1}]})],true],
    ['unrelated pending resources',f=>f.state().records=[record({status:'pending',items:[{name:'시험흡착재',warehouse:'시험B',qty:1}]})],false],
    ['transfer target pending',f=>f.state().records=[record({status:'pending',pendingFlow:'이송',warehouse:'시험B',targetWarehouse:'시험A',items:[{name:'시험흡착재',warehouse:'시험B',qty:1}]})],true],
    ['last warehouse',f=>f.run('state.warehouses=["시험A"];refreshGlobals(state);'),true],
    ['active usage with zero gear',f=>{f.state().equipment=[{id:'g',place:'시험A',qty:0}];f.state().records=[record({equipmentItems:[{id:'g',qty:1,returnedQty:0,place:'시험A'}]})];},true]
  ])await test('warehouse delete guard '+name,()=>{const f=setup();arrange(f);assert.equal(Boolean(f.c.deletionBlock('warehouse','시험A')),blocked);});
  await test('zero gear warehouse deletes, reload stays deleted, bundle restores with references intact',async()=>{
    const f=setup(),gear={id:'g',name:'가상 장비',place:'시험A',qty:0,maintenance:[{memo:'가상 점검'}]};f.state().equipment=[gear];f.state().records=[record({equipmentItems:[{id:'g',qty:1,returnedQty:1,place:'시험A'}]})];
    await f.c.deleteManagedWarehouse('시험A');assert.ok(!f.state().warehouses.includes('시험A'));assert.equal(f.state().equipment.length,0);assert.ok(f.state().removedEquipmentIds.includes('g'));assert.equal(f.state().records.length,1);
    const entry=f.state().trash[0],normalized=f.c.normalize(copy(f.state()));assert.ok(!normalized.warehouses.includes('시험A'));assert.ok(!normalized.equipment.some(item=>item.id==='g'||item.place==='시험A'));assert.equal(entry.data.equipment[0].maintenance[0].memo,'가상 점검');
    assert.equal(f.c.canRestoreTrashEntry(entry),true);f.c.restoreWarehouseTrashData(entry.data);assert.ok(f.state().warehouses.includes('시험A'));assert.deepEqual(copy(f.state().equipment[0]),gear);assert.ok(!f.state().removedEquipmentIds.includes('g'));assert.equal(f.state().warehouseInfos.시험A.memo,'가상 메모');
  });
  await test('delete cancellation leaves everything intact',async()=>{const f=setup(),before=copy(f.state());f.c.askConfirm=async()=>false;await f.c.deleteManagedWarehouse('시험A');assert.deepEqual(copy(f.state()),before);});
  await test('delete storage failure restores zero gear and warehouse',async()=>{const f=setup();f.state().equipment=[{id:'g',place:'시험A',qty:0}];const before=copy(f.state());f.fail(KEY);await f.c.deleteManagedWarehouse('시험A');assert.deepEqual(copy(f.state()),before);});
  await test('stock changed during confirmation prevents deletion',async()=>{const f=setup();f.c.askConfirm=async()=>{f.state().stock.시험A.시험흡착재=2;return true;};await f.c.deleteManagedWarehouse('시험A');assert.ok(f.state().warehouses.includes('시험A'));assert.equal(f.state().stock.시험A.시험흡착재,2);});
  await test('restore rejects bundled ID collision and malformed duplicate IDs',()=>{
    const f=setup(),data={name:'삭제창고',equipment:[{id:'g',place:'삭제창고',qty:0}]};f.state().equipment=[{id:'g',place:'시험A',qty:1}];assert.equal(f.c.canRestoreTrashEntry({kind:'warehouse',data}),false);assert.throws(()=>f.c.restoreWarehouseTrashData(data));
    f.state().equipment=[];data.equipment.push({...data.equipment[0]});assert.equal(f.c.canRestoreTrashEntry({kind:'warehouse',data}),false);
  });
  await test('legacy deleted warehouse without bundled gear still restores',()=>{const f=setup();f.c.restoreWarehouseTrashData({name:'이전창고',stock:{시험흡착재:0},info:{memo:'이전'},warehouseKind:'창고'});assert.ok(f.state().warehouses.includes('이전창고'));});
  console.log('DONE '+passed+' layout and warehouse cases');
})().catch(error=>{console.error('FAIL',error);process.exitCode=1;});
