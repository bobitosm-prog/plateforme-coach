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
