/* Shared web/native paywall. Transactions are never retried or timed out automatically. */
function purchasesPlugin(){return WayfareIAP.plugin();}
function customerHasPlus(info){return WayfareIAP.entitled(info,PLUS.entitlement);}
let _plusInitialization=null,_plusInitializationPlugin=null,_plusRefresh=null,_paywallLoad=0,_plusPending=false;
const _plusListening=new WeakSet();
function applyPlusCustomerInfo(value){
  const info=WayfareIAP.customerInfo(value);if(!info)return null;
  const owned=customerHasPlus(info);setPlus(owned);if(owned){_plusPending=false;removeAdsNow();}
  return owned;
}
async function ensurePlusReady(){
  const P=purchasesPlugin();if(!P)throw new Error('Purchases are only available in the iOS app.');
  if(!PLUS.apiKey||PLUS.apiKey.includes('REPLACE'))throw new Error('Purchases are not configured yet.');
  if(_plusInitializationPlugin!==P){_plusInitialization=null;_plusInitializationPlugin=P;}
  if(!_plusInitialization){
    const initialization=(async()=>{
      let configured=false;
      if(typeof P.isConfigured==='function'){try{configured=(await WayfareIAP.timeout(P.isConfigured())).isConfigured===true;}catch{}}
      if(!configured)await WayfareIAP.timeout(P.configure({apiKey:PLUS.apiKey}));
      if(typeof P.addCustomerInfoUpdateListener==='function'&&!_plusListening.has(P)){
        // Listener registration must never delay prices or checkout readiness.
        _plusListening.add(P);
        void WayfareIAP.timeout(Promise.resolve().then(()=>P.addCustomerInfoUpdateListener(info=>{
          const previouslyOwned=hasPlus();
          const owned=applyPlusCustomerInfo(info);
          const box=document.getElementById('paywall-packages');
          if(box&&owned!==null&&(owned||previouslyOwned)&&!WayfareIAP.isBusy()){
            ++_paywallLoad;
            box.textContent=owned?'✦ Wayfare Plus is active.':'Your purchase status changed. Check purchase status to refresh your options.';
            plusBusyUI(false);
          }
        }))).catch(()=>{_plusListening.delete(P);});
      }
      return P;
    })();
    _plusInitialization=initialization.catch(error=>{if(_plusInitializationPlugin===P)_plusInitialization=null;throw error;});
  }
  return _plusInitialization;
}
async function refreshPlus(){
  if(!purchasesPlugin())return null;
  if(_plusRefresh)return _plusRefresh;
  _plusRefresh=(async()=>{const P=await ensurePlusReady();if(typeof P.getCustomerInfo!=='function')return null;const result=await WayfareIAP.timeout(P.getCustomerInfo());const owned=applyPlusCustomerInfo(result);if(owned===null)throw new Error('Subscription status could not be verified.');return owned;})().finally(()=>{_plusRefresh=null;});
  return _plusRefresh;
}
async function initPlus(){setPlus(hasPlus());try{await refreshPlus();}catch{/* Preserve the last verified access while offline. */}}
function removeAdsNow(){_interstitialReady=false;_adDue=false;}
function plusPriceLabel(pkg){return String((pkg?.product||pkg)?.priceString||'');}
function plusProductId(option){return String((option?.product||option)?.identifier||'');}
function plusOptionIsLifetime(option){return option?.packageType==='LIFETIME'||plusProductId(option)===PLUS.productIds[1];}
function plusPurchaseError(error){return WayfareIAP.errorMessage(error);}
function showPaywallError(message){
  const box=document.getElementById('paywall-packages');if(!box){toast(message);return;}
  box.querySelector('.paywall-error')?.remove();const error=document.createElement('div');error.className='paywall-error';error.setAttribute('role','status');error.textContent=message;box.prepend(error);
}
async function loadPlusOptions(P){return WayfareIAP.loadOptions(P,PLUS.productIds);}
function plusBusyUI(busy,label){
  document.querySelectorAll('.pw-buy,#pw-restore,#pw-check,#pw-retry').forEach(button=>{button.disabled=busy;});
  const restore=document.getElementById('pw-restore');if(restore)restore.textContent=busy&&label==='restore'?'Restoring…':'Restore Purchases';
  document.getElementById('paywall-packages')?.setAttribute('aria-busy',String(busy));
}
async function checkPlusStatus(){
  const button=document.getElementById('pw-check');if(button){button.disabled=true;button.textContent='Checking…';}
  try{const owned=await refreshPlus();await renderPaywallPackages();if(owned===false)showPaywallError(_plusPending?'Plus is not active yet. If Apple is still approving the payment, wait for approval. If you already paid, use Restore Purchases; do not purchase again.':'No active Plus access was found for this app account. Already paid? Use Restore Purchases with the same Apple ID.');}
  catch(e){showPaywallError(plusPurchaseError(e));}
  finally{if(button?.isConnected){button.disabled=WayfareIAP.isBusy();button.textContent='Check purchase status';}}
}
async function openPaywall(){
  haptic('light');const overlay=document.getElementById('modal-overlay'),sheet=document.getElementById('modal-sheet');
  sheet.innerHTML=`<div class="panel-title" id="plus-title" style="margin-bottom:2px;">✦ Wayfare Plus</div>
    <div class="paywall-sub">Support a solo-built life sim — and play it uninterrupted.</div>
    <div class="paywall-perks"><div class="pw-perk">⏪ Time Machine — undo death, once per life</div><div class="pw-perk">🦉 Exclusive pets — owl, fennec fox &amp; tiny dragon</div><div class="pw-perk">🚫 Ad-free while Plus is active</div><div class="pw-perk">✦ Plus badge on your legacy tombstone</div><div class="pw-perk">🛠 Supports new stories, careers &amp; features</div></div>
    <div id="paywall-packages" aria-live="polite"><div class="paywall-loading">Checking the App Store…</div></div>
    <button class="pw-restore" id="pw-restore" type="button">Restore Purchases</button>
    <button class="pw-restore" id="pw-check" type="button">Check purchase status</button>
    <div class="pw-legal">Monthly access renews automatically until cancelled. Payment is charged to your Apple ID at confirmation. Lifetime is a separate one-time purchase. Manage or cancel your subscription in <a href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener">Apple subscription settings</a>.
    <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> · <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a> · <a href="support.html" target="_blank" rel="noopener">Support</a></div><button class="pw-close" id="pw-close" type="button">Close</button>`;
  sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','plus-title');
  overlay.classList.add('show');document.getElementById('pw-close').onclick=closeModal;document.getElementById('pw-restore').onclick=restorePlus;document.getElementById('pw-check').onclick=checkPlusStatus;
  if(!purchasesPlugin()){for(const id of ['pw-restore','pw-check']){const button=document.getElementById(id);button.hidden=true;button.style.display='none';}}
  return renderPaywallPackages();
}
async function renderPaywallPackages(){
  const box=document.getElementById('paywall-packages');if(!box)return;
  const request=++_paywallLoad;const current=()=>box.isConnected&&box===document.getElementById('paywall-packages')&&request===_paywallLoad;
  if(WayfareIAP.isBusy()){box.textContent='A purchase or restore is in progress. Finish the Apple sheet before trying again.';plusBusyUI(true);return;}
  if(!purchasesPlugin()){box.textContent='App Store purchases and restores are available in the iPhone app. Your game is still free to play here.';return;}
  box.textContent='Loading App Store options…';box.setAttribute('aria-busy','true');
  let loading=true;
  try{
    // Bound the entire read-only flow, not each serial SDK call separately.
    // Checkout and Restore Purchases intentionally have no automatic retry/timeout.
    const options=await WayfareIAP.timeout((async()=>{
      const P=await ensurePlusReady();if(!loading||!current())return [];
      // A slow ownership refresh must not prevent store prices from appearing.
      // buyPlus still verifies ownership before initiating any transaction.
      void refreshPlus().then(owned=>{
        if(owned===true&&current()){
          ++_paywallLoad;
          box.textContent='✦ Wayfare Plus is active. Thank you for supporting Wayfare.';
          plusBusyUI(false);
        }
      }).catch(()=>{ /* Preserve cached access when the store is unavailable. */ });
      if(hasPlus()||_plusPending)return [];
      return loadPlusOptions(P);
    })(),15000);
    if(!current()||WayfareIAP.isBusy())return;
    if(hasPlus()){box.textContent='✦ Wayfare Plus is active. Thank you for supporting Wayfare.';return;}
    if(_plusPending){box.textContent='Your purchase is awaiting confirmation. Use Check purchase status or Restore Purchases. Do not purchase again while Apple is processing it.';return;}
    box.replaceChildren();
    if(!options.length){throw new Error('Products are not available for this storefront.');}
    options.sort((a,b)=>Number(plusOptionIsLifetime(a.item))-Number(plusOptionIsLifetime(b.item)));
    options.forEach(option=>{
      const lifetime=plusOptionIsLifetime(option.item),button=document.createElement('button');button.type='button';button.className='pw-buy'+(lifetime?' pw-life':'');
      const name=document.createElement('span');name.textContent=lifetime?'Lifetime — pay once':'Monthly';const price=document.createElement('span');price.className='pw-price';price.textContent=plusPriceLabel(option.item)+(lifetime?'':' / month');button.append(name,price);button.onclick=()=>buyPlus(option,button);box.append(button);
    });
  }catch(e){
    if(!current()||WayfareIAP.isBusy())return;box.replaceChildren();showPaywallError(plusPurchaseError(e));const retry=document.createElement('button');retry.type='button';retry.id='pw-retry';retry.className='pw-restore';retry.textContent='Reload App Store options';retry.onclick=renderPaywallPackages;box.append(retry);
  }finally{loading=false;if(current()){box.setAttribute('aria-busy','false');plusBusyUI(WayfareIAP.isBusy());}}
}
async function buyPlus(option,button){
  if(WayfareIAP.isBusy()||_plusPending)return;
  if(!purchasesPlugin()){toast('Purchases are available in the iPhone app.');return;}
  if(!option||!['package','product'].includes(option.kind)||!PLUS.productIds.includes(plusProductId(option.item))){showPaywallError('Reload the App Store options before purchasing.');return;}
  let outcome='error',message='';const old=button?.innerHTML;
  await WayfareIAP.exclusive(async()=>{
    plusBusyUI(true);if(button){button.disabled=true;button.textContent='Waiting for Apple…';}
    try{
      const P=await ensurePlusReady();
      // A verified existing entitlement wins over another checkout.
      if(typeof P.getCustomerInfo==='function'&&await refreshPlus()===true){outcome='owned';return;}
      const result=option.kind==='package'?await P.purchasePackage({aPackage:option.item}):await P.purchaseStoreProduct({product:option.item});
      let owned=applyPlusCustomerInfo(result);if(owned!==true){try{owned=await refreshPlus();}catch{}}
      if(owned===true){outcome='owned';return;}
      _plusPending=true;outcome='pending';message='Apple returned from the purchase, but Plus is not active yet. Check purchase status or restore. Do not purchase again.';
    }catch(e){
      message=plusPurchaseError(e);if(message==='cancelled'){outcome='cancelled';return;}
      if(WayfareIAP.isPending(e)){_plusPending=true;outcome='pending';}
    }finally{if(button?.isConnected&&old!==undefined){button.innerHTML=old;button.disabled=false;}}
  });
  plusBusyUI(false);
  if(outcome==='owned'){setPlus(true);removeAdsNow();haptic('heavy');toast('✦ Wayfare Plus is active.');closeModal();if(state)render();return;}
  if(outcome==='pending')await renderPaywallPackages();
  if(message&&outcome!=='cancelled')showPaywallError(message);
}
async function restorePlus(){
  if(WayfareIAP.isBusy())return;
  if(!purchasesPlugin()){toast('Restore is available in the iPhone app.');return;}
  let outcome=null,message='';
  await WayfareIAP.exclusive(async()=>{
    plusBusyUI(true,'restore');
    try{const P=await ensurePlusReady();const result=await P.restorePurchases();outcome=applyPlusCustomerInfo(result);if(outcome===null)throw new Error('The purchase status could not be verified.');}
    catch(e){message=plusPurchaseError(e);}
  });
  plusBusyUI(false);
  if(outcome===true){toast('✦ Wayfare Plus restored.');closeModal();if(state)render();return;}
  await renderPaywallPackages();
  if(message&&message!=='cancelled')showPaywallError(message);
  else if(outcome===false)showPaywallError('No active Plus purchase was found. Make sure you are using the Apple ID that bought Plus. Expired monthly subscriptions do not provide active access.');
}
document.addEventListener('resume',()=>{initPlus();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)initPlus();});
globalThis.addEventListener?.('online',()=>{initPlus();});
