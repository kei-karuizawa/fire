# Fire

Fire is a self-hostable App Store Connect console. Run one Go binary, open its
address in a browser, and manage your apps: metadata and localizations, App
Review submissions, TestFlight builds and testers, in-app purchases and
subscriptions, sales analytics, and team members.

The web app is available in English, Simplified Chinese, Traditional Chinese
and Japanese.

## Try it without an Apple account

Requires Go 1.22+ and Node 22+.

```sh
make web-install
make demo
```

Open http://127.0.0.1:8080. The demo runs Fire against a simulated App Store
Connect API filled with sample data, so every page works and every change is
safe. To try adding a key in the browser instead of using the demo's server key,
run `cd service && go run ./cmd/fire-demo -browser-key`; any P-256 `.p8` file works.

## Run it for real

```sh
make web-install
make build
./service/bin/fire
```

Open http://127.0.0.1:8080 and add an App Store Connect API key (Users and
Access, then Integrations, in App Store Connect). The key is imported into the
browser as a non-extractable WebCrypto key and stored in IndexedDB. The browser
signs a short-lived token for each request; the private key is never sent to
the server.

Browsers only allow this signing in a secure context, so serve Fire over HTTPS
(or use it on localhost). To put Fire on another machine, bind it with
`FIRE_ADDR=0.0.0.0:8080` behind a TLS reverse proxy.

You can instead give the server its own key, which is handy for a single-user
install or for `curl`. See [service/README.md](service/README.md) and
[service/.env.example](service/.env.example).

## Repository layout

```text
fire/
├── web/                      # React + TypeScript web app (Vite)
├── service/                  # Go backend; serves the API and the built web app
│   ├── cmd/fire/             # The server
│   ├── cmd/fire-demo/        # The server plus a simulated App Store Connect API
│   ├── asc/                  # App Store Connect client, JWT signer, sales reports
│   ├── internal/fire/        # What each page needs, built from Apple's API
│   ├── internal/server/      # HTTP routes, security headers, origin checks
│   ├── internal/webui/       # Embeds the web build (web/ builds into dist/)
│   ├── internal/mockapple/   # The simulated API used by the demo and tests
│   └── api/openapi.yaml      # The HTTP contract
├── design/                   # Design prototypes the web app follows
├── app/, cli/                # Scope notes for future native and CLI clients
└── Makefile
```

## Develop

```sh
make demo       # backend + simulated data on :8080
make web-dev    # web app with hot reload on :5173, proxied to :8080
make check      # go vet, go test, TypeScript
```

`make build` runs the web build first because the Go binary embeds it.
