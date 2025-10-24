# 01 Quantum: Falcon-512 WebAssembly Implementation

WebAssembly implementation of **Falcon-512** post-quantum signature scheme with clean JavaScript API.

## Features

- ✅ Falcon-512 post-quantum signatures (NIST PQC finalist)
- 🚀 High-performance WebAssembly
- 🔒 Deterministic keypair generation from seeds
- 📦 Pure JavaScript API (no TypeScript required)
- 🧪 Comprehensive test suite
- 🔍 Extract polynomial coefficients from keys and signatures
- 🌐 Works in Node.js and browsers
- ⚡ Zero modifications to official Falcon C implementation

## Quick Start

### Install Dependencies

```bash
npm install
```

### Build

```bash
# Build WASM with Docker (recommended - no Emscripten install needed!)
docker-compose up falcon-wasm-builder

# Or use Make
make build

# Or build locally (requires Emscripten)
npm run build:wasm
```

### Test

```bash
npm test
```

### Run Example

```bash
node examples/basic-usage.js
```

## Usage

```javascript
import { Falcon512 } from './src/falcon.js';
import createFalconModule from './dist/falcon.js';

async function example() {
  // Initialize
  const falcon = new Falcon512();
  await falcon.init(createFalconModule);

  // Generate keypair
  const seed = new Uint8Array(48);
  crypto.getRandomValues(seed);
  const keypair = falcon.createKeypairFromSeed(seed);

  // Sign message
  const message = new TextEncoder().encode('Hello, Falcon!');
  const rngSeed = new Uint8Array(48);
  crypto.getRandomValues(rngSeed);
  const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);

  // Verify
  const isValid = falcon.verifySignature(message, signature, keypair.publicKey);
  console.log('Valid:', isValid); // true
}

example();
```

## API

### Core Operations

#### `createKeypairFromSeed(seed)`
- **seed**: `Uint8Array` (48 bytes recommended)
- **Returns**: `{ publicKey, privateKey }`
  - publicKey: 897 bytes
  - privateKey: 1281 bytes

#### `signMessage(message, privateKey, rngSeed)`
- **message**: `Uint8Array`
- **privateKey**: `Uint8Array` (1281 bytes)
- **rngSeed**: `Uint8Array` (48 bytes recommended)
- **Returns**: `Uint8Array` (signature, ~652 bytes avg)

#### `verifySignature(message, signature, publicKey)`
- **message**: `Uint8Array`
- **signature**: `Uint8Array`
- **publicKey**: `Uint8Array` (897 bytes)
- **Returns**: `boolean`

### Advanced Functions

#### `hashToPoint(message)`
Returns `Int16Array` of 512 polynomial coefficients.

#### `getPublicKeyCoefficients(publicKey)`
Returns `Int16Array` of 512 coefficients (mod 12289).

#### `getSignatureCoefficients(signature)`
Returns `{ s1: Int16Array, s2: Int16Array }` (512 elements each).

### Constants

```javascript
Falcon512.constants = {
  N: 512,                 // Polynomial degree
  PRIVKEY_SIZE: 1281,     // bytes
  PUBKEY_SIZE: 897,       // bytes
  SIG_MAX_SIZE: 752,      // bytes
  Q: 12289,               // Modulus
};
```

## Building

### Docker Build (Recommended)

No Emscripten installation required!

```bash
# One command
docker-compose up falcon-wasm-builder

# Or use Make
make build
```

See [docker-compose.yml](docker-compose.yml) for configuration.

### Local Build

Requires [Emscripten SDK](https://emscripten.org/).

```bash
# Linux/Mac
npm run build:wasm

# Windows
npm run build:wasm:win
```

## Project Structure

```
falcon-qone-wasm/
├── src/
│   ├── falcon_wasm.c       # C wrapper for WASM
│   └── falcon.js           # JavaScript API
├── dist/                   # Build output
│   ├── falcon.wasm
│   └── falcon.js
├── tests/
│   ├── falcon.test.js
│   └── setup.js
├── examples/
│   ├── basic-usage.js
│   └── browser-example.html
├── Falcon-impl-round3/     # Official Falcon C code
├── docker-compose.yml      # Docker build config
├── Dockerfile
├── build.sh / build.bat    # Build scripts
└── Makefile                # Convenient commands
```

## Security

1. **Use crypto.getRandomValues()** for all seeds
2. **Never reuse RNG seeds** for signing
3. **Store private keys securely**
4. **Validate inputs** from untrusted sources

Falcon-512 provides NIST security level 1 (~128-bit quantum-resistant security).

## Performance

Approximate timings:
- Key generation: 50-100ms
- Signing: 20-50ms
- Verification: 5-10ms

## Browser Support

- Chrome/Edge 57+
- Firefox 52+
- Safari 11+

## Commands

```bash
# Build
make build              # Build WASM with Docker
make build-local        # Build WASM locally
docker-compose up falcon-wasm-builder

# Test
npm test
npm run test:watch

# Clean
make clean
npm run clean

# Docker
make docker-shell       # Interactive shell
make docker-clean       # Remove Docker resources
```

## Troubleshooting

### "Cannot find module '../dist/falcon.js'"

Build the WASM first:
```bash
docker-compose up falcon-wasm-builder
```

### "Class constructor cannot be invoked without 'new'"

Make sure `dist/falcon.js` is the Emscripten output, not your source. Rebuild:
```bash
rm -rf dist/
docker-compose up falcon-wasm-builder
```

### Tests fail

Ensure WASM is built first:
```bash
docker-compose up falcon-wasm-builder
npm test
```

## License

MIT License. See [LICENSE](LICENSE).

Based on the official Falcon implementation by Thomas Pornin and the Falcon team.

## References

- [Falcon Specification](https://falcon-sign.info/)
- [NIST PQC Project](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Emscripten](https://emscripten.org/)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests
4. Ensure `npm test` passes
5. Submit a pull request
