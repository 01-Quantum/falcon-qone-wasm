/**
 * Basic usage example for Falcon-512 WebAssembly module
 */

import { Falcon512 } from '../src/falcon';
// @ts-ignore
import createFalconModule from '../dist/falcon.js';

async function main() {
  console.log('Falcon-512 WebAssembly Example\n');

  // Initialize the WASM module
  const falcon = new Falcon512();
  await falcon.init(createFalconModule);
  console.log('✓ Falcon-512 module initialized\n');

  // 1. Generate a keypair from a seed
  console.log('1. Generating keypair from seed...');
  const seed = new Uint8Array(48);
  crypto.getRandomValues(seed); // Use cryptographically secure random
  
  const keypair = falcon.createKeypairFromSeed(seed);
  console.log(`   Private key size: ${keypair.privateKey.length} bytes`);
  console.log(`   Public key size:  ${keypair.publicKey.length} bytes\n`);

  // 2. Sign a message
  console.log('2. Signing a message...');
  const message = new TextEncoder().encode('Hello, Falcon-512! This is a test message.');
  
  const rngSeed = new Uint8Array(48);
  crypto.getRandomValues(rngSeed);
  
  const signature = falcon.signMessage(message, keypair.privateKey, rngSeed);
  console.log(`   Message: "${new TextDecoder().decode(message)}"`);
  console.log(`   Signature size: ${signature.length} bytes\n`);

  // 3. Verify the signature
  console.log('3. Verifying signature...');
  const isValid = falcon.verifySignature(message, signature, keypair.publicKey);
  console.log(`   Signature valid: ${isValid ? '✓ YES' : '✗ NO'}\n`);

  // 4. Test with tampered message
  console.log('4. Testing with tampered message...');
  const tamperedMessage = new TextEncoder().encode('Hello, Falcon-512! This is a TAMPERED message.');
  const isTamperedValid = falcon.verifySignature(tamperedMessage, signature, keypair.publicKey);
  console.log(`   Tampered signature valid: ${isTamperedValid ? '✓ YES' : '✗ NO (expected)'}\n`);

  // 5. Hash message to point
  console.log('5. Hashing message to point...');
  const point = falcon.hashToPoint(message);
  console.log(`   Hash-to-point coefficients: ${point.length} elements`);
  console.log(`   First 5 coefficients: [${point.slice(0, 5).join(', ')}]\n`);

  // 6. Extract public key coefficients
  console.log('6. Extracting public key coefficients...');
  const pubkeyCoeffs = falcon.getPublicKeyCoefficients(keypair.publicKey);
  console.log(`   Public key coefficients: ${pubkeyCoeffs.length} elements`);
  console.log(`   First 5 coefficients: [${pubkeyCoeffs.slice(0, 5).join(', ')}]\n`);

  // 7. Extract signature coefficients
  console.log('7. Extracting signature coefficients...');
  const sigCoeffs = falcon.getSignatureCoefficients(signature);
  console.log(`   s1 coefficients: ${sigCoeffs.s1.length} elements`);
  console.log(`   s2 coefficients: ${sigCoeffs.s2.length} elements`);
  console.log(`   First 5 s1: [${sigCoeffs.s1.slice(0, 5).join(', ')}]`);
  console.log(`   First 5 s2: [${sigCoeffs.s2.slice(0, 5).join(', ')}]\n`);

  // 8. Demonstrate deterministic key generation
  console.log('8. Testing deterministic key generation...');
  const fixedSeed = new Uint8Array(48);
  for (let i = 0; i < 48; i++) fixedSeed[i] = i;
  
  const keypair1 = falcon.createKeypairFromSeed(fixedSeed);
  const keypair2 = falcon.createKeypairFromSeed(fixedSeed);
  
  const keysMatch = keypair1.publicKey.every((byte, i) => byte === keypair2.publicKey[i]);
  console.log(`   Same seed produces same keys: ${keysMatch ? '✓ YES' : '✗ NO'}\n`);

  // 9. Show constants
  console.log('9. Falcon-512 Constants:');
  console.log(`   N (degree):           ${Falcon512.constants.N}`);
  console.log(`   Private key size:     ${Falcon512.constants.PRIVKEY_SIZE} bytes`);
  console.log(`   Public key size:      ${Falcon512.constants.PUBKEY_SIZE} bytes`);
  console.log(`   Max signature size:   ${Falcon512.constants.SIG_MAX_SIZE} bytes`);
  console.log(`   Modulus (q):          ${Falcon512.constants.Q}\n`);

  console.log('✓ All examples completed successfully!');
}

// Run the example
main().catch(console.error);
