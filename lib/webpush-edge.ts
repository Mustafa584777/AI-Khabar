// Pure Web Crypto (RFC 8291 aes128gcm + ES256 VAPID JWT) Web Push sender
// Works natively in Cloudflare Workers, Edge Runtime, and Node.js 20+ with zero Node-only packages.

export interface EdgePushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface EdgeVapidConfig {
  subject: string;
  publicKey: string;
  privateKey: string;
}

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(base64);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function base64UrlEncode(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) {
    bin += String.fromCharCode(arr[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const buf = new ArrayBuffer(total);
  const out = new Uint8Array(buf);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

async function hkdfExpandExtract(
  salt: Uint8Array<ArrayBuffer>,
  ikm: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  lengthBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info,
    },
    key,
    lengthBytes * 8
  );
  return new Uint8Array(bits);
}

async function createVapidJwt(
  audience: string,
  vapid: EdgeVapidConfig
): Promise<string> {
  const pubBytes = base64UrlDecode(vapid.publicKey);
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error('Invalid VAPID public key length/format');
  }
  const x = base64UrlEncode(pubBytes.slice(1, 33));
  const y = base64UrlEncode(pubBytes.slice(33, 65));

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d: vapid.privateKey,
    ext: true,
  };

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const claimsB64 = base64UrlEncode(
    enc.encode(JSON.stringify({ aud: audience, exp, sub: vapid.subject }))
  );

  const unsigned = `${headerB64}.${claimsB64}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    enc.encode(unsigned)
  );

  return `${unsigned}.${base64UrlEncode(sig)}`;
}

async function encryptPayloadAes128Gcm(
  subscription: EdgePushSubscription,
  payloadText: string
): Promise<Uint8Array<ArrayBuffer>> {
  const enc = new TextEncoder();
  const uaPublic = base64UrlDecode(subscription.keys.p256dh);
  const authSecret = base64UrlDecode(subscription.keys.auth);

  // Import client's P-256 public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Generate ephemeral server ECDH keypair
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      serverKeys.privateKey,
      256
    )
  );

  const webPushInfoPrefix = enc.encode('WebPush: info\0');
  const keyInfo = concatUint8Arrays(webPushInfoPrefix, uaPublic, asPublic);
  const ikm = await hkdfExpandExtract(authSecret, sharedSecret, keyInfo, 32);

  const saltBuf = new ArrayBuffer(16);
  const salt = new Uint8Array(saltBuf);
  crypto.getRandomValues(salt);

  const cekInfo = enc.encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = enc.encode('Content-Encoding: nonce\0');
  const cekBytes = await hkdfExpandExtract(salt, ikm, new Uint8Array(cekInfo), 16);
  const nonceBytes = await hkdfExpandExtract(salt, ikm, new Uint8Array(nonceInfo), 12);

  const cekKey = await crypto.subtle.importKey(
    'raw',
    cekBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const payloadBytes = enc.encode(payloadText);
  const paddedPlaintext = concatUint8Arrays(payloadBytes, new Uint8Array([2]));

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonceBytes },
      cekKey,
      paddedPlaintext
    )
  );

  // RFC 8291 aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65)
  const headerBuf = new ArrayBuffer(21);
  const headerView = new DataView(headerBuf);
  const headerBytes = new Uint8Array(headerBuf);
  headerBytes.set(salt, 0);
  headerView.setUint32(16, 4096, false);
  headerBytes[20] = asPublic.length;

  return concatUint8Arrays(headerBytes, asPublic, ciphertext);
}

export async function sendWebPushEdge(
  subscription: EdgePushSubscription,
  payload: string,
  vapid: EdgeVapidConfig,
  options?: { TTL?: number; urgency?: 'very-low' | 'low' | 'normal' | 'high' }
): Promise<void> {
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

  const [jwt, encryptedBody] = await Promise.all([
    createVapidJwt(audience, vapid),
    encryptPayloadAes128Gcm(subscription, payload),
  ]);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
      TTL: String(options?.TTL ?? 86400),
      Urgency: options?.urgency || 'high',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
    },
    body: encryptedBody,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const err: any = new Error(errText || `Push endpoint returned HTTP ${res.status}`);
    err.statusCode = res.status;
    throw err;
  }
}
