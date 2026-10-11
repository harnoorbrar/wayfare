import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {JSDOM,VirtualConsole} from 'jsdom';
const root=process.argv[2]||path.resolve(import.meta.dirname,'../www');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://wayfare.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.requestAnimationFrame=()=>0;w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;
const c=dom.getInternalVMContext(),run=s=>vm.runInContext(s,c);
for(const script of w.document.querySelectorAll('script')){const src=script.getAttribute('src');vm.runInContext(src?fs.readFileSync(path.join(root,src),'utf8'):script.textContent,c);}
const ids=run('PLUS.productIds');const empty={customerInfo:{entitlements:{active:{}}}},owned={customerInfo:{entitlements:{active:{plus:{isActive:true}}}}};
const product=id=>({identifier:id,priceString:'CA$4.99'});
let configured=0,bought=0,restored=0,listeners=[];
const base=()=>({configure:async()=>{configured++;},isConfigured:async()=>({isConfigured:true}),addCustomerInfoUpdateListener:async fn=>{listeners.push(fn);return 'listener';},getCustomerInfo:async()=>empty,getOfferings:async()=>({offerings:{current:{availablePackages:ids.map(id=>({identifier:id,product:product(id)}))}}}),getProducts:async({productIdentifiers})=>({products:productIdentifiers.map(product)}),purchasePackage:async()=>{bought++;return owned;},purchaseStoreProduct:async()=>{bought++;return owned;},restorePurchases:async()=>{restored++;return owned;}});
function install(p){w.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,Plugins:{Purchases:p}};w.WayfareNative={Purchases:p};run('_plusInitialization=null;_plusInitializationPlugin=null;_plusRefresh=null;_plusPending=false;setPlus(false);');return p;}
async function paywall(){await run('openPaywall()');}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
// Virtual time exercises hung native calls without waiting minutes per build.
async function withStoreClock(fn){
 const originalSet=w.setTimeout,originalClear=w.clearTimeout,timers=new Map();let now=0,next=0;
 w.setTimeout=(callback,delay=0,...args)=>{const id=--next;timers.set(id,{at:now+Number(delay),callback:()=>callback(...args)});return id;};
 w.clearTimeout=id=>{if(!timers.delete(id))originalClear.call(w,id);};
 const flush=async()=>{for(let n=0;n<60;n++)await Promise.resolve();};
 const advance=async ms=>{await flush();const end=now+ms;while(true){const entry=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;now=entry[1].at;timers.delete(entry[0]);entry[1].callback();await flush();}now=end;await flush();};
 try{await fn({advance,flush});}finally{w.setTimeout=originalSet;w.clearTimeout=originalClear;timers.clear();}
}
try{
 run("startNewLife({name:'Payment Test'});closeModal();");
 await test('Wrapped offerings render localized monthly and lifetime products without unnecessary configure',async()=>{
   install(base());await paywall();assert.equal(w.document.querySelectorAll('.pw-buy').length,2);assert.match(w.document.querySelector('.pw-price').textContent,/CA\$4\.99/);assert.equal(configured,0);assert.equal(listeners.length,1);
   await run('ensurePlusReady()');assert.equal(listeners.length,1);
 });
 await test('One checkout only, all payment controls disabled, and verified entitlement unlocks',async()=>{
   let release;const p=install(base());p.purchasePackage=()=>{bought++;return new Promise(r=>{release=r;});};await paywall();w.buyButton=w.document.querySelector('.pw-buy');
   const pending=run("buyPlus({kind:'package',item:{identifier:'monthly',product:{identifier:PLUS.productIds[0]}}},window.buyButton)");
   for(let n=0;n<20&&!release;n++)await new Promise(r=>setTimeout(r,0));
   assert.ok(release);assert.equal(w.document.querySelector('#pw-restore').disabled,true);const count=bought;
   await run("buyPlus({kind:'product',item:{identifier:PLUS.productIds[1]}},window.buyButton)");await run('restorePlus()');assert.equal(bought,count);assert.equal(restored,0);
   release(owned);await pending;assert.equal(run('hasPlus()'),true);assert.equal(run('WayfareIAP.isBusy()'),false);
 });
 await test('A paid response without active access blocks repeated purchases and does not falsely unlock',async()=>{
   const p=install(base());p.purchaseStoreProduct=async()=>{bought++;return empty;};await paywall();w.buyButton=w.document.querySelector('.pw-buy');
   await run("buyPlus({kind:'product',item:{identifier:PLUS.productIds[0]}},window.buyButton)");const count=bought;
   assert.equal(run('hasPlus()'),false);assert.equal(run('_plusPending'),true);assert.equal(w.document.querySelectorAll('.pw-buy').length,0);
   await run("buyPlus({kind:'product',item:{identifier:PLUS.productIds[0]}},window.buyButton)");assert.equal(bought,count);
 });
 await test('Delayed approval callback activates Plus without another purchase',async()=>{
   listeners.at(-1)(owned.customerInfo);assert.equal(run('hasPlus()'),true);assert.equal(run('_plusPending'),false);
 });
 await test('Pending approval and user cancellation remain distinct',async()=>{
   const p=install(base());p.purchaseStoreProduct=async()=>{throw {code:'20'};};await paywall();w.buyButton=w.document.querySelector('.pw-buy');
   await run("buyPlus({kind:'product',item:{identifier:PLUS.productIds[0]}},window.buyButton)");assert.equal(run('_plusPending'),true);assert.equal(run('hasPlus()'),false);
   p.purchaseStoreProduct=async()=>{throw {code:'1',userCancelled:true};};run('_plusPending=false');await paywall();w.buyButton=w.document.querySelector('.pw-buy');
   await run("buyPlus({kind:'product',item:{identifier:PLUS.productIds[0]}},window.buyButton)");assert.equal(run('_plusPending'),false);assert.equal(run('WayfareIAP.isBusy()'),false);assert.equal(w.buyButton.disabled,false);
 });
 await test('Restore enables access, then expired access is correctly removed on a verified refresh',async()=>{
   install(base());await paywall();await run('restorePlus()');assert.equal(run('hasPlus()'),true);await run('refreshPlus()');assert.equal(run('hasPlus()'),false);
 });
 await test('Unsuccessful restore clears stale entitlement and gives a useful explanation',async()=>{
   const p=install(base());p.restorePurchases=async()=>empty;await paywall();run('setPlus(true)');await run('restorePlus()');assert.equal(run('hasPlus()'),false);assert.match(w.document.querySelector('.paywall-error').textContent,/same|Apple ID/);
 });
 await test('Network failures and malformed responses do not erase cached ownership',async()=>{
   const p=install(base());run('setPlus(true)');p.getCustomerInfo=async()=>{throw Error('offline');};await assert.rejects(run('refreshPlus()'));assert.equal(run('hasPlus()'),true);
   p.getCustomerInfo=async()=>({});await assert.rejects(run('refreshPlus()'));assert.equal(run('hasPlus()'),true);
 });
 await test('Inactive or failed-verification entitlements never grant access',async()=>{
   assert.equal(run("customerHasPlus({entitlements:{active:{plus:{isActive:false}}}})"),false);
   assert.equal(run("customerHasPlus({entitlements:{verification:'FAILED',active:{plus:{}}}})"),false);
 });
 await test('Closing or changing dialogs during product lookup cannot overwrite the next dialog',async()=>{
   let release;const p=install(base());p.getOfferings=()=>new Promise(r=>{release=r;});const opening=run('openPaywall()');
   for(let n=0;n<20&&!release;n++)await new Promise(r=>setTimeout(r,0));assert.ok(release);
   run("document.getElementById('modal-sheet').textContent='A different screen'");release({current:{availablePackages:ids.map(id=>({product:product(id)}))}});await opening;
   assert.equal(w.document.getElementById('modal-sheet').textContent,'A different screen');
 });
 await test('Hung listener registration and ownership refresh do not block available prices',async()=>withStoreClock(async({flush,advance})=>{
   const p=install(base());p.addCustomerInfoUpdateListener=()=>new Promise(()=>{});p.getCustomerInfo=()=>new Promise(()=>{});
   let finished=false;const opening=paywall().then(()=>{finished=true;});await flush();
   assert.equal(finished,true,'Prices should render without waiting for optional native callbacks');await opening;
   assert.equal(w.document.querySelectorAll('.pw-buy').length,2);assert.equal(w.document.querySelector('#paywall-packages').getAttribute('aria-busy'),'false');
   await advance(12000);
 }));
 await test('A hung offerings request falls back to direct App Store products after five seconds',async()=>withStoreClock(async({advance})=>{
   const p=install(base());p.getOfferings=()=>new Promise(()=>{});let finished=false;
   const opening=paywall().then(()=>{finished=true;});await advance(5000);assert.equal(finished,true);await opening;
   assert.equal(w.document.querySelectorAll('.pw-buy').length,2);
 }));
 await test('Serial native initialization stalls cannot exceed the overall fifteen-second limit',async()=>withStoreClock(async({advance})=>{
   const p=install(base());p.isConfigured=()=>new Promise(()=>{});p.configure=()=>new Promise(()=>{});
   let finished=false;const opening=paywall().then(()=>{finished=true;});await advance(15000);
   assert.equal(finished,true,'The whole load must finish within fifteen seconds');await opening;
   assert.match(w.document.querySelector('.paywall-error').textContent,/did not respond in time/);
   assert.equal(w.document.querySelector('#pw-retry').disabled,false);assert.equal(w.document.querySelector('#paywall-packages').getAttribute('aria-busy'),'false');
   await advance(15000);
 }));
 await test('Timeout exposes retry; late results cannot replace the successful retry',async()=>withStoreClock(async({advance,flush})=>{
   let late;const p=install(base());p.getOfferings=()=>new Promise(()=>{});p.getProducts=()=>new Promise(resolve=>{late=resolve;});
   let finished=false;const opening=paywall().then(()=>{finished=true;});await advance(12000);assert.equal(finished,true);await opening;
   assert.ok(w.document.querySelector('#pw-retry'));assert.equal(w.document.querySelectorAll('.pw-buy').length,0);
   p.getOfferings=base().getOfferings;p.getProducts=base().getProducts;await run('renderPaywallPackages()');
   assert.equal(w.document.querySelectorAll('.pw-buy').length,2);assert.equal(w.document.querySelector('.paywall-error'),null);
   late({products:[{identifier:ids[0],priceString:'STALE'}]});await flush();assert.doesNotMatch(w.document.querySelector('#paywall-packages').textContent,/STALE/);
 }));
 await test('An empty customer update does not erase purchase options',async()=>{
   install(base());await paywall();listeners.at(-1)(empty.customerInfo);assert.equal(w.document.querySelectorAll('.pw-buy').length,2);
 });
 await test('Loading deadlines never cancel or retry a purchase awaiting Apple',async()=>withStoreClock(async({advance,flush})=>{
   let finish;const p=install(base());p.purchasePackage=()=>{bought++;return new Promise(resolve=>{finish=resolve;});};await paywall();w.buyButton=w.document.querySelector('.pw-buy');
   const pending=run("buyPlus({kind:'package',item:{product:{identifier:PLUS.productIds[0]}}},window.buyButton)");await flush();assert.ok(finish);const count=bought;
   await advance(60000);assert.equal(run('WayfareIAP.isBusy()'),true);assert.equal(bought,count);assert.equal(w.document.querySelector('#pw-restore').disabled,true);
   finish(owned);await pending;assert.equal(run('hasPlus()'),true);
 }));
 console.log(`${passed} purchase/restore integration checks passed. No real store transactions were made.`);
}finally{w.close();}
