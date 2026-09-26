import Foundation

let cases: [(String?, Bool)] = [
    ("https://app.moovx.ch/login", true),
    ("https://app.moovx.ch/?tab=nutrition", true),
    ("https://app.moovx.ch:443/", true),
    ("http://app.moovx.ch", false),
    ("https://app.moovx.ch.evil.invalid", false),
    ("https://evil.invalid/app.moovx.ch", false),
    ("https://app.moovx.ch@evil.invalid", false),
    ("https://user:password@app.moovx.ch", false),
    ("https://app.moovx.ch:8443", false),
    ("https://checkout.stripe.com", false),
    ("file:///etc/passwd", false),
    ("javascript:alert(1)", false),
    ("moovx://login", false),
    (nil, false),
]
for (raw, expected) in cases {
    precondition(NavigationPolicy.allows(raw.flatMap(URL.init(string:))) == expected, "Navigation policy mismatch")
}
print("Navigation policy: \(cases.count) checks passed")

let now = Date(timeIntervalSince1970: 1_700_000_000)
let validDeadline = now.addingTimeInterval(20)
precondition(RestTimerMessagePolicy.parse(["action": "schedule", "deadlineMs": validDeadline.timeIntervalSince1970 * 1000], now: now) == .schedule(validDeadline))
precondition(RestTimerMessagePolicy.parse(["action": "cancel"], now: now) == .cancel)
for body: [String: Any] in [
    ["action": "schedule", "deadlineMs": Double.nan],
    ["action": "schedule", "deadlineMs": now.timeIntervalSince1970 * 1000],
    ["action": "schedule", "deadlineMs": now.addingTimeInterval(31 * 60).timeIntervalSince1970 * 1000],
    ["action": "other", "deadlineMs": validDeadline.timeIntervalSince1970 * 1000],
    ["action": "schedule", "deadlineMs": "20"],
] {
    precondition(RestTimerMessagePolicy.parse(body, now: now) == nil, "Invalid rest timer command accepted")
}
print("Rest timer message policy: 7 checks passed")
