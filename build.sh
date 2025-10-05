#!/bin/bash

# Build script for Falcon-512 WebAssembly module
# Requires Emscripten SDK (emcc) to be installed and in PATH

set -e

echo "Building Falcon-512 WebAssembly module..."

# Create dist directory if it doesn't exist
mkdir -p dist

# Collect all Falcon C source files (excluding test files)
FALCON_SOURCES=(
    "Falcon-impl-round3/codec.c"
    "Falcon-impl-round3/common.c"
    "Falcon-impl-round3/falcon.c"
    "Falcon-impl-round3/fft.c"
    "Falcon-impl-round3/fpr.c"
    "Falcon-impl-round3/keygen.c"
    "Falcon-impl-round3/rng.c"
    "Falcon-impl-round3/shake.c"
    "Falcon-impl-round3/sign.c"
    "Falcon-impl-round3/vrfy.c"
)

# Our WASM wrapper
WRAPPER_SOURCE="src/falcon_wasm.c"

# Compiler flags
CFLAGS=(
    "-O3"                          # Optimize for performance
    "-flto"                        # Link-time optimization
    "-I./Falcon-impl-round3"       # Include path for Falcon headers
    "-DFALCON_FPEMU=0"             # Use native floating point (faster in WASM)
    "-DFALCON_FPNATIVE=1"
)

# Emscripten-specific flags
EMFLAGS=(
    -s WASM=1                                      # Generate WASM
    -s ALLOW_MEMORY_GROWTH=1                       # Allow heap growth
    -s "EXPORTED_RUNTIME_METHODS=['cwrap','ccall','getValue','setValue']"  # Export runtime helpers
    -s MODULARIZE=1                                # Export as ES6 module
    -s EXPORT_ES6=1                                # ES6 module format
    -s "EXPORT_NAME=createFalconModule"            # Module factory name
    -s TOTAL_MEMORY=16777216                       # Initial memory: 16MB
    -s STACK_SIZE=1048576                          # Stack size: 1MB
    --no-entry                                     # No main() function
)

# Build command
echo "Compiling with emcc..."
emcc "${CFLAGS[@]}" "${EMFLAGS[@]}" \
    "${FALCON_SOURCES[@]}" \
    "$WRAPPER_SOURCE" \
    -o dist/falcon.js

echo "Build complete!"
echo "Output files:"
echo "  - dist/falcon.js"
echo "  - dist/falcon.wasm"
