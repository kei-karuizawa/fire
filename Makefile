.PHONY: run build test vet web

run:
	cd service && go run ./cmd/fire

build:
	cd service && go build -o bin/fire ./cmd/fire

test:
	cd service && go test ./...

vet:
	cd service && go vet ./...

web:
	cd web && python3 -m http.server 3000
