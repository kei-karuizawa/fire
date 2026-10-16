# Fire iOS

Reserved for the iOS client. No application or UI is implemented yet.

This client will own iOS UI, local configuration and platform-specific secure
key storage. It can call the backend described in `service/api/openapi.yaml`.
To keep `.p8` keys on the device with a remote backend, it must implement local
Apple JWT signing.
