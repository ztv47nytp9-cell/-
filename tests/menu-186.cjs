const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/hjchu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
p.on('pageerror',e=>errors.push(e.message));
const root=path.resolve(__dirname,'..');await p.route('**/*',route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));return u.origin==='http://localhost'&&f.startsWith(root+path.sep)&&fs.existsSync(f)?route.fulfill({path:f}):route.abort();});
await p.goto('http://localhost');await p.waitForFunction(()=>typeof appStarted!=='undefined'&&appStarted);
for(const width of [320,390,768])for(const theme of ['light','dark']){
 await p.setViewportSize({width,height:844});await p.evaluate(t=>applyThemeMode(t),theme);
 const menu=p.getByRole('button',{name:'메뉴',exact:true});assert.equal(await menu.count(),1);
 const ui=await menu.evaluate(b=>{const box=b.getBoundingClientRect(),icon=b.querySelector('svg').getBoundingClientRect(),host=b.closest('.top-actions');
 return {text:host.innerText.trim(),target:[box.width,box.height],icon:[icon.width,icon.height],pseudo:[host,b].flatMap(el=>['::before','::after'].map(p=>getComputedStyle(el,p).content))};});
 assert.equal(ui.text,'');assert.ok(ui.target.every(n=>n>=44));assert.deepEqual(ui.icon,[22,22]);assert.ok(ui.pseudo.every(c=>['none','normal','""'].includes(c)));
}
await p.setViewportSize({width:390,height:844});console.log('PASS icon-only home menu: 3 widths x 2 themes, accessible name and tap target');
await p.evaluate(()=>{state.survey={active:true,index:0,items:[{warehouse:'A',name:'M'},{warehouse:'A',name:'N'}],checked:{'A|M':true}};});
await p.getByRole('button',{name:'메뉴',exact:true}).click();
assert.equal(await p.locator('#moreBtn').isVisible(),false);
assert.match(await p.locator('#pageFastSurveyBtn').innerText(),/실사 이어하기[\s\S]*A · 1\/2종/);
assert.equal(await p.locator('#pageResetBtn').isVisible(),false);
await p.locator('#pageThemeBtn').selectOption('dark');assert.equal(await p.evaluate(()=>readThemeMode()),'dark');
await p.locator('#menuData summary').click();assert.equal(await p.locator('#pageBackupBtn').isVisible(),true);
await p.locator('#pageCloudSettingsBtn').click();await p.locator('#cloudShareUrl').fill('https://example.supabase.co');
await p.evaluate(()=>{window.oldConfig=localStorage.getItem(CLOUD_SHARE_CONFIG_KEY);cloudShareHead=async c=>{window.checkedUrl=c.url;return null;};});
await p.locator('#testCloudShare').click();assert.equal(await p.evaluate(()=>window.checkedUrl),'https://example.supabase.co');
assert.ok(await p.evaluate(()=>window.oldConfig===localStorage.getItem(CLOUD_SHARE_CONFIG_KEY)));
await p.evaluate(()=>closeEntryModal());assert.ok(await p.locator('#menuData').evaluate(d=>d.open));
await p.locator('#menuRecovery summary').click();assert.equal(await p.locator('#pageResetBtn').isVisible(),true);
assert.deepEqual(errors,[]);console.log('PASS mobile menu, resume counts, theme, return state, read-only connection and protected reset');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
