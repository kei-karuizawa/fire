# Fire web app

React 19, TypeScript and Vite, following the prototypes in `../design`.

```sh
npm ci
npm run dev     # http://127.0.0.1:5173, proxies /api to FIRE_BACKEND (default http://127.0.0.1:8080)
npm run build   # type-checks, then writes the build into ../service/internal/webui/dist
```

Run a backend for the dev server with `make demo` from the repository root.

## Structure

- `src/pages/`: one file per screen (Dashboard, Metadata, Review, Builds,
  Purchases, Analytics, Team).
- `src/components/`: the sidebar, the add-key dialog and shared UI pieces.
- `src/lib/`: the API client, browser JWT signing (`jwt.ts`), key profiles in
  IndexedDB (`profiles.ts`), the router and data loading.
- `src/i18n/`: translations. `en.ts` is the source; `zh-Hans.ts`, `zh-Hant.ts`
  and `ja.ts` must translate every key, or the TypeScript build fails. Values
  from App Store Connect (states, roles, categories) are translated through
  `enumLabel(group, value)` and fall back to a readable form for unknown values.
  Dates, numbers, currencies, language and region names come from `Intl`.
- `src/styles/fire.css` is the prototype's stylesheet; `app.css` adds the
  pieces the prototype doesn't cover.

## Keys in the browser

Adding a key reads the `.p8` file, imports it with WebCrypto as a
non-extractable P-256 key and stores the `CryptoKey` in IndexedDB. Each request
carries a 10-minute token signed in the browser. Signing needs a secure context
(HTTPS or localhost). Several keys can be added and switched from the sidebar;
each remembers its last app and its Sales and Trends vendor number.
