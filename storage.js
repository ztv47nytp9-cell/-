const VERSION = "Alpha 0.18.3";
const KEY = "victor_state_alpha_0_18_3";
const MIGRATE_KEYS = [
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

const warehouses = ["통영해양경찰서","전용부두","VTS","장승포","한국석유공사 거제지사","방제지휘차량","소형방제정"];

const catalog = [
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

const cats = [...new Set(catalog.map(x => x.cat))];
const types = ["사고","파출소 지급","함정 지급","훈련","작업","기타"];

const equipmentCategories = ["차량/선박","유회수기","펌프","발전기","세척기","저장/이송","기타장비"];
const defaultEquipment = [
  {id:"eq-command-vehicle",cat:"차량/선박",name:"방제지휘차량",place:"방제지휘차량",status:"정상",memo:""},
  {id:"eq-small-vessel",cat:"차량/선박",name:"소형방제정",place:"소형방제정",status:"정상",memo:""}
];

function defaultStock(){
  const stock = {};
  warehouses.forEach(w => {
    stock[w] = {};
    catalog.forEach(i => stock[w][i.name] = 0);
  });
  return stock;
}

function defaultInfos(){
  const infos = {};
  warehouses.forEach(w => infos[w] = {location:"", manager:"", phone:"", email:"", memo:"", updated:""});
  return infos;
}

function defaultState(){
  return {
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
    "지세포창고":"한국석유공사 거제지사",
    "한국석유공사 거제지사 방제창고":"한국석유공사 거제지사"
  }[w] || w;
}

function normalize(raw){
  const d = defaultState();
  if(!raw || typeof raw !== "object") return d;

  const state = {...d, ...raw};

  const newStock = defaultStock();
  if(state.stock && typeof state.stock === "object"){
    Object.keys(state.stock).forEach(w => {
      const nw = oldName(w);
      if(!newStock[nw]) return;
      Object.keys(state.stock[w] || {}).forEach(n => {
        let nn = n === "고형식 오일펜스" ? "팽창형 오일펜스" : n;
        if(nn in newStock[nw]) newStock[nw][nn] = Number(state.stock[w][n] || 0);
      });
    });
  }
  state.stock = newStock;

  if(!Array.isArray(state.records)) state.records = [];
  state.records = state.records.map(r => ({
    id: r.id || uid(),
    type: r.type || "사고",
    title: r.title || r.incident || "기록",
    date: r.date || todayISO(),
    warehouse: oldName(r.warehouse || ""),
    memo: r.memo || "",
    status: r.status || "done",
    items: Array.isArray(r.items) ? r.items.map(it => {
      let nm = it.name || it.material || catalog[0].name;
      if(nm === "고형식 오일펜스") nm = "팽창형 오일펜스";
      const f = itemOf(nm) || catalog[0];
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

  if(!state.warehouseInfos) state.warehouseInfos = defaultInfos();
  warehouses.forEach(w => {
    state.warehouseInfos[w] = {
      location:"",
      manager:"",
      phone:"",
      email:"",
      memo:"",
      updated:"",
      ...(state.warehouseInfos[w] || {})
    };
  });

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
    place: e.place || warehouses[0],
    status: e.status || "정상",
    memo: e.memo || ""
  }));
  if(!("survey" in state)) state.survey = null;
  if(!Array.isArray(state.logs)) state.logs = [];
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
