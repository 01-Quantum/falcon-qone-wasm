/**
 * Falcon-512 WebAssembly JavaScript API
 * 
 * Provides a clean interface for Falcon-512 post-quantum signatures
 */

// Constants
const FALCON512_N = 512;
const FALCON512_PRIVKEY_SIZE = 1281;
const FALCON512_PUBKEY_SIZE = 897;
const FALCON512_SIG_MAX_SIZE = 752;

/**
 * Falcon-512 WebAssembly API
 */
export class Falcon512 {
  constructor() {
    this.module = null;
    this.initialized = false;
  }

  /**
   * Initialize the Falcon-512 WASM module
   * @param {Function} moduleFactory - Emscripten module factory (returns a promise)
   */
  async init(moduleFactory) {
    if (this.initialized) {
      return;
    }
    
    // Emscripten moduleFactory can be:
    // 1. A function that returns a promise
    // 2. Already a promise
    // Handle both cases
    if (typeof moduleFactory === 'function') {
      this.module = await moduleFactory();
    } else {
      this.module = await moduleFactory;
    }
    
    // Wait for WASM to be ready (if the module has a ready promise)
    if (this.module && this.module.ready) {
      await this.module.ready;
    }
    
    this.initialized = true;
  }

  /**
   * Ensure the module is initialized
   * @private
   */
  ensureInitialized() {
    if (!this.initialized || !this.module) {
      throw new Error('Falcon512 module not initialized. Call init() first.');
    }
    return this.module;
  }

  /**
   * Generate a Falcon-512 keypair from a seed
   * 
   * @param {Uint8Array} seed - Seed bytes (recommended: 48 bytes for security)
   * @returns {{publicKey: Uint8Array, privateKey: Uint8Array}} Object containing public and private keys
   */
  createKeypairFromSeed(seed) {
    const module = this.ensureInitialized();
    
    // Allocate memory for seed, private key, and public key
    const seedPtr = module._wasm_malloc(seed.length);
    const privkeyPtr = module._wasm_malloc(FALCON512_PRIVKEY_SIZE);
    const pubkeyPtr = module._wasm_malloc(FALCON512_PUBKEY_SIZE);
    
    try {
      // Copy seed to WASM memory
      module.HEAPU8.set(seed, seedPtr);
      
      // Generate keypair
      const result = module._falcon512_keygen_from_seed(
        seedPtr, seed.length,
        privkeyPtr, pubkeyPtr
      );
      
      if (result !== 0) {
        throw new Error(`Keypair generation failed with error code: ${result}`);
      }
      
      // Copy results back to JavaScript
      const privateKey = new Uint8Array(FALCON512_PRIVKEY_SIZE);
      const publicKey = new Uint8Array(FALCON512_PUBKEY_SIZE);
      
      privateKey.set(module.HEAPU8.subarray(privkeyPtr, privkeyPtr + FALCON512_PRIVKEY_SIZE));
      publicKey.set(module.HEAPU8.subarray(pubkeyPtr, pubkeyPtr + FALCON512_PUBKEY_SIZE));
      
      return { privateKey, publicKey };
      
    } finally {
      // Clean up
      module._wasm_free(seedPtr);
      module._wasm_free(privkeyPtr);
      module._wasm_free(pubkeyPtr);
    }
  }

  /**
   * Sign a message with a Falcon-512 private key
   * 
   * @param {Uint8Array} message - Message to sign
   * @param {Uint8Array} privateKey - Private key (1281 bytes)
   * @param {Uint8Array} rngSeed - Seed for signature randomness (recommended: 48 bytes)
   * @returns {Uint8Array} Signature bytes (compressed format, ~652 bytes average)
   */
  signMessage(message, privateKey, rngSeed) {
    const module = this.ensureInitialized();
    
    if (privateKey.length !== FALCON512_PRIVKEY_SIZE) {
      throw new Error(`Invalid private key size: expected ${FALCON512_PRIVKEY_SIZE}, got ${privateKey.length}`);
    }
    
    // Allocate memory
    const messagePtr = module._wasm_malloc(message.length);
    const privkeyPtr = module._wasm_malloc(privateKey.length);
    const rngSeedPtr = module._wasm_malloc(rngSeed.length);
    const sigPtr = module._wasm_malloc(FALCON512_SIG_MAX_SIZE);
    const sigLenPtr = module._wasm_malloc(8); // size_t
    
    try {
      // Copy inputs to WASM memory
      module.HEAPU8.set(message, messagePtr);
      module.HEAPU8.set(privateKey, privkeyPtr);
      module.HEAPU8.set(rngSeed, rngSeedPtr);
      
      // Set initial signature length
      const sigLenView = new DataView(module.HEAPU8.buffer, sigLenPtr, 8);
      sigLenView.setUint32(0, FALCON512_SIG_MAX_SIZE, true);
      
      // Sign message
      const result = module._falcon512_sign(
        messagePtr, message.length,
        privkeyPtr,
        rngSeedPtr, rngSeed.length,
        sigPtr, sigLenPtr
      );
      
      if (result !== 0) {
        throw new Error(`Signature generation failed with error code: ${result}`);
      }
      
      // Get actual signature length
      const actualSigLen = sigLenView.getUint32(0, true);
      
      // Copy signature back
      const signature = new Uint8Array(actualSigLen);
      signature.set(module.HEAPU8.subarray(sigPtr, sigPtr + actualSigLen));
      
      return signature;
      
    } finally {
      // Clean up
      module._wasm_free(messagePtr);
      module._wasm_free(privkeyPtr);
      module._wasm_free(rngSeedPtr);
      module._wasm_free(sigPtr);
      module._wasm_free(sigLenPtr);
    }
  }

  /**
   * Verify a Falcon-512 signature
   * 
   * @param {Uint8Array} message - Original message
   * @param {Uint8Array} signature - Signature to verify
   * @param {Uint8Array} publicKey - Public key (897 bytes)
   * @returns {boolean} true if signature is valid, false otherwise
   */
  verifySignature(message, signature, publicKey) {
    const module = this.ensureInitialized();
    
    if (publicKey.length !== FALCON512_PUBKEY_SIZE) {
      throw new Error(`Invalid public key size: expected ${FALCON512_PUBKEY_SIZE}, got ${publicKey.length}`);
    }
    
    // Allocate memory
    const messagePtr = module._wasm_malloc(message.length);
    const signaturePtr = module._wasm_malloc(signature.length);
    const pubkeyPtr = module._wasm_malloc(publicKey.length);
    
    try {
      // Copy inputs to WASM memory
      module.HEAPU8.set(message, messagePtr);
      module.HEAPU8.set(signature, signaturePtr);
      module.HEAPU8.set(publicKey, pubkeyPtr);
      
      // Verify signature
      const result = module._falcon512_verify(
        messagePtr, message.length,
        signaturePtr, signature.length,
        pubkeyPtr
      );
      
      // 0 = valid, negative = error (including invalid signature)
      return result === 0;
      
    } finally {
      // Clean up
      module._wasm_free(messagePtr);
      module._wasm_free(signaturePtr);
      module._wasm_free(pubkeyPtr);
    }
  }

  /**
   * Hash a message to a point in the Falcon-512 polynomial ring
   * 
   * @param {Uint8Array} message - Message to hash
   * @returns {Int16Array} Array of 512 signed 16-bit coefficients
   */
  hashToPoint(message) {
    const module = this.ensureInitialized();
    
    // Allocate memory
    const messagePtr = module._wasm_malloc(message.length);
    const pointPtr = module._wasm_malloc(FALCON512_N * 2); // 512 int16_t
    
    try {
      // Copy message to WASM memory
      module.HEAPU8.set(message, messagePtr);
      
      // Compute hash-to-point
      const result = module._falcon512_hash_to_point(
        messagePtr, message.length,
        pointPtr
      );
      
      if (result !== 0) {
        throw new Error(`Hash-to-point failed with error code: ${result}`);
      }
      
      // Copy result back
      const point = new Int16Array(FALCON512_N);
      const pointView = new Int16Array(module.HEAP16.buffer, pointPtr, FALCON512_N);
      point.set(pointView);
      
      return point;
      
    } finally {
      // Clean up
      module._wasm_free(messagePtr);
      module._wasm_free(pointPtr);
    }
  }

  /**
   * Extract coefficients from a Falcon-512 public key
   * 
   * @param {Uint8Array} publicKey - Encoded public key (897 bytes)
   * @returns {Int16Array} Array of 512 coefficients (mod 12289)
   */
  getPublicKeyCoefficients(publicKey) {
    const module = this.ensureInitialized();
    
    if (publicKey.length !== FALCON512_PUBKEY_SIZE) {
      throw new Error(`Invalid public key size: expected ${FALCON512_PUBKEY_SIZE}, got ${publicKey.length}`);
    }
    
    // Allocate memory
    const pubkeyPtr = module._wasm_malloc(publicKey.length);
    const coeffsPtr = module._wasm_malloc(FALCON512_N * 2); // 512 int16_t
    
    try {
      // Copy public key to WASM memory
      module.HEAPU8.set(publicKey, pubkeyPtr);
      
      // Extract coefficients
      const result = module._falcon512_get_pubkey_coefficients(
        pubkeyPtr, coeffsPtr
      );
      
      if (result !== 0) {
        throw new Error(`Failed to extract public key coefficients: error code ${result}`);
      }
      
      // Copy result back
      const coeffs = new Int16Array(FALCON512_N);
      const coeffsView = new Int16Array(module.HEAP16.buffer, coeffsPtr, FALCON512_N);
      coeffs.set(coeffsView);
      
      return coeffs;
      
    } finally {
      // Clean up
      module._wasm_free(pubkeyPtr);
      module._wasm_free(coeffsPtr);
    }
  }

  /**
   * Extract coefficients from a Falcon-512 signature
   * 
   * @param {Uint8Array} signature - Encoded signature
   * @returns {{s0: Int16Array, s1: Int16Array}} Object with s0 and s1 coefficient arrays (512 elements each)
   */
  getSignatureCoefficients(signature) {
    const module = this.ensureInitialized();
    
    // Allocate memory
    const signaturePtr = module._wasm_malloc(signature.length);
    const s0Ptr = module._wasm_malloc(FALCON512_N * 2); // 512 int16_t
    const s1Ptr = module._wasm_malloc(FALCON512_N * 2); // 512 int16_t
    
    try {
      // Copy signature to WASM memory
      module.HEAPU8.set(signature, signaturePtr);
      
      // Extract coefficients
      const result = module._falcon512_get_signature_coefficients(
        signaturePtr, signature.length,
        s0Ptr, s1Ptr
      );
      
      if (result !== 0) {
        throw new Error(`Failed to extract signature coefficients: error code ${result}`);
      }
      
      // Copy results back
      const s0 = new Int16Array(FALCON512_N);
      const s1 = new Int16Array(FALCON512_N);
      
      const s0View = new Int16Array(module.HEAP16.buffer, s0Ptr, FALCON512_N);
      const s1View = new Int16Array(module.HEAP16.buffer, s1Ptr, FALCON512_N);
      
      s0.set(s0View);
      s1.set(s1View);
      
      return { s0, s1 };
      
    } finally {
      // Clean up
      module._wasm_free(signaturePtr);
      module._wasm_free(s0Ptr);
      module._wasm_free(s1Ptr);
    }
  }

  /**
   * Get Falcon-512 constants
   */
  static get constants() {
    return {
      N: FALCON512_N,
      PRIVKEY_SIZE: FALCON512_PRIVKEY_SIZE,
      PUBKEY_SIZE: FALCON512_PUBKEY_SIZE,
      SIG_MAX_SIZE: FALCON512_SIG_MAX_SIZE,
      Q: 12289, // Modulus
    };
  }
}

// Export for convenience
export default Falcon512;
