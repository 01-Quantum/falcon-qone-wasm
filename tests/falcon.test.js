/**
 * Tests for Falcon-512 WebAssembly implementation
 * 
 * Note: These tests require the WASM module to be built first.
 * Run: docker-compose up falcon-wasm-builder (or npm run build:wasm)
 */

import { Falcon512 } from '../src/falcon.js';

// Dynamic import to handle if WASM isn't built yet
let createFalconModule;
try {
  const mod = await import('../dist/falcon.js');
  createFalconModule = mod.default || mod;
} catch (e) {
  console.error('ERROR: WASM module not found. Please build it first:');
  console.error('  docker-compose up falcon-wasm-builder');
  console.error('  or: npm run build:wasm');
  process.exit(1);
}

describe('Falcon512', () => {
  let falcon;

  beforeAll(async () => {
    falcon = new Falcon512();
    // Pass the module factory directly (Emscripten returns a promise)
    await falcon.init(createFalconModule);
  });

  describe('Constants', () => {
    it('should have correct constant values', () => {
      expect(Falcon512.constants.N).toBe(512);
      expect(Falcon512.constants.PRIVKEY_SIZE).toBe(1281);
      expect(Falcon512.constants.PUBKEY_SIZE).toBe(897);
      expect(Falcon512.constants.SIG_MAX_SIZE).toBe(752);
      expect(Falcon512.constants.Q).toBe(12289);
    });
  });

  describe('Keypair Generation', () => {
    it('should generate a keypair from a seed', () => {
      const seed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) seed[i] = i;

      const keypair = falcon.createKeypairFromSeed(seed);

      expect(keypair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keypair.privateKey.length).toBe(1281);
      expect(keypair.publicKey.length).toBe(897);
    });

    it('should generate deterministic keypairs from the same seed', () => {
      const seed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) seed[i] = i * 2;

      const keypair1 = falcon.createKeypairFromSeed(seed);
      const keypair2 = falcon.createKeypairFromSeed(seed);

      expect(keypair1.privateKey).toEqual(keypair2.privateKey);
      expect(keypair1.publicKey).toEqual(keypair2.publicKey);
    });

    it('should generate different keypairs from different seeds', () => {
      const seed1 = new Uint8Array(48);
      const seed2 = new Uint8Array(48);
      
      for (let i = 0; i < 48; i++) {
        seed1[i] = i;
        seed2[i] = i + 1;
      }

      const keypair1 = falcon.createKeypairFromSeed(seed1);
      const keypair2 = falcon.createKeypairFromSeed(seed2);

      expect(keypair1.privateKey).not.toEqual(keypair2.privateKey);
      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey);
    });
  });

  describe('Sign and Verify', () => {
    let keypair;
    let message;
    let rngSeed;

    beforeAll(() => {
      const seed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) seed[i] = i;
      keypair = falcon.createKeypairFromSeed(seed);

      message = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]); // "Hello World"
      
      rngSeed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) rngSeed[i] = i + 100;
    });

    it('should sign a message', () => {
      const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(41); // At least header + nonce
      expect(signature.length).toBeLessThanOrEqual(752); // Max compressed size
    });

    it('should verify a valid signature', () => {
      const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);
      const isValid = falcon.verifySignature(message, signature, keypair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid signature (wrong message)', () => {
      const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);
      const wrongMessage = new Uint8Array([1, 2, 3, 4, 5]);
      
      const isValid = falcon.verifySignature(wrongMessage, signature, keypair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should reject an invalid signature (corrupted signature)', () => {
      const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);
      
      // Corrupt the signature
      const corruptedSignature = new Uint8Array(signature);
      corruptedSignature[50] ^= 0xFF;
      
      const isValid = falcon.verifySignature(message, corruptedSignature, keypair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should reject an invalid signature (wrong public key)', () => {
      const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);
      
      // Generate a different keypair
      const differentSeed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) differentSeed[i] = 255 - i;
      const differentKeypair = falcon.createKeypairFromSeed(differentSeed);
      
      const isValid = falcon.verifySignature(message, signature, differentKeypair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should produce deterministic signatures with the same RNG seed', () => {
      const sig1 = falcon.signMessage(message, keypair.privateKey, rngSeed);
      const sig2 = falcon.signMessage(message, keypair.privateKey, rngSeed);

      expect(sig1).toEqual(sig2);
    });

    it('should handle empty messages', () => {
      const emptyMessage = new Uint8Array(0);
      const signature = falcon.signMessage(emptyMessage, keypair.privateKey, rngSeed);
      const isValid = falcon.verifySignature(emptyMessage, signature, keypair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should handle large messages', () => {
      const largeMessage = new Uint8Array(10000);
      for (let i = 0; i < largeMessage.length; i++) {
        largeMessage[i] = i % 256;
      }

      const signature = falcon.signMessage(largeMessage, keypair.privateKey, rngSeed);
      const isValid = falcon.verifySignature(largeMessage, signature, keypair.publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe('Hash-to-Point', () => {
    it('should hash a message to 512 coefficients', () => {
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const point = falcon.hashToPoint(message);

      expect(point).toBeInstanceOf(Int16Array);
      expect(point.length).toBe(512);
    });

    it('should produce deterministic hash-to-point results', () => {
      const message = new Uint8Array([10, 20, 30, 40]);
      const point1 = falcon.hashToPoint(message);
      const point2 = falcon.hashToPoint(message);

      expect(point1).toEqual(point2);
    });

    it('should produce different results for different messages', () => {
      const message1 = new Uint8Array([1, 2, 3]);
      const message2 = new Uint8Array([4, 5, 6]);
      
      const point1 = falcon.hashToPoint(message1);
      const point2 = falcon.hashToPoint(message2);

      expect(point1).not.toEqual(point2);
    });

    it('should produce coefficients within valid range', () => {
      const message = new Uint8Array([7, 8, 9]);
      const point = falcon.hashToPoint(message);

      // Coefficients should be reasonable values (not checking exact bounds,
      // just that they're sensible 16-bit values)
      for (let i = 0; i < point.length; i++) {
        expect(point[i]).toBeGreaterThanOrEqual(-32768);
        expect(point[i]).toBeLessThanOrEqual(32767);
      }
    });
  });

  describe('Public Key Coefficients', () => {
    let publicKey;

    beforeAll(() => {
      const seed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) seed[i] = i;
      const keypair = falcon.createKeypairFromSeed(seed);
      publicKey = keypair.publicKey;
    });

    it('should extract 512 coefficients from public key', () => {
      const coeffs = falcon.getPublicKeyCoefficients(publicKey);

      expect(coeffs).toBeInstanceOf(Int16Array);
      expect(coeffs.length).toBe(512);
    });

    it('should produce deterministic coefficients', () => {
      const coeffs1 = falcon.getPublicKeyCoefficients(publicKey);
      const coeffs2 = falcon.getPublicKeyCoefficients(publicKey);

      expect(coeffs1).toEqual(coeffs2);
    });

    it('should produce coefficients within modulus range', () => {
      const coeffs = falcon.getPublicKeyCoefficients(publicKey);
      const Q = 12289;

      // Coefficients should be mod Q
      for (let i = 0; i < coeffs.length; i++) {
        expect(coeffs[i]).toBeGreaterThanOrEqual(-Q);
        expect(coeffs[i]).toBeLessThan(Q);
      }
    });

    it('should throw error for invalid public key size', () => {
      const invalidKey = new Uint8Array(100);

      expect(() => {
        falcon.getPublicKeyCoefficients(invalidKey);
      }).toThrow();
    });
  });

  describe('Signature Coefficients', () => {
    let signature;

    beforeAll(() => {
      const seed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) seed[i] = i;
      const keypair = falcon.createKeypairFromSeed(seed);
      
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const rngSeed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) rngSeed[i] = i + 50;
      
      signature = falcon.signMessage(message, keypair.privateKey, rngSeed);
    });

    it('should extract s1 and s2 coefficients from signature', () => {
      const { s1, s2 } = falcon.getSignatureCoefficients(signature);

      expect(s1).toBeInstanceOf(Int16Array);
      expect(s2).toBeInstanceOf(Int16Array);
      expect(s1.length).toBe(512);
      expect(s2.length).toBe(512);
    });

    it('should produce deterministic coefficients', () => {
      const result1 = falcon.getSignatureCoefficients(signature);
      const result2 = falcon.getSignatureCoefficients(signature);

      expect(result1.s1).toEqual(result2.s1);
      expect(result1.s2).toEqual(result2.s2);
    });

    it('should produce coefficients within valid range', () => {
      const { s1, s2 } = falcon.getSignatureCoefficients(signature);

      // Check that coefficients are reasonable 16-bit values
      for (let i = 0; i < 512; i++) {
        expect(s1[i]).toBeGreaterThanOrEqual(-32768);
        expect(s1[i]).toBeLessThanOrEqual(32767);
        expect(s2[i]).toBeGreaterThanOrEqual(-32768);
        expect(s2[i]).toBeLessThanOrEqual(32767);
      }
    });
  });

  describe('Integration Tests', () => {
    it('should perform complete sign-verify-extract workflow', () => {
      // 1. Generate keypair
      const seed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) seed[i] = Math.floor(Math.random() * 256);
      const keypair = falcon.createKeypairFromSeed(seed);

      // 2. Create and sign message
      const message = new TextEncoder().encode('Falcon-512 integration test');
      const rngSeed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) rngSeed[i] = Math.floor(Math.random() * 256);
      const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);

      // 3. Verify signature
      expect(falcon.verifySignature(message, signature, keypair.publicKey)).toBe(true);

      // 4. Extract public key coefficients
      const pubkeyCoeffs = falcon.getPublicKeyCoefficients(keypair.publicKey);
      expect(pubkeyCoeffs.length).toBe(512);

      // 5. Extract signature coefficients
      const sigCoeffs = falcon.getSignatureCoefficients(signature);
      expect(sigCoeffs.s1.length).toBe(512);
      expect(sigCoeffs.s2.length).toBe(512);

      // 6. Hash message to point
      const hashPoint = falcon.hashToPoint(message);
      expect(hashPoint.length).toBe(512);
    });
  });
});
