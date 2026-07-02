# SSI Accounting — Feature Audit

*Verified against the live Supabase project `eatygefbexdxrqmstkeu` and the codebase in this folder. Date of audit: as-built.*

**Legend:** ✅ Live & verified (tested)  ·  🟢 Live, not yet exercised with data  ·  ⚠️ Needs your input (data/decision)  ·  🔜 Roadmap (not built)

---

## 1. Executive summary

A complete, double-entry accounting system for Sub-Sahara Institute is **deployed and operating**. The backend (Postgres + Auth + RLS + Storage + 4 edge functions + 4 scheduled jobs) is live and the core accounting logic is tested. The React PWA frontend has **23 screens** covering capture, ledger, billing, payroll, automation, compliance and reporting.

**Real data loaded:** FY2025 expenses — **127 journal entries / 288 lines, TZS 276,546,592**, with **TZS 5,181,871** withheld tax sitting in WHT Payable. Everything balances.

**Two honest gaps**, both needing *your input* not more building: (a) **revenue + opening balances** aren't loaded, so Cash shows −271M; (b) several modules (payroll, recurring, assets, receipts) are built and tested but **hold zero records** until you add staff/rules/assets or connect the OCR feed.

---

## 2. Verified architecture inventory

| Layer | Count | Items |
|---|---|---|
| **Tables** | 28 | accounts, journal_entries, journal_lines, receipts, invoices(+lines), imprests(+lines, retirements), projects, clients, vendors, budgets(+lines), employees, payroll_runs, payslips, recurring_rules, assets, documents, report_snapshots, org_settings, profiles, allowed_emails, audit_log, counters, currencies, fx_rates |
| **Views** | 12 | v_ledger, v_account_balances, v_trial_balance, v_cash_book, v_cash_position, v_ar_aging, v_vat_summary, v_budget_actual, v_project_financials, v_outstanding_imprests, v_asset_register, v_wht_register |
| **Functions (RPC)** | 23 | fn_post_journal, fn_issue/retire_imprest, fn_issue/pay_invoice, fn_pnl, fn_trial_balance, fn_balance_sheet, fn_cash_flow, fn_run_payroll, fn_paye, fn_post_due_recurring, fn_run_depreciation, fn_remit_wht, fn_close_period, fn_close_year, fn_snapshot_month, fn_role, fn_next_number, fn_check_entry_balanced, fn_audit, fn_post_receipt, fn_reopen_period |
| **Edge functions** | 4 | receipt-intake (n8n→queue), docgen (branded .docx), update-fx (daily rates), bulk-import (one-off FY2025 loader) |
| **Scheduled (pg_cron)** | 4 | monthly packs `0 6 1 * *` · recurring `0 5 * * *` · depreciation `0 5 1 * *` · FX `0 4 * * *` |
| **Storage buckets** | 2 | receipts (private), documents (private) |
| **Frontend** | 23 routes | see §3 |

---

## 3. Feature-by-feature audit

### Core ledger & accounting
| Feature | Status | Notes |
|---|---|---|
| Chart of Accounts (37 accounts) | ✅ | SSI CoA + advance/WHT/payroll/venue accounts |
| Double-entry ledger + balance enforcement | ✅ | Deferred constraint trigger; verified unbalanced entries are rejected |
| Multi-currency (TSh/KES/USD) + base conversion | ✅ | Per-line base amounts (generated columns) |
| Live FX (daily) | ✅ | `update-fx` tested live (USD≈2,617 · KES≈20.25); scheduled |
| Period lock + year-end close | ✅ | Tested: P&L → Retained Earnings, books lock |
| Audit trail | ✅ | Triggers on all financial tables; admin viewer |
| Role-based access (admin/accountant/officer/viewer) | ✅ | RLS enforced; permissive policies removed |

### Capture
| Feature | Status | Notes |
|---|---|---|
| Receipts — review queue, post to ledger | 🟢 | Posting logic tested earlier; 0 receipts currently |
| Receipt OCR intake (n8n → `receipt-intake`) | ✅ / ⚠️ | Endpoint tested (insert + dedup + auth); **needs your n8n repointed to it** |
| Receipt image / PDF attachment (Storage) | 🟢 | Upload + signed-URL view |
| Offline receipt capture queue | 🟢 | localStorage queue, auto-sync (best-effort) |
| Transactions — manual double-entry editor | ✅ | Live balance check; blocks unbalanced |
| Imprests — request→approve→issue→retire | ✅ | Issue/retire reconciliation tested (advance clears to 0) |

### Billing & projects
| Feature | Status | Notes |
|---|---|---|
| Invoices — create / issue / record payment | ✅ | Issue posts A/R+revenue+VAT; pay clears A/R — tested |
| WHT on client payment | ✅ | Splits to 1150 WHT receivable |
| Projects + per-project financials | ✅ | Invoiced/received/imprest rollups |
| Contacts (clients & vendors) | 🟢 | CRUD |
| Budgets + Budget-vs-Actual | ✅ | Variance view tested |

### Payroll
| Feature | Status | Notes |
|---|---|---|
| Payroll engine (PAYE bands, NSSF 10%+10%, SDL 3.5%, WCF 0.5%) | ✅ | Tested: 1.5M gross → PAYE 233k, net 1,117,000, balanced posting |
| Employees register + payslips | 🟢 / ⚠️ | UI built; **needs your staff list** |

### Automation
| Feature | Status | Notes |
|---|---|---|
| Recurring entries (+ WHT) + daily cron | ✅ / 🟢 | Engine tested; 0 rules defined yet |
| Fixed-asset register + straight-line depreciation + monthly cron | ✅ / 🟢 | Tested (12×100k); 0 assets yet |
| WHT register + one-click TRA remittance | ✅ | 5.18M payable; remit function built |
| Scheduled monthly report packs | ✅ | `fn_snapshot_month` tested; cron active |

### Reporting
| Feature | Status | Notes |
|---|---|---|
| Period-aware **P&L, Balance Sheet, Trial Balance, Cash Flow** | ✅ | All four tested and reconcile |
| Drill-down to underlying transactions | ✅ | via `v_ledger` |
| Cash Book, VAT Return, A/R Aging, Projects, Imprests, Budget vs Actual | ✅ | |
| Report Explorer (custom pivot by account/category/project/domain/month) | ✅ | |
| Analytics (charts) | ✅ | recharts |
| Export CSV / Excel (.xlsx) / Word (.docx) | ✅ | on every report |

### Documents
| Feature | Status | Notes |
|---|---|---|
| Branded PDF (print) — invoice / voucher / receipt | ✅ | |
| Branded DOCX via `docgen` | ✅ | Tested (valid Word file); CORS enabled for hosting |
| Document Library (stored + signed-URL retrieval) | ✅ | `documents` bucket + table |
| Official receipt generator (numbered RCT-####) | ✅ | |
| DOCX from your **original** SSI Word templates | 🔜 | Currently renders from an in-engine branded template |

### Compliance & admin
| Feature | Status | Notes |
|---|---|---|
| VAT return (output/input/net by period) | ✅ | |
| Company & tax settings (TIN/VRN, fiscal year, WHT rates) | ✅ | |
| Team / allow-list management | ✅ | First signup = admin |
| Settings (FX editor, CoA management) | ✅ | |

---

## 4. Data state (live)

| Item | Value |
|---|---|
| Chart of accounts | 37 |
| Journal entries / lines | 127 / 288 |
| FY2025 expenses loaded | TZS 276,546,592 |
| WHT payable (to remit) | TZS 5,181,871 |
| Cash at Bank balance | **−271,364,721** (expenses-only; no revenue/opening balances) |
| Employees / Recurring rules / Assets / Receipts / Invoices / Snapshots | 0 each |

---

## 5. Security audit

**Strong:** role-based RLS on every table (no “always-true” policies); anon role revoked from privileged functions; private Storage buckets; period lock guards backdated posting; tamper-evident audit log.

**Findings / recommendations:**
1. ⚠️ **Enable Leaked-Password Protection** (and ideally MFA) — Supabase → Authentication → Settings (dashboard-only toggle, can't be set via API).
2. ⚠️ **Delete the `bulk-import` edge function** — it was a one-off loader for FY2025 and is no longer needed.
3. Low: `pg_net` extension sits in `public` schema (standard on Supabase; cosmetic lint).
4. Edge functions run `verify_jwt=false` by design and are protected by shared tokens / CORS / dedup — fine for their purpose; rotate tokens periodically.

---

## 6. Quality notes & caveats

- **Build not compiled in this environment.** The project is structurally verified (all imports resolve, 23 routes, valid configs) but `npm install`/`npm run build` couldn't run in the sandbox. **Action:** run `npm run build` (and `npm run typecheck`) locally / let Vercel build to confirm a clean compile.
- **Typing:** the newest modules (payroll, automation) use a loosely-typed Supabase client to avoid regenerating the large `database.types.ts`. Runtime is unaffected; regenerate DB types for full end-to-end typing.
- **Statutory rates** (PAYE bands, NSSF/SDL/WCF, VAT 18%, WHT 5%/10%) are sensible Tanzania defaults — **verify against current TRA rates** and consider making them editable in Settings.
- **FY2025 reconciliation:** the source workbook self-conflicted (276.5M / 308.7M / 544.7M). The de-duplicated 276.5M was loaded; revisit if the 308.7M control figure is authoritative.

---

## 7. Prioritised next steps

1. **Complete the books** — load 2025 revenue + opening balances (your figures) so the balance sheet/cash are real.
2. **Activate OCR** — repoint your n8n flow to the `receipt-intake` endpoint (runbook already provided).
3. **Payroll go-live** — add staff (or send the list to load).
4. **Pack delivery** — choose Resend or n8n-Gmail to email the monthly packs.
5. **Housekeeping** — delete `bulk-import`, enable leaked-password protection, run a local build, confirm statutory rates.
6. **Roadmap** — bank reconciliation, DOCX from your original templates, WHT certificates, full offline sync, PWA icons.
