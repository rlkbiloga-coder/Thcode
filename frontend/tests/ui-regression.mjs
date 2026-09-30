import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
const html=readFileSync('index.html','utf8');
const errors=[];
const dom=new JSDOM(html,{url:'https://example.com/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});w.Element.prototype.scrollIntoView=function(){};
w.fetch=async()=>{throw new Error('offline-test')};w.addEventListener('error',e=>errors.push(e.message));
w.eval(readFileSync('script.js','utf8'));
for(const f of ['thcode-pro','thcode-server','thcode-promo','thcode-legal'])w.eval(readFileSync('js/'+f+'.js','utf8'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<100 && w.document.querySelector('#app').classList.contains('hidden');i++)await sleep(100);
const W=w.ThcodeTest;assert.ok(W);
w.document.querySelector('#lgAccept').click();w.document.querySelector('#cbEss').click();
W.Page.open('test','Test',e=>e.textContent='ok');W.Page.open('test','Test',e=>e.textContent='ok');assert.equal(W.Page.stack.length,1);
W.Page.close();W.Page.open('test','Test',e=>e.textContent='new');await sleep(220);assert.equal(w.document.querySelector('#pageRoot').classList.contains('hidden'),false);W.Page.close();
W.Drawer.open();await sleep(40);W.Drawer.close();W.Drawer.open();await sleep(320);assert.equal(w.document.querySelector('#drawer').classList.contains('hidden'),false);W.Drawer.close();
W.Panel.open('files');w.document.querySelector('#panelClose').click();assert.equal(W.Panel.isOpen(),false);
W.Panel.open('files');await w.ThcodeServer.connect('https://test.invalid','');assert.equal(w.document.querySelector('#panelTitle').textContent,'Arquivos');
assert.equal(w.document.querySelector('#highlightCode').textContent, W.Ed.value() + '\n', 'syntax layer changed original source');
const ids=[...w.document.querySelectorAll('[id]')].map(e=>e.id);assert.equal(ids.length,new Set(ids).size);
const rail=[...w.document.querySelectorAll('.rail-btn')].map(e=>e.dataset.panel);assert.equal(rail.length,new Set(rail).size);
/* ---- PRO: #5 explainFix e #3 Device (File System Access) ---- */
{
  const P=w.ThcodePro;assert.ok(P&&P.explainFix,'PRO sem explainFix');
  W.fSet('/MeuJarvis/app.js','function soma(a,b){return a+b}');W.openFile('/MeuJarvis/app.js');
  P.explainFix();await sleep(300);
  const inp=w.document.querySelector('#agentIn');
  /* explainFix preenche e envia: o campo é limpo pelo sendAgent, então valida a mensagem enviada */
  const sent=W.AI.agentMsgs.find(m=>m.role==='you');
  assert.ok(sent&&sent.text.includes('Explique'),'prompt explainFix não enviado ao agente');
  assert.ok(W.AI.ctx.includes('/MeuJarvis/app.js'),'arquivo fora do contexto');
  assert.ok(P.Device,'PRO sem Device');
  if(!P.Device.available()){
    await P.Device.open();await sleep(150);
    assert.ok(w.document.querySelector('#pageBody').textContent.includes('indispon'),'sem aviso honesto do Device');
    W.Page.close();
  }
  W.fSet('/MeuJarvis/nota.txt','conteúdo');W.openFile('/MeuJarvis/nota.txt');
  let clicked=false;const proto=w.HTMLAnchorElement.prototype;const _c=proto.click;proto.click=function(){clicked=true};
  if(!w.URL.createObjectURL)w.URL.createObjectURL=()=>'blob:test';
  await P.Device.saveDownload();proto.click=_c;
  assert.ok(clicked,'saveDownload não gerou download');
  assert.deepEqual(errors,[]);
}
assert.deepEqual(errors,[]);
console.log('PASS: full modules boot, consent, page deduplication, page/drawer race, close button, background connection isolation, unique IDs and rail, zero JS errors');
w.close();
