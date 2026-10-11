let crossChronicleMode='decisions';
function crRenderIdentity(main){
  const identity=WayfareCrossroads.identity(state),card=crNode('section','cr-identity-card');card.append(crKicker('Becoming, through your choices'),crNode('h2','cr-section-title',identity.title),crNode('p','cr-muted','Your decisions and yearly intentions shape these qualities. This is a reflection of your choices, not a fixed personality.'));
  const values=crNode('div','cr-values');WayfareCrossroads.axes.forEach(key=>{
    const row=crNode('div','cr-value');const head=crNode('div','cr-value-head');head.append(crNode('span','',WayfareCrossroads.labels[key]),crNode('strong','',String(identity.values[key])));const bar=crNode('div','cr-value-bar');bar.setAttribute('role','meter');bar.setAttribute('aria-label',WayfareCrossroads.labels[key]);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(identity.values[key]));const fill=crNode('span');fill.style.width=`${identity.values[key]}%`;bar.append(fill);row.append(head,bar);values.append(row);
  });card.append(values);main.append(card);
}
function crRenderMemory(main,m){
  const story=WayfareCrossroads.byId(m.storyId);const card=crNode('article','cr-memory');card.append(crKicker(`Age ${m.age} · ${story.title}`),crNode('h3','cr-memory-title',m.title||story.title));
  if(m.previous&&typeof m.previous.choice==='string')card.append(crNode('p','cr-memory-cause',`A continuation of “${m.previous.choice}” at age ${m.previous.age}.`));
  card.append(crNode('div','cr-memory-choice',m.choice),crNode('p','cr-memory-result',m.result));
  const effects=crNode('div','cr-memory-effects');(Array.isArray(m.changes)?m.changes:[]).forEach(x=>{if(!x||typeof x.label!=='string')return;effects.append(crNode('span',x.amount<0?'negative':'positive',x.key==='friend'?x.label:`${x.key==='money'?crMoney(x.amount):`${x.amount>0?'+':''}${x.amount}`} ${x.label}`));});card.append(effects);main.append(card);
}
function renderChronicle(main){
  main.classList.add('crossroads-screen','chronicle-screen');const d=WayfareCrossroads.ensure(state);
  const top=crNode('div','cr-section-head');top.append(crKicker('Wayfare / A record of becoming'),crButton('cr-text-button','← Back to Life',()=>{state.activeTab='story';render();}));main.append(top,crNode('h1','cr-page-title','Your Chronicle.'),crNode('p','cr-page-intro','Not just what happened. What you chose, what it changed, and what stayed with you.'));
  crRenderIdentity(main);
  if(d.active){const story=WayfareCrossroads.byId(d.active.id);const active=crNode('section','cr-active-story');active.append(crKicker('An unfolding story'),crNode('h2','cr-memory-title',story.title),crNode('p','cr-muted',`${d.active.step}/3 decisions made · ${state.pendingChoice?._crossroads?'Your next decision is ready.':`Continues at age ${d.active.dueAge}.`}`));if(state.pendingChoice?._crossroads)active.append(crButton('panel-action','Make your decision',openPendingLifeChoice));main.append(active);}
  const tabs=crNode('div','cr-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Chronicle view');[['decisions','Decisions'],['years','Years'],['family','Family']].forEach(([id,title])=>{const b=crButton('cr-tab'+(crossChronicleMode===id?' active':''),title,()=>{crossChronicleMode=id;render();});b.setAttribute('aria-pressed',String(crossChronicleMode===id));tabs.append(b);});main.append(tabs);
  if(crossChronicleMode==='decisions'){
    if(!d.memories.length){const empty=crNode('section','cr-empty');empty.append(crNode('div','cr-empty-symbol','✧'),crNode('h2','cr-memory-title','The pages are still open.'),crNode('p','cr-muted',state.age<6?'Your first connected story begins from age 6. Until then, take your time growing up.':'Age up to discover a story. Your decisions will leave a record here, including the choices that lead to later moments.'));main.append(empty);}
    [...d.memories].reverse().forEach(m=>crRenderMemory(main,m));
  }else if(crossChronicleMode==='years'){
    if(!d.years.length)main.append(crNode('p','cr-empty','Your first year in review appears after you age up. Older saves begin recording from this update.'));
    [...d.years].reverse().forEach(y=>{
      const row=crNode('article','cr-year-entry'),f=WayfareCrossroads.focusById(y.focus);row.append(crNode('strong','cr-year-age',String(y.age)));const copy=crNode('div');copy.append(crKicker(`Age ${y.age} / ${f.short}`),crNode('p','',`Health ${Math.round(y.after.health)} · Happiness ${Math.round(y.after.happiness)} · Smarts ${Math.round(y.after.smarts)}`));row.append(copy,crNode('strong','cr-year-cash',crMoney(y.after.cash-y.before.cash)));main.append(row);
    });
  }else{
    const family=Array.isArray(state.familyChronicle)?state.familyChronicle:[];
    main.append(crNode('p','cr-page-intro','When you continue as a child, a record of the previous life travels with the family. Earlier generations from before this update cannot be reconstructed.'));
    if(!family.length)main.append(crNode('div','cr-empty','You are writing the first recorded chapter of this family.'));
    [...family].reverse().forEach(life=>{if(!life||typeof life.name!=='string')return;const card=crNode('article','cr-memory');card.append(crKicker(`Generation ${life.generation} · Lived to ${life.age}`),crNode('h2','cr-memory-title',life.name),crNode('p','cr-muted',`${life.identity} · ${life.completed} connected stories completed`));(Array.isArray(life.memories)?life.memories:[]).slice(-3).forEach(m=>{if(m)card.append(crNode('p','cr-family-memory',`Age ${m.age}: ${m.result}`));});main.append(card);});
  }
}
function crFamilyRecord(){const d=WayfareCrossroads.ensure(state);return [...(Array.isArray(state.familyChronicle)?state.familyChronicle:[]),{name:state.name,age:state.age,generation:state.generation||1,identity:WayfareCrossroads.identity(state).title,completed:d.completed.length,memories:d.memories.slice(-3).map(m=>({age:m.age,result:m.result}))}].slice(-8);}
function crRenderLegacy(){
  const d=WayfareCrossroads.ensure(state);if(!d.memories.length)return;
  const panel=crNode('section','legacy-panel cr-legacy');panel.append(crKicker('The choices that stayed'),crNode('h2','cr-memory-title',WayfareCrossroads.identity(state).title));d.memories.slice(-3).forEach(m=>{panel.append(crNode('p','cr-family-memory',`Age ${m.age}: ${m.result}`));});document.getElementById('legacy-content').append(panel);
}
document.addEventListener('keydown',e=>{
  const sheet=document.getElementById('modal-sheet'),overlay=document.getElementById('modal-overlay');
  if(!sheet?.dataset.crossroadsDialog||!overlay.classList.contains('show'))return;
  if(e.key==='Escape'){e.preventDefault();closeModal();delete sheet.dataset.crossroadsDialog;return;}
  if(e.key==='Tab'){const buttons=[...sheet.querySelectorAll('button:not(:disabled),[href],input,select,textarea,[tabindex="0"]')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
});
