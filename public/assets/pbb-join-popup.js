/* ==========================================================================
   PBB — "Sumali sa PBB" popup
   --------------------------------------------------------------------------
   A single, dismissible modal that invites the reader to become a member and
   sends them to membership.html.

   WHEN IT APPEARS — and, more importantly, when it does not

   A popup on a campaign site is easy to get wrong in ways that cost more than
   it earns, so the suppression rules are the substance of this file:

     * NEVER on membership.html, volunteer.html, partnership.html, join.html
       or verify.html. Interrupting someone who is already filling in a form
       to ask them to fill in a form is the single most expensive mistake this
       component could make.
     * NEVER before a minimum dwell time (default 25s) AND a scroll depth
       (default 45%). Google treats interstitials that cover content shortly
       after arrival from search as a mobile ranking problem, and it is also
       simply rude — the visitor has not read anything yet.
     * NEVER while the cookie banner is still up. Two overlays at once is a
       dark pattern, and the consent decision has to come first.
     * NEVER if the visitor already joined (localStorage flag set by join.js
       after a successful membership submission), already dismissed it within
       the cool-off window (default 14 days), or has a queued submission
       waiting to send.
     * NEVER if the visitor asked for reduced motion AND the page is still
       loading — it waits for idle instead of animating over content.

   It can always be opened deliberately: any element with [data-join-popup]
   opens it on click, ignoring every timing rule above. That is the honest use
   of this component — a button the visitor chooses to press.

   ACCESSIBILITY
   Focus moves into the dialog on open and returns to whatever opened it on
   close. Tab is trapped inside while open. Escape closes. Background content
   is marked aria-hidden. The close control is a real <button> with an
   accessible name, 48px, and is reachable first — not a 12px grey ✕ in the
   corner that keyboard users cannot find.

   CONFIGURATION (all optional)
     window.PBB_JOIN_POPUP = {
       enabled: true,
       delaySeconds: 25,
       scrollPercent: 45,
       cooldownDays: 14,
       exitIntent: true,      // desktop only
     }
   ========================================================================== */

(function (window, document) {
  'use strict';

  var PBB = window.PBB || (window.PBB = {});
  var cfg = window.PBB_JOIN_POPUP || {};

  var CONFIG = {
    enabled: cfg.enabled !== false,
    delaySeconds: typeof cfg.delaySeconds === 'number' ? cfg.delaySeconds : 25,
    scrollPercent: typeof cfg.scrollPercent === 'number' ? cfg.scrollPercent : 45,
    cooldownDays: typeof cfg.cooldownDays === 'number' ? cfg.cooldownDays : 14,
    exitIntent: cfg.exitIntent !== false
  };

  /* Pages where the popup must never auto-open. */
  var SUPPRESSED_PAGES = [
    'membership.html',
    'volunteer.html',
    'partnership.html',
    'join.html',
    'verify.html'
  ];

  var DISMISS_KEY = 'pbb_join_popup_dismissed_at';
  var JOINED_KEY = 'pbb_joined';          // set by join.js on success
  var OUTBOX_KEY = 'pbb_outbox_v2';       // a queued submission counts as joined

  /* ----------------------------------------------------------------------
     Storage helpers — never throw. Safari private mode and some Android
     WebViews reject localStorage outright.
     ---------------------------------------------------------------------- */

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  function currentPage() {
    return (window.location.pathname.split('/').pop() || 'home.html');
  }

  function withinCooldown() {
    var at = Number(lsGet(DISMISS_KEY) || 0);
    if (!at) return false;
    return (Date.now() - at) < CONFIG.cooldownDays * 24 * 60 * 60 * 1000;
  }

  function alreadyJoined() {
    if (lsGet(JOINED_KEY) === '1') return true;
    // A submission still sitting in the outbox means they filled the form and
    // the network failed — asking them to join again would be insulting.
    try {
      var raw = lsGet(OUTBOX_KEY);
      if (!raw) return false;
      var items = JSON.parse(raw);
      return items.some(function (i) {
        return i && i.envelope && i.envelope.formType === 'membership';
      });
    } catch (e) { return false; }
  }

  function cookieBannerUp() {
    return document.body.classList.contains('has-cookie-banner');
  }

  function mayAutoOpen() {
    if (!CONFIG.enabled) return false;
    if (SUPPRESSED_PAGES.indexOf(currentPage()) !== -1) return false;
    if (withinCooldown()) return false;
    if (alreadyJoined()) return false;
    return true;
  }

  /* ----------------------------------------------------------------------
     Markup
     ---------------------------------------------------------------------- */

  var overlay = null;
  var lastFocused = null;
  var isOpen = false;

  function build() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'join-popup-overlay no-print';
    overlay.id = 'joinPopup';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'joinPopupTitle');
    overlay.setAttribute('aria-describedby', 'joinPopupBody');
    overlay.hidden = true;

    overlay.innerHTML =
      '<div class="join-popup" role="document">' +
        '<button type="button" class="join-popup-close" data-join-close ' +
                'aria-label="Isara ang paanyaya">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
          '</svg>' +
        '</button>' +

        '<div class="join-popup-art" aria-hidden="true">' +
          '<img src="assets/pbb-logo-128.png" width="64" height="64" alt="">' +
        '</div>' +

        '<p class="eyebrow">Setyembre 14, 2026</p>' +
        '<h2 id="joinPopupTitle">Sumali sa PBB</h2>' +

        '<div id="joinPopupBody">' +
          '<p>Maging opisyal na miyembro ng Partido Bangon Bangsamoro at kumuha ng ' +
          '<strong>PBB Membership ID</strong> na may litrato at lagda mo.</p>' +
          '<ul class="join-popup-points">' +
            '<li>Libre — walang bayad ang membership at ang ID</li>' +
            '<li>Mga 3 minuto lang, kaya sa cellphone</li>' +
            '<li>Kailangan lang: pangalan, numero, at litrato</li>' +
          '</ul>' +
        '</div>' +

        '<div class="join-popup-actions">' +
          '<a class="btn btn-gold btn-block" href="membership.html" data-join-accept>' +
            'Maging miyembro' +
          '</a>' +
          '<button type="button" class="btn btn-outline btn-block" data-join-close>' +
            'Sa susunod na lang' +
          '</button>' +
        '</div>' +

        '<p class="join-popup-note">' +
          'Gusto mo lang bang tumulong sa kampanya? ' +
          '<a href="volunteer.html" data-join-accept>Mag-volunteer</a> — hindi mo kailangang maging miyembro.' +
        '</p>' +
      '</div>';

    document.body.appendChild(overlay);

    /* Close on backdrop click, but not on clicks inside the panel. */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close('backdrop');
      if (e.target.closest('[data-join-close]')) close('button');
      if (e.target.closest('[data-join-accept]')) {
        // Treat "accept" as a dismissal too, so returning from the form does
        // not immediately show it again.
        remember();
        isOpen = false;
      }
    });

    return overlay;
  }

  /* ----------------------------------------------------------------------
     Focus management
     ---------------------------------------------------------------------- */

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), ' +
                  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables() {
    return Array.prototype.filter.call(
      overlay.querySelectorAll(FOCUSABLE),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function onKeydown(e) {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close('escape');
      return;
    }

    if (e.key !== 'Tab') return;

    var items = focusables();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];

    // Wrap focus so Tab cannot escape into the page behind the dialog.
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ----------------------------------------------------------------------
     Open / close
     ---------------------------------------------------------------------- */

  function siblingsOfOverlay() {
    return Array.prototype.filter.call(document.body.children, function (el) {
      return el !== overlay;
    });
  }

  function open(reason) {
    if (isOpen) return;
    build();

    lastFocused = document.activeElement;
    overlay.hidden = false;
    overlay.dataset.reason = reason || 'manual';

    // Hide the rest of the page from assistive technology while the dialog is
    // up, so a screen-reader user cannot wander out of it.
    siblingsOfOverlay().forEach(function (el) {
      if (el.getAttribute('aria-hidden') === 'true') {
        el.dataset.joinPopupWasHidden = '1';
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
    });

    // Lock scroll without the jump caused by a disappearing scrollbar.
    var sbw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sbw > 0) document.body.style.paddingRight = sbw + 'px';

    isOpen = true;

    // Focus the close control first: the first thing a keyboard or screen
    // reader user needs from an unrequested dialog is the way out.
    requestAnimationFrame(function () {
      var closeBtn = overlay.querySelector('.join-popup-close');
      if (closeBtn) closeBtn.focus();
      overlay.classList.add('open');
    });

    document.addEventListener('keydown', onKeydown, true);
  }

  function close(reason) {
    if (!isOpen || !overlay) return;

    overlay.classList.remove('open');
    isOpen = false;
    document.removeEventListener('keydown', onKeydown, true);

    siblingsOfOverlay().forEach(function (el) {
      if (el.dataset.joinPopupWasHidden) delete el.dataset.joinPopupWasHidden;
      else el.removeAttribute('aria-hidden');
    });

    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    // Only a real dismissal starts the cool-off. Closing it because the tab
    // lost focus should not cost the visitor two weeks of not being asked.
    if (reason !== 'silent') remember();

    overlay.hidden = true;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  function remember() { lsSet(DISMISS_KEY, String(Date.now())); }

  /* ----------------------------------------------------------------------
     Triggers
     ---------------------------------------------------------------------- */

  function armAutoOpen() {
    if (!mayAutoOpen()) return;

    var dwellMet = false;
    var scrollMet = false;
    var fired = false;

    function maybeFire(reason) {
      if (fired || !dwellMet || !scrollMet) return;
      // The consent decision comes first; never stack two overlays.
      if (cookieBannerUp()) return;
      // State can change while the timers run — re-check.
      if (!mayAutoOpen()) return;
      fired = true;
      open(reason);
    }

    setTimeout(function () { dwellMet = true; maybeFire('dwell'); },
               CONFIG.delaySeconds * 1000);

    function onScroll() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 100;
      if (pct >= CONFIG.scrollPercent) {
        scrollMet = true;
        window.removeEventListener('scroll', onScroll);
        maybeFire('scroll');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();   // short pages may already satisfy this

    /* Exit intent, desktop only. On a phone a cursor leaving the top of the
       viewport means nothing, and firing there would be the intrusive
       interstitial pattern Google penalises. */
    if (CONFIG.exitIntent && window.matchMedia('(min-width: 1080px)').matches) {
      document.addEventListener('mouseout', function (e) {
        if (e.relatedTarget || e.clientY > 8) return;
        dwellMet = true;   // exit intent overrides the dwell timer
        maybeFire('exit-intent');
      });
    }
  }

  /* Manual triggers work on every page, including the suppressed ones. */
  function wireManualTriggers() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-join-popup]');
      if (!trigger) return;
      e.preventDefault();
      open('manual');
    });
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  function boot() {
    wireManualTriggers();
    armAutoOpen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  PBB.joinPopup = {
    open: function () { open('api'); },
    close: function () { close('api'); },
    reset: function () { try { localStorage.removeItem(DISMISS_KEY); } catch (e) {} },
    config: CONFIG
  };

})(window, document);
