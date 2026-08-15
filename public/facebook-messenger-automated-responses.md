# PBB Facebook Messenger — Automated Response Scripts

**Page:** https://www.facebook.com/profile.php?id=61588593370087
**Messenger link:** https://m.me/914129215127738
**Set up in:** Meta Business Suite → your Page → **Automations** (or Inbox → Automated Responses)
**Last updated:** 15 August 2026 — review before each phase of the campaign (grassroots → pre-election → election week) and update dates and numbers as they change.

Copy-paste ready. Meta Business Suite supports these natively (Instant Reply, Away Message, FAQs, Persistent Menu). No developer or Messenger API integration is required.

---

## ⚠️ Corrections applied on 15 August 2026 — read before pasting

The previous revision of this document conflicted with the website in three ways. All three are fixed below, but the reasons matter because they will recur.

### 1. The BANGON expansion was wrong

The old FAQ 2 used a different set of pillar names from the COMELEC-registered platform on the website. These are **not** stylistic variants — they name different policy areas, and a volunteer quoting one while the site says the other looks like a party that does not know its own platform.

| Letter | Website / registered platform (**correct**) | Old Messenger script (**wrong**) |
|---|---|---|
| B | Basic Services Enhancement | Basic Services Enhancement ✓ |
| A | **Alliance Building & Partnerships** | Accelerate Sustainable Livelihood ✗ |
| N | **Natural Resources Protection** | Non-violent Peace ✗ |
| G | **Green Economy Acceleration** | Green Economic Competitiveness ✗ |
| O | Open & Inclusive Governance | Open & Inclusive Governance ✓ |
| N | **Non-violent Conflict Resolution** | Nurturing Women & Gender Empowerment ✗ |

This is exactly the "Six-Point vs 10-point confusion" the personas document flags as the PBB Ground Operator's top need. **Whoever owns the platform wording should confirm the canonical set once, in writing, and everything else should be conformed to it** — the website, this document, the brochures, and the tarpaulins.

Note that the two policy areas dropped in the correct set — sustainable livelihood and women's empowerment — are real parts of the agenda; they sit *inside* the six pillars rather than being pillars themselves. Women's programmes in particular are strong in the internal materials and nearly invisible in the public ones, which the Community Matriarch persona notices. That is a content gap worth closing on the website, not a reason to rename a pillar.

### 2. Links pointed at anchors that no longer exist

`/#platform` and `/#get-involved` were anchors on the old single-page site. The site is now multi-page. Every link below is updated.

### 3. The hotline placeholder was never filled in

`[Add PBB hotline number]` appeared twice. The number is **0966 301 8777**.

---

## 1. Instant Reply (fires the moment someone messages the Page)

Meta Business Suite → Automations → **Instant reply** → toggle on → paste:

```
Salamat sa pag-message sa Partido Bangon Bangsamoro! 🕊️

Babangon Tayo — Together, We Rise.

Karaniwang sumasagot kami sa loob ng ilang oras. Habang naghihintay, piliin ang
kailangan ninyo sa ibaba — o magtanong lang nang direkta at may tunay na taong
sasagot.

1️⃣ Tungkol sa PBB at sa BANGON Platform
2️⃣ Paano ako makakapag-volunteer?
3️⃣ Nasaan ang opisina / hotline ninyo?
4️⃣ Petsa ng halalan at impormasyon sa pagboto
5️⃣ Kausapin ang tunay na tao

Mag-reply ng numero, o magtanong ng kahit ano.
```

---

## 2. Away Message (outside business hours, e.g. 9pm–7am)

Meta Business Suite → Automations → **Away message** → set your hours → paste:

```
Salamat sa pag-abot sa Partido Bangon Bangsamoro.

Offline muna ang aming team ngayon, pero mahalaga ang mensahe ninyo — sasagutin
namin ito pagbalik. Para sa madalian, tawagan ang aming hotline: 0966 301 8777.

Babangon tungo sa kaunlaran! 🇵🇭
```

---

## 3. FAQ Quick Replies (Meta Business Suite → Automations → FAQs)

Add each as a separate FAQ entry.

### FAQ 1 — "Ano ang Partido Bangon Bangsamoro?"
```
Ang Partido Bangon Bangsamoro (PBB) ay isang rehiyonal na partido sa BARMM na
lalahok sa parliamentaryong halalan sa Setyembre 14, 2026.

Itinatag noong 2022 sa Cotabato City ng mga propesyonal at grassroots na lider —
doktor, abogado, inhinyero, guro — at may humigit-kumulang 71,000 miyembro.
Malaya kami sa MILF at MNLF, at nakabatay kami sa meritokrasya at transparency.

Buong kuwento: https://www.bangonbangsamoro.com/about.html
```

### FAQ 2 — "Ano ang BANGON platform?"
```
Ang BANGON ay ang aming platform of government — anim na pangako, isa sa bawat
letra:

B — Basic Services Enhancement (₱8,000 household subsidy, Super Health Stations,
    libreng internet sa paaralan)
A — Alliance Building & Partnerships (Bottom-Up Budgeting, sectoral organizing)
N — Natural Resources Protection (Palaw Rangers, reforestation, proteksyon ng
    karagatan)
G — Green Economy Acceleration (Halal, Shari'ah-compliant financing, Green Skills)
O — Open & Inclusive Governance (merit-based hiring, bukas na badyet)
N — Non-violent Conflict Resolution (reintegrasyon, Marawi, community dialogue)

Buong detalye: https://www.bangonbangsamoro.com/bangon.html
```

### FAQ 3 — "Paano ako makakapag-volunteer?"
```
Malugod kayong tinatanggap! Puwede kayong:

🖊️ Mag-sign up sa website: https://www.bangonbangsamoro.com/volunteer.html
📍 Sumali sa ground at precinct organizing sa inyong lugar
💬 Tumulong sa sectoral organizing (kabataan, propesyonal)
📱 Sumuporta sa digital at communications team

Walang quota at walang bayad — kayo ang magpapasya kung gaano kalaki ang
maiaambag ninyo. Sabihin lang ang inyong probinsya at kokontakin kayo ng
coordinator sa loob ng 2 araw.

Walang internet? I-text ang SUMALI sa 0966 301 8777.
```

### FAQ 4 — "Nasaan ang opisina ninyo / paano ko kayo matatawagan?"
```
📍 Party headquarters: Cotabato City, BARMM (pagbisita ayon sa appointment)
📞 Hotline: 0966 301 8777
✉️ Email: info@bangonbangsamoro.com

Puwede rin kayong magpatuloy dito sa Messenger — tinitingnan namin ito araw-araw.

Lahat ng paraan: https://www.bangonbangsamoro.com/contact.html
```

### FAQ 5 — "Kailan ang halalan at paano ako boboto?"
```
Ang parliamentaryong halalan ng Bangsamoro ay sa Setyembre 14, 2026.

Para sa opisyal na rehistrasyon, paghahanap ng presinto, at karapatang bumoto,
ang COMELEC (comelec.gov.ph) ang may awtoridad — bilang partido, hindi namin
kayang asikasuhin ang inyong rehistrasyon. Pero may gabay kami para hindi kayo
maligaw:

https://www.bangonbangsamoro.com/voter-education.html
```

### FAQ 6 — "Puwede ba akong mag-donate o sumuporta?"
```
Salamat sa pag-iisip nito! Piliin ang "Mag-donate ng resources" sa aming
volunteer form, o mag-email sa info@bangonbangsamoro.com at gagabayan namin kayo
sa mga opsyon.

Lahat ng kontribusyon ay saklaw ng COMELEC campaign finance rules at iniuulat
nang naaayon.

https://www.bangonbangsamoro.com/volunteer.html
```

### FAQ 7 — "Magkano ang bayad sa membership?" *(new)*
```
Wala. Libre ang membership sa PBB, at libre rin ang PBB Membership ID na may
litrato at lagda ninyo.

Walang sinuman ang dapat maningil sa inyo para dito. Kung may humingi ng bayad,
iulat ito agad sa 0966 301 8777.

Sagutan ang membership form (mga 3 minuto):
https://www.bangonbangsamoro.com/membership.html
```

### FAQ 8 — "Ano ang pinagkaiba ng miyembro at volunteer?" *(new)*
```
Ang MIYEMBRO ay opisyal na kasapi ng partido, may Membership ID, at kabilang sa
71,000+ na kasapi sa buong BARMM.

Ang VOLUNTEER ay tumutulong sa kampanya — miyembro man o hindi.

Hindi ninyo kailangang maging miyembro bago mag-volunteer, at hindi kayo
obligadong mag-volunteer kapag naging miyembro kayo. Marami ang gumagawa ng
pareho.
```

---

## 4. Persistent Menu (always-visible menu under the message box)

Meta Business Suite → Automations → **Menu**. These four items are mirrored as
chips on the website's home, contact, FAQ, About and BANGON pages — **if you
change one, change the other**, or the site and the bot will offer different doors.

| Menu label | Action |
|---|---|
| 🕊️ Tungkol sa PBB | Sends FAQ 1 |
| 📋 BANGON Platform | Sends FAQ 2, or link to `/bangon.html` |
| 🙋 Mag-volunteer | Sends FAQ 3, or link to `/volunteer.html` |
| 📞 Makipag-ugnayan | Sends FAQ 4 |

---

## 5. Referral tags from the website

Every Messenger link on the site carries a `ref` parameter, visible in the Page
inbox on the first message. Use it to see where the conversation started without
having to ask:

| `ref` | Came from |
|---|---|
| `hero` | Home page hero button |
| `menu_about`, `menu_platform`, `menu_volunteer`, `menu_contact` | Persistent-menu chips on the site |
| `menu_election`, `menu_human` | Extra chips on the contact page |
| `faq_page` | FAQ page |
| `footer` | Footer link, any page |
| `web_membership`, `web_volunteer`, `web_bangon-peace`, … | Floating button, named after the page |

Someone arriving with `ref=web_volunteer` was already reading the volunteer page —
skip the introduction and ask which province they are in.

---

## 6. Handoff rule (important)

Automated replies must **never** be the final word on anything sensitive — election-day incidents, complaints, press inquiries, or anyone in distress.

- If a message contains *"reklamo," "insidente," "help," "urgent," "tulong," "delikado,"* or anything about violence, harassment, or a safety concern → **a real team member replies within the hour**, automation aside.
- If anyone appears to be in immediate danger, point them to local police or emergency services first. The PBB hotline is for questions and reports; it is not an emergency response service, and saying otherwise could cost someone time they do not have.
- Automated FAQ answers are a first response, not a replacement for the team.

---

## Setup checklist

- [ ] Confirm the canonical BANGON wording with whoever owns the platform (see the correction note at the top) before pasting anything
- [ ] Paste Instant Reply into Meta Business Suite
- [ ] Paste Away Message + set business hours (9pm–7am)
- [ ] Add all 8 FAQ entries
- [ ] Build the Persistent Menu, matching the website chips
- [ ] Verify the m.me link resolves to the right Page: https://m.me/914129215127738
- [ ] Assign at least one team member to monitor and take over real conversations daily
- [ ] Brief that team on the handoff rule in section 6
- [ ] Re-test the whole flow by messaging the Page from a separate account

---

## Open question for the team

The Page profile ID in the header (`61588593370087`) and the m.me handle
(`914129215127738`) are different identifiers. That is normal — m.me can use a
Page's username or its Messenger-specific ID — but **someone should confirm by
opening https://m.me/914129215127738 that it lands on the correct PBB Page**
before the link goes on printed material. If it resolves anywhere else, every
Messenger link on the website needs updating (they all read from
`window.PBB_MESSENGER_ID`, set in `scripts/sync-chrome.mjs`, so it is a
one-line change).
