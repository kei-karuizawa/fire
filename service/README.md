# Fire backend

A Go backend for reading App Store Connect app titles. The reusable Apple
client and local `.p8` signer live in
[app-store-connect](app-store-connect). Go 1.22+;
no third-party Go dependencies.

This is the first backend feature for CLI, web, desktop and mobile clients.
Those frontends are not implemented yet. See the [repository guide](../README.md)
for their directories. All commands below run from `service`, unless stated
otherwise. From the repository root, first run `cd service`.

## Run on the user's computer

The backend reads the user's existing, unencrypted PKCS#8 `.p8` file from an
absolute path. It keeps the key in memory and sends only signed JWTs to Apple.
There is no private-key upload endpoint. Keep the key outside this repository;
`.p8` and `.env` files are ignored by Git.

```sh
export FIRE_API_TOKEN="$(openssl rand -hex 32)"
export ASC_AUTH_MODE=local
export ASC_KEY_TYPE=team
export ASC_KEY_ID=YOUR_KEY_ID
export ASC_ISSUER_ID=YOUR_ISSUER_ID
export ASC_PRIVATE_KEY_PATH=/absolute/path/to/AuthKey_YOUR_KEY_ID.p8

go run ./cmd/fire
```

For an individual API key, use `ASC_KEY_TYPE=individual` and unset
`ASC_ISSUER_ID`. Key ID is required for both key types. Obtain API credentials
from App Store Connect and use a key with permission to read the app.

The server defaults to `127.0.0.1:8080`. From a second shell with the same
`FIRE_API_TOKEN`, request an app's numeric App Store Connect ID (not its bundle ID):

```sh
curl http://127.0.0.1:8080/v1/apps/123456789/title \
  -H "Authorization: Bearer $FIRE_API_TOKEN"
```

```json
{"appId":"123456789","title":"My App","locale":"en-US","source":"app"}
```

This returns `apps.attributes.name` and `primaryLocale`. It reads account
metadata, so it does not establish that the app is publicly available.

For an exact localized title, supply both the app-info ID and locale:

```sh
curl 'http://127.0.0.1:8080/v1/apps/123456789/title?appInfoId=APP_INFO_ID&locale=zh-Hans' \
  -H "Authorization: Bearer $FIRE_API_TOKEN"
```

Find the app-info ID using Apple's `GET /v1/apps/{id}/appInfos` endpoint.
Select the desired metadata state explicitly, since draft and published app
information may differ. Fire verifies the app-info association, then queries
the exact locale. It returns 404 if that locale is absent, with no language
fallback. The response includes `appInfoId` and `source: appInfoLocalization`.

## Self-host on a separate server

Use relay mode when the `.p8` must remain on the user's device:

```sh
export ASC_AUTH_MODE=relay
export FIRE_API_TOKEN="$(openssl rand -hex 32)"
export FIRE_ADDR=0.0.0.0:8080
unset ASC_PRIVATE_KEY_PATH ASC_KEY_ID ASC_ISSUER_ID
go run ./cmd/fire
```

Place a TLS reverse proxy in front of the server and use HTTPS for remote
requests. A CLI, desktop or mobile client signs an Apple JWT on the user's
device, then sends it alongside the separate backend access token:

```sh
curl https://your-server.example/v1/apps/123456789/title \
  -H "Authorization: Bearer $FIRE_API_TOKEN" \
  -H "X-App-Store-Token: $APPLE_JWT"
```

The backend forwards the JWT to Apple for authorization and does not store it.
An Apple JWT is a temporary credential: keep it out of logs and URLs.
The one `FIRE_API_TOKEN` is suitable for a private self-hosted instance;
public multi-user hosting needs user authentication and authorization added.

The reusable Go package can sign on the client device:

```go
signer, err := appstoreconnect.LoadSigner(keyPath, keyID, issuerID, "team")
if err != nil {
    return err
}
scope, err := appstoreconnect.TitleScope(appID, "", "")
if err != nil {
    return err
}
token, err := signer.Token(scope...)
if err != nil {
    return err
}
// Send token in X-App-Store-Token over HTTPS; never send the .p8.
```

`Signer.Token` issues five-minute ES256 tokens. Local backend mode scopes each
token to the title lookup's Apple requests. Native clients may implement the
same signing flow using their platform's secure key storage. A web client
needs a local companion or browser-side signing implementation; a remote
backend cannot read a path on the user's computer. This project does not yet
implement browser key import or signing.

If the user intentionally runs this backend on the same self-hosted machine
where their key is stored, local mode also works there: set the path to a
file on that machine, or mount the file read-only when containerizing it.

## Configuration and contract

See [.env.example](.env.example) for local configuration and
[api/openapi.yaml](api/openapi.yaml) for the HTTP contract. Environment files
are examples only; export the values yourself or use your service manager.

- `FIRE_ADDR`: bind address, default `127.0.0.1:8080`.
- `FIRE_API_TOKEN`: required random secret of at least 32 characters.
- `FIRE_ALLOWED_ORIGIN`: optional exact browser origin, such as
  `http://localhost:3000`. Browser requests from other origins are rejected.
- `ASC_AUTH_MODE`: `local` (default) or `relay`.
- `ASC_KEY_TYPE`: `team` (default) or `individual`, in local mode.
- `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY_PATH`: local signing settings.
- `ASC_BASE_URL`: upstream override for tests, default Apple's API. HTTP is
  allowed only on loopback. Keep the production default for real credentials.

`GET /healthz` is public and checks only the process. All title requests require
backend authentication. Apple 401, 403, 404 and 429 statuses are preserved with
sanitized error codes; network and invalid-response errors return 502, and
timeouts return 504. A rate limit response forwards `Retry-After` when provided.
The client uses a ten-second per-request timeout and the handler has a
twenty-second lookup deadline. There are no automatic retries or title caches.
The server disables redirects, returns `Cache-Control: no-store`, and does
not log request headers, Apple JWTs, private keys or Apple response bodies.

Build a native binary with `go build -o bin/fire ./cmd/fire`. The code uses
portable standard-library APIs; cross-compile with Go's `GOOS` and `GOARCH`.
Stop with Ctrl-C or SIGTERM for graceful shutdown.

## Verification

```sh
go test ./...
go vet ./...
```

These commands cover both the HTTP backend and Apple client/signer. You can
also run `make test` and `make vet` from the repository root.

Unit tests verify team and individual JWT claims, cryptographic signatures,
key validation, backend authentication, query validation and browser origins.
Integration tests are opt-in and drive a running backend against the checked-in
Postman simulation. Fixtures use Apple's documented response shapes and
synthetic app data. The CLI session was signed out, so an owner-published
mock was not searched or reused.

In one terminal, run Postman CLI 1.70+:

```sh
postman simulation run postman/simulations/apple.sim.yaml --port 4900 --output ndjson
```

In a second terminal, start Fire with a local synthetic key (never use a real
Apple key for this simulation):

```sh
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out /tmp/fire-test.p8
export FIRE_API_TOKEN=simulation-only-token-at-least-32-characters
export ASC_AUTH_MODE=local
export ASC_KEY_TYPE=team
export ASC_KEY_ID=simulation-key
export ASC_ISSUER_ID=simulation-issuer
export ASC_PRIVATE_KEY_PATH=/tmp/fire-test.p8
export ASC_BASE_URL=http://127.0.0.1:4900/apple
go run ./cmd/fire
```

In a third terminal:

```sh
FIRE_TEST_URL=http://127.0.0.1:8080 \
FIRE_TEST_TOKEN=simulation-only-token-at-least-32-characters \
go test ./integration -v
```

To check relay mode, restart Fire with `ASC_AUTH_MODE=relay`, unset its Apple
key settings, and add `FIRE_TEST_AUTH_MODE=relay` to the test command. Check
the simulation's `request` events to confirm the upstream calls ran. Stop
both servers with Ctrl-C when finished. The simulation verifies the real
HTTP client and backend together; live Apple acceptance still requires your
own credentials and app ID.

Apple references: [reading app information](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-apps-_id_),
[reading localized app information](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-appinfos-_id_-appinfolocalizations),
and [JWT signing and claims](https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests).
