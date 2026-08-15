/**
 * Syncs shared chrome across every page in public/.
 *
 *   node scripts/sync-chrome.mjs [--check]
 *
 * The site is now 21 static pages. Header nav, footer, and the runtime config
 * block have to be identical on all of them, and hand-editing 21 files every
 * time a nav item changes is how a site ends up with three different menus.
 *
 * This script rewrites four things in place:
 *   1. <nav id="primary-nav"> … </nav>          — with aria-current per page
 *   2. <div class="footer-grid"> … </div>       — the four footer columns
 *   3. the window.PBB_* runtime configuration block
 *   4. the trailing <script src> list
 *
 * Everything between those blocks — the actual page content — is untouched.
 *
 * Run with --check to fail (exit 1) if any page is out of sync, without
 * writing. That is what CI uses.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')
const CHECK = process.argv.includes('--check')

/* Pages that deliberately keep their own chrome. */
const SKIP = new Set([])

/* Legal pages predate the design system and have their own minimal layout;
   rewriting their nav would break it. They are linked from every footer. */
const LEGAL = new Set(['privacy.html', 'terms.html', 'cookies.html', 'accessibility.html'])

const NAV = [
  ['home.html', 'Simula'],
  ['bangon.html', 'Ang BANGON Platform'],
  ['about.html', 'Tungkol sa PBB'],
  ['voter-education.html', 'Botante'],
  ['faq.html', 'FAQ'],
  ['contact.html', 'Makipag-ugnayan'],
]

/* Form pages get a nav CTA pointing at their own form rather than the hub. */
const CTA = {
  'membership.html': ['#form', 'Sagutan ang Form'],
  'volunteer.html': ['#form', 'Sagutan ang Form'],
  'partnership.html': ['#form', 'Pumirma ng Kasunduan'],
  'verify.html': ['membership.html', 'Maging Miyembro'],
}

function navBlock(slug) {
  const [ctaHref, ctaLabel] = CTA[slug] || ['join.html', 'Sumali sa Kilusan']
  const items = NAV.map(([href, label]) => {
    // A BANGON domain page marks the platform hub as its section.
    const current = href === slug || (href === 'bangon.html' && slug.startsWith('bangon-'))
    return `        <li><a href="${href}"${current ? ' aria-current="page"' : ''}>${label}</a></li>`
  }).join('\n')

  return `<nav id="primary-nav" aria-label="Pangunahing nabigasyon">
      <ul>
${items}
        <li class="nav-cta"><a href="${ctaHref}">${ctaLabel}</a></li>
      </ul>
    </nav>`
}

const FOOTER_GRID = `<div class="footer-grid">
      <div>
        <h5>Ang BANGON Platform</h5>
        <ul>
          <li><a href="bangon.html">Buod ng platform</a></li>
          <li><a href="bangon-basic-services.html">B — Batayang Serbisyo</a></li>
          <li><a href="bangon-alliance.html">A — Alyansa</a></li>
          <li><a href="bangon-natural-resources.html">N — Kalikasan</a></li>
          <li><a href="bangon-green-economy.html">G — Green Economy</a></li>
          <li><a href="bangon-open-governance.html">O — Bukas na Pamahalaan</a></li>
          <li><a href="bangon-peace.html">N — Kapayapaan</a></li>
        </ul>
      </div>
      <div>
        <h5>Sumali</h5>
        <ul>
          <li><a href="membership.html">Membership Form</a></li>
          <li><a href="volunteer.html">Volunteer Sign-up</a></li>
          <li><a href="partnership.html">Partnership Agreement</a></li>
          <li><a href="verify.html">I-verify ang Membership ID</a></li>
        </ul>
      </div>
      <div>
        <h5>Alamin</h5>
        <ul>
          <li><a href="about.html">Tungkol sa PBB</a></li>
          <li><a href="voter-education.html">Botante: Set. 14, 2026</a></li>
          <li><a href="faq.html">Mga madalas itanong</a></li>
          <li><a href="contact.html">Makipag-ugnayan</a></li>
          <li><a data-messenger="footer">Messenger</a></li>
        </ul>
      </div>
      <div>
        <h5>Legal</h5>
        <ul>
          <li><a href="privacy.html">Privacy Policy</a></li>
          <li><a href="terms.html">Terms of Use</a></li>
          <li><a href="cookies.html">Cookie Policy</a></li>
          <li><a href="accessibility.html">Accessibility</a></li>
        </ul>
      </div>
    </div>`

const CONFIG_BLOCK = `<script>
  window.PBB_SUPABASE_URL       = "";
  window.PBB_SUPABASE_ANON_KEY  = "";
  window.PBB_TURNSTILE_SITE_KEY = "";
  window.PBB_MESSENGER_ID       = "914129215127738";
</script>`

/* Which extra scripts a page needs, on top of pbb-app + pbb-messenger. */
const EXTRA_SCRIPTS = {
  'membership.html': ['assets/pbb-id.js', 'assets/join.js'],
  'volunteer.html': ['assets/join.js'],
  'partnership.html': ['assets/join.js'],
}

function scriptBlock(slug) {
  const extra = EXTRA_SCRIPTS[slug] || []
  // Form pages load their controllers synchronously (they query the DOM at
  // the bottom of the body); everything else can defer.
  const lines = extra.length
    ? ['<script src="assets/pbb-app.js"></script>',
       ...extra.map((s) => `<script src="${s}"></script>`),
       '<script src="assets/pbb-messenger.js" defer></script>']
    : ['<script src="assets/pbb-app.js" defer></script>',
       '<script src="assets/pbb-messenger.js" defer></script>',
       '<script src="assets/site-widgets.js" defer></script>']
  return lines.join('\n')
}

/* --------------------------------------------------------------------------
   Rewrite
   -------------------------------------------------------------------------- */

const NAV_RE = /<nav id="primary-nav"[\s\S]*?<\/nav>/
const FOOTER_RE = /<div class="footer-grid">[\s\S]*?\n    <\/div>/
const CONFIG_RE = /<script>\s*\n\s*window\.PBB_SUPABASE_URL[\s\S]*?<\/script>/
const SCRIPTS_RE = /<script src="assets\/pbb-app\.js"[\s\S]*?(?=\n<\/body>)/

let changed = []
let checked = 0

for (const file of readdirSync(PUBLIC).filter((f) => f.endsWith('.html')).sort()) {
  if (SKIP.has(file) || LEGAL.has(file)) continue
  checked++

  const path = join(PUBLIC, file)
  const before = readFileSync(path, 'utf8')
  let after = before

  if (NAV_RE.test(after)) after = after.replace(NAV_RE, navBlock(file))
  if (FOOTER_RE.test(after)) after = after.replace(FOOTER_RE, FOOTER_GRID)
  if (CONFIG_RE.test(after)) after = after.replace(CONFIG_RE, CONFIG_BLOCK)
  if (SCRIPTS_RE.test(after)) after = after.replace(SCRIPTS_RE, scriptBlock(file) + '\n')

  if (after !== before) {
    changed.push(file)
    if (!CHECK) writeFileSync(path, after, 'utf8')
  }
}

if (CHECK) {
  if (changed.length) {
    console.error('Out of sync with scripts/sync-chrome.mjs:\n  ' + changed.join('\n  '))
    console.error('\nRun: node scripts/sync-chrome.mjs')
    process.exit(1)
  }
  console.log(`${checked} pages checked — chrome in sync`)
} else {
  console.log(changed.length
    ? `updated ${changed.length}/${checked}:\n  ` + changed.join('\n  ')
    : `${checked} pages already in sync`)
}
