/* Crossroads is an additive, serializable domain layer. Rendering and storage stay outside it. */
(() => {
  const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
  const clamp = n => Math.max(0, Math.min(100, finite(n)));
  const object = x => x && typeof x === 'object' && !Array.isArray(x);
  const axes = ['heart','drive','curiosity','courage'];
  const skills = ['programming','leadership','negotiation','finance','fitness','cooking','creativity','charisma'];
  const stories = globalThis.WayfareStories;
  const byId = id => stories.find(s => s.id === id);
  const living = s => (Array.isArray(s.relationships) ? s.relationships : []).filter(r => r && !r.deceased && r.alive !== false);
  const focuses = [
    {id:'balance',name:'Find balance',short:'Balance',icon:'◌',min:0,copy:'Leave room to breathe.',effects:{health:1,happiness:1},values:{}},
    {id:'discover',name:'Stay curious',short:'Curiosity',icon:'✧',min:6,copy:'Learn beyond what is familiar.',effects:{smarts:2,creativity:1},values:{curiosity:1}},
    {id:'connection',name:'Show up for people',short:'Connection',icon:'♡',min:6,copy:'Give your relationships more time.',effects:{happiness:2,allBonds:2},values:{heart:1}},
    {id:'create',name:'Make something',short:'Creativity',icon:'◇',min:6,copy:'Protect time for your own ideas.',effects:{creativity:3,happiness:1},values:{curiosity:1}},
    {id:'wellbeing',name:'Care for yourself',short:'Wellbeing',icon:'☀',min:6,copy:'Put your body and mind first.',effects:{health:3,fitness:2},values:{courage:1}},
    {id:'ambition',name:'Push yourself',short:'Ambition',icon:'↗',min:16,copy:'More growth. A little less downtime.',effects:{leadership:3,negotiation:1,happiness:-2},values:{drive:1}}
  ];
  const focusById = id => focuses.find(f => f.id === id);
  const labels = {health:'Health',happiness:'Happiness',smarts:'Smarts',looks:'Looks',money:'Cash',bond:'Connection',allBonds:'All bonds',heart:'Heart',drive:'Drive',curiosity:'Curiosity',courage:'Courage',...Object.fromEntries(skills.map(s=>[s,s[0].toUpperCase()+s.slice(1)]))};
  function ensure(s) {
    if (!object(s.crossroads)) s.crossroads = {};
    const d=s.crossroads, age=finite(s.age);
    d.version=1;
    if(!object(d.values)) d.values={};
    axes.forEach(k=>d.values[k]=clamp(d.values[k]));
    if(!focusById(d.focus) || focusById(d.focus).min>age) d.focus='balance';
    if(!Number.isInteger(d.lastFocusAge)) d.lastFocusAge=age;
    if(!Number.isInteger(d.nextStoryAge)) d.nextStoryAge=Math.max(6,age+1);
    if(!Number.isInteger(d.joinedAge)) d.joinedAge=age;
    if(!Array.isArray(d.completed)) d.completed=[];
    d.completed=[...new Set(d.completed.filter(id=>byId(id)))];
    if(!Array.isArray(d.memories)) d.memories=[];
    d.memories=d.memories.filter(m=>object(m)&&byId(m.storyId)&&Number.isInteger(m.age)&&typeof m.choice==='string'&&typeof m.result==='string').slice(-96);
    if(!Array.isArray(d.years)) d.years=[];
    d.years=d.years.filter(y=>object(y)&&Number.isInteger(y.age)&&object(y.before)&&object(y.after)&&focusById(y.focus)).slice(-111);
    const a=d.active;
    if(a && (!object(a)||!byId(a.id)||!Number.isInteger(a.step)||a.step<0||a.step>2||!Number.isInteger(a.dueAge))) d.active=null;
    if(d.active){
      if(!Array.isArray(d.active.picks)) d.active.picks=[];
      d.active.picks=d.active.picks.slice(0,d.active.step).map(i=>Number.isInteger(i)&&i>=0&&i<3?i:0);
      if(typeof d.active.person!=='string')d.active.person='someone close to you';
    }
    return d;
  }
  function snapshot(s){return {cash:finite(s.money),health:finite(s.health),happiness:finite(s.happiness),smarts:finite(s.smarts),connections:living(s).length};}
  function chooseFocus(s,id){
    const f=focusById(id);
    if(!s.alive)return {ok:false,reason:'This life has ended.'};
    if(s.pendingChoice)return {ok:false,reason:'Resolve your current decision first.'};
    if(!f || s.age<f.min)return {ok:false,reason:'That focus is not available in this chapter.'};
    ensure(s).focus=id;
    return {ok:true};
  }
  function apply(s,effects,values,castId){
    const changes=[]; const d=ensure(s);
    for(const [k,n] of Object.entries(effects||{})){
      if(k==='friend'){
        if(!living(s).some(r=>r.name===n)){
          if(!Array.isArray(s.relationships))s.relationships=[];
          const id=Math.max(finite(s.nextRelId,1),...s.relationships.map(r=>finite(r.id)+1));
          s.relationships.push({id,name:n,type:'Friend',closeness:65,lastInteractedAge:s.age}); s.nextRelId=id+1;
          changes.push({key:'friend',amount:1,label:`New friend: ${n}`});
        }
      }else if(k==='allBonds'||k==='bond'){
        const targets=k==='allBonds'?living(s):living(s).filter(r=>r.id===castId);
        let total=0;targets.forEach(r=>{const before=finite(r.closeness,50);r.closeness=clamp(before+n);total+=r.closeness-before;r.lastInteractedAge=s.age;});
        if(total)changes.push({key:k,amount:n,label:labels[k]});
      }else if(skills.includes(k)){
        if(!object(s.skills))s.skills={};const before=finite(s.skills[k]);s.skills[k]=clamp(before+n);
        if(s.skills[k]!==before)changes.push({key:k,amount:s.skills[k]-before,label:labels[k]});
      }else if(['health','happiness','smarts','looks','money'].includes(k)&&Number.isFinite(n)){
        const before=finite(s[k]);s[k]=k==='money'?before+n:clamp(before+n);
        if(k==='money')s.peakMoney=Math.max(finite(s.peakMoney),s.money);
        if(s[k]!==before)changes.push({key:k,amount:s[k]-before,label:labels[k]});
      }
    }
    for(const k of axes){if(Number.isFinite(values?.[k]))d.values[k]=clamp(d.values[k]+values[k]);}
    return changes;
  }
  function applyFocus(s){
    const d=ensure(s);if(!s.alive||d.lastFocusAge>=s.age)return [];
    d.lastFocusAge=s.age;const f=focusById(d.focus);
    return apply(s,f.effects,f.values);
  }
  function recordYear(s,before){
    const d=ensure(s);if(!object(before))return;
    const year={age:s.age,before,after:snapshot(s),focus:d.focus};
    const i=d.years.findIndex(y=>y.age===s.age);if(i>=0)d.years[i]=year;else d.years.push(year);
    d.years=d.years.slice(-111);
  }
  function refreshYear(s){const d=ensure(s);const y=d.years.find(y=>y.age===s.age);if(y)y.after=snapshot(s);}
  function hash(text){let n=2166136261;for(const char of text)n=Math.imul(n^char.charCodeAt(0),16777619);return n>>>0;}
  function eligible(s,story){return s.age>=story.min&&s.age<=story.max&&(!story.needs||(story.needs==='people'?living(s).length>0:Boolean(s.job&&s.job!=='unemployed')));}
  function scene(s){
    const d=ensure(s),a=d.active;if(!a)return null;const story=byId(a.id);let step=story.steps[a.step];
    const missing=story.id==='promise'&&a.step>0&&!living(s).some(r=>r.id===a.personId);
    if(missing)step={title:'What the connection leaves',delay:1,text:'Your connection with {person} has changed, and they are no longer in your circle. The time you shared still belongs to your story. What will you carry forward?',options:[
      {label:'Keep a meaningful memory',result:'You gave an important memory a place in your life without asking the past to return.',effects:{happiness:3,creativity:2},values:{heart:3},trail:'Honour the time you shared.'},
      {label:'Carry the lesson into new connections',result:'You carried what the relationship taught you into how you show up for others.',effects:{charisma:4},values:{curiosity:3},trail:'A past connection can change how you care now.'},
      {label:'Allow yourself a new beginning',result:'You let the connection be part of your history without letting it be all of your future.',effects:{health:2,happiness:3},values:{courage:3},trail:'Make room for what comes next.'}]};
    const text=t=>String(t||'').replaceAll('{person}',a.person);
    const previous=d.memories.filter(m=>m.storyId===a.id).at(-1);
    return {story,step,a,text:text(step.text),lead:missing?'':text(step.lead?.[a.picks[a.step-1]]||''),previous,options:step.options.map(o=>({...o,result:text(o.result),trail:text(o.trail)}))};
  }
  function reason(s,o){
    if(o.cost>0&&finite(s.money)<o.cost)return `Needs $${o.cost.toLocaleString('en-US')} cash.`;
    if(o.require?.skill&&finite(s.skills?.[o.require.skill])<o.require.value)return `Needs ${o.require.value} ${labels[o.require.skill]}.`;
    if(o.require?.value&&finite(ensure(s).values[o.require.value])<o.require.amount)return `Needs ${o.require.amount} ${labels[o.require.value]}.`;
    return '';
  }
  function effectText(effects){return Object.entries(effects||{}).map(([k,n])=>k==='friend'?`Friend: ${n}`:k==='money'?`${n>=0?'+':'−'}$${Math.abs(n).toLocaleString('en-US')}`:`${n>=0?'+':''}${n} ${labels[k]||k}`).join(' · ');}
  function stakes(o){return [o.cost?`−$${o.cost.toLocaleString('en-US')}`:'Free',effectText(o.effects),Object.entries(o.values||{}).map(([k,n])=>`+${n} ${labels[k]}`).join(' · ')].filter(Boolean).join(' · ');}
  function pending(s){const v=scene(s);if(!v)return null;return {_crossroads:{id:v.a.id,step:v.a.step},text:v.text,choices:v.options.map(o=>({label:o.label,result:o.result,_stakes:stakes(o),...(o.cost?{_costGate:o.cost}:{})}))};}
  function advance(s){
    const d=ensure(s);if(!s.alive)return null;
    if(d.active)return s.age>=d.active.dueAge?pending(s):null;
    if(s.age<d.nextStoryAge)return null;
    const candidates=stories.filter(t=>eligible(s,t)&&!d.completed.includes(t.id));if(!candidates.length)return null;
    const priority=t=>(t.tag===d.focus?100:0)+(s.age>=60&&t.id==='legacy'?150:0)+(t.max-s.age<6?80:0)+(hash(`${s.name}|${s.generation||1}|${t.id}`)%61);
    candidates.sort((a,b)=>priority(b)-priority(a));
    const story=candidates[0],person=living(s)[0];
    d.active={id:story.id,step:0,dueAge:s.age,startedAge:s.age,picks:[],person:person?.name||'someone close to you',personId:person?.id??null};
    return pending(s);
  }
  function resolve(s,index){
    const d=ensure(s),v=scene(s),token=s.pendingChoice?._crossroads;
    if(!s.alive)return {ok:false,reason:'This life has ended.'};
    if(!v||!token||token.id!==v.a.id||token.step!==v.a.step||s.age<v.a.dueAge)return {ok:false,reason:'This chapter is not waiting for a decision.'};
    if(!Number.isInteger(index)||index<0||index>=v.options.length)return {ok:false,reason:'Choose one of the available paths.'};
    const o=v.options[index],blocked=reason(s,o);if(blocked)return {ok:false,reason:blocked};
    const changes=apply(s,{...o.effects,...(o.cost?{money:finite(o.effects?.money)-o.cost}:{})},o.values,v.a.personId);
    const memory={storyId:v.a.id,step:v.a.step,age:s.age,choice:o.label,result:o.result,title:v.step.title,changes,values:{...o.values},previous:v.previous?{age:v.previous.age,choice:v.previous.choice}:null};
    d.memories.push(memory);d.memories=d.memories.slice(-96);v.a.picks.push(index);v.a.step++;
    const completed=v.a.step===v.story.steps.length;
    if(completed){d.completed.push(v.a.id);d.active=null;d.nextStoryAge=s.age+3;}
    else v.a.dueAge=s.age+(v.story.steps[v.a.step].delay||1);
    s.pendingChoice=null;refreshYear(s);
    return {ok:true,completed,memory,nextAge:d.active?.dueAge||null,story:v.story.title,changes};
  }
  function identity(s){
    const d=ensure(s),ranked=axes.map(k=>[k,d.values[k]]).sort((a,b)=>b[1]-a[1]);
    const total=ranked.reduce((sum,v)=>sum+v[1],0);
    const titles={heart:'The open heart',drive:'The builder',curiosity:'The explorer',courage:'The brave soul'};
    return {title:total<3?'Still becoming':titles[ranked[0][0]],primary:ranked[0][0],total,values:d.values};
  }
  function chapter(age){return age<6?{number:'01',name:'A world opening',caption:'Everything is a first.',range:'0–5'}:age<18?{number:'02',name:'The becoming years',caption:'Finding out who you could be.',range:'6–17'}:age<35?{number:'03',name:'An open horizon',caption:'A thousand lives you could live.',range:'18–34'}:age<55?{number:'04',name:'A life taking shape',caption:'What you build. What you keep.',range:'35–54'}:age<75?{number:'05',name:'The deeper years',caption:'Room for what matters most.',range:'55–74'}:{number:'06',name:'A story worth keeping',caption:'Still here. Still becoming.',range:'75+'};}
  function repair(s){
    const d=ensure(s),p=s.pendingChoice?._crossroads;
    if(p&&(!d.active||p.id!==d.active.id||p.step!==d.active.step)){s.pendingChoice=null;return true;}
    return false;
  }
  globalThis.WayfareCrossroads={stories,focuses,axes,labels,byId,focusById,ensure,snapshot,chooseFocus,applyFocus,recordYear,refreshYear,advance,resolve,scene,reason,stakes,effectText,identity,chapter,repair};
})();
