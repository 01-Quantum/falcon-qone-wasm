# Implementation Details

This document provides technical details about the Falcon-512 WebAssembly implementation.

## Architecture Overview

### Layer Structure

```
┌─────────────────────────────────────┐
│   TypeScript/JavaScript API         │  ← User-facing API
│   (src/falcon.ts)                   │
└─────────────────┬───────────────────┘
                  │
                  │ WASM Bridge
                  │
┌─────────────────▼───────────────────┐
│   C WASM Wrapper Layer              │  ← Memory management
│   (src/falcon_wasm.c)               │     & exports
└─────────────────┬───────────────────┘
                  │
                  │ Function calls
                  │
┌─────────────────▼───────────────────┐
│   Official Falcon Implementation    │  ← Unmodified C code
│   (Falcon-impl-round3/)             │
└─────────────────────────────────────┘
```

## Core Functions Implementation

### 1. Keypair Generation (`createKeypairFromSeed`)

**C Function**: `falcon512_keygen_from_seed`

**Process**:
1. Initialize SHAKE256 PRNG from seed using `shake256_init_prng_from_seed()`
2. Call `falcon_keygen_make()` with logn=9 for Falcon-512
3. Output 1281-byte private key and 897-byte public key
4. Clear sensitive data (RNG state, temporary buffers)

**Key Insight**: The same seed always produces the same keypair due to deterministic PRNG initialization.

### 2. Message Signing (`signMessage`)

**C Function**: `falcon512_sign`

**Process**:
1. Initialize SHAKE256 PRNG from RNG seed
2. Call `falcon_sign_dyn()` with:
   - Message data
   - Private key
   - FALCON_SIG_COMPRESSED format
   - Temporary buffer (39,943 bytes)
3. Return variable-length signature (~652 bytes average, max 752)
4. Clear sensitive data

**Signature Format** (compressed):
- 1 byte: header (0x30 + logn)
- 40 bytes: nonce
- Variable: compressed s2 coefficients

### 3. Signature Verification (`verifySignature`)

**C Function**: `falcon512_verify`

**Process**:
1. Call `falcon_verify()` with:
   - Signature
   - Public key
   - Message
   - Temporary buffer (4,097 bytes)
2. Return 0 for valid signature, negative for invalid

**Verification Steps** (internal):
1. Parse signature format
2. Extract nonce and s2
3. Hash nonce to get challenge point
4. Verify signature equation: s1 + s2*h = c (mod q)

### 4. Hash-to-Point (`hashToPoint`)

**C Function**: `falcon512_hash_to_point`

**Process**:
1. Initialize SHAKE256
2. Inject message bytes
3. Flip to output mode
4. Call `Zf(hash_to_point_vartime)()` to generate 512 coefficients
5. Return as Int16Array

**Output**: 512 signed 16-bit integers representing a polynomial in ℤ[x]/(x^512 + 1)

### 5. Public Key Coefficients (`getPublicKeyCoefficients`)

**C Function**: `falcon512_get_pubkey_coefficients`

**Process**:
1. Verify header byte (0x00 + logn = 0x09)
2. Call `Zf(modq_decode)()` to decode polynomial h
3. Extract 512 coefficients (mod q = 12289)
4. Return as Int16Array

**Public Key Format**:
- 1 byte: header (0x00 + logn)
- 896 bytes: compressed polynomial h (modq encoding)

### 6. Signature Coefficients (`getSignatureCoefficients`)

**C Function**: `falcon512_get_signature_coefficients`

**Process**:
1. Verify signature header
2. Extract nonce (40 bytes)
3. Call `Zf(comp_decode)()` to decompress s2
4. Hash nonce to get challenge point c
5. Compute s1 = c - s2
6. Return both s1 and s2 as Int16Array

**Note**: The actual signature verification uses a more complex equation involving the public key h.

## Memory Management

### WASM Memory Layout

```
WASM Heap
├── Stack (1 MB)
├── Static Data
└── Dynamic Allocation (via wasm_malloc/wasm_free)
    ├── Input buffers (message, keys, seeds)
    ├── Output buffers (signatures, coefficients)
    └── Temporary buffers (computation scratch space)
```

### Buffer Sizes

| Operation | Temporary Buffer Size |
|-----------|----------------------|
| Key Generation | 15,879 bytes |
| Signing (dynamic) | 39,943 bytes |
| Verification | 4,097 bytes |

### Memory Safety

1. All allocations are explicitly freed after use
2. Sensitive data (keys, seeds) is zeroed before deallocation
3. No dangling pointers (all pointers are local to functions)
4. Bounds checking on all array accesses

## Falcon-512 Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| logn | 9 | Log₂ of polynomial degree |
| n | 512 | Polynomial degree (2^9) |
| q | 12289 | Modulus |
| σ | ~165.7 | Standard deviation for signatures |
| Private Key Size | 1281 bytes | Encoded format |
| Public Key Size | 897 bytes | Encoded format |
| Avg Signature Size | ~652 bytes | Compressed format |
| Max Signature Size | 752 bytes | Compressed format |

## Encoding Formats

### Private Key Encoding

```
[1 byte: 0x50 + logn] [encoded f] [encoded g] [encoded F]
```

- f, g: small polynomials (private key)
- F: precomputed value for efficiency

### Public Key Encoding (modq)

```
[1 byte: 0x00 + logn] [896 bytes: compressed h]
```

- h = g/f mod q
- Compressed using variable-length encoding (7-8 bits per coefficient)

### Signature Encoding (compressed)

```
[1 byte: header] [40 bytes: nonce] [variable: compressed s2]
```

- Header: 0x30 + logn
- Nonce: random salt
- s2: compressed using variable-length encoding

## Cryptographic Primitives

### SHAKE256

Used for:
1. PRNG initialization (keygen, signing)
2. Hash-to-point (message hashing)
3. Nonce generation

Configuration: Native implementation (no customization needed for WASM)

### FFT (Fast Fourier Transform)

Used internally for:
- Polynomial multiplication
- Key generation
- Signature generation

Type: Number Theoretic Transform (NTT) variant optimized for Falcon

### Floating-Point Operations

Configuration: `FALCON_FPNATIVE=1` (use native doubles)
- WebAssembly f64 provides IEEE-754 compliant arithmetic
- Adequate for Falcon's precision requirements
- Faster than integer emulation in WASM

## Error Handling

### Error Codes

```c
#define FALCON_ERR_RANDOM     -1  // RNG failure
#define FALCON_ERR_SIZE       -2  // Buffer too small
#define FALCON_ERR_FORMAT     -3  // Invalid format
#define FALCON_ERR_BADSIG     -4  // Invalid signature
#define FALCON_ERR_BADARG     -5  // Invalid argument
#define FALCON_ERR_INTERNAL   -6  // Internal error
```

### TypeScript Error Handling

All C errors are converted to TypeScript exceptions with descriptive messages.

Example:
```typescript
if (result !== 0) {
  throw new Error(`Keypair generation failed with error code: ${result}`);
}
```

## Performance Optimization

### Compile-Time Optimizations

1. **-O3**: Maximum optimization level
2. **-flto**: Link-time optimization
3. **FALCON_FPNATIVE**: Native floating-point (faster than emulation)

### Runtime Optimizations

1. **Memory reuse**: Same WASM instance for multiple operations
2. **Buffer pre-allocation**: Allocate max-size buffers to avoid reallocation
3. **Direct memory access**: Use typed arrays for zero-copy data transfer

### Performance Bottlenecks

1. **FFT operations**: Dominant cost in keygen and signing
2. **Memory copying**: WASM↔JS boundary crosses
3. **SHAKE256 hashing**: Used extensively throughout

## Testing Strategy

### Test Categories

1. **Unit Tests**: Individual function correctness
2. **Integration Tests**: End-to-end workflows
3. **Determinism Tests**: Same inputs → same outputs
4. **Edge Cases**: Empty messages, large messages, invalid inputs
5. **Security Tests**: Tampered signatures, wrong keys

### Test Vectors

Currently using runtime-generated test cases. Could be extended with:
- Official NIST KAT (Known Answer Tests)
- Cross-implementation verification

## Security Considerations

### Implemented Security Features

1. ✅ Constant-time key generation (via SHAKE256 PRNG)
2. ✅ Signature randomization (nonce)
3. ✅ Memory zeroing after sensitive operations
4. ✅ No timing leaks in verification

### Known Limitations

1. ⚠️ Native floating-point may have minor timing variations
2. ⚠️ JavaScript GC may retain sensitive data longer than desired
3. ⚠️ Browser security model limits secure random generation

### Best Practices for Users

1. Always use `crypto.getRandomValues()` for seeds
2. Never reuse RNG seeds for signing
3. Store private keys securely (encrypted storage, HSM, etc.)
4. Implement key derivation if generating multiple keys from one seed
5. Consider additional protections for side-channel attacks if needed

## Build System

### Emscripten Configuration

```bash
CFLAGS: -O3 -flto -DFALCON_FPEMU=0 -DFALCON_FPNATIVE=1
EMFLAGS: -s WASM=1 -s MODULARIZE=1 -s EXPORT_ES6=1
         -s ALLOW_MEMORY_GROWTH=1
         -s TOTAL_MEMORY=16777216 (16MB initial)
```

### Output Files

1. **falcon.wasm**: WebAssembly binary
2. **falcon.js**: JavaScript loader and runtime
3. **falcon.d.ts**: TypeScript type definitions

## Future Improvements

### Potential Enhancements

1. **SIMD optimizations**: Use WebAssembly SIMD if available
2. **Worker threads**: Offload crypto operations to avoid blocking UI
3. **Streaming API**: Support for large messages via chunked hashing
4. **Batch verification**: Optimize verification of multiple signatures
5. **Key serialization**: JSON/PEM export/import for keys

### Performance Targets

- Key generation: < 50ms (currently ~50-100ms)
- Signing: < 20ms (currently ~20-50ms)
- Verification: < 5ms (currently ~5-10ms)

## References

1. [Falcon Specification](https://falcon-sign.info/falcon.pdf)
2. [NIST PQC Documentation](https://csrc.nist.gov/Projects/post-quantum-cryptography)
3. [Emscripten Documentation](https://emscripten.org/docs/)
4. [WebAssembly Specification](https://webassembly.github.io/spec/)
