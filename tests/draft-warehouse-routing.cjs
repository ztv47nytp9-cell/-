const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const src=fs.readFileSync(require.resolve('../app.js'),'utf8'),ctx={
  registerFlow:'출고',warehouses:['A','B','C','D'],itemWarehouse:(r,b)=>r.warehouse||b,
  draftItems:[{name:'대상',warehouse:'A',qty:7.5}],draftEquipmentItems:[],addQuantities:(a,b)=>Math.round((+a + +b)*1e6)/1e6,
  state:{stock:{A:{대상:2},B:{대상:1},C:{대상:2},D:{대상:6}},equipment:[{id:'g',name:'시험 장비',place:'A'}]},
};
function load(name){const begin=src.indexOf('function '+name+'(');vm.runInNewContext(src.slice(begin,src.indexOf('\n}',begin)+2),ctx);}
load('draftSplitPlan');load('swapDraftRoute');
const plan=()=>JSON.parse(JSON.stringify(ctx.draftSplitPlan(0,'A'))),before=JSON.stringify(ctx.state.stock);
assert.deepEqual(plan(),[{warehouse:'A',qty:2},{warehouse:'D',qty:5.5}]);
ctx.draftItems.push({name:'대상',warehouse:'D',qty:3});assert.deepEqual(plan(),[{warehouse:'A',qty:2},{warehouse:'D',qty:3},{warehouse:'C',qty:2},{warehouse:'B',qty:.5}]);
assert.equal(JSON.stringify(ctx.state.stock),before);
const select={scrollIntoView:()=>select.scrolled=true},from={value:'A'},to={value:'B'};
ctx.document={getElementById:id=>id==='recWarehouse'?from:to,querySelector:s=>s==='[data-equipment-name="1"]'?select:null};
ctx.fieldError=(target,msg)=>{assert.equal(target,select);assert.ok(select.scrolled);assert.match(msg,/시험 장비 · 현재 A.*B/);select.received=true;};
ctx.draftItems=[];ctx.state.equipment.push({id:'other',name:'다른 장비',place:'B'});
ctx.draftEquipmentItems=[{id:'other'},{id:'g'}];ctx.swapDraftRoute();
assert.ok(select.received);assert.equal(from.value,'A');assert.equal(to.value,'B');
console.log('PASS atomic route rejection identifies offending row and place; split minimises extra warehouses using unreserved stock');
