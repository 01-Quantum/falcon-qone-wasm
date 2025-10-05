@echo off
REM Build script for Falcon-512 WebAssembly module (Windows)
REM Requires Emscripten SDK (emcc) to be installed and in PATH

echo Building Falcon-512 WebAssembly module...

REM Create dist directory if it doesn't exist
if not exist "dist" mkdir dist

REM Compiler flags and source files
set CFLAGS=-O3 -flto -I./Falcon-impl-round3 -DFALCON_FPEMU=0 -DFALCON_FPNATIVE=1

set EMFLAGS=-s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s "EXPORTED_RUNTIME_METHODS=['cwrap','ccall','getValue','setValue']" -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME='createFalconModule' -s TOTAL_MEMORY=16777216 -s STACK_SIZE=1048576 --no-entry

set FALCON_SOURCES=Falcon-impl-round3/codec.c Falcon-impl-round3/common.c Falcon-impl-round3/falcon.c Falcon-impl-round3/fft.c Falcon-impl-round3/fpr.c Falcon-impl-round3/keygen.c Falcon-impl-round3/rng.c Falcon-impl-round3/shake.c Falcon-impl-round3/sign.c Falcon-impl-round3/vrfy.c

set WRAPPER_SOURCE=src/falcon_wasm.c

REM Build command
echo Compiling with emcc...
call emcc %CFLAGS% %EMFLAGS% %FALCON_SOURCES% %WRAPPER_SOURCE% -o dist/falcon.js

if %ERRORLEVEL% EQU 0 (
    echo Build complete!
    echo Output files:
    echo   - dist/falcon.js
    echo   - dist/falcon.wasm
) else (
    echo Build failed!
    exit /b 1
)
