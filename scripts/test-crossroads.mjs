import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
const root=path.resolve(import.meta.dirname,'../www');
const context=vm.createContext({Date,Math});
for(const file of ['crossroads-stories.js','crossroads-stories-later.js','crossroads.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),context);
const C=context.WayfareCrossroads;
const fresh=(age=20)=>({name:'Casey Test',age,alive:true,money:10000,health:70,happiness:60,smarts:50,looks:50,job:'employed',generation:1,skills:Object.fromEntries(['creativity','charisma','leadership','negotiation','finance','fitness'].map(k=>[k,20])),relationships:[{id:1,name:'Sam',type:'Friend',closeness:50}],pendingChoice:null});
function activate(s,id){const d=C.ensure(s);d.values={heart:20,drive:20,curiosity:20,courage:20};d.active={id,step:0,dueAge:s.age,startedAge:s.age,picks:[],person:'Sam',personId:1};s.pendingChoice=C.advance(s);}
let paths=0;
for(const story of C.stories){
  assert.equal(story.steps.length,3);assert.equal(new Set(story.steps.flatMap(x=>x.options.map(o=>o.label))).size,9);
  for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++){
    const s=fresh(story.min);activate(s,story.id);
    for(const [step,index]of[a,b,c].entries()){
      assert.equal(s.pendingChoice._crossroads.step,step);
      const outcome=C.resolve(s,index);assert.equal(outcome.ok,true,`${story.id}/${step}/${index}`);
      assert.equal(C.ensure(s).memories.length,step+1);assert.equal(s.pendingChoice,null);
      assert.equal(C.resolve(s,index).ok,false,'Repeated click must not replay rewards');
      if(step<2){assert.equal(C.advance(s),null,'Do not bypass a future beat');s.age=C.ensure(s).active.dueAge;s.pendingChoice=C.advance(s);assert.equal(C.scene(s).previous.choice,story.steps[step].options[index].label);assert.ok(C.scene(s).lead);}
    }
    assert.equal(C.ensure(s).completed.filter(id=>id===story.id).length,1);assert.equal(C.ensure(s).active,null);assert.ok(Number.isFinite(s.money));paths++;
  }
  const s=fresh(story.min);s.money=-1000;s.skills={};activate(s,story.id);C.ensure(s).values={heart:0,drive:0,curiosity:0,courage:0};
  for(let step=0;step<3;step++){
    const v=C.scene(s);const free=v.options.findIndex(o=>!o.cost&&!C.reason(s,o));assert.ok(free>=0,`${story.id} must have a free accessible path in every beat`);
    assert.equal(C.resolve(s,free).ok,true);if(step<2){s.age=C.ensure(s).active.dueAge;s.pendingChoice=C.advance(s);}
  }
}
console.log(`PASS ${paths} complete story paths plus 8 no-money playthroughs`);
{
 const s=fresh();C.ensure(s);const before=JSON.stringify(s.skills);const h=s.health;
 assert.equal(C.chooseFocus(s,'wellbeing').ok,true);assert.equal(s.health,h);assert.equal(JSON.stringify(s.skills),before);
 s.age++;C.applyFocus(s);assert.equal(s.health,h+3);const once=JSON.stringify(s);C.applyFocus(s);assert.equal(JSON.stringify(s),once);
 C.chooseFocus(s,'create');C.applyFocus(s);assert.equal(s.health,h+3);assert.equal(JSON.stringify(s.skills),JSON.stringify({...JSON.parse(before),fitness:22}));
 const child=fresh(4);assert.equal(C.chooseFocus(child,'ambition').ok,false);s.pendingChoice={text:'Wait',choices:[]};assert.equal(C.chooseFocus(s,'balance').ok,false);
 console.log('PASS focus applies only on aging, once per year, with age and decision gates');
}
{
 const s=fresh(20);activate(s,'spark');const baseline=JSON.stringify(s);
 for(const i of [-1,3,NaN,Infinity,'0',null,{}]){assert.equal(C.resolve(s,i).ok,false);assert.equal(JSON.stringify(s),baseline);}
 C.resolve(s,0);s.age=C.ensure(s).active.dueAge;s.pendingChoice=C.advance(s);s.money=0;const poor=JSON.stringify(s);assert.equal(C.resolve(s,1).ok,false);assert.equal(JSON.stringify(s),poor);
 s.alive=false;assert.equal(C.resolve(s,0).ok,false);
 console.log('PASS invalid, unaffordable, dead, and repeated actions do not grant rewards or consume decisions');
}
{
 const s=fresh(25);activate(s,'promise');C.resolve(s,0);s.relationships=[];s.age=C.ensure(s).active.dueAge;s.pendingChoice=C.advance(s);
 assert.match(C.scene(s).text,/no longer in your circle/);assert.equal(C.resolve(s,0).ok,true);assert.equal(s.relationships.length,0);
 const bad=fresh();bad.crossroads={active:{id:'invalid'},values:{heart:NaN},memories:[null,{}],years:[null],focus:'oops'};bad.pendingChoice={_crossroads:{id:'invalid',step:8}};
 assert.equal(C.repair(bad),true);assert.equal(bad.pendingChoice,null);assert.equal(C.ensure(bad).values.heart,0);
 console.log('PASS absent people and malformed imported Crossroads data recover safely');
}
const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://wayfare.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.requestAnimationFrame=()=>0;w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>null; // Canvas graphics are exercised in Chromium, not JSDOM.
const ctx=dom.getInternalVMContext(),evaluate=code=>vm.runInContext(code,ctx);
try{
 for(const script of w.document.querySelectorAll('script')){const src=script.getAttribute('src');vm.runInContext(src?fs.readFileSync(path.join(root,src),'utf8'):script.textContent,ctx,{filename:src||'index-inline.js'});}
 evaluate("startNewLife({name:'Player <img src=x onerror=alert(1)>'});closeModal();state.age=5;state.pendingChoice=null;state.health=100;saveGame();ageUp();");
 assert.equal(evaluate('state.age'),6);assert.ok(evaluate('state.pendingChoice._crossroads'));
 assert.equal(w.document.querySelector('#main').firstElementChild.id,'pending-life-choice');
 w.document.querySelector('.choice-btn:not(:disabled)').click();assert.equal(evaluate('state.crossroads.memories.length'),1);
 evaluate("crOpenChronicle()");assert.ok(w.document.querySelector('.cr-memory'));assert.equal(w.document.querySelector('.cr-memory img'),null);
 evaluate("const remembered=JSON.stringify(state.crossroads);saveGame();state=null;loadGame();window.crossroadsReloaded=JSON.stringify(state.crossroads)===remembered;");assert.equal(w.crossroadsReloaded,true);
 evaluate("delete state.crossroads;state.age=42;state.money=1234;state.pendingChoice={text:'Old save decision',choices:[{label:'Keep going',result:'Done',deltas:[]}]};saveGame();loadGame();repairProgressionState();state.activeTab='story';render();");
 assert.equal(evaluate('state.money'),1234);assert.equal(evaluate('state.pendingChoice.text'),'Old save decision');w.document.querySelector('.choice-btn').click();
 evaluate('crOpenFocus()');assert.equal(w.document.querySelectorAll('.cr-focus-option').length,6);
 w.document.querySelectorAll('.cr-focus-option')[1].click();assert.equal(evaluate('state.crossroads.focus'),'discover');
 evaluate("state.activeTab='story';state.crossroads.active={id:'second',step:0,dueAge:42,startedAge:42,picks:[],person:'Sam',personId:1};state.pendingChoice=WayfareCrossroads.advance(state);render();resolveChoice(0);state.children=[{name:'Avery',age:19,relId:999}];state.relationships.push({id:999,name:'Avery',type:'Child',closeness:80});continueAsChild(0);");
 assert.equal(evaluate('state.generation'),2);assert.equal(evaluate('state.familyChronicle.length'),1);assert.equal(evaluate('state.familyChronicle[0].memories.length'),1);assert.equal(evaluate('state.crossroads.memories.length'),0);
 evaluate("crossChronicleMode='family';crOpenChronicle();");assert.match(w.document.querySelector('#main').textContent,/Generation 1/);assert.equal(w.document.querySelector('#main img'),null);
 assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));
 evaluate("state.age=25;WayfareCore.bucketList.ensure(state);state.activeTab='travel';render();");
 assert.ok(w.document.querySelector('.travel-hero'));assert.equal(w.document.querySelector('#main').classList.contains('crossroads-screen'),false);
 evaluate("state.activeTab='story';render();");assert.ok(w.document.querySelector('.bucket-card'));assert.ok(w.document.querySelector('.cr-hero'));
 console.log('PASS real client age-up, choice UI, focus picker, old-save migration, reload, text safety, generation handoff, travel, and bucket lists');
}finally{w.close();}
console.log('Crossroads regression checks passed.');
