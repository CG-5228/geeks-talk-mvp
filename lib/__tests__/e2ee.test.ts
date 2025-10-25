/**
 * Unit tests for E2EE crypto functions
 * Tests X25519 key generation, DH exchange, HKDF, and encryption
 */

import {
  generateX25519Keypair,
  deriveSharedSecret,
  hkdf,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isInsertableStreamsSupported,
  getE2EESupportInfo,
  clearSensitiveData,
  generateNonce,
} from '../e2ee';

// Mock crypto.subtle for testing
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    deriveBits: jest.fn(),
  },
};

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

describe('E2EE Crypto Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateX25519Keypair', () => {
    it('should generate valid X25519 keypair', async () => {
      const mockKeyPair = {
        publicKey: new CryptoKey(),
        privateKey: new CryptoKey(),
      };

      const mockPublicKeyBuffer = new ArrayBuffer(32);
      const mockPublicKey = new Uint8Array(mockPublicKeyBuffer);

      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      mockCrypto.subtle.exportKey.mockResolvedValue(mockPublicKeyBuffer);

      const keypair = await generateX25519Keypair();

      expect(keypair).toBeDefined();
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keypair.publicKey.length).toBe(32);
      expect(keypair.privateKey).toBe(mockKeyPair.privateKey);

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'X25519',
          namedCurve: 'X25519',
        },
        true,
        ['deriveKey', 'deriveBits']
      );
    });

    it('should throw error if Web Crypto API not supported', async () => {
      // @ts-ignore
      delete global.crypto;

      await expect(generateX25519Keypair()).rejects.toThrow('Web Crypto API not supported');
    });

    it('should throw error for invalid key size', async () => {
      const mockKeyPair = {
        publicKey: new CryptoKey(),
        privateKey: new CryptoKey(),
      };

      const mockPublicKeyBuffer = new ArrayBuffer(16); // Wrong size
      const mockPublicKey = new Uint8Array(mockPublicKeyBuffer);

      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      mockCrypto.subtle.exportKey.mockResolvedValue(mockPublicKeyBuffer);

      await expect(generateX25519Keypair()).rejects.toThrow('Invalid public key size');
    });
  });

  describe('deriveSharedSecret', () => {
    it('should derive shared secret from keypair', async () => {
      const mockPrivateKey = new CryptoKey();
      const mockPeerPublicKey = new Uint8Array(32);
      const mockSharedSecret = new ArrayBuffer(32);

      mockCrypto.subtle.importKey.mockResolvedValue(new CryptoKey());
      mockCrypto.subtle.deriveBits.mockResolvedValue(mockSharedSecret);

      const result = await deriveSharedSecret(mockPrivateKey, mockPeerPublicKey);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalledWith(
        {
          name: 'X25519',
          public: expect.any(CryptoKey),
        },
        mockPrivateKey,
        256
      );
    });

    it('should throw error for invalid inputs', async () => {
      await expect(deriveSharedSecret(null as any, new Uint8Array(32))).rejects.toThrow('Invalid key parameters');
      await expect(deriveSharedSecret(new CryptoKey(), null as any)).rejects.toThrow('Invalid key parameters');
      await expect(deriveSharedSecret(new CryptoKey(), new Uint8Array(16))).rejects.toThrow('Invalid peer public key size');
    });
  });

  describe('hkdf', () => {
    it('should derive key using HKDF', async () => {
      const secret = new Uint8Array(32);
      const roomName = '1v1-test123';
      const keyIndex = 0;
      const mockDerivedKey = new ArrayBuffer(32);

      mockCrypto.subtle.importKey.mockResolvedValue(new CryptoKey());
      mockCrypto.subtle.deriveBits.mockResolvedValue(mockDerivedKey);

      const result = await hkdf(secret, roomName, keyIndex);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalledWith(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: expect.any(Uint8Array),
          info: expect.any(Uint8Array),
        },
        expect.any(CryptoKey),
        256
      );
    });

    it('should throw error for invalid inputs', async () => {
      await expect(hkdf(new Uint8Array(16), 'room', 0)).rejects.toThrow('Invalid secret size');
      await expect(hkdf(new Uint8Array(32), '', 0)).rejects.toThrow('Invalid room name');
      await expect(hkdf(new Uint8Array(32), 'room', -1)).rejects.toThrow('Invalid key index');
    });
  });

  describe('base64 encoding/decoding', () => {
    it('should convert ArrayBuffer to base64', () => {
      const buffer = new Uint8Array([1, 2, 3, 4]);
      const base64 = arrayBufferToBase64(buffer);
      
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });

    it('should convert base64 to ArrayBuffer', () => {
      const original = new Uint8Array([1, 2, 3, 4]);
      const base64 = arrayBufferToBase64(original);
      const decoded = base64ToArrayBuffer(base64);
      
      expect(new Uint8Array(decoded)).toEqual(original);
    });
  });

  describe('feature detection', () => {
    it('should detect insertable streams support', () => {
      // Mock MediaStreamTrackProcessor and MediaStreamTrackGenerator
      (globalThis as any).MediaStreamTrackProcessor = class {};
      (globalThis as any).MediaStreamTrackGenerator = class {};

      expect(isInsertableStreamsSupported()).toBe(true);
    });

    it('should return false when insertable streams not supported', () => {
      // Remove mocks
      delete (globalThis as any).MediaStreamTrackProcessor;
      delete (globalThis as any).MediaStreamTrackGenerator;

      expect(isInsertableStreamsSupported()).toBe(false);
    });

    it('should return E2EE support info', () => {
      const info = getE2EESupportInfo();
      
      expect(info).toHaveProperty('insertableStreams');
      expect(info).toHaveProperty('webCrypto');
      expect(info).toHaveProperty('x25519');
      expect(typeof info.insertableStreams).toBe('boolean');
      expect(typeof info.webCrypto).toBe('boolean');
      expect(typeof info.x25519).toBe('boolean');
    });
  });

  describe('utility functions', () => {
    it('should generate random nonce', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).toBeInstanceOf(Uint8Array);
      expect(nonce1.length).toBe(12);
      expect(nonce2).toBeInstanceOf(Uint8Array);
      expect(nonce2.length).toBe(12);
      expect(nonce1).not.toEqual(nonce2); // Should be different
    });

    it('should clear sensitive data', () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      clearSensitiveData(data);
      
      // Data should be cleared (all zeros)
      expect(Array.from(data)).toEqual([0, 0, 0, 0]);
    });
  });

  describe('error handling', () => {
    it('should handle crypto operation failures gracefully', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Crypto operation failed'));

      await expect(generateX25519Keypair()).rejects.toThrow('X25519 key generation failed');
    });

    it('should handle import key failures', async () => {
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Import failed'));

      await expect(deriveSharedSecret(new CryptoKey(), new Uint8Array(32))).rejects.toThrow('Key exchange failed');
    });
  });
});

// Integration test helpers
export const integrationTestHelpers = {
  async testKeyExchange() {
    // Generate two keypairs
    const keypair1 = await generateX25519Keypair();
    const keypair2 = await generateX25519Keypair();

    // Exchange public keys
    const sharedSecret1 = await deriveSharedSecret(keypair1.privateKey, keypair2.publicKey);
    const sharedSecret2 = await deriveSharedSecret(keypair2.privateKey, keypair1.publicKey);

    // Shared secrets should be identical
    expect(sharedSecret1).toEqual(sharedSecret2);
    expect(sharedSecret1.length).toBe(32);

    return { keypair1, keypair2, sharedSecret: sharedSecret1 };
  },

  async testKeyDerivation(sharedSecret: Uint8Array, roomName: string) {
    const key1 = await hkdf(sharedSecret, roomName, 0);
    const key2 = await hkdf(sharedSecret, roomName, 1);

    expect(key1).toBeInstanceOf(Uint8Array);
    expect(key1.length).toBe(32);
    expect(key2).toBeInstanceOf(Uint8Array);
    expect(key2.length).toBe(32);
    expect(key1).not.toEqual(key2); // Different keys for different indices

    return { key1, key2 };
  },
};
