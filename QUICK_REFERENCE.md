# Falcon-512 WASM Quick Reference

## 🚀 Quick Start

```bash
# Build
npm install
npm run build

# Test
npm test

# Run example
node examples/basic-usage.js
```

## 📦 API Cheat Sheet

### Initialization
```typescript
import { Falcon512 } from 'falcon-qone-wasm';
import createFalconModule from 'falcon-qone-wasm/dist/falcon.js';

const falcon = new Falcon512();
await falcon.init(createFalconModule);
```

### Generate Keypair
```typescript
const seed = new Uint8Array(48);
crypto.getRandomValues(seed);
const { publicKey, privateKey } = falcon.createKeypairFromSeed(seed);
// publicKey: 897 bytes, privateKey: 1281 bytes
```

### Sign Message
```typescript
const message = new TextEncoder().encode('Hello');
const rngSeed = new Uint8Array(48);
crypto.getRandomValues(rngSeed);
const signature = falcon.signMessage(message, privateKey, rngSeed);
// signature: ~652 bytes average, max 752 bytes
```

### Verify Signature
```typescript
const isValid = falcon.verifySignature(message, signature, publicKey);
// Returns: true or false
```

### Hash to Point
```typescript
const point = falcon.hashToPoint(message);
// Returns: Int16Array with 512 elements
```

### Get Public Key Coefficients
```typescript
const coeffs = falcon.getPublicKeyCoefficients(publicKey);
// Returns: Int16Array with 512 elements (mod 12289)
```

### Get Signature Coefficients
```typescript
const { s1, s2 } = falcon.getSignatureCoefficients(signature);
// Returns: { s1: Int16Array(512), s2: Int16Array(512) }
```

## 📏 Constants

```typescript
Falcon512.constants.N              // 512
Falcon512.constants.PRIVKEY_SIZE   // 1281 bytes
Falcon512.constants.PUBKEY_SIZE    // 897 bytes
Falcon512.constants.SIG_MAX_SIZE   // 752 bytes
Falcon512.constants.Q              // 12289 (modulus)
```

## 🔧 Build Commands

```bash
npm run build            # Build everything
npm run build:wasm       # Build WASM only (Linux/Mac)
npm run build:wasm:win   # Build WASM only (Windows)
npm run build:ts         # Build TypeScript only
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run clean            # Clean build outputs
```

## 📝 File Locations

| What | Where |
|------|-------|
| Source code | `src/falcon_wasm.c`, `src/falcon.ts` |
| Tests | `tests/falcon.test.ts` |
| Examples | `examples/basic-usage.ts`, `examples/browser-example.html` |
| Build output | `dist/falcon.wasm`, `dist/falcon.js` |
| Documentation | `README.md`, `IMPLEMENTATION.md`, `BUILDING.md` |

## ⚡ Performance Tips

1. **Reuse the Falcon512 instance** - initialization is slow
2. **Use crypto.getRandomValues()** for seeds - it's secure
3. **Don't sign in tight loops** - each signature takes ~20-50ms
4. **Verify is fast** - can verify hundreds per second

## 🐛 Common Errors

### "Module not initialized"
```typescript
// ❌ Wrong
const falcon = new Falcon512();
const keypair = falcon.createKeypairFromSeed(seed);

// ✅ Correct
const falcon = new Falcon512();
await falcon.init(createFalconModule);
const keypair = falcon.createKeypairFromSeed(seed);
```

### "Invalid key size"
```typescript
// Ensure correct sizes:
privateKey.length === 1281  // ✅
publicKey.length === 897    // ✅
```

### "WASM file not found"
```typescript
// Use correct relative path to falcon.js
import createFalconModule from './dist/falcon.js';  // ✅
import createFalconModule from './falcon.js';       // ❌
```

## 🔒 Security Checklist

- ✅ Use `crypto.getRandomValues()` for all seeds
- ✅ Use different RNG seed for each signature
- ✅ Never reuse the same seed twice
- ✅ Store private keys securely
- ✅ Validate all inputs from untrusted sources
- ✅ Clear sensitive data after use if possible

## 📊 Size Reference

| Item | Size |
|------|------|
| Private Key | 1,281 bytes |
| Public Key | 897 bytes |
| Signature (avg) | ~652 bytes |
| Signature (max) | 752 bytes |
| Seed (recommended) | 48 bytes |
| Hash-to-Point output | 1,024 bytes (512 × Int16) |
| Public Key coeffs | 1,024 bytes (512 × Int16) |
| Signature coeffs | 2,048 bytes (2 × 512 × Int16) |

## 🌐 Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>Falcon-512</title>
</head>
<body>
    <script type="module">
        import { Falcon512 } from './dist/falcon.js';
        import createFalconModule from './dist/falcon.js';

        async function main() {
            const falcon = new Falcon512();
            await falcon.init(createFalconModule);
            
            // Use falcon here
        }
        
        main();
    </script>
</body>
</html>
```

## 📚 Where to Learn More

- **User Guide**: `README.md`
- **Technical Details**: `IMPLEMENTATION.md`
- **Build Help**: `BUILDING.md`
- **Examples**: `examples/` directory
- **Tests**: `tests/falcon.test.ts` (shows all usage patterns)

## 💡 Tips & Tricks

### Generate Multiple Keypairs
```typescript
// Use different seeds
const seed1 = crypto.getRandomValues(new Uint8Array(48));
const seed2 = crypto.getRandomValues(new Uint8Array(48));

const keypair1 = falcon.createKeypairFromSeed(seed1);
const keypair2 = falcon.createKeypairFromSeed(seed2);
```

### Sign Multiple Messages
```typescript
// Use different RNG seeds
const rngSeed1 = crypto.getRandomValues(new Uint8Array(48));
const rngSeed2 = crypto.getRandomValues(new Uint8Array(48));

const sig1 = falcon.signMessage(msg1, privateKey, rngSeed1);
const sig2 = falcon.signMessage(msg2, privateKey, rngSeed2);
```

### Batch Verify
```typescript
// Verification is fast - can verify many signatures
const results = messages.map((msg, i) => 
    falcon.verifySignature(msg, signatures[i], publicKey)
);
```

## 🎯 Common Use Cases

### Digital Signatures
```typescript
const document = new TextEncoder().encode('Contract text...');
const signature = falcon.signMessage(document, privateKey, rngSeed);
// Send: { document, signature, publicKey }
```

### Key Agreement (with proper protocol)
```typescript
// Generate ephemeral keypair
const ephemeralKeypair = falcon.createKeypairFromSeed(ephemeralSeed);
// Sign with long-term key
const proof = falcon.signMessage(ephemeralKeypair.publicKey, longTermPrivateKey, rngSeed);
```

### Timestamping
```typescript
const timestamp = Date.now().toString();
const data = new TextEncoder().encode(JSON.stringify({ timestamp, document }));
const signature = falcon.signMessage(data, privateKey, rngSeed);
```

## ⚠️ What NOT to Do

❌ Don't reuse RNG seeds for signing  
❌ Don't use weak random sources (Math.random(), Date.now(), etc.)  
❌ Don't sign untrusted data without validation  
❌ Don't expose private keys in logs or error messages  
❌ Don't use `file://` protocol in browsers (WASM won't load)

## ✅ Best Practices

✅ Always await `init()` before using any methods  
✅ Use `crypto.getRandomValues()` for all randomness  
✅ Validate all inputs from external sources  
✅ Handle errors gracefully  
✅ Clear sensitive data when done (if possible)  
✅ Use HTTPS for web applications  
✅ Keep dependencies updated

---

**Need More Help?**  
Check `README.md` for detailed documentation or open an issue on GitHub.
