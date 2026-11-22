const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const src=fs.readFileSync(require.resolve("../app.js"),"utf8");
function load(name,ctx){const pos=src.indexOf("function "+name+"(");assert.ok(pos>=0);vm.runInNewContext(src.slice(pos,src.indexOf("\n}",pos)+2),ctx);}
const c={state:{stock:{A:{M:5},B:{M:8}}},warehouses:["A","B"],draftItems:[{name:"M",warehouse:"A",qty:8},{name:"M",warehouse:"B",qty:4}],registerFlow:"출고",itemWarehouse:(i,b)=>i.warehouse||b,addQuantities:(a,b)=>Math.round((+a + +b)*1e6)/1e6};
load("draftSplitPlan",c);const initial=JSON.stringify(c.state);
assert.equal(JSON.stringify(c.draftSplitPlan(0,"A")),JSON.stringify([{warehouse:"A",qty:5},{warehouse:"B",qty:3}]));
c.draftItems[0].qty=10;assert.equal(c.draftSplitPlan(0,"A"),null);
c.draftItems[0].qty=5;assert.equal(c.draftSplitPlan(0,"A"),null);
c.registerFlow="입고";assert.equal(c.draftSplitPlan(0,"A"),null);assert.equal(initial,JSON.stringify(c.state));
load("caseAdditionSummary",c);const m={name:"A",unit:"kg",qty:3},g={id:"g",name:"A",qty:2};
assert.equal(c.caseAdditionSummary({items:[m],equipmentItems:[g]},[{...m,qty:1}],[{...g,qty:1}]),"A · 3 + 1 = 4 kg\nA · 2 + 1 = 3 대");
console.log("PASS split allocation respects reservations and never mutates stock; incident totals preserve units");
