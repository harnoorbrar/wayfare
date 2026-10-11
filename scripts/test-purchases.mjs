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
 console.log(`${passed} purchase/restore integration checks passed. No real store transactions were made.`);
}finally{w.close();}
