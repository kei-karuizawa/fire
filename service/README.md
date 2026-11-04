# Fire backend

A Go service (Go 1.22+, no third-party dependencies) that talks to the App Store
Connect API and serves the Fire web app. Commands below run from `service/`.

## Run

```sh
go run ./cmd/fire          # API and web app on 127.0.0.1:8080
go run ./cmd/fire-demo     # the same, against a simulated App Store Connect API
```

The web app is embedded from `internal/webui/dist`, which `npm run build` in
`web/` writes. A fresh checkout without a web build still compiles and serves the
API; `/` then answers 404 until you build the web app or set `FIRE_WEB_DIR`.

`fire-demo` flags: `-addr` (default `127.0.0.1:8080`), `-apple-addr` for the
simulated API, `-web` to serve a web build from a folder, and `-browser-key` to
start without a server key so you can try adding one in the browser.

## Keys

Every API request needs an App Store Connect token. Fire takes it from one of
two places, in this order:

1. **The browser.** The web app keeps the `.p8` key as a non-extractable
   WebCrypto key and sends a token it signed in the `X-App-Store-Token` header.
   The server forwards it to Apple and never sees the key.
2. **A server key.** Set `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_TYPE` and
   `ASC_PRIVATE_KEY_PATH` (see [.env.example](.env.example)). Fire signs and
   caches 10-minute tokens itself. Anyone who can reach Fire then acts with this
   key, so Fire refuses to start with a server key on a non-loopback address
   unless `FIRE_ALLOW_REMOTE_SERVER_KEY=true`.

There is no endpoint that accepts a private key.

## Security

- Browser requests must come from Fire's own origin (checked with `Origin` and
  `Sec-Fetch-Site`). Add more with `FIRE_ALLOWED_ORIGINS`.
- Responses carry a strict Content Security Policy, `no-store` on the API,
  `nosniff` and `frame-ancestors 'none'`.
- Request bodies must be JSON with no unknown fields. IDs are validated before
  they reach Apple's URLs, and pagination only follows links on Apple's host.
- Logs record method, path, status and duration. Tokens and bodies are never logged.

## API

All routes are under `/api/v1` and documented in [api/openapi.yaml](api/openapi.yaml).
Errors look like `{"error":{"code":"apple_permission","message":"..."}}`.

```sh
curl http://127.0.0.1:8080/api/v1/apps
curl http://127.0.0.1:8080/api/v1/apps/6447102938/overview
```

| Area | Routes |
| --- | --- |
| Session | `GET /session`, `GET /health` |
| Apps | `GET /apps`, `GET /apps/{app}/overview` |
| Metadata | `GET,PATCH /apps/{app}/metadata`, `POST /apps/{app}/metadata/locales`, `GET /localizations/{id}/screenshots` |
| App Review | `GET,POST /apps/{app}/reviews`, `POST /apps/{app}/reviews/{id}/cancel` |
| TestFlight | `GET /apps/{app}/builds`, `POST /apps/{app}/testers`, `GET,PATCH /builds/{id}`, `PUT,DELETE /builds/{id}/groups/{group}`, `POST /builds/{id}/beta-review` |
| Purchases | `GET /apps/{app}/purchases`, `GET,PATCH /purchases/{kind}/{id}`, `POST /purchases/{kind}/{id}/localizations`, `PATCH,DELETE /purchases/{kind}/{id}/localizations/{loc}` |
| Analytics | `GET /apps/{app}/sales?vendor=&from=&to=` (daily Sales and Trends reports, up to 92 days) |
| Team | `GET /team`, `POST /team/invitations`, `DELETE /team/invitations/{id}`, `DELETE /team/users/{id}` |

Some things Apple's API doesn't offer, such as Resolution Center messages and
privacy labels; the web app links to App Store Connect for those.

## Layout

- `asc/`: App Store Connect client (JSON:API documents, pagination, errors),
  the ES256 signer, and the sales report parser.
- `internal/fire/`: one function per screen, combining Apple resources into the
  shapes the web app uses, with validation for every write.
- `internal/server/`: routing, middleware and error mapping.
- `internal/mockapple/`: an in-memory JSON:API server with sample data, used by
  `fire-demo` and the tests.
- `internal/config/`, `internal/webui/`: settings and the embedded web build.

## Test

```sh
go vet ./...
go test ./...
```

The server tests run Fire end to end against `mockapple`.
