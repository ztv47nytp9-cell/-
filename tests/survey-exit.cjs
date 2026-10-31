// Actual production handlers, fake DOM/storage only. No user profile or network.
const vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,slice,copy,app,KEY}=require('./field-stability.cjs');
function setup(){
  const f=fixture(),c=f.c;
  Object.assign(c,{page:'home',readRegisterDraft:()=>null,scrollToTop(){},replaceNavigationState(){},updateBottomNav(){},warehouseTab:'material',setPage:page=>f.destination=page});
  c.document.querySelectorAll=()=>[];
  vm.runInContext(slice(app,'function warehouseRecordInUse(','function deleteManagedResource('),c);
  c.openWarehouseManagement=place=>f.management=place;
  f.run('state.assetOps={};state.survey={active:true,index:0,scope:{warehouse:"all"},items:[{warehouse:"시험A",name:"시험흡착재",unit:"kg"},{warehouse:"시험B",name:"시험흡착재",unit:"kg"}],values:{"시험A|시험흡착재":15,"시험B|시험흡착재":7},checked:{"시험A|시험흡착재":true,"시험B|시험흡착재":true},baseline:{"시험A|시험흡착재":20,"시험B|시험흡착재":8},lastApplied:{changes:[{warehouse:"시험B",name:"시험흡착재",before:9,after:8}]},lastSummary:{checked:1,memo:"기존 결과"}};');
  return f;
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
  await test('stop whole survey does not change stock, history or prior applied result',async()=>{
    const f=setup(),stock=copy(f.state().stock),records=copy(f.state().records),last=copy(f.state().survey.lastApplied),summary=copy(f.state().survey.lastSummary);
    assert.equal(await f.c.stopFastSurvey(),true);assert.equal(f.state().survey.active,false);assert.deepEqual(copy(f.state().stock),stock);assert.deepEqual(copy(f.state().records),records);assert.deepEqual(copy(f.state().survey.lastApplied),last);assert.deepEqual(copy(f.state().survey.lastSummary),summary);assert.equal(f.destination,'home');assert.equal(f.c.readSafetyPoints()[0].state.survey.values['시험A|시험흡착재'],15);
  });
  await test('stop one warehouse keeps other survey inputs, baseline and scope usable',async()=>{
    const f=setup(),stock=copy(f.state().stock);assert.equal(await f.c.stopFastSurvey({warehouse:'시험A'}),true);
    const s=f.state().survey;assert.equal(s.active,true);assert.deepEqual(copy(s.items.map(item=>item.warehouse)),['시험B']);assert.deepEqual(copy(s.values),{'시험B|시험흡착재':7});assert.deepEqual(copy(s.checked),{'시험B|시험흡착재':true});assert.deepEqual(copy(s.baseline),{'시험B|시험흡착재':8});assert.equal(f.management,'시험A');assert.equal(f.c.warehouseSurveyInUse('시험A'),false);assert.equal(f.c.warehouseSurveyInUse('시험B'),true);assert.deepEqual(copy(f.state().stock),stock);
  });
  await test('stopping last target finishes survey and unblocks only an empty warehouse',async()=>{
    const f=setup();f.state().survey.items=f.state().survey.items.slice(0,1);f.state().stock.시험A={};await f.c.stopFastSurvey({warehouse:'시험A'});assert.equal(f.state().survey.active,false);assert.equal(f.c.deletionBlock('warehouse','시험A'),'');
  });
  for(const kind of ['stock','equipment','fuel','pending'])await test('stop survey still protects '+kind,async()=>{
    const f=setup();f.state().stock.시험A={};if(kind==='stock')f.state().stock.시험A.시험흡착재=1;if(kind==='equipment')f.state().equipment=[{id:'g',qty:1,place:'시험A'}];if(kind==='fuel')f.state().assetOps.시험A={fuelBase:2};if(kind==='pending')f.state().records=[{id:'p',status:'pending',warehouse:'시험A',items:[{name:'시험흡착재',warehouse:'시험A',qty:1}]}];await f.c.stopFastSurvey({warehouse:'시험A'});assert.ok(f.c.deletionBlock('warehouse','시험A'));
  });
  await test('all warehouse block reasons appear together',()=>{const f=setup();f.state().equipment=[{id:'g',qty:1,place:'시험A'}];f.state().assetOps.시험A={fuelBase:3};const reasons=copy(f.c.warehouseDeletionReasons('시험A'));assert.equal(reasons.length,4);assert.ok(reasons.some(s=>s.includes('진행 중 실사')));assert.ok(reasons.some(s=>s.startsWith('재고')));assert.ok(reasons.some(s=>s.includes('보유·사용')));assert.ok(reasons.some(s=>s.includes('연료')));});
  await test('cancel stopping survey leaves state and safety points untouched',async()=>{const f=setup(),before=copy(f.state());f.c.askConfirm=async()=>false;assert.equal(await f.c.stopFastSurvey(),false);assert.deepEqual(copy(f.state()),before);assert.equal(f.c.readSafetyPoints().length,0);});
  await test('changed data during confirmation stops the stop operation',async()=>{const f=setup();f.c.askConfirm=async()=>{f.state().stock.시험A.시험흡착재=19;return true;};assert.equal(await f.c.stopFastSurvey(),false);assert.equal(f.state().survey.active,true);assert.equal(f.state().stock.시험A.시험흡착재,19);assert.equal(f.c.readSafetyPoints().length,0);});
  await test('safety-point quota failure keeps active survey and input',async()=>{const f=setup(),before=copy(f.state());f.fail('all');assert.equal(await f.c.stopFastSurvey(),false);assert.deepEqual(copy(f.state()),before);});
  await test('primary storage failure rolls the stopped survey back',async()=>{const f=setup(),before=copy(f.state());f.fail(KEY);assert.equal(await f.c.stopFastSurvey(),false);assert.deepEqual(copy(f.state()),before);});
  await test('repeated stop has one confirmation and one safety point',async()=>{const f=setup();await Promise.all([f.c.stopFastSurvey(),f.c.stopFastSurvey()]);assert.equal(f.confirms(),1);assert.equal(f.c.readSafetyPoints().length,1);assert.equal(f.state().survey.active,false);});
  await test('outdated warehouse stop action cannot stop another warehouse',async()=>{const f=setup();f.state().survey.items=f.state().survey.items.slice(1);const before=copy(f.state());assert.equal(await f.c.stopFastSurvey({warehouse:'시험A'}),false);assert.deepEqual(copy(f.state()),before);assert.equal(f.confirms(),0);});
  await test('empty legacy active survey can be explicitly stopped',async()=>{const f=setup();f.state().survey={active:true,items:[],values:{},checked:{}};await f.c.stopFastSurvey();assert.equal(f.state().survey.active,false);});
  await test('warehouse restore is not blocked by an unrelated active survey',()=>{const f=setup();f.state().survey.items=f.state().survey.items.slice(1);f.run('state.warehouses=["시험A"];refreshGlobals(state);');assert.equal(f.c.canRestoreTrashEntry({kind:'warehouse',data:{name:'삭제창고'}}),true);assert.equal(f.c.canRestoreTrashEntry({kind:'warehouse',data:{name:'시험B'}}),false);});
  await test('pause stores visible single input without applying stock',async()=>{const f=setup(),stock=copy(f.state().stock);f.elements.fastSurveyQty={value:'12.5'};assert.equal(await f.c.pauseFastSurvey(),true);assert.equal(f.state().survey.values['시험A|시험흡착재'],12.5);assert.equal(f.state().survey.active,true);assert.deepEqual(copy(f.state().stock),stock);assert.equal(f.destination,'home');});
  await test('pause preserves a cleared field as unchecked',async()=>{const f=setup();f.elements.fastSurveyQty={value:''};await f.c.pauseFastSurvey();assert.equal(f.state().survey.checked['시험A|시험흡착재'],false);assert.ok(!('시험A|시험흡착재' in f.state().survey.values));});
  await test('pause validates quantities and stays on the input screen',async()=>{const f=setup(),before=copy(f.state());f.elements.fastSurveyQty={value:'-1'};assert.equal(await f.c.pauseFastSurvey(),false);assert.deepEqual(copy(f.state()),before);assert.equal(f.destination,undefined);});
  await test('pause quota failure retains current survey and visible input',async()=>{const f=setup(),before=copy(f.state());f.elements.fastSurveyQty={value:'12'};f.fail(KEY);assert.equal(await f.c.pauseFastSurvey(),false);assert.deepEqual(copy(f.state()),before);assert.equal(f.elements.fastSurveyQty.value,'12');assert.equal(f.destination,undefined);});
  await test('pause from batch stores both visible rows without stock changes',async()=>{const f=setup(),stock=copy(f.state().stock);f.c.document.querySelectorAll=()=>[{dataset:{batch:'0'},value:'11'},{dataset:{batch:'1'},value:'6'}];await f.c.pauseFastSurvey();assert.deepEqual(copy(f.state().survey.values),{'시험A|시험흡착재':11,'시험B|시험흡착재':6});assert.deepEqual(copy(f.state().stock),stock);});
  await test('pause with warehouse return restores the warehouse management destination',async()=>{const f=setup();f.run('fastSurveyReturnWarehouse="시험A"');await f.c.pauseFastSurvey();assert.equal(f.management,'시험A');assert.equal(f.destination,undefined);assert.equal(f.run('fastSurveyReturnWarehouse'), '');});
  await test('continue from warehouse opens its own survey item',()=>{const f=setup();f.state().survey.index=1;f.c.enterFastSurvey('시험A');assert.equal(f.state().survey.index,0);assert.equal(f.run('fastSurveyReturnWarehouse'),'시험A');assert.equal(JSON.parse(f.disk.get(KEY)).survey.index,0);});
  await test('continue position write failure leaves existing survey intact',()=>{const f=setup();f.state().survey.index=1;const before=copy(f.state());f.fail(KEY);assert.equal(f.c.enterFastSurvey('시험A'),false);assert.deepEqual(copy(f.state()),before);assert.equal(f.run('fastSurveyReturnWarehouse'),'');});
  console.log('DONE '+passed+' survey exit and warehouse guards');
})().catch(error=>{console.error('FAIL',error);process.exitCode=1;});
