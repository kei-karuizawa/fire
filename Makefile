.PHONY: run build test vet

run:
	cd service && go run ./cmd/fire

build:
	cd service && go build -o bin/fire ./cmd/fire

test:
	cd service && go test ./...

vet:
	cd service && go vet ./...
