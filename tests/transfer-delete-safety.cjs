// Guard regression tests use production deletion/transfer functions in fake storage.
const assert=require('node:assert/strict');
const {fixture,copy,KEY}=require('./field-stability.cjs');
const {deletionFixture,useProductionConfirmation}=require('./critical-sequences.cjs');
let passed=0;
async function test(name,operation){await operation();passed++;console.log('PASS '+name);}
function chain(){
  const f=fixture(),c=f.c;f.state().warehouses.push('시험C');f.state().stock.시험C={시험흡착재:0,시험기름:0};f.run('refreshGlobals(state)');
  f.state().equipment=[{id:'g',name:'시험장비',place:'시험A',qty:3}];
  const first=c.applyEquipmentTransfers([{id:'g',name:'시험장비',qty:1}],'시험A','시험B');
  const second=c.applyEquipmentTransfers([{id:'g',name:'시험장비',qty:2}],'시험A','시험C');
  return {...f,first,second,record:{id:'first',flow:'이송',status:'done',warehouse:'시험A',targetWarehouse:'시험B',items:[],equipmentItems:first}};
}
function fullUse(){
  const f=fixture(),c=f.c;f.state().equipment=[{id:'g',name:'시험장비',place:'시험A',qty:3}];
  const moved=c.applyEquipmentTransfers([{id:'g',name:'시험장비',qty:3}],'시험A','시험B');f.state().equipment[0].qty=5;
  f.state().records=[{id:'use',flow:'출고',status:'done',warehouse:'시험B',items:[],equipmentItems:[{id:'g',name:'시험장비',place:'시험B',qty:2}]}];
  return {...f,moved,record:{id:'transfer',flow:'이송',status:'done',warehouse:'시험A',targetWarehouse:'시험B',items:[],equipmentItems:moved}};
}
(async()=>{
  await test('partial chain preflight blocks old cancellation without any mutation',()=>{const f=chain(),before=copy(f.state());assert.equal(f.c.canReverseRecord(f.record),false);assert.deepEqual(copy(f.state()),before);});
  await test('partial chain low-level reversal rejects before destination reduction',()=>{const f=chain(),before=copy(f.state());assert.throws(()=>f.c.restoreEquipmentTransfer(f.first[0]),/이후 이동/);assert.deepEqual(copy(f.state()),before);});
  await test('reversing latest transfer first permits the earlier cancellation safely',()=>{const f=chain();f.second.forEach(entry=>f.c.restoreEquipmentTransfer(entry));assert.equal(f.c.canReverseRecord(f.record),true);f.first.forEach(entry=>f.c.restoreEquipmentTransfer(entry));assert.equal(f.state().equipment.length,1);assert.equal(f.state().equipment[0].qty,3);assert.equal(f.state().equipment[0].place,'시험A');});
  await test('full transfer active usage blocks cancellation without changing IDs',()=>{const f=fullUse(),before=copy(f.state());assert.equal(f.c.canReverseRecord(f.record),false);assert.deepEqual(copy(f.state()),before);});
  await test('full transfer low-level guard preserves usage and original quantities',()=>{const f=fullUse(),before=copy(f.state());assert.throws(()=>f.c.restoreEquipmentTransfer(f.moved[0]),/사용 중/);assert.deepEqual(copy(f.state()),before);});
  await test('fully returned equipment no longer blocks legitimate full split',()=>{const f=fullUse();f.state().records[0].equipmentItems[0].returnedQty=2;assert.equal(f.c.canReverseRecord(f.record),true);f.c.restoreEquipmentTransfer(f.moved[0]);assert.equal(f.state().equipment.find(g=>g.id==='g').qty,3);assert.equal(f.state().equipment.find(g=>g.place==='시험B').qty,2);});
  await test('pending deletion never changes inventory or equipment',async()=>{const f=deletionFixture();f.state().records[0].status='pending';const stock=copy(f.state().stock);assert.equal(await f.button.handler(),true);assert.deepEqual(copy(f.state().stock),stock);assert.equal(f.state().trash[0].data.status,'pending');});
  for(const mode of ['edit','replace','finalize'])await test('confirmation '+mode+' refuses stale record operation',async()=>{
    const f=deletionFixture();if(mode==='finalize')f.state().records[0].status='pending';useProductionConfirmation(f);const pending=f.button.handler();
    if(mode==='edit')f.state().records[0].memo='확인 중 수정';
    if(mode==='replace')f.state().records=[copy(f.state().records[0])];
    if(mode==='finalize')f.state().records[0].status='done';
    f.elements.acceptConfirm.handler();assert.equal(await pending,false);assert.equal(f.state().stock.시험A.시험흡착재,10);assert.equal(f.state().records.length,1);assert.equal((f.state().trash||[]).length,0);
  });
  await test('stale deleted button cannot apply another stock reversal',async()=>{const f=deletionFixture();await f.button.handler();assert.equal(await f.button.handler(),false);assert.equal(f.state().stock.시험A.시험흡착재,12);assert.equal(f.state().trash.length,1);});
  await test('five concurrent delete requests open only one real confirmation',async()=>{const f=deletionFixture();useProductionConfirmation(f);const jobs=Array.from({length:5},()=>f.button.handler());f.elements.acceptConfirm.handler();const results=await Promise.all(jobs);assert.equal(results.filter(Boolean).length,1);assert.equal(f.state().stock.시험A.시험흡착재,12);assert.equal(f.state().trash.length,1);});
  await test('cancelled real confirmation leaves state and disk untouched',async()=>{const f=deletionFixture(),before=copy(f.state());useProductionConfirmation(f);const pending=f.button.handler();f.elements.cancelConfirm.handler();assert.equal(await pending,false);assert.deepEqual(copy(f.state()),before);assert.equal(f.disk.has(KEY),false);});
  await test('external disk change while confirming preserves newer saved data',async()=>{const f=deletionFixture();f.run('save()');const before=copy(f.state());useProductionConfirmation(f);const pending=f.button.handler();const newer={...before,memos:[{id:'newer',body:'다른 창의 자료'}]};f.disk.set(KEY,JSON.stringify(newer));f.elements.acceptConfirm.handler();assert.equal(await pending,false);assert.deepEqual(copy(f.state()),before);assert.equal(JSON.parse(f.disk.get(KEY)).memos[0].id,'newer');});
  await test('unexpected transfer failure rolls back material reversal and trash',async()=>{
    const f=deletionFixture(),record=f.state().records[0];Object.assign(record,{flow:'이송',targetWarehouse:'시험B',equipmentItems:[{id:'g',qty:1}]});
    const before=copy(f.state());f.c.canReverseRecord=()=>true;f.c.restoreEquipmentTransfer=()=>{throw Error('가상 역이송 실패');};
    assert.equal(await f.button.handler(),false);assert.deepEqual(copy(f.state()),before);assert.equal(f.disk.has(KEY),false);
  });
  console.log(`DONE ${passed} transfer/delete safety checks; synthetic storage; zero external requests`);
})().catch(error=>{console.error(error);process.exitCode=1;});
