#!/usr/bin/env python3
"""
WebKit verification for the RE:REASON site, using WebKitGTK directly.

Why this exists
---------------
Chromium and Firefox were covered by a CDP script, but WebKit had no automation
path: WebKitWebDriver is not shipped by webkit2gtk-4.1 on this distribution,
MiniBrowser has no headless mode, and Xvfb is not installed. What *is* installed
is the WebKit2-4.1 GObject introspection typelib, so this drives a
WebKit2.WebView inside a Gtk.OffscreenWindow: a real WebKit engine, a real
layout and a real JavaScript context, with nothing drawn on the user's desktop.

Requirements, all already present on this machine:
    python3-gi (PyGObject)  +  webkit2gtk-4.1  +  gtk3
If WebKitWebDriver becomes available instead, Playwright or Selenium would be a
better long-term home for this; the checks below are the ones that matter.

Usage
-----
    npx astro preview --port 4322 --host 127.0.0.1 &
    python3 scripts/webkit-check.py [--port 4322] [--json out.json]

Exit status is 0 only if every assertion passes.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

# Must be set before WebKit initialises. These force software rendering paths
# that work without a compositor, which is what an offscreen window needs.
os.environ.setdefault("WEBKIT_DISABLE_COMPOSITING_MODE", "1")
os.environ.setdefault("WEBKIT_DISABLE_DMABUF_RENDERER", "1")

import gi  # noqa: E402

gi.require_version("Gtk", "3.0")
gi.require_version("WebKit2", "4.1")
from gi.repository import GLib, Gtk, WebKit2  # noqa: E402

ROUTES = [
    ("home", "/"),
    ("research-index", "/research"),
    ("experiment", "/research/experiments/experiment-g-add-commit-gap"),
    ("architecture", "/research/architectures/nonlinear-candidate-mgu"),
    ("phase", "/research/phases/phase-1"),
    ("experiment-with-figures", "/research/experiments/experiment-p-sequence-error-budget"),
]

VIEWPORTS = [("desktop", 1440, 900), ("mobile", 390, 844), ("narrow", 360, 800)]

# Records uncaught errors and failed resource loads, from before page scripts run.
ERROR_HOOK = """
window.__errors = [];
window.__failed = [];
window.addEventListener('error', function (e) {
  if (e && e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT')) {
    window.__failed.push((e.target.tagName + ' ' + (e.target.src || e.target.href || '')).slice(0, 120));
  } else {
    window.__errors.push(String((e && e.message) || e));
  }
}, true);
window.addEventListener('unhandledrejection', function (e) { window.__errors.push('unhandled: ' + String(e.reason)); });
"""

# Forces the reduced-motion branch of the JS side. The CSS media query itself is
# evaluated by the engine and cannot be emulated through this API; WebKitGTK
# exposes no equivalent of Chromium's Emulation.setEmulatedMedia.
REDUCED_MOTION_HOOK = """
(function () {
  var real = window.matchMedia.bind(window);
  window.matchMedia = function (q) {
    if (String(q).indexOf('prefers-reduced-motion') !== -1) {
      return { matches: true, media: q, addEventListener: function () {}, removeEventListener: function () {},
               addListener: function () {}, removeListener: function () {} };
    }
    return real(q);
  };
})();
"""

SNAPSHOT = r"""
JSON.stringify((function () {
  var vw = document.documentElement.clientWidth;
  var overflowing = [];
  document.querySelectorAll('body *').forEach(function (el) {
    var b = el.getBoundingClientRect();
    if (b.width > 0 && (b.right > vw + 1 || b.left < -1)) {
      overflowing.push(el.tagName.toLowerCase() + '.' + String(el.className || '').slice(0, 30));
    }
  });
  var imgs = Array.prototype.slice.call(document.querySelectorAll('img'));
  var anchors = Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]'))
    .map(function (a) { return a.getAttribute('href'); })
    .filter(function (h) { return h !== '#' && !document.querySelector(h); });
  var cells = Array.prototype.slice.call(document.querySelectorAll('.lattice-cell--move'));
  var h1 = document.querySelector('h1');
  var label = document.querySelector('.label');
  var h2 = document.querySelector('h2');
  function fontOf(el) { return el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '') : null; }

  // document.fonts is a FontFaceSet, not an array: filter.call() on it returns
  // nothing in WebKit, which silently reported zero loaded faces.
  var loadedFaces = [];
  if (document.fonts && document.fonts.forEach) {
    document.fonts.forEach(function (f) { if (f.status === 'loaded') loadedFaces.push(f.family); });
  }
  loadedFaces = Array.from(new Set(loadedFaces));

  // Whether the symbol subset actually loaded and was used.
  //
  // An advance-width comparison against a non-existent family was tried first
  // and is unreliable for this glyph: at 80px WebKit's fallback face for U+2299
  // advances within 0.14px of Noto Sans Math's, which any sane threshold swamps
  // — a false negative. FontFaceSet status is direct evidence the face was
  // fetched and applied, and RE Symbols is only ever consulted for glyphs the
  // earlier families in the stack cannot render.
  var symbolLoaded = loadedFaces.indexOf('RE Symbols') !== -1;
  var widthProbe = null;
  if (document.querySelector('.formula')) {
    function advance(family, ch) {
      var s = document.createElement('span');
      s.style.cssText = 'position:absolute;visibility:hidden;font-size:80px;white-space:pre;font-family:' + family;
      s.textContent = ch;
      document.body.appendChild(s);
      var w = s.getBoundingClientRect().width;
      s.parentNode.removeChild(s);
      return w;
    }
    widthProbe = {
      fallback: advance('__nonexistent_family__', '\u2299'),
      ours: advance("'JetBrains Mono','RE Symbols'", '\u2299'),
    };
  }

  return {
    title: document.title,
    h1Count: document.querySelectorAll('h1').length,
    h1Text: h1 ? h1.textContent.trim().slice(0, 48) : null,
    overflowing: Array.from(new Set(overflowing)).slice(0, 5),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: vw,
    images: imgs.length,
    brokenImages: imgs.filter(function (i) { return !i.complete || i.naturalWidth === 0; })
      .map(function (i) { return i.getAttribute('src'); }),
    brokenAnchors: Array.from(new Set(anchors)).slice(0, 6),
    contentsLinks: document.querySelectorAll('nav[aria-label="On this page"] a').length,
    figures: document.querySelectorAll('figure').length,
    // Anime.js / CSS handover
    latticeTotal: cells.length,
    latticeVisible: cells.filter(function (el) { return parseFloat(getComputedStyle(el).opacity) > 0.95; }).length,
    latticeReady: document.querySelector('[data-lattice]')
      ? document.querySelector('[data-lattice]').getAttribute('data-ready') : null,
    latticeAccentFill: document.querySelector('.lattice-cell--final')
      ? getComputedStyle(document.querySelector('.lattice-cell--final')).fill : null,
    // SVG geometry transforms — the single highest-risk WebKit case
    transformBox: cells[0] ? getComputedStyle(cells[0]).transformBox : null,
    transformOrigin: cells[0] ? getComputedStyle(cells[0]).transformOrigin : null,
    cellTransform: cells[0] ? getComputedStyle(cells[0]).transform : null,
    markersLit: Array.prototype.slice.call(document.querySelectorAll('.lattice-marker'))
      .filter(function (m) { return parseFloat(getComputedStyle(m).opacity) > 0.5; }).length,
    // Fonts and notation
    fonts: {
      h1: fontOf(h1), body: fontOf(document.body), label: fontOf(label),
      loaded: loadedFaces,
    },
    symbolFontLoaded: symbolLoaded,
    symbolWidthProbe: widthProbe,
    formulaText: document.querySelector('.formula')
      ? document.querySelector('.formula').textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : null,
    hasSubscriptMarkup: document.querySelectorAll('.formula sub').length,
    formulaWrapsInsideBox: (function () {
      var f = document.querySelector('.formula');
      return f ? f.scrollWidth <= f.clientWidth + 1 : null;
    })(),
    // Type registers
    sizes: {
      h1: h1 ? getComputedStyle(h1).fontSize : null,
      h2: h2 ? getComputedStyle(h2).fontSize : null,
      label: label ? getComputedStyle(label).fontSize : null,
    },
    animFlag: document.documentElement.getAttribute('data-anim'),
    jsErrors: window.__errors || [],
    failedResources: window.__failed || [],
  };
})())
"""


def log(msg):
    print(f"    {msg}", file=sys.stderr, flush=True)


class Session:
    """One offscreen WebKit view, reused across scenarios by resizing."""

    def __init__(self, width, height, javascript=True, reduced_motion=False):
        self.win = Gtk.OffscreenWindow()
        self.view = WebKit2.WebView()
        settings = self.view.get_settings()
        settings.set_enable_javascript(javascript)
        self.view.set_size_request(width, height)
        self.win.add(self.view)
        self.win.set_default_size(width, height)
        # show_all() allocates the widget tree. Gtk.OffscreenWindow renders to an
        # offscreen surface, so nothing is displayed.
        self.win.show_all()

        manager = self.view.get_user_content_manager()
        manager.add_script(WebKit2.UserScript.new(
            ERROR_HOOK, WebKit2.UserContentInjectedFrames.TOP_FRAME,
            WebKit2.UserScriptInjectionTime.START, None, None))
        if reduced_motion:
            manager.add_script(WebKit2.UserScript.new(
                REDUCED_MOTION_HOOK, WebKit2.UserContentInjectedFrames.TOP_FRAME,
                WebKit2.UserScriptInjectionTime.START, None, None))

        self._loop = GLib.MainLoop()
        self._loaded = False
        self.view.connect("load-changed", self._on_load)

    def _on_load(self, _view, event):
        if event == WebKit2.LoadEvent.FINISHED:
            self._loaded = True
            self._loop.quit()

    def _run_loop(self, timeout_ms):
        """
        Run the GTK main loop with a timeout that is always cleaned up.

        The timeout has to be removed when the loop exits for some other reason
        first: a source left pending fires during a *later* loop run and aborts
        it immediately, which shows up as a spurious "timeout" on an unrelated
        evaluation.
        """
        fired = {"done": False}

        def on_timeout():
            fired["done"] = True
            self._loop.quit()
            return False

        source = GLib.timeout_add(timeout_ms, on_timeout)
        try:
            self._loop.run()
        finally:
            if not fired["done"]:
                GLib.source_remove(source)
        return fired["done"]

    def _pump(self, ms):
        """Run the GTK loop for a fixed time so timers and loads progress."""
        self._run_loop(ms)

    def load(self, url, timeout_ms=20000):
        self._loaded = False
        self.view.load_uri(url)
        timed_out = self._run_loop(timeout_ms)
        return self._loaded and not timed_out

    def js(self, script, timeout_ms=15000):
        """Evaluate synchronously; returns the JSCValue as text."""
        box = {}

        def done(view, result, _data=None):
            try:
                value = view.evaluate_javascript_finish(result)
                # 2.52 returns a JSCValue; older bindings return JavascriptResult.
                box["value"] = (value.get_js_value() if hasattr(value, "get_js_value") else value).to_string()
            except Exception as exc:  # noqa: BLE001
                box["error"] = repr(exc)
            self._loop.quit()
            return False

        self.view.evaluate_javascript(script, -1, None, None, None, done)
        if self._run_loop(timeout_ms) and "value" not in box and "error" not in box:
            box["error"] = "timeout"
        return box

    def enable_javascript_after_load(self):
        """
        Turn JavaScript back on *after* the document has parsed.

        Scripts already skipped at parse time are not re-run, so the DOM still
        reflects the no-JavaScript render — but evaluate_javascript() needs the
        setting on to read it, and with it off WebKit raises "Cannot execute
        JavaScript in this document".
        """
        self.view.get_settings().set_enable_javascript(True)

    def close(self):
        self.view.destroy()
        self.win.destroy()


def check(session, route, width, mode):
    """Load a route and return the snapshot plus its assertions."""
    url = f"http://127.0.0.1:{PORT}{route}"
    if not session.load(url):
        return {"error": "load did not finish"}

    if mode == "no-js":
        session.enable_javascript_after_load()

    # Let fonts settle and initial styles apply.
    session._pump(1800)

    # Trigger lazy images individually: a single jump to the bottom does not
    # request images in the middle of a long page.
    count = session.js("document.querySelectorAll('img').length")
    try:
        n = int(count.get("value", "0"))
    except (TypeError, ValueError):
        n = 0
    for i in range(n):
        session.js(f"document.querySelectorAll('img')[{i}].scrollIntoView({{block:'center'}})")
        session._pump(600)

    # The state lattice sits below the fold and starts on an IntersectionObserver.
    # Without scrolling to it the timeline never plays and the cells stay
    # pre-hidden, which would look like a WebKit failure and is not one.
    #
    # Scroll to the lattice element itself rather than to its section: at narrow
    # widths the section is taller than the viewport, so the diagram can sit
    # entirely below the fold and the observer would never fire.
    if session.js("!!document.querySelector('[data-lattice]')").get("value") == "true":
        session.js("document.querySelector('[data-lattice]').scrollIntoView({behavior:'instant', block:'center'})")
        session._pump(4000)  # the sequence runs for about 2.6s

    session.js("window.scrollTo(0, 0)")
    session._pump(400)

    raw = session.js(SNAPSHOT)
    if "error" in raw:
        return {"error": raw["error"]}
    data = json.loads(raw["value"])
    data["_mode"] = mode
    data["_route"] = route
    data["_viewport"] = str(width)
    return data


def assert_scenario(label, d, expect_js):
    """Return a list of failure strings for one scenario."""
    fail = []
    if "error" in d:
        return [f"{label}: {d['error']}"]

    if d["h1Count"] != 1:
        fail.append(f"{label}: {d['h1Count']} h1 elements")
    if d["scrollWidth"] > d["clientWidth"] + 1:
        fail.append(f"{label}: horizontal overflow ({d['scrollWidth']} > {d['clientWidth']})")
    if d["overflowing"]:
        fail.append(f"{label}: overflowing elements {d['overflowing']}")
    if d["brokenImages"]:
        fail.append(f"{label}: images failed to load {d['brokenImages']}")
    if d["brokenAnchors"]:
        fail.append(f"{label}: in-page anchors with no target {d['brokenAnchors']}")
    if expect_js and d["jsErrors"]:
        fail.append(f"{label}: JS errors {d['jsErrors']}")
    if d["failedResources"]:
        fail.append(f"{label}: failed resources {d['failedResources']}")

    # Fonts must resolve to the self-hosted faces, not a fallback.
    if expect_js:
        for slot, family in (("h1", "Archivo"), ("body", "Source Serif 4"), ("label", "JetBrains Mono")):
            if d["fonts"].get(slot) != family:
                fail.append(f"{label}: {slot} resolved to {d['fonts'].get(slot)!r}, expected {family!r}")
        if d["formulaText"] and "\u2299" in d["formulaText"] and not d["symbolFontLoaded"]:
            fail.append(f"{label}: formula sets the Hadamard operator but the symbol subset never loaded")
        if d["formulaWrapsInsideBox"] is False:
            fail.append(f"{label}: formula overflows its box instead of wrapping")

    # The lattice must reach its finished state, not be left hidden.
    if d["latticeTotal"]:
        if d["latticeVisible"] != d["latticeTotal"]:
            fail.append(
                f"{label}: {d['latticeVisible']}/{d['latticeTotal']} lattice cells visible "
                f"(data-ready={d['latticeReady']})"
            )
        # Under reduced motion the timeline is never constructed, so data-ready
        # is legitimately absent and the accent comes from the CSS rule keyed on
        # the absence of data-anim instead.
        if d["_mode"] == "normal" and d["latticeReady"] != "true":
            fail.append(f"{label}: lattice never reported data-ready")
    return fail


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4322)
    parser.add_argument("--json", default=None)
    args = parser.parse_args()

    global PORT
    PORT = args.port

    results = {}
    failures = []
    total = 0

    for mode in ("normal", "reduced-motion", "no-js"):
        for vlabel, vw, vh in VIEWPORTS:
            # A fresh view per viewport: size_request is fixed at construction.
            session = Session(
                vw, vh,
                javascript=(mode != "no-js"),
                reduced_motion=(mode == "reduced-motion"),
            )
            for rlabel, route in ROUTES:
                total += 1
                label = f"{mode}/{vlabel}/{rlabel}"
                log(f"checking {label}")
                d = check(session, route, vw, mode)
                results[label] = d
                failures += assert_scenario(label, d, expect_js=(mode != "no-js"))
            session.close()

    print(f"\n{'=' * 72}")
    print(f"WebKit scenarios run: {total}")
    if failures:
        print(f"FAILURES ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
    else:
        print("All WebKit assertions passed.")

    # A compact summary of the compatibility cases the brief calls out.
    key = "normal/desktop/home"
    if key in results and "error" not in results[key]:
        d = results[key]
        print("\nHomepage (normal/desktop) specifics:")
        print(f"  lattice cells visible : {d['latticeVisible']}/{d['latticeTotal']}  ready={d['latticeReady']}")
        print(f"  accent fill           : {d['latticeAccentFill']}")
        print(f"  SVG transform-box     : {d['transformBox']}  origin={d['transformOrigin']}")
        print(f"  cell transform        : {d['cellTransform']}")
        print(f"  markers lit           : {d['markersLit']}")
        print(f"  symbol subset loaded  : {d['symbolFontLoaded']}  (width probe {d['symbolWidthProbe']})")
        print(f"  fonts (h1/body/label) : {d['fonts']['h1']} / {d['fonts']['body']} / {d['fonts']['label']}")

    for k, v in results.items():
        if k.startswith("normal/desktop/") and "error" not in v and v.get("formulaText"):
            print(f"  formula ({k.split('/')[-1]}): {v['formulaText']!r} subs={v['hasSubscriptMarkup']}")
        if k.startswith("normal/desktop/") and "error" not in v and v.get("sizes", {}).get("h2"):
            print(f"  heading register ({k.split('/')[-1]}): h1={v['sizes']['h1']} h2={v['sizes']['h2']} label={v['sizes']['label']}")

    if args.json:
        with open(args.json, "w") as fh:
            json.dump(results, fh, indent=1)
        print(f"\nfull results written to {args.json}")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
