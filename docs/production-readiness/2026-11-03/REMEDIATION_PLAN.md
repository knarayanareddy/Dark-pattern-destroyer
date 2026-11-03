# Dark-pattern-destroyer remediation plan

Future work only; see [REVIEW.md](REVIEW.md). Use synthetic accounts and pages, not actual cancellation flows.

## Dependencies and exits

| Phase | Task | Prerequisites | Exit |
|---|---|---|---|
| Baseline | DP-T1 | Owner selects deployment and test scope | Reproduction and trust map |
| Defects | DP-T2, DP-T3 | DP-T1 | Errors, logs and cache behavior verified |
| Security | DP-T4 | DP-T1 | Authorized API and extension boundary tested |
| Automation and acceptance | DP-T5 | DP-T2–T4 | Independent negative tests and UX observed |
| Release and recovery | DP-T6 | DP-T5, owner approval | Tested release and restore or defer |

### DP-T1 — Map real flows (DP-01–05)

Prerequisite: isolated environment. Observed `backend/main.py` and tree-only extension paths; inspect unsampled callers plus `extension/manifest.json` and relevant extension bodies before making permission or UX claims.
1. Trace page content and screenshots from extension through backend, model provider and storage.
2. Reproduce CORS, planner error and Redis fallback behavior using synthetic data.
3. Identify which actions mutate third-party accounts, and record intended consent and failure states.

Deliverable: source-pinned flow and baseline. Verify each claim against the active path, not a filename or a demo fixture.
- [ ] Entry points and data destinations mapped.
- [ ] Reproductions record exact revision and environment.

### DP-T2 — Contain errors and reports (DP-02, DP-03)

Prerequisite: DP-T1. Observed `backend/main.py`.
1. Define safe public error schema and an internal correlation identifier.
2. Replace raw exception and payload logging with bounded, redacted fields, preserving diagnostic utility without content.
3. Exercise provider and database errors with a synthetic secret canary and inspect response and logs.

Deliverable: safe error/log behavior and regression tests. Verify a deliberately reintroduced raw exception or payload makes the canary test fail.
- [ ] Client receives no provider internals.
- [ ] Canary absent from logs and error responses.

### DP-T3 — Make cache semantics honest (DP-05)

Prerequisite: DP-T1. Observed `backend/main.py`.
1. Inspect every cache caller and document expiry, availability and memory requirements.
2. Implement bounded expiry and eviction or return a clear unavailable result instead of silently changing semantics.
3. Test Redis success, disconnection, expiration and repeated unique keys using a controllable clock.

Deliverable: consistent documented fallback. Verify expired entries disappear and a broken expiry implementation fails the test.
- [ ] TTL behavior verified for both backends.
- [ ] Memory and outage behavior bounded.

### DP-T4 — Secure extension and API boundary (DP-01, DP-04)

Prerequisite: DP-T1. Observed `backend/requirements.txt`, `backend/main.py`, and proposed security tests; extension permission and content-script review remains future work because this draft inspected only tree presence, not the bodies of `extension/manifest.json`, popup, overlay, or content-script files.
1. Define approved extension origins and authenticate/authorize every sensitive operation, including direct non-browser clients.
2. Limit request sizes, model spending and submitted content; assess indirect prompt injection and prevent model text from autonomously authorizing actions.
3. Lock and audit dependencies, then inspect actual manifest/content-script bodies before approving extension permissions, and verify release artifacts do not contain secrets.

Deliverable: boundary design, locked dependencies and tests. Verify hostile origins, missing credentials and oversized payloads are rejected and a deliberately disabled authorization check breaks a negative test.
- [ ] Extension permissions and external data disclosure approved.
- [ ] All effectful endpoints protected independent of CORS.

### DP-T5 — Test cancellation UX (preventive)

Prerequisite: DP-T2–T4. Observed `test_site.html` and tree-only extension popup/overlay paths; popup, overlay, and content-script bodies were not inspected in this draft and must be read before UX/accessibility findings are narrowed.
1. Define synthetic dark-pattern examples, false positives and explicit human consent requirements.
2. Test overlay and popup keyboard navigation, screen-reader labels, failures and rollback of proposed actions.
3. Independently run tests with intentionally broken detection and consent enforcement to prove assertions observe behavior.

Deliverable: behavioral and accessibility evidence. Verify the extension does not take an irreversible action on untrusted page or model instructions.
- [ ] Consent and false-positive handling observed.
- [ ] Negative tests fail when controls are bypassed.

### DP-T6 — Release and recover (preventive)

Prerequisite: DP-T5 and explicit owner approval. Proposed release and recovery runbook; observed SQLite initialization in `backend/main.py`.
1. Define signing, provider credential custody, deployment target and privacy/retention policy.
2. Stage the extension and backend with synthetic data and confirm active revision and configuration.
3. Restore a synthetic database backup and roll back a staged release while verifying migration compatibility.

Deliverable: observed deployment and recovery or documented defer. Verify restored records and installed extension identity independently.
- [ ] Owner approves permissions and user-data handling.
- [ ] Restore and rollback observed before production use.

## Acceptance and rollback

- [ ] No raw user report or internal exception reaches public logs or responses.
- [ ] Authorization, TTL and dependency integrity tests are independently exercised.
- [ ] Consent and accessibility are observed; actual external actions remain disabled until approved.

Changing host exposure, model vendor, extension permissions, retention or external actions requires owner approval. Preserve a known-good signed package and backup, suspend automation on incident and verify restore before resuming; external account changes may be irreversible.
