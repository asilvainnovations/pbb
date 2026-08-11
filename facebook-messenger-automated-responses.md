# PBB Facebook Messenger — Automated Response Scripts

**Page:** https://www.facebook.com/profile.php?id=61588593370087
**Set up in:** Meta Business Suite → your Page → **Automations** (or Inbox → Automated Responses)
**Last updated:** August 2026 — review before each phase of the campaign (grassroots → pre-election → election week) and update dates/numbers as they change.

This document is copy-paste ready. Meta Business Suite supports simple text automations natively (Instant Reply, Away Message, FAQs, Persistent Menu). No developer or Messenger API integration is required for what's below — everything here works with the free, built-in tools.

---

## 1. Instant Reply (fires the moment someone messages the Page)

Meta Business Suite → Automations → **Instant reply** → toggle on → paste:

```
Salamat sa pag-message sa Partido Bangon Bangsamoro! 🕊️

Babangon Tayo — Together, We Rise.

We usually reply within a few hours. While you wait, choose what you need below,
or just type your question and our team will get to it personally.

1️⃣ About PBB & the BANGON Platform
2️⃣ How do I volunteer?
3️⃣ Where is your office / hotline?
4️⃣ Election date & voter info
5️⃣ Talk to a real person

Reply with a number, or ask us anything.
```

---

## 2. Away Message (outside business hours, e.g. 9pm–7am)

Meta Business Suite → Automations → **Away message** → set your hours → paste:

```
Thank you for reaching out to Partido Bangon Bangsamoro.

Our team is currently offline, but your message matters — we'll respond as soon
as we're back. For anything urgent, you can also call our hotline: [Add PBB
hotline number].

Babangon tungo sa kaunlaran! 🇵🇭
```

---

## 3. FAQ Quick Replies (Meta Business Suite → Automations → FAQs)

Add each of these as a separate FAQ entry. Visitors tap a suggested question and get an instant scripted answer — no waiting for a human.

### FAQ 1 — "What is Partido Bangon Bangsamoro?"
```
Partido Bangon Bangsamoro (PBB) is a regional party in the BARMM contesting the
2026 Bangsamoro Parliamentary Elections on September 14, 2026.

We're fielding a new generation of merit-based, transparent leaders — young
doctors, lawyers, engineers, and educators — ready to turn the peace process
into real, everyday progress.

See our full platform: https://www.bangonbangsamoro.com/#platform
```

### FAQ 2 — "What is the BANGON platform?"
```
BANGON is our platform of government — six commitments, one for each letter:

B — Basic Services Enhancement (free school internet, Super Health Stations,
    ₱8,000 household subsidy)
A — Accelerate Sustainable Livelihood (Negosyo centers, coastal community
    support)
N — Non-violent Peace (community dialogues, mediation, interfaith unity)
G — Green Economic Competitiveness (farmer/fisherfolk subsidies, eco-farming)
O — Open & Inclusive Governance (merit-based hiring, open budgeting)
N — Nurturing Women & Gender Empowerment (GBV protection, women's
    entrepreneurship, maternal health)

Full details: https://www.bangonbangsamoro.com/#platform
```

### FAQ 3 — "How can I volunteer?"
```
We'd love to have you! You can:

🖊️ Sign up on our website: https://www.bangonbangsamoro.com/#get-involved
📍 Join ground/precinct organizing in your area
💬 Help with sectoral organizing (youth, professional networks)
📱 Support our digital and communications team

Tell us your province and how you'd like to help, and our volunteer desk will
follow up directly.
```

### FAQ 4 — "Where is your office / how do I call you?"
```
📍 Party headquarters: Cotabato City, BARMM (visiting hours by appointment)
📞 Hotline: [Add PBB hotline number]
✉️ Email: info@bangonbangsamoro.com

You can also just keep messaging us here — we check Messenger daily.
```

### FAQ 5 — "When is the election and how do I vote?"
```
The BARMM Parliamentary Elections are on September 14, 2026.

For official voter registration, precinct-finding, and eligibility questions,
please check with COMELEC (commission.elections.gov.ph) — as a party we can't
manage your voter registration, but we're happy to help you find where and how
to vote.
```

### FAQ 6 — "Can I donate or support the campaign?"
```
Thank you for considering it! Reach out through our volunteer form and select
"Donate resources," or email info@bangonbangsamoro.com and our team will walk
you through the options. All contributions are subject to COMELEC campaign
finance rules.

https://www.bangonbangsamoro.com/#get-involved
```

---

## 4. Persistent Menu (always-visible menu under the message box)

Meta Business Suite → Automations → **Menu** → build with these 4 items:

| Menu label | Action |
|---|---|
| 🕊️ About PBB | Sends FAQ 1 |
| 📋 BANGON Platform | Sends FAQ 2, or link to `/#platform` |
| 🙋 Volunteer | Sends FAQ 3, or link to `/#get-involved` |
| 📞 Contact Us | Sends FAQ 4 |

---

## 5. Handoff rule (important)

Automated replies should **never** be the final word on anything sensitive — election-day incidents, complaints, press inquiries, or anyone in distress. Set a simple internal rule for your Messenger team:

- If a message contains words like *"reklamo," "insidente," "help," "urgent,"* or anything about violence, harassment, or a safety concern → a real team member replies within the hour, automation aside.
- Automated FAQ answers are a first response, not a replacement for your team.

---

## Setup checklist

- [ ] Paste Instant Reply into Meta Business Suite
- [ ] Paste Away Message + set business hours
- [ ] Add all 6 FAQ entries
- [ ] Build the Persistent Menu
- [ ] Fill in the actual hotline number (search this doc for `[Add PBB hotline number]`)
- [ ] Assign at least one team member to monitor and take over real conversations daily
- [ ] Re-test the flow yourself by messaging the Page from a separate account
