import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const required=['tour.kicker','tour.title.1','tour.body.1','tour.title.2','tour.body.2','tour.title.3','tour.body.3','tour.title.4','tour.body.4','tour.progress','tour.previous','tour.next','tour.skip','tour.finish'];
const dictionaries=Object.fromEntries(['pt-BR','en','es'].map(locale=>[locale,JSON.parse(readFileSync(`i18n/${locale}.json`,'utf8'))]));
for(const [locale,dictionary] of Object.entries(dictionaries)) {
 for(const key of required) assert.equal(typeof dictionary[key],'string',`${locale}: missing ${key}`);
 assert.ok(required.every(key=>dictionary[key].trim()),`${locale}: empty translation`);
}
const i18n=readFileSync('js/i18n.js','utf8'),onboarding=readFileSync('js/onboarding.js','utf8');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function mount(locale,{completed=false}={}) {
 const dom=new JSDOM('<!doctype html><html><head></head><body><main id="app"></main><button id="previous-focus">Focus</button></body></html>',{url:'https://example.test/Thcode/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.localStorage.setItem('thcode.app.v2',JSON.stringify({settings:{lang:locale}}));
 if(completed)w.localStorage.setItem('thcode.tour.v2','done');
 w.fetch=async input=>{
  const match=String(input).match(/i18n\/(pt-BR|en|es)\.json/);
  return match?{ok:true,json:async()=>dictionaries[match[1]]}:{ok:false,status:404,json:async()=>({})};
 };
 const panels=[];w.ThcodeTest={Panel:{open(name){panels.push(name)}}};
 w.document.querySelector('#previous-focus').focus();
 w.eval(i18n);await w.ThcodeI18n.ready();w.eval(onboarding);
 for(let i=0;i<80&&!w.document.querySelector('[role="dialog"]');i++)await delay(10);
 if(completed)assert.equal(w.document.querySelector('[role="dialog"]'),null,`${locale}: completed tour repeated`);
 else assert.ok(w.document.querySelector('[role="dialog"]'),`${locale}: first-run tour did not appear`);
 return {dom,w,panels};
}
function byClass(w,name){const e=w.document.querySelector('.'+name);assert.ok(e,`missing .${name}`);return e}
for(const locale of ['pt-BR','en','es']) {
 const {dom,w,panels}=await mount(locale);const dict=dictionaries[locale];
 const dialog=w.document.querySelector('[role="dialog"]');assert.equal(dialog.getAttribute('aria-modal'),'true');
 assert.equal(byClass(w,'thcode-tour-kicker').textContent,dict['tour.kicker']);
 assert.equal(byClass(w,'thcode-tour-title').textContent,dict['tour.title.1']);
 assert.equal(byClass(w,'thcode-tour-description').textContent,dict['tour.body.1']);
 assert.equal(byClass(w,'thcode-tour-progress').textContent,dict['tour.progress'].replace('{current}','1').replace('{total}','4'));
 const skip=byClass(w,'thcode-tour-skip'),next=byClass(w,'thcode-tour-next');
 await delay(20);assert.equal(w.document.activeElement,skip,'focus should begin inside accessible modal');
 skip.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await delay(5);
 assert.equal(w.document.querySelector('[role="dialog"]'),null,'Skip closes the tour');assert.equal(w.localStorage.getItem('thcode.tour.v2'),'done','Skip persists dismissal');
 assert.deepEqual(panels,[],'Skip does not navigate or alter the workspace');dom.window.close();
}
const {dom,w,panels}=await mount('en');const dict=dictionaries.en;
for(let step=1;step<4;step++) {
 byClass(w,'thcode-tour-next').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await delay(15);
 assert.equal(byClass(w,'thcode-tour-title').textContent,dict[`tour.title.${step+1}`],`English step ${step+1}`);
 assert.equal(byClass(w,'thcode-tour-description').textContent,dict[`tour.body.${step+1}`]);
 assert.equal(byClass(w,'thcode-tour-progress').textContent,dict['tour.progress'].replace('{current}',String(step+1)).replace('{total}','4'));
}
assert.deepEqual(panels,['terminal','plugins','bridge'],'steps open the real terminal, plugins catalog and Android Bridge');
const back=byClass(w,'thcode-tour-back');assert.equal(back.hidden,false,'Previous step is available after step one');
back.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await delay(15);
assert.equal(byClass(w,'thcode-tour-title').textContent,dict['tour.title.3']);assert.equal(panels.at(-1),'plugins');
byClass(w,'thcode-tour-next').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await delay(15);
assert.equal(byClass(w,'thcode-tour-title').textContent,dict['tour.title.4']);
assert.equal(w.document.activeElement.tagName,'BUTTON','Focus remains trapped in the dialog');
byClass(w,'thcode-tour-next').focus();
w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
assert.equal(w.document.activeElement,byClass(w,'thcode-tour-skip'),'Tab wraps to first control');
w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await delay(5);
assert.equal(w.document.querySelector('[role="dialog"]'),null,'Escape closes the tour');assert.equal(w.localStorage.getItem('thcode.tour.v2'),'done');
assert.deepEqual(panels,['terminal','plugins','bridge','plugins','bridge']);dom.window.close();
const finished=await mount('en',{completed:true});await delay(25);assert.equal(finished.w.document.querySelector('[role="dialog"]'),null,'Completed tour does not repeat');finished.dom.window.close();
console.log('PASS: accessible four-step first-run tour in pt-BR/en/es, real panel navigation, previous/next, Tab/Escape/Skip, persistence and no-repeat');
