export function generateId(): string {
  return uuidv7();
}

export function uuidv7(): string {
  let counter = 0;
  const incrementCounter = () => {
    counter = (counter + 1) % 4096;
    return counter;
  };

  const now = Date.now();
  const timestamp = Math.floor(now / 1000);
  const millis = now % 1000;

  const hexTimestamp = timestamp.toString(16).padStart(12, '0');
  const hexMillis = millis.toString(16).padStart(2, '0').substring(0, 1);
  const hexCounter = incrementCounter().toString(16).padStart(3, '0');
  const hexRandom = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const parts = [
    hexTimestamp.substring(0, 8),
    hexTimestamp.substring(8, 12) + hexMillis,
    '7' + hexCounter.substring(0, 2),
    (parseInt(hexCounter.substring(2), 16) & 0x3 | 0x8).toString(16) + hexRandom.substring(0, 2),
    hexRandom.substring(2)
  ];

  return parts.join('-');
}

export function isValidId(id: string): boolean {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pattern.test(id);
}
