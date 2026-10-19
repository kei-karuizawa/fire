# Fire iOS

Reserved for the iOS client. No application or UI is implemented yet.

The `.p8` for this client is stored in the iOS Keychain. The app signs a
five-minute Apple JWT on the device and sends it as `X-App-Store-Token`.
The private key is not uploaded to the server.

The HTTP contract is `service/api/openapi.yaml`. A server that already has
its own `.p8` can sign instead, when that header is absent.
