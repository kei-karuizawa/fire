# Fire macOS

Reserved for the macOS client. No application or UI is implemented yet.

This client will own macOS UI and local configuration. Its `.p8` is stored in the macOS Keychain. The app signs on the device and sends `X-App-Store-Token`.
It can call a local or self-hosted backend using `service/api/openapi.yaml`.
If a Go runtime is used, it can also reuse `service/app-store-connect`.
