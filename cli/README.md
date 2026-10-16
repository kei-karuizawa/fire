# Fire CLI

Reserved for the user-facing command-line application. No CLI commands are
implemented yet. This is separate from `service/cmd/fire`, which starts
the HTTP service.

A future Go CLI can reuse `service/app-store-connect` for local operations or
call the backend described in `service/api/openapi.yaml`. In relay mode it must
sign Apple JWTs on the user's device, keeping the `.p8` file there.
