# SSI Accounting — Email & WhatsApp Report Delivery (via n8n)

Sends a monthly (and on-demand) financial summary by **Email (Gmail)** and **WhatsApp**, using your existing n8n. The app exposes one endpoint that returns everything pre-formatted; n8n just forwards it.

## The endpoint

`GET https://eatygefbexdxrqmstkeu.supabase.co/functions/v1/report-pack`

- **Auth:** header `x-token: <stored in n8n credential; rotate via report-pack REPORT_TOKEN secret>` (or `?token=…`)
- **Period:** defaults to **last month**; override with `?period=YYYY-MM`
- **Returns:**
  ```json
  {
    "subject": "SSI Accounting — April 2025 summary",
    "email_html": "<div>…branded HTML table…</div>",
    "whatsapp_text": "*SSI Accounting — April 2025*\nRevenue: TSh 0\n…",
    "data": { "revenue":0, "expenses":107853880, "surplus":-107853880, "cash":-271364721,
              "ar":0, "imprests_unretired":0, "wht_payable":5181871, "vat_net":0 }
  }
  ```

Quick test:
```bash
curl "https://eatygefbexdxrqmstkeu.supabase.co/functions/v1/report-pack?period=2025-04&token=<stored in n8n credential; rotate via report-pack REPORT_TOKEN secret>"
```

## Wire it in n8n

1. Import **`SSI_Report_Delivery_n8n.json`** (n8n → Import from File).
2. Flow: **Schedule (1st, 07:00 EAT)** *and* **Webhook (send now)** → **Get report pack** (HTTP) → **Gmail** + **WhatsApp**.
3. **Gmail node:** attach your Gmail credential, set **recipients**, leave subject/body as `{{ $json.subject }}` / `{{ $json.email_html }}` (HTML).
4. **WhatsApp:** the template uses Meta's **WhatsApp Cloud API** — set:
   - `REPLACE_PHONE_NUMBER_ID` and `Bearer REPLACE_WHATSAPP_TOKEN` (from your Meta Business → WhatsApp app),
   - `REPLACE_RECIPIENT_MSISDN` (destination number, e.g. `2557XXXXXXXX`).
   - *Alternatives:* swap that HTTP node for n8n's **WhatsApp Business Cloud** node, or a **Twilio** node — keep the body as `{{ $json.whatsapp_text }}`.
5. **Activate.** The schedule fires monthly; the webhook URL it generates is your "send now" trigger (you can call it from a button later).

## Notes

- The endpoint computes live from the ledger (P&L, cash, A/R, imprests, WHT, VAT) — no app redeploy needed to start sending.
- For WhatsApp outside a 24-hour session window, Meta requires an approved **message template**; for internal sends to your own team/test numbers, free-form text works.
- Rotate the token by redeploying `report-pack` with a new value and updating the n8n header.
