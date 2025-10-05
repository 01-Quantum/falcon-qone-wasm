Comprehensive prompt/plan for the `falcon-qone-wasm` Falcon-512 WebAssembly project. 

# Falcon-512 WebAssembly Project - Implementation Plan

## Project Overview
Build a WebAssembly module that exposes Falcon-512 post-quantum signature functionality to JavaScript/TypeScript, using the official Falcon C implementation (Falcon-impl-round3) without modifications.

## Core Requirements

### 1. Keypair Generation from Seed
- **Function**: `createKeypairFromSeed(seed: Uint8Array): { publicKey: Uint8Array, privateKey: Uint8Array }`
- **Input**: 48-byte seed (or flexible length for SHAKE256 initialization)
- **Output**: 
  - Private key: 1281 bytes (FALCON_PRIVKEY_SIZE(9) for Falcon-512)
  - Public key: 897 bytes (FALCON_PUBKEY_SIZE(9) for Falcon-512)
- **Implementation Notes**:
  - Use `shake256_init_prng_from_seed()` to initialize SHAKE256 context from seed
  - Call `falcon_keygen_make()` with logn=9 (Falcon-512)
  - Ensure deterministic key generation for same seed

### 2. Message Signing
- **Function**: `signMessage(message: Uint8Array, privateKey: Uint8Array, seed: Uint8Array): Uint8Array`
- **Input**: 
  - Message: variable length
  - Private key: 1281 bytes
  - RNG seed: for signature randomness
- **Output**: Signature (compressed format, ~652 bytes average, max 752 bytes)
- **Implementation Notes**:
  - Use `falcon_sign_dyn()` with FALCON_SIG_COMPRESSED format
  - Initialize RNG from provided seed for reproducibility
  - Allocate temporary buffer: FALCON_TMPSIZE_SIGNDYN(9) = 39,943 bytes

### 3. Signature Verification
- **Function**: `verifySignature(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean`
- **Input**:
  - Message: variable length
  - Signature: variable length
  - Public key: 897 bytes
- **Output**: true if valid, false otherwise
- **Implementation Notes**:
  - Use `falcon_verify()` function
  - Allocate temporary buffer: FALCON_TMPSIZE_VERIFY(9) = 4,097 bytes
  - Return true on success (0), false on FALCON_ERR_BADSIG or other errors

### 4. Hash-to-Point Function
- **Function**: `hashToPoint(message: Uint8Array): Int16Array` (512 elements)
- **Input**: Message of variable length
- **Output**: Array of 512 signed 16-bit integers representing point on lattice
- **Implementation Notes**:
  - Use SHAKE256 to hash the message
  - Generate 512 coefficients in range appropriate for Falcon-512
  - This maps message to a point in the Falcon polynomial ring (Z[x]/(x^512 + 1))
  - May need to expose internal `hash_to_point()` or implement wrapper around SHAKE256 output processing
  - Each coefficient should be sampled from appropriate distribution (check inner.h for details)

### 5. Public Key as 512-Element Array
- **Function**: `getPublicKeyCoefficients(publicKey: Uint8Array): Int16Array` (512 elements)
- **Input**: Encoded public key (897 bytes)
- **Output**: Array of 512 coefficients representing the public key polynomial
- **Implementation Notes**:
  - Decode the compressed public key format
  - Public key is polynomial h in Falcon (h = g/f mod q, where q = 12289)
  - Use codec functions to decompress the public key encoding
  - Return coefficients modulo q = 12289

### 6. Signature as 512-Element Array
- **Function**: `getSignatureCoefficients(signature: Uint8Array): { s1: Int16Array, s2: Int16Array }`
- **Input**: Encoded signature
- **Output**: Two arrays of 512 coefficients each (s1, s2 signature components)
- **Implementation Notes**:
  - Decode the compressed signature format
  - Falcon signature consists of (s1, s2) where both are polynomials of degree 512
  - Extract the nonce (40 bytes) and signature values
  - Decompress and return coefficient arrays

### 7. Hash-to-Point Output as 512-Element Array
- Already covered in requirement #4 - returns Int16Array of 512 elements

## Technical Architecture

### WebAssembly Wrapper Layer (C)
Create a wrapper file `falcon_wasm.c` that:
- Includes the official Falcon headers (`falcon.h`)
- Implements wrapper functions with WASM-friendly signatures
- Manages memory allocation/deallocation for temporary buffers
- Handles error codes and converts to WASM return values
- Exports functions using `EMSCRIPTEN_KEEPALIVE` or similar

### JavaScript/TypeScript API Layer
Create  `falcon.js` that:
- Loads the WASM module
- Provides typed interfaces for all functions
- Handles Uint8Array ↔ WASM memory conversions
- Manages memory lifecycle (malloc/free calls)
- Provides developer-friendly error messages

### Build System
Writing Rust code, often annotated with #[wasm_bindgen] to expose functions to JavaScript.
Using wasm-pack build --target web to compile the Rust code, generate the JavaScript bindings, and package the output.
Integrating the resulting WebAssembly module and JavaScript files into a web application.

## Implementation Constraints

### DO NOT MODIFY Falcon-impl-round3
- Use the official C implementation as-is
- All customization must be in wrapper layer only
- Leverage `falcon.h` public API exclusively
- If needed, access `inner.h` API but document reasons

### Memory Management
- All temporary buffers must be properly sized using FALCON_TMPSIZE_* macros
- Ensure 8-byte alignment for temporary buffers when needed
- Clean up sensitive data (private keys, seeds) after use if required
- Handle WASM heap growth for large allocations

### Constants for Falcon-512
- logn = 9 (degree = 2^9 = 512)
- Private key size: 1281 bytes
- Public key size: 897 bytes
- Signature size: ~652 bytes (compressed), max 752 bytes
- q (modulus) = 12289
- Temporary buffer sizes as per macros

## File Structure
```
falcon-qone-wasm/
├── Falcon-impl-round3/          # Official implementation (unchanged)
│   ├── falcon.h
│   ├── falcon.c
│   ├── inner.h
│   ├── codec.c, keygen.c, sign.c, vrfy.c, etc.
│   └── ...
├── src/
│   ├── falcon_wasm.c            # C wrapper for WASM exports
│   └── falcon.ts                # TypeScript API wrapper
├── dist/                        # Build output
│   ├── falcon.wasm
│   ├── falcon.js
│   └── falcon.d.ts
├── tests/
│   └── falcon.test.ts           # Unit tests
├── package.json
├── tsconfig.json
└── build.sh                     # Emscripten build script
```

## API Design (TypeScript)

```typescript
export interface FalconKeypair {
  publicKey: Uint8Array;   // 897 bytes
  privateKey: Uint8Array;  // 1281 bytes
}

export interface FalconSignatureCoefficients {
  s1: Int16Array;  // 512 elements
  s2: Int16Array;  // 512 elements
}

export class Falcon512 {
  // Core operations
  createKeypairFromSeed(seed: Uint8Array): FalconKeypair;
  signMessage(message: Uint8Array, privateKey: Uint8Array, rngSeed: Uint8Array): Uint8Array;
  verifySignature(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
  
  // Coefficient extraction
  hashToPoint(message: Uint8Array): Int16Array;  // 512 elements
  getPublicKeyCoefficients(publicKey: Uint8Array): Int16Array;  // 512 elements
  getSignatureCoefficients(signature: Uint8Array): FalconSignatureCoefficients;
}
```

## Testing Requirements
- Verify deterministic key generation from same seed
- Test sign/verify round-trip
- Validate coefficient array dimensions (all 512 elements)
- Test with official Falcon test vectors if available
- Cross-verify with other Falcon implementations
- Test edge cases (empty messages, invalid keys, corrupted signatures)

## Success Criteria
1. ✅ Deterministic keypair generation from seed
2. ✅ Successful sign and verify operations
3. ✅ All coefficient arrays have exactly 512 elements
4. ✅ Hash-to-point produces valid lattice points
5. ✅ No modifications to Falcon-impl-round3 directory
6. ✅ Clean TypeScript/JavaScript API
8. ✅ All tests passing