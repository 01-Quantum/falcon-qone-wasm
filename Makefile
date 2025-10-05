# Makefile for Falcon-512 WebAssembly
# Provides convenient commands for building with Docker

.PHONY: help build build-local build-docker build-ts test clean docker-shell docker-build docker-clean all

# Default target
help:
	@echo "Falcon-512 WebAssembly Build Commands"
	@echo "======================================"
	@echo ""
	@echo "Docker builds (recommended):"
	@echo "  make build-docker    - Build WASM using Docker"
	@echo "  make docker-shell    - Open interactive Docker shell"
	@echo "  make docker-build    - Rebuild Docker image"
	@echo "  make docker-clean    - Remove Docker containers and images"
	@echo ""
	@echo "Local builds (requires Emscripten installed):"
	@echo "  make build-local     - Build WASM locally"
	@echo ""
	@echo "Testing:"
	@echo "  make test            - Run tests"
	@echo ""
	@echo "Complete workflows:"
	@echo "  make build           - Build WASM with Docker"
	@echo "  make all             - Build and test everything"
	@echo "  make clean           - Clean build outputs"
	@echo ""

# Build everything (Docker WASM only)
build: build-docker
	@echo "✓ Build complete!"

# Build everything and run tests
all: build test
	@echo "✓ All tasks complete!"

# Build WASM using Docker (recommended)
build-docker:
	@echo "Building WebAssembly with Docker..."
	@docker-compose up falcon-wasm-builder
	@echo "✓ WASM build complete!"

# Build WASM locally (requires Emscripten)
build-local:
	@echo "Building WebAssembly locally..."
	@bash build.sh
	@echo "✓ WASM build complete!"

# Run tests
test:
	@echo "Running tests..."
	@npm test

# Open interactive Docker shell
docker-shell:
	@docker-compose run --rm falcon-wasm-shell

# Rebuild Docker image (if Dockerfile changed)
docker-build:
	@echo "Rebuilding Docker image..."
	@docker-compose build --no-cache falcon-wasm-builder
	@echo "✓ Docker image rebuilt!"

# Clean Docker resources
docker-clean:
	@echo "Cleaning Docker resources..."
	@docker-compose down --rmi all --volumes
	@echo "✓ Docker resources cleaned!"

# Clean build outputs
clean:
	@echo "Cleaning build outputs..."
	@rm -rf dist/
	@rm -rf node_modules/.cache
	@echo "✓ Clean complete!"

# Install dependencies
install:
	@echo "Installing dependencies..."
	@npm install
	@echo "✓ Dependencies installed!"

# Quick rebuild (assumes Docker image exists)
quick: build-docker
	@echo "✓ Quick rebuild complete!"
