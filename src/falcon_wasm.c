/*
 * WebAssembly wrapper for Falcon-512 post-quantum signatures
 * 
 * This file provides WASM-friendly exports for the Falcon-512 implementation
 * without modifying the original Falcon-impl-round3 code.
 */

#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include "../Falcon-impl-round3/falcon.h"
#include "../Falcon-impl-round3/inner.h"

// For Emscripten exports
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define WASM_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define WASM_EXPORT
#endif

// Falcon-512 parameters (logn = 9)
#define FALCON512_LOGN 9
#define FALCON512_N 512
#define FALCON512_PRIVKEY_SIZE 1281
#define FALCON512_PUBKEY_SIZE 897
#define FALCON512_SIG_COMPRESSED_MAXSIZE 752
#define FALCON512_TMPSIZE_KEYGEN 15879
#define FALCON512_TMPSIZE_SIGNDYN 39943
#define FALCON512_TMPSIZE_VERIFY 4097

// ============================================================================
// MEMORY MANAGEMENT
// ============================================================================

/**
 * Allocate memory that can be accessed by JavaScript
 */
WASM_EXPORT
void* wasm_malloc(size_t size) {
    return malloc(size);
}

/**
 * Free memory allocated by wasm_malloc
 */
WASM_EXPORT
void wasm_free(void* ptr) {
    free(ptr);
}

// ============================================================================
// KEYPAIR GENERATION
// ============================================================================

/**
 * Generate a Falcon-512 keypair from a seed.
 * 
 * @param seed Pointer to seed bytes
 * @param seed_len Length of seed (recommended: 48 bytes)
 * @param privkey_out Pointer to buffer for private key (1281 bytes)
 * @param pubkey_out Pointer to buffer for public key (897 bytes)
 * @return 0 on success, negative error code on failure
 */
WASM_EXPORT
int falcon512_keygen_from_seed(
    const uint8_t* seed,
    size_t seed_len,
    uint8_t* privkey_out,
    uint8_t* pubkey_out
) {
    shake256_context rng;
    uint8_t tmp[FALCON512_TMPSIZE_KEYGEN];
    int ret;

    // Initialize PRNG from seed
    shake256_init_prng_from_seed(&rng, seed, seed_len);

    // Generate keypair
    ret = falcon_keygen_make(
        &rng,
        FALCON512_LOGN,
        privkey_out, FALCON512_PRIVKEY_SIZE,
        pubkey_out, FALCON512_PUBKEY_SIZE,
        tmp, sizeof(tmp)
    );

    // Clear sensitive data
    memset(tmp, 0, sizeof(tmp));
    memset(&rng, 0, sizeof(rng));

    return ret;
}

// ============================================================================
// SIGNING
// ============================================================================

/**
 * Sign a message with a Falcon-512 private key.
 * 
 * @param message Pointer to message bytes
 * @param message_len Length of message
 * @param privkey Pointer to private key (1281 bytes)
 * @param rng_seed Pointer to RNG seed for signature randomness
 * @param rng_seed_len Length of RNG seed
 * @param sig_out Pointer to buffer for signature (max 752 bytes)
 * @param sig_len_inout Pointer to size_t: input = buffer size, output = actual sig size
 * @return 0 on success, negative error code on failure
 */
WASM_EXPORT
int falcon512_sign(
    const uint8_t* message,
    size_t message_len,
    const uint8_t* privkey,
    const uint8_t* rng_seed,
    size_t rng_seed_len,
    uint8_t* sig_out,
    size_t* sig_len_inout
) {
    shake256_context rng;
    uint8_t tmp[FALCON512_TMPSIZE_SIGNDYN];
    int ret;

    // Initialize PRNG from seed
    shake256_init_prng_from_seed(&rng, rng_seed, rng_seed_len);

    // Sign message (compressed format)
    ret = falcon_sign_dyn(
        &rng,
        sig_out, sig_len_inout, FALCON_SIG_COMPRESSED,
        privkey, FALCON512_PRIVKEY_SIZE,
        message, message_len,
        tmp, sizeof(tmp)
    );

    // Clear sensitive data
    memset(tmp, 0, sizeof(tmp));
    memset(&rng, 0, sizeof(rng));

    return ret;
}

// ============================================================================
// VERIFICATION
// ============================================================================

/**
 * Verify a Falcon-512 signature.
 * 
 * @param message Pointer to message bytes
 * @param message_len Length of message
 * @param signature Pointer to signature bytes
 * @param signature_len Length of signature
 * @param pubkey Pointer to public key (897 bytes)
 * @return 0 if signature is valid, negative error code otherwise
 */
WASM_EXPORT
int falcon512_verify(
    const uint8_t* message,
    size_t message_len,
    const uint8_t* signature,
    size_t signature_len,
    const uint8_t* pubkey
) {
    uint8_t tmp[FALCON512_TMPSIZE_VERIFY];
    int ret;

    // Verify signature (format auto-detected)
    ret = falcon_verify(
        signature, signature_len, 0,
        pubkey, FALCON512_PUBKEY_SIZE,
        message, message_len,
        tmp, sizeof(tmp)
    );

    memset(tmp, 0, sizeof(tmp));

    return ret;
}

// ============================================================================
// HASH-TO-POINT
// ============================================================================

/**
 * Hash a message to a point in the Falcon-512 polynomial ring.
 * Returns 512 signed 16-bit coefficients.
 * 
 * @param message Pointer to message bytes
 * @param message_len Length of message
 * @param point_out Pointer to buffer for 512 int16_t values (1024 bytes)
 * @return 0 on success, negative error code on failure
 */
WASM_EXPORT
int falcon512_hash_to_point(
    const uint8_t* message,
    size_t message_len,
    int16_t* point_out
) {
    inner_shake256_context sc;
    uint16_t hm[FALCON512_N];
    
    // Initialize SHAKE256 and hash message
    inner_shake256_init(&sc);
    inner_shake256_inject(&sc, message, message_len);
    inner_shake256_flip(&sc);
    
    // Generate point (using vartime version as we're hashing public data)
    Zf(hash_to_point_vartime)(&sc, hm, FALCON512_LOGN);
    
    // Copy to output (convert uint16_t to int16_t)
    for (int i = 0; i < FALCON512_N; i++) {
        point_out[i] = (int16_t)hm[i];
    }
    
    return 0;
}

// ============================================================================
// PUBLIC KEY COEFFICIENTS
// ============================================================================

/**
 * Extract the 512 coefficients from a Falcon-512 public key.
 * 
 * @param pubkey Pointer to encoded public key (897 bytes)
 * @param coeffs_out Pointer to buffer for 512 int16_t values (1024 bytes)
 * @return 0 on success, negative error code on failure
 */
WASM_EXPORT
int falcon512_get_pubkey_coefficients(
    const uint8_t* pubkey,
    int16_t* coeffs_out
) {
    uint16_t h[FALCON512_N];
    size_t decoded_len;
    
    // Check header byte (should be 0x00 + logn)
    if (pubkey[0] != (0x00 + FALCON512_LOGN)) {
        return FALCON_ERR_FORMAT;
    }
    
    // Decode public key (modq encoded)
    decoded_len = Zf(modq_decode)(h, FALCON512_LOGN, pubkey + 1, FALCON512_PUBKEY_SIZE - 1);
    
    if (decoded_len == 0) {
        return FALCON_ERR_FORMAT;
    }
    
    // Copy coefficients (convert uint16_t to int16_t)
    for (int i = 0; i < FALCON512_N; i++) {
        coeffs_out[i] = (int16_t)h[i];
    }
    
    return 0;
}

// ============================================================================
// SIGNATURE COEFFICIENTS
// ============================================================================

/**
 * Extract the signature coefficients from a Falcon-512 signature.
 * The signature consists of s1 (explicitly encoded) and s0 (computed from s1).
 * 
 * @param signature Pointer to encoded signature
 * @param signature_len Length of signature
 * @param s0_out Pointer to buffer for s0 coefficients: 512 int16_t (1024 bytes)
 * @param s1_out Pointer to buffer for s1 coefficients: 512 int16_t (1024 bytes)
 * @return 0 on success, negative error code on failure
 */
WASM_EXPORT
int falcon512_get_signature_coefficients(
    const uint8_t* signature,
    size_t signature_len,
    int16_t* s0_out,
    int16_t* s1_out
) {
    uint16_t hm[FALCON512_N];
    int16_t s1[FALCON512_N];
    size_t decoded_len;
    inner_shake256_context sc;
    
    // Check minimum signature length (1 header + 40 nonce + some data)
    if (signature_len < 41) {
        return FALCON_ERR_FORMAT;
    }
    
    // Check header byte
    uint8_t header = signature[0];
    if ((header & 0xF0) != 0x30) {  // Compressed format
        return FALCON_ERR_FORMAT;
    }
    if ((header & 0x0F) != FALCON512_LOGN) {
        return FALCON_ERR_FORMAT;
    }
    
    // Extract nonce (40 bytes after header)
    const uint8_t* nonce = signature + 1;
    
    // Decode compressed s1 values (after header and nonce)
    decoded_len = Zf(comp_decode)(s1, FALCON512_LOGN, signature + 41, signature_len - 41);
    
    if (decoded_len == 0) {
        return FALCON_ERR_FORMAT;
    }
    
    // Hash nonce to get hm (this is what was signed)
    inner_shake256_init(&sc);
    inner_shake256_inject(&sc, nonce, 40);
    inner_shake256_flip(&sc);
    Zf(hash_to_point_vartime)(&sc, hm, FALCON512_LOGN);
    
    // Compute s0 = hm - s1 (in the polynomial ring)
    // Note: This is a simplified version. The actual computation may need
    // to handle modular reduction properly.
    for (int i = 0; i < FALCON512_N; i++) {
        s0_out[i] = (int16_t)hm[i] - s1[i];
        s1_out[i] = s1[i];
    }
    
    return 0;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the size constants for Falcon-512
 */
WASM_EXPORT
int falcon512_get_privkey_size(void) {
    return FALCON512_PRIVKEY_SIZE;
}

WASM_EXPORT
int falcon512_get_pubkey_size(void) {
    return FALCON512_PUBKEY_SIZE;
}

WASM_EXPORT
int falcon512_get_sig_max_size(void) {
    return FALCON512_SIG_COMPRESSED_MAXSIZE;
}

WASM_EXPORT
int falcon512_get_n(void) {
    return FALCON512_N;
}
