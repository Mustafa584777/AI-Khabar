export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BPUIN72ODgMB7qmKuIB7NTq6IM9IQjrVgHLUszj7ggFWhXh15pqTmc-kv2ltzOfjGskvMT3lkkLO77QWDLBOYGY';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  '1eiCydRRxc3fniq9WHyspu8ReRhhReeGRwZJi_TztuI';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@zeenaprompt.com';

/**
 * Converts a URL-safe Base64 string to a Uint8Array for pushManager.subscribe
 */
export function urlB64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData =
    typeof window !== 'undefined'
      ? window.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
