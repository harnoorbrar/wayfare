/* Shared, testable RevenueCat helpers. Never unlock from a product lookup or a local receipt. */
(() => {
  let busy = false;
  function plugin() {
    const cap = globalThis.Capacitor;
    if (cap?.getPlatform && cap.getPlatform() !== 'ios') return null;
    return globalThis.WayfareNative?.Purchases || cap?.Plugins?.Purchases || null;
  }
  function timeout(promise, milliseconds = 12000) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('Store connection timed out.'), { code: 'STORE_TIMEOUT' })), milliseconds);
    })]).finally(() => clearTimeout(timer));
  }
  async function loadOptions(purchases, productIds) {
    const options = new Map();
    let offeringsError;
    try {
      const response = await timeout(purchases.getOfferings(), 5000);
      const offerings = response?.offerings || response;
      for (const item of offerings?.current?.availablePackages || []) {
        const id = item?.product?.identifier;
        if (productIds.includes(id) && item.product.priceString) options.set(id, { kind: 'package', item });
      }
    } catch (error) { offeringsError = error; }
    // Run even when getOfferings rejects, and fill partial offerings too.
    const missing = productIds.filter(id => !options.has(id));
    if (missing.length) {
      try {
        const response = await timeout(purchases.getProducts({ productIdentifiers: missing }), 7000);
        for (const item of response?.products || []) {
          if (missing.includes(item?.identifier) && item.priceString) options.set(item.identifier, { kind: 'product', item });
        }
      } catch (error) {
        if (!options.size) throw error;
      }
    }
    if (!options.size && offeringsError) throw offeringsError;
    return productIds.filter(id => options.has(id)).map(id => options.get(id));
  }
  function errorMessage(error) {
    const code = String(error?.code ?? '');
    const text = `${error?.message || ''} ${error?.userInfo?.readableErrorCode || ''}`.toLowerCase();
    if (code === 'STORE_TIMEOUT') return 'The App Store did not respond in time. Please try again. You can keep playing for free.';
    if (error?.userCancelled === true || error?.userCancelled === 'true' || code === '1' || text.includes('purchase_cancelled')) return 'cancelled';
    if (code === '20' || /pending|deferred|ask.to.buy/.test(text)) return 'Apple is waiting for approval or payment confirmation. You have not unlocked Plus yet. Do not buy again; return after approval or use Restore Purchases.';
    if (code === '15' || /already in progress/.test(text)) return 'A purchase is already in progress. Finish the Apple purchase sheet before trying again.';
    if (code === '3' || /not.allowed|restricted/.test(text)) return 'In-app purchases are restricted on this device. Check Screen Time and Apple ID purchase permissions.';
    if (code === '10' || /network|offline|internet|timed out/.test(text)) return 'Check your connection and try loading the App Store options again.';
    if (code === '23' || /configuration|configure|api key/.test(text)) return 'The store configuration could not be loaded. Please contact Wayfare support if retrying does not help.';
    if (code === '6' || /already.purchased|already.owned/.test(text)) return 'This purchase is already owned by your Apple ID. Use Restore Purchases to reconnect it.';
    if (code === '5' || /not available|not found|product/.test(text)) return 'This option is not currently available for your Apple ID storefront. Try again later or contact Wayfare support.';
    return 'The App Store could not complete this request. Try again or use Restore Purchases if you have already paid.';
  }
  async function exclusive(action) {
    if (busy) return { busy: true };
    busy = true;
    try { return await action(); } finally { busy = false; }
  }
  function customerInfo(value) {
    const info = value?.customerInfo || value;
    if (!info || typeof info.entitlements?.active !== 'object' || info.entitlements.active === null || Array.isArray(info.entitlements.active)) return null;
    return info;
  }
  function entitled(value, name) {
    const info = customerInfo(value), access = info?.entitlements.active[name];
    return Boolean(access && access.isActive !== false && access.verification !== 'FAILED' && info.entitlements.verification !== 'FAILED');
  }
  function isPending(error) {
    return String(error?.code) === '20' || /pending|deferred|ask.to.buy/i.test(`${error?.message||''} ${error?.userInfo?.readableErrorCode||''}`);
  }
  globalThis.WayfareIAP = { plugin, loadOptions, errorMessage, exclusive, timeout, customerInfo, entitled, isPending, isBusy: () => busy };
})();
