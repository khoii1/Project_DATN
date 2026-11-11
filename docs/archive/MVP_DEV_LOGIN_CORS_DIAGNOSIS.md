# DEV UI-only login CORS diagnosis

Review04/11/2026 UTC+7, current user-reported login failure in run `ui-only-historical-1793797684089-967ac6b5fb94`.

## Confirmed root cause

Account/password are not the demonstrated blocker. One direct POST to loopback55001/api/auth/login returned HTTP200, success=true, message Đăng nhập thành công, tokenReturned=true. Token/user response was kept in transient process memory and not emitted to tools/report. This request uses existing DEV credentials and reviewed memory audit, not production audit persistence. No DeviceCommand request.

Browser-equivalent OPTIONS preflight with Origin http://127.0.0.1:55173, requested methodPOST and requested headercontent-type returned HTTP403/body UI_ONLY_READ_ONLY. Served frontend api.ts points to correct http://127.0.0.1:55001/api; not localhost5000 fallback.

Source cause: `scripts/mvp-ui-only-api.cjs` installs outer shell middleware using routeAllowed before forwarding to actual app. routeAllowed permits GET/HEAD and exact POST login/logout but denies all OPTIONS. app.ts CORS middleware never receives the browser preflight. Axios JSON cross-origin login requires preflight, so browser reports a generic network/login failure despite valid credentials and working direct POST.

No need to reset password again or loosen database/MQTT controls.

## Minimal proposed change — NOT APPLIED

Handle CORS preflight at the dedicated UI-only shell with an exact origin/method/path/header policy; return preflight headers/204 without forwarding OPTIONS to application routes or database. Keep all current business-route and mutation restrictions. Permit only exact frontend origin55173, requested GET/HEAD for existing allowed read routes or POST for exact auth login/logout, expected content-type/authorization headers; reject forbidden methods/routes/origins. No wildcard origin, no POST DeviceCommand, no production policy changes. This is a source proposal, not a new permissive runtime bypass.

Synthetic tests should cover login/me preflight success, forbidden origin, requested method, headers and command/mutation routes, plus unchanged READ ONLY/deny behavior. Validate actual OPTIONS204 and then browser login in a separately authorized startup after source review/testing and deliberate manifest revision. Do not edit active pinned source or silently update hashes during this running session.

## Current scope and next step

AM execution contract section2 says “Không sửa source trong phiên AM”; section17 forbids fixing code/manifest while executing to overcome a gate. Current reopen inherited the same constrained UI-only contract. Therefore diagnosis only, no source/manifest changes or hot patch. Existing supervisor will perform bounded post-check and cleanup. No retry session from the same approval.

Required next authorized work is narrowly **offline DEV-only CORS fix + tests + reviewed source-manifest revision**, followed by a new manual UI session. No MQTT, production migration, credentials reset or hardware changes needed. Actual browser login acceptance remains BLOCKED until CORS fixed and browser verified.
