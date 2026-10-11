/* User names, save text, and story text always use textContent. */
function crNode(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function crButton(cls,text,action){const b=crNode('button',cls,text);b.type='button';b.onclick=action;return b;}
function crKicker(text){return crNode('div','cr-kicker',text);}
function crOpenChronicle(){state.activeTab='chronicle';render();}
function crMoney(n){return `${n<0?'−':n>0?'+':''}${fmtMoney(Math.abs(n))}`;}
function crDialog(title,sub){
  const sheet=document.getElementById('modal-sheet');sheet.replaceChildren();sheet.dataset.crossroadsDialog='true';
  sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','cr-dialog-title');
  const head=crNode('div','cr-dialog-head');const copy=crNode('div');copy.append(crKicker(sub));const h=crNode('h2','cr-dialog-title',title);h.id='cr-dialog-title';copy.append(h);
  const close=crButton('cr-close','×',()=>{closeModal();delete sheet.dataset.crossroadsDialog;document.querySelector('#main button')?.focus();});close.setAttribute('aria-label','Close dialog');head.append(copy,close);sheet.append(head);
  document.getElementById('modal-overlay').classList.add('show');requestAnimationFrame(()=>close.focus());return sheet;
}
function crOpenFocus(){
  const d=WayfareCrossroads.ensure(state),sheet=crDialog('What gets your time?','Your intention for the next year');
  sheet.append(crNode('p','cr-muted','Choose freely until you age up. The effects happen once as the next year begins. This does not replace your life ambition.'));
  const list=crNode('div','cr-focus-options');
  WayfareCrossroads.focuses.forEach(f=>{
    const locked=state.age<f.min,selected=d.focus===f.id;
    const button=crButton('cr-focus-option'+(selected?' selected':''),'',()=>{
      const out=WayfareCrossroads.chooseFocus(state,f.id);if(!out.ok){toast(out.reason);return;}
      saveGame();closeModal();delete sheet.dataset.crossroadsDialog;render();toast(`${f.short} set for your next year.`);
    });
    button.disabled=locked||!state.alive||Boolean(state.pendingChoice);button.setAttribute('aria-pressed',String(selected));
    button.append(crNode('span','cr-focus-icon',f.icon));const copy=crNode('span','cr-focus-copy');copy.append(crNode('strong','',f.name),crNode('span','cr-muted',locked?`Available at age ${f.min}`:f.copy),crNode('span','cr-stakes',WayfareCrossroads.effectText(f.effects)));button.append(copy,crNode('span','cr-check',selected?'✓':'↗'));list.append(button);
  });sheet.append(list);
  if(state.pendingChoice)sheet.append(crNode('p','cr-notice','Resolve your current life decision before changing your focus.'));
}
function crRenderHero(main){
  const d=WayfareCrossroads.ensure(state),chapter=WayfareCrossroads.chapter(state.age),identity=WayfareCrossroads.identity(state);
  const hero=crNode('section','cr-hero');hero.setAttribute('aria-label','Your current life chapter');
  const art=crNode('div','cr-hero-art');art.setAttribute('aria-hidden','true');hero.append(art);
  const topline=crNode('div','cr-hero-top');topline.append(crNode('span','cr-edition','WAYFARE / CROSSROADS'),crNode('span','cr-chapter-number',`CHAPTER ${chapter.number}`));hero.append(topline);
  const copy=crNode('div','cr-hero-copy');copy.append(crNode('div','cr-hero-age',`AGE ${state.age} · GENERATION ${state.generation||1}`),crNode('h1','cr-hero-title',chapter.name),crNode('p','cr-hero-caption',chapter.caption));hero.append(copy);
  const bottom=crNode('div','cr-hero-bottom');const who=crButton('cr-identity-link','',crOpenChronicle);who.append(crNode('span','cr-identity-spark','✧'),crNode('span','',identity.title),crNode('span','cr-link-arrow','↗'));bottom.append(who,crNode('span','cr-hero-count',`${d.completed.length} ${d.completed.length===1?'story':'stories'} lived`));hero.append(bottom);main.append(hero);
  const track=crNode('div','cr-chapter-track');track.setAttribute('aria-label',`Chapter ${Number(chapter.number)} of 6: ${chapter.name}`);
  ['Firsts','Becoming','Horizons','Building','Depth','Legacy'].forEach((name,i)=>{const part=crNode('span',i+1===Number(chapter.number)?'current':i+1<Number(chapter.number)?'past':'',name);track.append(part);});main.append(track);
}
function crRenderYear(main){
  const d=WayfareCrossroads.ensure(state),year=d.years.at(-1);if(!year)return;
  const section=crNode('section','cr-year-card'),head=crNode('div','cr-section-head');head.append(crKicker(`Age ${year.age} · Year in review`),crButton('cr-text-button','All years ↗',()=>{crossChronicleMode='years';crOpenChronicle();}));section.append(head);
  const metrics=crNode('div','cr-year-metrics');
  for(const [key,label] of [['cash','Cash change'],['health','Health'],['happiness','Happiness'],['smarts','Smarts']]){
    const delta=Math.round(year.after[key]-year.before[key]);const metric=crNode('div','cr-metric');metric.append(crNode('strong',delta<0?'negative':delta>0?'positive':'',key==='cash'?crMoney(delta):`${delta>0?'+':''}${delta}`),crNode('span','',label));metrics.append(metric);
  }section.append(metrics);main.append(section);
}
function crRenderIntentions(main){
  const d=WayfareCrossroads.ensure(state),f=WayfareCrossroads.focusById(d.focus);const grid=crNode('div','cr-intentions');
  const focus=crButton('cr-intention cr-focus-card','',crOpenFocus);focus.append(crKicker('Your next year'));
  const row=crNode('span','cr-intention-row');row.append(crNode('span','cr-intention-icon',f.icon),crNode('strong','',f.name),crNode('span','cr-link-arrow','↗'));focus.append(row,crNode('span','cr-muted',WayfareCrossroads.effectText(f.effects)));grid.append(focus);
  const active=d.active,story=active&&WayfareCrossroads.byId(active.id);
  const arc=crButton('cr-intention cr-arc-card','',()=>{if(state.pendingChoice?._crossroads)openPendingLifeChoice();else crOpenChronicle();});
  arc.append(crKicker(story?`${story.theme} · Part ${active.step+1} of 3`:'Your unfolding story'));
  arc.append(crNode('strong','cr-arc-title',story?story.title:state.age<6?'The first pages are yours':d.completed.length?'Another door will open':'A life full of turning points'));
  arc.append(crNode('span','cr-muted',story?(state.pendingChoice?._crossroads?'A decision is waiting for you.':`The next part returns at age ${active.dueAge}.`):state.age<6?'Connected stories begin at age 6.':'New stories emerge as you age and your life changes.'));
  const dots=crNode('div','cr-beats');for(let i=0;i<3;i++)dots.append(crNode('span',active&&i<active.step?'done':active&&i===active.step?'current':''));arc.append(dots);grid.append(arc);main.append(grid);
}
function crRenderChoice(main){
  if(!state.pendingChoice)return;
  const cross=state.pendingChoice._crossroads?WayfareCrossroads.scene(state):null;
  const card=crNode('section','event-card pending-choice-card'+(cross?' cr-decision':''));card.id='pending-life-choice';card.tabIndex=-1;
  const heading=crNode('div','cr-section-head');heading.append(crKicker(cross?`${cross.story.theme} / Part ${cross.a.step+1} of 3`:`A moment that matters / Age ${state.age}`),crNode('span','cr-decision-symbol','↗'));card.append(heading);
  if(cross){card.append(crNode('h2','cr-decision-title',cross.step.title));
    if(cross.previous){const echo=crNode('div','cr-echo');echo.append(crNode('span','cr-echo-label',`Because at age ${cross.previous.age}…`),crNode('strong','',cross.previous.choice),crNode('p','',cross.lead||'That choice is part of how you arrived here.'));card.append(echo);}}
  card.append(crNode('p','event-text',state.pendingChoice.text));const choices=crNode('div','choice-btns');
  state.pendingChoice.choices.forEach((c,i)=>{
    const option=cross?.options[i],reason=option?WayfareCrossroads.reason(state,option):c._costGate!==undefined&&state.money<c._costGate?`Needs ${fmtMoney(c._costGate)} cash.`:'';
    const b=crButton('choice-btn','',()=>{try{resolveChoice(i);}catch(e){console.error(e);openErrorModal(e);}});
    const line=crNode('span','cr-choice-line');line.append(crNode('span','cr-option-number',String(i+1).padStart(2,'0')),crNode('span','choice-label',c.label),crNode('span','cr-choice-arrow','↗'));b.append(line);
    if(option?.trail)b.append(crNode('span','cr-choice-trail',option.trail));
    if(c._stakes)b.append(crNode('span','choice-stakes',c._stakes));
    if(reason)b.append(crNode('span','cr-lock-reason',reason));b.disabled=Boolean(reason);choices.append(b);
  });card.append(choices);main.append(card);
}
function renderCrossroadsStory(main){
  main.classList.add('story-screen','crossroads-screen');crRenderChoice(main);crRenderHero(main);crRenderIntentions(main);crRenderYear(main);
  const tools=crNode('div','cr-tools');tools.append(crButton('cr-tool','Your Chronicle ↗',()=>{crossChronicleMode='decisions';crOpenChronicle();}),crButton('cr-tool',`Achievements · ${Object.keys(unlockedAch).length}/${ACHIEVEMENTS.length}`,openAchievementsModal));main.append(tools);
  const world=crNode('details','cr-world');const summary=crNode('summary');summary.append(crNode('span','','The rest of your world'),crNode('span','cr-muted','Career, people, goals & projects'));world.append(summary);
  const inside=crNode('div','cr-world-body');renderLifeSnapshot(inside,JOBS.find(j=>j.id===state.job));renderCompanionStrip(inside);renderAmbitionSummary(inside);renderBucketList(inside);renderDailyJourneyCard(inside);world.append(inside);main.append(world);
  const label=crNode('div','cr-section-head cr-timeline-heading');label.append(crKicker('The everyday & the extraordinary'),crNode('span','cr-muted','Latest first'));main.append(label);main.append(crNode('h2','cr-section-title','Life, as it happens.'));renderTimelineControls(main);
  const visibleFeed=state.feed.filter(item=>timelineMode!=='year'||item.age===state.age);
  visibleFeed.slice(0,timelineLimit).forEach((item,i)=>{
    const card=crNode('div','event-card'+(i===0?' latest-event':''));card.append(crNode('div','event-age',`Age ${item.age}`),crNode('div','event-text',item.text));
    const deltas=crNode('div','cr-feed-deltas');(item.deltas||[]).forEach(([key,n])=>{if(key==='money')return;deltas.append(crNode('span',`event-delta ${n>=0?'delta-pos':'delta-neg'}`,`${WayfareCrossroads.labels[key]||key} ${n>=0?'+':''}${n}`));});if(deltas.children.length)card.append(deltas);main.append(card);
  });
  if(!visibleFeed.length)main.append(crNode('p','cr-muted','No moments recorded for this year yet.'));renderTimelineMore(main,visibleFeed.length);
}

let timelineLimit = 15;
let timelineMode = 'all';
function renderTimelineControls(main) {
  const row = crNode('div', 'timeline-controls');
  for (const [id, label] of [['all', 'All years'], ['year', 'This year']]) {
    const button = crNode('button', 'timeline-filter' + (timelineMode === id ? ' selected' : ''), label);
    button.setAttribute('aria-pressed', String(timelineMode === id));
    button.onclick = () => { timelineMode = id; timelineLimit = 15; render(); };
    row.append(button);
  }
  main.append(row);
}
function renderTimelineMore(main, count) {
  if (count <= timelineLimit) return;
  const button = crNode('button', 'panel-action secondary timeline-more', `Show older moments (${count - timelineLimit} more)`);
  button.onclick = () => { timelineLimit += 15; render(); };
  main.append(button);
}
