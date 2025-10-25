/**
 * Client-side E2EE crypto functions for LiveKit SFrame encryption
 * Uses X25519 DH + HKDF-SHA256 for key derivation
 * All operations are client-side only - server never sees keys
 */

export interface X25519Keypair {
  publicKey: Uint8Array;
  privateKey: CryptoKey;
}

export interface E2EEStatus {
  status: 'initializing' | 'exchanging' | 'ready' | 'error' | 'unsupported';
  keyIndex: number;
  error?: string;
}

/**
 * Generate X25519 key pair using Web Crypto API
 */
export async function generateX25519Keypair(): Promise<X25519Keypair> {
  try {
    // Check if X25519 is supported
    if (!crypto.subtle) {
      throw new Error('Web Crypto API not supported');
    }

    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'X25519',
        namedCurve: 'X25519',
      },
      true, // extractable
      ['deriveKey', 'deriveBits']
    );

    // Export public key as raw bytes
    const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKey = new Uint8Array(publicKeyBuffer);

    // Validate key size
    if (publicKey.length !== 32) {
      throw new Error('Invalid public key size');
    }

    return {
      publicKey,
      privateKey: keyPair.privateKey,
    };
  } catch (error) {
    console.error('Failed to generate X25519 keypair:', error);
    throw new Error('X25519 key generation failed');
  }
}

/**
 * Perform X25519 Diffie-Hellman key exchange
 */
export async function deriveSharedSecret(
  myPrivateKey: CryptoKey,
  peerPublicKey: Uint8Array
): Promise<Uint8Array> {
  try {
    // Validate inputs
    if (!myPrivateKey || !peerPublicKey) {
      throw new Error('Invalid key parameters');
    }

    if (peerPublicKey.length !== 32) {
      throw new Error('Invalid peer public key size');
    }

    // Import peer's public key
    const peerPublicKeyCrypto = await crypto.subtle.importKey(
      'raw',
      peerPublicKey.slice().buffer,
      {
        name: 'X25519',
        namedCurve: 'X25519',
      },
      false,
      []
    );

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'X25519',
        public: peerPublicKeyCrypto,
      },
      myPrivateKey,
      256 // 32 bytes
    );

    const result = new Uint8Array(sharedSecret);
    
    // Validate result
    if (result.length !== 32) {
      throw new Error('Invalid shared secret size');
    }

    return result;
  } catch (error) {
    console.error('Failed to derive shared secret:', error);
    throw new Error('Key exchange failed');
  }
}

/**
 * HKDF-SHA256 key derivation with room name as info
 */
export async function hkdf(
  secret: Uint8Array,
  roomName: string,
  keyIndex: number = 0
): Promise<Uint8Array> {
  try {
    // Validate inputs
    if (!secret || secret.length !== 32) {
      throw new Error('Invalid secret size');
    }

    if (!roomName || typeof roomName !== 'string' || roomName.length === 0) {
      throw new Error('Invalid room name');
    }

    if (keyIndex < 0 || !Number.isInteger(keyIndex)) {
      throw new Error('Invalid key index');
    }

    // Import the shared secret as a key
    const key = await crypto.subtle.importKey(
      'raw',
      secret.slice().buffer,
      { name: 'HKDF' },
      false,
      ['deriveBits']
    );

    // Derive key using HKDF with room name as info
    const info = new TextEncoder().encode(`${roomName}-${keyIndex}`);
    const salt = new Uint8Array(32); // Zero salt for simplicity
    
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt,
        info: info,
      },
      key,
      256 // 32 bytes
    );

    const result = new Uint8Array(derivedKey);
    
    // Validate result
    if (result.length !== 32) {
      throw new Error('Invalid derived key size');
    }

    return result;
  } catch (error) {
    console.error('Failed to derive HKDF key:', error);
    throw new Error('Key derivation failed');
  }
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(str: string): ArrayBuffer {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Setup SFrame encryption for LiveKit room
 */
export async function setupSFrameEncryption(
  room: any, // LiveKit Room instance
  sharedKey: Uint8Array,
  keyIndex: number = 0
): Promise<boolean> {
  try {
    // Validate inputs
    if (!room) {
      throw new Error('Invalid room instance');
    }

    if (!sharedKey || sharedKey.length !== 32) {
      throw new Error('Invalid shared key size');
    }

    if (keyIndex < 0 || !Number.isInteger(keyIndex)) {
      throw new Error('Invalid key index');
    }

    if (!room.e2eeManager) {
      throw new Error('E2EE not supported in this browser');
    }

    // Set the encryption key
    await room.e2eeManager.setKey(sharedKey, keyIndex);
    
    console.log('SFrame encryption enabled with key index:', keyIndex);
    return true;
  } catch (error) {
    console.error('Failed to setup SFrame encryption:', error);
    return false;
  }
}

/**
 * Check if insertable streams are supported
 */
export function isInsertableStreamsSupported(): boolean {
  try {
    // Check for insertable streams support
    return typeof (globalThis as any).MediaStreamTrackProcessor !== 'undefined' &&
           typeof (globalThis as any).MediaStreamTrackGenerator !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Rekey session with new X25519 keypair
 */
export async function rekeySession(
  room: any, // LiveKit Room instance
  myPrivateKey: CryptoKey,
  peerPublicKey: Uint8Array,
  roomName: string,
  newKeyIndex: number
): Promise<boolean> {
  try {
    // Validate inputs
    if (!room || !room.e2eeManager) {
      throw new Error('Invalid room or E2EE not supported');
    }

    if (!myPrivateKey || !peerPublicKey) {
      throw new Error('Invalid key parameters');
    }

    if (!roomName || typeof roomName !== 'string') {
      throw new Error('Invalid room name');
    }

    if (newKeyIndex < 0 || !Number.isInteger(newKeyIndex)) {
      throw new Error('Invalid key index');
    }

    // Derive new shared secret
    const sharedSecret = await deriveSharedSecret(myPrivateKey, peerPublicKey);
    
    // Derive new key with incremented index
    const newKey = await hkdf(sharedSecret, roomName, newKeyIndex);
    
    // Set new key in LiveKit
    await room.e2eeManager.setKey(newKey, newKeyIndex);
    
    console.log('Rekey completed with key index:', newKeyIndex);
    return true;
  } catch (error) {
    console.error('Failed to rekey session:', error);
    return false;
  }
}

/**
 * Clear sensitive data from memory (best effort)
 */
export function clearSensitiveData(data: Uint8Array | ArrayBuffer): void {
  if (data instanceof Uint8Array) {
    data.fill(0);
  } else if (data instanceof ArrayBuffer) {
    const view = new Uint8Array(data);
    view.fill(0);
  }
}

/**
 * Generate random nonce for encryption
 */
export function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(12); // 96 bits for AES-GCM
  crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Encrypt data with AES-GCM (for text chat/files if Option B is implemented)
 */
export async function encryptData(
  data: Uint8Array,
  key: Uint8Array,
  nonce?: Uint8Array
): Promise<{ encrypted: Uint8Array; nonce: Uint8Array; tag: Uint8Array }> {
  try {
    // Validate inputs
    if (!data || data.length === 0) {
      throw new Error('Invalid data to encrypt');
    }

    if (!key || key.length !== 32) {
      throw new Error('Invalid key size');
    }

    if (nonce && nonce.length !== 12) {
      throw new Error('Invalid nonce size');
    }

    const iv = nonce || generateNonce();
    
    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.slice().buffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.slice().buffer,
      },
      cryptoKey,
      data.slice().buffer
    );

    // Extract auth tag (last 16 bytes)
    const encryptedArray = new Uint8Array(encrypted);
    const tag = encryptedArray.slice(-16);
    const encryptedData = encryptedArray.slice(0, -16);

    return {
      encrypted: encryptedData,
      nonce: iv,
      tag: tag,
    };
  } catch (error) {
    console.error('Failed to encrypt data:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt data with AES-GCM (for text chat/files if Option B is implemented)
 */
export async function decryptData(
  encrypted: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  tag: Uint8Array
): Promise<Uint8Array> {
  try {
    // Validate inputs
    if (!encrypted || encrypted.length === 0) {
      throw new Error('Invalid encrypted data');
    }

    if (!key || key.length !== 32) {
      throw new Error('Invalid key size');
    }

    if (!nonce || nonce.length !== 12) {
      throw new Error('Invalid nonce size');
    }

    if (!tag || tag.length !== 16) {
      throw new Error('Invalid tag size');
    }

    // Combine encrypted data and tag
    const combined = new Uint8Array(encrypted.length + tag.length);
    combined.set(encrypted);
    combined.set(tag, encrypted.length);

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.slice().buffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce.slice().buffer,
      },
      cryptoKey,
      combined.slice().buffer
    );

    return new Uint8Array(decrypted);
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Feature detection for E2EE support
 */
export function getE2EESupportInfo(): {
  insertableStreams: boolean;
  webCrypto: boolean;
  x25519: boolean;
} {
  return {
    insertableStreams: isInsertableStreamsSupported(),
    webCrypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
    x25519: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
  };
}
