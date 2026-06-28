const VERSION = "Alpha 0.18.4";
const KEY = "victor_state_alpha_0_18_4";
const MIGRATE_KEYS = [
  "victor_state_alpha_0_18_3",
  "victor_state_alpha_0_18_2",
  "victor_state_alpha_0_18_1",
  "victor_state_alpha_0_18",
  "victor_state_alpha_0_17_3",
  "victor_state_alpha_0_17_2",
  "victor_state_alpha_0_17_1",
  "victor_state_alpha_0_17",
  "victor_state_alpha_0_16",
  "victor_state_alpha_0_15_1",
  "victor_state"
];

const defaultWarehouses = ["통영해양경찰서","전용부두","VTS","장승포","한국석유공사 거제지사 창고","방제지휘차량","소형방제정"];

const defaultCatalog = [
  {cat:"유흡착재",name:"매트형 유흡착재",unit:"kg",spec:"10kg/1BOX",kind:"consume"},
  {cat:"유흡착재",name:"로프형 유흡착재",unit:"kg",spec:"10kg/1BOX",kind:"consume"},
  {cat:"유흡착재",name:"펜스형 유흡착재",unit:"kg",spec:"20kg/1BOX",kind:"consume"},
  {cat:"유흡착재",name:"롤형 유흡착재",unit:"kg",spec:"10kg/1BOX",kind:"consume"},
  {cat:"유흡착재",name:"중질유 부착재",unit:"kg",spec:"10kg/1BOX",kind:"consume"},
  {cat:"유처리제",name:"유처리제",unit:"L",spec:"",kind:"consume"},
  {cat:"오일펜스",name:"A형 오일펜스",unit:"m",spec:"회수품",kind:"returnable"},
  {cat:"오일펜스",name:"B형 오일펜스",unit:"m",spec:"회수품",kind:"returnable"},
  {cat:"오일펜스",name:"팽창형 오일펜스",unit:"m",spec:"회수품",kind:"returnable"},
  {cat:"오일펜스",name:"앵커",unit:"개",spec:"회수품",kind:"returnable"},
  {cat:"개인보호구",name:"개인보호구세트(D급)",unit:"세트",spec:"",kind:"consume"},
  {cat:"개인보호구",name:"장화",unit:"켤레",spec:"",kind:"consume"},
  {cat:"개인보호구",name:"장갑",unit:"켤레",spec:"",kind:"consume"},
  {cat:"방제작업도구",name:"방제작업도구세트",unit:"세트",spec:"회수품",kind:"returnable"},
  {cat:"방제작업도구",name:"나노뜰채",unit:"개",spec:"회수품",kind:"returnable"},
  {cat:"방제작업도구",name:"이중마대",unit:"매",spec:"",kind:"consume"},
  {cat:"방제작업도구",name:"톤백",unit:"개",spec:"",kind:"consume"}
];

const types = ["사고","파출소 지급","함정 지급","훈련","작업","기타"];
const flowTypes = ["출고","입고"];
const equipmentCategories = ["유회수기","이송펌프","고압세척기","발전기","흡수펌프","저수심 유류회수세트","세척기","보일러","분전개폐기","동력분무기","저장용기","기타장비"];

const defaultEquipment = [
  {id:"eq-001",cat:"유회수기",name:"유회수기",detail:"komara 20k",place:"VTS",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-002",cat:"이송펌프",name:"이송펌프",detail:"이송펌프",place:"통영해양경찰서",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-003",cat:"고압세척기",name:"고압세척기",detail:"고압세척기",place:"통영해양경찰서",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-004",cat:"발전기",name:"발전기",detail:"발전기",place:"통영해양경찰서",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-005",cat:"흡수펌프",name:"흡수펌프",detail:"흡수펌프",place:"한국석유공사 거제지사 창고",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-006",cat:"저수심 유류회수세트",name:"저수심 유류회수세트",detail:"저수심 유류회수세트",place:"장승포",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-007",cat:"세척기",name:"세척기",detail:"세척기",place:"통영해양경찰서",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-008",cat:"보일러",name:"보일러",detail:"보일러",place:"통영해양경찰서",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-009",cat:"분전개폐기",name:"분전개폐기",detail:"분전개폐기",place:"통영해양경찰서",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-010",cat:"동력분무기",name:"동력분무기",detail:"동력분무기",place:"방제지휘차량",battery:"",fuel:"",etc:"",status:"정상"},
  {id:"eq-011",cat:"저장용기",name:"저장용기",detail:"저장용기",place:"소형방제정",battery:"",fuel:"",etc:"",status:"정상"}
];

let warehouses = [...defaultWarehouses];
let catalog = defaultCatalog.map(x => ({...x}));
let cats = [...new Set(catalog.map(x => x.cat))];

function refreshGlobals(state){
  warehouses = Array.isArray(state?.warehouses) && state.warehouses.length ? [...state.warehouses] : [...defaultWarehouses];
  catalog = Array.isArray(state?.catalog) && state.catalog.length ? state.catalog.map(x => ({...x})) : defaultCatalog.map(x => ({...x}));
  cats = [...new Set(catalog.map(x => x.cat))];
}

function defaultStock(warehouseList=defaultWarehouses, catalogList=defaultCatalog){
  const stock = {};
  warehouseList.forEach(w => {
    stock[w] = {};
    catalogList.forEach(i => stock[w][i.name] = 0);
  });
  return stock;
}

function defaultInfos(warehouseList=defaultWarehouses){
  const infos = {};
  warehouseList.forEach(w => infos[w] = {memo:"", updated:""});
  return infos;
}

function defaultState(){
  const state = {
    warehouses: [...defaultWarehouses],
    catalog: defaultCatalog.map(x => ({...x})),
    stock: defaultStock(),
    records: [],
    memos: [],
    warehouseInfos: defaultInfos(),
    assetOps: {
      "방제지휘차량": {distanceBase:0, logs:[]},
      "소형방제정": {hoursBase:0, fuelBase:0, logs:[]}
    },
    equipment: defaultEquipment.map(x => ({...x})),
    survey: null,
    lastBackup: null,
    logs: []
  };
  refreshGlobals(state);
  return state;
}

function oldName(w){
  return {
    "통영해양경찰서 방제창고":"통영해양경찰서",
    "경찰서 창고":"통영해양경찰서",
    "통영해양경찰서 전용부두 방제창고":"전용부두",
    "VTS창고":"VTS",
    "VTS 방제창고":"VTS",
    "장승포창고":"장승포",
    "장승포 방제창고":"장승포",
    "지세포창고":"한국석유공사 거제지사 창고",
    "한국석유공사 거제지사":"한국석유공사 거제지사 창고",
    "한국석유공사 거제지사 방제창고":"한국석유공사 거제지사 창고"
  }[w] || w;
}

function normalize(raw){
  const d = defaultState();
  if(!raw || typeof raw !== "object") return d;

  const whSet = new Set(defaultWarehouses);
  if(Array.isArray(raw.warehouses)) raw.warehouses.forEach(w => whSet.add(oldName(w)));
  if(raw.stock && typeof raw.stock === "object") Object.keys(raw.stock).forEach(w => whSet.add(oldName(w)));
  const warehouseList = [...whSet];

  const catMap = new Map(defaultCatalog.map(i => [i.name, {...i}]));
  if(Array.isArray(raw.catalog)){
    raw.catalog.forEach(i => {
      if(!i || !i.name) return;
      const nm = i.name === "고형식 오일펜스" ? "팽창형 오일펜스" : i.name;
      catMap.set(nm, {
        cat:i.cat || "기타",
        name:nm,
        unit:i.unit || "개",
        spec:i.spec || "",
        kind:i.kind || "consume"
      });
    });
  }
  if(raw.stock && typeof raw.stock === "object"){
    Object.values(raw.stock).forEach(bucket => Object.keys(bucket || {}).forEach(n => {
      const nm = n === "고형식 오일펜스" ? "팽창형 오일펜스" : n;
      if(!catMap.has(nm)) catMap.set(nm,{cat:"기타",name:nm,unit:"개",spec:"",kind:"consume"});
    }));
  }
  const catalogList = [...catMap.values()];

  const state = {
    ...d,
    ...raw,
    warehouses: warehouseList,
    catalog: catalogList
  };

  const newStock = defaultStock(warehouseList, catalogList);
  if(raw.stock && typeof raw.stock === "object"){
    Object.keys(raw.stock).forEach(w => {
      const nw = oldName(w);
      if(!newStock[nw]) return;
      Object.keys(raw.stock[w] || {}).forEach(n => {
        const nn = n === "고형식 오일펜스" ? "팽창형 오일펜스" : n;
        if(nn in newStock[nw]) newStock[nw][nn] = Number(raw.stock[w][n] || 0);
      });
    });
  }
  state.stock = newStock;

  state.warehouseInfos = raw.warehouseInfos || {};
  warehouseList.forEach(w => {
    const old = state.warehouseInfos[w] || {};
    state.warehouseInfos[w] = {memo: old.memo || "", updated: old.updated || ""};
  });

  if(!Array.isArray(state.records)) state.records = [];
  state.records = state.records.map(r => ({
    id: r.id || uid(),
    type: r.type || "사고",
    flow: r.flow || (r.status === "pending" ? "긴급" : "출고"),
    title: r.title || r.incident || "기록",
    date: r.date || todayISO(),
    warehouse: oldName(r.warehouse || ""),
    memo: r.memo || "",
    status: r.status || "done",
    sourceId: r.sourceId || null,
    items: Array.isArray(r.items) ? r.items.map(it => {
      let nm = it.name || it.material || catalogList[0].name;
      if(nm === "고형식 오일펜스") nm = "팽창형 오일펜스";
      const f = catalogList.find(x => x.name === nm) || catalogList[0];
      return {
        cat: it.cat || f.cat,
        name: nm,
        qty: Number(it.qty ?? it.total ?? 0),
        unit: it.unit || f.unit,
        kind: it.kind || f.kind,
        returned: Number(it.returned || 0),
        damaged: Number(it.damaged || 0)
      };
    }).filter(it => it.qty > 0) : []
  }));

  if(!Array.isArray(state.memos)) state.memos = [];
  state.memos = state.memos.map(m => ({
    id:m.id || uid(),
    date:m.date || todayISO(),
    title:m.title || "메모",
    body:m.body || "",
    createdAt:m.createdAt || new Date().toISOString()
  }));

  if(!state.assetOps) state.assetOps = d.assetOps;
  if(!state.assetOps["방제지휘차량"]) state.assetOps["방제지휘차량"] = {distanceBase:0, logs:[]};
  if(!Array.isArray(state.assetOps["방제지휘차량"].logs)) state.assetOps["방제지휘차량"].logs = [];
  if(typeof state.assetOps["방제지휘차량"].distanceBase !== "number") state.assetOps["방제지휘차량"].distanceBase = 0;
  if(!state.assetOps["소형방제정"]) state.assetOps["소형방제정"] = {hoursBase:0, fuelBase:0, logs:[]};
  if(!Array.isArray(state.assetOps["소형방제정"].logs)) state.assetOps["소형방제정"].logs = [];
  if(typeof state.assetOps["소형방제정"].hoursBase !== "number") state.assetOps["소형방제정"].hoursBase = 0;
  if(typeof state.assetOps["소형방제정"].fuelBase !== "number") state.assetOps["소형방제정"].fuelBase = 0;

  if(!Array.isArray(state.equipment)) state.equipment = defaultEquipment.map(x => ({...x}));
  state.equipment = state.equipment.map(e => ({
    id: e.id || uid(),
    cat: e.cat || "기타장비",
    name: e.name || "장비",
    detail: e.detail || e.spec || "",
    place: oldName(e.place || e.warehouse || warehouseList[0]),
    battery: e.battery || "",
    fuel: e.fuel || "",
    etc: e.etc || e.memo || "",
    status: e.status || "정상"
  }));

  if(!("survey" in state)) state.survey = null;
  if(!Array.isArray(state.logs)) state.logs = [];
  refreshGlobals(state);
  return state;
}

function loadState(){
  for(const k of [KEY, ...MIGRATE_KEYS]){
    try{
      const raw = localStorage.getItem(k);
      if(raw) return normalize(JSON.parse(raw));
    }catch(e){}
  }
  return defaultState();
}

function save(){
  refreshGlobals(state);
  localStorage.setItem(KEY, JSON.stringify(state));
}

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function todayISO(){
  return new Date().toISOString().slice(0,10);
}

function itemOf(name){
  return catalog.find(x => x.name === name);
}
