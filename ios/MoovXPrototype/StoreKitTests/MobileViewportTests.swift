import XCTest
import WebKit
@testable import MoovXPrototype

@MainActor
final class MobileViewportTests: XCTestCase {
    func testDeviceWidthAcrossAnalyticsHomeKeyboardAndNavigation() async throws {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        MobileViewport.configure(configuration)
        XCTAssertEqual(configuration.defaultWebpagePreferences.preferredContentMode, .mobile)
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 393, height: 740), configuration: configuration)
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 440, height: 956))
        let controller = UIViewController()
        window.rootViewController = controller
        controller.view.addSubview(web)
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        web.loadHTMLString("""
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
        *{box-sizing:border-box}body{margin:0}#shell{height:100dvh;overflow:hidden;display:flex}
        #main{flex:1;min-width:0;min-height:0;contain:size layout paint;overflow:clip;display:flex}
        #rail{display:flex;flex-shrink:0;width:500vw;height:100%}
        .tab{width:100vw;flex-shrink:0;overflow:auto}input{font-size:17px}
        </style><div id="shell"><main id="main"><div id="rail">
        <section class="tab" id="home">Home<input value="30"></section>
        <section class="tab">Training</section><section class="tab">Nutrition</section>
        <section class="tab" id="analytics"><svg width="1800" height="300"></svg></section>
        <section class="tab">Compte</section></div></main></div>
        """, baseURL: URL(string: "https://app.moovx.ch"))
        for _ in 0..<100 {
            if (try? await web.evaluateJavaScript("document.readyState === 'complete' && !!document.querySelector('#rail')")) as? Bool == true { break }
            try await Task.sleep(for: .milliseconds(50))
        }
        for width in [320, 375, 390, 393, 402, 414, 430, 440] {
            web.frame = CGRect(x: 0, y: 0, width: width, height: 740)
            for script in [
                "document.querySelector('#rail').style.transform='translateX(-300vw)'",
                "document.querySelector('#rail').style.transform='translateX(0)'",
                "document.querySelector('input').focus()",
                "document.querySelector('input').blur()",
                // Simulate Next replacing the viewport during navigation.
                "document.querySelector('meta[name=viewport]').outerHTML='<meta name=viewport content=\"width=980,initial-scale=0.25\">'"
            ] {
                _ = try await web.evaluateJavaScript(script)
                try await Task.sleep(for: .milliseconds(150))
                let dimensions = try await web.evaluateJavaScript("[innerWidth,document.documentElement.scrollWidth,visualViewport.scale,document.querySelector('#home').getBoundingClientRect().width]") as! [NSNumber]
                XCTAssertEqual(dimensions[0].doubleValue, Double(width), accuracy: 1, "viewport at \(width): \(script)")
                XCTAssertLessThanOrEqual(dimensions[1].doubleValue, Double(width) + 1)
                XCTAssertEqual(dimensions[2].doubleValue, 1, accuracy: 0.01)
                XCTAssertEqual(dimensions[3].doubleValue, Double(width), accuracy: 1)
            }
        }
    }
}
