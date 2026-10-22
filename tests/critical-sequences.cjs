// Sequential/race regression probes. Real production handlers, synthetic VM only.
const vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,slice,copy,app,KEY}=require('./field-stability.cjs');
const variant=Math.max(1,Number(process.env.VICTOR_TEST_CYCLE)||1);
let passed=0,failed=0;
async function test(name,operation){try{await operation();passed++;console.log('PASS '+name);}catch(error){failed++;console.log('FAIL '+name+' :: '+error.message.replace(/\s+/g,' ').slice(0,1100));}}
function deletionFixture(){
  const f=fixture();f.state().stock.시험A.시험흡착재=10;
  const r={id:'issue',flow:'출고',status:'done',warehouse:'시험A',items:[{name:'시험흡착재',qty:2,warehouse:'시험A',before:12,after:10}],equipmentItems:[]};
  f.state().records=[r];const button={addEventListener:(event,handler)=>button.handler=handler};f.elements.deleteRecord=button;
  Object.assign(f.c,{r,id:r.id,setPage:()=>{}});
  assert.equal((app.match(/addEventListener\("click",\(\)=>deleteHistoryRecord\(id,r\)\)/g)||[]).length,2,'pending and completed records use the guarded delete handler');
  vm.runInContext(slice(app,'async function deleteHistoryRecord(','function openPartialReturn('),f.c);
  button.handler=()=>f.c.deleteHistoryRecord(r.id,r);
  return {...f,button};
}
function useProductionConfirmation(f){
  const classes=new Set(),dialog={scrollTop:0,firstChild:null,replaceChildren(){},append(){},contains:()=>false,focus(){}};
  f.elements.entryDialog=dialog;f.elements.entryModal={classList:{contains:key=>classes.has(key),add:key=>classes.add(key),remove:key=>classes.delete(key)}};
  for(const id of ['acceptConfirm','cancelConfirm'])f.elements[id]={addEventListener:(event,handler)=>f.elements[id].handler=handler};
  f.c.document.createDocumentFragment=()=>({append(){}});
  Object.assign(f.c,{modalConfirmResolver:null,entryFormBaseline:'',entryExtraDirtyCheck:null,entryHeader:()=>'',openEntryModal:()=>classes.add('show'),unlockPageScroll(){},restoreEntryFocus(){}});
  vm.runInContext(slice(app,'function askConfirm(','function requestUploadPin('),f.c);
}
module.exports={deletionFixture,useProductionConfirmation};
if(require.main===module)(async()=>{
  await test('SEQUENCE multi-place receive issue cancel keeps decimal balances',()=>{
    const f=fixture(),c=f.c,qty=c.addQuantities(variant/10,0.2),initial=copy(f.state().stock);
    const incoming=[{name:'시험기름',warehouse:'시험A',qty},{name:'시험흡착재',warehouse:'시험B',qty:variant}];
    const receipt=c.stockChangeItems('시험A',incoming,'입고');c.applyStock('시험A',receipt,'입고');
    const outgoing=[{name:'시험기름',warehouse:'시험A',qty:0.1},{name:'시험기름',warehouse:'시험A',qty:0.2},{name:'시험흡착재',warehouse:'시험B',qty:variant}];
    assert.equal(c.stockAvailable('시험A',outgoing),true);const issue=c.stockChangeItems('시험A',outgoing,'출고');c.applyStock('시험A',issue,'출고');
    c.reverseStock('시험A',issue,'출고');c.reverseStock('시험A',receipt,'입고');assert.deepEqual(copy(f.state().stock),initial);
  });
  await test('SEQUENCE old build upgrade preserves source data and safety point',()=>{
    const f=fixture(),raw=copy(f.state());raw.appBuild='119';raw.memos=[{id:'memo-'+variant,body:'가상 메모'}];raw.records=[{id:'old-'+variant,status:'pending',flow:'사고',items:[]}];
    f.disk.set(KEY,JSON.stringify(raw));f.run('state=loadState();refreshGlobals(state);save()');
    assert.equal(f.state().appBuild,'120');assert.equal(f.state().memos[0].id,'memo-'+variant);assert.equal(f.state().records[0].id,'old-'+variant);
    const points=JSON.parse(f.disk.get('victor_safety_points_v1'));assert.equal(points[0].state.appBuild,'119');assert.equal(points[0].state.memos[0].id,'memo-'+variant);
    f.run('state=loadState();refreshGlobals(state)');assert.equal(f.state().records[0].status,'pending');assert.equal(f.state().stock.시험A.시험흡착재,20);
  });
  await test('SEQUENCE another-window save refuses overwriting newer disk data',()=>{
    const f=fixture();f.run('save()');const prior=copy(f.state());f.disk.set(KEY,JSON.stringify({...prior,memos:[{id:'external',body:'다른 창'}]}));
    f.state().stock.시험A.시험흡착재=variant;assert.equal(f.c.saveStateTransaction(JSON.stringify(prior)),false);
    assert.equal(f.state().stock.시험A.시험흡착재,20);assert.equal(JSON.parse(f.disk.get(KEY)).memos[0].id,'external');
  });
  await test('SEQUENCE partial gear transfer cancel restore repeated retains totals',()=>{
    const f=fixture(),c=f.c,total=variant+3;f.state().equipment=[{id:'g',name:'시험장비',place:'시험A',qty:total}];
    for(let n=0;n<5;n++){
      const moved=c.applyEquipmentTransfers([{id:'g',name:'시험장비',qty:variant}],'시험A','시험B'),r={id:'r',status:'done',flow:'이송',warehouse:'시험A',targetWarehouse:'시험B',items:[],equipmentItems:moved};
      assert.equal(c.canReverseRecord(r),true);moved.forEach(row=>c.restoreEquipmentTransfer(row));assert.equal(c.canRestoreTrashEntry({kind:'record',data:r}),true);
      assert.equal(f.state().equipment.reduce((sum,g)=>sum+g.qty,0),total);assert.equal(f.state().equipment.find(g=>g.id==='g').qty,total);
    }
  });
  await test('SEQUENCE normal record deletion reverses stock once',async()=>{
    const f=deletionFixture();await f.button.handler();assert.equal(f.state().stock.시험A.시험흡착재,12);assert.equal(f.state().records.length,0);assert.equal(f.state().trash.length,1);
  });
  await test('RACE production confirmation blocks duplicate record deletion',async()=>{
    const f=deletionFixture();useProductionConfirmation(f);
    const a=f.button.handler(),b=f.button.handler();f.elements.acceptConfirm.handler();await Promise.all([a,b]);
    assert.equal(f.state().stock.시험A.시험흡착재,12,'one issue deletion must return only 2 units, not 4');assert.equal(f.state().trash.length,1);
  });
  await test('RACE record changed during delete confirmation must not use stale row',async()=>{
    const f=deletionFixture();useProductionConfirmation(f);const pending=f.button.handler();
    // Simulate an independent in-memory operation completing before acceptance.
    f.state().records=[];f.state().stock.시험A.시험흡착재=12;f.elements.acceptConfirm.handler();
    await pending;assert.equal(f.state().stock.시험A.시험흡착재,12,'already deleted record must not return quantity again');
  });
  await test('SEQUENCE full gear transfer cancel preserves usage location',()=>{
    const f=fixture(),c=f.c,total=variant+2;f.state().equipment=[{id:'g',name:'시험장비',place:'시험A',qty:total}];
    const moved=c.applyEquipmentTransfers([{id:'g',name:'시험장비',qty:total}],'시험A','시험B');f.state().equipment[0].qty+=2;
    f.state().records=[{id:'use',flow:'출고',status:'done',warehouse:'시험B',items:[],equipmentItems:[{id:'g',name:'시험장비',place:'시험B',qty:2}]}];
    const r={id:'transfer',flow:'이송',status:'done',warehouse:'시험A',targetWarehouse:'시험B',items:[],equipmentItems:moved};
    if(c.canReverseRecord(r))moved.forEach(entry=>c.restoreEquipmentTransfer(entry));
    const usage=f.state().records[0].equipmentItems[0],gear=f.state().equipment.find(g=>g.id===usage.id);
    assert.equal(gear.place,'시험B','usage must stay linked to the destination, or cancellation must be blocked');
  });
  await test('SEQUENCE failed delete can be retried without losing original state',async()=>{
    const f=deletionFixture();f.fail(KEY);await f.button.handler();assert.equal(f.state().stock.시험A.시험흡착재,10);assert.equal(f.state().records.length,1);
    f.fail('');await f.button.handler();assert.equal(f.state().stock.시험A.시험흡착재,12);assert.equal(f.state().records.length,0);
  });
  console.log(`DONE ${passed+failed} critical sequence checks; ${passed} passed; ${failed} failed; variant ${variant}; zero external requests`);
  process.exitCode=failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
