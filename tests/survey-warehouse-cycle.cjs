// End-to-end production handlers with synthetic storage only. No browser or network.
const vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,slice,copy,app,KEY}=require('./field-stability.cjs');
(async()=>{
  for(let round=1;round<=10;round++){
    const f=fixture(),c=f.c;
    Object.assign(c,{readRegisterDraft:()=>null,scrollToTop(){},replaceNavigationState(){},updateBottomNav(){},warehouseTab:'material',warehouseKind:()=> '창고',warehouseImpactText:()=> '가상 영향 요약',showResourceBlock:(kind,id,message)=>{throw Error(message);}});
    vm.runInContext(slice(app,'function warehouseRecordInUse(','function deleteManagedResource(')+slice(app,'function deleteManagedWarehouse(','\ninit();')+slice(app,'function restoreWarehouseTrashData(','function openTrash('),c);
    c.openWarehouseManagement=()=>{};
    f.run('state.stock.시험A.시험흡착재=0;state.stock.시험A.시험기름=0;state.assetOps={};state.warehouseInfos={시험A:{memo:"가상 창고 메모"},시험B:{}};state.warehouseKinds={시험A:"창고",시험B:"창고"};state.equipment=[{id:"zero",name:"가상 장비",qty:0,place:"시험A",maintenance:[{memo:"가상 점검"}]}];state.records=[{id:"old",status:"done",warehouse:"시험A",items:[]}];state.survey={active:true,index:0,scope:{warehouse:"all",category:"all"},items:[{warehouse:"시험A",name:"시험흡착재",unit:"kg"},{warehouse:"시험B",name:"시험흡착재",unit:"kg"}],values:{"시험A|시험흡착재":0,"시험B|시험흡착재":7},checked:{"시험A|시험흡착재":true,"시험B|시험흡착재":true},baseline:{"시험A|시험흡착재":0,"시험B|시험흡착재":8}};');
    f.state().survey.values['시험B|시험흡착재']=round;
    const before=copy(f.state());
    assert.match(c.deletionBlock('warehouse','시험A'),/진행 중 실사/);
    assert.equal(await c.stopFastSurvey({warehouse:'시험A'}),true);
    assert.equal(c.deletionBlock('warehouse','시험A'),'');
    assert.deepEqual(copy(f.state().stock),before.stock);
    await c.deleteManagedWarehouse('시험A');
    assert.ok(!f.state().warehouses.includes('시험A'));
    assert.ok(!f.state().equipment.some(item=>item.id==='zero'));
    assert.deepEqual(copy(f.state().records),before.records);
    const entry=f.state().trash.find(item=>item.kind==='warehouse');
    assert.equal(c.canRestoreTrashEntry(entry),true);
    c.restoreWarehouseTrashData(entry.data);
    f.state().trash=f.state().trash.filter(item=>item!==entry);
    c.save();
    const persisted=JSON.parse(f.disk.get(KEY));
    assert.ok(persisted.warehouses.includes('시험A'));
    assert.deepEqual(persisted.equipment,before.equipment);
    assert.deepEqual(persisted.stock,before.stock);
    assert.equal(persisted.warehouseInfos.시험A.memo,'가상 창고 메모');
    assert.equal(persisted.survey.active,true);
    assert.equal(persisted.survey.values['시험B|시험흡착재'],round);
    assert.deepEqual(persisted.survey.items.map(item=>item.warehouse),['시험B']);
    assert.equal(c.readSafetyPoints()[0].state.survey.items.length,2);
    console.log(`PASS CYCLE ${round}: stop A -> delete -> restore; B input, stock and history preserved`);
  }
  console.log('DONE 10 survey/warehouse cycles; zero external requests');
})().catch(error=>{console.error('FAIL',error);process.exitCode=1;});
