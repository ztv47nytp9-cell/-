// Reproducible 10-round audit. No browser, production storage or external requests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),outputName=process.env.VICTOR_AUDIT_OUTPUT||'field-audit-10';
if(!/^[a-z0-9-]+$/.test(outputName))throw Error('Use a simple audit output folder name');
const out=path.resolve(root,'../outputs',outputName);
const suites=['input-usability','cloud-connection','field-stability','critical-sequences','transfer-delete-safety'];
const expectedCounts={'input-usability':43,'cloud-connection':57,'field-stability':65,'critical-sequences':9,'transfer-delete-safety':15};
const production=['app.js','workflow.js','storage.js','style.css','interface.css','index.html','sw.js'];
const hashes=()=>Object.fromEntries(production.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const report={startedAt:new Date().toISOString(),rounds:10,scope:'Synthetic VM fixtures and mocked network only. Not iPhone Safari/PWA, real cloud, or UI interaction testing.',productionBefore:hashes(),syntax:[],results:[]};
fs.mkdirSync(out,{recursive:true});
const persist=()=>fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
for(const file of ['app.js','workflow.js','storage.js','sw.js',...suites.map(name=>'tests/'+name+'.cjs')]){
  const result=cp.spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8',timeout:15000});
  report.syntax.push({file,exitCode:result.status,error:result.stderr||result.error?.message||''});
}
persist();
for(let round=1;round<=10;round++){
  for(const suite of suites){
    const started=Date.now(),result=cp.spawnSync(process.execPath,['tests/'+suite+'.cjs'],{cwd:root,encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024,env:{...process.env,VICTOR_TEST_CYCLE:String(round)}});
    const output=(result.stdout||'')+(result.stderr||'')+(result.error?'\n'+result.error.message:'');
    const passed=(output.match(/^PASS /gm)||[]).length,failed=(output.match(/^FAIL /gm)||[]).length;
    const log=`round-${String(round).padStart(2,'0')}-${suite}.log`;
    fs.writeFileSync(path.join(out,log),output);
    const row={round,suite,variant:round,exitCode:result.status,ms:Date.now()-started,passed,failed,failures:output.split(/\r?\n/).filter(line=>line.startsWith('FAIL ')),summary:output.split(/\r?\n/).find(line=>line.startsWith('DONE '))||'',log};
    if(result.status!==0&&!failed)row.error=output.slice(-3000)||'Process exited without a result';
    if(!row.summary||passed+failed!==expectedCounts[suite])row.error=(row.error||'')+` Unexpected test count ${passed+failed}/${expectedCounts[suite]}`;
    report.results.push(row);persist();
    console.log(`ROUND ${round}/10 ${suite}: PASS ${passed} FAIL ${failed} (${row.ms}ms)${row.error?' RUNNER ERROR':''}`);
  }
}
report.endedAt=new Date().toISOString();report.productionAfter=hashes();
report.productionUnchanged=JSON.stringify(report.productionBefore)===JSON.stringify(report.productionAfter);
report.totalPassed=report.results.reduce((n,r)=>n+r.passed,0);report.totalFailed=report.results.reduce((n,r)=>n+r.failed,0);
report.runnerErrors=report.results.filter(row=>row.error).length;
report.uniqueFailures=[...new Set(report.results.flatMap(r=>r.failures).map(line=>line.split(' :: ')[0]))];
persist();
const roundRows=Array.from({length:10},(_,i)=>{const rows=report.results.filter(r=>r.round===i+1);return `| ${i+1} | ${rows.reduce((n,r)=>n+r.passed,0)} | ${rows.reduce((n,r)=>n+r.failed,0)} | ${rows.reduce((n,r)=>n+r.ms,0)} |`;});
fs.writeFileSync(path.join(out,'summary.md'),[
  '# VICTOR 10회 반복 검증',`시작: ${report.startedAt} / 종료: ${report.endedAt}`,'',
  `${Object.values(expectedCounts).reduce((n,count)=>n+count,0)}개 검사 × 10회. 통과 ${report.totalPassed}회 / 실패 ${report.totalFailed}회. 실행 오류 ${report.runnerErrors}건.`,
  `앱 소스 SHA-256 동일: ${report.productionUnchanged}. 구문 검사 ${report.syntax.filter(r=>r.exitCode===0).length}/${report.syntax.length}.`,
  '', '| 회차 | 통과 | 실패 | 소요(ms) |','|---|---:|---:|---:|',...roundRows,'',
  '## 재현된 실패',...report.uniqueFailures.map(line=>'- '+line),
  '', '기존 165개 회귀 검사, 연속 작업 9개, 이송·삭제 안전 검사 15개를 각각 별도 프로세스로 실행했다. 연속 작업은 회차별 수량을 바꿨다. 기대 결과는 재고·위치·참조 보존이며 안전한 취소 보류도 허용한다.',
  '가상 저장소·모의 통신만 사용했다. 실제 iPhone/Android 키패드·화면·서비스워커·운영 Supabase 동작은 이번 10회에 포함되지 않는다.',
  '각 검사 출력은 round-*.log, 세부 결과와 앱 소스 해시는 results.json에 보관했다.'
].join('\n')+'\n');
console.log(`FINAL PASS=${report.totalPassed} FAIL=${report.totalFailed} APP_UNCHANGED=${report.productionUnchanged} REPORT=${out}`);
process.exitCode=report.totalFailed||report.runnerErrors||report.syntax.some(r=>r.exitCode!==0)||!report.productionUnchanged?1:0;
