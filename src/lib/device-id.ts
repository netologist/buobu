import { STORAGE_KEYS } from '@/lib/constants';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  
  return deviceId;
}

function generateDeviceId(): string {
  const timestamp = Date.now().toString(16);
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${timestamp}-${random}`;
}

export function resetDeviceId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
}
