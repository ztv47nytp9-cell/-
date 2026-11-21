const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const root=path.resolve(__dirname,'..'),p=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
 await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
 await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
 const before=await p.evaluate(()=>{openFastSurveySetup();document.querySelector('#fastSurveyWarehouse').value=warehouses[0];document.querySelector('#startFastSurvey').click();return JSON.stringify(state.stock);});
 await p.click('#surveyDiscover');await p.fill('#surveyFoundQty','3');await p.click('#surveyFoundSave');
 assert.equal(await p.evaluate(()=>Object.values(state.survey.checked).filter(Boolean).length),1);
 await p.fill('#surveyApplyMemo','창고 확인 메모');await p.reload();await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);await p.evaluate(()=>enterFastSurvey());
 assert.equal(await p.inputValue('#surveyApplyMemo'),'창고 확인 메모');
 assert.match(await p.locator('#surveyListProgress').innerText(),/1 \/ /);
 await p.evaluate(()=>{const b=document.querySelector('[data-match-group]:not(:disabled)');b.closest('details').open=true;b.click();});
 await p.click('#acceptConfirm');assert.equal(await p.evaluate(()=>Object.values(state.survey.values).includes(3)),true);
 assert.equal(await p.evaluate(()=>JSON.stringify(state.stock)),before);
 await p.click('#fastReview');assert.ok(await p.locator('#applyFastSurvey').isVisible());
 assert.equal(await p.inputValue('#surveyApplyMemo'),'창고 확인 메모');await p.fill('#surveyApplyMemo','수정 메모');await p.click('#reviewBack');assert.equal(await p.inputValue('#surveyApplyMemo'),'수정 메모');
 console.log('PASS warehouse list discovery, resume, category confirmation preserves counts, no stock writes before review');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
