/* ==========================================================================
   pbb-hide-host-badge.js
   --------------------------------------------------------------------------
   WHY THIS FILE EXISTS

   The Bolt hosting layer injects a "Made in Bolt" link into the bottom-right
   corner of every page served on a Free plan. It is NOT in this repository:
   a full-tree grep finds no reference to bolt.new, and the HTML served by
   pbb.bolt.host contains no badge markup. The badge is added at the edge or
   at runtime, after our document is parsed.

   Section 9 of pbb-tokens.css already hides `a[href^="https://bolt.new"]`.
   That rule is enough when the badge lands in the normal document. It is NOT
   enough if the badge is rendered inside a shadow root, because page CSS does
   not cross a shadow boundary. This script closes that gap and nothing else.

   WHAT IT MATCHES

   Anchors whose href points at bolt.new, plus their positioned wrapper if the
   anchor is the wrapper's only child. Nothing in this repository links to
   bolt.new, so this cannot match our own UI. Everything else on the page —
   cookie banner, accessibility toolbar, Messenger button, join popup, ACAPS
   and INFORM data credits — is untouched by design. An earlier revision of
   src/index.css tried to do this by shape (`[style*="position: fixed"]`) and
   hid all of those; see the note in that file.

   WHAT IT COSTS

   One pass on DOMContentLoaded, one on load, and a MutationObserver that
   stops after BUDGET_MS. A badge injected by the host arrives within the
   first seconds; an observer left running for the life of the page would
   charge every visitor on a slow phone for something that already happened.

   TERMS OF SERVICE

   Whether the badge may be removed is a question for Bolt's terms, not for
   this file. Bolt documents that upgrading to any Pro plan removes it from
   previews and published projects — that is the supported route, and this
   script is a fallback for the case where the CSS rule cannot reach the
   element. Delete this file if the plan is upgraded; it will have no work
   left to do.
   ========================================================================== */

(function () {
  'use strict';

  var BUDGET_MS = 20000;   // stop observing after this; injection is early
  var THROTTLE_MS = 250;   // coalesce mutation bursts

  function isBoltLink(a) {
    // getAttribute, not .href: .href resolves relative URLs against the page,
    // so a local link could not be mistaken for an external one either way,
    // but reading the literal attribute keeps the intent obvious.
    var h = a.getAttribute('href');
    return !!h && /^https?:\/\/(www\.)?bolt\.new(\/|$|\?|#)/i.test(h);
  }

  function hide(el) {
    if (!el || el.__pbbHidden) return;
    el.__pbbHidden = true;
    el.style.setProperty('display', 'none', 'important');
  }

  function sweepRoot(root) {
    var anchors;
    try {
      anchors = root.querySelectorAll('a[href]');
    } catch (e) {
      return;
    }
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      if (!isBoltLink(a)) continue;
      hide(a);
      // The badge is usually an anchor inside a positioned wrapper. Hide the
      // wrapper only when the anchor is its sole element child, so we never
      // take down a container that also holds something of ours.
      var p = a.parentElement;
      if (p && p.children.length === 1 && p !== document.body &&
          p !== document.documentElement) {
        hide(p);
      }
    }
    // Recurse into open shadow roots. A closed shadow root is unreachable
    // from script by design; if the badge lives in one, nothing on this page
    // can hide it and the plan upgrade is the only route.
    var all;
    try {
      all = root.querySelectorAll('*');
    } catch (e) {
      return;
    }
    for (var j = 0; j < all.length; j++) {
      if (all[j].shadowRoot) sweepRoot(all[j].shadowRoot);
    }
  }

  function sweep() {
    sweepRoot(document);
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; sweep(); }, THROTTLE_MS);
  }

  function start() {
    sweep();
    if (typeof MutationObserver !== 'function') return;
    var mo = new MutationObserver(schedule);
    try {
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {
      return;
    }
    setTimeout(function () { mo.disconnect(); sweep(); }, BUDGET_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  window.addEventListener('load', sweep);
})();
