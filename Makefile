.PHONY: build web web-install web-dev run demo test vet check design

# Build the web app into the Go binary, then the binary itself.
build: web
	cd service && go build -o bin/fire ./cmd/fire

web-install:
	cd web && npm ci

web:
	cd web && npm run build

# The API server on 127.0.0.1:8080 (uses the last web build).
run:
	cd service && go run ./cmd/fire

# A full demo against simulated App Store Connect data. No Apple key needed.
demo: web
	cd service && go run ./cmd/fire-demo

# Vite dev server with hot reload on 127.0.0.1:5173. It forwards /api to
# FIRE_BACKEND (default http://127.0.0.1:8080), so start `make demo` or `make run` too.
web-dev:
	cd web && npm run dev

test:
	cd service && go test ./...

vet:
	cd service && go vet ./...

check: vet test
	cd web && npx tsc --noEmit

design:
	cd design && npm run dev
