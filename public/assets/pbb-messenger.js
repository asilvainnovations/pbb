/* ==========================================================================
   PBB — Facebook Messenger integration
   --------------------------------------------------------------------------
   Adds a floating "Message us" button and wires every [data-messenger] link
   to the Page's m.me deep link, carrying a `ref` payload so the Messenger
   team can see which page the person came from.

   WHY m.me DEEP LINKS AND NOT THE CUSTOMER CHAT PLUGIN

   Meta's Customer Chat plugin embeds a live chat bubble in the page. It was
   the obvious choice and it is the wrong one here:

     * It loads the full Facebook JS SDK — roughly 200 KB before the widget
       renders. On the connections most of BARMM actually has, that is a
       measurable delay on every page for a feature most visitors never open.
     * It sets third-party cookies and reports the visit to Facebook whether
       or not the visitor interacts with it. That is a real disclosure on a
       political party's site, where the visitor list is sensitive.
     * It frequently fails inside in-app browsers (the Facebook app's own
       webview included), which is where a large share of this traffic
       arrives from.
     * It requires the page to be whitelisted in Page settings, which breaks
       silently and invisibly when the domain changes.

   An m.me link costs zero bytes, works in every browser including the
   in-app ones, opens the real Messenger app when it is installed, and sends
   nothing to Facebook until the person actually taps it. The trade-off is
   that the conversation happens in Messenger rather than in an overlay —
   which, for someone on a phone who already has Messenger open, is closer to
   what they wanted anyway.

   CONFIGURATION
     window.PBB_MESSENGER_ID  — the m.me handle (default below)
   ========================================================================== */

(function (window, document) {
  'use strict';

  var PBB = window.PBB || (window.PBB = {});

  var MESSENGER_ID = window.PBB_MESSENGER_ID || '914129215127738';
  var BASE = 'https://m.me/' + MESSENGER_ID;

  /**
   * Build an m.me URL with a referral payload.
   * The `ref` is surfaced to the Page inbox on the first message, so the team
   * can tell "came from the volunteer page" apart from "came from the FAQ"
   * without asking. Meta caps ref at 2048 chars; ours are far shorter.
   */
  function link(ref) {
    return ref ? BASE + '?ref=' + encodeURIComponent(ref) : BASE;
  }

  /** Derive a sensible default ref from the current page. */
  function refForPage() {
    var file = (window.location.pathname.split('/').pop() || 'home').replace(/\.html$/, '');
    return 'web_' + (file || 'home');
  }

  /* ----------------------------------------------------------------------
     1. Wire declarative links:  <a data-messenger="volunteer">…</a>
     ---------------------------------------------------------------------- */

  function wireLinks() {
    var nodes = document.querySelectorAll('[data-messenger]');
    Array.prototype.forEach.call(nodes, function (el) {
      var ref = el.getAttribute('data-messenger') || refForPage();
      el.setAttribute('href', link(ref));
      el.setAttribute('target', '_blank');
      // noopener is a security requirement on any target=_blank; noreferrer
      // additionally stops the referrer header leaking the exact page.
      el.setAttribute('rel', 'noopener noreferrer');
    });
  }

  /* ----------------------------------------------------------------------
     2. Floating action button
     Rendered from JS rather than pasted into nine HTML files, so the markup,
     the label, and the dismissal logic live in one place.
     ---------------------------------------------------------------------- */

  var DISMISS_KEY = 'pbb_msgr_dismissed';

  function dismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  }
  function setDismissed() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }

  function mountFab() {
    // Opt out per page with <body data-no-messenger-fab>. The contact page
    // does this — it already has a large Messenger card, and a floating
    // button on top of it is just noise.
    if (document.body.hasAttribute('data-no-messenger-fab')) return;
    if (dismissed()) return;
    if (document.getElementById('msgrFab')) return;

    var wrap = document.createElement('div');
    wrap.className = 'msgr-fab no-print';
    wrap.id = 'msgrFab';
    wrap.hidden = true;

    var a = document.createElement('a');
    a.className = 'msgr-fab-btn';
    a.href = link(refForPage());
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Mag-message sa PBB sa Facebook Messenger');

    a.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M12 2C6.3 2 2 6.2 2 11.7c0 3.1 1.4 5.9 3.7 7.7v3.8l3.4-1.9c.9.3 1.9.4 2.9.4 5.7 0 10-4.2 10-9.7S17.7 2 12 2zm1 13.1-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.4 5.8z"/>' +
      '</svg><span>Mag-message</span>';

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'msgr-fab-close';
    close.setAttribute('aria-label', 'Itago ang Messenger button');
    close.textContent = '✕';
    close.addEventListener('click', function () {
      setDismissed();
      wrap.remove();
    });

    wrap.appendChild(a);
    wrap.appendChild(close);
    document.body.appendChild(wrap);

    /* Appear after a short scroll rather than immediately. A button that
       covers content before the visitor has read anything is an interstitial,
       and Google treats intrusive ones as a mobile ranking problem. */
    function onScroll() {
      wrap.hidden = window.scrollY < 400;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ----------------------------------------------------------------------
     3. Boot
     ---------------------------------------------------------------------- */

  function boot() {
    wireLinks();
    mountFab();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  PBB.messenger = {
    id: MESSENGER_ID,
    link: link,
    refForPage: refForPage
  };

})(window, document);
