# Fire web

The browser UI is served by the backend. From the repository root:

```sh
make run
```

Open http://127.0.0.1:8080. The `.p8` can be kept in either place:

- **On this server.** Set `ASC_PRIVATE_KEY_PATH`, `ASC_KEY_ID`, and `ASC_ISSUER_ID` before starting. The page asks the server to sign. The file is not uploaded.
- **In this browser.** Drop the `.p8` on the page. It is saved in this browser and signs there. The server receives only a five-minute token.

A team key also needs its Key ID and Issuer ID. Those values are not inside the file. The Key ID is the id in `AuthKey_XXXXXXXXXX.p8`.

An iOS client keeps its own `.p8` in the Keychain and signs the same way. See `app/ios/README.md`.
