const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const playwright=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const passed=[];
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(data);});
});
const pass=label=>{passed.push(label);console.log('PASS '+label);};
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const browser=await playwright.chromium.launch({headless:true,channel:'chrome'});
  const errors=[];
  const fresh=async(width=390,serviceWorkers='block')=>{
    const context=await browser.newContext({viewport:{width,height:844},hasTouch:width<600,isMobile:width<600,serviceWorkers});
    const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',error=>errors.push(error.message));const messages=[];page.on('console',msg=>{if(msg.type()==='warning'||msg.type()==='error')messages.push(msg.text());});
    if(serviceWorkers==='block')await context.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
    else await context.addInitScript(()=>{const original=window.fetch;window.fetch=(input,options)=>new URL(typeof input==='string'?input:input.url,location.href).origin===location.origin?original(input,options):Promise.reject(new TypeError('Isolated test blocks external APIs'));});
    await page.goto(url);await page.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
    await page.waitForTimeout(550);return {context,page,messages};
  };
  try{
    const {context,page}=await fresh();
    await page.evaluate(()=>{
      const a=warehouses[0],b=warehouses[1],item=catalog[0];
      state.stock[a][item.name]=80;state.stock[b][item.name]=25;
      state.hnsLegacy={substances:[{name:'보존 자료'}]};state.catalog[0].photo='data:image/png;base64,legacy';
      state.equipment[0].managementNo='CG-105';state.equipment[0].photos=['legacy-photo'];
      state.records.push({id:'legacy-transfer',date:'2025-01-01',type:'이송',flow:'이송',status:'done',title:'과거 이송',warehouse:a,targetWarehouse:b,items:[{...item,qty:2,warehouse:a,targetWarehouse:b,before:12,after:10,targetBefore:1,targetAfter:3,targetDiff:2}],equipmentItems:[{id:'legacy',qty:1,name:'과거 장비',toEquipmentId:'destination-id',transferMeta:'keep'}],editHistory:[{warehouseBefore:a,warehouseAfter:b}],editedAt:'2025-01-02T00:00:00Z',customField:{keep:true}});
      state.schemaVersion=SCHEMA_VERSION;save();
      window.fixture={a,b,name:item.name,unit:item.unit};
    });
    await page.reload();await page.waitForFunction(()=>appStarted);
    assert.equal(await page.evaluate(()=>state.records.find(r=>r.id==='legacy-transfer').items[0].targetAfter),3);
    assert.equal(await page.evaluate(()=>state.records.find(r=>r.id==='legacy-transfer').equipmentItems[0].toEquipmentId),'destination-id');
    assert.equal(await page.evaluate(()=>state.records.find(r=>r.id==='legacy-transfer').editHistory.length),1);
    assert.equal(await page.evaluate(()=>state.catalog[0].photo),'data:image/png;base64,legacy');
    assert.equal(await page.evaluate(()=>state.equipment[0].managementNo),'CG-105');
    assert.deepEqual(await page.evaluate(()=>state.equipment[0].photos),['legacy-photo']);
    assert.equal(await page.evaluate(()=>state.legacyData.hns.hnsLegacy.substances[0].name),'보존 자료');
    await page.evaluate(()=>setPage('warehouse'));
    assert.equal(await page.locator('[data-storage-view="hns"]').count(),0);
    pass('기존 이송·품목별 장소·수정이력·관리번호·사진·HNS 자료 보존');

    const prepare=async(flow,title,qty)=>page.evaluate(({flow,title,qty})=>{
      pendingFormBaseline='';pendingFormRecordId='';clearRegisterDraft();draftItems=[];draftEquipmentItems=[];registerMode='normal';registerFlow=flow;setPage('register',{skipGuard:true});
      document.getElementById('recType').value='작업';document.getElementById('recType').dispatchEvent(new Event('change'));document.getElementById('recTitle').value=title;
      document.getElementById('recWarehouse').value=warehouses[0];draftItems=[{...catalog[0],qty,warehouse:warehouses[0]}];renderItems();
    },{flow,title,qty});
    await prepare('출고','통합 출고',5);await page.click('#saveRecord');
    assert.equal(await page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]),75);
    assert.equal(await page.evaluate(()=>state.records.at(-1).items[0].after),75);
    assert.ok(await page.evaluate(()=>state.records.at(-1).time&&state.records.at(-1).device));
    await page.click('#undoSnack');
    assert.equal(await page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]),80);
    pass('출고 재고차감·시각·기기 기록 및 실행취소');
    await prepare('입고','통합 입고',4);await page.click('#saveRecord');
    assert.equal(await page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]),84);
    pass('입고 재고증가·이력 저장');
    await prepare('출고','초과 입력',100);await page.click('#saveRecord');
    assert.equal(await page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]),84);
    assert.equal(await page.evaluate(()=>state.records.find(r=>r.title==='초과 입력')?.stockReview),true);assert.equal(await page.locator('#homeStockReview').count(),1);
    await prepare('출고','음수 입력',-1);await page.click('#saveRecord');
    assert.equal(await page.evaluate(()=>state.records.some(r=>r.title==='음수 입력')),false);
    pass('재고 초과 기록 보관·기존 재고 유지·음수 차단');

    await prepare('출고','즉시 전환 입력 유지',1);await page.fill('#recMemo','전환 직전 메모');
    await page.click('#flowIn');assert.equal(await page.locator('#recTitle').inputValue(),'즉시 전환 입력 유지');assert.equal(await page.locator('#recMemo').inputValue(),'전환 직전 메모');
    await page.click('#modeQuick');assert.equal(await page.locator('#recTitle').inputValue(),'즉시 전환 입력 유지');assert.equal(await page.locator('#recType').inputValue(),'사고');
    pass('입·출고/긴급 전환 직전 입력 보존 및 사고 위치 표시');

    await prepare('입고','중복 잠금',1);
    await page.evaluate(()=>{state.records.push(createFlowRecord({flow:'입고',type:'작업',date:todayISO(),title:'중복 잠금',warehouse:warehouses[0],memo:'',items:draftItems}));save();});
    const countBefore=await page.evaluate(()=>state.records.length);
    await page.evaluate(()=>{document.getElementById('saveRecord').click();document.getElementById('saveRecord').click();});
    await page.click('#acceptConfirm');await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>state.records.length),countBefore+1);
    pass('확인창을 포함한 연속 저장 중복 차단');

    await page.evaluate(()=>{openEntryModal('<div class="form"><input id="preservedInput" value="작성내용"><button id="preservedButton">입력 버튼</button></div>');window.savedButtonCalls=0;document.getElementById('preservedButton').onclick=()=>window.savedButtonCalls++;window.confirmResult=askConfirm('폼 보존','취소 테스트');});
    await page.click('#cancelConfirm');
    assert.equal(await page.locator('#preservedInput').inputValue(),'작성내용');await page.click('#preservedButton');
    assert.equal(await page.evaluate(()=>window.savedButtonCalls),1);await page.evaluate(()=>closeEntryModal());
    pass('확인 취소 후 원래 입력폼·이벤트 유지');

    await page.evaluate(()=>{clearRegisterDraft();draftItems=[];draftEquipmentItems=[];registerMode='quick';setPage('register',{skipGuard:true});document.getElementById('recType').value='훈련';document.getElementById('recTitle').value='현장 훈련';draftItems=[{...catalog[0],qty:2,warehouse:warehouses[0]}];renderItems();});
    const stockBeforePending=await page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]);
    await page.click('#saveRecord');
    assert.equal(await page.evaluate(()=>state.records.at(-1).status),'pending');
    assert.equal(await page.evaluate(()=>state.records.at(-1).type),'훈련');
    assert.equal(await page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]),stockBeforePending);
    await page.evaluate(()=>{window.pendingId=state.records.at(-1).id;openDetail(window.pendingId);});
    await page.fill('#pendingMemo','미반영 수정');
    await page.evaluate(()=>{setPage('home');});await page.click('#cancelConfirm');
    assert.equal(await page.locator('#pendingMemo').inputValue(),'미반영 수정');
    await page.click('#savePending');
    assert.equal(await page.evaluate(()=>state.records.find(r=>r.id===window.pendingId).memo),'미반영 수정');
    await page.click('#applyPending');await page.click('#acceptConfirm');
    assert.equal(await page.evaluate(()=>state.records.find(r=>r.id===window.pendingId).status),'done');
    assert.equal(await page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]),stockBeforePending-2);
    await page.click('#undoSnack');
    assert.equal(await page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]),stockBeforePending);
    pass('긴급 훈련 미반영·수정·뒤로가기 보호·재고반영·실행취소');

    await prepare('입고','저장 실패 복구',3);
    await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===KEY)throw new DOMException('test quota','QuotaExceededError');return window.originalSetItem.call(this,key,value);};});
    await page.click('#saveRecord');
    assert.equal(await page.locator('#recTitle').inputValue(),'저장 실패 복구');
    assert.equal(await page.locator('#saveRecord').isDisabled(),false);
    assert.equal(await page.evaluate(()=>state.records.some(r=>r.title==='저장 실패 복구')),false);
    await page.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);
    await page.click('#saveRecord');
    assert.equal(await page.evaluate(()=>state.records.filter(r=>r.title==='저장 실패 복구').length),1);
    await page.evaluate(()=>{state.memos.push({id:'later',date:todayISO(),title:'이후 작업',body:'유지'});save();});
    await page.click('#undoSnack');
    assert.equal(await page.evaluate(()=>state.memos.some(m=>m.id==='later')),true);
    pass('저장공간 실패 롤백·입력 유지·재시도 및 이후 작업 보호');

    await page.evaluate(()=>{clearRegisterDraft();draftItems=[];draftEquipmentItems=[];setPage('home',{skipGuard:true});openMaterialInfoForm(catalog[0].name);});
    await page.fill('#materialMinimum','200');await page.click('#saveMaterialInfo');
    assert.equal(await page.evaluate(()=>stockLevel(catalog[0]).label),'부족');
    await page.evaluate(()=>{closeEntryModal();setPage('home',{skipGuard:true});});
    assert.equal(await page.locator('#homeStockAttention strong').innerText(),'1');
    pass('최소재고 설정·부족 배지·홈 부족 집계');

    await page.evaluate(()=>{setPage('warehouse',{skipGuard:true});selectedWarehouse=warehouses[0];editWarehouseInfo(warehouses[0]);});
    await page.fill('#warehouseOffice','통영해경');await page.fill('#warehouseDetailLocation','3번 랙');await page.click('#saveWarehouseMemo');
    assert.match(await page.evaluate(()=>placeLabel(warehouses[0])),/통영해경.*3번 랙/);
    await prepare('출고','품목별 장소',1);
    await page.evaluate(()=>{draftItems=[{...catalog[0],qty:1,warehouse:warehouses[1]}];renderItems();});
    assert.match(await page.locator('#itemArea .resource-location').innerText(),/25/);
    pass('계층형 보관 메모·품목별 실제 위치/수량 표시');

    await page.evaluate(()=>{clearRegisterDraft();draftItems=[];draftEquipmentItems=[];setPage('home',{skipGuard:true});state.assetOps['방제지휘차량']={distanceBase:100,logs:[],maintenance:[],counterMode:'absolute'};save();addOpLog('방제지휘차량');});
    await page.fill('#opLogDistance','125');assert.match(await page.locator('#opDistancePreview').innerText(),/25km/);
    await page.locator('#entryDialog details>summary').click();await page.fill('#opLogStartTime','09:00');await page.fill('#opLogEndTime','10:30');await page.fill('#opLogPurpose','현장 점검');await page.fill('#opLogOperator','담당자');
    await page.click('#saveOpLog');
    assert.equal(await page.evaluate(()=>state.assetOps['방제지휘차량'].logs.at(-1).diff),25);
    assert.equal(await page.evaluate(()=>state.assetOps['방제지휘차량'].logs.at(-1).elapsedHours),1.5);
    assert.equal(await page.evaluate(()=>state.assetOps['방제지휘차량'].logs.at(-1).driver),'담당자');
    pass('차량 누적거리·자동 거리·시간·목적·담당자 저장');

    await page.evaluate(()=>{state.assetOps['소형방제정']={logs:[],maintenance:[],fuelLogs:[],mileageBase:3,portHoursBase:10,starboardHoursBase:12,fuelBase:20,counterMode:'absolute',engineSplitMode:'dual'};save();addOpLog('소형방제정');});
    await page.fill('#opLogPortHours','12');await page.fill('#opLogStarboardHours','15');await page.fill('#opLogFuel','21');await page.click('#saveOpLog');
    assert.equal(await page.evaluate(()=>state.assetOps['소형방제정'].logs.length),0);
    await page.fill('#opLogFuel','');await page.click('#saveOpLog');
    assert.equal(await page.evaluate(()=>state.assetOps['소형방제정'].portHoursBase),12);
    assert.equal(await page.evaluate(()=>state.assetOps['소형방제정'].fuelBase),20);
    assert.equal(await page.evaluate(()=>state.assetOps['소형방제정'].mileageBase),3);
    pass('방제정 엔진 누적·마일/연료 선택입력·음수 연료재고 차단');

    await page.evaluate(()=>{const log=state.assetOps['소형방제정'].logs.at(-1);log.legacyExtra='유지';save();window.beforeOpEdit=JSON.stringify(log);editLatestOpLog('소형방제정',log.id);});
    await page.fill('#editOpDate','2026-10-04');await page.fill('#editOpMemo','변경 메모');await page.fill('#editOpPortAfter','1');await page.click('#saveOpEdit');
    assert.equal(await page.evaluate(()=>JSON.stringify(state.assetOps['소형방제정'].logs.at(-1))===window.beforeOpEdit),true);
    await page.fill('#editOpPortAfter','13');await page.evaluate(()=>{window.beforeEditSave=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===KEY)throw new DOMException('test quota','QuotaExceededError');return window.beforeEditSave.call(this,key,value);};});await page.click('#saveOpEdit');
    await page.evaluate(()=>Storage.prototype.setItem=window.beforeEditSave);await page.click('#saveOpEdit');
    assert.equal(await page.evaluate(()=>state.assetOps['소형방제정'].logs.at(-1).legacyExtra),'유지');
    assert.equal(await page.evaluate(()=>state.assetOps['소형방제정'].logs.at(-1).date),'2026-10-04');
    assert.equal(await page.evaluate(()=>state.assetOps['소형방제정'].portHoursBase),13);
    assert.equal(await page.evaluate(()=>state.assetOps['소형방제정'].logs.at(-1).editHistory.length),1);
    assert.match(await page.evaluate(()=>assetPeriodSummary([{kind:'운항',log:state.assetOps['소형방제정'].logs.at(-1)}])),/좌현 3h/);
    pass('운항 수정 validation·저장 실패 재시도·과거 필드·수정이력·기간 합계');

    await page.evaluate(()=>{const name=catalog[0].name,place=warehouses[0],qty=state.stock[place][name];state.survey={lastApplied:{changes:[{name,warehouse:place,before:qty-1,after:qty-2}]}};save();window.beforeSurveyUndo=JSON.stringify(state.stock);void undoLastSurvey();});
    assert.equal(await page.evaluate(()=>JSON.stringify(state.stock)===window.beforeSurveyUndo),true);
    assert.equal(await page.locator('#acceptConfirm').count(),0);
    await page.evaluate(()=>{void requestUploadPin();});await page.click('#closeEntryModal');assert.equal(await page.locator('#entryModal').evaluate(node=>node.classList.contains('show')),false);
    assert.deepEqual(await page.evaluate(()=>{const rows=[{name:'동일',qty:1},{name:'동일',qty:2}];restoreObjectInPlace(rows,[{name:'동일',qty:3},{name:'동일',qty:4}]);return [rows[0].qty,rows[1].qty,rows[0]!==rows[1]];}),[3,4,true]);
    pass('실사 이후 재고변경 보호·PIN 취소·동명 중복행 롤백 보존');

    const downloadPromise=page.waitForEvent('download');await page.evaluate(()=>backup());const download=await downloadPromise;
    const backupData=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(backupData.catalog[0].photo,'data:image/png;base64,legacy');
    await page.evaluate(()=>{state.stock[warehouses[0]][catalog[0].name]=1;save();});
    await page.evaluate(data=>restoreFile(new File([JSON.stringify(data)],'backup.json',{type:'application/json'})),backupData);await page.click('#acceptConfirm');await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]),backupData.stock[backupData.warehouses[0]][backupData.catalog[0].name]);
    assert.equal(await page.evaluate(()=>readSafetyPoints().some(point=>point.label==='전체 복원 전')),true);
    assert.equal(await page.evaluate(()=>csvCell('=CMD(1)')),'"\'=CMD(1)"');
    assert.ok(await page.evaluate(()=>csvRows('vehicle').length>1));
    await page.evaluate(()=>{state.equipment[0].maintenance.push({id:'csv-maint',date:todayISO(),type:'점검',content:'점검 완료'});save();});
    assert.ok(await page.evaluate(()=>csvRows('equipmentHistory').some(row=>row.includes('csv-maint'))));
    const restoreBefore=await page.evaluate(()=>localStorage.getItem(KEY));
    await page.evaluate(()=>restoreFile(new File([JSON.stringify({schemaVersion:999,warehouses:[],catalog:[],stock:{},records:[]})],'new.json')));await page.waitForTimeout(60);
    assert.equal(await page.evaluate(()=>localStorage.getItem(KEY)),restoreBefore);
    pass('전체 JSON 백업·사진 보존·확인 복원·안전지점·CSV 수식 방어');

    await page.evaluate(()=>{state.records.push(...Array.from({length:130},(_,i)=>({id:'page-'+i,date:todayISO(),title:'페이지 '+i,type:i%2?'훈련':'작업',flow:'출고',status:'done',warehouse:warehouses[1],items:[{...catalog[0],qty:1,warehouse:warehouses[1]}],equipmentItems:[],createdAt:new Date().toISOString()})));save();historyFilter='all';setPage('history',{skipGuard:true});});
    assert.equal(await page.locator('#histList [data-detail]').count(),40);await page.click('#historyMore');assert.equal(await page.locator('#histList [data-detail]').count(),80);
    await page.click('#historyFilters > summary');await page.selectOption('#historyTypeFilter','훈련');assert.ok(await page.evaluate(()=>historyRenderRecords.every(record=>record.type==='훈련')));
    await page.click('#clearHistoryFilter');assert.equal(await page.locator('#historyTypeFilter').inputValue(),'all');
    pass('이력 페이지 분할·사고/훈련/장소 필터·초기화');

    await page.evaluate(()=>{state.trash.push({id:'old-trash',kind:'record',deletedAt:'2020-01-01T00:00:00Z',data:{id:'old-data',title:'오래된 삭제자료',date:'2020-01-01',status:'pending',items:[],equipmentItems:[]}});save();openTrash();});
    assert.equal(await page.locator('[data-trash-restore="old-trash"]').count(),1);await page.evaluate(()=>closeEntryModal());
    assert.equal(await page.evaluate(()=>state.trash.some(entry=>entry.id==='old-trash')),true);
    assert.equal(await page.evaluate(()=>canReverseRecord({flow:'입고',warehouse:warehouses[0],items:[{name:catalog[0].name,qty:1e9}]})),false);
    assert.equal(await page.evaluate(()=>canRestoreTrashEntry({kind:'equipment',data:state.equipment[0]})),false);
    await page.evaluate(()=>{for(let i=0;i<5;i++)createSafetyPoint('보관 '+i,state);});assert.equal(await page.evaluate(()=>readSafetyPoints().length),3);
    pass('오래된 삭제자료 유지·재고 음수 삭제 차단·중복 복원 차단·안전지점 3개 유지');

    const qa=path.resolve(root,'..','outputs','victor-qa');fs.mkdirSync(qa,{recursive:true});
    await page.evaluate(()=>{clearTimeout(window.__snackTimer);document.getElementById('snackbar').classList.remove('show');clearRegisterDraft();setPage('home',{skipGuard:true});applyThemeMode('light');});await page.waitForTimeout(350);await page.screenshot({path:path.join(qa,'home-light.png'),fullPage:true});
    await page.evaluate(()=>applyThemeMode('dark'));await page.screenshot({path:path.join(qa,'home-dark.png'),fullPage:true});
    await prepare('입고','입력 화면',1);await page.screenshot({path:path.join(qa,'register-dark.png'),fullPage:true});
    await page.evaluate(()=>addOpLog('소형방제정'));await page.screenshot({path:path.join(qa,'vessel-form-dark.png')});await page.evaluate(()=>closeEntryModal());
    await page.evaluate(()=>{clearRegisterDraft();setPage('home',{skipGuard:true});applyThemeMode('light');});

    await page.evaluate(()=>{clearRegisterDraft();setPage('home',{skipGuard:true});});
    for(const width of [360,390,768,1280]){await page.setViewportSize({width,height:844});await page.evaluate(()=>setPage('home',{skipGuard:true}));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.ok((await page.locator('#homeQuickOut').boundingBox()).height>=44);}
    await page.setViewportSize({width:390,height:844});await prepare('입고','모바일 입력',1);
    await page.evaluate(()=>{window.fakeViewport=new EventTarget();Object.assign(window.fakeViewport,{height:380,offsetTop:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:window.fakeViewport});document.getElementById('recMemo').focus();scheduleInputVisibility();});
    await page.waitForTimeout(350);const bounds=await page.locator('#recMemo').boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=380,JSON.stringify(bounds));
    await page.evaluate(()=>addOpLog('소형방제정'));await page.fill('#opLogMemo','키보드 상태의 마지막 항목');await page.waitForTimeout(350);
    await page.locator('#saveOpLog').scrollIntoViewIfNeeded();const modalSave=await page.locator('#saveOpLog').boundingBox();assert.ok(modalSave.y>=0&&modalSave.y+modalSave.height<=380,JSON.stringify(modalSave));
    await page.evaluate(()=>closeEntryModal());
    pass('360/390/768/1280 가로넘침 없음·44px 터치영역·축소 viewport 입력');
    await context.close();

    const transfer=await fresh();
    await transfer.page.evaluate(()=>{const [a,b]=warehouses;ensureWarehouse('테스트 도착');const name=catalog[0].name;state.stock[a][name]=10;state.stock[b][name]=20;state.stock['테스트 도착'][name]=0;state.equipment.push({id:'transfer-device',name:'시험 장비',place:a,qty:3,cat:'기타장비',moves:[],maintenance:[],managementNo:'KEEP-01'});save();clearRegisterDraft();registerMode='normal';registerFlow='이송';setPage('register',{skipGuard:true});document.getElementById('recTitle').value='여러 창고 이송';document.getElementById('recWarehouse').value=a;document.getElementById('recTargetWarehouse').value='테스트 도착';draftItems=[{...catalog[0],qty:2,warehouse:a},{...catalog[0],qty:3,warehouse:b}];draftEquipmentItems=[{id:'transfer-device',name:'시험 장비',qty:1,place:a}];renderItems();renderEquipmentItems();});
    await transfer.page.click('#saveRecord');
    assert.deepEqual(await transfer.page.evaluate(()=>{const name=catalog[0].name;return [state.stock[warehouses[0]][name],state.stock[warehouses[1]][name],state.stock['테스트 도착'][name],state.equipment.find(item=>item.id==='transfer-device').qty];}),[8,17,5,2]);
    await transfer.page.reload();await transfer.page.waitForFunction(()=>appStarted);
    assert.equal(await transfer.page.evaluate(()=>state.records.find(record=>record.title==='여러 창고 이송').items.length),2);
    assert.equal(await transfer.page.evaluate(()=>state.records.find(record=>record.title==='여러 창고 이송').equipmentItems[0].transferMode),'partial');
    assert.equal(await transfer.page.evaluate(()=>state.equipment.find(item=>item.id==='transfer-device').managementNo),'KEEP-01');
    assert.ok(await transfer.page.evaluate(()=>csvRows('records').some(row=>row.at(-1)==='장비')));
    await transfer.context.close();pass('복수 창고 자재+장비 부분이송·재실행·관리번호·CSV 장비행');

    const migration=await fresh();
    const original=await migration.page.evaluate(()=>{const old=JSON.parse(JSON.stringify(state));old.appBuild='104';old.customLegacy={keep:true};const raw=JSON.stringify(old);localStorage.setItem(KEY,raw);return raw;});
    await migration.page.reload();await migration.page.waitForFunction(()=>appStarted);
    assert.equal(await migration.page.evaluate(()=>localStorage.getItem(KEY)),original);
    await migration.page.evaluate(()=>{window.originalSafetyWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===SAFETY_POINTS_KEY)throw new DOMException('test quota','QuotaExceededError');return window.originalSafetyWrite.call(this,key,value);};});
    assert.match(await migration.page.evaluate(()=>{try{save();return '';}catch(error){return error.message;}}),/안전지점/);
    assert.equal(await migration.page.evaluate(()=>localStorage.getItem(KEY)),original);
    await migration.page.evaluate(()=>Storage.prototype.setItem=window.originalSafetyWrite);
    await migration.page.evaluate(()=>save());
    assert.ok(await migration.page.evaluate(()=>readSafetyPoints().some(point=>point.state.appBuild==='104'&&point.state.customLegacy.keep)));
    const competitor=await migration.context.newPage();await competitor.goto(url);await competitor.waitForFunction(()=>appStarted);
    await competitor.evaluate(()=>{state.memos.push({id:'other-tab',title:'다른 창 저장',body:'유지',date:todayISO()});save();});
    const disk=await competitor.evaluate(()=>localStorage.getItem(KEY));
    const conflict=await migration.page.evaluate(()=>{state.memos.push({id:'conflicting',title:'저장 차단',date:todayISO()});try{save();return '';}catch(error){return error.message;}});
    assert.match(conflict,/다른 창/);assert.equal(await migration.page.evaluate(()=>localStorage.getItem(KEY)),disk);
    await migration.context.close();pass('이전 버전 자동 안전지점·동시 창 변경 덮어쓰기 차단');

    for(const raw of ['{invalid',JSON.stringify({schemaVersion:999,warehouses:['원본'],catalog:[],stock:{},records:[]})]){
      const broken=await browser.newContext({serviceWorkers:'block'});const p=await broken.newPage();
      await broken.addInitScript(value=>localStorage.setItem('victor_state_alpha_0_19_0e',value),raw);await p.goto(url);await p.waitForSelector('.startup-error');
      assert.equal(await p.evaluate(()=>localStorage.getItem('victor_state_alpha_0_19_0e')),raw);assert.ok(await p.locator('#saveRawRecovery').isVisible());await broken.close();
    }
    pass('손상 데이터·미지원 최신 schema 원본 보존 및 복구 안내');

    const offline=await fresh(390,'allow');try{await offline.page.waitForFunction(()=>navigator.serviceWorker.controller);}catch(error){console.error(offline.messages,await offline.page.evaluate(async()=>({caches:await caches.keys(),registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.state,waiting:r.waiting?.state,installing:r.installing?.state}))})));throw error;}
    await offline.page.evaluate(()=>{state.memos.push({id:'offline',date:todayISO(),title:'오프라인',body:'자료 유지'});save();});
    await offline.context.setOffline(true);await offline.page.reload({waitUntil:'domcontentloaded'});await offline.page.waitForFunction(()=>appStarted);
    assert.equal(await offline.page.evaluate(()=>state.memos.some(m=>m.id==='offline')),true);
    await offline.page.evaluate(()=>{clearRegisterDraft();registerMode='normal';registerFlow='입고';setPage('register',{skipGuard:true});document.getElementById('recType').value='작업';document.getElementById('recTitle').value='오프라인 입고';draftItems=[{...catalog[0],qty:2,warehouse:warehouses[0]}];renderItems();});
    await offline.page.click('#saveRecord');await offline.page.reload({waitUntil:'domcontentloaded'});await offline.page.waitForFunction(()=>appStarted);
    assert.equal(await offline.page.evaluate(()=>state.records.some(r=>r.title==='오프라인 입고')),true);
    const offlineRegister=async(mode,title,qty,equipment=false)=>offline.page.evaluate(({mode,title,qty,equipment})=>{clearRegisterDraft();draftItems=[];draftEquipmentItems=[];registerMode=mode;registerFlow='출고';setPage('register',{skipGuard:true});document.getElementById('recType').value='훈련';document.getElementById('recType').dispatchEvent(new Event('change'));document.getElementById('recTitle').value=title;if(equipment){const item=state.equipment.find(row=>row.qty>0);draftEquipmentItems=[{...item,qty:1}];renderEquipmentItems();}else{draftItems=[{...catalog[0],qty,warehouse:warehouses[0]}];renderItems();}},{mode,title,qty,equipment});
    await offlineRegister('normal','오프라인 출고',1);await offline.page.click('#saveRecord');
    await offlineRegister('quick','오프라인 긴급',1);await offline.page.click('#saveRecord');
    await offline.page.evaluate(()=>openDetail(state.records.find(record=>record.title==='오프라인 긴급').id));await offline.page.click('#applyPending');await offline.page.click('#acceptConfirm');
    await offlineRegister('normal','오프라인 장비',0,true);await offline.page.click('#saveRecord');
    await offline.page.evaluate(()=>{pendingFormBaseline='';pendingFormRecordId='';setPage('home',{skipGuard:true});addOpLog('방제지휘차량');});await offline.page.fill('#opLogDistance','5');await offline.page.click('#saveOpLog');
    await offline.page.evaluate(()=>addOpLog('소형방제정'));await offline.page.fill('#opLogPortHours','1');await offline.page.fill('#opLogStarboardHours','1');await offline.page.click('#saveOpLog');
    await offline.page.reload({waitUntil:'domcontentloaded'});await offline.page.waitForFunction(()=>appStarted);
    assert.deepEqual(await offline.page.evaluate(()=>['오프라인 입고','오프라인 출고','오프라인 긴급','오프라인 장비'].map(title=>state.records.some(record=>record.title===title&&record.status==='done'))),[true,true,true,true]);
    assert.equal(await offline.page.evaluate(()=>state.stock[warehouses[0]][catalog[0].name]),0);
    assert.equal(await offline.page.evaluate(()=>state.assetOps['방제지휘차량'].logs.at(-1).diff),5);
    assert.equal(await offline.page.evaluate(()=>state.assetOps['소형방제정'].logs.at(-1).portDiff),1);
    const activeCache=fs.readFileSync(path.join(root,'sw.js'),'utf8').match(/const CACHE_NAME="([^"]+)"/)[1];
    assert.ok((await offline.page.evaluate(()=>caches.keys())).includes(activeCache));
    await offline.context.close();pass('PWA 오프라인 조회·입출고·긴급 반영·장비·차량·방제정·재실행 유지');
    assert.deepEqual(errors,[]);console.log('\nALL PASS: '+passed.length+' groups');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
