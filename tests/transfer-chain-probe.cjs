// Multi-hop equipment transfers; test-only state, no product mutation or network.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture}=require('./field-stability.cjs');
const out=path.resolve(__dirname,'../../outputs',process.env.VICTOR_AUDIT_OUTPUT||'field-audit-10'),results=[];
for(let round=1;round<=10;round++){
  const f=fixture(),c=f.c,total=round+2;
  f.state().warehouses.push('시험C');f.state().stock.시험C={시험흡착재:0,시험기름:0};f.run('refreshGlobals(state)');
  f.state().equipment=[{id:'g',name:'시험장비',place:'시험A',qty:total}];
  const first=c.applyEquipmentTransfers([{id:'g',name:'시험장비',qty:1}],'시험A','시험B');
  const record={id:'first',status:'done',flow:'이송',warehouse:'시험A',targetWarehouse:'시험B',items:[],equipmentItems:first};
  c.applyEquipmentTransfers([{id:'g',name:'시험장비',qty:total-1}],'시험A','시험C');
  const before=f.state().equipment.filter(g=>g.place==='시험C').reduce((sum,g)=>sum+g.qty,0),allowed=c.canReverseRecord(record);
  if(allowed)first.forEach(entry=>c.restoreEquipmentTransfer(entry));
  const after=f.state().equipment.filter(g=>g.place==='시험C').reduce((sum,g)=>sum+g.qty,0);
  try{
    assert.equal(after,before,'cancelling first transfer must not move stock from a later unrelated destination');
    results.push({round,status:'pass',allowed,before,after});
  }catch(error){results.push({round,status:'fail',allowed,before,after,error:error.message});}
  console.log(`${results.at(-1).status.toUpperCase()} CHAIN round ${round}: third warehouse ${before} -> ${after}; first cancel allowed=${allowed}`);
}
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'transfer-chain.json'),JSON.stringify({scope:'Synthetic multi-hop transfer cancellation, 10 quantity variants',results},null,2));
console.log(`DONE ${results.length} extra chain checks; ${results.filter(r=>r.status==='fail').length} failed; zero external requests`);
process.exitCode=results.some(r=>r.status==='fail')?1:0;
