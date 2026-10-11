import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bridge = vi.hoisted(() => ({
  platform: 'ios', available: true,
  purchases: { configure: vi.fn(), getCustomerInfo: vi.fn() },
}));
vi.mock('@capacitor/core', () => ({ Capacitor: {
  getPlatform: () => bridge.platform,
  isPluginAvailable: (name: string) => name === 'Purchases' && bridge.available,
} }));
vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: bridge.purchases }));
const host = globalThis as typeof globalThis & { WayfareNative?: { Purchases?: unknown; marker?: string } };
beforeEach(() => {
  vi.resetModules(); bridge.platform = 'ios'; bridge.available = true;
  vi.stubGlobal('window', {}); delete host.WayfareNative;
});
afterEach(() => { vi.unstubAllGlobals(); delete host.WayfareNative; });
describe('the shipped native purchase bridge', () => {
  it('exposes the imported official SDK in iOS and preserves other native helpers', async () => {
    host.WayfareNative = { marker: 'keep' };
    await import('./native-purchases');
    expect(host.WayfareNative?.Purchases).toBe(bridge.purchases);
    expect(host.WayfareNative?.marker).toBe('keep');
  });
  it('does not advertise a native checkout in a browser', async () => {
    bridge.platform = 'web'; await import('./native-purchases');
    expect(host.WayfareNative).toBeUndefined();
  });
  it('does not advertise checkout when the iOS plugin is missing', async () => {
    bridge.available = false; await import('./native-purchases');
    expect(host.WayfareNative).toBeUndefined();
  });
});
