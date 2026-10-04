import WebKit

/// Native app chrome must keep a device-width canvas across document changes.
/// The website/PWA retains browser zoom; this policy is limited to the app shell.
enum MobileViewport {
    static func configure(_ configuration: WKWebViewConfiguration) {
        configuration.defaultWebpagePreferences.preferredContentMode = .mobile
        configuration.ignoresViewportScaleLimits = false
        configuration.userContentController.addUserScript(WKUserScript(
            source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true
        ))
    }

    static let script = """
    (() => {
      const content = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover';
      let head;
      const update = () => {
        if (!document.head) return;
        if (head !== document.head) {
          head = document.head;
          observer.observe(head, { childList: true, subtree: true, attributes: true, attributeFilter: ['name', 'content'] });
        }
        let metas = [...head.querySelectorAll('meta[name="viewport"]')];
        if (!metas.length) {
          const meta = document.createElement('meta');
          meta.name = 'viewport';
          head.appendChild(meta);
          metas = [meta];
        }
        // Next may replace its viewport during navigation. Update, don't duplicate it.
        for (const meta of metas) {
          if (meta.content !== content) meta.content = content;
        }
      };
      const observer = new MutationObserver(update);
      observer.observe(document, { childList: true });
      if (document.documentElement) observer.observe(document.documentElement, { childList: true });
      document.addEventListener('DOMContentLoaded', update, { once: true });
      window.addEventListener('pageshow', update);
      update();
    })();
    """
}
