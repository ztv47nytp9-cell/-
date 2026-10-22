// Manual browser preview with a local mock API. Never points at the real cloud.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),counts=new Map();
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/mobile'){
    const width=[360,390,430].includes(Number(url.searchParams.get('width')))?Number(url.searchParams.get('width')):390;
    res.setHeader('Content-Type','text/html');
    res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>Victor 좁은 화면 검증</title><body style="margin:0;background:#dce2e9;display:grid;place-items:center;min-height:100vh;font:14px sans-serif"><main><p>Chrome ${width}px 레이아웃 검증 · 실제 iPhone 아님 · 운영 공유 차단</p><iframe title="Victor 테스트" src="/app?scenario=200" style="display:block;width:${width}px;height:844px;border:1px solid #7c8999;border-radius:16px;background:white"></iframe></main></body></html>`);return;
  }
  if(url.pathname.startsWith('/mock/')){
    const mode=url.pathname.split('/')[2],count=(counts.get(mode)||0)+1;counts.set(mode,count);
    const status=mode==='recover'?(count===1?503:200):Number(mode)||200;
    console.log(JSON.stringify({mock:mode,request:count,method:req.method,status}));
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    res.setHeader('Content-Type',status===521?'text/html':'application/json');
    res.writeHead(status).end(status===200?'[]':status===521?'<html>synthetic gateway page</html>':JSON.stringify({code:status===404?'PGRST205':'MOCK',message:'resource_snapshots mock only'}));return;
  }
  if(url.pathname==='/sw.js'){res.writeHead(404).end();return;}
  const relative=url.pathname==='/'||url.pathname==='/app'?'index.html':url.pathname.slice(1),file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>{
    if(error){res.writeHead(404).end();return;}
    if(relative==='app.js'){
      const referer=new URL(req.headers.referer||'http://localhost'),mode=referer.searchParams.get('scenario')||'503';
      const safeMode=['503','521','403','401','404','recover','200'].includes(mode)?mode:'503';
      bytes=Buffer.from(bytes.toString().replace(/const DEFAULT_CLOUD_SHARE_CONFIG = \{[\s\S]*?\n\};/,`const DEFAULT_CLOUD_SHARE_CONFIG = {url:"http://127.0.0.1:${server.address().port}/mock/${safeMode}",key:"test-only",siteId:"mock",title:"테스트 자원현황"};`));
    }
    res.setHeader('Content-Type',relative.endsWith('.js')?'application/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.png')?'image/png':relative.endsWith('.json')?'application/json':'text/html');res.end(bytes);
  });
});
server.listen(0,'127.0.0.1',()=>console.log(`MOCK_PREVIEW=http://127.0.0.1:${server.address().port}/app?scenario=503`));
