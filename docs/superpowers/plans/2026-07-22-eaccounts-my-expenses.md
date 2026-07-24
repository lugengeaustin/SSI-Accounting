# e-accounts "My Expenses" (self-service retirement + claims) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]` checkboxes.

**Goal:** A self-service surface where an officer/facilitator submits expenses — either retiring an advance (imprest) or claiming out-of-pocket spend — with receipt photos, landing in an accountant review queue that gates all journal posting.

**Architecture:** One unified `expense_claims` table (+`expense_claim_lines`) with a `kind` discriminator (`retirement` | `claim`), on the e-accounts Supabase project (`eatygefbexdxrqmstkeu`). Submissions are `pending_review`; an accountant approves → posts via the existing `fn_post_journal` RPC, or rejects with a note. RLS: claimant sees only their own, accountant/admin sees all + posts. Receipts → a private `expense-receipts` Storage bucket. The existing accountant-side imprest RetireModal is untouched; this adds the self-service path on top. (WS3 later adds a guest-token entry via a SECURITY DEFINER RPC — out of scope here.)

**Tech Stack:** Vite + React SPA, `@supabase/supabase-js` client (RLS-enforced), `src/lib/api.ts` data layer (`ok<T>` wrapper), `fn_role()` role helper, `fn_post_journal` posting RPC. **No unit-test harness** — verification is `npm run build` + browser drive of submit → review → post.

**Prod-DB note:** migrations are applied to the live accounting project but are **purely additive** (new tables, bucket, policies — no change to existing tables/data) and reversible (`drop table … cascade`, `delete bucket`). A repo SQL file records each migration for provenance.

---

### Task 1: Database — tables, RLS, Storage bucket

**Files:**
- Create: `supabase/migrations/20260722_expense_claims.sql` (provenance copy; applied live via MCP)

- [ ] **Step 1: Apply the schema (live + repo file)**

```sql
-- expense_claims: unified self-service submissions (retirement of an advance OR
-- out-of-pocket claim). pending_review until an accountant approves+posts.
create table if not exists public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('retirement','claim')),
  imprest_id uuid references public.imprests(id) on delete set null, -- retirement only
  claimant_id uuid references auth.users(id) on delete set null,     -- null for guest
  claimant_name text not null,
  project_id uuid references public.projects(id) on delete set null,
  engagement_ref text,
  purpose text,
  currency text not null default 'TZS',
  fx_rate numeric not null default 1,
  total numeric not null default 0,
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','rejected','posted')),
  source text not null default 'self' check (source in ('self','guest')),
  submitted_by uuid references auth.users(id) on delete set null,
  review_note text,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.expense_claim_lines (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.expense_claims(id) on delete cascade,
  description text not null,
  account_code text,
  receipt_no text,
  receipt_path text,           -- path within the expense-receipts bucket
  amount numeric not null default 0,
  vat numeric not null default 0,
  remarks text
);
create index if not exists idx_expense_claim_lines_claim on public.expense_claim_lines(claim_id);
create index if not exists idx_expense_claims_claimant on public.expense_claims(claimant_id);
create index if not exists idx_expense_claims_status on public.expense_claims(status);

alter table public.expense_claims enable row level security;
alter table public.expense_claim_lines enable row level security;

-- Read: accountant/admin see all; a claimant sees only their own.
drop policy if exists ec_read on public.expense_claims;
create policy ec_read on public.expense_claims for select to authenticated
  using (fn_role() = any(array['admin','accountant']) or claimant_id = auth.uid());

-- Insert: officer/accountant/admin, only as themselves (guest path uses a
-- SECURITY DEFINER RPC in WS3, which bypasses RLS).
drop policy if exists ec_insert on public.expense_claims;
create policy ec_insert on public.expense_claims for insert to authenticated
  with check (
    fn_role() = any(array['admin','accountant','officer'])
    and claimant_id = auth.uid()
  );

-- Update: only accountant/admin (approve / reject / post).
drop policy if exists ec_update on public.expense_claims;
create policy ec_update on public.expense_claims for update to authenticated
  using (fn_role() = any(array['admin','accountant']))
  with check (fn_role() = any(array['admin','accountant']));

-- Lines follow their parent claim.
drop policy if exists ecl_read on public.expense_claim_lines;
create policy ecl_read on public.expense_claim_lines for select to authenticated
  using (exists (select 1 from public.expense_claims c where c.id = claim_id
    and (fn_role() = any(array['admin','accountant']) or c.claimant_id = auth.uid())));

drop policy if exists ecl_write on public.expense_claim_lines;
create policy ecl_write on public.expense_claim_lines for all to authenticated
  using (exists (select 1 from public.expense_claims c where c.id = claim_id
    and (fn_role() = any(array['admin','accountant']) or c.claimant_id = auth.uid())))
  with check (exists (select 1 from public.expense_claims c where c.id = claim_id
    and (fn_role() = any(array['admin','accountant']) or c.claimant_id = auth.uid())));

-- Private receipts bucket.
insert into storage.buckets (id, name, public) values ('expense-receipts','expense-receipts', false)
  on conflict (id) do nothing;

drop policy if exists er_read on storage.objects;
create policy er_read on storage.objects for select to authenticated
  using (bucket_id = 'expense-receipts' and fn_role() = any(array['admin','accountant','officer']));
drop policy if exists er_write on storage.objects;
create policy er_write on storage.objects for insert to authenticated
  with check (bucket_id = 'expense-receipts' and fn_role() = any(array['admin','accountant','officer']));
```

Apply via MCP `execute_sql` (project `eatygefbexdxrqmstkeu`), then write the identical SQL to `supabase/migrations/20260722_expense_claims.sql`.

- [ ] **Step 2: Verify**

```sql
select count(*) from public.expense_claims;                    -- 0
select policyname from pg_policies where tablename='expense_claims' order by 1; -- ec_insert, ec_read, ec_update
select id from storage.buckets where id='expense-receipts';    -- 1 row
```

- [ ] **Step 3: Regenerate types**

Run MCP `generate_typescript_types` for the project → paste the new `expense_claims` / `expense_claim_lines` rows into `src/lib/database.types.ts` (or append the two table blocks manually if the app maintains it by hand). Confirm `T["expense_claims"]` resolves.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260722_expense_claims.sql src/lib/database.types.ts
git commit -m "feat(db): expense_claims + lines + receipts bucket (self-service expense retirement/claims, RLS)"
```

---

### Task 2: Data layer — `src/lib/expenses.ts`

**Files:**
- Create: `src/lib/expenses.ts`
- Reference: `src/lib/api.ts` (`ok<T>`, `postJournal`, `supabase`)

- [ ] **Step 1: Write the module**

```ts
import { supabase } from "./supabase";
import { ok, postJournal, type Result } from "./api";
import type { Database } from "./database.types";

type T = Database["public"]["Tables"];
export type ExpenseClaim = T["expense_claims"]["Row"];
export type ExpenseClaimLine = T["expense_claim_lines"]["Row"];
export type ClaimLineInput = Omit<T["expense_claim_lines"]["Insert"], "id" | "claim_id">;

// My own submissions (officer view) — RLS returns only the caller's rows.
export const listMyClaims = async () =>
  ok<ExpenseClaim[]>(
    await supabase.from("expense_claims").select("*")
      .order("created_at", { ascending: false }),
  );

// Accountant queue — pending submissions (RLS returns all for admin/accountant).
export const listPendingClaims = async () =>
  ok<ExpenseClaim[]>(
    await supabase.from("expense_claims").select("*")
      .eq("status", "pending_review").order("created_at", { ascending: false }),
  );

export const getClaimLines = async (claimId: string) =>
  ok<ExpenseClaimLine[]>(
    await supabase.from("expense_claim_lines").select("*").eq("claim_id", claimId),
  );

// Upload one receipt image; returns its storage path.
export async function uploadReceipt(file: File): Promise<Result<string>> {
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("expense-receipts").upload(path, file);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: path };
}

// Submit a self-service claim/retirement (claimant_id defaults to the caller).
export async function submitClaim(
  header: Omit<T["expense_claims"]["Insert"], "id" | "total" | "status" | "claimant_id" | "submitted_by">,
  lines: ClaimLineInput[],
): Promise<Result<ExpenseClaim>> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? null;
  const total = lines.reduce((s, l) => s + Number(l.amount || 0) + Number(l.vat || 0), 0);
  const ins = await supabase.from("expense_claims")
    .insert({ ...header, total, status: "pending_review", claimant_id: uid, submitted_by: uid })
    .select("*").single();
  if (ins.error) return { ok: false, error: ins.error.message };
  const claim = ins.data as ExpenseClaim;
  if (lines.length) {
    const li = await supabase.from("expense_claim_lines")
      .insert(lines.map((l) => ({ ...l, claim_id: claim.id })));
    if (li.error) return { ok: false, error: li.error.message };
  }
  return { ok: true, data: claim };
}

// Accountant: approve + post the journal, then flip status.
export async function approveAndPost(claim: ExpenseClaim): Promise<Result<ExpenseClaim>> {
  const linesRes = await getClaimLines(claim.id);
  if (!linesRes.ok) return linesRes;
  const lines = linesRes.data;
  // Dr each expense account; Cr staff-imprest (1300) for a retirement, or a
  // payable/cash for an out-of-pocket claim.
  const creditAccount = claim.kind === "retirement" ? "1300" : "2100";
  const jLines = [
    ...lines.map((l) => ({ account_code: l.account_code ?? "6000", debit: Number(l.amount || 0), credit: 0 })),
    { account_code: creditAccount, debit: 0, credit: Number(claim.total || 0) },
  ];
  const posted = await postJournal({
    date: new Date().toISOString().slice(0, 10),
    description: `${claim.kind === "retirement" ? "Imprest retirement" : "Expense claim"} · ${claim.claimant_name}`,
    project: claim.project_id ?? null,
    source: "expense_claim",
    sourceId: claim.id,
    currency: claim.currency,
    fx: claim.fx_rate,
    lines: jLines,
    ref: claim.engagement_ref ?? null,
  });
  if (!posted.ok) return posted;
  const upd = await supabase.from("expense_claims")
    .update({ status: "posted", journal_entry_id: posted.data?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", claim.id).select("*").single();
  if (upd.error) return { ok: false, error: upd.error.message };
  return { ok: true, data: upd.data as ExpenseClaim };
}

export async function rejectClaim(id: string, note: string): Promise<Result<ExpenseClaim>> {
  const upd = await supabase.from("expense_claims")
    .update({ status: "rejected", review_note: note, reviewed_at: new Date().toISOString() })
    .eq("id", id).select("*").single();
  if (upd.error) return { ok: false, error: upd.error.message };
  return { ok: true, data: upd.data as ExpenseClaim };
}
```

- [ ] **Step 2: Reconcile with api.ts reality**

Open `src/lib/api.ts` and confirm the EXACT signature/return of `postJournal` and the `Result<T>` / `ok<T>` shapes. Adjust the `postJournal(...)` call above to match the real parameter names (the plan assumes `{date,description,project,source,sourceId,currency,fx,lines,ref}`; if api.ts uses different keys, use those). Confirm `2100`/`1300`/`6000` are valid account codes in the chart of accounts (`select code from public.accounts` via MCP) — substitute the correct payable/imprest/expense codes if they differ.

- [ ] **Step 3: Typecheck-adjacent build**

Run: `npx tsc --noEmit || npm run build`
Expected: no errors in `expenses.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/expenses.ts
git commit -m "feat(expenses): data layer — submit/list/approve+post/reject expense claims"
```

---

### Task 3: My Expenses page (`src/pages/MyExpenses.tsx`)

**Files:**
- Create: `src/pages/MyExpenses.tsx`
- Modify: `src/App.tsx` (route), `src/components/Layout.tsx` (nav entry)

- [ ] **Step 1: Build the page**

A page with two actions and a list of my submissions:
- **New retirement** — pick one of my issued imprests (reuse `listImprests` filtered to mine + status Issued), add lines (description, account, receipt upload → `uploadReceipt`, amount), running total vs advance; submit `kind:'retirement', imprest_id`.
- **New claim** — no imprest; header (project, engagement ref, purpose) + lines + receipts; submit `kind:'claim'`.
- **My submissions** table: kind, total, status pill (`pending_review`/`approved`/`posted`/`rejected`), created date, review note if rejected.

Follow the existing page pattern (see `src/pages/Imprests.tsx` for `PageHeader`, `Modal`, `Tag`, `money`, table styles). Both submit via `submitClaim(...)` then reload. Use the existing `Retired`/status tag styles from `src/components/ui.tsx`.

- [ ] **Step 2: Wire route + nav**

In `src/App.tsx` add `<Route path="/my-expenses" element={<MyExpenses />} />` and import it. In `src/components/Layout.tsx` add `{ to: "/my-expenses", label: "My Expenses" }` to the nav array.

- [ ] **Step 3: Build**

Run: `npm run build` → "✓ built".

- [ ] **Step 4: Commit**

```bash
git add src/pages/MyExpenses.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat(expenses): My Expenses self-service page (submit retirement + claim with receipts)"
```

---

### Task 4: Expense Review queue (`src/pages/ExpenseReview.tsx`)

**Files:**
- Create: `src/pages/ExpenseReview.tsx`
- Modify: `src/App.tsx`, `src/components/Layout.tsx`

- [ ] **Step 1: Build the queue**

- Loads `listPendingClaims()`.
- Each row expands to show `getClaimLines` (description, account, receipt thumbnail via a signed URL from the `expense-receipts` bucket, amount, vat).
- **Approve & post** → `approveAndPost(claim)` (toast, reload); **Reject** → prompt for a note → `rejectClaim(id, note)`.
- Guard the whole page to `fn_role in (admin, accountant)` — hide from officers (check the current profile role via the existing auth/profile hook; if role isn't admin/accountant, show an EmptyState "Finance team only").

- [ ] **Step 2: Wire route + nav**

`<Route path="/expense-review" element={<ExpenseReview />} />`; nav `{ to: "/expense-review", label: "Expense Review" }`.

- [ ] **Step 3: Build**

Run: `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ExpenseReview.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat(expenses): accountant Expense Review queue (approve+post / reject)"
```

---

### Task 5: Verify + ship

- [ ] **Step 1: Browser drive (as the existing admin)** — submit a claim in My Expenses (with a receipt), see it in Expense Review, Approve & post, confirm status flips to `posted` and a journal entry appears in the ledger; submit another and Reject with a note, confirm it shows rejected + note in My Expenses.
- [ ] **Step 2: Deploy** — `npm run build` then `npx vercel --prod --yes`, alias `ssi-accounting.vercel.app`, smoke `curl -s -o /dev/null -w "%{http_code}" https://ssi-accounting.vercel.app/` (200).
- [ ] **Step 3: Seed cleanup** — delete any test claims created during the drive (`delete from public.expense_claims where claimant_name ilike '%test%'`).

---

## Self-review notes
- **Spec coverage (WS2):** self-service submission (Task 3), out-of-pocket claims + advance retirement unified via `kind` (Tasks 1–3), accountant review queue gating all posting (Task 4), receipts to Storage (Tasks 1–2), RLS officer-own/accountant-all (Task 1). ✓
- **Reality checks flagged for execution:** exact `postJournal` signature + real account codes (Task 2 Step 2); whether `database.types.ts` is generated or hand-maintained (Task 1 Step 3); the profile-role hook name for the Review guard (Task 4 Step 1).
- **Additive/reversible** prod migration; existing accountant RetireModal untouched.
- **Type consistency:** `expense_claims`/`expense_claim_lines`, `submitClaim`/`approveAndPost`/`rejectClaim`/`uploadReceipt`/`listMyClaims`/`listPendingClaims`/`getClaimLines` are used consistently across Tasks 2–4.
- **WS3 hook:** `source='guest'` + `claimant_id null` are already in the schema so the WS3 guest RPC drops in without further migration.
