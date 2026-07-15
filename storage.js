const VERSION = "Alpha 0.19.0";
const KEY = "victor_state_alpha_0_19_0e";
const MIGRATE_KEYS = [
  "victor_state_alpha_0_19_0d",
  "victor_state_alpha_0_19_0c",
  "victor_state_alpha_0_19_0b",
  "victor_state_alpha_0_19_0a",
  "victor_state_alpha_0_19_0",
  "victor_state_alpha_0_18_9",
  "victor_state_alpha_0_18_6_recovery",
  "victor_state_alpha_0_18_6",
  "victor_state_alpha_0_18_8",
  "victor_state_alpha_0_18_7a",
  "victor_state_alpha_0_18_7",
  "victor_state_alpha_0_18_5",
  "victor_state_alpha_0_18_4a",
  "victor_state_alpha_0_18_4",
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

function stripStoredPhotos(target, seen = new WeakSet()){
  if(!target || typeof target !== "object") return target;
  if(seen.has(target)) return target;
  seen.add(target);
  if(Array.isArray(target)){
    target.forEach(item => stripStoredPhotos(item, seen));
    return target;
  }
  Object.keys(target).forEach(key => {
    if(key === "photo") target[key] = "";
    else if(key === "photos") target[key] = [];
    else stripStoredPhotos(target[key], seen);
  });
  return target;
}

const defaultWarehouses = ["통영해양경찰서","전용부두","VTS","장승포","한국석유공사 거제지사 창고","방제지휘차량","소형방제정"];
const defaultWarehouseKinds = {"통영해양경찰서":"창고","전용부두":"창고","VTS":"창고","장승포":"창고","한국석유공사 거제지사 창고":"창고","방제지휘차량":"차량","소형방제정":"함정"};

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

const types = ["사고","이송","훈련","작업","기타"];
const flowTypes = ["출고","입고"];
const defaultEquipmentCategories = ["고압세척기", "기타장비", "동력분무기", "동력캐리어", "발전기", "보일러", "세척기", "유량계측기", "유회수기", "이송펌프", "이송펌프 동력부", "잠수펌프", "저수심 유류이적세트", "저장용기", "환풍구배풍"];
let equipmentCategories = [...defaultEquipmentCategories];

const defaultEquipment = [
  {
    "id": "eq-vts-komara20k",
    "cat": "유회수기",
    "name": "komara 20k",
    "detail": "회수부, 동력부, 이송부",
    "place": "VTS",
    "battery": "E&P 12V 31Ah",
    "fuel": "경유 2.5L / 유압유 50L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-vts-dop160",
    "cat": "이송펌프",
    "name": "DOP-160",
    "detail": "고점도",
    "place": "VTS",
    "battery": "E&P 12V 30Ah",
    "fuel": "휘발유 2.5L / 유압유 50L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-vts-etg13",
    "cat": "이송펌프 동력부",
    "name": "ET/G13-NF30",
    "detail": "동력부",
    "place": "VTS",
    "battery": "Rocket tiller 45L용 12V 45Ah",
    "fuel": "경유 20L / 휘발유 20L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-vts-sy2002a",
    "cat": "고압세척기",
    "name": "SY2002A",
    "detail": "",
    "place": "VTS",
    "battery": "Delko 12V 8Ah",
    "fuel": "휘발유 2.5L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-vts-ig3000",
    "cat": "발전기",
    "name": "IG3000",
    "detail": "",
    "place": "VTS",
    "battery": "전기",
    "fuel": "",
    "etc": "발전기 필요",
    "status": "정상"
  },
  {
    "id": "eq-vts-pd-s75ima",
    "cat": "잠수펌프",
    "name": "PD-S75IMA",
    "detail": "원로펌프",
    "place": "VTS",
    "battery": "",
    "fuel": "",
    "etc": "센서 고장",
    "status": "점검필요"
  },
  {
    "id": "eq-police-d2401",
    "cat": "유량계측기",
    "name": "D-2401-2",
    "detail": "",
    "place": "통영해양경찰서",
    "battery": "",
    "fuel": "",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-police-wb30xt",
    "cat": "이송펌프",
    "name": "WB30XT",
    "detail": "배수용",
    "place": "통영해양경찰서",
    "battery": "",
    "fuel": "휘발유 3.6L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-police-komaramini",
    "cat": "유회수기",
    "name": "komara mini",
    "detail": "",
    "place": "통영해양경찰서",
    "battery": "",
    "fuel": "",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-command-dsv65b",
    "cat": "저수심 유류이적세트",
    "name": "DSV-65B",
    "detail": "",
    "place": "방제지휘차량",
    "battery": "",
    "fuel": "휘발유 0.65L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-small-komaramini",
    "cat": "유회수기",
    "name": "komara mini",
    "detail": "",
    "place": "소형방제정",
    "battery": "E&P 12V 31Ah",
    "fuel": "",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-small-al75",
    "cat": "이송펌프",
    "name": "AL75",
    "detail": "로터리로브",
    "place": "소형방제정",
    "battery": "Solite 12V 30Ah",
    "fuel": "휘발유 2.5L / 유압유 30L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-ksjet200",
    "cat": "세척기",
    "name": "KS-jet200",
    "detail": "고압용",
    "place": "한국석유공사 거제지사 창고",
    "battery": "Rocket 12V 30Ah",
    "fuel": "휘발유",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-dhv20es",
    "cat": "세척기",
    "name": "DHV20ES",
    "detail": "저압용",
    "place": "한국석유공사 거제지사 창고",
    "battery": "E&P 12V 10Ah",
    "fuel": "휘발유",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-multipower400",
    "cat": "세척기",
    "name": "멀티파워 400-II",
    "detail": "저압용",
    "place": "한국석유공사 거제지사 창고",
    "battery": "E&P 12V 12Ah, 31Ah×2",
    "fuel": "휘발유 20L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-de200",
    "cat": "보일러",
    "name": "DE-200",
    "detail": "세척기용",
    "place": "한국석유공사 거제지사 창고",
    "battery": "",
    "fuel": "휘발유 1L / 등유 40L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-eu10i",
    "cat": "발전기",
    "name": "EU-10i",
    "detail": "휴대용",
    "place": "한국석유공사 거제지사 창고",
    "battery": "",
    "fuel": "휘발유 2L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-sg5000dx",
    "cat": "발전기",
    "name": "SG-5000DX",
    "detail": "휴대용",
    "place": "한국석유공사 거제지사 창고",
    "battery": "",
    "fuel": "휘발유 5L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-eu20i",
    "cat": "발전기",
    "name": "EU-20i",
    "detail": "휴대용",
    "place": "한국석유공사 거제지사 창고",
    "battery": "",
    "fuel": "휘발유 2L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-hgs42",
    "cat": "환풍구배풍",
    "name": "HGS-42",
    "detail": "에어커튼",
    "place": "한국석유공사 거제지사 창고",
    "battery": "",
    "fuel": "휘발유 없음",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-yc268",
    "cat": "동력분무기",
    "name": "YC-268",
    "detail": "",
    "place": "한국석유공사 거제지사 창고",
    "battery": "",
    "fuel": "휘발유 1.5L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-korea-komarastar",
    "cat": "유회수기",
    "name": "komara star",
    "detail": "회수부, 동력부, 이송부",
    "place": "한국석유공사 거제지사 창고",
    "battery": "Delkor 12V 40Ah",
    "fuel": "경유 2.5L / 유압유 50L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-jangseung-rbs100",
    "cat": "유회수기",
    "name": "RBS-100",
    "detail": "멀티스키머",
    "place": "장승포",
    "battery": "Rocket tiller 45L용 12V 45Ah",
    "fuel": "경유 2.5L",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-police-kobot-s",
    "cat": "유회수기",
    "name": "KOBOT-S(소형)",
    "detail": "로봇형 오일스키머",
    "place": "통영해양경찰서",
    "battery": "12V 12Ah",
    "fuel": "",
    "etc": "",
    "status": "정상"
  },
  {
    "id": "eq-jangseung-hc1000wdl",
    "cat": "동력캐리어",
    "name": "HC-1000WDL",
    "detail": "",
    "place": "장승포",
    "battery": "Delkor 45Ah",
    "fuel": "휘발유 20L / 유압유 30L",
    "etc": "불용 불가",
    "status": "정상"
  },
  {
    "id": "eq-jangseung-sb50",
    "cat": "저장용기",
    "name": "SB-50",
    "detail": "",
    "place": "장승포",
    "battery": "STX 14-bs, 12V 12Ah",
    "fuel": "휘발유 2.5L",
    "etc": "불용 불가",
    "status": "정상"
  }
];

let warehouses = [...defaultWarehouses];
let catalog = defaultCatalog.map(x => ({...x}));
let cats = [...new Set(catalog.map(x => x.cat))];

function refreshGlobals(state){
  warehouses = Array.isArray(state?.warehouses) && state.warehouses.length ? [...state.warehouses] : [...defaultWarehouses];
  catalog = Array.isArray(state?.catalog) && state.catalog.length ? state.catalog : defaultCatalog.map(x => ({...x}));
  cats = [...new Set(catalog.map(x => x.cat))];
  const savedEquipmentCategories = Array.isArray(state?.equipmentCategories)
    ? state.equipmentCategories.filter(name => typeof name === "string" && name.trim()).map(name => name.trim())
    : [];
  equipmentCategories = [...new Set([...defaultEquipmentCategories, ...savedEquipmentCategories])];
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
    warehouseKinds: {...defaultWarehouseKinds},
    assetOps: {
      "방제지휘차량": {distanceBase:0, logs:[], maintenance:[]},
      "소형방제정": {mileageBase:0, hoursBase:0, portHoursBase:0, starboardHoursBase:0, engineSplitMode:"dual", fuelBase:0, logs:[], maintenance:[]}
    },
    equipment: defaultEquipment.map(x => ({...x})),
    equipmentCategories: [...defaultEquipmentCategories],
    ui: {lastVisit:null},
    survey: null,
    trash: [],
    lastBackup: null,
    logs: []
  };
  refreshGlobals(state);
  return state;
}

function oldName(w){
  if(typeof w !== "string") return "";
  return {
    "통영해양경찰서 방제창고":"통영해양경찰서",
    "경찰서 창고":"통영해양경찰서",
    "통영해양경찰서 전용부두 방제창고":"전용부두",
    "VTS창고":"VTS",
    "VTS 방제창고":"VTS",
    "장승포창고":"장승포",
    "장승포 방제창고":"장승포",
    "지세포창고":"한국석유공사 거제지사 창고",
    "한국석유공사 거제지사 창고":"한국석유공사 거제지사 창고",
    "한국석유공사 거제지사 방제창고":"한국석유공사 거제지사 창고"
  }[w] || w;
}

function normalize(raw){
  const d = defaultState();
  if(!raw || typeof raw !== "object") return d;

  const whSet = new Set(defaultWarehouses);
  if(Array.isArray(raw.warehouses)) raw.warehouses.forEach(w => {
    const name = oldName(w).trim();
    if(name) whSet.add(name);
  });
  if(raw.stock && typeof raw.stock === "object") Object.keys(raw.stock).forEach(w => whSet.add(oldName(w)));
  const warehouseList = [...whSet];

  const deletedMaterialNames=new Set((Array.isArray(raw.trash)?raw.trash:[]).filter(entry=>entry?.kind==="material").map(entry=>entry?.data?.item?.name).filter(Boolean));
  const catMap = new Map(defaultCatalog.filter(item=>!deletedMaterialNames.has(item.name)).map(i => [i.name, {...i}]));
  if(Array.isArray(raw.catalog)){
    raw.catalog.forEach(i => {
      if(!i || typeof i !== "object" || typeof i.name !== "string" || !i.name.trim()) return;
      const sourceName = i.name.trim();
      const nm = sourceName === "고형식 오일펜스" ? "팽창형 오일펜스" : sourceName;
      catMap.set(nm, {
        cat:typeof i.cat === "string" && i.cat ? i.cat : "기타",
        name:nm,
        unit:typeof i.unit === "string" && i.unit ? i.unit : "개",
        spec:typeof i.spec === "string" ? i.spec : "",
        kind:i.kind === "returnable" ? "returnable" : "consume",
        memo:typeof i.memo === "string" ? i.memo : "",
        photo:"",
        updatedAt:typeof i.updatedAt === "string" ? i.updatedAt : ""
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
        if(nn in newStock[nw]){
          const value = Number(raw.stock[w][n] || 0);
          newStock[nw][nn] = Number.isFinite(value) ? Math.max(0, value) : 0;
        }
      });
    });
  }
  state.stock = newStock;

  state.warehouseInfos = raw.warehouseInfos && typeof raw.warehouseInfos === "object" && !Array.isArray(raw.warehouseInfos)
    ? {...raw.warehouseInfos}
    : {};
  warehouseList.forEach(w => {
    const old = state.warehouseInfos[w] && typeof state.warehouseInfos[w] === "object" ? state.warehouseInfos[w] : {};
    state.warehouseInfos[w] = {
      memo: typeof old.memo === "string" ? old.memo : "",
      access: typeof old.access === "string" ? old.access : "",
      keyNote: typeof old.keyNote === "string" ? old.keyNote : "",
      special: typeof old.special === "string" ? old.special : "",
      contactMemo: typeof old.contactMemo === "string" ? old.contactMemo : "",
      updated: typeof old.updated === "string" ? old.updated : ""
    };
  });
  state.warehouseKinds=raw.warehouseKinds&&typeof raw.warehouseKinds==="object"&&!Array.isArray(raw.warehouseKinds)?{...raw.warehouseKinds}:{};
  warehouseList.forEach(name=>{const auto=defaultWarehouseKinds[name]||(name.includes("차량")?"차량":name.includes("정")||name.includes("함")?"함정":"기타");if(!["차량","함정","파출소","창고","기타"].includes(state.warehouseKinds[name]))state.warehouseKinds[name]=auto;});
  if(state.warehouseKinds["장승포"]==="파출소") state.warehouseKinds["장승포"]="창고";

  if(!Array.isArray(state.records)) state.records = [];
  state.records = state.records.filter(r => r && typeof r === "object").map(r => ({
    id: typeof r.id === "string" && r.id ? r.id : uid(),
    type: typeof r.type === "string" && r.type ? r.type : "사고",
    flow: typeof r.flow === "string" && r.flow ? r.flow : (r.status === "pending" ? "긴급" : "출고"),
    title: typeof r.title === "string" && r.title ? r.title : (typeof r.incident === "string" && r.incident ? r.incident : "기록"),
    date: typeof r.date === "string" && r.date ? r.date : todayISO(),
    warehouse: oldName(r.warehouse || ""),
    memo: typeof r.memo === "string" ? r.memo : "",
    status: r.status === "pending" ? "pending" : "done",
    sourceId: typeof r.sourceId === "string" ? r.sourceId : null,
    quick: Boolean(r.quick || r.status === "pending"),
    officialTitle: Boolean(r.officialTitle),
    createdAt: typeof r.createdAt === "string" && r.createdAt ? r.createdAt : new Date().toISOString(),
    appliedAt: typeof r.appliedAt === "string" ? r.appliedAt : null,
    targetWarehouse: oldName(r.targetWarehouse || ""),
    location: r.location && typeof r.location === "object" && !Array.isArray(r.location) ? {type:typeof r.location.type==="string"?r.location.type:"",detail:typeof r.location.detail==="string"?r.location.detail:""} : null,
    evidence: r.evidence && typeof r.evidence === "object" && !Array.isArray(r.evidence) ? {...r.evidence} : null,
    checklist: Array.isArray(r.checklist) ? r.checklist.filter(step => ["출동","회수","세척","복귀"].includes(step)) : [],
    equipmentItems: Array.isArray(r.equipmentItems) ? r.equipmentItems.filter(it => it && typeof it === "object").map(it => ({
      id: typeof it.id === "string" ? it.id : "",
      name: typeof it.name === "string" && it.name ? it.name : "장비",
      qty: Number.isFinite(Number(it.qty)) && Number(it.qty) > 0 ? Number(it.qty) : 1,
      returnedQty: Math.max(0,Math.min(Number(it.qty || 1),Number(it.returnedQty || 0))),
      returnHistory: Array.isArray(it.returnHistory) ? it.returnHistory.filter(log=>log&&typeof log==="object").map(log=>({id:String(log.id||uid()),date:String(log.date||todayISO()),qty:Math.max(0,Number(log.qty||0)),memo:String(log.memo||""),createdAt:String(log.createdAt||new Date().toISOString())})) : [],
      place: oldName(it.place || it.warehouse || ""),
      spec: typeof it.spec === "string" ? it.spec : ""
    })) : [],
    items: Array.isArray(r.items) ? r.items.filter(it => it && typeof it === "object").map(it => {
      let nm = typeof it.name === "string" && it.name ? it.name : (typeof it.material === "string" && it.material ? it.material : catalogList[0].name);
      if(nm === "고형식 오일펜스") nm = "팽창형 오일펜스";
      const f = catalogList.find(x => x.name === nm) || catalogList[0];
      return {
        cat: typeof it.cat === "string" && it.cat ? it.cat : f.cat,
        name: nm,
        qty: Number.isFinite(Number(it.qty ?? it.total ?? 0)) ? Number(it.qty ?? it.total ?? 0) : 0,
        unit: typeof it.unit === "string" && it.unit ? it.unit : f.unit,
        kind: it.kind === "returnable" ? "returnable" : f.kind,
        returned: Number(it.returned || 0),
        damaged: Number(it.damaged || 0),
        before: Number.isFinite(Number(it.before)) ? Number(it.before) : undefined,
        after: Number.isFinite(Number(it.after)) ? Number(it.after) : undefined,
        diff: Number.isFinite(Number(it.diff)) ? Number(it.diff) : undefined
      };
    }).filter(it => it.qty > 0) : []
  }));

  if(!Array.isArray(state.memos)) state.memos = [];
  state.memos = state.memos.filter(m => m && typeof m === "object").map(m => ({
    id:typeof m.id === "string" && m.id ? m.id : uid(),
    date:typeof m.date === "string" && m.date ? m.date : todayISO(),
    title:typeof m.title === "string" && m.title ? m.title : "메모",
    body:typeof m.body === "string" ? m.body : "",
    createdAt:typeof m.createdAt === "string" && m.createdAt ? m.createdAt : new Date().toISOString(),
    updatedAt:typeof m.updatedAt === "string" ? m.updatedAt : null
  }));

  if(!state.assetOps || typeof state.assetOps !== "object" || Array.isArray(state.assetOps)) state.assetOps = d.assetOps;
  if(!state.assetOps["방제지휘차량"]) state.assetOps["방제지휘차량"] = {distanceBase:0, logs:[]};
  if(!Array.isArray(state.assetOps["방제지휘차량"].logs)) state.assetOps["방제지휘차량"].logs = [];
  if(typeof state.assetOps["방제지휘차량"].distanceBase !== "number") state.assetOps["방제지휘차량"].distanceBase = 0;
  if(!state.assetOps["소형방제정"]) state.assetOps["소형방제정"] = {hoursBase:0, fuelBase:0, logs:[]};
  if(!Array.isArray(state.assetOps["소형방제정"].logs)) state.assetOps["소형방제정"].logs = [];
  if(typeof state.assetOps["소형방제정"].hoursBase !== "number") state.assetOps["소형방제정"].hoursBase = 0;
  if(typeof state.assetOps["소형방제정"].portHoursBase !== "number") state.assetOps["소형방제정"].portHoursBase = Number(state.assetOps["소형방제정"].hoursBase || 0);
  if(typeof state.assetOps["소형방제정"].starboardHoursBase !== "number") state.assetOps["소형방제정"].starboardHoursBase = Number(state.assetOps["소형방제정"].hoursBase || 0);
  if(typeof state.assetOps["소형방제정"].fuelBase !== "number") state.assetOps["소형방제정"].fuelBase = 0;
  if(!Number.isFinite(Number(state.assetOps["소형방제정"].mileageBase))) state.assetOps["소형방제정"].mileageBase = 0;
  if(state.assetOps["방제지휘차량"].counterMode !== "absolute"){
    state.assetOps["방제지휘차량"].distanceBase += state.assetOps["방제지휘차량"].logs.reduce((sum,log)=>sum+Number(log.distance || 0),0);
    state.assetOps["방제지휘차량"].counterMode = "absolute";
  }
  if(state.assetOps["소형방제정"].counterMode !== "absolute"){
    state.assetOps["소형방제정"].hoursBase += state.assetOps["소형방제정"].logs.reduce((sum,log)=>sum+Number(log.hours || 0),0);
    state.assetOps["소형방제정"].counterMode = "absolute";
  }
  if(state.assetOps["소형방제정"].engineSplitMode!=="dual"){state.assetOps["소형방제정"].portHoursBase=Number(state.assetOps["소형방제정"].hoursBase||0);state.assetOps["소형방제정"].starboardHoursBase=Number(state.assetOps["소형방제정"].hoursBase||0);state.assetOps["소형방제정"].engineSplitMode="dual";}
  warehouseList.forEach(name=>{const kind=state.warehouseKinds[name];if(kind==="차량"){if(!state.assetOps[name])state.assetOps[name]={distanceBase:0,logs:[],maintenance:[],counterMode:"absolute"};if(!Array.isArray(state.assetOps[name].logs))state.assetOps[name].logs=[];if(!Array.isArray(state.assetOps[name].maintenance))state.assetOps[name].maintenance=[];if(!Number.isFinite(Number(state.assetOps[name].distanceBase)))state.assetOps[name].distanceBase=0;}else if(kind==="함정"){if(!state.assetOps[name])state.assetOps[name]={mileageBase:0,hoursBase:0,portHoursBase:0,starboardHoursBase:0,engineSplitMode:"dual",fuelBase:0,logs:[],maintenance:[],counterMode:"absolute"};if(!Array.isArray(state.assetOps[name].logs))state.assetOps[name].logs=[];if(!Array.isArray(state.assetOps[name].maintenance))state.assetOps[name].maintenance=[];if(!Number.isFinite(Number(state.assetOps[name].mileageBase)))state.assetOps[name].mileageBase=0;if(!Number.isFinite(Number(state.assetOps[name].hoursBase)))state.assetOps[name].hoursBase=0;if(state.assetOps[name].engineSplitMode!=="dual"){state.assetOps[name].portHoursBase=Number(state.assetOps[name].hoursBase||0);state.assetOps[name].starboardHoursBase=Number(state.assetOps[name].hoursBase||0);state.assetOps[name].engineSplitMode="dual";}if(!Number.isFinite(Number(state.assetOps[name].portHoursBase)))state.assetOps[name].portHoursBase=Number(state.assetOps[name].hoursBase||0);if(!Number.isFinite(Number(state.assetOps[name].starboardHoursBase)))state.assetOps[name].starboardHoursBase=Number(state.assetOps[name].hoursBase||0);}});

  state.equipmentCategories = [...new Set([
    ...defaultEquipmentCategories,
    ...(Array.isArray(raw.equipmentCategories) ? raw.equipmentCategories.filter(name => typeof name === "string" && name.trim()).map(name => name.trim()) : [])
  ])];

  const existingEquipment = Array.isArray(state.equipment)
    ? state.equipment.filter(e => e && typeof e === "object")
    : [];
  const mergedEquipment = [...existingEquipment];
  defaultEquipment.forEach(def => {
    const inTrash = Array.isArray(state.trash) && state.trash.some(entry => entry?.kind === "equipment" && entry?.data?.id === def.id);
    const exists = mergedEquipment.some(e => e.id === def.id || (e.name === def.name && (e.detail || e.spec || "") === def.detail && oldName(e.place || e.warehouse || "") === def.place));
    if(!exists && !inTrash) mergedEquipment.push({...def});
  });
  state.equipment = mergedEquipment.map(e => ({
    id: typeof e.id === "string" && e.id ? e.id : uid(),
    cat: typeof e.cat === "string" && e.cat ? e.cat : "기타장비",
    name: typeof e.name === "string" && e.name ? e.name : "장비",
    detail: typeof e.detail === "string" ? e.detail : (typeof e.spec === "string" ? e.spec : ""),
    place: oldName(e.place || e.warehouse || warehouseList[0]) || warehouseList[0],
    battery: typeof e.battery === "string" ? e.battery : "",
    fuel: typeof e.fuel === "string" ? e.fuel : "",
    etc: typeof e.etc === "string" ? e.etc : (typeof e.memo === "string" ? e.memo : ""),
    status: typeof e.status === "string" && e.status ? e.status : "정상",
    spec: typeof e.spec === "string" ? e.spec : (typeof e.detail === "string" ? e.detail : ""),
    model: typeof e.model === "string" ? e.model : "",
    qty: Number.isFinite(Number(e.qty)) && Number(e.qty) >= 0 ? Number(e.qty) : 1,
    memo: typeof e.memo === "string" ? e.memo : (typeof e.etc === "string" ? e.etc : ""),
    updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : "",
    photo:"",
    photos:[],
    accessories: Array.isArray(e.accessories) ? e.accessories.filter(part => part && typeof part === "object").map(part => ({
      id: typeof part.id === "string" && part.id ? part.id : uid(),
      name: String(part.name || "").trim(),
      qty: Math.max(0, Number(part.qty || 0)),
      status: ["장착 중","예비 보유","수리 중"].includes(part.status) ? part.status : "예비 보유",
      memo: String(part.memo || ""),
      updatedAt: typeof part.updatedAt === "string" ? part.updatedAt : new Date().toISOString()
    })).filter(part => part.name) : [],
    maintenance: Array.isArray(e.maintenance) ? e.maintenance.filter(log => log && typeof log === "object").map(log => ({
      id: typeof log.id === "string" && log.id ? log.id : uid(),
      type: typeof log.type === "string" && log.type ? log.type : "기타",
      date: typeof log.date === "string" && log.date ? log.date : todayISO(),
      content: typeof log.content === "string" ? log.content : "",
      memo: typeof log.memo === "string" ? log.memo : "",
      photo:"",
      parts: Array.isArray(log.parts) ? log.parts.filter(part => part && typeof part === "object").map(part => ({name:String(part.name || ""),qty:Number(part.qty || 0)})).filter(part => part.name) : [],
      createdAt: typeof log.createdAt === "string" ? log.createdAt : new Date().toISOString()
    })) : [],
    moves: Array.isArray(e.moves) ? e.moves.filter(move => move && typeof move === "object").map(move => ({
      id: typeof move.id === "string" && move.id ? move.id : uid(),
      date: typeof move.date === "string" && move.date ? move.date : todayISO(),
      from: oldName(move.from || ""),
      to: oldName(move.to || ""),
      memo: typeof move.memo === "string" ? move.memo : "",
      createdAt: typeof move.createdAt === "string" ? move.createdAt : new Date().toISOString()
    })) : []
  }));

  state.ui = state.ui && typeof state.ui === "object" && !Array.isArray(state.ui) ? {...state.ui} : {lastVisit:null};
  if(!state.ui.lastVisit || typeof state.ui.lastVisit !== "object") state.ui.lastVisit = null;

  if(!("survey" in state)) state.survey = null;
  if(!Array.isArray(state.trash)) state.trash = [];
  if(!Array.isArray(state.logs)) state.logs = [];
  stripStoredPhotos(state);
  refreshGlobals(state);
  return state;
}

function loadState(){
  for(const k of [KEY, ...MIGRATE_KEYS]){
    try{
      const raw = localStorage.getItem(k);
      if(raw){
        const restored = normalize(JSON.parse(raw));
        if(k !== KEY){
          try{ localStorage.setItem(KEY, JSON.stringify(restored)); }
          catch(e){ console.warn("[Victor] 이전 데이터의 새 키 저장 실패", e); }
        }
        return restored;
      }
    }catch(e){
      console.warn(`[Victor] 저장 데이터 복구 실패: ${k}`, e);
    }
  }
  return defaultState();
}

function save(){
  stripStoredPhotos(state);
  refreshGlobals(state);
  try{
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  }catch(e){
    console.error("[Victor] 데이터 저장 실패", e);
    throw new Error("데이터를 저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.");
  }
}

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function todayISO(){
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth()+1).padStart(2,"0");
  const day = String(date.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

function itemOf(name){
  return catalog.find(x => x.name === name);
}
