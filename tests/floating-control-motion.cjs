/* Verifies the back/save controls keep one slide duration on iPhone-style reduced motion. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.VICTOR_PLAYWRIGHT||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
    const page=await context.newPage();
    const css=fs.readFileSync(path.join(root,'interface.css'),'utf8');
    await page.setContent(`<html data-theme="dark"><head><style>${css}</style></head><body><button id="contextBack">‹ 뒤로</button><div class="register-save-dock"><button id="saveRecord">진행 중 사건 저장</button></div></body></html>`);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>{document.documentElement.classList.add('is-scrolling-ui');document.body.classList.add('is-scrolling-ui');});
    const getControls=()=>page.evaluate(()=>{
      const back=document.querySelector('#contextBack:not([hidden]), #view .back.persistent-back');
      const save=document.querySelector('.register-save-dock #saveRecord');
      return [back,save].map(element=>{
        if(!element)return null;
        const style=getComputedStyle(element),animation=element.getAnimations()[0];
        return {duration:style.transitionDuration.split(',')[0].trim(),easing:style.transitionTimingFunction,y:new DOMMatrixReadOnly(style.transform).m42,animationDuration:animation?.effect?.getTiming().duration};
      });
    });
    await page.waitForFunction(()=>{
      const back=document.querySelector('#contextBack:not([hidden]), #view .back.persistent-back'),save=document.querySelector('.register-save-dock #saveRecord');
      return [back,save].every(element=>element&&new DOMMatrixReadOnly(getComputedStyle(element).transform).m42>0);
    });
    let controls=await getControls();
    assert.ok(controls.every(Boolean),'both floating controls should be visible');
    assert.deepEqual(controls.map(control=>control.duration),['0.3s','0.3s']);
    assert.equal(controls[0].easing,controls[1].easing,'back and save must use identical easing');
    assert.ok(controls.every(control=>control.y>0),'both controls should move down while scrolling');
    assert.deepEqual(controls.map(control=>control.animationDuration),[300,300]);
    await page.waitForTimeout(320);
    await page.evaluate(()=>{document.documentElement.classList.remove('is-scrolling-ui');document.body.classList.remove('is-scrolling-ui');});
    await page.waitForTimeout(30);
    controls=await getControls();
    assert.deepEqual(controls.map(control=>control.duration),['0.1s','0.1s']);
    assert.equal(controls[0].easing,controls[1].easing,'return easing must also match');
    assert.deepEqual(controls.map(control=>control.animationDuration),[100,100]);
    await page.waitForTimeout(220);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>{document.documentElement.classList.add('is-scrolling-ui');document.body.classList.add('is-scrolling-ui');});
    await page.waitForFunction(()=>{
      const back=document.querySelector('#contextBack:not([hidden]), #view .back.persistent-back'),save=document.querySelector('.register-save-dock #saveRecord');
      const animations=[back,save].map(element=>element?.getAnimations().find(animation=>animation.transitionProperty==='transform'));
      return animations.every(animation=>animation?.effect?.getTiming().duration===300);
    });
    controls=await getControls();
    assert.deepEqual(controls.map(control=>control.duration),['0.3s','0.3s']);
    await page.waitForTimeout(320);
    await page.evaluate(()=>{document.documentElement.classList.remove('is-scrolling-ui');document.body.classList.remove('is-scrolling-ui');});
    await page.waitForTimeout(30);
    controls=await getControls();
    assert.deepEqual(controls.map(control=>control.duration),['0.1s','0.1s']);
    assert.deepEqual(controls.map(control=>control.animationDuration),[100,100]);
    console.log('PASS reduced and normal motion: 300ms down, 100ms return');
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
