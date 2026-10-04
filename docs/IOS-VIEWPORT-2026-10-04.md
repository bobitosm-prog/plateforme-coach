# iOS viewport — 4 October 2026

Report: web content becomes a narrow, scaled-down strip while native chrome stays
normal, after Analytics → Home on physical iPhone, TestFlight 0.1.0 (8).
The precise trigger is not reproduced; do not claim a proven root cause.

Changes:
- Contain the five-screen tab rail (size/layout/paint) and remove automatic flex
  minimum dimensions. Offscreen content must not resize the root canvas.
- Next viewport minimum-scale 1; no browser maximum-scale or user-scalable ban.
- Native WKWebView explicitly uses mobile content and installs a document-start
  viewport policy. Metadata replacement on navigation retains device width and
  scale 1. Native maximum-scale 1 is intentional for the fixed app canvas;
  browser/PWA zoom-in remains available.
- The push-only service worker has no fetch handler or page cache and is unchanged.

Validation:
- TypeScript and 66 web navigation/Home/Analytics/workout tests pass.
- 7 root document/viewport tests pass; browser zoom-in remains permitted.
- Actual WKWebView XCTest passes on iPhone 18 Pro simulator (iOS 27), with view
  widths 320, 375, 390, 393, 402, 414, 430 and 440 points. An oversized analytics
  SVG, switching to Home, focus/blur and viewport replacement retain width/scale.
  This is a synthetic fixture, not the user's authenticated iOS session; focus
  calls are not proof of a physical-keyboard or keyboard-presentation test.
- Real authenticated browser at 393 points: Analytics reports document and tab
  widths 393, visual scale 1. Chromium did not reproduce the iPhone bug.
- Release archive 0.1.0 (9) signed with the existing team and provisioning, with
  no changes to credentials, account data, APIs or permissions.

Remaining acceptance: install build 9 on the physical iPhone, navigate repeatedly
Analytics → Home, then exercise entry, dialogs, app background/foreground and
keyboard dismissal. Confirm normal scale and retained workout entries. No claim
that all physical-device paths are verified.
