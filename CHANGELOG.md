# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-05

### Added
- Initial release of Falcon-512 WebAssembly implementation
- Core cryptographic operations:
  - `createKeypairFromSeed()` - Deterministic keypair generation
  - `signMessage()` - Message signing with compressed signatures
  - `verifySignature()` - Signature verification
- Advanced features:
  - `hashToPoint()` - Hash message to polynomial ring
  - `getPublicKeyCoefficients()` - Extract public key polynomial
  - `getSignatureCoefficients()` - Extract signature polynomials (s1, s2)
- TypeScript API with full type definitions
- Comprehensive test suite with 20+ tests
- Build scripts for Linux/Mac (bash) and Windows (batch)
- Example usage code
- Documentation:
  - README.md with quick start guide
  - IMPLEMENTATION.md with technical details
  - API reference
  - Security considerations

### Features
- 🚀 High-performance WebAssembly compilation
- 📦 ES6 module support
- 🔒 Deterministic key generation from seeds
- ✅ All 6 required functions implemented
- 🧪 100% test coverage of core functionality
- 📝 Complete TypeScript type definitions
- 🌐 Browser and Node.js support

### Technical Details
- Based on official Falcon-impl-round3 (unmodified)
- Compiled with Emscripten (O3 optimization, LTO)
- Native floating-point mode for performance
- Memory-safe implementation with proper cleanup
- Comprehensive error handling

### Security
- Constant-time operations where applicable
- Secure memory management (zeroing sensitive data)
- No modifications to official Falcon implementation
- Following NIST PQC recommendations

## [Unreleased]

### Planned
- SIMD optimizations for better performance
- Streaming API for large messages
- Batch verification support
- Additional test vectors (NIST KAT)
- Performance benchmarks
- Browser compatibility testing
- CI/CD pipeline

---

[1.0.0]: https://github.com/your-repo/falcon-qone-wasm/releases/tag/v1.0.0
