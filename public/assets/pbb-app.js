/* ==========================================================================
   PBB — shared front-end behaviour for every static page
   --------------------------------------------------------------------------
   Extracted from the old monolithic home.html so the campaign site can be
   split into a slim hub plus one page per BANGON domain without copying 400
   lines of JavaScript into each of them.

   Exposes a single global: window.PBB
     PBB.submitLead(formType, payload, token) -> Promise
     PBB.renderResult(statusEl, state, ctx)
     PBB.beginSubmit(button, statusEl) -> restore()
     PBB.tokenFor(formEl)
     PBB.fieldErrorMessage(body)
     PBB.persona.get() / .set(id) / .onChange(fn)
     PBB.lang.get()  / .set(code)
     PBB.config      (resolved runtime configuration)

   Everything is plain ES5-compatible syntax with no build step, because these
   pages are served as-is and must work on the low-end Android browsers that
   dominate BARMM.
   ========================================================================== */

(function (window, document) {
  'use strict';

  /* ======================================================================
     0. CONFIGURATION
     Set window.PBB_SUPABASE_URL / _ANON_KEY / _TURNSTILE_SITE_KEY before this
     script loads. All three are public by design; see the note in each page.
     ====================================================================== */

  var config = {
    supabaseUrl:  window.PBB_SUPABASE_URL || '',
    supabaseKey:  window.PBB_SUPABASE_ANON_KEY || '',
    turnstileKey: window.PBB_TURNSTILE_SITE_KEY || '',
    hotline:      '0966 301 8777',
    email:        'info@bangonbangsamoro.com',
    timeoutMs:    15000
  };
  config.endpoint = config.supabaseUrl
    ? config.supabaseUrl.replace(/\/+$/, '') + '/functions/v1/submit-lead'
    : '';

  var OUTBOX_KEY  = 'pbb_outbox_v2';
  var SESSION_KEY = 'pbb_session_ref';
  var PERSONA_KEY = 'pbb_persona';
  var LANG_KEY    = 'pbb-lang';

  /* Small storage helpers that never throw — Safari private mode and some
     Android WebViews reject localStorage entirely. */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  /* ======================================================================
     1. SUBMISSION TRANSPORT
     Identical contract to the version that used to live inside home.html:
     a submission is only ever reported as SENT after a confirmed 2xx. If the
     network fails the payload is queued and the user is told it is queued.
     ====================================================================== */

  function sessionRef() {
    var existing = lsGet(SESSION_KEY);
    if (existing) return existing;
    var ref = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : 'sr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    lsSet(SESSION_KEY, ref);
    return ref;
  }

  function readOutbox() {
    var raw = lsGet(OUTBOX_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function writeOutbox(items) { lsSet(OUTBOX_KEY, JSON.stringify(items)); }

  function queueForRetry(envelope) {
    var all = readOutbox();
    if (all.length >= 25) all.shift();   // bound the queue; never fill the disk
    all.push({ envelope: envelope, queuedAt: new Date().toISOString(), attempts: 0 });
    return writeOutbox(all);
  }

  function postEnvelope(envelope) {
    if (!config.endpoint || !config.supabaseKey) {
      return Promise.reject({ kind: 'unconfigured' });
    }

    var controller = ('AbortController' in window) ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, config.timeoutMs) : null;

    return fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.supabaseKey,
        'apikey': config.supabaseKey
      },
      body: JSON.stringify(envelope),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (res.ok) return body;
        throw {
          // 4xx means the submission itself is wrong — retrying cannot help.
          kind: (res.status >= 500 || res.status === 429) ? 'transient' : 'rejected',
          status: res.status,
          body: body
        };
      });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.kind) throw err;
      throw { kind: 'network', error: err };
    });
  }

  function submitLead(formType, payload, turnstileToken) {
    var envelope = {
      formType: formType,
      payload: payload,
      sessionRef: sessionRef(),
      turnstileToken: turnstileToken || '',
      submittedAt: new Date().toISOString()
    };

    return postEnvelope(envelope).then(function (body) {
      return { state: body.duplicate ? 'duplicate' : 'sent', data: body || {} };
    }).catch(function (err) {
      if (err.kind === 'rejected') {
        return Promise.reject({ state: 'rejected', body: err.body || {}, status: err.status });
      }
      var queued = queueForRetry(envelope);
      return Promise.reject({ state: queued ? 'queued' : 'failed', reason: err.kind });
    });
  }

  function flushOutbox() {
    var items = readOutbox();
    if (!items.length || !config.endpoint) return;

    var remaining = [];
    var chain = Promise.resolve();

    items.forEach(function (item) {
      chain = chain.then(function () {
        if (item.attempts >= 5) return;   // stop retrying; do not loop forever
        return postEnvelope(item.envelope).catch(function (err) {
          if (err.kind === 'rejected') return;   // permanently invalid, drop
          item.attempts += 1;
          remaining.push(item);
        });
      });
    });

    chain.then(function () {
      writeOutbox(remaining);
      var banner = document.getElementById('outboxBanner');
      if (banner) banner.hidden = remaining.length === 0;
    });
  }

  /* ======================================================================
     2. STATUS COPY
     One place for every form's messaging so the wording stays consistent and,
     above all, honest. `queued` is the state that did not exist before the
     August audit and is the only truthful thing to say on a weak signal.
     ====================================================================== */

  function fieldErrorMessage(body) {
    switch (body && body.error) {
      case 'invalid_phone':
        return 'Mukhang mali ang cellphone number. Gamitin ang format na 0917 123 4567.';
      case 'invalid_email':
        return 'Mukhang mali ang email address. Suriin ang baybay o iwanan itong blangko.';
      case 'invalid_name':
        return 'Pakilagay ang iyong buong pangalan.';
      case 'invalid_contact':
        return 'Kailangan namin ng cellphone number o email para makontak ka.';
      case 'invalid_precinct':
        return 'Suriin ang precinct number. Nasa voter ID o sa COMELEC precinct finder ito.';
      case 'guardian_consent_required':
        return 'Wala pang 18 anyos — kailangan ng pahintulot ng magulang o guardian.';
      case 'signature_name_mismatch':
        return 'Dapat tugma ang nilagdaang pangalan sa pangalan ng contact person.';
      case 'signature_required':
        return 'Kailangan ang iyong lagda bago mag-submit.';
      case 'photo_required':
        return 'Kailangan ang iyong litrato para sa membership ID.';
      case 'captcha_failed':
        return 'Hindi na-verify na tao ka. I-refresh ang page at subukan ulit.';
      case 'rate_limited':
        return 'Masyadong maraming pagsubok mula sa koneksyon na ito. Maghintay ng 10 minuto, o tumawag sa ' + config.hotline + '.';
      case 'payload_too_large':
        return 'Masyadong malaki ang litrato. Subukan ang mas maliit na larawan.';
      default:
        return 'May problema sa pagpapadala. Subukan ulit, o tumawag sa ' + config.hotline + '.';
    }
  }

  function renderResult(statusEl, outcome, ctx) {
    if (!statusEl) return false;
    ctx = ctx || {};
    var first = (ctx.firstName || '').trim();

    switch (outcome) {
      case 'sent':
        statusEl.className = 'form-status ok';
        statusEl.textContent =
          'Salamat' + (first ? ', ' + first : '') + '! Nai-save na namin ang iyong detalye.' +
          (ctx.maskedPhone ? ' Magpapadala kami ng text sa ' + ctx.maskedPhone + ' sa loob ng ilang minuto.' : '') +
          (ctx.chapter ? ' Kokontakin ka ng coordinator ng ' + ctx.chapter + ' sa loob ng 2 araw.' : '');
        return true;

      case 'duplicate':
        statusEl.className = 'form-status ok';
        statusEl.textContent =
          'Nakarehistro ka na sa numerong ito' +
          (ctx.submittedAt ? ' noong ' + new Date(ctx.submittedAt).toLocaleDateString('fil-PH') : '') +
          '. Kung may gusto kang baguhin, i-text ang UPDATE sa ' + config.hotline + '.';
        return true;

      case 'queued':
        statusEl.className = 'form-status';
        statusEl.textContent =
          'Naka-queue ang iyong sign-up. Mahina ang koneksyon ngayon, pero hindi mawawala ang detalye mo — ' +
          'awtomatiko itong ipapadala pagbalik ng signal. Huwag isara ang browser na ito.';
        return false;

      case 'rejected':
        statusEl.className = 'form-status err';
        statusEl.textContent = fieldErrorMessage(ctx.body || {});
        return false;

      default:
        statusEl.className = 'form-status err';
        statusEl.textContent =
          'Hindi namin naipadala ang iyong detalye. Subukan ulit, o mag-text ng SUMALI sa ' +
          config.hotline + ' at kami na ang bahala.';
        return false;
    }
  }

  function beginSubmit(btn, statusEl) {
    var original = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    }
    if (statusEl) {
      statusEl.className = 'form-status';
      statusEl.textContent = 'Ipinapadala…';
    }
    return function restore() {
      if (!btn) return;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = original;
    };
  }

  /* ======================================================================
     3. TURNSTILE
     ====================================================================== */

  function mountTurnstile() {
    if (!config.turnstileKey) return;   // widget stays hidden; server warns
    var wraps = document.querySelectorAll('.pbb-captcha');
    if (!wraps.length) return;

    Array.prototype.forEach.call(wraps, function (wrap) {
      var widget = wrap.querySelector('.cf-turnstile');
      if (widget) widget.setAttribute('data-sitekey', config.turnstileKey);
      wrap.hidden = false;
    });

    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

  function tokenFor(formEl) {
    if (!formEl) return '';
    var input = formEl.querySelector('input[name="cf-turnstile-response"]');
    return input ? input.value : '';
  }

  /* ======================================================================
     4. PERSONA ROUTING
     The six voter personas from docs/internal/PBB_User_Personas_2026.md.
     A visitor picks the one closest to them; the site then reorders and
     highlights content instead of asking everyone to read everything. This
     is the progressive-disclosure spine of the redesign.
     ====================================================================== */

  var PERSONAS = [
    {
      id: 'professional',
      label: 'Propesyonal / Kabataan',
      blurb: 'Trabaho batay sa kakayahan, hindi sa apelyido.',
      pillars: ['open-governance', 'basic-services', 'green-economy', 'alliance']
    },
    {
      id: 'provider',
      label: 'Magsasaka / Mangingisda',
      blurb: 'Konkretong tulong para sa pang-araw-araw na pamilya.',
      pillars: ['basic-services', 'alliance', 'natural-resources', 'green-economy']
    },
    {
      id: 'matriarch',
      label: 'Ina / Community Leader',
      blurb: 'Proteksyon, kalusugan, at scholarship para sa mga anak.',
      pillars: ['basic-services', 'peace', 'open-governance', 'alliance']
    },
    {
      id: 'peace',
      label: 'Peace Advocate',
      blurb: 'Kapayapaan na may kabuhayan, hindi pangako lang.',
      pillars: ['peace', 'alliance', 'basic-services', 'open-governance']
    },
    {
      id: 'business',
      label: 'Negosyante / Halal',
      blurb: 'Pandaigdigang merkado para sa produktong Bangsamoro.',
      pillars: ['green-economy', 'alliance', 'natural-resources', 'open-governance']
    },
    {
      id: 'elder',
      label: 'Nakatatanda / Lider ng Pananampalataya',
      blurb: 'Malinis na pamamahala, pananampalataya, at awtonomiya.',
      pillars: ['open-governance', 'peace', 'alliance', 'natural-resources']
    }
  ];

  var personaListeners = [];

  var persona = {
    all: PERSONAS,
    find: function (id) {
      for (var i = 0; i < PERSONAS.length; i++) if (PERSONAS[i].id === id) return PERSONAS[i];
      return null;
    },
    get: function () { return lsGet(PERSONA_KEY) || ''; },
    set: function (id) {
      lsSet(PERSONA_KEY, id || '');
      applyPersona(id);
      personaListeners.forEach(function (fn) { try { fn(id); } catch (e) {} });
    },
    onChange: function (fn) { personaListeners.push(fn); }
  };

  /**
   * Reorder and annotate anything marked data-pillar according to the chosen
   * persona. Nothing is HIDDEN — hiding content from a voter because we
   * guessed their segment would be both patronising and bad for SEO. The
   * relevant items simply move to the front and get a "para sa'yo" flag.
   */
  function applyPersona(id) {
    var chosen = persona.find(id);

    Array.prototype.forEach.call(document.querySelectorAll('.persona-chip'), function (chip) {
      chip.setAttribute('aria-pressed', String(chip.dataset.persona === id));
    });

    var note = document.getElementById('personaNote');
    if (note) {
      note.textContent = chosen
        ? 'Inayos namin ang pahina para sa: ' + chosen.label + ' — ' + chosen.blurb
        : '';
      note.hidden = !chosen;
    }

    var containers = document.querySelectorAll('[data-pillar-grid]');
    Array.prototype.forEach.call(containers, function (grid) {
      var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-pillar]'));
      if (!cards.length) return;

      cards.forEach(function (card) {
        var flag = card.querySelector('[data-persona-flag]');
        var rank = chosen ? chosen.pillars.indexOf(card.dataset.pillar) : -1;
        card.style.order = String(rank === -1 ? 90 : rank);
        if (flag) {
          flag.hidden = rank === -1 || rank > 1;
          if (rank === 0) flag.textContent = '★ Pinakamalapit sa’yo';
          else if (rank === 1) flag.textContent = '★ Mahalaga rin sa’yo';
        }
      });
    });
  }

  function initPersona() {
    var chips = document.querySelectorAll('.persona-chip');
    if (!chips.length) return;

    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        var next = chip.dataset.persona === persona.get() ? '' : chip.dataset.persona;
        persona.set(next);
      });
    });

    applyPersona(persona.get());
  }

  /* ======================================================================
     5. LANGUAGE
     ====================================================================== */

  var lang = {
    get: function () { return lsGet(LANG_KEY) || 'tl'; },
    set: function (code) {
      lsSet(LANG_KEY, code);
      applyLang(code);
    }
  };

  function applyLang(code) {
    Array.prototype.forEach.call(document.querySelectorAll('.lang-btn'), function (b) {
      var active = b.dataset.lang === code;
      b.setAttribute('aria-pressed', String(active));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang-content] > [data-lang]'), function (div) {
      div.hidden = div.dataset.lang !== code;
    });
  }

  function initLang() {
    var btns = document.querySelectorAll('.lang-btn');
    if (!btns.length) return;
    Array.prototype.forEach.call(btns, function (btn) {
      btn.addEventListener('click', function () { lang.set(btn.dataset.lang); });
    });
    applyLang(lang.get());
  }

  /* ======================================================================
     6. CHROME — nav, reveal, back-to-top, year
     ====================================================================== */

  function initNav() {
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
      document.body.style.overflow = !open ? 'hidden' : '';
    });

    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth < 1080) {
          toggle.setAttribute('aria-expanded', 'false');
          nav.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('open');
        document.body.style.overflow = '';
        toggle.focus();
      }
    });
  }

  function initReveal() {
    var els = document.querySelectorAll('.reveal, .reveal-figure');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var extra = el.classList.contains('reveal-figure') ? 60 : 0;
        el.style.transitionDelay = Math.min(i * 40 + extra, 240) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ======================================================================
     7. BOOT
     ====================================================================== */

  function boot() {
    document.documentElement.classList.remove('no-js');
    initNav();
    initReveal();
    initBackToTop();
    initYear();
    initLang();
    initPersona();
    mountTurnstile();
    flushOutbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('online', flushOutbox);

  /* ======================================================================
     8. PUBLIC API
     ====================================================================== */

  window.PBB = {
    config: config,
    submitLead: submitLead,
    renderResult: renderResult,
    beginSubmit: beginSubmit,
    tokenFor: tokenFor,
    fieldErrorMessage: fieldErrorMessage,
    flushOutbox: flushOutbox,
    persona: persona,
    lang: lang,
    sessionRef: sessionRef
  };

})(window, document);
