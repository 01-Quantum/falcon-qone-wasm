# Dockerfile for building Falcon-512 WebAssembly module
# Based on official Emscripten Docker image

FROM emscripten/emsdk:3.1.50

# Set working directory
WORKDIR /workspace

# Install any additional tools if needed
RUN apt-get update && apt-get install -y \
    bash \
    make \
    && rm -rf /var/lib/apt/lists/*

# Copy source files
COPY Falcon-impl-round3/ ./Falcon-impl-round3/
COPY src/falcon_wasm.c ./src/falcon_wasm.c
COPY build.sh ./build.sh

# Make build script executable
RUN chmod +x build.sh

# Set environment variables
ENV EMSCRIPTEN=/emsdk/upstream/emscripten

# Default command: build the WASM module
CMD ["./build.sh"]

# Alternative: You can also run bash for interactive building
# CMD ["bash"]
