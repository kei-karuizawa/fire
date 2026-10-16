# Fire web

Reserved for the browser application. No UI or framework is implemented yet.

This application will use the backend contract at `service/api/openapi.yaml`.
Keeping `.p8` files on the user's computer requires browser-side signing or a
local companion service; neither browser workflow is implemented yet.
Browser origins must be allowed by the backend's `FIRE_ALLOWED_ORIGIN` setting.
