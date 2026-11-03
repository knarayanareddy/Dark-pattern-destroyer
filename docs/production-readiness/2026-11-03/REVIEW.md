# Dark-pattern-destroyer review

## Scope and product boundary

Revision `e069b534e296e81fcefad879ec3f61e0bcf1eba4` is an extension/backend prototype. Inspected the complete `README.md`, `backend/requirements.txt`, `backend/main.py` and the untruncated tree. The tree identifies a browser extension with content scripts, options, popup and service worker, plus FastAPI, vision, planning and database modules; extension code, manifest permissions, model behavior and persistence implementation were not inspected. Runtime, installation, tests and browser interaction were **not run**.

## Findings ledger

- **DP-01 — High, confirmed static, high confidence:** [backend/main.py:13-18](https://github.com/knarayanareddy/Dark-pattern-destroyer/blob/e069b534e296e81fcefad879ec3f61e0bcf1eba4/backend/main.py#L13-L18) sets `allow_origins=["*"]`, `allow_methods=["*"]`, and `allow_headers=["*"]`; [backend/main.py:47-50](https://github.com/knarayanareddy/Dark-pattern-destroyer/blob/e069b534e296e81fcefad879ec3f61e0bcf1eba4/backend/main.py#L47-L50) exposes `@app.post("/api/plan-cancel-journey")` with no visible route-level auth dependency in the sampled file. A browser-accessible deployment could allow untrusted pages to invoke it; full deployment and other protections are unverified. Scope origins and require authentication and authorization at the actual deployment boundary.
- **DP-02 — Medium, confirmed static, high confidence:** [backend/main.py:47-53](https://github.com/knarayanareddy/Dark-pattern-destroyer/blob/e069b534e296e81fcefad879ec3f61e0bcf1eba4/backend/main.py#L47-L53) returns `detail=str(e)` on planner exceptions. Error messages may reveal internal or third-party details to callers. Return a generic response with an opaque incident ID and redact internal logs.
- **DP-03 — Medium, confirmed static, high confidence:** [backend/main.py:55-57](https://github.com/knarayanareddy/Dark-pattern-destroyer/blob/e069b534e296e81fcefad879ec3f61e0bcf1eba4/backend/main.py#L55-L57) logs `print(f"Received report: {payload}")`, which emits the full submitted report payload. Depending on submitted data, URLs or other sensitive content may enter logs; actual logged data and retention are unknown. Minimize and redact structured logs.
- **DP-04 — Medium, confirmed static, high confidence:** [backend/requirements.txt:1-8](https://github.com/knarayanareddy/Dark-pattern-destroyer/blob/e069b534e296e81fcefad879ec3f61e0bcf1eba4/backend/requirements.txt#L1-L8) lists bare package names such as `fastapi`, `anthropic`, and `pillow` without version pins. Builds can resolve differently over time; this is not a claim that a specific version is vulnerable. Establish locked, audited dependencies.
- **DP-05 — Medium, confirmed static, high confidence:** [backend/main.py:25-42](https://github.com/knarayanareddy/Dark-pattern-destroyer/blob/e069b534e296e81fcefad879ec3f61e0bcf1eba4/backend/main.py#L25-L42) defines `def setex(self, key, time, value):` but only performs `self._data[key] = value`, while the fallback path sets `redis_client = MemoryCache()`. When Redis is unavailable, entries do not expire in that fallback and the map can grow; whether the application relies on TTL or stores sensitive values requires tracing callers. Implement bounded expiration or fail explicitly.

## Five-discipline assessment

**Correctness:** planner and vision modules were not inspected, so accuracy and action execution are unknown. DP-05 is a concrete semantic discrepancy between fallback and expiring cache. Test both backends and outage behavior.

**Automation/testing:** the complete tree lists `test_site.html` but no sampled automated test source or CI workflow. Do not infer runtime correctness from a manually openable fixture. Define independent API and extension behavior tests before release.

**Operations:** [backend/main.py:34-42](https://github.com/knarayanareddy/Dark-pattern-destroyer/blob/e069b534e296e81fcefad879ec3f61e0bcf1eba4/backend/main.py#L34-L42) pings Redis during initialization and catches exceptions; startup latency, retention and monitoring are unverified. SQLite backup/restore and deployment identity require evidence.

**OWASP/security:** DP-01–04 affect browser origin, errors, data protection and dependency integrity. Authentication on other routes, model prompt injection, extension permissions, host access and any Anthropic secret handling are uninspected. CORS is not an authorization mechanism; assess both direct clients and browsers. No specific exposed credential is asserted.

**UI/UX/accessibility:** tree metadata shows extension paths including `extension/popup/popup.html`, `extension/popup/popup.js`, `extension/content/overlay-ui.js`, `extension/options/options.html`, `extension/options/options.js`, and `extension/styles/overlay.css`, but those bodies were not inspected in this draft. Verify keyboard and screen-reader access and ensure any suggested cancellation action remains understandable and requires consent; no current UI defect is claimed.

## Production blockers and owner questions

Is the backend local-only or hosted? Can extension content or screenshots include sensitive pages, and may they leave the device? Which actions can execute automatically? Owner must decide domain permission scope, provider account, consent, retention and safe cancellation policy before real use. Restore, signing and distribution are unverified.

## Evidence and limitations

Inspected `README.md:1`, `backend/requirements.txt:1-9`, `backend/main.py:1-93`, and tree metadata. No historical CI runs were supplied. Vision, planner, database, and extension bodies including `extension/manifest.json`, `extension/background/service-worker.js`, `extension/content/*.js`, `extension/popup/*`, and `extension/options/*` remain unreviewed beyond tree presence, so permissions, popup/overlay behavior, and host access were not inferred from filenames alone. No runtime, network, dependency audit or accessibility check was performed. See [plan](REMEDIATION_PLAN.md).
