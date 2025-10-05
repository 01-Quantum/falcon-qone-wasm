# Building Falcon-512 WASM

## Quick Build

```bash
# Install dependencies
npm install

# Build WASM with Docker (recommended)
docker-compose up falcon-wasm-builder

# Run tests
npm test
```

That's it!

## Build Options

### Option 1: Docker (Recommended)

**No Emscripten installation required!**

```bash
docker-compose up falcon-wasm-builder
```

Output:
- `dist/falcon.wasm` (~200-300KB)
- `dist/falcon.js` (~50-100KB Emscripten loader)

### Option 2: Local Build

**Requires:** [Emscripten SDK](https://emscripten.org/)

#### Install Emscripten

```bash
# Clone emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Install and activate
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

# On Windows: emsdk_env.bat
```

#### Build

```bash
# Linux/Mac
./build.sh
# or
npm run build:wasm

# Windows
build.bat
# or
npm run build:wasm:win
```

## Make Commands

```bash
make build          # Build with Docker
make build-local    # Build locally
make all            # Build + test
make test           # Run tests
make clean          # Clean output
make docker-shell   # Interactive Docker shell
```

## Verify Build

```bash
# Check output
ls -lh dist/

# Should show:
# dist/falcon.js    (~50-100KB)  - Emscripten loader
# dist/falcon.wasm  (~200-300KB) - WebAssembly binary
```

## Troubleshooting

### Error: emcc: command not found

Emscripten not in PATH.

**Solution:** Use Docker build or activate Emscripten:
```bash
source /path/to/emsdk/emsdk_env.sh
```

### Error: Permission denied (Docker)

**Linux solution:**
```bash
sudo chown -R $USER:$USER dist/
```

### Build succeeds but no output

Check you're in the project root:
```bash
pwd  # Should show falcon-qone-wasm/
ls   # Should see build.sh, Dockerfile, etc.
```

### Docker out of memory

Increase Docker memory in settings (recommend 4GB+).

## Build Configuration

Build flags in `build.sh`:
- `-O3`: Maximum optimization
- `-flto`: Link-time optimization  
- `FALCON_FPNATIVE=1`: Use native floating point
- `WASM=1`: Generate WebAssembly
- `MODULARIZE=1`: ES6 module export

## Development

### Rebuild after changes

```bash
rm -rf dist/
docker-compose up falcon-wasm-builder
npm test
```

### Interactive debugging

```bash
# Open shell in Docker
docker-compose run --rm falcon-wasm-shell

# Inside container:
./build.sh
ls -lh dist/
```

## CI/CD

### GitHub Actions Example

```yaml
name: Build and Test
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: docker-compose up falcon-wasm-builder
      - run: npm test
```

## Build Time

- **First Docker build**: ~10 minutes (downloads Emscripten image)
- **Subsequent builds**: ~30 seconds
- **Local build** (with Emscripten installed): ~30 seconds

## Output Size

| File | Size |
|------|------|
| falcon.wasm | ~250KB |
| falcon.js (Emscripten) | ~70KB |
| Total | ~320KB |

## Next Steps

After building:
1. Run tests: `npm test`
2. Try example: `node examples/basic-usage.js`
3. Read main [README.md](README.md) for API docs
