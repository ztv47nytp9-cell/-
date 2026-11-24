const {spawnSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const args of [
 ...['app.js','workflow.js','storage.js','fieldwork.js','sw.js'].map(f=>['--check',f]),
 ...['input-usability','menu-186','field-automation-178','field-review-177','probe-field-177','critical-sequences','pwa-update'].map(f=>['tests/'+f+'.cjs'])
]){
 const r=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',timeout:120000});
 if(r.error||r.status!==0){console.error('배포 검사 실패:',args.join(' '),r.error?.message||'');process.exit(1);}
}
console.log('배포 검사 통과');
