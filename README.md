# Fire

An App Store Connect toolkit with web, iOS, macOS and command-line clients,
plus a self-hostable Go backend.

## Repository layout

```text
fire/
├── web/                         # Web client
├── app/
│   ├── ios/                     # iOS client
│   └── macos/                   # macOS client
├── service/                     # Go backend
│   ├── cmd/fire/                # HTTP service entry point
│   ├── internal/httpapi/        # Routes and backend authentication
│   ├── app-store-connect/         # Apple API client and local JWT signer
│   ├── api/openapi.yaml         # HTTP contract for all clients
│   ├── integration/             # Tests against a running backend
│   ├── postman/                 # Apple API simulation fixtures
│   ├── .env.example
│   └── go.mod
├── cli/                         # Command-line client
├── go.work                      # Go workspace; currently includes service
└── Makefile                     # Root backend development commands
```

The Go backend is implemented. The `web`, `app/ios`, `app/macos` and `cli`
directories contain scope notes; their clients have not been implemented.
The backend's `service/cmd/fire` starts the HTTP service and is separate from
the future user-facing CLI in `cli`.

## Start the backend

Requires Go 1.22+. Export configuration using
[service/.env.example](service/.env.example); environment files are not
loaded automatically. From this repository root:

```sh
make run
```

For local-key and self-hosted relay setup, see the
[backend guide](service/README.md).

## Build and verify

```sh
make build
make test
make vet
```

The binary is written to `service/bin/fire`. Tests cover the backend and its Apple
client/signer. Integration tests require a separately running backend and
simulation; their setup is in the backend guide.

Without Make, use these commands from the repository root:

```sh
go run ./service/cmd/fire
go test ./service/...
go vet ./service/...
```

The root is a Go workspace, not a Go module. Inside `service`, the usual
`go run ./cmd/fire`, `go test ./...` and `go vet ./...` commands also work.

## Component boundaries

- `web` owns browser UI and browser-side configuration.
- `app/ios` and `app/macos` own native UI and platform-specific key storage.
- `service` owns backend configuration, Apple integration, HTTP contracts
  and backend tests. Its public `appstoreconnect` package is separate from
  HTTP handling so a future Go CLI can reuse it when needed.
- `cli` owns user-facing commands and command-line configuration.

All HTTP clients use [service/api/openapi.yaml](service/api/openapi.yaml).
A remote backend cannot read a `.p8` path on the user's device. To keep the
key there, clients must sign locally and send a short-lived Apple JWT in
relay mode. Client signing and key-import interfaces are not implemented yet.
