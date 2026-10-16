# App Store Connect Go package

Apple API client and local `.p8` JWT signer, independent of HTTP routing.
Its import path is `fire/service/app-store-connect`, part of the `service` module.
The directory uses hyphens; the Go package name remains `appstoreconnect`,
because package names must be valid Go identifiers. Imports use the explicit
alias `appstoreconnect` to make that distinction clear.
This public package can be reused by a future Go CLI; it does not depend on
the backend's `internal/httpapi` package.

- `LoadSigner`: reads an existing unencrypted PKCS#8 ECDSA P-256 private key.
- `Signer.Token`: generates a five-minute ES256 JWT for team or individual keys.
- `TitleScope`: builds Apple request scopes for a title lookup.
- `Client.GetTitle`: reads an app name or a specific app-info localization.

Run `go test ./app-store-connect` from `service`, or `make test` at the repository
root. Other client languages can call the HTTP backend and implement local
signing using their platform APIs.
