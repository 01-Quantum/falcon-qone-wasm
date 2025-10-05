# Falcon-512 WebAssembly

A WebAssembly implementation of the **Falcon-512** post-quantum signature scheme, providing a clean TypeScript/JavaScript API for quantum-resistant digital signatures.

## Features

- ✅ **Falcon-512** post-quantum signature algorithm (NIST PQC finalist)
- 🚀 High-performance WebAssembly implementation
- 🔒 Deterministic keypair generation from seeds
- 📦 Clean TypeScript API with full type definitions
- 🧪 Comprehensive test suite
- 🔍 Extract polynomial coefficients from keys and signatures
- 🌐 Works in Node.js and modern browsers
- ⚡ No modifications to official Falcon C implementation

## Installation

```bash
npm install falcon-qone-wasm
```

## Building from Source

### Option 1: Build with Docker (Recommended)

No need to install Emscripten! Just use Docker:

```bash
# Clone the repository
git clone <repository-url>
cd falcon-qone-wasm

# Install Node dependencies
npm install

# Build WASM with Docker (one command!)
docker-compose up falcon-wasm-builder

# Or use Make
make build

# Run tests
npm test
```

See [BUILD_WITH_DOCKER.md](BUILD_WITH_DOCKER.md) for detailed Docker instructions.

### Option 2: Build Locally

If you prefer to install Emscripten locally:

**Prerequisites:**
- **Emscripten SDK** (emcc) for compiling to WebAssembly
- Node.js 16+

**Build Steps:**

```bash
# Clone the repository
git clone <repository-url>
cd falcon-qone-wasm

# Install dependencies
npm install

# Build WebAssembly module
npm run build:wasm      # Linux/Mac
npm run build:wasm:win  # Windows

# Run tests
npm test
```

See [BUILDING.md](BUILDING.md) for detailed local build instructions.

## Quick Start

```javascript
import { Falcon512 } from 'falcon-qone-wasm/src/falcon.js';
import createFalconModule from 'falcon-qone-wasm/dist/falcon.js';

async function example() {
  // Initialize the WASM module
  const falcon = new Falcon512();
  await falcon.init(createFalconModule);

  // Generate a keypair from a seed
  const seed = new Uint8Array(48);
  crypto.getRandomValues(seed);
  const keypair = falcon.createKeypairFromSeed(seed);

  // Sign a message
  const message = new TextEncoder().encode('Hello, Falcon!');
  const rngSeed = new Uint8Array(48);
  crypto.getRandomValues(rngSeed);
  const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);

  // Verify the signature
  const isValid = falcon.verifySignature(message, signature, keypair.publicKey);
  console.log('Signature valid:', isValid); // true
}

example();
```

## API Reference

### Initialization

```typescript
const falcon = new Falcon512();
await falcon.init(createFalconModule);
```

### Core Operations

#### `createKeypairFromSeed(seed: Uint8Array): FalconKeypair`

Generate a Falcon-512 keypair deterministically from a seed.

- **seed**: Seed bytes (recommended: 48 bytes)
- **Returns**: `{ publicKey: Uint8Array, privateKey: Uint8Array }`
  - Private key: 1281 bytes
  - Public key: 897 bytes

```typescript
const seed = new Uint8Array(48);
crypto.getRandomValues(seed);
const keypair = falcon.createKeypairFromSeed(seed);
```

#### `signMessage(message: Uint8Array, privateKey: Uint8Array, rngSeed: Uint8Array): Uint8Array`

Sign a message with a private key.

- **message**: Message to sign (any length)
- **privateKey**: Private key (1281 bytes)
- **rngSeed**: RNG seed for signature randomness (recommended: 48 bytes)
- **Returns**: Signature (compressed format, ~652 bytes average, max 752 bytes)

```typescript
const message = new TextEncoder().encode('Sign this message');
const rngSeed = new Uint8Array(48);
crypto.getRandomValues(rngSeed);
const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);
```

#### `verifySignature(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean`

Verify a signature.

- **message**: Original message
- **signature**: Signature to verify
- **publicKey**: Public key (897 bytes)
- **Returns**: `true` if valid, `false` otherwise

```typescript
const isValid = falcon.verifySignature(message, signature, keypair.publicKey);
```

### Coefficient Extraction

#### `hashToPoint(message: Uint8Array): Int16Array`

Hash a message to a point in the Falcon-512 polynomial ring.

- **message**: Message to hash
- **Returns**: 512 signed 16-bit coefficients

```typescript
const point = falcon.hashToPoint(message);
console.log(point.length); // 512
```

#### `getPublicKeyCoefficients(publicKey: Uint8Array): Int16Array`

Extract polynomial coefficients from a public key.

- **publicKey**: Encoded public key (897 bytes)
- **Returns**: 512 coefficients (mod 12289)

```typescript
const coeffs = falcon.getPublicKeyCoefficients(keypair.publicKey);
console.log(coeffs.length); // 512
```

#### `getSignatureCoefficients(signature: Uint8Array): FalconSignatureCoefficients`

Extract signature polynomials s1 and s2.

- **signature**: Encoded signature
- **Returns**: `{ s1: Int16Array, s2: Int16Array }` (512 elements each)

```typescript
const { s1, s2 } = falcon.getSignatureCoefficients(signature);
console.log(s1.length, s2.length); // 512 512
```

### Constants

```typescript
Falcon512.constants = {
  N: 512,                 // Polynomial degree
  PRIVKEY_SIZE: 1281,     // Private key size in bytes
  PUBKEY_SIZE: 897,       // Public key size in bytes
  SIG_MAX_SIZE: 752,      // Maximum signature size in bytes
  Q: 12289,               // Modulus
};
```

## Type Definitions

```typescript
interface FalconKeypair {
  publicKey: Uint8Array;   // 897 bytes
  privateKey: Uint8Array;  // 1281 bytes
}

interface FalconSignatureCoefficients {
  s1: Int16Array;  // 512 elements
  s2: Int16Array;  // 512 elements
}
```

## Security Considerations

1. **Seed Generation**: Use cryptographically secure random number generators (e.g., `crypto.getRandomValues()`) for seeds.

2. **Deterministic Keys**: The same seed always produces the same keypair. Store seeds securely.

3. **Signature Randomness**: Each signature requires a fresh RNG seed. Reusing seeds can leak information.

4. **Key Sizes**: 
   - Private keys: 1281 bytes (keep secret!)
   - Public keys: 897 bytes (can be shared)
   - Signatures: ~652 bytes average, max 752 bytes

5. **Post-Quantum Security**: Falcon-512 provides approximately NIST security level 1 (~128-bit equivalent security against quantum attacks).

## Performance

Approximate timings on modern hardware (single core):

- **Key generation**: 50-100ms
- **Signature**: 20-50ms
- **Verification**: 5-10ms

WebAssembly performance is typically 1.5-3x slower than native C, but still very practical for most applications.

## Implementation Details

### Architecture

```
falcon-qone-wasm/
├── Falcon-impl-round3/      # Official Falcon C implementation (unmodified)
├── src/
│   ├── falcon_wasm.c        # C wrapper for WASM exports
│   └── falcon.ts            # TypeScript API
├── dist/                    # Build output
│   ├── falcon.wasm
│   ├── falcon.js
│   └── falcon.d.ts
├── tests/                   # Test suite
├── examples/                # Usage examples
└── build.sh / build.bat     # Build scripts
```

### Design Principles

1. **No modifications** to the official Falcon implementation
2. Clean separation between C wrapper and TypeScript API
3. Proper memory management (no leaks)
4. Comprehensive error handling
5. Type-safe TypeScript interface

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

The test suite includes:
- Keypair generation (deterministic and randomized)
- Sign/verify round-trip tests
- Coefficient extraction validation
- Edge cases (empty messages, large messages)
- Integration tests

## Examples

See the `examples/` directory for complete examples:

```bash
# Run the basic usage example
node examples/basic-usage.js
```

## FAQ

### Why Falcon-512?

Falcon is a NIST PQC finalist offering:
- Fast verification
- Relatively small signatures (~652 bytes)
- Strong security guarantees
- Based on NTRU lattice problems

### Browser Support

Works in all modern browsers supporting WebAssembly:
- Chrome/Edge 57+
- Firefox 52+
- Safari 11+

### Can I use this in production?

While Falcon is a strong algorithm, consider:
- It's a relatively new standard
- WebAssembly may have different security properties than native code
- Always follow best practices for key management
- Consider a security audit for critical applications

## License

This project uses the official Falcon implementation, which is provided under the MIT License. See `Falcon-impl-round3/` for details.

## References

- [Falcon Specification](https://falcon-sign.info/)
- [NIST PQC Project](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Falcon Paper](https://falcon-sign.info/falcon.pdf)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Acknowledgments

Based on the official Falcon implementation by Thomas Pornin and the Falcon team.
