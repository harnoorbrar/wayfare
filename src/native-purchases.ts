/** Register the official RevenueCat Capacitor bridge in the shipped IIFE. */
import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('Purchases')) {
  const host = globalThis as typeof globalThis & { WayfareNative?: { Purchases?: typeof Purchases } };
  host.WayfareNative = { ...host.WayfareNative, Purchases };
}
